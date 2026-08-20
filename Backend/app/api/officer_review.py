import json
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.db import get_session
from app.models import (
    Case,
    Application,
    Evidence,
    CaseEvent,
    AgentResult,
    RiskEvaluation,
    AutonomyDecision,
    AIAction,
    OfficerDecision,
    OfficerDecisionRequest,
    OfficerRequestEvidenceRequest,
)

router = APIRouter(prefix="/api", tags=["Officer Review"])


@router.get("/officer-review/queue")
def get_officer_review_queue(session: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    """
    Module 6: Returns list of cases requiring officer attention or human authorization.
    Criteria: current_stage == REQUIRES_HUMAN_REVIEW OR current_autonomy == L1 OR has pending/blocked actions.
    """
    cases = session.exec(select(Case).order_by(Case.updated_at.desc())).all()
    queue = []

    for c in cases:
        # Check if case requires officer intervention
        needs_review = (
            c.current_stage in ("REQUIRES_HUMAN_REVIEW", "RUNTIME_REEVALUATION", "AWAITING_ADDITIONAL_EVIDENCE") or
            c.current_autonomy == "L1" or
            c.has_evidence_conflict or
            c.status in ("REQUIRES_HUMAN_REVIEW", "PROCESSING")
        )
        
        # Check associated actions
        pending_actions = session.exec(
            select(AIAction)
            .where(AIAction.case_id == c.case_id)
            .where(AIAction.status.in_(["REQUIRES_HUMAN_AUTHORIZATION", "REQUIRES_REAUTHORIZATION", "BLOCKED", "PROPOSED", "PERMITTED"]))
        ).all()

        if needs_review or pending_actions:
            app_obj = session.exec(select(Application).where(Application.case_id == c.case_id)).first()
            
            latest_auto = session.exec(
                select(AutonomyDecision).where(AutonomyDecision.case_id == c.case_id).order_by(AutonomyDecision.id.desc())
            ).first()

            queue.append({
                "case_id": c.case_id,
                "applicant_name": app_obj.full_name if app_obj else "Unknown Applicant",
                "disaster_type": app_obj.disaster_type if app_obj else "Flood",
                "requested_amount": app_obj.requested_amount if app_obj else 0.0,
                "district": app_obj.district if app_obj else "N/A",
                "current_stage": c.current_stage,
                "current_risk": c.current_risk,
                "current_autonomy": c.current_autonomy or "L1",
                "has_evidence_conflict": bool(c.has_evidence_conflict),
                "pending_actions_count": len(pending_actions),
                "reason": latest_auto.reason if latest_auto else "Human authorization required.",
                "created_at": c.created_at,
                "updated_at": c.updated_at,
            })

    return queue


@router.get("/cases/{case_id}/officer-review")
def get_case_officer_review_details(case_id: str, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """
    Module 6: Single-screen decision cockpit for officer review.
    Aggregates Case Summary, AI Agent Findings, Verified Field Evidence, Side-by-Side Comparison,
    Risk/Autonomy History, Blocked Actions, and Explanation Narrative.
    """
    case_obj = session.exec(select(Case).where(Case.case_id == case_id)).first()
    if not case_obj:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found.")

    app_obj = session.exec(select(Application).where(Application.case_id == case_id)).first()
    evidence_items = session.exec(select(Evidence).where(Evidence.case_id == case_id)).all()
    events = session.exec(select(CaseEvent).where(CaseEvent.case_id == case_id).order_by(CaseEvent.created_at.asc())).all()

    # Agent Findings
    raw_agents = session.exec(
        select(AgentResult).where(AgentResult.case_id == case_id).order_by(AgentResult.id.desc())
    ).all()
    seen_agents = set()
    parsed_agents = []
    ai_damage_level = "UNKNOWN"

    for r in raw_agents:
        if r.agent_name not in seen_agents:
            seen_agents.add(r.agent_name)
            if r.agent_name == "evidence_agent" and r.damage_level:
                ai_damage_level = r.damage_level
            parsed_agents.append({
                "agent_name": r.agent_name,
                "status": r.status,
                "confidence": r.confidence,
                "findings": json.loads(r.findings_json) if r.findings_json else [],
                "recommended_action": r.recommended_action,
                "damage_level": r.damage_level,
            })

    # Latest Verified Field Evidence
    field_evidence = None
    field_damage_level = "UNKNOWN"
    for evt in reversed(events):
        if evt.event_type in ("FIELD_INSPECTION_RECEIVED", "FIELD_INSPECTION") or evt.submitter_type == "OFFICER":
            meta = json.loads(evt.metadata_json) if evt.metadata_json else {}
            field_damage_level = meta.get("damage_finding") or meta.get("damage_level") or "UNKNOWN"
            field_evidence = {
                "event_id": evt.event_id,
                "source": evt.source,
                "submitted_by": evt.submitted_by or "Government Officer",
                "damage_finding": field_damage_level,
                "description": evt.description,
                "location": meta.get("location", ""),
                "evidence_files": meta.get("evidence_files", []),
                "timestamp": evt.created_at,
            }
            break

    # Risk Evaluations & Factors
    risks = session.exec(select(RiskEvaluation).where(RiskEvaluation.case_id == case_id).order_by(RiskEvaluation.id.asc())).all()
    latest_risk = risks[-1] if risks else None

    # Autonomy Decisions
    autonomies = session.exec(select(AutonomyDecision).where(AutonomyDecision.case_id == case_id).order_by(AutonomyDecision.id.asc())).all()
    latest_autonomy = autonomies[-1] if autonomies else None

    # AI Actions
    actions = session.exec(select(AIAction).where(AIAction.case_id == case_id).order_by(AIAction.created_at.desc())).all()

    # Officer Decisions History
    past_decisions = session.exec(select(OfficerDecision).where(OfficerDecision.case_id == case_id).order_by(OfficerDecision.created_at.desc())).all()

    # Generate 7-Step Dynamic Explanation Narrative ("WHY IS THIS CASE HERE?")
    explanation_steps = []
    if parsed_agents:
        explanation_steps.append(f"1. AI Agent Review evaluated application with {len(parsed_agents)} agents (Identity, Eligibility, Evidence).")
    if field_evidence:
        explanation_steps.append(f"2. Officer submitted ground field inspection reporting '{field_damage_level}' damage.")
    if case_obj.has_evidence_conflict:
        explanation_steps.append(f"3. Evidence conflict detected: AI assessed '{ai_damage_level}' vs Field inspection '{field_damage_level}'.")
    if latest_risk:
        explanation_steps.append(f"4. Risk Engine updated case risk score to {latest_risk.risk_score:.1f} / 100 ({latest_risk.risk_level}).")
    if latest_autonomy:
        explanation_steps.append(f"5. Autonomy Controller adjusted authority level to {latest_autonomy.autonomy_level} ({latest_autonomy.reason}).")
    if actions:
        explanation_steps.append(f"6. Proposed AI Action '{actions[0].action_type}' requires autonomy {actions[0].required_autonomy}, exceeding current {case_obj.current_autonomy or 'L1'}.")
    explanation_steps.append("7. Human officer authorization is required before final action execution.")

    return {
        "case_id": case_obj.case_id,
        "current_stage": case_obj.current_stage,
        "status": case_obj.status,
        "current_risk": case_obj.current_risk,
        "current_autonomy": case_obj.current_autonomy or "L1",
        "has_evidence_conflict": bool(case_obj.has_evidence_conflict),
        "application": app_obj,
        "ai_findings": parsed_agents,
        "ai_damage_level": ai_damage_level,
        "field_damage_level": field_damage_level,
        "field_evidence": field_evidence,
        "evidence_comparison": {
            "ai_assessment": ai_damage_level,
            "field_inspection": field_damage_level,
            "has_conflict": bool(case_obj.has_evidence_conflict),
        },
        "risk_history": risks,
        "latest_risk": latest_risk,
        "autonomy_history": autonomies,
        "latest_autonomy": latest_autonomy,
        "actions": actions,
        "past_decisions": past_decisions,
        "explanation_narrative": explanation_steps,
    }


@router.post("/cases/{case_id}/decision")
def submit_officer_decision(
    case_id: str,
    payload: OfficerDecisionRequest,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """
    Module 6: Submits an Officer APPROVE or REJECT decision.
    Creates OfficerDecision record, updates case stage/status, updates AIAction status, and emits CaseEvent.
    """
    case_obj = session.exec(select(Case).where(Case.case_id == case_id)).first()
    if not case_obj:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found.")

    if payload.decision not in ("APPROVED", "REJECTED"):
        raise HTTPException(status_code=400, detail="Decision must be 'APPROVED' or 'REJECTED'. Use /request-evidence for requesting evidence.")

    if not payload.reason or not payload.reason.strip():
        raise HTTPException(status_code=400, detail="Decision reason justification is mandatory.")

    now = datetime.now(timezone.utc)
    decision_id = f"DEC-{uuid.uuid4().hex[:8].upper()}"

    # 1. Create OfficerDecision record
    decision_record = OfficerDecision(
        decision_id=decision_id,
        case_id=case_id,
        action_id=payload.action_id,
        decision=payload.decision,
        reason=payload.reason.strip(),
        decided_by=payload.officer_name,
        created_at=now,
    )
    session.add(decision_record)

    # 2. Update Case Stage & Status
    new_stage = f"OFFICER_{payload.decision}"
    case_obj.current_stage = new_stage
    case_obj.status = new_stage
    case_obj.updated_at = now
    session.add(case_obj)

    # 3. Update AI Action Status if applicable
    if payload.action_id:
        act = session.exec(select(AIAction).where(AIAction.action_id == payload.action_id)).first()
        if act:
            act.status = "AUTHORIZED_BY_OFFICER" if payload.decision == "APPROVED" else "REJECTED"
            act.updated_at = now
            session.add(act)
    else:
        # Update any pending/blocked actions for this case
        pending_actions = session.exec(select(AIAction).where(AIAction.case_id == case_id)).all()
        for act in pending_actions:
            if act.status in ("REQUIRES_HUMAN_AUTHORIZATION", "REQUIRES_REAUTHORIZATION", "PROPOSED", "PERMITTED"):
                act.status = "AUTHORIZED_BY_OFFICER" if payload.decision == "APPROVED" else "REJECTED"
                act.updated_at = now
                session.add(act)

    # 4. Emit Audit Event
    evt_type = f"OFFICER_{payload.decision}"
    evt = CaseEvent(
        event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
        case_id=case_id,
        event_type=evt_type,
        source="OFFICER_PORTAL",
        submitter_type="OFFICER",
        submitted_by=payload.officer_name,
        verification_status="VERIFIED",
        description=f"Officer {payload.decision.lower()} decision: {payload.reason}",
        metadata_json=json.dumps({
            "decision_id": decision_id,
            "action_id": payload.action_id,
            "decision": payload.decision,
            "reason": payload.reason,
            "officer_name": payload.officer_name,
        }),
        created_at=now,
    )
    session.add(evt)

    session.commit()

    return {
        "success": True,
        "case_id": case_id,
        "decision_id": decision_id,
        "decision": payload.decision,
        "new_stage": new_stage,
        "message": f"Officer decision persistent and recorded as {payload.decision}.",
    }


@router.post("/cases/{case_id}/request-evidence")
def request_more_evidence(
    case_id: str,
    payload: OfficerRequestEvidenceRequest,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """
    Module 6: Officer requests additional evidence from citizen/field team.
    Updates case stage to AWAITING_ADDITIONAL_EVIDENCE and loops back to Event Updates.
    """
    case_obj = session.exec(select(Case).where(Case.case_id == case_id)).first()
    if not case_obj:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found.")

    if not payload.evidence_required or not payload.evidence_required.strip():
        raise HTTPException(status_code=400, detail="Specification of required evidence is mandatory.")

    now = datetime.now(timezone.utc)
    decision_id = f"DEC-{uuid.uuid4().hex[:8].upper()}"

    # 1. Create OfficerDecision record
    decision_record = OfficerDecision(
        decision_id=decision_id,
        case_id=case_id,
        decision="MORE_EVIDENCE_REQUESTED",
        reason=f"Evidence required: {payload.evidence_required}. Instructions: {payload.instructions}",
        decided_by=payload.officer_name,
        created_at=now,
    )
    session.add(decision_record)

    # 2. Update Case Stage & Status
    case_obj.current_stage = "AWAITING_ADDITIONAL_EVIDENCE"
    case_obj.status = "AWAITING_ADDITIONAL_EVIDENCE"
    case_obj.updated_at = now
    session.add(case_obj)

    # 3. Emit Case Event
    evt = CaseEvent(
        event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
        case_id=case_id,
        event_type="MORE_EVIDENCE_REQUESTED",
        source="OFFICER_PORTAL",
        submitter_type="OFFICER",
        submitted_by=payload.officer_name,
        verification_status="VERIFIED",
        description=f"Officer requested additional evidence: {payload.evidence_required}",
        metadata_json=json.dumps({
            "decision_id": decision_id,
            "evidence_required": payload.evidence_required,
            "instructions": payload.instructions,
            "officer_name": payload.officer_name,
        }),
        created_at=now,
    )
    session.add(evt)

    session.commit()

    return {
        "success": True,
        "case_id": case_id,
        "decision_id": decision_id,
        "new_stage": "AWAITING_ADDITIONAL_EVIDENCE",
        "message": "Additional evidence request submitted. Case returned to Event Updates workflow.",
    }
