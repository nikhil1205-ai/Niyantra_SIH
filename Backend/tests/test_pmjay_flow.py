"""
tests/test_pmjay_flow.py - Comprehensive PM-JAY governance tests.
"""
import pytest
from sqlmodel import Session, create_engine, SQLModel
from sqlmodel.pool import StaticPool

from app.models.case import Case, CaseCreate
from app.models.evidence import Evidence
from app.models.proposal import Proposal
from app.services.case_service import create_case, get_case_db, recalculate_risk
from app.agents.proposal_agent import pmjay_agent
from app.risk.calculator import calculate_risk
from app.autonomy.controller import determine_autonomy_level, can_execute
from app.gateway.tool_gateway import process_proposal
from app.lineage.store import list_for_case
from app.explainability.narrative import generate_narrative


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_pmjay_case_creation_and_agent_assessment(session: Session):
    """Test 1 & 2: PM-JAY Case creation & 5 AI agent outputs."""
    case_data = CaseCreate(
        case_ref="PMJAY-TEST-001",
        domain="PM-JAY",
        beneficiary_id="BEN-SYN-101",
        beneficiary_name="Test Beneficiary",
        age=45,
        gender="Male",
        state="Madhya Pradesh",
        district="Bhopal",
        hospital_id="HOSP-SYN-201",
        hospital_name="Demo Care Hospital",
        hospital_type="Empaneled Private",
        package_code="PKG-SYN-204",
        package_name="Surgical Procedure",
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
    assert case_read.case_ref == "PMJAY-TEST-001"
    assert case_read.risk_score <= 20.0
    assert case_read.autonomy_level in ("L3", "L4")

    # Verify agent outputs
    case_db = get_case_db("PMJAY-TEST-001", session)
    agent_results = pmjay_agent.run_all_agents(case_db, [])
    assert len(agent_results) == 5
    for res in agent_results:
        assert res.case_id == "PMJAY-TEST-001"
        assert res.status == "verified"
        assert res.confidence >= 0.90


def test_pmjay_risk_event_injection_and_autonomy_downgrade(session: Session):
    """
    Test 3, 4, 5, 6, 7 & 8:
    Dynamic Autonomy Downgrade & Tool Gateway Blocking!
    
    Start: Risk = 15, Autonomy = L3.
    Execute authorize_claim -> Gateway ALLOWS.
    
    Inject: duplicate_claim event (+35 Risk).
    Recalculate: Risk increases from 15 -> 58, Autonomy downgrades L3 -> L1.
    
    Re-execute authorize_claim -> Tool Gateway BLOCKS.
    """
    case_data = CaseCreate(
        case_ref="PMJAY-LIVE-TEST",
        domain="PM-JAY",
        beneficiary_id="BEN-LIVE-001",
        beneficiary_name="Rahul Sharma",
        claimed_amount=40000.0,
        approved_rate=40000.0,
    )
    create_case(case_data, session)
    case = get_case_db("PMJAY-LIVE-TEST", session)

    # Initial state
    assert case.risk_score <= 20.0
    assert case.autonomy_level == "L3"

    # Step A: Gateway allows authorize_claim at L3
    prop1 = Proposal(case_ref="PMJAY-LIVE-TEST", action_type="authorize_claim", confidence=0.95, reasoning="Clean claim")
    session.add(prop1)
    session.commit()

    res1 = process_proposal(prop1, case, session)
    assert res1.status == "allowed"

    # Step B: Inject Duplicate Claim Event (+35 risk)
    ev = Evidence(
        case_ref="PMJAY-LIVE-TEST",
        evidence_type="duplicate_claim",
        description="Duplicate claim record detected: prior settlement 10 days ago.",
        source="audit_agent",
    )
    session.add(ev)
    session.commit()

    recalculate_risk(case, session)
    session.refresh(case)

    # Risk should jump from 15 to > 50, Autonomy downgrades to L1
    assert case.risk_score >= 50.0
    assert case.autonomy_level == "L1"

    # Step C: Re-attempt authorize_claim -> Tool Gateway BLOCKS execution!
    prop2 = Proposal(case_ref="PMJAY-LIVE-TEST", action_type="authorize_claim", confidence=0.60, reasoning="Re-submitting claim")
    session.add(prop2)
    session.commit()

    res2 = process_proposal(prop2, case, session)
    assert res2.status == "blocked"
    assert "does not permit autonomous 'authorize_claim' authorization" in res2.reason


def test_lineage_and_explainability(session: Session):
    """Test 11 & 12: Decision Lineage logging and Narrative Explanation."""
    case_data = CaseCreate(
        case_ref="PMJAY-EXPLAIN-TEST",
        domain="PM-JAY",
        beneficiary_id="BEN-EXP-001",
        claimed_amount=40000.0,
        approved_rate=40000.0,
    )
    create_case(case_data, session)
    case = get_case_db("PMJAY-EXPLAIN-TEST", session)

    ev = Evidence(
        case_ref="PMJAY-EXPLAIN-TEST",
        evidence_type="identity_mismatch",
        description="Biometric e-KYC mismatch at admission.",
        source="identity_agent",
    )
    session.add(ev)
    session.commit()
    recalculate_risk(case, session)

    lineage = list_for_case(session, "PMJAY-EXPLAIN-TEST")
    assert len(lineage) >= 2

    narrative = generate_narrative(lineage)
    assert "PM-JAY" in narrative
    assert "Risk" in narrative
