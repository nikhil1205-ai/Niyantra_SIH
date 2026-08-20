"""
NIYANTRA Core Dynamic Governance Engine — Canonical Case State Service
=====================================================================
Builds a single, authoritative canonical state dictionary for a case by
aggregating Application data, verified Evidence, AI Agent findings, and
verified Event updates.

The Risk Engine consumes this object to evaluate risk from scratch without
relying on scattered table queries or incremental score drift.
"""
import json
from typing import Dict, Any, Optional, List
from sqlmodel import Session, select

from app.models import Case, Application, Evidence, AgentResult, CaseEvent, RiskEvaluation


class StateService:
    """
    Canonical State Service Boundary.
    Assembles the current ground truth state for a case.
    """

    @staticmethod
    def get_current_case_state(session: Session, case_id: str) -> Dict[str, Any]:
        case_obj = session.exec(select(Case).where(Case.case_id == case_id)).first()
        if not case_obj:
            raise ValueError(f"Case with ID {case_id} not found.")

        app_obj = session.exec(select(Application).where(Application.case_id == case_id)).first()
        evidence_items = session.exec(select(Evidence).where(Evidence.case_id == case_id)).all()
        
        # Deduplicated latest agent results
        raw_agents = session.exec(
            select(AgentResult).where(AgentResult.case_id == case_id).order_by(AgentResult.id.desc())
        ).all()
        seen_agents = set()
        latest_agents = {}
        for r in raw_agents:
            if r.agent_name not in seen_agents:
                seen_agents.add(r.agent_name)
                latest_agents[r.agent_name] = r

        # Verified Events (chronological order)
        verified_events = session.exec(
            select(CaseEvent)
            .where(CaseEvent.case_id == case_id, CaseEvent.verification_status == "VERIFIED")
            .order_by(CaseEvent.id.asc())
        ).all()

        # Track structured condition overrides from verified events
        field_damage_level = "UNKNOWN"
        fraud_indicator = False
        identity_status_override = None
        evidence_conflict = case_obj.has_evidence_conflict

        for evt in verified_events:
            try:
                meta = json.loads(evt.metadata_json or "{}")
                if meta.get("damage_finding") and meta.get("damage_finding") != "UNKNOWN":
                    field_damage_level = meta.get("damage_finding")
                
                # Check for structured field overrides
                field_name = meta.get("field")
                new_val = meta.get("new_value")
                if field_name == "fraud_indicator":
                    fraud_indicator = (str(new_val).lower() == "true" or str(new_val).upper() == "DETECTED")
                elif field_name == "identity_status":
                    identity_status_override = new_val
                elif field_name == "damage_severity":
                    field_damage_level = new_val

                if evt.event_type == "EVIDENCE_CONFLICT_DETECTED" or meta.get("conflict_detected"):
                    evidence_conflict = True
            except Exception:
                pass

        # Compute AI damage level
        ai_damage_level = latest_agents.get("evidence_agent").damage_level if latest_agents.get("evidence_agent") else None

        # Check agent consensus / disagreement
        agent_statuses = [a.status for a in latest_agents.values()]
        has_agent_disagreement = any(s in ("REQUIRES_REVIEW", "INCONSISTENT", "INELIGIBLE", "FAILED") for s in agent_statuses)

        # Build canonical state dictionary
        canonical_state = {
            "case_id": case_obj.case_id,
            "state_version": case_obj.state_version,
            "status": case_obj.status,
            "current_stage": case_obj.current_stage,
            "current_risk": case_obj.current_risk,
            "current_autonomy": case_obj.current_autonomy,
            "action_state": case_obj.action_state,
            "has_evidence_conflict": evidence_conflict,
            
            # Application Metrics
            "disaster_type": app_obj.disaster_type if app_obj else "Flood",
            "requested_amount": app_obj.requested_amount if app_obj else 0.0,
            "estimated_damage": app_obj.estimated_damage if app_obj else 0.0,
            "district": app_obj.district if app_obj else "",
            
            # Evidence Metrics
            "evidence_count": len(evidence_items),
            "verified_evidence_count": len([e for e in evidence_items if e.status == "VERIFIED"]),
            
            # Agent Findings & Confidence
            "agent_results": latest_agents,
            "has_agent_disagreement": has_agent_disagreement,
            "ai_damage_level": ai_damage_level,
            
            # Verified Field / Event Overrides
            "field_damage_level": field_damage_level,
            "fraud_indicator": fraud_indicator,
            "identity_status_override": identity_status_override,
            "verified_event_count": len(verified_events),
        }

        return canonical_state
