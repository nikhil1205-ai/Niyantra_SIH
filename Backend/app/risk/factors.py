"""
risk/factors.py - CGHS risk factor definitions and scoring rules.

Each factor is scored 0-100.
Rules are transparent and deterministic - no ML involved.
"""
from typing import List
from app.models.evidence import Evidence


# ─── Action Impact Scores ────────────────────────────────────────────────────
# How impactful is this action if it goes wrong?
ACTION_IMPACT_SCORES: dict[str, float] = {
    "read_case": 5.0,
    "verify_beneficiary": 15.0,
    "check_rate": 10.0,
    "update_status": 30.0,
    "claim_submit": 65.0,
    "settlement": 90.0,
}

# ─── Reversibility Risk Scores ────────────────────────────────────────────────
# How hard is it to undo this action?
REVERSIBILITY_RISK_SCORES: dict[str, float] = {
    "read_case": 0.0,
    "verify_beneficiary": 5.0,
    "check_rate": 5.0,
    "update_status": 20.0,
    "claim_submit": 50.0,
    "settlement": 90.0,
}

# ─── Evidence Risk Rules ──────────────────────────────────────────────────────
# Maps evidence_type → its contribution to evidence_risk (0-100)
EVIDENCE_RISK_MAP: dict[str, float] = {
    "rate_mismatch": 70.0,
    "missing_document": 60.0,
    "duplicate_claim": 80.0,
    "beneficiary_conflict": 75.0,
    "unreliable_evidence": 50.0,
    "normal": 5.0,         # Baseline for clean evidence
}


def score_evidence_risk(evidence_list: List[Evidence]) -> float:
    """
    Calculate evidence risk from all evidence items on a case.
    
    Takes the maximum individual evidence risk score rather than summing,
    because we want to reflect the WORST signal, not accumulate scores
    beyond 100. Then boost slightly for multiple bad signals.
    """
    if not evidence_list:
        return 0.0

    scores = [
        EVIDENCE_RISK_MAP.get(e.evidence_type, 10.0)
        for e in evidence_list
    ]

    max_score = max(scores)
    bad_count = sum(1 for s in scores if s >= 50.0)

    # Each additional bad evidence item adds a 5-point boost, capped at 95
    boost = min((bad_count - 1) * 5.0, 15.0) if bad_count > 1 else 0.0
    return min(max_score + boost, 100.0)


def score_policy_sensitivity(
    claimed_amount: float,
    approved_rate: float,
    extra_flags: List[str],
) -> float:
    """
    Calculate policy sensitivity based on claim vs. approved rate.
    
    extra_flags: list of policy rule IDs that fired (e.g. ["RATE-001", "DUP-001"])
    """
    if approved_rate <= 0:
        return 100.0  # Degenerate case - treat as maximum risk

    overage_ratio = claimed_amount / approved_rate
    if overage_ratio <= 1.0:
        base_score = 10.0   # Within rate - low sensitivity
    elif overage_ratio <= 1.2:
        base_score = 40.0   # Up to 20% over - moderate
    elif overage_ratio <= 1.5:
        base_score = 65.0   # 20-50% over - high
    else:
        base_score = 85.0   # >50% over - very high

    # Each policy rule that fires adds 10 points
    policy_boost = min(len(extra_flags) * 10.0, 30.0)
    return min(base_score + policy_boost, 100.0)


def score_action_impact(action_type: str) -> float:
    """Return the impact score for the proposed action type."""
    return ACTION_IMPACT_SCORES.get(action_type, 50.0)


def score_confidence_risk(confidence: float) -> float:
    """
    Convert agent confidence (0.0-1.0) to confidence risk (0-100).
    
    Low confidence = high risk.
    confidence = 0.90 → confidence_risk = 10
    confidence = 0.30 → confidence_risk = 70
    """
    clamped = max(0.0, min(1.0, confidence))
    return round((1.0 - clamped) * 100.0, 2)


def score_reversibility_risk(action_type: str) -> float:
    """Return the reversibility risk for the proposed action type."""
    return REVERSIBILITY_RISK_SCORES.get(action_type, 50.0)
