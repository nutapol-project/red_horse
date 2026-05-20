# ============================================================
# schemas.py
# Pydantic models that mirror the SRS Data Ingestion Layer.
# Each module maps 1-to-1 with the specification sections.
# ============================================================

from __future__ import annotations
import uuid
from typing import List, Optional
from pydantic import BaseModel, Field


# ─── Module 1: User Profile & KYC ─────────────────────────────────────────────
class KYCData(BaseModel):
    national_id: str                = Field(..., description="Raw national ID (hashed at storage layer)")
    age: int                        = Field(..., ge=0, le=120)
    occupation: str
    registered_address_zipcode: str
    kyc_timestamp: float            = Field(..., description="Unix epoch of KYC submission")
    kyc_channel: str                = Field(..., description="'Online' or 'Branch'")


# ─── Module 2: Digital Footprints ─────────────────────────────────────────────
class DigitalFootprint(BaseModel):
    device_imei: str
    device_model: str
    ip_address: str                 = Field(..., description="IPv4 or IPv6")
    carrier_name: str
    sim_serial_owner_match: bool    = Field(
        ..., description="True if SIM card is registered to the account holder (via Telecom API)"
    )


# ─── Module 3: Behavioral Biometrics ──────────────────────────────────────────
class BehavioralBiometrics(BaseModel):
    typing_speed_wpm: float
    keystroke_intervals: List[float] = Field(
        ..., description="Raw intervals (ms) between consecutive key presses — raw data for σ² computation"
    )
    copy_paste_detected: bool
    touch_pressure_avg: float
    screen_navigation_path: List[str]

    # First-mile trigger behaviors (for Bayesian update)
    changed_limit_to_max: bool          = Field(default=False,  description="User changed daily limit to maximum")
    minutes_since_account_open: float   = Field(default=0.0,    description="Time elapsed since account creation (minutes)")
    balance_checks_without_funds: int   = Field(default=0,      description="Repetitive balance checks with ฿0 balance")


# ─── Top-Level Ingestion Payload ───────────────────────────────────────────────
class IngestionPayload(BaseModel):
    user_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Auto-generated UUID if not supplied by caller"
    )
    kyc:        KYCData
    footprint:  DigitalFootprint
    biometrics: BehavioralBiometrics
    known_connected_user_ids: List[str] = Field(
        default=[],
        description="List of user_ids sharing the same device/IP (for GNN graph edges)"
    )


# ─── API Response Models ───────────────────────────────────────────────────────
class EngineAResult(BaseModel):
    typing_variance: float
    variance_flagged: bool
    benford_deviation: float
    benford_flagged: bool
    bayesian_mule_probability: float
    bayesian_flagged: bool


class EngineBResult(BaseModel):
    graph_node_count: int
    graph_edge_count: int
    cluster_fraud_score: float
    cluster_flagged: bool


class RiskScoreBreakdown(BaseModel):
    engine_a_score: float
    engine_b_score: float
    sim_mismatch_penalty: float
    copy_paste_penalty: float
    final_score: float


class PolicyAction(BaseModel):
    action: str
    reason: str
    max_amount_per_day: Optional[float] = None
    require_mfa: Optional[str]          = None
    require_kyc: Optional[str]          = None


class FraudAssessmentResponse(BaseModel):
    user_id: str
    engine_a: EngineAResult
    engine_b: EngineBResult
    risk_breakdown: RiskScoreBreakdown
    policy: PolicyAction
