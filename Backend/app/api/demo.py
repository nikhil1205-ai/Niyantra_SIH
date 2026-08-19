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
    """Scenario 1: Clean low-risk claim. Settlement should be allowed."""
    case_data = CaseCreate(
        domain="CGHS",
        beneficiary_id="BEN-SC1-001",
        hospital_id="HOSP-AIIMS-001",
        procedure_code="CGHS-ORTHO-001",
        claimed_amount=38000.0,   # WITHIN the approved rate
        approved_rate=40000.0,
    )
    case_read = create_case(case_data, session)
    case_ref = case_read.case_ref

    # Add clean evidence
    _add_evidence_and_recalc(case_ref, "normal", "All documents verified and present.", session)

    case = get_case_db(case_ref, session)
    return {
        "scenario": "scenario1_clean",
        "description": "Clean low-risk CGHS claim. Claimed ₹38,000 within approved ₹40,000.",
        "case_ref": case_ref,
        "expected_risk": "~15",
        "expected_autonomy": "L4 or L3",
        "expected_outcome": "Settlement ALLOWED",
        "current_risk": case.risk_score,
        "current_autonomy": case.autonomy_level,
        "current_status": case.case_status,
        "next_step": f"POST /api/cases/{case_ref}/propose → POST /api/cases/{case_ref}/execute",
    }


def _scenario_medium(session: Session) -> dict:
    """Scenario 2: Medium risk. Human approval needed."""
    case_data = CaseCreate(
        domain="CGHS",
        beneficiary_id="BEN-SC2-001",
        hospital_id="HOSP-SAFDARJUNG-001",
        procedure_code="CGHS-CARD-002",
        claimed_amount=48000.0,   # Slightly over approved rate
        approved_rate=40000.0,
    )
    case_read = create_case(case_data, session)
    case_ref = case_read.case_ref

    # Add a mild anomaly
    _add_evidence_and_recalc(case_ref, "rate_mismatch",
                             "Claimed ₹48,000 exceeds approved rate ₹40,000 by ₹8,000 (20%).", session)

    case = get_case_db(case_ref, session)
    return {
        "scenario": "scenario2_medium",
        "description": "Medium-risk claim. Small rate overage requires human approval.",
        "case_ref": case_ref,
        "expected_risk": "~40-50",
        "expected_autonomy": "L2",
        "expected_outcome": "Settlement PENDING APPROVAL - human must approve",
        "current_risk": case.risk_score,
        "current_autonomy": case.autonomy_level,
        "current_status": case.case_status,
        "next_step": (
            f"POST /api/cases/{case_ref}/propose → "
            f"POST /api/cases/{case_ref}/execute (gets pending_approval) → "
            f"POST /api/cases/{case_ref}/approve"
        ),
    }


def _scenario_high(session: Session) -> dict:
    """
    Scenario 3: HIGH RISK - CGHS rate mismatch.
    
    This is the most important demo scenario.
    Approved rate ₹40,000 but hospital claimed ₹65,000.
    Risk ~65-75, Autonomy L1, Settlement BLOCKED.
    """
    case_data = CaseCreate(
        domain="CGHS",
        beneficiary_id="BEN-SC3-001",
        hospital_id="HOSP-PRIVATE-003",
        procedure_code="CGHS-NEURO-003",
        claimed_amount=65000.0,   # 62.5% over approved rate!
        approved_rate=40000.0,
    )
    case_read = create_case(case_data, session)
    case_ref = case_read.case_ref

    # Add rate mismatch evidence
    _add_evidence_and_recalc(
        case_ref, "rate_mismatch",
        "Hospital claimed ₹65,000 against CGHS approved rate of ₹40,000 (62.5% excess).",
        session
    )

    case = get_case_db(case_ref, session)
    return {
        "scenario": "scenario3_high",
        "description": "HIGH RISK: Rate mismatch. Claimed ₹65,000 vs approved ₹40,000.",
        "case_ref": case_ref,
        "expected_risk": "~65-75",
        "expected_autonomy": "L1",
        "expected_outcome": "Settlement BLOCKED - AI may recommend only",
        "current_risk": case.risk_score,
        "current_autonomy": case.autonomy_level,
        "current_status": case.case_status,
        "next_step": (
            f"POST /api/cases/{case_ref}/propose → "
            f"POST /api/cases/{case_ref}/execute → Expect 'blocked'"
        ),
    }


