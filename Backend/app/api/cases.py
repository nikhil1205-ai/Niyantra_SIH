import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional
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
    DecisionLineage,
    DisasterReliefApplicationCreate,
    EvidenceAddRequest,
    CaseCreateResponse,
    AgentReviewRequest,
    ExternalEventRequest,
    EventVerifyRequest,
)
from app.services.agents import AgentOrchestrator
from app.services.risk import RiskOrchestrator
from app.services.events import EventProcessor

router = APIRouter(prefix="/api/cases", tags=["cases"])


def generate_case_id(session: Session) -> str:
    """Generate a collision-safe, readable Case ID like CASE-2026-0001."""
    year = datetime.now().year
    statement = select(Case)
    existing_cases = session.exec(statement).all()
    count = len(existing_cases) + 1
    
    candidate = f"CASE-{year}-{count:04d}"

    # Verify uniqueness in case of concurrent creations
    check_statement = select(Case).where(Case.case_id == candidate)
    while session.exec(check_statement).first() is not None:
        count += 1
        candidate = f"CASE-{year}-{count:04d}"
        check_statement = select(Case).where(Case.case_id == candidate)
        
    return candidate


@router.post("", response_model=CaseCreateResponse, status_code=status.HTTP_201_CREATED)
def create_disaster_relief_case(
    payload: DisasterReliefApplicationCreate,
    session: Session = Depends(get_session),
):
    """
    Module 1: Intake & Case Creation Endpoint.
    Creates a persistent case, application record, evidence items, and initial APPLICATION_SUBMITTED event.
    """
    case_id = generate_case_id(session)

    # 1. Create Case Object
    new_case = Case(
        case_id=case_id,
        status="PROCESSING",
        current_stage="APPLICATION_SUBMITTED",
        current_risk=None,
        current_autonomy=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session.add(new_case)

    # 2. Create Application Object
    new_app = Application(
        case_id=case_id,
        full_name=payload.full_name,
        citizen_id=payload.citizen_id,
        phone=payload.phone,
        address=payload.address,
        district=payload.district,
        state=payload.state,
        disaster_type=payload.disaster_type,
        disaster_date=payload.disaster_date,
        affected_location=payload.affected_location,
        damage_type=payload.damage_type,
        estimated_damage=payload.estimated_damage,
        bank_account=payload.bank_account,
        ifsc=payload.ifsc,
        requested_amount=payload.requested_amount,
        created_at=datetime.now(timezone.utc),
    )
    session.add(new_app)

    # 3. Create Evidence Objects
    evidence_list = []
    if payload.evidence:
        for ev in payload.evidence:
            ev_id = f"EV-{uuid.uuid4().hex[:8].upper()}"
            ev_record = Evidence(
                evidence_id=ev_id,
                case_id=case_id,
                type=ev.type,
                file_name=ev.file_name,
                path_or_url=ev.path_or_url or "",
                mime_type=ev.mime_type or "application/octet-stream",
                source="CITIZEN",
                status="SUBMITTED",
                created_at=datetime.now(timezone.utc),
            )
            session.add(ev_record)
            evidence_list.append(ev_record)

    # 4. Create Initial APPLICATION_SUBMITTED Case Event
    event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
    meta = {
        "citizen_id": payload.citizen_id,
        "disaster_type": payload.disaster_type,
        "requested_amount": payload.requested_amount,
        "evidence_count": len(evidence_list),
    }
    initial_event = CaseEvent(
        event_id=event_id,
        case_id=case_id,
        event_type="APPLICATION_SUBMITTED",
        source="CITIZEN_PORTAL",
        metadata_json=json.dumps(meta),
        created_at=datetime.now(timezone.utc),
    )
    session.add(initial_event)

    session.commit()
    session.refresh(new_case)

    return CaseCreateResponse(
        success=True,
        case_id=new_case.case_id,
        status=new_case.status,
        current_stage=new_case.current_stage,
        message="Disaster relief application submitted successfully.",
    )


@router.get("")
def list_all_cases(session: Session = Depends(get_session)):
    """Retrieve summary list of all cases for history sidebar and audit view."""
    cases = session.exec(select(Case).order_by(Case.created_at.desc())).all()
    results = []
    for c in cases:
        app_obj = session.exec(select(Application).where(Application.case_id == c.case_id)).first()
        latest_auto = session.exec(
            select(AutonomyDecision).where(AutonomyDecision.case_id == c.case_id).order_by(AutonomyDecision.id.desc())
        ).first()
        latest_risk = session.exec(
            select(RiskEvaluation).where(RiskEvaluation.case_id == c.case_id).order_by(RiskEvaluation.id.desc())
        ).first()
        
        reason = None
        if latest_auto and latest_auto.reason:
            reason = latest_auto.reason
        elif latest_risk and latest_risk.explanation:
            reason = latest_risk.explanation

        results.append({
            "case_id": c.case_id,
            "status": c.status,
            "current_stage": c.current_stage,
            "current_risk": c.current_risk,
            "current_autonomy": c.current_autonomy,
            "action_state": c.action_state,
            "has_evidence_conflict": c.has_evidence_conflict,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "applicant_name": app_obj.full_name if app_obj else "Unknown",
            "district": app_obj.district if app_obj else "N/A",
            "disaster_type": app_obj.disaster_type if app_obj else "N/A",
            "decision_reason": reason or "Case registered in system.",
        })
    return results


@router.get("/{case_id}")
def get_case_details(
    case_id: str,
    session: Session = Depends(get_session),
):
    """Retrieve detailed case info including application, evidence, agent results, and stage."""
    statement = select(Case).where(Case.case_id == case_id)
    case_obj = session.exec(statement).first()

    if not case_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found."
        )

    # Fetch Application
    app_stmt = select(Application).where(Application.case_id == case_id)
    app_obj = session.exec(app_stmt).first()

    # Fetch Evidence
    ev_stmt = select(Evidence).where(Evidence.case_id == case_id)
    evidence_items = session.exec(ev_stmt).all()

    # Fetch Events
    evt_stmt = select(CaseEvent).where(CaseEvent.case_id == case_id)
    events = session.exec(evt_stmt).all()

    # Fetch Agent Results (Deduplicated: returns only the latest result per agent)
    ag_stmt = select(AgentResult).where(AgentResult.case_id == case_id).order_by(AgentResult.id.desc())
    raw_agents = session.exec(ag_stmt).all()
    
    seen_agents = set()
    parsed_agents = []
    for r in raw_agents:
        if r.agent_name not in seen_agents:
            seen_agents.add(r.agent_name)
            parsed_agents.append({
                "result_id": r.result_id,
                "case_id": r.case_id,
                "agent_name": r.agent_name,
                "status": r.status,
                "confidence": r.confidence,
                "findings": json.loads(r.findings_json) if r.findings_json else [],
                "evidence_ids": json.loads(r.evidence_ids_json) if r.evidence_ids_json else [],
                "recommended_action": r.recommended_action,
                "damage_level": r.damage_level,
                "created_at": r.created_at,
            })
    
    agent_order = {"identity_agent": 1, "eligibility_agent": 2, "evidence_agent": 3}
    parsed_agents.sort(key=lambda x: agent_order.get(x["agent_name"], 99))

    # Consensus status
    statuses = [a["status"] for a in parsed_agents]
    has_disagreement = any(s in ("REQUIRES_REVIEW", "INCONSISTENT", "INELIGIBLE", "FAILED") for s in statuses)
    consensus = "PARTIAL_DISAGREEMENT" if has_disagreement else ("FULL_CONSENSUS" if parsed_agents else "PENDING")

    # Fetch latest risk evaluation
    latest_risk = session.exec(
        select(RiskEvaluation).where(RiskEvaluation.case_id == case_id).order_by(RiskEvaluation.id.desc())
    ).first()
    risk_data = None
    if latest_risk:
        risk_data = {
            "risk_id":      latest_risk.risk_id,
            "risk_score":   latest_risk.risk_score,
            "risk_level":   latest_risk.risk_level,
            "risk_factors": json.loads(latest_risk.risk_factors_json) if latest_risk.risk_factors_json else [],
            "explanation":  latest_risk.explanation,
            "created_at":   latest_risk.created_at,
        }

    # Fetch latest autonomy decision
    latest_auto = session.exec(
        select(AutonomyDecision).where(AutonomyDecision.case_id == case_id).order_by(AutonomyDecision.id.desc())
    ).first()
    autonomy_data = None
    if latest_auto:
        autonomy_data = {
            "decision_id":        latest_auto.decision_id,
            "autonomy_level":     latest_auto.autonomy_level,
            "previous_autonomy":  latest_auto.previous_autonomy,
            "allowed_actions":    json.loads(latest_auto.allowed_actions_json) if latest_auto.allowed_actions_json else [],
            "restricted_actions": json.loads(latest_auto.restricted_actions_json) if latest_auto.restricted_actions_json else [],
            "reason":             latest_auto.reason,
            "created_at":         latest_auto.created_at,
        }

    return {
        "case_id":         case_obj.case_id,
        "status":          case_obj.status,
        "current_stage":   case_obj.current_stage,
        "current_risk":    case_obj.current_risk,
        "current_autonomy": case_obj.current_autonomy,
        "action_state":    case_obj.action_state,
        "has_evidence_conflict": case_obj.has_evidence_conflict,
        "agent_consensus": consensus,
        "created_at":      case_obj.created_at,
        "updated_at":      case_obj.updated_at,
        "application":     app_obj,
        "evidence":        evidence_items,
        "agent_results":   parsed_agents,
        "events":          events,
        "risk":            risk_data,
        "autonomy":        autonomy_data,
    }


