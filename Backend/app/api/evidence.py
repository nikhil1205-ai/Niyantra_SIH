"""
api/evidence.py - REST endpoint for adding evidence to a case.

Adding evidence triggers risk recalculation, which may change the autonomy level.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.models.case import CaseRead
from app.models.evidence import Evidence, EvidenceCreate, EvidenceRead
from app.services.case_service import get_case, get_case_db, recalculate_risk, _build_case_read
from app.lineage.store import append_lineage

router = APIRouter(prefix="/api/cases", tags=["Evidence"])


@router.post("/{case_ref}/evidence", response_model=CaseRead)
def add_evidence(
    case_ref: str,
    data: EvidenceCreate,
    session: Session = Depends(get_session),
):
    """
    Add a new piece of evidence to a case.
    
    IMPORTANT: Adding evidence immediately triggers risk recalculation.
    If risk increases enough, autonomy level is automatically lowered.
    This is the "dynamic authority revocation" mechanism.
    
    Evidence types that increase risk:
    - rate_mismatch: Claimed amount exceeds approved rate
    - missing_document: Required documents not present
    - duplicate_claim: Duplicate claim detected
    - beneficiary_conflict: Beneficiary info mismatch
    - unreliable_evidence: Evidence source is unreliable
    """
    case = get_case_db(case_ref, session)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_ref}' not found.")

    # Record the evidence
    evidence = Evidence(
        case_ref=case_ref,
        evidence_type=data.evidence_type,
        description=data.description,
        value=data.value,
        source=data.source,
    )
    session.add(evidence)
    session.commit()

    # Write evidence lineage record
    append_lineage(
        session=session,
        case_ref=case_ref,
        event_type="evidence_added",
        case_status=case.case_status,
        evidence=[data.evidence_type],
        action=None,
        description=f"Evidence '{data.evidence_type}' added: {data.description}",
    )

    # Recalculate risk - this may change autonomy level
    recalculate_risk(case, session)

    # Return updated case state
    return _build_case_read(case, session)
