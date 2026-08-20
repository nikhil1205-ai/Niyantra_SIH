import json
import uuid
from datetime import datetime, timezone
from sqlmodel import select, Session

from app.models import Case, AIAction, CaseEvent, ActionProposalRequest, ActionExecutionDecision
from app.db import engine

# Hardcoded action policy (Centralized rules)
ACTION_POLICY = {
    "VERIFY_APPLICATION": "L3",
    "GATHER_EVIDENCE": "L3",
    "PREPARE_RELIEF_PAYMENT": "L2",
    "EXECUTE_RELIEF_PAYMENT": "L3",
    "SEND_NOTIFICATION": "L1",
}

# Autonomy level strictness (higher index = more autonomous authority)
AUTONOMY_LEVELS = ["L1", "L2", "L3"]

def _is_authorized(current_autonomy: str, required_autonomy: str) -> bool:
    try:
        current_idx = AUTONOMY_LEVELS.index(current_autonomy)
        required_idx = AUTONOMY_LEVELS.index(required_autonomy)
        return current_idx >= required_idx
    except ValueError:
        return False

def propose_action(case_id: str, request: ActionProposalRequest) -> AIAction:
    """Creates a new AIAction proposal for a case."""
    with Session(engine) as session:
        case = session.exec(select(Case).where(Case.case_id == case_id)).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        required_autonomy = ACTION_POLICY.get(request.action_type, "L3")  # default to highest if unknown
        
        action = AIAction(
            action_id=f"ACT-{uuid.uuid4().hex[:8].upper()}",
            case_id=case_id,
            action_type=request.action_type,
            requested_by=request.requested_by,
            parameters_json=json.dumps(request.parameters),
            required_autonomy=required_autonomy,
            status="PROPOSED"
        )
        session.add(action)
        
        # Log event
        evt = CaseEvent(
            event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
            case_id=case_id,
            event_type="ACTION_PROPOSED",
            source="AGENT_ORCHESTRATOR",
            submitter_type="SYSTEM",
            metadata_json=json.dumps({
                "action_id": action.action_id,
                "action_type": action.action_type,
                "required_autonomy": required_autonomy
            })
        )
        session.add(evt)
        session.commit()
        session.refresh(action)

        # Re-evaluate immediately to assign PERMITTED if possible
        re_evaluate_pending_actions(case_id)
        
        session.refresh(action)
        return action

def get_actions_for_case(case_id: str) -> list[AIAction]:
    with Session(engine) as session:
        return session.exec(select(AIAction).where(AIAction.case_id == case_id).order_by(AIAction.created_at.desc())).all()

def execute_action(action_id: str) -> ActionExecutionDecision:
    """
    Attempt to execute a pending action.
    This is the core TOOL GATEWAY logic: dynamically compare REQUIRED vs CURRENT autonomy.
    """
    with Session(engine) as session:
        action = session.exec(select(AIAction).where(AIAction.action_id == action_id)).first()
        if not action:
            raise ValueError(f"Action {action_id} not found")
        
        case = session.exec(select(Case).where(Case.case_id == action.case_id)).first()
        if not case:
            raise ValueError(f"Case {action.case_id} not found")

        current_autonomy = case.current_autonomy or "L1"
        current_risk = case.current_risk or 100.0

        if action.status in ["EXECUTED", "BLOCKED"]:
            return ActionExecutionDecision(
                action_id=action.action_id,
                decision="RESTRICTED",
                current_autonomy=current_autonomy,
                required_autonomy=action.required_autonomy,
                risk_score=current_risk,
                reason=f"Action is already in terminal state: {action.status}"
            )

        is_allowed = _is_authorized(current_autonomy, action.required_autonomy)

        if is_allowed:
            action.status = "EXECUTED"
            action.updated_at = datetime.now(timezone.utc)
            decision = "ALLOWED"
            reason = "Action execution permitted by current case autonomy."
            
            # Record execution event
            evt = CaseEvent(
                event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
                case_id=action.case_id,
                event_type="ACTION_SIMULATED_EXECUTED",
                source="TOOL_GATEWAY",
                submitter_type="SYSTEM",
                metadata_json=json.dumps({
                    "action_id": action.action_id,
                    "action_type": action.action_type,
                    "status": "SUCCESS"
                })
            )
            session.add(evt)

        else:
            action.status = "REQUIRES_HUMAN_AUTHORIZATION"
            action.updated_at = datetime.now(timezone.utc)
            decision = "BLOCKED"
            reason = "New verified evidence increased case uncertainty and reduced autonomous authority. Human authorization required."
            
            # Record blocked event
            evt = CaseEvent(
                event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
                case_id=action.case_id,
                event_type="ACTION_BLOCKED",
                source="TOOL_GATEWAY",
                submitter_type="SYSTEM",
                metadata_json=json.dumps({
                    "action_id": action.action_id,
                    "action_type": action.action_type,
                    "required": action.required_autonomy,
                    "current": current_autonomy,
                    "risk": current_risk,
                    "trigger": "Verified evidence conflict",
                    "reason": "Human authorization required"
                })
            )
            session.add(evt)

        session.add(action)
        session.commit()

        return ActionExecutionDecision(
            action_id=action.action_id,
            decision=decision,
            current_autonomy=current_autonomy,
            required_autonomy=action.required_autonomy,
            risk_score=current_risk,
            reason=reason
        )

def re_evaluate_pending_actions(case_id: str):
    """
    Called when a case's autonomy changes.
    Finds pending actions and updates their status if they are no longer permitted.
    """
    with Session(engine) as session:
        case = session.exec(select(Case).where(Case.case_id == case_id)).first()
        if not case:
            return

        current_autonomy = case.current_autonomy or "L1"

        # Find actions that haven't been executed or blocked yet
        pending_actions = session.exec(
            select(AIAction)
            .where(AIAction.case_id == case_id)
            .where(AIAction.status.in_(["PROPOSED", "PERMITTED", "REQUIRES_REAUTHORIZATION"]))
        ).all()

        for action in pending_actions:
            if not _is_authorized(current_autonomy, action.required_autonomy):
                if action.status != "REQUIRES_REAUTHORIZATION":
                    action.status = "REQUIRES_REAUTHORIZATION"
                    action.updated_at = datetime.now(timezone.utc)
                    session.add(action)
                    
                    # Log that it requires reauthorization
                    evt = CaseEvent(
                        event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
                        case_id=case_id,
                        event_type="ACTION_REQUIRES_REAUTHORIZATION",
                        source="TOOL_GATEWAY",
                        submitter_type="SYSTEM",
                        metadata_json=json.dumps({
                            "action_id": action.action_id,
                            "action_type": action.action_type,
                            "reason": f"Autonomy dropped to {current_autonomy}"
                        })
                    )
                    session.add(evt)
            else:
                if action.status != "PERMITTED":
                    action.status = "PERMITTED"
                    action.updated_at = datetime.now(timezone.utc)
                    session.add(action)

        session.commit()