@router.post("/{case_id}/evidence")
def add_case_evidence(
    case_id: str,
    payload: EvidenceAddRequest,
    session: Session = Depends(get_session),
):
    """Add a new evidence object to an existing case."""
    statement = select(Case).where(Case.case_id == case_id)
    case_obj = session.exec(statement).first()

    if not case_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID {case_id} not found."
        )

    ev_id = f"EV-{uuid.uuid4().hex[:8].upper()}"
    ev_record = Evidence(
        evidence_id=ev_id,
        case_id=case_id,
        type=payload.type,
        file_name=payload.file_name,
        path_or_url=payload.path_or_url or "",
        mime_type=payload.mime_type or "application/octet-stream",
        source=payload.source or "CITIZEN",
        status="SUBMITTED",
        created_at=datetime.now(timezone.utc),
    )
    session.add(ev_record)

    # Record event
    event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
    evt = CaseEvent(
        event_id=event_id,
        case_id=case_id,
        event_type="EVIDENCE_ADDED",
        source=payload.source or "CITIZEN_PORTAL",
        metadata_json=json.dumps({"evidence_id": ev_id, "type": payload.type}),
        created_at=datetime.now(timezone.utc),
    )
    session.add(evt)

    session.commit()
    session.refresh(ev_record)

    return {
        "success": True,
        "evidence_id": ev_record.evidence_id,
        "case_id": case_id,
        "message": "Evidence added successfully."
    }


