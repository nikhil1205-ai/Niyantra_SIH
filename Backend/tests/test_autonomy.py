"""
tests/test_autonomy.py - Tests for the Autonomy Controller.

Verifies:
1. Risk thresholds map to correct levels
2. can_execute() correctly allows/blocks actions
3. Dynamic revocation: risk changes change allowed actions
"""
import pytest
from app.autonomy.controller import determine_autonomy_level, can_execute, LEVEL_ORDER


class TestAutonomyLevelMapping:
    """Verify risk → autonomy level mapping is correct."""

    def test_l4_very_low_risk(self):
        assert determine_autonomy_level(0.0) == "L4"
        assert determine_autonomy_level(10.0) == "L4"
        assert determine_autonomy_level(19.9) == "L4"

    def test_l3_low_risk(self):
        assert determine_autonomy_level(20.0) == "L3"
        assert determine_autonomy_level(30.0) == "L3"
        assert determine_autonomy_level(39.9) == "L3"

    def test_l2_medium_risk(self):
        assert determine_autonomy_level(40.0) == "L2"
        assert determine_autonomy_level(50.0) == "L2"
        assert determine_autonomy_level(64.9) == "L2"

    def test_l1_high_risk(self):
        assert determine_autonomy_level(65.0) == "L1"
        assert determine_autonomy_level(72.0) == "L1"
        assert determine_autonomy_level(84.9) == "L1"

    def test_l0_critical_risk(self):
        assert determine_autonomy_level(85.0) == "L0"
        assert determine_autonomy_level(90.0) == "L0"
        assert determine_autonomy_level(100.0) == "L0"

    def test_low_risk_gets_high_autonomy(self):
        """Core governance rule: lower risk = higher autonomy."""
        low_level = determine_autonomy_level(10.0)
        high_level = determine_autonomy_level(80.0)
        assert LEVEL_ORDER[low_level] > LEVEL_ORDER[high_level]

    def test_risk_can_move_bidirectionally(self):
        """Risk can increase or decrease - autonomy follows."""
        level_clean = determine_autonomy_level(15.0)
        level_risky = determine_autonomy_level(70.0)
        level_back_clean = determine_autonomy_level(15.0)

        assert level_clean == "L4"
        assert level_risky == "L1"
        assert level_back_clean == "L4"  # Back to clean = back to high autonomy


class TestCanExecute:
    """Verify can_execute() allows and blocks the right actions."""

    def test_l4_allows_settlement(self):
        allowed, _ = can_execute("L4", "settlement")
        assert allowed is True

    def test_l3_allows_settlement(self):
        allowed, _ = can_execute("L3", "settlement")
        assert allowed is True

    def test_l2_blocks_settlement(self):
        """L2 requires human approval for settlement - handled separately by Gateway."""
        allowed, reason = can_execute("L2", "settlement")
        assert allowed is False
        assert "L2" in reason

    def test_l1_blocks_settlement(self):
        allowed, reason = can_execute("L1", "settlement")
        assert allowed is False
        assert "L1" in reason

    def test_l0_blocks_everything(self):
        for action in ["read_case", "verify_beneficiary", "settlement", "claim_submit"]:
            allowed, reason = can_execute("L0", action)
            assert allowed is False, f"L0 should block '{action}'"

    def test_l1_allows_read(self):
        allowed, _ = can_execute("L1", "read_case")
        assert allowed is True

    def test_l1_allows_verify(self):
        allowed, _ = can_execute("L1", "verify_beneficiary")
        assert allowed is True

    def test_blocked_reason_mentions_level(self):
        allowed, reason = can_execute("L1", "settlement")
        assert not allowed
        assert "L1" in reason or "autonomy" in reason.lower()
