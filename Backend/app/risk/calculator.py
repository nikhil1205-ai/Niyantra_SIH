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


@dataclass
class RiskResult:
    """Complete breakdown of a risk calculation."""
    risk_score: float          # Final weighted score 0-100
    evidence_risk: float
    policy_sensitivity: float
    action_impact: float
    confidence_risk: float
    reversibility_risk: float
    triggered_policies: List[str]  # Policy rule IDs that fired


def calculate_risk(
    claimed_amount: float,
    approved_rate: float,
    evidence_list: List[Evidence],
    action_type: str,
    confidence: float,
    triggered_policies: List[str],
) -> RiskResult:
    """
    Calculate the composite risk score for a case + proposed action.

    This is the ONLY place in the system that computes risk.
    All other components read the stored risk score from the Case model.
    """
    ev_risk = score_evidence_risk(evidence_list)
    pol_sens = score_policy_sensitivity(claimed_amount, approved_rate, triggered_policies)
    act_impact = score_action_impact(action_type)
    conf_risk = score_confidence_risk(confidence)
    rev_risk = score_reversibility_risk(action_type)

    raw = (
        WEIGHT_EVIDENCE * ev_risk
        + WEIGHT_POLICY * pol_sens
        + WEIGHT_ACTION * act_impact
        + WEIGHT_CONFIDENCE * conf_risk
        + WEIGHT_REVERSIBILITY * rev_risk
    )

    # Clamp to [0, 100]
    final_score = round(max(0.0, min(100.0, raw)), 2)

    return RiskResult(
        risk_score=final_score,
        evidence_risk=round(ev_risk, 2),
        policy_sensitivity=round(pol_sens, 2),
        action_impact=round(act_impact, 2),
        confidence_risk=round(conf_risk, 2),
        reversibility_risk=round(rev_risk, 2),
        triggered_policies=triggered_policies,
    )