@router.get("/{case_id}/evidence")
def get_case_evidence(
    case_id: str,
    session: Session = Depends(get_session),
):
    """List evidence objects for a case."""
    stmt = select(Evidence).where(Evidence.case_id == case_id)
    items = session.exec(stmt).all()
    return items


@router.get("/{case_id}/events")
def get_case_events(
    case_id: str,
    session: Session = Depends(get_session),
):
    """List audit events for a case."""
    stmt = select(CaseEvent).where(CaseEvent.case_id == case_id)
    events = session.exec(stmt).all()
    return events


# ─── MODULE 2: AI AGENT REVIEW ENDPOINTS ──────────────────────────────────────

@router.post("/{case_id}/review")
def trigger_agent_review(
    case_id: str,
    payload: Optional[AgentReviewRequest] = None,
    session: Session = Depends(get_session),
):
    """
    Module 2: Trigger AI Agent Review for a submitted case.
    Runs Identity, Eligibility, and Evidence Agents in sequence via AgentOrchestrator.
    """
    simulate_disagreement = payload.simulate_disagreement if payload else False
    orchestrator = AgentOrchestrator(session)
    try:
        result = orchestrator.run_review(case_id, simulate_disagreement=simulate_disagreement)
        return {
            "success": True,
            "message": "AI Agent Review completed successfully.",
            "data": result
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing AI Agent Review: {str(e)}"
        )


