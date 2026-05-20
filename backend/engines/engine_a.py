# ============================================================
# engines/engine_a.py
# Engine A: Statistical Anomaly Detection & Bayesian Inference
#
# Implements THREE metrics from SRS §2:
#   1. Keystroke Variance  (σ²)
#   2. Bayesian Risk Update  P(Mule | Behavior)
#   3. Benford's Law Deviation
# ============================================================

from __future__ import annotations
import math
import numpy as np
from dataclasses import dataclass


# ─── Tunable thresholds (SRS §4 extension) ────────────────────────────────────
VARIANCE_THRESHOLD         = 15.0   # ms² — below this → suspiciously mechanical
BENFORD_CHI_SQ_THRESHOLD   = 0.15   # normalized deviation — above → suspicious
BAYESIAN_FLAG_THRESHOLD    = 0.65   # posterior probability flag boundary


@dataclass
class EngineAOutput:
    typing_variance:           float
    variance_flagged:          bool
    benford_deviation:         float
    benford_flagged:           bool
    bayesian_mule_probability: float
    bayesian_flagged:          bool
    normalized_score:          float   # 0.0–1.0 rolled-up score for this engine


# ══════════════════════════════════════════════════════════════════════════════
# METRIC 1 — Keystroke & Typing Variance
# ══════════════════════════════════════════════════════════════════════════════

def compute_keystroke_variance(intervals: list[float]) -> float:
    """
    SRS Formula (§2, Metric 1):

        σ² = (1/N) Σ (tᵢ − μ)²

    where tᵢ is the interval (ms) between key-press i and i+1,
    and μ is the mean of all intervals.

    A very LOW σ² (near-zero) means typing is robotic / scripted.
    A normal human typist has natural rhythm variation (σ² > threshold).

    Args:
        intervals: List of raw inter-keystroke timing values in ms.

    Returns:
        Population variance σ² as a float. Returns 0.0 if < 2 samples.
    """
    if len(intervals) < 2:
        return 0.0  # Insufficient data → treat as maximally suspicious

    n   = len(intervals)
    mu  = sum(intervals) / n

    # Population variance (ddof=0), matching the SRS formula exactly
    variance = sum((t - mu) ** 2 for t in intervals) / n
    return round(variance, 4)


# ══════════════════════════════════════════════════════════════════════════════
# METRIC 2 — Bayesian Mule Probability
# ══════════════════════════════════════════════════════════════════════════════

# ── Prior probabilities (estimated from historical fraud data) ─────────────
#    These values should be calibrated against real labelled datasets.
#    P(Mule)  ≈ 0.01   → ~1% of new accounts are mule accounts (prior)
#    P(Behavior | Mule) likelihoods are defined per trigger behavior below.

PRIOR_MULE = 0.01   # P(Mule) — base rate of mule accounts in the population


def compute_bayesian_probability(
    changed_limit_to_max:           bool,
    minutes_since_account_open:     float,
    balance_checks_without_funds:   int,
    copy_paste_detected:            bool,
    sim_mismatch:                   bool,
) -> float:
    """
    Iterative Bayesian update using each behavioral signal as independent evidence.

    SRS Formula (§2, Metric 2):

        P(Mule | Behavior) = P(Behavior | Mule) × P(Mule)
                             ─────────────────────────────
                                    P(Behavior)

    We apply this sequentially for each binary trigger so the posterior
    of one step becomes the prior of the next — this is the standard
    "naive Bayes chain" approach for multiple independent signals.

    Likelihood Table (P(trigger | Mule) vs P(trigger | Legitimate)):
    ┌─────────────────────────────────┬──────────────┬──────────────────┐
    │ Trigger                         │ P(·│Mule)    │ P(·│Legitimate)  │
    ├─────────────────────────────────┼──────────────┼──────────────────┤
    │ Limit changed to max in 60 min  │   0.85       │      0.05        │
    │ Balance check without funds     │   0.70/check │      0.10        │
    │ Copy-paste used during KYC      │   0.75       │      0.15        │
    │ SIM card owner mismatch         │   0.80       │      0.08        │
    └─────────────────────────────────┴──────────────┴──────────────────┘

    Args:
        changed_limit_to_max:         True if max daily limit set within 60 min.
        minutes_since_account_open:   Time elapsed since KYC completion.
        balance_checks_without_funds: Count of 0-balance inquiries.
        copy_paste_detected:          True if clipboard paste detected in form.
        sim_mismatch:                 True if SIM owner ≠ account holder.

    Returns:
        Posterior probability P(Mule | all observed behaviors) ∈ [0.0, 1.0].
    """

    # ── Helper: single Bayesian step ──────────────────────────────────────
    def bayes_update(prior: float, p_behavior_given_mule: float,
                     p_behavior_given_legit: float) -> float:
        """
        One step of Bayes' theorem.
        P(B) = P(B|Mule)·P(Mule) + P(B|¬Mule)·P(¬Mule)
        """
        p_behavior = (
            p_behavior_given_mule * prior
            + p_behavior_given_legit * (1.0 - prior)
        )
        if p_behavior == 0:
            return prior  # Avoid division by zero; evidence is neutral

        posterior = (p_behavior_given_mule * prior) / p_behavior
        return round(min(posterior, 0.9999), 6)   # Cap below 1.0 (logical bound)

    # ── Start with population prior ────────────────────────────────────────
    p = PRIOR_MULE

    # Evidence 1: Changed limit to max within 60 minutes
    if changed_limit_to_max and minutes_since_account_open <= 60:
        p = bayes_update(p,
                         p_behavior_given_mule=0.85,
                         p_behavior_given_legit=0.05)

    # Evidence 2: Repetitive balance checks with ฿0 balance
    # Each additional check is treated as independent weak evidence
    for _ in range(min(balance_checks_without_funds, 5)):   # Cap at 5 updates
        p = bayes_update(p,
                         p_behavior_given_mule=0.70,
                         p_behavior_given_legit=0.10)

    # Evidence 3: Copy-paste detected in registration form
    if copy_paste_detected:
        p = bayes_update(p,
                         p_behavior_given_mule=0.75,
                         p_behavior_given_legit=0.15)

    # Evidence 4: SIM card not registered to the account holder
    if sim_mismatch:
        p = bayes_update(p,
                         p_behavior_given_mule=0.80,
                         p_behavior_given_legit=0.08)

    return p


