# ============================================================
# simulator.py
# Offline batch simulation using pandas + scikit-learn.
# Generates synthetic accounts and runs both engines over
# the entire dataset — useful for model calibration and QA.
# ============================================================

from __future__ import annotations
import uuid
import numpy as np
import pandas as pd
from engines.engine_a import run_engine_a
from engines.engine_b import run_engine_b


def generate_synthetic_dataset(n_accounts: int = 500,
                                fraud_rate: float = 0.08,
                                seed: int = 42) -> pd.DataFrame:
    """
    Generates a synthetic dataset of account registrations with
    realistic distributions for both legitimate and mule accounts.

    Args:
        n_accounts: Total number of synthetic accounts to generate.
        fraud_rate:  Proportion of mule accounts in the dataset.
        seed:        Random seed for reproducibility.

    Returns:
        pd.DataFrame with one row per account and all feature columns.
    """
    rng = np.random.default_rng(seed)
    n_fraud = int(n_accounts * fraud_rate)
    n_legit = n_accounts - n_fraud

    def make_accounts(n: int, is_fraud: bool) -> list[dict]:
        records = []
        for _ in range(n):
            # Mule accounts type faster & more uniformly (scripted bots)
            if is_fraud:
                intervals = rng.uniform(40, 60, size=20).tolist()   # tight band
                copy_paste = rng.random() < 0.80
                sim_match  = rng.random() < 0.30    # likely mismatched
                changed_limit = rng.random() < 0.90
                balance_checks = int(rng.integers(3, 8))
                minutes_open = rng.uniform(1, 30)
                custom_limits = rng.choice([50000, 50000, 50000, 49999],
                                           size=5).tolist()  # non-Benford
            else:
                intervals = rng.normal(150, 60, size=20).tolist()   # human variance
                copy_paste = rng.random() < 0.05
                sim_match  = rng.random() < 0.92
                changed_limit = rng.random() < 0.05
                balance_checks = int(rng.integers(0, 2))
                minutes_open = rng.uniform(5, 480)
                custom_limits = rng.choice(
                    [1000, 5000, 12000, 30000, 7500], size=5
                ).tolist()

            records.append({
                "user_id":                    str(uuid.uuid4()),
                "is_fraud_label":             is_fraud,
                "keystroke_intervals":        intervals,
                "copy_paste_detected":        copy_paste,
                "sim_mismatch":              not sim_match,
                "changed_limit_to_max":       changed_limit,
                "minutes_since_account_open": float(minutes_open),
                "balance_checks":             balance_checks,
                "custom_limits":              custom_limits,
                "device_imei":
                    rng.choice(["IMEI_FRAUD_001", "IMEI_CLEAN_XYZ"])
                    if is_fraud else "IMEI_CLEAN_" + str(rng.integers(100, 999)),
                "ip_address":
                    rng.choice(["10.0.0.1", "203.150.100.1"])
                    if is_fraud else f"203.{rng.integers(0,255)}.{rng.integers(0,255)}.1",
            })
        return records

    df = pd.DataFrame(
        make_accounts(n_legit, False) + make_accounts(n_fraud, True)
    ).sample(frac=1, random_state=seed).reset_index(drop=True)

    return df


def score_dataset(df: pd.DataFrame) -> pd.DataFrame:
    """
    Runs the Dual-Engine pipeline over every row in the DataFrame
    and appends score + policy columns.

    Returns:
        The same DataFrame enriched with:
          engine_a_score, engine_b_score, final_score, policy_action
    """
    from policy import enforce_fraud_policy

    results = []
    for _, row in df.iterrows():
        # ── Engine A ───────────────────────────────────────────────────────
        a = run_engine_a(
            keystroke_intervals          = row["keystroke_intervals"],
            copy_paste_detected          = row["copy_paste_detected"],
            sim_mismatch                 = row["sim_mismatch"],
            changed_limit_to_max         = row["changed_limit_to_max"],
            minutes_since_account_open   = row["minutes_since_account_open"],
            balance_checks_without_funds = row["balance_checks"],
            user_numeric_inputs          = row["custom_limits"],
        )

        # ── Engine B ───────────────────────────────────────────────────────
        b = run_engine_b(
            user_id            = row["user_id"],
            device_imei        = row["device_imei"],
            ip_address         = row["ip_address"],
            connected_user_ids = [],
        )

        # ── Final score fusion (60% Engine A, 40% Engine B) ───────────────
        final = round(0.60 * a.normalized_score + 0.40 * b.normalized_score, 4)
        policy = enforce_fraud_policy(final)

        results.append({
            "engine_a_score": a.normalized_score,
            "engine_b_score": b.normalized_score,
            "final_score":    final,
            "policy_action":  policy.action,
        })

    return df.join(pd.DataFrame(results))


# ── CLI entry point ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("🐴 Red Horse — Batch Simulation Starting...")
    df = generate_synthetic_dataset(n_accounts=200, fraud_rate=0.10)
    df = score_dataset(df)

    summary = df.groupby(["is_fraud_label", "policy_action"]).size()
    print("\n📊 Simulation Summary:")
    print(summary.to_string())
    print(f"\n   Avg score (legit) : "
          f"{df[~df.is_fraud_label]['final_score'].mean():.4f}")
    print(f"   Avg score (fraud) : "
          f"{df[df.is_fraud_label]['final_score'].mean():.4f}")
