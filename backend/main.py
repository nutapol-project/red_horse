# ============================================================
# main.py
# FastAPI application — Red Horse Project API Gateway
#
# Endpoints:
#   POST /v1/assess           Full dual-engine fraud assessment
#   POST /v1/simulate/dataset Trigger batch pandas simulation
#   GET  /v1/health           Liveness probe
# ============================================================

from __future__ import annotations
import time
import logging
import hashlib

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from schemas import (
    IngestionPayload,
    FraudAssessmentResponse,
    EngineAResult,
    EngineBResult,
    RiskScoreBreakdown,
)
from engines.engine_a import run_engine_a
from engines.engine_b import run_engine_b
from policy import enforce_fraud_policy

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("red_horse")

# ─── App Init ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title       = "🐴 Red Horse — Predictive Anti-Fraud API",
    description = (
        "Real-time Mule Account Detection using Behavioral Biometrics, "
        "Bayesian Inference, Benford's Law & Graph Neural Networks."
    ),
    version     = "1.0.0",
)

# ══════════════════════════════════════════════════════════════════════════════
# CORS — อนุญาต Frontend เรียก API ได้
# ══════════════════════════════════════════════════════════════════════════════
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",    # Vite dev server
        "http://localhost:4173",    # Vite preview
        "http://127.0.0.1:5173",
        "https://*.vercel.app",     # Vercel deploy
        "*",                        # ← เปิดกว้างไว้ก่อนสำหรับ dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════════════════
# MIDDLEWARE — Request timing
# ══════════════════════════════════════════════════════════════════════════════
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = round((time.perf_counter() - start) * 1000, 2)
    response.headers["X-Process-Time-Ms"] = str(elapsed)
    response.headers["X-Powered-By"]      = "RedHorse/1.0.0"
    logger.info(f"{request.method} {request.url.path} → {response.status_code} [{elapsed}ms]")
    return response


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 1 — Main Fraud Assessment
# ══════════════════════════════════════════════════════════════════════════════
@app.post(
    "/v1/assess",
    response_model=FraudAssessmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit account registration data for real-time fraud scoring",
    tags=["Assessment"],
)
async def assess_account(payload: IngestionPayload) -> FraudAssessmentResponse:
    """
    ## Pipeline

    ```
    IngestionPayload
        ├── Engine A: Keystroke Variance + Bayesian + Benford
        ├── Engine B: Graph Topology + Isolation Forest
        ├── Score Fusion (60/40 weighted average)
        └── Policy Engine → Action
    ```

    Returns a complete fraud assessment with:
    - Per-engine breakdown and individual metric flags
    - Aggregated risk_score (0.00–1.00)
    - Automated policy enforcement action
    """

    logger.info(f"Assessment request received for user_id={payload.user_id}")

    try:
        # ── Prepare feature inputs ─────────────────────────────────────────
        bio  = payload.biometrics
        foot = payload.footprint
        kyc  = payload.kyc

        # Simulate Benford inputs from "first-mile configuration values"
        # In production these come from a transaction/config event stream
        mock_first_mile_inputs = [
            50_000.0,
            bio.typing_speed_wpm * 100,
            float(bio.balance_checks_without_funds + 1) * 10_000,
        ]

        # ── ENGINE A ───────────────────────────────────────────────────────
        engine_a_output = run_engine_a(
            keystroke_intervals          = bio.keystroke_intervals,
            copy_paste_detected          = bio.copy_paste_detected,
            sim_mismatch                 = not foot.sim_serial_owner_match,
            changed_limit_to_max         = bio.changed_limit_to_max,
            minutes_since_account_open   = bio.minutes_since_account_open,
            balance_checks_without_funds = bio.balance_checks_without_funds,
            user_numeric_inputs          = mock_first_mile_inputs,
        )

        # ── ENGINE B ────────────────────────────────────────────────────────
        engine_b_output = run_engine_b(
            user_id            = payload.user_id,
            device_imei        = foot.device_imei,
            ip_address         = foot.ip_address,
            connected_user_ids = payload.known_connected_user_ids,
        )

        # ── SCORE FUSION ───────────────────────────────────────────────────
        sim_penalty        = 0.10 if not foot.sim_serial_owner_match else 0.0
        copy_paste_penalty = 0.08 if bio.copy_paste_detected          else 0.0

        base_score = (
            0.60 * engine_a_output.normalized_score
            + 0.40 * engine_b_output.normalized_score
        )
        final_score = round(
            min(base_score + sim_penalty + copy_paste_penalty, 1.0), 4
        )

        logger.info(
            f"user_id={payload.user_id} | "
            f"A={engine_a_output.normalized_score} | "
            f"B={engine_b_output.normalized_score} | "
            f"final={final_score}"
        )

        # ── POLICY ENGINE ──────────────────────────────────────────────────
        policy_action = enforce_fraud_policy(final_score)

        # ── Build response ─────────────────────────────────────────────────
        return FraudAssessmentResponse(
            user_id  = payload.user_id,
            engine_a = EngineAResult(
                typing_variance           = engine_a_output.typing_variance,
                variance_flagged          = engine_a_output.variance_flagged,
                benford_deviation         = engine_a_output.benford_deviation,
                benford_flagged           = engine_a_output.benford_flagged,
                bayesian_mule_probability = engine_a_output.bayesian_mule_probability,
                bayesian_flagged          = engine_a_output.bayesian_flagged,
            ),
            engine_b = EngineBResult(
                graph_node_count    = engine_b_output.graph_node_count,
                graph_edge_count    = engine_b_output.graph_edge_count,
                cluster_fraud_score = engine_b_output.cluster_fraud_score,
                cluster_flagged     = engine_b_output.cluster_flagged,
            ),
            risk_breakdown = RiskScoreBreakdown(
                engine_a_score       = engine_a_output.normalized_score,
                engine_b_score       = engine_b_output.normalized_score,
                sim_mismatch_penalty = sim_penalty,
                copy_paste_penalty   = copy_paste_penalty,
                final_score          = final_score,
            ),
            policy = policy_action,
        )

    except Exception as exc:
        logger.error(f"Assessment failed for user_id={payload.user_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal scoring error: {str(exc)}",
        )


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 2 — Batch Simulation Trigger
# ══════════════════════════════════════════════════════════════════════════════
@app.post(
    "/v1/simulate/dataset",
    status_code=status.HTTP_200_OK,
    summary="Run offline batch simulation on a synthetic dataset",
    tags=["Simulation"],
)
async def run_simulation(n_accounts: int = 200, fraud_rate: float = 0.10):
    """
    Generates a synthetic dataset and scores every account through
    the Dual-Engine pipeline. Returns aggregate statistics for QA.
    """
    from simulator import generate_synthetic_dataset, score_dataset

    df      = generate_synthetic_dataset(n_accounts=n_accounts,
                                         fraud_rate=fraud_rate)
    df      = score_dataset(df)
    summary = df.groupby(["is_fraud_label", "policy_action"]).size()

    return {
        "total_accounts"  : n_accounts,
        "fraud_rate_input": fraud_rate,
        "avg_score_legit" : round(float(df[~df.is_fraud_label]["final_score"].mean()), 4),
        "avg_score_fraud" : round(float(df[df.is_fraud_label]["final_score"].mean()),  4),
        "policy_breakdown": summary.reset_index().rename(
            columns={0: "count"}
        ).to_dict(orient="records"),
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 3 — Health Check
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/v1/health", tags=["System"])
async def health_check():
    return {
        "status" : "ok",
        "service": "red_horse",
        "version": "1.0.0",
        "cors"   : "enabled",
    }


# ── Dev server entry point ─────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
