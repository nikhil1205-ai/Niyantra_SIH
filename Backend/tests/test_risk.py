"""
tests/test_risk.py - Tests for the Risk Engine.

Verifies:
1. Deterministic calculation (same inputs → same outputs)
2. Correct weight application
3. Score clamping to [0, 100]
4. Factor-specific scoring rules
"""
import pytest
from app.risk.calculator import calculate_risk, RiskResult
from app.risk.factors import (
    score_evidence_risk,
    score_confidence_risk,
    score_action_impact,
    score_reversibility_risk,
    score_policy_sensitivity,
)
from app.models.evidence import Evidence


def make_evidence(evidence_type: str) -> Evidence:
    """Helper to create an Evidence object without a DB session."""
    e = Evidence(
        case_ref="CASE-TEST",
        evidence_type=evidence_type,
        description="test",
    )
    return e


class TestRiskDeterminism:
    """Risk calculation must be deterministic: same inputs → same output."""

    def test_identical_inputs_produce_identical_output(self):
        result1 = calculate_risk(
            claimed_amount=50000,
            approved_rate=40000,
            evidence_list=[make_evidence("rate_mismatch")],
            action_type="settlement",
            confidence=0.80,
            triggered_policies=["RATE-001"],
        )
        result2 = calculate_risk(
            claimed_amount=50000,
            approved_rate=40000,
            evidence_list=[make_evidence("rate_mismatch")],
            action_type="settlement",
            confidence=0.80,
            triggered_policies=["RATE-001"],
        )
        assert result1.risk_score == result2.risk_score
        assert result1.evidence_risk == result2.evidence_risk
        assert result1.policy_sensitivity == result2.policy_sensitivity

    def test_clean_case_has_low_risk(self):
        result = calculate_risk(
            claimed_amount=38000,
            approved_rate=40000,
            evidence_list=[make_evidence("normal")],
            action_type="settlement",
            confidence=0.90,
            triggered_policies=[],
        )
        assert result.risk_score < 30, f"Clean case should have low risk, got {result.risk_score}"

    def test_rate_mismatch_increases_risk(self):
        clean_result = calculate_risk(
            claimed_amount=38000,
            approved_rate=40000,
            evidence_list=[],
            action_type="read_case",
            confidence=0.95,
            triggered_policies=[],
        )
        mismatch_result = calculate_risk(
            claimed_amount=65000,
            approved_rate=40000,
            evidence_list=[make_evidence("rate_mismatch")],
            action_type="settlement",
            confidence=0.60,
            triggered_policies=["RATE-001"],
        )
        assert mismatch_result.risk_score > clean_result.risk_score

    def test_score_clamped_to_100(self):
        # Worst-case inputs
        evidence_list = [
            make_evidence("rate_mismatch"),
            make_evidence("duplicate_claim"),
            make_evidence("missing_document"),
            make_evidence("beneficiary_conflict"),
        ]
        result = calculate_risk(
            claimed_amount=200000,
            approved_rate=40000,
            evidence_list=evidence_list,
            action_type="settlement",
            confidence=0.01,
            triggered_policies=["RATE-001", "DUP-001", "DOC-001", "BEN-001"],
        )
        assert result.risk_score <= 100.0

    def test_score_never_negative(self):
        result = calculate_risk(
            claimed_amount=0,
            approved_rate=40000,
            evidence_list=[],
            action_type="read_case",
            confidence=1.0,
            triggered_policies=[],
        )
        assert result.risk_score >= 0.0


class TestFactorScoring:
    def test_confidence_risk_inverse_relationship(self):
        """Low confidence → high confidence_risk."""
        high_conf = score_confidence_risk(0.90)
        low_conf = score_confidence_risk(0.30)
        assert low_conf > high_conf
        assert abs(high_conf - 10.0) < 1.0   # 0.90 confidence → ~10 risk
        assert abs(low_conf - 70.0) < 1.0    # 0.30 confidence → ~70 risk

    def test_settlement_has_high_impact(self):
        settlement_impact = score_action_impact("settlement")
        read_impact = score_action_impact("read_case")
        assert settlement_impact > read_impact
        assert settlement_impact >= 80

    def test_settlement_has_high_reversibility_risk(self):
        settlement_rev = score_reversibility_risk("settlement")
        read_rev = score_reversibility_risk("read_case")
        assert settlement_rev > read_rev
        assert settlement_rev >= 80

    def test_policy_sensitivity_within_rate(self):
        score = score_policy_sensitivity(38000, 40000, [])
        assert score < 20, f"Within-rate claim should have low policy sensitivity, got {score}"

    def test_policy_sensitivity_over_rate(self):
        score = score_policy_sensitivity(65000, 40000, ["RATE-001"])
        assert score >= 65, f"Over-rate claim should have high policy sensitivity, got {score}"

    def test_multiple_evidence_items_compound(self):
        single = score_evidence_risk([make_evidence("rate_mismatch")])
        multiple = score_evidence_risk([
            make_evidence("rate_mismatch"),
            make_evidence("duplicate_claim"),
        ])
        assert multiple >= single, "Multiple bad evidence items should not reduce risk"