@router.get("/{case_id}/agents")
def get_case_agent_results(
    case_id: str,
    session: Session = Depends(get_session),
):
    """Retrieve structured agent evaluation results for a case (latest evaluation per agent)."""
    stmt = select(AgentResult).where(AgentResult.case_id == case_id).order_by(AgentResult.id.desc())
    results = session.exec(stmt).all()
    
    seen_agents = set()
    parsed_results = []
    for r in results:
        if r.agent_name not in seen_agents:
            seen_agents.add(r.agent_name)
            parsed_results.append({
                "result_id": r.result_id,
                "case_id": r.case_id,
                "agent_name": r.agent_name,
                "status": r.status,
                "confidence": r.confidence,
                "findings": json.loads(r.findings_json) if r.findings_json else [],
                "evidence_ids": json.loads(r.evidence_ids_json) if r.evidence_ids_json else [],
                "recommended_action": r.recommended_action,
                "damage_level": r.damage_level,
                "created_at": r.created_at,
            })

    agent_order = {"identity_agent": 1, "eligibility_agent": 2, "evidence_agent": 3}
    parsed_results.sort(key=lambda x: agent_order.get(x["agent_name"], 99))
    return parsed_results


@router.get("/{case_id}/review/status")
def get_case_review_status(
    case_id: str,
    session: Session = Depends(get_session),
):
    """Get high-level review status and agent consensus summary."""
    case_stmt = select(Case).where(Case.case_id == case_id)
    case_obj = session.exec(case_stmt).first()
    if not case_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case {case_id} not found.")

    agent_stmt = select(AgentResult).where(AgentResult.case_id == case_id)
    agents = session.exec(agent_stmt).all()

    statuses = [a.status for a in agents]
    has_disagreement = any(s in ("REQUIRES_REVIEW", "INCONSISTENT", "INELIGIBLE", "FAILED") for s in statuses)
    consensus = "PARTIAL_DISAGREEMENT" if has_disagreement else ("FULL_CONSENSUS" if agents else "PENDING")

    return {
        "case_id": case_id,
        "status": case_obj.status,
        "current_stage": case_obj.current_stage,
        "review_status": "READY_FOR_RISK_EVALUATION" if case_obj.current_stage == "AI_REVIEW_COMPLETED" else "NOT_STARTED",
        "agent_consensus": consensus,
        "agent_count": len(agents),
        "is_review_complete": case_obj.current_stage == "AI_REVIEW_COMPLETED",
    }


# ─── MODULE 3: RISK ENGINE & AUTONOMY CONTROLLER ───────────────────────────────

