"""
autonomy/controller.py - The Autonomy Controller.

This is the ONLY component that determines the autonomy level for a case.
No other component may change or override the autonomy level.

Autonomy levels are determined entirely by the current risk score:

    L4 - Fully autonomous        : Risk < 20
    L3 - Audited autonomous      : 20 ≤ Risk < 40
    L2 - Human approval required : 40 ≤ Risk < 65
    L1 - AI recommendation only  : 65 ≤ Risk < 85
    L0 - Human-only / blocked    : Risk ≥ 85

Risk can move in both directions. If new evidence REDUCES risk,
autonomy increases. If new evidence INCREASES risk, autonomy decreases.
This is the "dynamic revocation" that NIYANTRA demonstrates.
"""
from typing import Tuple


# ─── Autonomy Level Thresholds ────────────────────────────────────────────────
# ─── Autonomy Level Thresholds ────────────────────────────────────────────────
AUTONOMY_THRESHOLDS = [
    (0.0,  20.5, "L4"),   # Fully autonomous
    (20.5, 40.5, "L3"),   # Limited autonomy (Audited autonomous)
    (40.5, 70.5, "L2"),   # Human approval required
    (70.5, 85.5, "L1"),   # Human decision required (AI recommendation only)
    (85.5, 101.0, "L0"),  # Blocked / Escalated
]

# ─── What actions each level is allowed to execute automatically ───────────────
LEVEL_ALLOWED_ACTIONS: dict[str, set[str]] = {
    "L4": {"read_case", "verify_beneficiary", "check_rate", "update_status", "claim_submit", "settlement", "authorize_claim"},
    "L3": {"read_case", "verify_beneficiary", "check_rate", "update_status", "claim_submit", "settlement", "authorize_claim"},
    "L2": {"read_case", "verify_beneficiary", "check_rate", "request_human_review"},
    "L1": {"read_case", "verify_beneficiary"},
    "L0": set(),
}

# ─── Minimum level required to auto-execute each action ──────────────────────
ACTION_MINIMUM_LEVEL: dict[str, str] = {
    "read_case": "L1",
    "verify_beneficiary": "L1",
    "request_human_review": "L2",
    "check_rate": "L2",
    "update_status": "L2",
    "claim_submit": "L3",
    "settlement": "L3",
    "authorize_claim": "L3",
    "reject_claim": "L1",
    "escalate_case": "L0",
}

# Numeric ordering (higher = more autonomous)
LEVEL_ORDER = {"L0": 0, "L1": 1, "L2": 2, "L3": 3, "L4": 4}


def determine_autonomy_level(risk_score: float) -> str:
    """
    Given a risk score (0-100), return the corresponding autonomy level.
    
    L4: Risk <= 20
    L3: 20 < Risk <= 40
    L2: 40 < Risk <= 70
    L1: 70 < Risk <= 85
    L0: Risk > 85
    """
    if risk_score <= 20.0:
        return "L4"
    elif risk_score <= 40.0:
        return "L3"
    elif risk_score <= 70.0:
        return "L2"
    elif risk_score <= 85.0:
        return "L1"
    else:
        return "L0"


def can_execute(autonomy_level: str, action_type: str) -> Tuple[bool, str]:
    """
    Determine if a given action can be automatically executed at this autonomy level.
    """
    allowed_actions = LEVEL_ALLOWED_ACTIONS.get(autonomy_level, set())

    if action_type not in allowed_actions:
        required = ACTION_MINIMUM_LEVEL.get(action_type, "L3")
        return (
            False,
            f"Current autonomy level {autonomy_level} does not permit '{action_type}' execution. "
            f"Minimum required level: {required}.",
        )

    return (True, f"Action '{action_type}' is permitted at autonomy level {autonomy_level}.")


def describe_level(level: str) -> str:
    """Human-readable description of an autonomy level."""
    descriptions = {
        "L4": "HIGH AUTONOMY - Fully autonomous execution permitted",
        "L3": "LIMITED AUTONOMY - Audited autonomous execution permitted",
        "L2": "HUMAN APPROVAL REQUIRED - System waits for human sign-off",
        "L1": "HUMAN DECISION REQUIRED - AI recommendation only, system cannot execute",
        "L0": "BLOCKED - System entirely prohibited, immediate human escalation",
    }
    return descriptions.get(level, "Unknown level")

