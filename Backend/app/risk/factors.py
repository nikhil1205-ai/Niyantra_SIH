"""
risk/factors.py - PM-JAY 5 Risk Dimension definitions and scoring rules.

Calculates 5 distinct risk dimensions (0-100 each):
1. Beneficiary / Identity Risk
2. Document / Evidence Risk
3. Hospital / Provider Risk
4. Treatment / Package Risk
5. Claim / Anomaly Risk

Rules are transparent and deterministic.
"""
from typing import List, Dict, Tuple
from app.models.evidence import Evidence


# ─── Action Impact Scores ────────────────────────────────────────────────────
ACTION_IMPACT_SCORES: Dict[str, float] = {
    "read_case": 5.0,
    "verify_beneficiary": 15.0,
    "request_human_review": 30.0,
    "claim_submit": 65.0,
    "authorize_claim": 85.0,
    "reject_claim": 75.0,
    "escalate_case": 90.0,
    "settlement": 85.0,
}

REVERSIBILITY_RISK_SCORES: Dict[str, float] = {
    "read_case": 0.0,
    "verify_beneficiary": 5.0,
    "request_human_review": 20.0,
    "claim_submit": 50.0,
    "authorize_claim": 90.0,
    "reject_claim": 60.0,
    "escalate_case": 80.0,
    "settlement": 90.0,
}

# ─── PM-JAY Risk Event Weights ──────────────────────────────────────────────
EVENT_IMPACT: Dict[str, float] = {
    "duplicate_claim": 35.0,
    "identity_mismatch": 30.0,
    "beneficiary_conflict": 30.0,
    "treatment_mismatch": 20.0,
    "missing_document": 25.0,
    "low_agent_confidence": 15.0,
    "agent_disagreement": 20.0,
    "rate_mismatch": 25.0,
    "hospital_conflict": 20.0,
    "normal": 0.0,
}


def score_pmjay_dimensions(case, evidence_list: List[Evidence]) -> Tuple[float, float, float, float, float]:
    """
    Computes 5 individual PM-JAY risk dimension scores:
    (beneficiary_identity_risk, document_risk, hospital_risk, treatment_risk, claim_anomaly_risk)
    """
    ev_types = {e.evidence_type for e in evidence_list}

    # 1. Beneficiary / Identity Risk
    ben_risk = 5.0
    if "identity_mismatch" in ev_types or "beneficiary_conflict" in ev_types:
        ben_risk += 65.0
    if case.identity_status != "verified" or case.eligibility_status != "verified":
        ben_risk += 30.0
    ben_risk = min(100.0, ben_risk)

    # 2. Document / Evidence Risk
    doc_risk = 0.0
    if "missing_document" in ev_types:
        doc_risk += 60.0
    if "unreliable_evidence" in ev_types:
        doc_risk += 35.0
    doc_risk = min(100.0, doc_risk)

    # 3. Hospital / Provider Risk
    hosp_risk = 0.0
    if "hospital_conflict" in ev_types:
        hosp_risk += 55.0
    if case.hospital_status != "empaneled":
        hosp_risk += 40.0
    hosp_risk = min(100.0, hosp_risk)

    # 4. Treatment / Package Risk
    treat_risk = 5.0
    if "treatment_mismatch" in ev_types:
        treat_risk += 55.0
    if case.package_status != "approved":
        treat_risk += 35.0
    treat_risk = min(100.0, treat_risk)

    # 5. Claim / Anomaly Risk
    claim_risk = 5.0
    if "duplicate_claim" in ev_types:
        claim_risk += 70.0
    if "rate_mismatch" in ev_types or case.claimed_amount > case.approved_rate:
        claim_risk += 45.0
    if "agent_disagreement" in ev_types:
        claim_risk += 35.0
    if "low_agent_confidence" in ev_types:
        claim_risk += 25.0
    claim_risk = min(100.0, claim_risk)

    return ben_risk, doc_risk, hosp_risk, treat_risk, claim_risk


def score_evidence_risk(evidence_list: List[Evidence]) -> float:
    if not evidence_list:
        return 0.0
    score = sum(EVENT_IMPACT.get(e.evidence_type, 10.0) for e in evidence_list)
    return min(100.0, score)


def score_policy_sensitivity(
    claimed_amount: float,
    approved_rate: float,
    extra_flags: List[str],
) -> float:
    if approved_rate <= 0:
        return 100.0
    overage_ratio = claimed_amount / approved_rate
    if overage_ratio <= 1.0:
        base_score = 10.0
    elif overage_ratio <= 1.2:
        base_score = 40.0
    elif overage_ratio <= 1.5:
        base_score = 65.0
    else:
        base_score = 85.0
    policy_boost = min(len(extra_flags) * 10.0, 30.0)
    return min(base_score + policy_boost, 100.0)


def score_action_impact(action_type: str) -> float:
    return ACTION_IMPACT_SCORES.get(action_type, 50.0)


def score_confidence_risk(confidence: float) -> float:
    clamped = max(0.0, min(1.0, confidence))
    return round((1.0 - clamped) * 100.0, 2)


def score_reversibility_risk(action_type: str) -> float:
    return REVERSIBILITY_RISK_SCORES.get(action_type, 50.0)

