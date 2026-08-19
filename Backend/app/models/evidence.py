"""
models/evidence.py - Evidence items attached to a case.

Evidence drives risk recalculation.
Each piece of evidence is immutable once recorded.
"""
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class Evidence(SQLModel, table=True):
    """Each row is one piece of evidence for a case."""
    __tablename__ = "evidence"

    id: Optional[int] = Field(default=None, primary_key=True)
    case_ref: str = Field(index=True)

    # Evidence type drives risk factor rules in the Risk Engine
    evidence_type: str  # e.g. "rate_mismatch", "missing_document", "duplicate_claim"
    description: str
    value: Optional[str] = None  # Optional raw value, e.g. "65000 vs 40000"

    # Source of the evidence for audit trail
    source: str = Field(default="system")  # "system" or "user"

    recorded_at: datetime = Field(default_factory=datetime.utcnow)


class EvidenceCreate(SQLModel):
    """Pydantic model for POST /api/cases/{case_id}/evidence request body."""
    evidence_type: str
    description: str
    value: Optional[str] = None
    source: str = "system"


class EvidenceRead(SQLModel):
    id: int
    case_ref: str
    evidence_type: str
    description: str
    value: Optional[str]
    source: str
    recorded_at: datetime
