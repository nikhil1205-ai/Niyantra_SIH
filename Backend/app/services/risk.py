"""
NIYANTRA Module 3 — Dynamic Risk Engine & Autonomy Controller
=============================================================
Architecture:
  Agent Results (Module 2)
        ↓
  RiskEngine.calculate()  ← 7 transparent weighted factors
        ↓
  AutonomyController.decide()  ← threshold-based L1/L2/L3
        ↓
  RiskOrchestrator.evaluate()  ← persists history, updates case state

Design Principles:
  - Deterministic: same case state → same risk score every time
  - Transparent: every factor contributes an explained partial score
  - Configurable: all weights and thresholds live in RISK_CONFIG below
  - Auditable: every evaluation appended to history (never overwritten)
"""
import json
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlmodel import Session, select

from app.models import (
    Case, Application, Evidence, AgentResult, CaseEvent,
    RiskEvaluation, AutonomyDecision, DecisionLineage,
)
from app.services.state import StateService


# ─── CENTRALISED RISK CONFIGURATION ───────────────────────────────────────────
# All weights sum to 1.0. Edit here to retune the engine.
# Factor weights: higher weight = factor has more influence on final score.

RISK_CONFIG = {
    # Relative contribution of each factor to total risk (must sum to 1.0)
    "weights": {
        "agent_confidence":      0.25,   # average AI agent certainty
        "agent_disagreement":    0.25,   # inter-agent conflict
        "evidence_reliability":  0.20,   # quality of submitted evidence
        "action_impact":         0.10,   # requested amount vs damage ratio
        "policy_sensitivity":    0.08,   # disaster category risk flag
        "anomaly":               0.07,   # missing or suspicious documents
        "financial_impact":      0.05,   # absolute requested relief amount
    },

    # Autonomy thresholds: [inclusive_lower, inclusive_upper]
    "autonomy_thresholds": {
        "L3": (0,  30),    # Low risk  → High Autonomy
        "L2": (31, 60),    # Med risk  → Controlled Autonomy
        "L1": (61, 100),   # High risk → Human Controlled
    },

    # Per-level permitted actions (Tool Gateway will enforce these)
    "level_actions": {
        "L3": {
            "allowed":     ["VERIFY_IDENTITY", "CHECK_ELIGIBILITY", "GATHER_EVIDENCE", "PREPARE_PAYMENT", "GENERATE_REPORT"],
            "restricted":  [],
            "reason":      "Current case risk is within the autonomous processing threshold. AI may perform all permitted workflow actions.",
        },
        "L2": {
            "allowed":     ["VERIFY_IDENTITY", "CHECK_ELIGIBILITY", "GATHER_EVIDENCE", "GENERATE_REPORT"],
            "restricted":  ["PREPARE_PAYMENT", "DISBURSE_FUNDS"],
            "reason":      "Moderate risk detected. AI may analyse and prepare actions but payment-related steps require additional authorization.",
        },
        "L1": {
            "allowed":     ["GENERATE_REPORT", "FLAG_FOR_OFFICER"],
            "restricted":  ["PREPARE_PAYMENT", "DISBURSE_FUNDS", "GATHER_EVIDENCE", "VERIFY_IDENTITY"],
            "reason":      "High risk detected. AI may only analyse and recommend. All sensitive execution requires human officer review.",
        },
    },

    # High-sensitivity disaster categories that add slight policy risk
    "high_sensitivity_disasters": ["Cyclone", "Earthquake", "Tsunami"],

    # Financial thresholds (INR)
    "financial_high_threshold": 100_000,   # > ₹1L → higher financial risk factor
    "financial_low_threshold":  50_000,    # < ₹50K → lower financial risk factor

    # Module 4: Evidence conflict bonus added to anomaly factor when
    # field inspection report contradicts AI damage assessment.
    # Config-driven so it is explicit and tunable, not magic numbers.
    "evidence_conflict_bonus": 55,   # raw anomaly points added on conflict
}


# ─── RISK ENGINE ───────────────────────────────────────────────────────────────

