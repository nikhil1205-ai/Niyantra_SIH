"""
NIYANTRA Module 4 — Event Processor
=====================================
Handles external events submitted via the Event Updates interface.

Two submission paths:

  PUBLIC submission:
    submitter_type = PUBLIC
        -> Evidence stored as PENDING
        -> Risk is NOT recalculated
        -> Case stage unchanged
        -> Awaits officer verification

  OFFICER submission:
    submitter_type = OFFICER
        -> Evidence stored as VERIFIED
        -> Conflict detection runs immediately
        -> Risk recalculated via Module 3 RiskOrchestrator
        -> Autonomy recalculated
        -> Action state updated
        -> Stage set to RUNTIME_REEVALUATION (or REQUIRES_HUMAN_REVIEW if L1)

verify_event():
    Promotes a PENDING event to VERIFIED and runs the same pipeline as OFFICER.

Design principles:
  - Idempotent: same idempotency_key processed at most once
  - No risk duplication: reuses RiskOrchestrator from Module 3
  - Auditable: every step emits a CaseEvent
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List

from sqlmodel import Session, select

from app.models import (
    Case,
    Evidence,
    CaseEvent,
    AgentResult,
    ExternalEventRequest,
    EventVerifyRequest,
)
from app.services.risk import RiskOrchestrator


# ─── ACTION STATE TRANSITIONS ─────────────────────────────────────────────────

_DOWNGRADE_PAIRS = {("L3", "L2"), ("L3", "L1"), ("L2", "L1")}


def _compute_action_state(previous_action_state: str, previous_autonomy: Optional[str], new_autonomy: str) -> str:
    pair = (previous_autonomy, new_autonomy)
    if pair in _DOWNGRADE_PAIRS and previous_action_state == "PERMITTED":
        return "REQUIRES_REAUTHORIZATION"
    if new_autonomy == "L3" and previous_action_state == "REQUIRES_REAUTHORIZATION":
        return "PERMITTED"
    return previous_action_state


# ─── CONFLICT DETECTION ───────────────────────────────────────────────────────

_HIGH_LEVELS = {"SEVERE", "MAJOR", "HIGH"}
_LOW_LEVELS  = {"MINOR", "NONE", "LOW", "MINIMAL"}


def _detect_conflict(ai_damage_level: Optional[str], field_damage_level: str) -> bool:
    if not ai_damage_level or not field_damage_level or field_damage_level == "UNKNOWN":
        return False
    ai_high   = ai_damage_level.upper() in _HIGH_LEVELS
    field_low = field_damage_level.upper() in _LOW_LEVELS
    ai_low    = ai_damage_level.upper() in _LOW_LEVELS
    field_high = field_damage_level.upper() in _HIGH_LEVELS
    return (ai_high and field_low) or (ai_low and field_high)


def _get_ai_damage_level(session: Session, case_id: str) -> Optional[str]:
    raw_agents = session.exec(
        select(AgentResult)
        .where(AgentResult.case_id == case_id)
        .order_by(AgentResult.id.desc())
    ).all()
    for r in raw_agents:
        if r.agent_name == "evidence_agent" and r.damage_level:
            return r.damage_level
    return None


class EventProcessor:
    """
    Module 4 core: processes external events, enforces trust levels,
    triggers conditional risk re-evaluation.
    """

    def __init__(self, session: Session):
        self.session = session

    # ── PUBLIC ENTRY POINT ─────────────────────────────────────────────────────

    def process(self, case_id: str, request: ExternalEventRequest) -> Dict[str, Any]:
        """
        Main entry point. Branches on submitter_type:
          OFFICER → verify immediately, run risk pipeline
          PUBLIC  → store as PENDING, no risk change
        """
        case_obj = self.session.exec(select(Case).where(Case.case_id == case_id)).first()
        if not case_obj:
            raise ValueError(f"Case {case_id} not found.")

        # Enforce: at least Module 3 must be done for OFFICER events.
        # PUBLIC events can be submitted as long as the case exists.
        if request.submitter_type == "OFFICER" and case_obj.current_stage not in (
            "RISK_EVALUATED", "AI_REVIEW_COMPLETED", "RUNTIME_REEVALUATION", "REQUIRES_HUMAN_REVIEW"
        ):
            raise ValueError(
                f"Case {case_id} is at stage '{case_obj.current_stage}'. "
                f"Officer events require at least AI Review (Module 2) to be completed."
            )

        # Idempotency
        idem_key = request.idempotency_key or f"{case_id}:{request.event_type}:{request.submitter_type}:{request.submitted_by}"
        for evt in self.session.exec(select(CaseEvent).where(CaseEvent.case_id == case_id)).all():
            meta = json.loads(evt.metadata_json) if evt.metadata_json else {}
            if meta.get("idempotency_key") == idem_key:
                return self._idempotent_response(case_id, case_obj, idem_key)

        # PUBLIC submissions: store only, no risk change
        if request.submitter_type == "PUBLIC":
            return self._process_public(case_id, case_obj, request, idem_key)

        # OFFICER submissions: verify immediately and run full pipeline
        return self._process_officer(case_id, case_obj, request, idem_key)

    # ── PUBLIC PATH ────────────────────────────────────────────────────────────

    def _process_public(self, case_id: str, case_obj: Case, request: ExternalEventRequest, idem_key: str) -> Dict[str, Any]:
        """
        Store public submission as PENDING. Do NOT change risk or autonomy.
        Public submissions must pass officer verification before influencing governance.
        """
        now      = datetime.now(timezone.utc)
        event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
        ev_id    = f"EV-{uuid.uuid4().hex[:8].upper()}"

        # Store evidence as PENDING
        filenames = request.evidence_files or [f"public_evidence_{event_id.lower()}.jpg"]
        for fname in filenames[:3]:  # cap at 3 files
            ev = Evidence(
                evidence_id=f"EV-{uuid.uuid4().hex[:8].upper()}",
                case_id=case_id,
                type="public_submission",
                file_name=fname,
                source="PUBLIC",
                status="PENDING",
                created_at=now,
            )
            self.session.add(ev)

        # Store CaseEvent (PENDING)
        incoming = CaseEvent(
            event_id=event_id,
            case_id=case_id,
            event_type=request.event_type,
            source="PUBLIC_PORTAL",
            submitter_type="PUBLIC",
            verification_status="PENDING",
            description=request.description,
            submitted_by=request.submitted_by or "Anonymous Public User",
            metadata_json=json.dumps({
                "idempotency_key": idem_key,
                "damage_finding":  request.damage_finding,
                "location":        request.location,
                "evidence_files":  request.evidence_files or [],
            }),
            created_at=now,
        )
        self.session.add(incoming)
        self.session.commit()

        return {
            "success":           True,
            "case_id":           case_id,
            "event_id":          event_id,
            "submitter_type":    "PUBLIC",
            "verification_status": "PENDING",
            "event_type":        request.event_type,
            "risk_changed":      False,
            "message":           "Public submission received. Evidence is marked PENDING and will not affect case risk until verified by an officer.",
            "after": {
                "risk":     case_obj.current_risk,
                "autonomy": case_obj.current_autonomy,
                "action":   case_obj.action_state,
                "stage":    case_obj.current_stage,
            },
        }

    # ── OFFICER PATH ───────────────────────────────────────────────────────────

    def _process_officer(self, case_id: str, case_obj: Case, request: ExternalEventRequest, idem_key: str) -> Dict[str, Any]:
        """
        Officer-verified submission: store as VERIFIED and run full risk pipeline.
        """
        now              = datetime.now(timezone.utc)
        before_risk      = case_obj.current_risk
        before_autonomy  = case_obj.current_autonomy
        before_action    = case_obj.action_state
        before_stage     = case_obj.current_stage

        event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"
        damage_finding = request.damage_finding

        # Store CaseEvent (VERIFIED)
        incoming = CaseEvent(
            event_id=event_id,
            case_id=case_id,
            event_type=request.event_type,
            source="OFFICER_PORTAL",
            submitter_type="OFFICER",
            verification_status="VERIFIED",
            description=request.description,
            submitted_by=request.submitted_by or "Government Officer",
            metadata_json=json.dumps({
                "idempotency_key": idem_key,
                "damage_finding":  damage_finding,
                "location":        request.location,
                "evidence_files":  request.evidence_files or [],
            }),
            created_at=now,
        )
        self.session.add(incoming)

        # Store evidence as VERIFIED
        filenames = request.evidence_files or [f"field_inspection_{event_id.lower()}.pdf"]
        ev_ids = []
        for fname in filenames[:3]:
            ev_id = f"EV-{uuid.uuid4().hex[:8].upper()}"
            ev_ids.append(ev_id)
            ev = Evidence(
                evidence_id=ev_id,
                case_id=case_id,
                type="field_inspection",
                file_name=fname,
                source="OFFICER",
                status="VERIFIED",
                created_at=now,
            )
            self.session.add(ev)

        # Conflict detection
        ai_damage_level   = _get_ai_damage_level(self.session, case_id)
        conflict_detected = _detect_conflict(ai_damage_level, damage_finding)

        if conflict_detected:
            case_obj.has_evidence_conflict = True
            self.session.add(case_obj)
            self.session.flush()
            self._emit(case_id, "EVIDENCE_CONFLICT_DETECTED", "NIYANTRA_CONFLICT_DETECTOR", {
                "ai_damage_level":    ai_damage_level,
                "field_damage_level": damage_finding,
                "field_event_id":     event_id,
            }, now)

        # Re-evaluate risk (Module 3 reuse)
        self.session.flush()
        orchestrator = RiskOrchestrator(self.session)
        risk_result  = orchestrator.evaluate(case_id)

        self.session.refresh(case_obj)
        after_risk     = case_obj.current_risk
        after_autonomy = case_obj.current_autonomy

        # Action state
        new_action_state = _compute_action_state(before_action, before_autonomy, after_autonomy)
        case_obj.action_state = new_action_state

        # Stage update
        if after_autonomy == "L1":
            case_obj.current_stage = "REQUIRES_HUMAN_REVIEW"
            case_obj.status        = "REQUIRES_HUMAN_REVIEW"
        else:
            case_obj.current_stage = "RUNTIME_REEVALUATION"
            case_obj.status        = "RUNTIME_REEVALUATION"
        case_obj.updated_at = now
        self.session.add(case_obj)

        # Emit action / autonomy events
        if new_action_state != before_action:
            self._emit(case_id, "ACTION_REAUTHORIZATION_REQUIRED" if new_action_state == "REQUIRES_REAUTHORIZATION" else "ACTION_STATE_CHANGED",
                "AUTONOMY_CONTROLLER", {
                    "previous_action_state": before_action,
                    "new_action_state":      new_action_state,
                    "reason": f"Autonomy changed from {before_autonomy} to {after_autonomy} following verified field evidence.",
                }, now)

        if before_autonomy != after_autonomy:
            self._emit(case_id, "AUTONOMY_CHANGED", "AUTONOMY_CONTROLLER", {
                "from": before_autonomy, "to": after_autonomy,
                "risk_before": before_risk, "risk_after": after_risk,
            }, now)

        if after_autonomy == "L1":
            self._emit(case_id, "HUMAN_REVIEW_REQUIRED", "NIYANTRA_GOVERNANCE", {
                "reason": "Risk exceeded L2 threshold after new verified evidence. Human officer review is required.",
                "risk":   after_risk,
            }, now)

        self.session.commit()

        return {
            "success":           True,
            "case_id":           case_id,
            "event_id":          event_id,
            "submitter_type":    "OFFICER",
            "verification_status": "VERIFIED",
            "event_type":        request.event_type,
            "conflict_detected": conflict_detected,
            "ai_damage_level":   ai_damage_level,
            "field_damage_level": damage_finding,
            "risk_changed":      True,
            "before": {
                "risk":     before_risk,
                "autonomy": before_autonomy,
                "action":   before_action,
                "stage":    before_stage,
            },
            "after": {
                "risk":     after_risk,
                "autonomy": after_autonomy,
                "action":   new_action_state,
                "stage":    case_obj.current_stage,
            },
            "risk_change":      (after_risk or 0) - (before_risk or 0),
            "autonomy_changed": before_autonomy != after_autonomy,
            "explanation":      risk_result.get("explanation", ""),
            "idempotency_key":  idem_key,
        }

    # ── VERIFY PENDING EVENT ───────────────────────────────────────────────────

    def verify_event(self, case_id: str, event_id: str, request: EventVerifyRequest) -> Dict[str, Any]:
        """
        Promote a PENDING public event to VERIFIED and run the full risk pipeline.
        This is the path for: PUBLIC submission → officer verifies → risk changes.
        """
        # Load event
        evt = self.session.exec(select(CaseEvent).where(CaseEvent.event_id == event_id)).first()
        if not evt:
            raise ValueError(f"Event {event_id} not found.")
        if evt.case_id != case_id:
            raise ValueError(f"Event {event_id} does not belong to case {case_id}.")
        if evt.verification_status == "VERIFIED":
            return {"success": True, "message": "Event was already VERIFIED. No action taken.", "already_verified": True}
        if evt.verification_status == "REJECTED":
            raise ValueError(f"Event {event_id} has been REJECTED and cannot be verified.")

        # Load case
        case_obj = self.session.exec(select(Case).where(Case.case_id == case_id)).first()
        if not case_obj:
            raise ValueError(f"Case {case_id} not found.")

        now             = datetime.now(timezone.utc)
        before_risk     = case_obj.current_risk
        before_autonomy = case_obj.current_autonomy
        before_action   = case_obj.action_state

        # Promote event status
        evt.verification_status = "VERIFIED"
        evt.submitted_by = f"{evt.submitted_by} [Verified by {request.verified_by}]"
        self.session.add(evt)

        # Promote evidence linked to this event
        meta = json.loads(evt.metadata_json) if evt.metadata_json else {}
        damage_finding = meta.get("damage_finding", "UNKNOWN")

        pending_evs = self.session.exec(
            select(Evidence).where(
                Evidence.case_id == case_id,
                Evidence.status == "PENDING",
                Evidence.source == "PUBLIC",
            )
        ).all()
        for ev in pending_evs:
            ev.status = "VERIFIED"
            self.session.add(ev)

        # Emit verification event
        self._emit(case_id, "PUBLIC_EVIDENCE_VERIFIED", "OFFICER_PORTAL", {
            "verified_event_id": event_id,
            "verified_by":       request.verified_by,
            "notes":             request.notes,
            "damage_finding":    damage_finding,
        }, now)

        # Conflict detection
        ai_damage_level   = _get_ai_damage_level(self.session, case_id)
        conflict_detected = _detect_conflict(ai_damage_level, damage_finding)

        if conflict_detected:
            case_obj.has_evidence_conflict = True
            self.session.add(case_obj)
            self.session.flush()
            self._emit(case_id, "EVIDENCE_CONFLICT_DETECTED", "NIYANTRA_CONFLICT_DETECTOR", {
                "ai_damage_level":    ai_damage_level,
                "field_damage_level": damage_finding,
                "source_event_id":    event_id,
            }, now)

        # Re-evaluate risk
        self.session.flush()
        orchestrator = RiskOrchestrator(self.session)
        risk_result  = orchestrator.evaluate(case_id)

        self.session.refresh(case_obj)
        after_risk     = case_obj.current_risk
        after_autonomy = case_obj.current_autonomy

        new_action_state = _compute_action_state(before_action, before_autonomy, after_autonomy)
        case_obj.action_state = new_action_state
        if after_autonomy == "L1":
            case_obj.current_stage = "REQUIRES_HUMAN_REVIEW"
            case_obj.status        = "REQUIRES_HUMAN_REVIEW"
        else:
            case_obj.current_stage = "RUNTIME_REEVALUATION"
            case_obj.status        = "RUNTIME_REEVALUATION"
        case_obj.updated_at = now
        self.session.add(case_obj)

        if new_action_state != before_action:
            self._emit(case_id, "ACTION_REAUTHORIZATION_REQUIRED" if new_action_state == "REQUIRES_REAUTHORIZATION" else "ACTION_STATE_CHANGED",
                "AUTONOMY_CONTROLLER", {"previous": before_action, "new": new_action_state}, now)

        if before_autonomy != after_autonomy:
            self._emit(case_id, "AUTONOMY_CHANGED", "AUTONOMY_CONTROLLER", {
                "from": before_autonomy, "to": after_autonomy,
            }, now)

        self.session.commit()

        return {
            "success":           True,
            "case_id":           case_id,
            "event_id":          event_id,
            "now_verified":      True,
            "conflict_detected": conflict_detected,
            "ai_damage_level":   ai_damage_level,
            "field_damage_level": damage_finding,
            "before": {"risk": before_risk, "autonomy": before_autonomy, "action": before_action},
            "after":  {"risk": after_risk,  "autonomy": after_autonomy,  "action": new_action_state, "stage": case_obj.current_stage},
            "risk_change":      (after_risk or 0) - (before_risk or 0),
            "autonomy_changed": before_autonomy != after_autonomy,
            "explanation":      risk_result.get("explanation", ""),
        }

    # ── HELPERS ────────────────────────────────────────────────────────────────

    def _emit(self, case_id: str, event_type: str, source: str, metadata: Dict, now: datetime):
        """Emit a system-generated CaseEvent."""
        self.session.add(CaseEvent(
            event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
            case_id=case_id,
            event_type=event_type,
            source=source,
            submitter_type="SYSTEM",
            verification_status="VERIFIED",
            metadata_json=json.dumps(metadata),
            created_at=now,
        ))

    def _idempotent_response(self, case_id: str, case_obj: Case, idem_key: str) -> Dict[str, Any]:
        return {
            "success":    True,
            "case_id":    case_id,
            "idempotent": True,
            "message":    f"Event already processed (idempotency_key='{idem_key}'). No duplicate records created.",
            "after": {
                "risk":     case_obj.current_risk,
                "autonomy": case_obj.current_autonomy,
                "action":   case_obj.action_state,
                "stage":    case_obj.current_stage,
            },
        }
