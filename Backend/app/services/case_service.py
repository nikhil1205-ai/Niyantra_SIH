"""
services/case_service.py - Business logic for case operations.

Keeps business logic separate from API route handlers.
All routes delegate here.
"""
import json
from datetime import datetime
from typing import List, Optional
from sqlmodel import Session, select

from app.models.case import Case, CaseCreate, CaseRead
from app.models.evidence import Evidence
from app.models.proposal import Proposal
from app.risk.calculator import calculate_risk
from app.policy.engine import evaluate_policy
from app.autonomy.controller import determine_autonomy_level
from app.lineage.store import append_lineage
from app.explainability.narrative import generate_summary


def _case_ref_from_id(case_id: int) -> str:
    return f"CASE-{case_id:03d}"


def _build_case_read(case: Case, session: Session) -> CaseRead:
    """Build the full CaseRead response model from a Case DB record."""
    from app.lineage.store import list_for_case
    from app.agents.proposal_agent import pmjay_agent

    lineage = list_for_case(session, case.case_ref)
    latest_decision = generate_summary(lineage, case.risk_score, case.autonomy_level)

    evidence_list = session.exec(
        select(Evidence).where(Evidence.case_ref == case.case_ref)
    ).all()

    agent_results = [
        {
            "agent_id": r.agent_id,
            "case_id": r.case_id,
            "status": r.status,
            "confidence": r.confidence,
            "evidence": r.evidence,
            "risk_factors": r.risk_factors,
            "proposed_action": r.proposed_action,
        }
        for r in pmjay_agent.run_all_agents(case, list(evidence_list))
    ]

    return CaseRead(
        id=case.id,
        case_ref=case.case_ref,
        domain=case.domain,
        beneficiary_id=case.beneficiary_id,
        beneficiary_name=getattr(case, "beneficiary_name", "Rahul Sharma"),
        age=getattr(case, "age", 46),
        gender=getattr(case, "gender", "Male"),
        state=getattr(case, "state", "Madhya Pradesh"),
        district=getattr(case, "district", "Bhopal"),
        hospital_id=case.hospital_id,
        hospital_name=getattr(case, "hospital_name", "Demo Care Hospital"),
        hospital_type=getattr(case, "hospital_type", "Empaneled Private"),
        package_code=getattr(case, "package_code", "PKG-SYN-204"),
        package_name=getattr(case, "package_name", "Demo Surgical Package"),
        procedure_code=case.procedure_code,
        admission_date=getattr(case, "admission_date", "2026-08-10"),
        discharge_date=getattr(case, "discharge_date", "2026-08-15"),
        claimed_amount=case.claimed_amount,
        approved_rate=case.approved_rate,
        eligibility_status=getattr(case, "eligibility_status", "verified"),
        identity_status=getattr(case, "identity_status", "verified"),
        hospital_status=getattr(case, "hospital_status", "empaneled"),
        package_status=getattr(case, "package_status", "approved"),
        claim_status=getattr(case, "claim_status", "submitted"),
        risk_score=case.risk_score,
        autonomy_level=case.autonomy_level,
        case_status=case.case_status,
        risk_factors={
            "evidence_risk": case.evidence_risk,
            "policy_sensitivity": case.policy_sensitivity,
            "action_impact": case.action_impact,
            "confidence_risk": case.confidence_risk,
            "reversibility_risk": case.reversibility_risk,
            "beneficiary_identity_risk": getattr(case, "beneficiary_identity_risk", 0.0),
            "document_risk": getattr(case, "document_risk", 0.0),
            "hospital_risk": getattr(case, "hospital_risk", 0.0),
            "treatment_risk": getattr(case, "treatment_risk", 0.0),
            "claim_anomaly_risk": getattr(case, "claim_anomaly_risk", 0.0),
        },
        agent_results=agent_results,
        latest_decision=latest_decision,
        created_at=case.created_at,
        updated_at=case.updated_at,
    )


def create_case(data: CaseCreate, session: Session) -> CaseRead:
    """Create a new PM-JAY case with initial risk calculation."""
    if data.case_ref:
        case_ref = data.case_ref
    else:
        existing = session.exec(select(Case)).all()
        case_ref = f"PMJAY-DEMO-{len(existing) + 1:03d}"

    # Initial risk calculation
    temp_case = Case(
        case_ref=case_ref,
        domain=data.domain,
        beneficiary_id=data.beneficiary_id,
        beneficiary_name=data.beneficiary_name,
        age=data.age,
        gender=data.gender,
        state=data.state,
        district=data.district,
        hospital_id=data.hospital_id,
        hospital_name=data.hospital_name,
        hospital_type=data.hospital_type,
        package_code=data.package_code,
        package_name=data.package_name,
        procedure_code=data.procedure_code,
        admission_date=data.admission_date,
        discharge_date=data.discharge_date,
        claimed_amount=data.claimed_amount,
        approved_rate=data.approved_rate,
        eligibility_status=data.eligibility_status,
        identity_status=data.identity_status,
        hospital_status=data.hospital_status,
        package_status=data.package_status,
        claim_status=data.claim_status,
    )

    result = calculate_risk(
        claimed_amount=data.claimed_amount,
        approved_rate=data.approved_rate,
        evidence_list=[],
        action_type="authorize_claim",
        confidence=0.95,
        triggered_policies=[],
        case=temp_case,
    )

    autonomy_level = determine_autonomy_level(result.risk_score)

    if result.risk_score < 20:
        status = "clean"
    elif result.risk_score < 65:
        status = "clean"
    else:
        status = "anomaly_detected"

    temp_case.risk_score = result.risk_score
    temp_case.autonomy_level = autonomy_level
    temp_case.case_status = status
    temp_case.evidence_risk = result.evidence_risk
    temp_case.policy_sensitivity = result.policy_sensitivity
    temp_case.action_impact = result.action_impact
    temp_case.confidence_risk = result.confidence_risk
    temp_case.reversibility_risk = result.reversibility_risk
    temp_case.beneficiary_identity_risk = result.beneficiary_identity_risk
    temp_case.document_risk = result.document_risk
    temp_case.hospital_risk = result.hospital_risk
    temp_case.treatment_risk = result.treatment_risk
    temp_case.claim_anomaly_risk = result.claim_anomaly_risk

    session.add(temp_case)
    session.commit()
    session.refresh(temp_case)

    append_lineage(
        session=session,
        case_ref=temp_case.case_ref,
        event_type="case_created",
        risk_after=temp_case.risk_score,
        autonomy_after=temp_case.autonomy_level,
        case_status=temp_case.case_status,
        description=f"PM-JAY Case {temp_case.case_ref} created for synthetic beneficiary {temp_case.beneficiary_name}.",
    )

    return _build_case_read(temp_case, session)


