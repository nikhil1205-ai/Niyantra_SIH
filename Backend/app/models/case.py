"""
models/case.py - SQLModel table definition for a CGHS Case.

A Case represents one claim processing unit.
Risk score and autonomy level are recalculated whenever new evidence arrives.
"""
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class CaseBase(SQLModel):
    domain: str = "PM-JAY"
    beneficiary_id: str = "BEN-SYN-001"  # Synthetic ID only - no real PII
    beneficiary_name: str = "Rahul Sharma"
    age: int = 46
    gender: str = "Male"
    state: str = "Madhya Pradesh"
    district: str = "Bhopal"
    hospital_id: str = "HOSP-SYN-101"
    hospital_name: str = "Demo Care Hospital"
    hospital_type: str = "Empaneled Private"
    package_code: str = "PKG-SYN-204"
    package_name: str = "Demo Surgical Package"
    procedure_code: str = "PKG-SYN-204"
    admission_date: str = "2026-08-10"
    discharge_date: str = "2026-08-15"
    claimed_amount: float = 85000.0
    approved_rate: float = 85000.0
    eligibility_status: str = "verified"
    identity_status: str = "verified"
    hospital_status: str = "empaneled"
    package_status: str = "approved"
    claim_status: str = "submitted"


class Case(CaseBase, table=True):
    """Database table for PM-JAY cases."""
    __tablename__ = "cases"

    id: Optional[int] = Field(default=None, primary_key=True)
    case_ref: str = Field(unique=True, index=True)  # Human-readable e.g. PMJAY-DEMO-001

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

    # 5 PM-JAY specific risk dimensions
    beneficiary_identity_risk: float = Field(default=0.0)
    document_risk: float = Field(default=0.0)
    hospital_risk: float = Field(default=0.0)
    treatment_risk: float = Field(default=0.0)
    claim_anomaly_risk: float = Field(default=0.0)

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
    beneficiary_name: str
    age: int
    gender: str
    state: str
    district: str
    hospital_id: str
    hospital_name: str
    hospital_type: str
    package_code: str
    package_name: str
    procedure_code: str
    admission_date: str
    discharge_date: str
    claimed_amount: float
    approved_rate: float
    eligibility_status: str
    identity_status: str
    hospital_status: str
    package_status: str
    claim_status: str
    risk_score: float
    autonomy_level: str
    case_status: str
    risk_factors: dict
    agent_results: Optional[list] = None
    latest_decision: str
    created_at: datetime
    updated_at: datetime