def _scenario_critical(session: Session) -> dict:
    """Scenario 4: CRITICAL - Multiple conflicting signals. Fully blocked."""
    case_data = CaseCreate(
        domain="CGHS",
        beneficiary_id="BEN-SC4-001",
        hospital_id="HOSP-UNKNOWN-004",
        procedure_code="CGHS-MULTI-004",
        claimed_amount=90000.0,   # Very high overage
        approved_rate=40000.0,
    )
    case_read = create_case(case_data, session)
    case_ref = case_read.case_ref

    # Add multiple bad evidence signals
    _add_evidence_and_recalc(case_ref, "rate_mismatch",
                             "Claimed ₹90,000 vs approved ₹40,000 (125% excess).", session)
    _add_evidence_and_recalc(case_ref, "missing_document",
                             "Discharge summary and original bills not submitted.", session)
    _add_evidence_and_recalc(case_ref, "duplicate_claim",
                             "Identical claim filed 8 days ago for same beneficiary and procedure.", session)
    _add_evidence_and_recalc(case_ref, "beneficiary_conflict",
                             "Beneficiary name in claim differs from CGHS registration record.", session)

    case = get_case_db(case_ref, session)
    return {
        "scenario": "scenario4_critical",
        "description": "CRITICAL: Rate mismatch + missing docs + duplicate + beneficiary conflict.",
        "case_ref": case_ref,
        "expected_risk": "~85-95",
        "expected_autonomy": "L0",
        "expected_outcome": "FULLY BLOCKED - human-only intervention",
        "current_risk": case.risk_score,
        "current_autonomy": case.autonomy_level,
        "current_status": case.case_status,
        "next_step": (
            f"POST /api/cases/{case_ref}/propose → "
            f"POST /api/cases/{case_ref}/execute → Expect 'blocked' (L0)"
        ),
    }


def _scenario_live_demo(session: Session) -> dict:
    """
    The PRIMARY NIYANTRA live demonstration.
    
    Phase 1: Case starts clean (Risk ~15, L4). Settlement ALLOWED.
    Phase 2: New evidence injected (rate mismatch). Risk jumps to ~70 (L1).
    Phase 3: Same settlement attempted. BLOCKED.
    
    This proves dynamic authority revocation.
    """
    # --- Phase 1: Create a clean case ---
    case_data = CaseCreate(
        domain="CGHS",
        beneficiary_id="BEN-LIVE-001",
        hospital_id="HOSP-DEMO-001",
        procedure_code="CGHS-DEMO-001",
        claimed_amount=38000.0,
        approved_rate=40000.0,
    )
    case_read = create_case(case_data, session)
    case_ref = case_read.case_ref

    _add_evidence_and_recalc(case_ref, "normal", "Initial check: all documents present.", session)

    case_after_phase1 = get_case_db(case_ref, session)
    phase1_risk = case_after_phase1.risk_score
    phase1_level = case_after_phase1.autonomy_level

    return {
        "demo": "live_demo",
        "description": (
            "PRIMARY NIYANTRA DEMONSTRATION: Dynamic Authority Revocation\n"
            "Phase 1 complete: Clean case created. Now add bad evidence to see authority revoke."
        ),
        "case_ref": case_ref,
        "phase1": {
            "description": "Case created with clean evidence",
            "risk": phase1_risk,
            "autonomy": phase1_level,
            "expected_gateway": "ALLOWED",
        },
        "next_steps": [
            {
                "step": "2a",
                "description": "Propose and execute settlement (should be ALLOWED)",
                "endpoint": f"POST /api/cases/{case_ref}/propose body: {{action_type: settlement}}",
            },
            {
                "step": "2b",
                "description": "Execute the proposal",
                "endpoint": f"POST /api/cases/{case_ref}/execute",
            },
            {
                "step": "3",
                "description": "Inject bad evidence (rate mismatch)",
                "endpoint": f"POST /api/cases/{case_ref}/evidence",
                "body": {
                    "evidence_type": "rate_mismatch",
                    "description": "Hospital claimed ₹65,000 vs approved ₹40,000"
                },
            },
            {
                "step": "4a",
                "description": "Create another settlement proposal",
                "endpoint": f"POST /api/cases/{case_ref}/propose body: {{action_type: settlement}}",
            },
            {
                "step": "4b",
                "description": "Execute - this time it should be BLOCKED",
                "endpoint": f"POST /api/cases/{case_ref}/execute",
            },
            {
                "step": "5",
                "description": "View the full decision lineage",
                "endpoint": f"GET /api/cases/{case_ref}/lineage",
            },
            {
                "step": "6",
                "description": "Get the explanation narrative",
                "endpoint": f"GET /api/cases/{case_ref}/explain",
            },
        ],
    }