def get_case(case_ref: str, session: Session) -> Optional[CaseRead]:
    """Fetch a case by its human-readable reference."""
    case = session.exec(
        select(Case).where(Case.case_ref == case_ref)
    ).first()
    if not case:
        return None
    return _build_case_read(case, session)


def get_case_db(case_ref: str, session: Session) -> Optional[Case]:
    """Fetch the raw Case DB object (used internally by other services)."""
    return session.exec(
        select(Case).where(Case.case_ref == case_ref)
    ).first()


def recalculate_risk(case: Case, session: Session, action_type: str = "authorize_claim", confidence: float = 0.85) -> None:
    """
    Recalculate risk for a case based on all current evidence.
    """
    evidence_list = session.exec(
        select(Evidence).where(Evidence.case_ref == case.case_ref)
    ).all()

    evidence_types = [e.evidence_type for e in evidence_list]
    triggered_policies, _ = evaluate_policy(
        case.claimed_amount, case.approved_rate, evidence_types
    )

    result = calculate_risk(
        claimed_amount=case.claimed_amount,
        approved_rate=case.approved_rate,
        evidence_list=list(evidence_list),
        action_type=action_type,
        confidence=confidence,
        triggered_policies=triggered_policies,
        case=case,
    )

    old_risk = case.risk_score
    old_level = case.autonomy_level
    new_level = determine_autonomy_level(result.risk_score)

    new_status = _determine_case_status(result.risk_score, evidence_types, case.case_status)

    case.risk_score = result.risk_score
    case.autonomy_level = new_level
    case.case_status = new_status
    case.evidence_risk = result.evidence_risk
    case.policy_sensitivity = result.policy_sensitivity
    case.action_impact = result.action_impact
    case.confidence_risk = result.confidence_risk
    case.reversibility_risk = result.reversibility_risk
    case.beneficiary_identity_risk = result.beneficiary_identity_risk
    case.document_risk = result.document_risk
    case.hospital_risk = result.hospital_risk
    case.treatment_risk = result.treatment_risk
    case.claim_anomaly_risk = result.claim_anomaly_risk
    case.updated_at = datetime.utcnow()

    session.add(case)
    session.commit()
    session.refresh(case)

    if abs(result.risk_score - old_risk) > 0.5 or new_level != old_level:
        policy_str = ", ".join(triggered_policies) if triggered_policies else None
        append_lineage(
            session=session,
            case_ref=case.case_ref,
            event_type="risk_change",
            risk_before=old_risk,
            risk_after=result.risk_score,
            autonomy_before=old_level,
            autonomy_after=new_level,
            case_status=new_status,
            evidence=evidence_types,
            policy_triggered=policy_str,
            description=_build_risk_change_description(
                old_risk, result.risk_score, old_level, new_level, triggered_policies, evidence_types
            ),
        )



def _determine_case_status(risk_score: float, evidence_types: List[str], current_status: str) -> str:
    """
    Determine case status from risk score and evidence types.
    
    IMPORTANT: Automated code NEVER sets 'confirmed_irregularity'.
    Only a human approval action can set that.
    """
    # Never downgrade from a status set by human action
    if current_status == "confirmed_irregularity":
        return current_status
    if current_status == "resolved_clean":
        return current_status

    if "duplicate_claim" in evidence_types and risk_score >= 65:
        return "under_investigation"
    elif "beneficiary_conflict" in evidence_types:
        return "inconsistency_flagged"
    elif risk_score >= 65:
        return "inconsistency_flagged"
    elif risk_score >= 40:
        return "anomaly_detected"
    else:
        return "clean"


def _build_risk_change_description(
    old_risk: float,
    new_risk: float,
    old_level: str,
    new_level: str,
    triggered_policies: List[str],
    evidence_types: List[str],
) -> str:
    """Build a human-readable description for a risk change lineage record."""
    parts = []

    if triggered_policies:
        policy_names = ", ".join(triggered_policies)
        parts.append(f"policy rules were triggered ({policy_names})")

    if "rate_mismatch" in evidence_types:
        parts.append("claimed amount exceeds the approved CGHS rate")
    if "missing_document" in evidence_types:
        parts.append("required documents are missing")
    if "duplicate_claim" in evidence_types:
        parts.append("a duplicate claim was detected")
    if "beneficiary_conflict" in evidence_types:
        parts.append("beneficiary information conflicts with records")

    reason = "; ".join(parts) if parts else "new evidence was evaluated"
    return f"Risk changed from {old_risk:.1f} to {new_risk:.1f} because {reason}."
