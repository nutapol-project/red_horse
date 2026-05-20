# ============================================================
# policy.py
# Direct implementation of Section 4 "Policy Engine &
# Automated Actions" from the SRS specification.
# ============================================================

from schemas import PolicyAction


# ─── Threshold Constants (tunable via config/env in production) ────────────────
THRESHOLD_HIGH   = 0.80   # → BLOCK
THRESHOLD_MEDIUM = 0.40   # → LIMIT + Extra MFA


def enforce_fraud_policy(risk_score: float) -> PolicyAction:
    """
    Converts a numeric risk_score (0.00–1.00) into an
    automated enforcement action, exactly as defined in SRS §4.

    Args:
        risk_score: Final aggregated P from both engines.

    Returns:
        PolicyAction: Structured action object with reason.
    """
    if risk_score >= THRESHOLD_HIGH:
        return PolicyAction(
            action="BLOCK_OUTBOUND_TRANSACTION",
            reason=(
                "High probability of Mule Account "
                "(GNN Cluster Match / Behavioral Anomaly)"
            ),
            require_kyc="PHYSICAL_BRANCH_ONLY",
        )

    elif THRESHOLD_MEDIUM <= risk_score < THRESHOLD_HIGH:
        return PolicyAction(
            action="LIMIT_TRANSACTION_CAP",
            reason="Medium Risk Outlier",
            max_amount_per_day=5000.0,
            require_mfa="FACIAL_RECOGNITION_EVERY_TRANSACTION",
        )

    else:
        return PolicyAction(
            action="ALLOW",
            reason="Normal Behavior Profile",
        )
