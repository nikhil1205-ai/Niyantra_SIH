"""
models/case.py - SQLModel table definition for a CGHS Case.

A Case represents one claim processing unit.
Risk score and autonomy level are recalculated whenever new evidence arrives.
"""
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class CaseBase(SQLModel):
    domain: str = "CGHS"
    beneficiary_id: str  # Synthetic ID only - no real PII
    hospital_id: str
    procedure_code: str
    claimed_amount: float
    approved_rate: float


class Case(CaseBase, table=True):
    """Database table for CGHS cases."""
    __tablename__ = "cases"

    id: Optional[int] = Field(default=None, primary_key=True)
    case_ref: str = Field(unique=True, index=True)  # Human-readable e.g. CASE-001

    # Governance fields - updated by Risk Engine and Autonomy Controller
    risk_score: float = Field(default=0.0)
    autonomy_level: str = Field(default="L4")  # L0..L4

    # Case status is separate from risk (risk ≠ fraud)
    case_status: str = Field(default="clean")

    # Raw risk factor breakdown for frontend display
    evidence_risk: float = Field(default=0.0)
    policy_sensitivity: float = Field(default=0.0)
    action_impact: float = Field(default=0.0)
    confidence_risk: float = Field(default=0.0)
    reversibility_risk: float = Field(default=0.0)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CaseCreate(CaseBase):
    """Pydantic model for POST /api/cases request body."""
    case_ref: Optional[str] = None  # Auto-generated if not provided


class CaseRead(SQLModel):
    """Pydantic model for case API responses - includes governance fields."""
    id: int
    case_ref: str
    domain: str
    beneficiary_id: str
    hospital_id: str
    procedure_code: str
    claimed_amount: float
    approved_rate: float
    risk_score: float
    autonomy_level: str
    case_status: str
    risk_factors: dict
    latest_decision: str
    created_at: datetime
    updated_at: datetime
