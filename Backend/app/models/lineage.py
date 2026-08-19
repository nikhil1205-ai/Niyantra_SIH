"""
models/lineage.py - Append-only decision lineage records.

Every important governance event is recorded here.
Records are NEVER updated or deleted - this is a compliance audit trail.
"""
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class LineageRecord(SQLModel, table=True):
    """
    Append-only audit record for every governance transition.
    
    Governance rule: Only append() is allowed. No update, no delete.
    """
    __tablename__ = "lineage"

    id: Optional[int] = Field(default=None, primary_key=True)
    case_ref: str = Field(index=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # What kind of event occurred
    event_type: str  # e.g. "risk_change", "proposal_created", "gateway_decision"

    # Risk state before and after this event
    risk_before: Optional[float] = None
    risk_after: Optional[float] = None

    # Autonomy level before and after this event
    autonomy_before: Optional[str] = None
    autonomy_after: Optional[str] = None

    # Case status at the time of this event
    case_status: Optional[str] = None

    # What triggered this event
    evidence: Optional[str] = None       # JSON list of evidence types
    policy_triggered: Optional[str] = None  # Policy rule ID if triggered

    # Action and outcome
    action: Optional[str] = None         # e.g. "settlement"
    outcome: Optional[str] = None        # e.g. "blocked", "allowed", "pending"

    # Human-readable description for the explainability engine
    description: Optional[str] = None


class LineageRead(SQLModel):
    """API response shape for lineage records."""
    id: int
    case_ref: str
    timestamp: datetime
    event_type: str
    risk_before: Optional[float]
    risk_after: Optional[float]
    autonomy_before: Optional[str]
    autonomy_after: Optional[str]
    case_status: Optional[str]
    evidence: Optional[str]
    policy_triggered: Optional[str]
    action: Optional[str]
    outcome: Optional[str]
    description: Optional[str]