# ══════════════════════════════════════════════════════════════════════════════
# METRIC 3 — Benford's Law Deviation
# ══════════════════════════════════════════════════════════════════════════════

def benford_expected(d: int) -> float:
    """
    SRS Formula (§2, Metric 3):

        P(d) = log₁₀(1 + 1/d)

    Returns the expected frequency of digit d (1–9) as the
    leading digit in a naturally distributed numeric dataset.
    """
    if d < 1 or d > 9:
        raise ValueError("Benford's Law applies to digits 1–9 only.")
    return math.log10(1 + 1 / d)


def compute_benford_deviation(observed_values: list[float]) -> float:
    """
    Computes how much a list of user-configured numeric values (e.g.,
    custom daily limits, security PINs, transfer amounts) deviates
    from the Benford's Law natural distribution.

    Strategy:
      1. Extract the first significant digit from each value.
      2. Build an observed frequency distribution.
      3. Compare against the theoretical Benford distribution using
         a normalized chi-square-like deviation score.

    Args:
        observed_values: List of positive numeric values entered by user.

    Returns:
        Normalized deviation score ∈ [0.0, 1.0].
        High score → distribution looks artificial / scripted.
    """
    if not observed_values:
        return 0.0

    # ── Step 1: Extract leading digits ────────────────────────────────────
    def leading_digit(x: float) -> int | None:
        """Returns the first non-zero digit of |x|, or None if invalid."""
        x = abs(x)
        if x == 0:
            return None
        # Normalize: shift decimal until 1 ≤ x < 10
        while x >= 10:
            x /= 10
        while x < 1:
            x *= 10
        return int(x)

    digits = [leading_digit(v) for v in observed_values if leading_digit(v)]
    n = len(digits)
    if n == 0:
        return 0.0

    # ── Step 2: Observed frequency for digits 1–9 ─────────────────────────
    observed_freq  = {d: digits.count(d) / n for d in range(1, 10)}
    expected_freq  = {d: benford_expected(d)  for d in range(1, 10)}

    # ── Step 3: Normalized total variation distance ────────────────────────
    # TVD = 0.5 × Σ|observed - expected|, range [0, 1]
    total_variation = 0.5 * sum(
        abs(observed_freq[d] - expected_freq[d]) for d in range(1, 10)
    )
    return round(total_variation, 4)


# ══════════════════════════════════════════════════════════════════════════════
# ENGINE A — Unified Scorer
# ══════════════════════════════════════════════════════════════════════════════

def run_engine_a(
    keystroke_intervals:          list[float],
    copy_paste_detected:          bool,
    sim_mismatch:                 bool,
    changed_limit_to_max:         bool,
    minutes_since_account_open:   float,
    balance_checks_without_funds: int,
    user_numeric_inputs:          list[float],
) -> EngineAOutput:
    """
    Orchestrates all three Engine A metrics and produces a
    single normalized_score in [0.0, 1.0].

    Weighting (tunable, sums to 1.0):
        Bayesian posterior  → 50%  (strongest single predictor)
        Keystroke variance  → 30%  (biometric signal)
        Benford deviation   → 20%  (configuration anomaly signal)
    """

    # ── Metric 1: Keystroke Variance ──────────────────────────────────────
    variance        = compute_keystroke_variance(keystroke_intervals)
    variance_flagged = (copy_paste_detected) or (variance <= VARIANCE_THRESHOLD)
    # Convert: low variance → high risk (invert + normalize, cap at 1.0)
    variance_risk   = min(1.0, max(0.0, 1.0 - (variance / (VARIANCE_THRESHOLD * 5))))

    # ── Metric 2: Bayesian Probability ────────────────────────────────────
    bayes_prob       = compute_bayesian_probability(
        changed_limit_to_max=changed_limit_to_max,
        minutes_since_account_open=minutes_since_account_open,
        balance_checks_without_funds=balance_checks_without_funds,
        copy_paste_detected=copy_paste_detected,
        sim_mismatch=sim_mismatch,
    )
    bayesian_flagged = bayes_prob >= BAYESIAN_FLAG_THRESHOLD

    # ── Metric 3: Benford Deviation ───────────────────────────────────────
    benford_dev     = compute_benford_deviation(user_numeric_inputs)
    benford_flagged = benford_dev >= BENFORD_CHI_SQ_THRESHOLD

    # ── Weighted Roll-up Score ─────────────────────────────────────────────
    # Weights reflect confidence levels of each signal
    normalized_score = round(
        (0.50 * bayes_prob)
        + (0.30 * variance_risk)
        + (0.20 * min(benford_dev * 2.0, 1.0)),   # scale TVD to [0,1]
        4
    )

    return EngineAOutput(
        typing_variance           = variance,
        variance_flagged          = variance_flagged,
        benford_deviation         = benford_dev,
        benford_flagged           = benford_flagged,
        bayesian_mule_probability = bayes_prob,
        bayesian_flagged          = bayesian_flagged,
        normalized_score          = normalized_score,
    )
