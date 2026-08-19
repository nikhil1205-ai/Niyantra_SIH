"""
lineage/store.py - Append-only lineage repository.

Governance rule: Records are ONLY ever appended.
No update(), no delete() methods are implemented.
This is an intentional design constraint.

All important governance events call append_lineage().
"""
import json
from typing import List, Optional
from sqlmodel import Session, select

from app.models.lineage import LineageRecord, LineageRead


def append_lineage(
    session: Session,
    case_ref: str,
    event_type: str,
    risk_before: Optional[float] = None,
    risk_after: Optional[float] = None,
    autonomy_before: Optional[str] = None,
    autonomy_after: Optional[str] = None,
    case_status: Optional[str] = None,
    evidence: Optional[List[str]] = None,
    policy_triggered: Optional[str] = None,
    action: Optional[str] = None,
    outcome: Optional[str] = None,
    description: Optional[str] = None,
) -> LineageRecord:
    """
    Append a new governance event to the lineage.
    
    This is the ONLY way to create lineage records.
    There is no update or delete.
    """
    record = LineageRecord(
        case_ref=case_ref,
        event_type=event_type,
        risk_before=risk_before,
        risk_after=risk_after,
        autonomy_before=autonomy_before,
        autonomy_after=autonomy_after,
        case_status=case_status,
        evidence=json.dumps(evidence) if evidence else None,
        policy_triggered=policy_triggered,
        action=action,
        outcome=outcome,
        description=description,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def list_for_case(session: Session, case_ref: str) -> List[LineageRecord]:
    """
    Return all lineage records for a case, ordered by timestamp ascending.
    
    Returns the full audit trail for the case.
    """
    statement = (
        select(LineageRecord)
        .where(LineageRecord.case_ref == case_ref)
        .order_by(LineageRecord.timestamp)
    )
    return list(session.exec(statement).all())


def to_read_model(record: LineageRecord) -> LineageRead:
    """Convert a LineageRecord to a LineageRead Pydantic model."""
    return LineageRead(
        id=record.id,
        case_ref=record.case_ref,
        timestamp=record.timestamp,
        event_type=record.event_type,
        risk_before=record.risk_before,
        risk_after=record.risk_after,
        autonomy_before=record.autonomy_before,
        autonomy_after=record.autonomy_after,
        case_status=record.case_status,
        evidence=record.evidence,
        policy_triggered=record.policy_triggered,
        action=record.action,
        outcome=record.outcome,
        description=record.description,
    )
