"""
api/lineage.py - REST endpoint for decision lineage and explanations.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.models.lineage import LineageRead
from app.services.case_service import get_case_db
from app.lineage.store import list_for_case, to_read_model
from app.explainability.narrative import generate_narrative

router = APIRouter(prefix="/api/cases", tags=["Lineage"])


@router.get("/{case_ref}/lineage", response_model=List[LineageRead])
def get_lineage(case_ref: str, session: Session = Depends(get_session)):
    """
    Get the complete decision lineage for a case.
    
    Returns every governance event in chronological order.
    Records are append-only and cannot be modified.
    """
    case = get_case_db(case_ref, session)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_ref}' not found.")

    records = list_for_case(session, case_ref)
    return [to_read_model(r) for r in records]


@router.get("/{case_ref}/explain")
def explain_case(case_ref: str, session: Session = Depends(get_session)):
    """
    Get a human-readable narrative explanation of all governance decisions for this case.
    
    Generated entirely from the lineage data - no LLM involved.
    Every sentence is traceable to a specific lineage record.
    """
    case = get_case_db(case_ref, session)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_ref}' not found.")

    records = list_for_case(session, case_ref)
    narrative = generate_narrative(records)

    return {
        "case_ref": case_ref,
        "narrative": narrative,
        "lineage_count": len(records),
        "current_risk": case.risk_score,
        "current_autonomy": case.autonomy_level,
        "current_status": case.case_status,
    }
