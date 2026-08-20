from typing import Optional, List, Any, Dict
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field
from pydantic import BaseModel

# ─── DATABASE TABLES ──────────────────────────────────────────────────────────

class Case(SQLModel, table=True):
    __tablename__ = "cases"

    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: str = Field(index=True, unique=True)
    status: str = Field(default="PROCESSING")
    current_stage: str = Field(default="APPLICATION_SUBMITTED")
    current_risk: Optional[float] = Field(default=None)
    current_autonomy: Optional[str] = Field(default=None)
    # Module 4 additions
    action_state: str = Field(default="PROPOSED")              # PROPOSED | PERMITTED | REQUIRES_REAUTHORIZATION | RESTRICTED | BLOCKED | EXECUTED
    has_evidence_conflict: bool = Field(default=False)         # True when field evidence contradicts AI evidence
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Application(SQLModel, table=True):
    __tablename__ = "applications"

    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: str = Field(index=True)

    # Section A - Citizen Information
    full_name: str
    citizen_id: str
    phone: str
    address: str
    district: str
    state: str

    # Section B - Disaster Information
    disaster_type: str = Field(default="Flood")
    disaster_date: str
    affected_location: str
    damage_type: str
    estimated_damage: float

    # Section C - Bank / Relief Information
    bank_account: str
    ifsc: str
    requested_amount: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Evidence(SQLModel, table=True):
    __tablename__ = "evidence"

    id: Optional[int] = Field(default=None, primary_key=True)
    evidence_id: str = Field(index=True, unique=True)
    case_id: str = Field(index=True)
    type: str  # e.g., 'identity_doc', 'damage_photo', 'field_inspection'
    file_name: str
    path_or_url: str = Field(default="")
    mime_type: str = Field(default="application/octet-stream")
    source: str = Field(default="CITIZEN")          # CITIZEN | OFFICER | PUBLIC | FIELD_INSPECTION_SYSTEM
    status: str = Field(default="SUBMITTED")        # SUBMITTED | PENDING | VERIFIED | REJECTED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CaseEvent(SQLModel, table=True):
    __tablename__ = "case_events"

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: str = Field(index=True, unique=True)
    case_id: str = Field(index=True)
    event_type: str                                    # APPLICATION_SUBMITTED | FIELD_INSPECTION | RISK_EVALUATED ...
    source: str = Field(default="CITIZEN_PORTAL")      # system source label
    # Module 4: user-submitted event fields (nullable for system-generated events)
    submitter_type: str = Field(default="SYSTEM")      # SYSTEM | PUBLIC | OFFICER
    verification_status: str = Field(default="VERIFIED")  # PENDING | VERIFIED | REJECTED
    description: str = Field(default="")              # human-readable description from submitter
    submitted_by: str = Field(default="")             # name / role of submitter
    metadata_json: str = Field(default="{}")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AgentResult(SQLModel, table=True):
    __tablename__ = "agent_results"

    id: Optional[int] = Field(default=None, primary_key=True)
    result_id: str = Field(index=True, unique=True)
    case_id: str = Field(index=True)
    agent_name: str
    status: str
    confidence: float = Field(default=0.0)
    findings_json: str = Field(default="[]")
    evidence_ids_json: str = Field(default="[]")
    recommended_action: str = Field(default="CONTINUE")
    damage_level: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RiskEvaluation(SQLModel, table=True):
    """Immutable record of each risk evaluation run. Never overwritten."""
    __tablename__ = "risk_evaluations"

    id: Optional[int] = Field(default=None, primary_key=True)
    risk_id: str = Field(index=True, unique=True)
    case_id: str = Field(index=True)
    risk_score: float
    risk_level: str
    risk_factors_json: str = Field(default="[]")
    explanation: str = Field(default="")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AutonomyDecision(SQLModel, table=True):
    """Immutable record of each autonomy decision. Preserves full transition history."""
    __tablename__ = "autonomy_decisions"

    id: Optional[int] = Field(default=None, primary_key=True)
    decision_id: str = Field(index=True, unique=True)
    case_id: str = Field(index=True)
    risk_id: str = Field(default="")
    previous_autonomy: Optional[str] = Field(default=None)
    autonomy_level: str
    allowed_actions_json: str = Field(default="[]")
    restricted_actions_json: str = Field(default="[]")
    reason: str = Field(default="")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DecisionLineage(SQLModel, table=True):
    """Structured record linking agent results to risk score and autonomy level."""
    __tablename__ = "decision_lineage"

    id: Optional[int] = Field(default=None, primary_key=True)
    lineage_id: str = Field(index=True, unique=True)
    case_id: str = Field(index=True)
    risk_id: str = Field(default="")
    decision_id: str = Field(default="")
    agent_summary_json: str = Field(default="{}")
    risk_factors_json: str = Field(default="[]")
    risk_score: float
    autonomy_level: str
    summary_explanation: str = Field(default="")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ─── API PYDANTIC SCHEMAS ──────────────────────────────────────────────────────

class EvidenceInput(BaseModel):
    type: str
    file_name: str
    path_or_url: Optional[str] = ""
    mime_type: Optional[str] = "application/octet-stream"

class DisasterReliefApplicationCreate(BaseModel):
    full_name: str
    citizen_id: str
    phone: str
    address: str
    district: str
    state: str
    disaster_type: str = "Flood"
    disaster_date: str
    affected_location: str
    damage_type: str
    estimated_damage: float
    bank_account: str
    ifsc: str
    requested_amount: float
    evidence: Optional[List[EvidenceInput]] = []

class EvidenceAddRequest(BaseModel):
    type: str
    file_name: str
    path_or_url: Optional[str] = ""
    mime_type: Optional[str] = "application/octet-stream"
    source: Optional[str] = "CITIZEN"

class CaseCreateResponse(BaseModel):
    success: bool
    case_id: str
    status: str
    current_stage: str
    message: str

class AgentReviewRequest(BaseModel):
    simulate_disagreement: Optional[bool] = False


class ExternalEventRequest(BaseModel):
    """
    Module 4: Payload for POST /api/cases/{case_id}/events.
    Supports both PUBLIC and OFFICER submissions with full evidence details.
    PUBLIC submissions are stored as PENDING and do NOT trigger risk re-evaluation.
    OFFICER submissions are stored as VERIFIED and trigger the full re-evaluation pipeline.
    """
    submitter_type: str = "OFFICER"          # PUBLIC | OFFICER
    submitted_by: str = ""                   # name / role label
    event_type: str = "FIELD_INSPECTION"     # FIELD_INSPECTION | DAMAGE_REPORT | ADDITIONAL_EVIDENCE | PUBLIC_OBSERVATION
    description: str = ""
    location: str = ""
    damage_finding: str = "UNKNOWN"          # SEVERE | MAJOR | MODERATE | MINOR | NONE | UNKNOWN
    evidence_files: Optional[List[str]] = []
    # For OFFICER: can be VERIFIED. For PUBLIC: server always overrides to PENDING.
    verification_status: str = "PENDING"
    idempotency_key: Optional[str] = None


class EventVerifyRequest(BaseModel):
    """Payload for POST /api/cases/{case_id}/events/{event_id}/verify"""
    verified_by: str = "OFFICER"
    notes: str = ""
