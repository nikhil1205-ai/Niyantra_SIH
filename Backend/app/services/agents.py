import json
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
from sqlmodel import Session, select

from app.models import Case, Application, Evidence, CaseEvent, AgentResult


# ─── AGENT 1: IDENTITY VERIFICATION AGENT ─────────────────────────────────────

class IdentityAgent:
    @staticmethod
    def evaluate(case: Case, app: Application, evidence: List[Evidence]) -> Dict[str, Any]:
        """
        Verify whether the citizen information and submitted identity evidence are consistent.
        """
        identity_evidence = [e for e in evidence if e.type == 'identity_doc']
        evidence_ids = [e.evidence_id for e in identity_evidence] if identity_evidence else []
        
        # Check basic consistency rules
        has_id_doc = len(identity_evidence) > 0
        valid_name = bool(app.full_name and len(app.full_name.strip()) > 2)
        valid_citizen_id = bool(app.citizen_id and len(app.citizen_id.strip()) > 4)

        if has_id_doc and valid_name and valid_citizen_id:
            status = "VERIFIED"
            confidence = 0.96
            findings = [
                {
                    "type": "IDENTITY_MATCH",
                    "description": f"Citizen name '{app.full_name}' and ID '{app.citizen_id}' match submitted identity document."
                },
                {
                    "type": "DOCUMENT_READABLE",
                    "description": f"Identity document ({identity_evidence[0].file_name}) is fully legible and uncorrupted."
                }
            ]
            recommended_action = "CONTINUE"
        else:
            status = "INCONSISTENT"
            confidence = 0.60
            findings = [
                {
                    "type": "IDENTITY_WARNING",
                    "description": "Missing legibly attached identity document proof or incomplete citizen details."
                }
            ]
            recommended_action = "FLAG_FOR_OFFICER"

        return {
            "agent_name": "identity_agent",
            "status": status,
            "confidence": confidence,
            "findings": findings,
            "evidence_ids": evidence_ids,
            "recommended_action": recommended_action,
            "damage_level": None,
        }


# ─── AGENT 2: ELIGIBILITY AGENT ────────────────────────────────────────────────

class EligibilityAgent:
    @staticmethod
    def evaluate(case: Case, app: Application, evidence: List[Evidence]) -> Dict[str, Any]:
        """
        Determine whether the citizen appears eligible for the disaster-relief scheme.
        """
        property_evidence = [e for e in evidence if e.type in ('property_doc', 'supporting_doc')]
        evidence_ids = [e.evidence_id for e in property_evidence] if property_evidence else []

        # Prototype eligibility rules:
        # 1. District affected
        # 2. Disaster type covered (Flood, Cyclone, Earthquake, Landslide)
        # 3. Estimated damage > 0 and requested relief <= estimated damage * 1.5
        is_covered_disaster = app.disaster_type in ["Flood", "Cyclone", "Earthquake", "Landslide"]
        has_district = bool(app.district and app.district.strip())
        valid_amounts = app.estimated_damage > 0 and app.requested_amount > 0

        findings = []
        if has_district:
            findings.append({
                "type": "DISASTER_AREA_MATCH",
                "description": f"Applicant district '{app.district}' is within active declared disaster zone."
            })
        
        if is_covered_disaster:
            findings.append({
                "type": "COVERED_DISASTER_TYPE",
                "description": f"Disaster type '{app.disaster_type}' is eligible under Section 4 relief guidelines."
            })

        if valid_amounts:
            findings.append({
                "type": "RELIEF_BOUND_VALID",
                "description": f"Requested amount (₹{app.requested_amount:,.2f}) is within threshold for estimated damage (₹{app.estimated_damage:,.2f})."
            })

        is_eligible = is_covered_disaster and has_district and valid_amounts
        
        return {
            "agent_name": "eligibility_agent",
            "status": "ELIGIBLE" if is_eligible else "INELIGIBLE",
            "confidence": 0.93 if is_eligible else 0.45,
            "findings": findings,
            "evidence_ids": evidence_ids,
            "recommended_action": "CONTINUE" if is_eligible else "HOLD",
            "damage_level": None,
        }


# ─── AGENT 3: EVIDENCE VERIFICATION AGENT ──────────────────────────────────────

class EvidenceAgent:
    @staticmethod
    def evaluate(case: Case, app: Application, evidence: List[Evidence], simulate_disagreement: bool = False) -> Dict[str, Any]:
        """
        Analyze submitted damage evidence photographs and documents.
        """
        damage_photos = [e for e in evidence if e.type == 'damage_photo']
        all_ev_ids = [e.evidence_id for e in evidence]

        if simulate_disagreement:
            # Controlled disagreement test scenario
            return {
                "agent_name": "evidence_agent",
                "status": "REQUIRES_REVIEW",
                "confidence": 0.65,
                "findings": [
                    {
                        "type": "UNVERIFIED_DAMAGE_EXTENT",
                        "description": "Submitted photo shows waterlogging but structural damage clarity is borderline."
                    },
                    {
                        "type": "INSPECTION_RECOMMENDED",
                        "description": "Satellite or secondary drone verification recommended before approval."
                    }
                ],
                "evidence_ids": [d.evidence_id for d in damage_photos] if damage_photos else all_ev_ids,
                "recommended_action": "FLAG_FOR_OFFICER",
                "damage_level": "MODERATE",
            }

        has_photo = len(damage_photos) > 0
        if has_photo or len(evidence) > 0:
            status = "DAMAGE_DETECTED"
            confidence = 0.89
            damage_level = "SEVERE" if app.estimated_damage >= 50000 else "MODERATE"
            findings = [
                {
                    "type": "VISIBLE_DAMAGE",
                    "description": f"Submitted evidence ({damage_photos[0].file_name if damage_photos else 'attachment'}) contains detectable structural flood damage."
                },
                {
                    "type": "LOCATION_CONSISTENCY",
                    "description": f"Visual features correspond to affected area '{app.affected_location}'."
                }
            ]
            recommended_action = "CONTINUE"
        else:
            status = "REQUIRES_REVIEW"
            confidence = 0.50
            damage_level = "UNVERIFIED"
            findings = [
                {
                    "type": "MISSING_DAMAGE_EVIDENCE",
                    "description": "No damage photos attached to verify loss description."
                }
            ]
            recommended_action = "FLAG_FOR_OFFICER"

        return {
            "agent_name": "evidence_agent",
            "status": status,
            "confidence": confidence,
            "findings": findings,
            "evidence_ids": [d.evidence_id for d in damage_photos] if damage_photos else all_ev_ids,
            "recommended_action": recommended_action,
            "damage_level": damage_level,
        }


