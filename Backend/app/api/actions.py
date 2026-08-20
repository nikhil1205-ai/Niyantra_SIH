from fastapi import APIRouter, HTTPException
from typing import List, Any
from app.models import ActionProposalRequest, AIAction, ActionExecutionDecision
from app.services.gateway import propose_action, execute_action, get_actions_for_case

router = APIRouter(prefix="/api", tags=["Actions & Gateway"])

@router.post("/cases/{case_id}/actions", response_model=AIAction)
def api_propose_action(case_id: str, request: ActionProposalRequest):
    try:
        return propose_action(case_id, request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/cases/{case_id}/actions", response_model=List[AIAction])
def api_get_actions(case_id: str):
    return get_actions_for_case(case_id)

@router.post("/actions/{action_id}/execute", response_model=ActionExecutionDecision)
def api_execute_action(action_id: str):
    try:
        return execute_action(action_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
