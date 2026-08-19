"""
api/approvals.py - Human approval endpoint.

This is the ONLY endpoint that can:
1. Trigger execution after a 'pending_approval' gateway decision.
2. Set case status to 'confirmed_irregularity' (human-only action).

Automated code NEVER sets confirmed_irregularity.
"""
import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.models.proposal import Proposal
from app.models.case import Case
from app.services.case_service import get_case_db, _build_case_read
from app.gateway.tool_gateway import process_proposal
from app.gateway.simulated_cghs import simulated_cghs
from app.lineage.store import append_lineage
from app.models.case import CaseRead

router = APIRouter(prefix="/api/cases", tags=["Approvals"])


class ExecuteRequest(BaseModel):
    """Optional request body for the execute endpoint."""
    proposal_id: Optional[int] = None  # If None, uses the most recent pending proposal
    confidence_override: Optional[float] = None  # Override the confidence for this execution


class ApprovalRequest(BaseModel):
    """Request body for the human approval endpoint."""
    proposal_id: Optional[int] = None
    mark_confirmed_irregularity: bool = False  # Only humans can set this
    notes: Optional[str] = None


@router.post("/{case_ref}/execute")
def execute_proposal(
    case_ref: str,
    data: ExecuteRequest = ExecuteRequest(),
    session: Session = Depends(get_session),
):
    """
    Submit the most recent (or specified) proposal to the Tool Gateway for execution.
    
    The Gateway will:
    1. Read the CURRENT case state (never cached)
    2. Determine current autonomy level from current risk
    3. Allow or block the action
    4. Write to lineage
    
    This is the core governance check.
    """
    case = get_case_db(case_ref, session)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_ref}' not found.")

    # Find the proposal to execute
    if data.proposal_id:
        proposal = session.get(Proposal, data.proposal_id)
        if not proposal or proposal.case_ref != case_ref:
            raise HTTPException(status_code=404, detail="Proposal not found for this case.")
    else:
        # Use the most recent pending proposal
        proposals = list(session.exec(
            select(Proposal)
            .where(Proposal.case_ref == case_ref)
            .where(Proposal.gateway_status == "pending")
            .order_by(Proposal.created_at.desc())
        ).all())
        if not proposals:
            raise HTTPException(
                status_code=400,
                detail="No pending proposal found. Create a proposal first via POST /propose."
            )
        proposal = proposals[0]

    # Tool Gateway processes the proposal
    # It reads CURRENT case state - never a cached authorization
    result = process_proposal(proposal, case, session)

    # Update the proposal record with the gateway decision
    proposal.gateway_status = result.status
    proposal.gateway_reason = result.reason
    proposal.risk_at_decision = result.risk_score
    proposal.autonomy_at_decision = result.autonomy_level
    proposal.decided_at = datetime.utcnow()
    session.add(proposal)
    session.commit()

    return {
        "case_ref": case_ref,
        "proposal_id": proposal.id,
        "action_type": proposal.action_type,
        "gateway_status": result.status,
        "reason": result.reason,
        "risk_score": result.risk_score,
        "autonomy_level": result.autonomy_level,
        "cghs_response": result.cghs_response,
    }


@router.post("/{case_ref}/approve")
def human_approve(
    case_ref: str,
    data: ApprovalRequest = ApprovalRequest(),
    session: Session = Depends(get_session),
):
    """
    Human operator approves a pending action.
    
    This is required for:
    - L2 cases (human approval required before settlement/claim_submit)
    - Optionally setting 'confirmed_irregularity' status (human-only)
    
    GOVERNANCE RULE: Only this endpoint can set confirmed_irregularity.
    Automated risk calculation NEVER sets this status.
    """
    case = get_case_db(case_ref, session)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_ref}' not found.")

    # Find the pending_approval proposal
    if data.proposal_id:
        proposal = session.get(Proposal, data.proposal_id)
        if not proposal or proposal.case_ref != case_ref:
            raise HTTPException(status_code=404, detail="Proposal not found for this case.")
    else:
        proposals = list(session.exec(
            select(Proposal)
            .where(Proposal.case_ref == case_ref)
            .where(Proposal.gateway_status.in_(["pending", "pending_approval"]))
            .order_by(Proposal.created_at.desc())
        ).all())
        if not proposals:
            raise HTTPException(
                status_code=400,
                detail="No proposal awaiting approval found for this case."
            )
        proposal = proposals[0]

    # Re-check current risk before executing (safety check)
    current_case = get_case_db(case_ref, session)
    result = process_proposal(proposal, current_case, session)

    # Update proposal
    proposal.gateway_status = result.status if result.status != "pending_approval" else "allowed"
    proposal.gateway_reason = f"Human approved. {result.reason}"
    proposal.risk_at_decision = result.risk_score
    proposal.autonomy_at_decision = result.autonomy_level
    proposal.decided_at = datetime.utcnow()
    session.add(proposal)

    # Handle confirmed_irregularity - ONLY humans can set this
    if data.mark_confirmed_irregularity:
        case.case_status = "confirmed_irregularity"
        case.updated_at = datetime.utcnow()
        session.add(case)
        append_lineage(
            session=session,
            case_ref=case_ref,
            event_type="status_change",
            case_status="confirmed_irregularity",
            action=proposal.action_type,
            outcome="confirmed_irregularity",
            description=f"Human operator confirmed irregularity. Notes: {data.notes or 'none'}",
        )

    # Record human approval
    append_lineage(
        session=session,
        case_ref=case_ref,
        event_type="human_approval",
        risk_before=result.risk_score,
        risk_after=result.risk_score,
        case_status=case.case_status,
        action=proposal.action_type,
        outcome="approved",
        description=f"Human approved '{proposal.action_type}'. Notes: {data.notes or 'none'}",
    )

    session.commit()

    return {
        "case_ref": case_ref,
        "proposal_id": proposal.id,
        "human_approval": "granted",
        "action_type": proposal.action_type,
        "gateway_result": result.status,
        "risk_score": result.risk_score,
        "autonomy_level": result.autonomy_level,
        "cghs_response": result.cghs_response,
        "notes": data.notes,
    }
