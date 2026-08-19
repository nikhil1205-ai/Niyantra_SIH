"""
api/proposals.py - REST endpoint for AI action proposals.

The AI agent proposes; the Tool Gateway decides.
These are TWO SEPARATE steps.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.models.proposal import Proposal, ProposalCreate, ProposalRead
from app.agents.proposal_agent import cghs_agent
from app.services.case_service import get_case_db
from app.lineage.store import append_lineage
from app.models.evidence import Evidence
from sqlmodel import select

router = APIRouter(prefix="/api/cases", tags=["Proposals"])


def _proposal_to_read(proposal: Proposal) -> ProposalRead:
    evidence_refs = []
    try:
        evidence_refs = json.loads(proposal.evidence_refs_json)
    except Exception:
        pass
    return ProposalRead(
        id=proposal.id,
        case_ref=proposal.case_ref,
        agent=proposal.agent,
        action_type=proposal.action_type,
        confidence=proposal.confidence,
        reasoning=proposal.reasoning,
        evidence_refs=evidence_refs,
        gateway_status=proposal.gateway_status,
        gateway_reason=proposal.gateway_reason,
        risk_at_decision=proposal.risk_at_decision,
        autonomy_at_decision=proposal.autonomy_at_decision,
        created_at=proposal.created_at,
        decided_at=proposal.decided_at,
    )


@router.post("/{case_ref}/propose", response_model=ProposalRead, status_code=201)
def create_proposal(
    case_ref: str,
    data: ProposalCreate,
    session: Session = Depends(get_session),
):
    """
    Ask the AI agent to propose an action for this case.
    
    The agent generates a proposal but CANNOT execute it.
    The proposal is stored with status 'pending' until the /execute endpoint is called.
    
    This separation is the core NIYANTRA governance principle.
    """
    case = get_case_db(case_ref, session)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_ref}' not found.")

    # Fetch all evidence for this case
    evidence_list = list(session.exec(
        select(Evidence).where(Evidence.case_ref == case_ref)
    ).all())

    # Agent generates the proposal (cannot call Gateway)
    proposal_output = cghs_agent.generate_proposal(case, evidence_list, data.action_type)

    # Store the proposal
    proposal = Proposal(
        case_ref=case_ref,
        agent=proposal_output.agent,
        action_type=proposal_output.action_type,
        confidence=proposal_output.confidence,
        reasoning=proposal_output.reasoning,
        evidence_refs_json=json.dumps(proposal_output.evidence_refs),
        gateway_status="pending",
    )
    session.add(proposal)
    session.commit()
    session.refresh(proposal)

    # Record proposal creation in lineage
    append_lineage(
        session=session,
        case_ref=case_ref,
        event_type="proposal_created",
        risk_before=case.risk_score,
        risk_after=case.risk_score,
        case_status=case.case_status,
        action=data.action_type,
        outcome="pending",
        description=(
            f"Agent '{proposal_output.agent}' proposed '{data.action_type}' "
            f"with confidence {proposal_output.confidence:.0%}."
        ),
    )

    return _proposal_to_read(proposal)