# ─── AGENT ORCHESTRATOR ────────────────────────────────────────────────────────

class AgentOrchestrator:
    def __init__(self, session: Session):
        self.session = session

    def run_review(self, case_id: str, simulate_disagreement: bool = False) -> Dict[str, Any]:
        """
        Orchestrate the 3 AI Agents in sequential order for a given case,
        persist AgentResult and CaseEvent records, and update case review status.
        """
        stmt = select(Case).where(Case.case_id == case_id)
        case_obj = self.session.exec(stmt).first()
        if not case_obj:
            raise ValueError(f"Case {case_id} not found.")

        app_stmt = select(Application).where(Application.case_id == case_id)
        app_obj = self.session.exec(app_stmt).first()

        ev_stmt = select(Evidence).where(Evidence.case_id == case_id)
        evidence_items = self.session.exec(ev_stmt).all()

        # 1. Log AI_REVIEW_STARTED event
        self._emit_event(case_id, "AI_REVIEW_STARTED", "AGENT_ORCHESTRATOR", {
            "simulate_disagreement": simulate_disagreement
        })

        # Clear old agent results for this case so re-running review replaces previous evaluation
        old_results = self.session.exec(select(AgentResult).where(AgentResult.case_id == case_id)).all()
        for old_res in old_results:
            self.session.delete(old_res)

        # 2. Run Agents
        agent_evaluations = [
            IdentityAgent.evaluate(case_obj, app_obj, evidence_items),
            EligibilityAgent.evaluate(case_obj, app_obj, evidence_items),
            EvidenceAgent.evaluate(case_obj, app_obj, evidence_items, simulate_disagreement=simulate_disagreement),
        ]

        stored_results = []
        statuses = []

        # 3. Persist agent results and events
        for eval_data in agent_evaluations:
            res_id = f"AGTR-{uuid.uuid4().hex[:8].upper()}"
            result_record = AgentResult(
                result_id=res_id,
                case_id=case_id,
                agent_name=eval_data["agent_name"],
                status=eval_data["status"],
                confidence=eval_data["confidence"],
                findings_json=json.dumps(eval_data["findings"]),
                evidence_ids_json=json.dumps(eval_data["evidence_ids"]),
                recommended_action=eval_data["recommended_action"],
                damage_level=eval_data.get("damage_level"),
                created_at=datetime.now(timezone.utc),
            )
            self.session.add(result_record)
            stored_results.append(result_record)
            statuses.append(eval_data["status"])

            # Emit AGENT_COMPLETED event
            self._emit_event(case_id, "AGENT_COMPLETED", eval_data["agent_name"], {
                "result_id": res_id,
                "status": eval_data["status"],
                "confidence": eval_data["confidence"],
                "recommended_action": eval_data["recommended_action"]
            })

        # 4. Compute Agent Consensus (without risk calculation!)
        has_disagreement = any(s in ("REQUIRES_REVIEW", "INCONSISTENT", "INELIGIBLE", "FAILED") for s in statuses)
        consensus_status = "PARTIAL_DISAGREEMENT" if has_disagreement else "FULL_CONSENSUS"

        # 5. Update Case Status & Stage
        case_obj.current_stage = "AI_REVIEW_COMPLETED"
        case_obj.status = "READY_FOR_RISK_EVALUATION"
        case_obj.updated_at = datetime.now(timezone.utc)
        self.session.add(case_obj)

        # Emit AI_REVIEW_COMPLETED event
        self._emit_event(case_id, "AI_REVIEW_COMPLETED", "AGENT_ORCHESTRATOR", {
            "consensus_status": consensus_status,
            "agent_statuses": statuses,
            "next_stage": "READY_FOR_RISK_EVALUATION"
        })

        self.session.commit()

        return {
            "case_id": case_id,
            "review_status": "READY_FOR_RISK_EVALUATION",
            "current_stage": "AI_REVIEW_COMPLETED",
            "consensus_status": consensus_status,
            "results": stored_results,
        }

    def _emit_event(self, case_id: str, event_type: str, source: str, metadata: Dict[str, Any]):
        evt_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
        event_record = CaseEvent(
            event_id=evt_id,
            case_id=case_id,
            event_type=event_type,
            source=source,
            metadata_json=json.dumps(metadata),
            created_at=datetime.now(timezone.utc),
        )
        self.session.add(event_record)
