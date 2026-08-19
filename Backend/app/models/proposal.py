"""
models/proposal.py - An AI action proposal.

The ProposalAgent creates proposals.
Only the Tool Gateway can execute them.
Agents CANNOT call the Gateway directly.
"""
from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field
from pydantic import field_validator
import json


class Proposal(SQLModel, table=True):
    """Database record of an AI-generated action proposal."""
    __tablename__ = "proposals"

    id: Optional[int] = Field(default=None, primary_key=True)
    case_ref: str = Field(index=True)

    agent: str  # Which agent created this proposal
    action_type: str  # e.g. "settlement", "claim_submit", "verify_beneficiary"
    confidence: float  # 0.0 to 1.0
    reasoning: str

    # evidence_refs stored as JSON string in SQLite
    evidence_refs_json: str = Field(default="[]")

    # Gateway decision fields - set AFTER gateway processes the proposal
    gateway_status: Optional[str] = None   # "allowed", "blocked", "pending_approval"
    gateway_reason: Optional[str] = None
    risk_at_decision: Optional[float] = None
    autonomy_at_decision: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    decided_at: Optional[datetime] = None


class ProposalCreate(SQLModel):
    """Request body for POST /api/cases/{case_id}/propose."""
    action_type: str
    confidence: float = 0.85


class ProposalRead(SQLModel):
    """API response shape for a proposal."""
    id: int
    case_ref: str
    agent: str
    action_type: str
    confidence: float
    reasoning: str
    evidence_refs: List[str]
    gateway_status: Optional[str]
    gateway_reason: Optional[str]
    risk_at_decision: Optional[float]
    autonomy_at_decision: Optional[str]
    created_at: datetime
    decided_at: Optional[datetime]
