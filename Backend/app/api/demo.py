"""
api/demo.py - Demo scenario endpoints.

Four reproducible demo scenarios for the NIYANTRA hackathon presentation.

POST /api/demo/reset        - Wipe all data, start fresh
POST /api/demo/scenario/{name} - Run a pre-built scenario

Scenarios:
  scenario1_clean     - Normal low-risk claim
  scenario2_medium    - Medium risk, human approval needed
  scenario3_high      - CGHS rate mismatch, blocked
  scenario4_critical  - Multiple signals, fully blocked

The most important demo is scenario3_high + live evidence injection,
which demonstrates dynamic authority revocation.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, delete

from app.database import get_session
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.proposal import Proposal
from app.models.lineage import LineageRecord
from app.gateway.simulated_cghs import simulated_cghs
from app.services.case_service import create_case, get_case_db, recalculate_risk, _build_case_read
from app.models.case import CaseCreate
from app.models.evidence import EvidenceCreate
from app.lineage.store import append_lineage

router = APIRouter(prefix="/api/demo", tags=["Demo"])


def _add_evidence_and_recalc(case_ref: str, evidence_type: str, description: str, session: Session):
    """Helper to add evidence and trigger risk recalculation."""
    case = get_case_db(case_ref, session)
    ev = Evidence(
        case_ref=case_ref,
        evidence_type=evidence_type,
        description=description,
        source="demo",
    )
    session.add(ev)
    session.commit()
    append_lineage(
        session=session,
        case_ref=case_ref,
        event_type="evidence_added",
        case_status=case.case_status,
        evidence=[evidence_type],
        description=f"[Demo] Evidence '{evidence_type}' added: {description}",
    )
    recalculate_risk(case, session)


@router.post("/reset")
def reset_demo(session: Session = Depends(get_session)):
    """
    Reset all demo data.
    
    Deletes all cases, evidence, proposals, and lineage records.
    Resets the simulated CGHS execution log.
    """
    session.exec(delete(LineageRecord))
    session.exec(delete(Proposal))
    session.exec(delete(Evidence))
    session.exec(delete(Case))
    session.commit()
    simulated_cghs.reset()
    return {"status": "reset", "message": "All demo data cleared. Ready for a fresh demonstration."}


@router.post("/scenario/{scenario_name}")
def run_scenario(scenario_name: str, session: Session = Depends(get_session)):
    """
    Run a pre-built demo scenario.
    
    Available scenarios:
    - scenario1_clean     : Risk ~15, L4, settlement allowed
    - scenario2_medium    : Risk ~45, L2, human approval required
    - scenario3_high      : Risk ~70, L1, settlement blocked (rate mismatch)
    - scenario4_critical  : Risk ~90, L0, completely blocked
    - live_demo           : The PRIMARY demo - starts clean then injects bad evidence
    """
    if scenario_name == "scenario1_clean":
        return _scenario_clean(session)
    elif scenario_name == "scenario2_medium":
        return _scenario_medium(session)
    elif scenario_name == "scenario3_high":
        return _scenario_high(session)
    elif scenario_name == "scenario4_critical":
        return _scenario_critical(session)
    elif scenario_name == "live_demo":
        return _scenario_live_demo(session)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown scenario '{scenario_name}'. "
                   f"Available: scenario1_clean, scenario2_medium, scenario3_high, scenario4_critical, live_demo"
        )


def _scenario_clean(session: Session) -> dict:
    """Scenario 1: Low Risk PM-JAY Claim."""
    case_data = CaseCreate(
        case_ref="PMJAY-DEMO-001",
        domain="PM-JAY",
        beneficiary_id="BEN-SYN-001",
        beneficiary_name="Rahul Sharma",
        age=46,
        gender="Male",
        state="Madhya Pradesh",
        district="Bhopal",
        hospital_id="HOSP-SYN-101",
        hospital_name="Demo Care Hospital",
        hospital_type="Empaneled Private",
        package_code="PKG-SYN-204",
        package_name="Demo Surgical Package",
        procedure_code="PKG-SYN-204",
        admission_date="2026-08-10",
        discharge_date="2026-08-15",
        claimed_amount=40000.0,
        approved_rate=40000.0,
        eligibility_status="verified",
        identity_status="verified",
        hospital_status="empaneled",
        package_status="approved",
        claim_status="submitted",
    )
    case_read = create_case(case_data, session)
    case_ref = case_read.case_ref

    _add_evidence_and_recalc(case_ref, "normal", "All synthetic eligibility, identity, and clinical documents verified.", session)
    case = get_case_db(case_ref, session)

    return {
        "scenario": "scenario1_clean",
        "description": "Clean Low-Risk PM-JAY Claim. Claimed ₹40,000 matches approved package tariff.",
        "case_ref": case_ref,
        "expected_risk": "15.0 (LOW)",
        "expected_autonomy": "L3 / L4",
        "expected_outcome": "Claim Authorization ALLOWED automatically",
        "current_risk": case.risk_score,
        "current_autonomy": case.autonomy_level,
        "current_status": case.case_status,
        "next_step": f"POST /api/cases/{case_ref}/propose → POST /api/cases/{case_ref}/execute",
    }


def _scenario_medium(session: Session) -> dict:
    """Scenario 2: Moderate Risk PM-JAY Claim."""
    case_data = CaseCreate(
        case_ref="PMJAY-DEMO-002",
        domain="PM-JAY",
        beneficiary_id="BEN-SYN-002",
        beneficiary_name="Priya Patel",
        age=38,
        gender="Female",
        state="Gujarat",
        district="Ahmedabad",
        hospital_id="HOSP-SYN-102",
        hospital_name="City Multi-Specialty Hospital",
        hospital_type="Empaneled Private",
        package_code="PKG-SYN-301",
        package_name="Cardiology Stent Procedure",
        procedure_code="PKG-SYN-301",
        admission_date="2026-08-11",
        discharge_date="2026-08-14",
        claimed_amount=55000.0,
        approved_rate=45000.0,
        eligibility_status="verified",
        identity_status="verified",
        hospital_status="empaneled",
        package_status="approved",
        claim_status="submitted",
    )
    case_read = create_case(case_data, session)
    case_ref = case_read.case_ref

    _add_evidence_and_recalc(case_ref, "rate_mismatch", "Claimed amount ₹55,000 exceeds approved package tariff ₹45,000 by ₹10,000.", session)
    case = get_case_db(case_ref, session)

    return {
        "scenario": "scenario2_medium",
        "description": "Moderate-Risk PM-JAY Claim. Small package tariff overage.",
        "case_ref": case_ref,
        "expected_risk": "35.0 (MODERATE)",
        "expected_autonomy": "L2",
        "expected_outcome": "Claim Authorization PENDING APPROVAL - Human sign-off required",
        "current_risk": case.risk_score,
        "current_autonomy": case.autonomy_level,
        "current_status": case.case_status,
        "next_step": f"POST /api/cases/{case_ref}/propose → POST /api/cases/{case_ref}/execute → POST /api/cases/{case_ref}/approve",
    }


def _scenario_high(session: Session) -> dict:
    """Scenario 3: High Risk PM-JAY Claim."""
    case_data = CaseCreate(
        case_ref="PMJAY-DEMO-003",
        domain="PM-JAY",
        beneficiary_id="BEN-SYN-003",
        beneficiary_name="Amit Kumar",
        age=52,
        gender="Male",
        state="Uttar Pradesh",
        district="Lucknow",
        hospital_id="HOSP-SYN-103",
        hospital_name="Metro Trauma Center",
        hospital_type="Empaneled Private",
        package_code="PKG-SYN-402",
        package_name="Orthopedic Joint Replacement",
        procedure_code="PKG-SYN-402",
        admission_date="2026-08-01",
        discharge_date="2026-08-08",
        claimed_amount=85000.0,
        approved_rate=85000.0,
        eligibility_status="verified",
        identity_status="verified",
        hospital_status="empaneled",
        package_status="approved",
        claim_status="submitted",
    )
    case_read = create_case(case_data, session)
    case_ref = case_read.case_read if hasattr(case_read, "case_read") else case_read.case_ref

    _add_evidence_and_recalc(case_ref, "duplicate_claim", "Duplicate claim record detected: identical procedure billed 12 days ago.", session)
    _add_evidence_and_recalc(case_ref, "treatment_mismatch", "Pre-op diagnostic MRI report mismatch with procedure code.", session)

    case = get_case_db(case_ref, session)
    return {
        "scenario": "scenario3_high",
        "description": "HIGH-RISK PM-JAY Claim: Duplicate claim indicator + treatment evidence mismatch.",
        "case_ref": case_ref,
        "expected_risk": "58.0 (HIGH)",
        "expected_autonomy": "L1",
        "expected_outcome": "Claim Authorization BLOCKED by Tool Gateway — Human decision required",
        "current_risk": case.risk_score,
        "current_autonomy": case.autonomy_level,
        "current_status": case.case_status,
        "next_step": f"POST /api/cases/{case_ref}/propose → POST /api/cases/{case_ref}/execute (gets blocked)",
    }


def _scenario_critical(session: Session) -> dict:
    """Scenario 4: Critical Risk PM-JAY Claim."""
    case_data = CaseCreate(
        case_ref="PMJAY-DEMO-004",
        domain="PM-JAY",
        beneficiary_id="BEN-SYN-004",
        beneficiary_name="Suresh Verma",
        age=61,
        gender="Male",
        state="Bihar",
        district="Patna",
        hospital_id="HOSP-SYN-104",
        hospital_name="Unempaneled Nursing Home",
        hospital_type="Unempaneled Private",
        package_code="PKG-SYN-509",
        package_name="Complex Neurosurgery Package",
        procedure_code="PKG-SYN-509",
        admission_date="2026-08-05",
        discharge_date="2026-08-12",
        claimed_amount=140000.0,
        approved_rate=85000.0,
        eligibility_status="unverified",
        identity_status="mismatch",
        hospital_status="unempaneled",
        package_status="flagged",
        claim_status="flagged",
    )
    case_read = create_case(case_data, session)
    case_ref = case_read.case_ref

    _add_evidence_and_recalc(case_ref, "identity_mismatch", "Aadhaar e-KYC photo mismatch with beneficiary SECC record.", session)
    _add_evidence_and_recalc(case_ref, "duplicate_claim", "Prior settlement found under different hospital ID for same beneficiary.", session)
    _add_evidence_and_recalc(case_ref, "agent_disagreement", "Validation agent vs Audit agent confidence conflict.", session)
    _add_evidence_and_recalc(case_ref, "missing_document", "Original surgical pre-authorization letter missing.", session)

    case = get_case_db(case_ref, session)
    return {
        "scenario": "scenario4_critical",
        "description": "CRITICAL RISK PM-JAY Claim: Identity mismatch + Duplicate claim + Unempaneled hospital + Missing pre-auth.",
        "case_ref": case_ref,
        "expected_risk": "90.0 (CRITICAL)",
        "expected_autonomy": "L0",
        "expected_outcome": "FULLY BLOCKED - Immediate Anti-Fraud Escalation Required",
        "current_risk": case.risk_score,
        "current_autonomy": case.autonomy_level,
        "current_status": case.case_status,
        "next_step": f"POST /api/cases/{case_ref}/propose → POST /api/cases/{case_ref}/execute (gets blocked at L0)",
    }


def _scenario_live_demo(session: Session) -> dict:
    """The Primary NIYANTRA PM-JAY Live Demonstration."""
    case_data = CaseCreate(
        case_ref="PMJAY-DEMO-LIVE",
        domain="PM-JAY",
        beneficiary_id="BEN-SYN-LIVE",
        beneficiary_name="Rahul Sharma",
        age=46,
        gender="Male",
        state="Madhya Pradesh",
        district="Bhopal",
        hospital_id="HOSP-SYN-101",
        hospital_name="Demo Care Hospital",
        hospital_type="Empaneled Private",
        package_code="PKG-SYN-204",
        package_name="Demo Surgical Package",
        procedure_code="PKG-SYN-204",
        admission_date="2026-08-10",
        discharge_date="2026-08-15",
        claimed_amount=40000.0,
        approved_rate=40000.0,
        eligibility_status="verified",
        identity_status="verified",
        hospital_status="empaneled",
        package_status="approved",
        claim_status="submitted",
    )
    case_read = create_case(case_data, session)
    case_ref = case_read.case_ref

    _add_evidence_and_recalc(case_ref, "normal", "Initial check: clean synthetic records.", session)

    case_after_phase1 = get_case_db(case_ref, session)
    phase1_risk = case_after_phase1.risk_score
    phase1_level = case_after_phase1.autonomy_level

    return {
        "demo": "live_demo",
        "description": "PRIMARY NIYANTRA DEMONSTRATION: Dynamic Risk-Adaptive Autonomy Revocation",
        "case_ref": case_ref,
        "phase1": {
            "description": "PM-JAY Case created clean",
            "risk": phase1_risk,
            "autonomy": phase1_level,
            "expected_gateway": "ALLOWED",
        },
        "next_steps": [
            "1. Propose & execute 'authorize_claim' (ALLOWED at L3)",
            "2. Inject Risk Event 'duplicate_claim' (+35 Risk)",
            "3. Recalculate Risk (15 -> 58, Autonomy L3 -> L1)",
            "4. Re-propose & execute 'authorize_claim' (BLOCKED at L1)",
            "5. Human Approval Interface engages",
        ],
    }

