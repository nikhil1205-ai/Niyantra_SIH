"""
risk/calculator.py - The NIYANTRA Risk Engine.

Calculates a deterministic risk score using five weighted factors.

Formula:
    Risk = 0.30 × evidence_risk
         + 0.25 × policy_sensitivity
         + 0.20 × action_impact
         + 0.15 × confidence_risk
         + 0.10 × reversibility_risk

All inputs and outputs are in range [0, 100].
Given identical inputs, the result is always identical (no randomness).
"""
from dataclasses import dataclass
from typing import List

from app.models.evidence import Evidence
from app.risk.factors import (
    score_evidence_risk,
    score_policy_sensitivity,
    score_action_impact,
    score_confidence_risk,
    score_reversibility_risk,
)


# ─── Weights (must sum to 1.0) ────────────────────────────────────────────────
WEIGHT_EVIDENCE = 0.30
WEIGHT_POLICY = 0.25
WEIGHT_ACTION = 0.20
WEIGHT_CONFIDENCE = 0.15
WEIGHT_REVERSIBILITY = 0.10


from dataclasses import dataclass, field
from typing import List, Optional, Any
from app.models.evidence import Evidence
from app.risk.factors import (
    score_evidence_risk,
    score_policy_sensitivity,
    score_action_impact,
    score_confidence_risk,
    score_reversibility_risk,
    score_pmjay_dimensions,
)


@dataclass
class RiskResult:
    """Complete breakdown of a PM-JAY risk calculation."""
    risk_score: float          # Final weighted score 0-100
    evidence_risk: float
    policy_sensitivity: float
    action_impact: float
    confidence_risk: float
    reversibility_risk: float
    triggered_policies: List[str]
    # 5 PM-JAY specific risk dimensions
    beneficiary_identity_risk: float = 0.0
    document_risk: float = 0.0
    hospital_risk: float = 0.0
    treatment_risk: float = 0.0
    claim_anomaly_risk: float = 0.0


def calculate_risk(
    claimed_amount: float,
    approved_rate: float,
    evidence_list: List[Evidence],
    action_type: str = "authorize_claim",
    confidence: float = 0.95,
    triggered_policies: List[str] = None,
    case: Optional[Any] = None,
) -> RiskResult:
    if triggered_policies is None:
        triggered_policies = []

    ev_risk = score_evidence_risk(evidence_list)
    pol_sens = score_policy_sensitivity(claimed_amount, approved_rate, triggered_policies)
    act_impact = score_action_impact(action_type)
    conf_risk = score_confidence_risk(confidence)
    rev_risk = score_reversibility_risk(action_type)

    if case is not None:
        ben_r, doc_r, hosp_r, treat_r, claim_r = score_pmjay_dimensions(case, evidence_list)
    else:
        # Fallback if case instance is not passed
        ben_r = ev_risk * 0.5
        doc_r = ev_risk * 0.7
        hosp_r = 5.0
        treat_r = 5.0
        claim_r = ev_risk

    # Composite PM-JAY risk calculation
    # Base risk starts from 5 PM-JAY dimensions + evidence event score additions
    pmjay_composite = 0.25 * ben_r + 0.20 * doc_r + 0.15 * hosp_r + 0.20 * treat_r + 0.20 * claim_r

    # Incorporate evidence event additions directly for continuous risk recomputation
    event_additions = sum([
        35.0 if e.evidence_type == "duplicate_claim" else
        30.0 if e.evidence_type in ("identity_mismatch", "beneficiary_conflict") else
        20.0 if e.evidence_type == "treatment_mismatch" else
        15.0 if e.evidence_type == "low_agent_confidence" else
        20.0 if e.evidence_type == "agent_disagreement" else
        25.0 if e.evidence_type == "rate_mismatch" else 0.0
        for e in evidence_list
    ])

    raw_score = pmjay_composite + (0.5 * event_additions)
    if not evidence_list:
        raw_score = 15.0  # Clean baseline low risk

    final_score = round(max(0.0, min(100.0, raw_score)), 2)

    return RiskResult(
        risk_score=final_score,
        evidence_risk=round(ev_risk, 2),
        policy_sensitivity=round(pol_sens, 2),
        action_impact=round(act_impact, 2),
        confidence_risk=round(conf_risk, 2),
        reversibility_risk=round(rev_risk, 2),
        triggered_policies=triggered_policies,
        beneficiary_identity_risk=round(ben_r, 2),
        document_risk=round(doc_r, 2),
        hospital_risk=round(hosp_r, 2),
        treatment_risk=round(treat_r, 2),
        claim_anomaly_risk=round(claim_r, 2),
    )

