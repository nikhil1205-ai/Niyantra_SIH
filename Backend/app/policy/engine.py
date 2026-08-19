"""
policy/engine.py - Simple CGHS Policy Engine.

Loads rules from cghs_policy.json and evaluates them against a case.
Returns: list of triggered rule IDs + an overall policy_sensitivity score.

No complex rule DSL - just simple Python conditionals.
"""
import json
from pathlib import Path
from typing import List, Tuple

# Load policy rules once at module import time
_POLICY_FILE = Path(__file__).parent / "cghs_policy.json"
_POLICY = json.loads(_POLICY_FILE.read_text(encoding="utf-8"))


def evaluate_policy(
    claimed_amount: float,
    approved_rate: float,
    evidence_types: List[str],
) -> Tuple[List[str], float]:
    """
    Evaluate CGHS policy rules against the current case state.

    Args:
        claimed_amount: What the hospital claimed.
        approved_rate: The CGHS approved package rate.
        evidence_types: List of evidence_type strings on the case.

    Returns:
        (triggered_rule_ids, policy_sensitivity_score)
        
        policy_sensitivity_score is 0-100.
        It equals the max severity of any triggered rule,
        boosted by 5 points per additional triggered rule (capped at 100).
    """
    triggered_ids: List[str] = []
    triggered_severities: List[float] = []

    # Convert evidence types to a lookup set for O(1) membership checks
    ev_set = set(evidence_types)

    for rule in _POLICY["rules"]:
        rule_id = rule["id"]
        fired = False

        # Evaluate each rule condition explicitly - no eval(), no DSL
        if rule_id == "RATE-001":
            fired = claimed_amount > approved_rate
        elif rule_id == "DUP-001":
            fired = "duplicate_claim" in ev_set
        elif rule_id == "DOC-001":
            fired = "missing_document" in ev_set
        elif rule_id == "BEN-001":
            fired = "beneficiary_conflict" in ev_set
        elif rule_id == "HIGH-001":
            fired = claimed_amount > 100_000

        if fired:
            triggered_ids.append(rule_id)
            triggered_severities.append(rule["severity"])

    if not triggered_severities:
        return [], 10.0  # Clean case - low baseline policy sensitivity

    max_severity = max(triggered_severities)
    extra_boost = (len(triggered_severities) - 1) * 5.0
    sensitivity = min(max_severity + extra_boost, 100.0)

    return triggered_ids, round(sensitivity, 2)


def get_policy_version() -> str:
    return _POLICY.get("version", "unknown")