class RiskEngine:
    """
    Deterministic, weighted risk calculator.
    Each factor is independently normalised to 0–100 (higher = riskier).
    Final score = weighted sum of factors, clamped to 0–100.
    Consumes canonical case state to prevent score drift and double counting.
    """

    @staticmethod
    def calculate_from_state(state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compute a risk score from canonical state.
        Returns a dict with risk_score, risk_level, risk_factors, explanation.
        """
        weights = RISK_CONFIG["weights"]
        factors: List[Dict[str, Any]] = []

        agent_results = list(state.get("agent_results", {}).values())

        # ── Factor 1: Agent Confidence ─────────────────────────────────────────
        if agent_results:
            avg_conf = sum(getattr(r, "confidence", 0.0) for r in agent_results) / len(agent_results)
        else:
            avg_conf = 0.0
        conf_raw = round((1.0 - avg_conf) * 100, 1)
        conf_contribution = _classify_contribution(conf_raw)
        factors.append({
            "factor": "agent_confidence",
            "display": "Agent Confidence",
            "raw_value": round(avg_conf * 100, 1),
            "raw_label": f"{round(avg_conf * 100, 1)}% average confidence",
            "factor_risk": conf_raw,
            "contribution": conf_contribution,
            "weight": weights["agent_confidence"],
        })

        # ── Factor 2: Agent Disagreement ──────────────────────────────────────
        disagreement_statuses = {"REQUIRES_REVIEW", "INCONSISTENT", "INELIGIBLE", "FAILED"}
        disagree_count = sum(1 for r in agent_results if getattr(r, "status", "") in disagreement_statuses)
        disagree_raw = min(round((disagree_count / max(len(agent_results), 1)) * 90, 1), 90.0)
        disagree_contribution = _classify_contribution(disagree_raw)
        factors.append({
            "factor": "agent_disagreement",
            "display": "Agent Disagreement",
            "raw_value": disagree_count,
            "raw_label": f"{disagree_count} of {len(agent_results)} agents flagged",
            "factor_risk": disagree_raw,
            "contribution": disagree_contribution,
            "weight": weights["agent_disagreement"],
        })

        # ── Factor 3: Evidence Reliability ────────────────────────────────────
        agents_with_evidence = sum(
            1 for r in agent_results
            if getattr(r, "evidence_ids_json", None) and json.loads(getattr(r, "evidence_ids_json"))
        )
        total_agents = max(len(agent_results), 1)
        evidence_coverage = agents_with_evidence / total_agents
        ev_raw = round((1.0 - evidence_coverage) * 70, 1)
        ev_contribution = _classify_contribution(ev_raw)
        factors.append({
            "factor": "evidence_reliability",
            "display": "Evidence Reliability",
            "raw_value": round(evidence_coverage * 100, 1),
            "raw_label": f"{agents_with_evidence}/{total_agents} agents have linked evidence",
            "factor_risk": ev_raw,
            "contribution": ev_contribution,
            "weight": weights["evidence_reliability"],
        })

        # ── Factor 4: Action Impact ────────────────────────────────────────────
        req_amount = state.get("requested_amount", 0.0)
        est_damage = state.get("estimated_damage", 0.0)
        if est_damage and est_damage > 0:
            ratio = req_amount / est_damage
            impact_raw = round(min(ratio, 1.0) * 80, 1)
        else:
            impact_raw = 50.0
        impact_contribution = _classify_contribution(impact_raw)
        factors.append({
            "factor": "action_impact",
            "display": "Action Impact",
            "raw_value": round(req_amount, 2),
            "raw_label": f"Relief ratio {round((req_amount / est_damage * 100) if est_damage else 0, 1)}% of damage estimate",
            "factor_risk": impact_raw,
            "contribution": impact_contribution,
            "weight": weights["action_impact"],
        })

        # ── Factor 5: Policy Sensitivity ──────────────────────────────────────
        disaster_type = state.get("disaster_type", "Flood")
        high_sens = RISK_CONFIG["high_sensitivity_disasters"]
        if disaster_type in high_sens:
            policy_raw = 65.0
            policy_label = f"{disaster_type} — high-sensitivity category"
        else:
            policy_raw = 20.0
            policy_label = f"{disaster_type} — standard category"
        policy_contribution = _classify_contribution(policy_raw)
        factors.append({
            "factor": "policy_sensitivity",
            "display": "Policy Sensitivity",
            "raw_value": policy_raw,
            "raw_label": policy_label,
            "factor_risk": policy_raw,
            "contribution": policy_contribution,
            "weight": weights["policy_sensitivity"],
        })

        # ── Factor 6: Anomaly Detection (Documents, Conflict & Fraud) ──────────
        missing = 0 if state.get("evidence_count", 0) > 0 else 2
        anomaly_raw = round(missing * 25.0, 1)

        conflict_active = state.get("has_evidence_conflict", False)
        fraud_active = state.get("fraud_indicator", False)
        conflict_note = ""

        if conflict_active:
            anomaly_raw = min(anomaly_raw + RISK_CONFIG["evidence_conflict_bonus"], 100.0)
            conflict_note += " + active evidence conflict"
        if fraud_active:
            anomaly_raw = min(anomaly_raw + 45.0, 100.0)
            conflict_note += " + verified fraud indicator"

        anomaly_contribution = _classify_contribution(anomaly_raw)
        factors.append({
            "factor": "anomaly",
            "display": "Process Anomalies",
            "raw_value": missing,
            "raw_label": f"{missing} document issue(s){conflict_note}",
            "factor_risk": anomaly_raw,
            "contribution": anomaly_contribution,
            "weight": weights["anomaly"],
            "conflict_active": conflict_active,
            "fraud_active": fraud_active,
        })

        # ── Factor 7: Financial / Citizen Impact ──────────────────────────────
        hi_thresh = RISK_CONFIG["financial_high_threshold"]
        lo_thresh = RISK_CONFIG["financial_low_threshold"]
        if req_amount >= hi_thresh:
            fin_raw = 80.0
        elif req_amount >= lo_thresh:
            fin_raw = 45.0
        else:
            fin_raw = 15.0
        fin_contribution = _classify_contribution(fin_raw)
        factors.append({
            "factor": "financial_impact",
            "display": "Financial / Citizen Impact",
            "raw_value": req_amount,
            "raw_label": f"Requested ₹{req_amount:,.0f}",
            "factor_risk": fin_raw,
            "contribution": fin_contribution,
            "weight": weights["financial_impact"],
        })

        # ── Weighted Aggregation ───────────────────────────────────────────────
        weighted_sum = sum(f["factor_risk"] * f["weight"] for f in factors)
        risk_score = round(min(max(weighted_sum, 0.0), 100.0), 1)
        risk_level = _classify_risk_level(risk_score)

        explanation = _build_explanation(risk_score, risk_level, factors, disagree_count, avg_conf)

        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_factors": factors,
            "explanation": explanation,
        }

    @staticmethod
    def calculate(
        case: Case,
        app: Application,
        evidence: List[Evidence],
        agent_results: List[AgentResult],
    ) -> Dict[str, Any]:
        """Backward compatibility wrapper for calculate."""
        state = {
            "case_id": case.case_id,
            "requested_amount": app.requested_amount if app else 0.0,
            "estimated_damage": app.estimated_damage if app else 0.0,
            "disaster_type": app.disaster_type if app else "Flood",
            "evidence_count": len(evidence),
            "agent_results": {r.agent_name: r for r in agent_results},
            "has_evidence_conflict": getattr(case, "has_evidence_conflict", False),
            "fraud_indicator": False,
        }
        return RiskEngine.calculate_from_state(state)


# ─── AUTONOMY CONTROLLER ───────────────────────────────────────────────────────

class AutonomyController:
    """
    Maps a deterministic risk score to an autonomy level (L1/L2/L3)
    and emits permitted/restricted action lists from configuration.
    """

    @staticmethod
    def decide(risk_score: float, previous_autonomy: Optional[str] = None) -> Dict[str, Any]:
        thresholds = RISK_CONFIG["autonomy_thresholds"]
        actions    = RISK_CONFIG["level_actions"]

        autonomy_level = "L1"  # safest default
        for level, (lo, hi) in thresholds.items():
            if lo <= risk_score <= hi:
                autonomy_level = level
                break

        cfg = actions[autonomy_level]
        return {
            "autonomy_level":     autonomy_level,
            "allowed_actions":    cfg["allowed"],
            "restricted_actions": cfg["restricted"],
            "reason":             cfg["reason"],
            "previous_autonomy":  previous_autonomy,
        }


# ─── RISK ORCHESTRATOR ─────────────────────────────────────────────────────────

class RiskOrchestrator:
    """
    Coordinates RiskEngine + AutonomyController, persists immutable history,
    and updates the Case state. Designed for reuse by Module 4.
    """

    def __init__(self, session: Session):
        self.session = session

    def evaluate(self, case_id: str) -> Dict[str, Any]:
        """
        Full Module 3 evaluation pipeline:
          1. Load current case, app, evidence, latest agent results
          2. Calculate risk (RiskEngine)
          3. Decide autonomy (AutonomyController)
          4. Persist RiskEvaluation + AutonomyDecision + DecisionLineage (append-only)
          5. Update Case.current_risk, current_autonomy, current_stage
          6. Emit RISK_EVALUATED + AUTONOMY_ASSIGNED CaseEvents
        """
        # ── Load canonical case state ──────────────────────────────────────────
        case_obj = self.session.exec(select(Case).where(Case.case_id == case_id)).first()
        if not case_obj:
            raise ValueError(f"Case {case_id} not found.")

        canonical_state = StateService.get_current_case_state(self.session, case_id)
        agent_results = list(canonical_state.get("agent_results", {}).values())

        # ── Calculate risk with fail-safe error handling ──────────────────────
        try:
            risk_result = RiskEngine.calculate_from_state(canonical_state)
        except Exception as err:
            # FAIL-SAFE: If risk engine fails, default to score 85 (HIGH risk, L1)
            risk_result = {
                "risk_score": 85.0,
                "risk_level": "HIGH",
                "risk_factors": [{"factor": "system_fail_safe", "factor_risk": 85.0, "contribution": "HIGH", "weight": 1.0}],
                "explanation": f"Fail-safe protection triggered due to calculation error: {str(err)}",
            }

        # ── Decide autonomy ───────────────────────────────────────────────────
        previous_autonomy = case_obj.current_autonomy
        autonomy_result   = AutonomyController.decide(risk_result["risk_score"], previous_autonomy)

        # ── Generate IDs ──────────────────────────────────────────────────────
        risk_id     = f"RISK-{uuid.uuid4().hex[:8].upper()}"
        decision_id = f"AUTO-{uuid.uuid4().hex[:8].upper()}"
        lineage_id  = f"LIN-{uuid.uuid4().hex[:8].upper()}"
        now         = datetime.now(timezone.utc)

        # ── Persist RiskEvaluation (append-only) ──────────────────────────────
        risk_record = RiskEvaluation(
            risk_id=risk_id,
            case_id=case_id,
            risk_score=risk_result["risk_score"],
            risk_level=risk_result["risk_level"],
            risk_factors_json=json.dumps(risk_result["risk_factors"]),
            explanation=risk_result["explanation"],
            created_at=now,
        )
        self.session.add(risk_record)

        # ── Persist AutonomyDecision (append-only) ────────────────────────────
        auto_record = AutonomyDecision(
            decision_id=decision_id,
            case_id=case_id,
            risk_id=risk_id,
            previous_autonomy=previous_autonomy,
            autonomy_level=autonomy_result["autonomy_level"],
            allowed_actions_json=json.dumps(autonomy_result["allowed_actions"]),
            restricted_actions_json=json.dumps(autonomy_result["restricted_actions"]),
            reason=autonomy_result["reason"],
            created_at=now,
        )
        self.session.add(auto_record)

        # ── Persist DecisionLineage ────────────────────────────────────────────
        agent_summary = {
            r.agent_name: {
                "status": r.status,
                "confidence": r.confidence,
                "recommended_action": r.recommended_action,
            }
            for r in agent_results
        }
        avg_conf_pct = (round(sum(r.confidence for r in agent_results)/len(agent_results)*100, 1)) if agent_results else 0.0
        summary_explanation = (
            f"Case {case_id}: Agent avg confidence {avg_conf_pct}%. "
            f"Risk Score: {risk_result['risk_score']}. Autonomy: {autonomy_result['autonomy_level']}. "
            f"Reason: {autonomy_result['reason']}"
        )
        lineage_record = DecisionLineage(
            lineage_id=lineage_id,
            case_id=case_id,
            risk_id=risk_id,
            decision_id=decision_id,
            agent_summary_json=json.dumps(agent_summary),
            risk_factors_json=json.dumps(risk_result["risk_factors"]),
            risk_score=risk_result["risk_score"],
            autonomy_level=autonomy_result["autonomy_level"],
            summary_explanation=summary_explanation,
            created_at=now,
        )
        self.session.add(lineage_record)

        # ── Update Case State & Automatic Routing ─────────────────────────────
        case_obj.current_risk     = risk_result["risk_score"]
        case_obj.current_autonomy = autonomy_result["autonomy_level"]
        
        # AUTOMATIC ROUTING: If L1 (Human Controlled), set stage to REQUIRES_HUMAN_REVIEW
        if autonomy_result["autonomy_level"] == "L1":
            case_obj.current_stage = "REQUIRES_HUMAN_REVIEW"
        else:
            case_obj.current_stage = "RISK_EVALUATED"

        case_obj.status     = "RISK_EVALUATED"
        case_obj.updated_at = now
        self.session.add(case_obj)

        # ── Emit CaseEvents ───────────────────────────────────────────────────
        self._emit_event(case_id, "RISK_EVALUATED", "RISK_ENGINE", {
            "risk_id":    risk_id,
            "risk_score": risk_result["risk_score"],
            "risk_level": risk_result["risk_level"],
        })
        self._emit_event(case_id, "AUTONOMY_ASSIGNED", "AUTONOMY_CONTROLLER", {
            "decision_id":       decision_id,
            "autonomy_level":    autonomy_result["autonomy_level"],
            "previous_autonomy": previous_autonomy,
            "reason":            autonomy_result["reason"],
        })

        self.session.commit()

        return {
            "case_id":         case_id,
            "risk_id":         risk_id,
            "decision_id":     decision_id,
            "risk_score":      risk_result["risk_score"],
            "risk_level":      risk_result["risk_level"],
            "risk_factors":    risk_result["risk_factors"],
            "explanation":     risk_result["explanation"],
            "autonomy_level":  autonomy_result["autonomy_level"],
            "allowed_actions": autonomy_result["allowed_actions"],
            "restricted_actions": autonomy_result["restricted_actions"],
            "autonomy_reason": autonomy_result["reason"],
            "previous_autonomy": previous_autonomy,
            "current_stage":   "RISK_EVALUATED",
        }

    def _emit_event(self, case_id: str, event_type: str, source: str, metadata: Dict[str, Any]):
        evt_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
        event = CaseEvent(
            event_id=evt_id,
            case_id=case_id,
            event_type=event_type,
            source=source,
            metadata_json=json.dumps(metadata),
            created_at=datetime.now(timezone.utc),
        )
        self.session.add(event)


# ─── PRIVATE HELPERS ──────────────────────────────────────────────────────────

def _classify_contribution(factor_risk: float) -> str:
    """Classify a 0-100 factor risk score into a human-readable contribution label."""
    if factor_risk <= 20:
        return "LOW"
    if factor_risk <= 50:
        return "MEDIUM"
    return "HIGH"


def _classify_risk_level(score: float) -> str:
    """Map aggregate risk score to a risk level label."""
    if score <= 30:
        return "LOW"
    if score <= 60:
        return "MEDIUM"
    return "HIGH"


def _build_explanation(
    risk_score: float,
    risk_level: str,
    factors: List[Dict[str, Any]],
    disagree_count: int,
    avg_conf: float,
) -> str:
    """Generate a human-readable explanation string from computed factors."""
    conf_pct = round(avg_conf * 100, 1)
    if risk_level == "LOW":
        return (
            f"High-confidence agent findings ({conf_pct}% average) with "
            f"{'no' if disagree_count == 0 else str(disagree_count)} detected agent disagreement. "
            f"Evidence coverage is strong and all policy checks passed. "
            f"Current case risk ({risk_score}/100) is within the autonomous processing threshold."
        )
    if risk_level == "MEDIUM":
        high_factors = [f["display"] for f in factors if f["contribution"] == "HIGH"]
        return (
            f"Moderate risk detected (score {risk_score}/100). "
            f"Agent confidence is {conf_pct}%. "
            f"{'Agent disagreement was detected. ' if disagree_count > 0 else ''}"
            f"Elevated factors: {', '.join(high_factors) if high_factors else 'None'}. "
            f"Payment preparation requires additional authorization."
        )
    # HIGH
    high_factors = [f["display"] for f in factors if f["contribution"] == "HIGH"]
    return (
        f"High risk detected (score {risk_score}/100). "
        f"{'Agent disagreement present. ' if disagree_count > 0 else ''}"
        f"Agent confidence: {conf_pct}%. "
        f"Critical risk factors: {', '.join(high_factors) if high_factors else 'Multiple factors'}. "
        f"Human officer review is required before any sensitive action."
    )