@router.post("/{case_id}/risk/evaluate")
def evaluate_case_risk(
    case_id: str,
    session: Session = Depends(get_session),
):
    """
    Module 3: Run Risk Engine + Autonomy Controller for a case that has completed
    AI Agent Review (Module 2). Appends to immutable risk and autonomy history.
    """
    orchestrator = RiskOrchestrator(session)
    try:
        result = orchestrator.evaluate(case_id)
        # After risk evaluation, if autonomy is L3 (low risk), mark the action as PERMITTED.
        # This represents the case being cleared for autonomous processing.
        case_obj = session.exec(select(Case).where(Case.case_id == case_id)).first()
        if case_obj and case_obj.current_autonomy == "L3" and case_obj.action_state in ("PROPOSED", "REQUIRES_REAUTHORIZATION"):
            case_obj.action_state = "PERMITTED"
            session.add(case_obj)
            session.commit()
        return {
            "success": True,
            "message": f"Risk evaluated successfully. Score: {result['risk_score']}/100 ({result['risk_level']}). Autonomy: {result['autonomy_level']}.",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Risk evaluation error: {str(e)}")


@router.get("/{case_id}/risk")
def get_case_risk(
    case_id: str,
    session: Session = Depends(get_session),
):
    """Get the most recent risk evaluation for a case."""
    latest = session.exec(
        select(RiskEvaluation).where(RiskEvaluation.case_id == case_id).order_by(RiskEvaluation.id.desc())
    ).first()
    if not latest:
        raise HTTPException(status_code=404, detail=f"No risk evaluation found for case {case_id}.")
    return {
        "risk_id":      latest.risk_id,
        "case_id":      latest.case_id,
        "risk_score":   latest.risk_score,
        "risk_level":   latest.risk_level,
        "risk_factors": json.loads(latest.risk_factors_json) if latest.risk_factors_json else [],
        "explanation":  latest.explanation,
        "created_at":   latest.created_at,
    }


@router.get("/{case_id}/risk/history")
def get_case_risk_history(
    case_id: str,
    session: Session = Depends(get_session),
):
    """Get full risk evaluation history for a case (oldest first, never overwritten)."""
    records = session.exec(
        select(RiskEvaluation).where(RiskEvaluation.case_id == case_id).order_by(RiskEvaluation.id)
    ).all()
    return [
        {
            "risk_id":     r.risk_id,
            "risk_score":  r.risk_score,
            "risk_level":  r.risk_level,
            "explanation": r.explanation,
            "created_at":  r.created_at,
        }
        for r in records
    ]


@router.get("/{case_id}/autonomy")
def get_case_autonomy(
    case_id: str,
    session: Session = Depends(get_session),
):
    """Get the most recent autonomy decision for a case."""
    latest = session.exec(
        select(AutonomyDecision).where(AutonomyDecision.case_id == case_id).order_by(AutonomyDecision.id.desc())
    ).first()
    if not latest:
        raise HTTPException(status_code=404, detail=f"No autonomy decision found for case {case_id}.")
    return {
        "decision_id":        latest.decision_id,
        "case_id":            latest.case_id,
        "risk_id":            latest.risk_id,
        "previous_autonomy":  latest.previous_autonomy,
        "autonomy_level":     latest.autonomy_level,
        "allowed_actions":    json.loads(latest.allowed_actions_json) if latest.allowed_actions_json else [],
        "restricted_actions": json.loads(latest.restricted_actions_json) if latest.restricted_actions_json else [],
        "reason":             latest.reason,
        "created_at":         latest.created_at,
    }


@router.get("/{case_id}/autonomy/history")
def get_case_autonomy_history(
    case_id: str,
    session: Session = Depends(get_session),
):
    """Get full autonomy decision history for a case (oldest first, never overwritten)."""
    records = session.exec(
        select(AutonomyDecision).where(AutonomyDecision.case_id == case_id).order_by(AutonomyDecision.id)
    ).all()
    return [
        {
            "decision_id":       r.decision_id,
            "previous_autonomy": r.previous_autonomy,
            "autonomy_level":    r.autonomy_level,
            "reason":            r.reason,
            "created_at":        r.created_at,
        }
        for r in records
    ]


# ─── MODULE 4: DYNAMIC EVIDENCE & RUNTIME RE-EVALUATION ───────────────────────

@router.post("/{case_id}/events")
def submit_external_event(
    case_id: str,
    payload: ExternalEventRequest,
    session: Session = Depends(get_session),
):
    """
    Module 4: Receive an external event for a case.
    """
    processor = EventProcessor(session)
    try:
        result = processor.process(case_id, payload)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Event processing error: {str(e)}"
        )

@router.post("/{case_id}/events/{event_id}/verify")
def verify_external_event(
    case_id: str,
    event_id: str,
    payload: EventVerifyRequest,
    session: Session = Depends(get_session),
):
    """
    Module 4: Verify a PENDING public event.
    """
    processor = EventProcessor(session)
    try:
        result = processor.verify_event(case_id, event_id, payload)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Event verification error: {str(e)}"
        )
