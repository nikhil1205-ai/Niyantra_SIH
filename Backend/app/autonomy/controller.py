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
AUTONOMY_THRESHOLDS = [
    (0.0,  20.0, "L4"),   # Fully autonomous
    (20.0, 40.0, "L3"),   # Audited autonomous
    (40.0, 65.0, "L2"),   # Human approval required
    (65.0, 85.0, "L1"),   # AI recommendation only
    (85.0, 101.0, "L0"),  # Human-only / blocked
]

# ─── What actions each level is allowed to execute automatically ───────────────
# Actions NOT in this set require human approval at that level or above.
LEVEL_ALLOWED_ACTIONS: dict[str, set[str]] = {
    "L4": {"read_case", "verify_beneficiary", "check_rate", "update_status", "claim_submit", "settlement"},
    "L3": {"read_case", "verify_beneficiary", "check_rate", "update_status", "claim_submit", "settlement"},
    "L2": {"read_case", "verify_beneficiary", "check_rate"},   # Higher actions need human approval
    "L1": {"read_case", "verify_beneficiary"},                 # Can only recommend
    "L0": set(),                                               # Fully blocked
}

# ─── Minimum level required to auto-execute each action ──────────────────────
ACTION_MINIMUM_LEVEL: dict[str, str] = {
    "read_case": "L1",
    "verify_beneficiary": "L1",
    "check_rate": "L2",
    "update_status": "L2",
    "claim_submit": "L3",
    "settlement": "L3",
}

# Numeric ordering (higher = more autonomous)
LEVEL_ORDER = {"L0": 0, "L1": 1, "L2": 2, "L3": 3, "L4": 4}


def determine_autonomy_level(risk_score: float) -> str:
    """
    Given a risk score (0-100), return the corresponding autonomy level.
    
    This is the single source of truth for autonomy level assignment.
    All other components MUST call this function (or read the stored level).
    """
    for low, high, level in AUTONOMY_THRESHOLDS:
        if low <= risk_score < high:
            return level
    return "L0"  # Fallback for any edge case


def can_execute(autonomy_level: str, action_type: str) -> Tuple[bool, str]:
    """
    Determine if a given action can be automatically executed at this autonomy level.

    Returns:
        (allowed: bool, reason: str)

    The Tool Gateway calls this before EVERY execution.
    The Gateway never caches this result.
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
        "L4": "Fully Autonomous - system can execute without oversight",
        "L3": "Audited Autonomous - system executes with audit logging",
        "L2": "Human Approval Required - system waits for human sign-off",
        "L1": "AI Recommendation Only - system cannot execute, human must act",
        "L0": "Blocked - system entirely prohibited, human-only intervention",
    }
    return descriptions.get(level, "Unknown level")
