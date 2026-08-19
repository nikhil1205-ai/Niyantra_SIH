"""
models/__init__.py - Re-exports all SQLModel tables so they're registered
before SQLModel.metadata.create_all() is called.
"""
from app.models.case import Case, CaseCreate, CaseRead
from app.models.evidence import Evidence, EvidenceCreate, EvidenceRead
from app.models.proposal import Proposal, ProposalCreate, ProposalRead
from app.models.lineage import LineageRecord, LineageRead

__all__ = [
    "Case", "CaseCreate", "CaseRead",
    "Evidence", "EvidenceCreate", "EvidenceRead",
    "Proposal", "ProposalCreate", "ProposalRead",
    "LineageRecord", "LineageRead",
]
