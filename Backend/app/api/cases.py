"""
api/cases.py - REST endpoints for CGHS cases.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.models.case import CaseCreate, CaseRead
from app.services.case_service import create_case, get_case

router = APIRouter(prefix="/api/cases", tags=["Cases"])


@router.post("", response_model=CaseRead, status_code=201)
def create_new_case(data: CaseCreate, session: Session = Depends(get_session)):
    """
    Create a new CGHS case.
    
    Risk is calculated immediately on creation based on claimed vs approved amounts.
    Autonomy level is set automatically from the initial risk score.
    """
    return create_case(data, session)


@router.get("/{case_ref}", response_model=CaseRead)
def get_case_by_ref(case_ref: str, session: Session = Depends(get_session)):
    """
    Get a case by its reference ID (e.g. CASE-001).
    
    Returns full governance state including risk score, autonomy level,
    risk factor breakdown, and latest decision explanation.
    """
    result = get_case(case_ref, session)
    if not result:
        raise HTTPException(status_code=404, detail=f"Case '{case_ref}' not found.")
    return result
