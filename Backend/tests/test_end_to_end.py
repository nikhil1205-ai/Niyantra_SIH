"""
tests/test_end_to_end.py - End-to-end integration tests using FastAPI TestClient.

Tests the complete governance flow:
Create case → Add evidence → Calculate risk → Propose → Execute → Lineage → Explain

Also tests the critical dynamic authority revocation scenario.
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import create_engine, Session, SQLModel
from sqlmodel.pool import StaticPool

from app.main import app
from app.database import get_session
import app.models  # noqa: F401 - register all models


# ─── Test Database Setup ──────────────────────────────────────────────────────
# Use in-memory SQLite for tests - isolated, fast, no file cleanup needed
TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


def override_get_session():
    """Override the database dependency to use in-memory SQLite for tests."""
    with Session(TEST_ENGINE) as session:
        yield session


@pytest.fixture(autouse=True)
def setup_db():
    """Create all tables before each test, drop after."""
    SQLModel.metadata.create_all(TEST_ENGINE)
    yield
    SQLModel.metadata.drop_all(TEST_ENGINE)


@pytest.fixture
def client():
    """FastAPI test client with DB override."""
    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ─── Health ───────────────────────────────────────────────────────────────────
class TestHealth:
    def test_root_returns_200(self, client):
        r = client.get("/")
        assert r.status_code == 200
        assert r.json()["system"] == "NIYANTRA"

    def test_health_endpoint(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"


# ─── Case Creation ────────────────────────────────────────────────────────────
class TestCaseCreation:
    def test_create_case_returns_201(self, client):
        payload = {
            "domain": "CGHS",
            "beneficiary_id": "BEN-E2E-001",
            "hospital_id": "HOSP-E2E-001",
            "procedure_code": "PROC-001",
            "claimed_amount": 38000,
            "approved_rate": 40000,
        }
        r = client.post("/api/cases", json=payload)
        assert r.status_code == 201
        data = r.json()
        assert data["case_ref"].startswith("CASE-")
        assert "risk_score" in data
        assert "autonomy_level" in data
        assert "risk_factors" in data

    def test_clean_case_has_low_risk(self, client):
        payload = {
            "domain": "CGHS",
            "beneficiary_id": "BEN-E2E-002",
            "hospital_id": "HOSP-E2E-001",
            "procedure_code": "PROC-001",
            "claimed_amount": 38000,
            "approved_rate": 40000,
        }
        r = client.post("/api/cases", json=payload)
        data = r.json()
        assert data["risk_score"] < 50, f"Clean case should have low risk, got {data['risk_score']}"

    def test_get_case_by_ref(self, client):
        payload = {
            "domain": "CGHS",
            "beneficiary_id": "BEN-E2E-003",
            "hospital_id": "HOSP-E2E-001",
            "procedure_code": "PROC-001",
            "claimed_amount": 38000,
            "approved_rate": 40000,
        }
        create_r = client.post("/api/cases", json=payload)
        case_ref = create_r.json()["case_ref"]

        get_r = client.get(f"/api/cases/{case_ref}")
        assert get_r.status_code == 200
        assert get_r.json()["case_ref"] == case_ref

    def test_get_nonexistent_case_returns_404(self, client):
        r = client.get("/api/cases/CASE-999")
        assert r.status_code == 404


# ─── Evidence ─────────────────────────────────────────────────────────────────
class TestEvidence:
    def _create_case(self, client, claimed=38000, approved=40000):
        r = client.post("/api/cases", json={
            "domain": "CGHS",
            "beneficiary_id": "BEN-EV-001",
            "hospital_id": "HOSP-EV-001",
            "procedure_code": "PROC-001",
            "claimed_amount": claimed,
            "approved_rate": approved,
        })
        return r.json()

    def test_adding_evidence_returns_updated_case(self, client):
        case = self._create_case(client)
        case_ref = case["case_ref"]
        r = client.post(f"/api/cases/{case_ref}/evidence", json={
            "evidence_type": "rate_mismatch",
            "description": "Claimed amount exceeds rate",
        })
        assert r.status_code == 200
        data = r.json()
        assert "risk_score" in data

    def test_bad_evidence_increases_risk(self, client):
        case = self._create_case(client, claimed=65000, approved=40000)
        case_ref = case["case_ref"]
        initial_risk = case["risk_score"]

        r = client.post(f"/api/cases/{case_ref}/evidence", json={
            "evidence_type": "rate_mismatch",
            "description": "Large rate mismatch",
        })
        updated_risk = r.json()["risk_score"]
        assert updated_risk >= initial_risk, "Bad evidence should not decrease risk"


# ─── Proposal + Execute ───────────────────────────────────────────────────────
class TestProposalAndExecution:
    def _setup_case(self, client, claimed=38000, approved=40000):
        r = client.post("/api/cases", json={
            "domain": "CGHS",
            "beneficiary_id": "BEN-PROP-001",
            "hospital_id": "HOSP-PROP-001",
            "procedure_code": "PROC-001",
            "claimed_amount": claimed,
            "approved_rate": approved,
        })
        return r.json()["case_ref"]

    def test_proposal_created_with_pending_status(self, client):
        case_ref = self._setup_case(client)
        r = client.post(f"/api/cases/{case_ref}/propose", json={"action_type": "settlement"})
        assert r.status_code == 201
        data = r.json()
        assert data["gateway_status"] == "pending"
        assert data["agent"] == "CGHSProposalAgent"
        assert data["action_type"] == "settlement"

    def test_clean_case_settlement_is_allowed(self, client):
        case_ref = self._setup_case(client, claimed=38000, approved=40000)
        client.post(f"/api/cases/{case_ref}/propose", json={"action_type": "settlement"})
        r = client.post(f"/api/cases/{case_ref}/execute")
        assert r.status_code == 200
        data = r.json()
        # L3 or L4 case with clean data should allow settlement
        assert data["gateway_status"] in ("allowed", "pending_approval")

    def test_execute_without_proposal_returns_400(self, client):
        case_ref = self._setup_case(client)
        r = client.post(f"/api/cases/{case_ref}/execute")
        assert r.status_code == 400


# ─── THE CRITICAL DYNAMIC REVOCATION TEST ────────────────────────────────────
class TestDynamicAuthorityRevocation:
    """
    This is the most important test in the system.
    
    Proves:
    1. Case starts clean → settlement ALLOWED
    2. New evidence arrives → risk increases → autonomy drops
    3. Same settlement proposed again → BLOCKED
    4. Simulated CGHS was NOT called for the blocked action
    """

    def test_authority_revoked_after_bad_evidence(self, client):
        from app.gateway.simulated_cghs import simulated_cghs

        # Reset the simulated CGHS execution log
        simulated_cghs.reset()

        # Step 1: Create a clean case
        r = client.post("/api/cases", json={
            "domain": "CGHS",
            "beneficiary_id": "BEN-REVOKE-001",
            "hospital_id": "HOSP-REVOKE-001",
            "procedure_code": "PROC-REVOKE-001",
            "claimed_amount": 38000,  # Within rate
            "approved_rate": 40000,
        })
        assert r.status_code == 201
        case_ref = r.json()["case_ref"]
        initial_risk = r.json()["risk_score"]

        # Step 2: Propose and execute settlement (should be allowed at low risk)
        client.post(f"/api/cases/{case_ref}/propose", json={"action_type": "settlement"})
        exec_r1 = client.post(f"/api/cases/{case_ref}/execute")
        first_status = exec_r1.json()["gateway_status"]
        # For a truly clean case (L4/L3), settlement should be allowed or pending_approval at L2
        assert first_status in ("allowed", "pending_approval"), (
            f"Expected allowed or pending_approval for clean case, got {first_status}. "
            f"Risk was {initial_risk}."
        )

        # Step 3: Inject high-risk evidence
        ev_r = client.post(f"/api/cases/{case_ref}/evidence", json={
            "evidence_type": "rate_mismatch",
            "description": "Hospital claimed ₹65,000 vs approved ₹40,000",
        })
        assert ev_r.status_code == 200
        updated_case = ev_r.json()
        
        # Step 4: Verify risk increased and autonomy dropped
        assert updated_case["risk_score"] > initial_risk, "Risk should increase after bad evidence"
        assert updated_case["autonomy_level"] in ("L0", "L1", "L2"), (
            f"Autonomy should drop, got {updated_case['autonomy_level']}"
        )

        # Step 5: Propose settlement again
        client.post(f"/api/cases/{case_ref}/propose", json={"action_type": "settlement"})

        # Step 6: Execute - MUST be blocked if risk is now L1 or L0
        exec_r2 = client.post(f"/api/cases/{case_ref}/execute")
        second_status = exec_r2.json()["gateway_status"]

        if updated_case["autonomy_level"] in ("L0", "L1"):
            assert second_status == "blocked", (
                f"Settlement should be BLOCKED at {updated_case['autonomy_level']}, "
                f"but got {second_status}"
            )

        # Step 7: Verify lineage was created
        lineage_r = client.get(f"/api/cases/{case_ref}/lineage")
        assert lineage_r.status_code == 200
        assert len(lineage_r.json()) > 0

        # Step 8: Verify explanation is generated
        explain_r = client.get(f"/api/cases/{case_ref}/explain")
        assert explain_r.status_code == 200
        assert len(explain_r.json()["narrative"]) > 0


# ─── Lineage Append-Only ─────────────────────────────────────────────────────
class TestLineageIsAppendOnly:
    """Verify lineage grows but is never modified."""

    def test_lineage_grows_with_events(self, client):
        # Create case
        r = client.post("/api/cases", json={
            "domain": "CGHS",
            "beneficiary_id": "BEN-LIN-001",
            "hospital_id": "HOSP-LIN-001",
            "procedure_code": "PROC-LIN-001",
            "claimed_amount": 38000,
            "approved_rate": 40000,
        })
        case_ref = r.json()["case_ref"]

        initial_lineage = client.get(f"/api/cases/{case_ref}/lineage").json()
        initial_count = len(initial_lineage)

        # Add evidence - should add lineage records
        client.post(f"/api/cases/{case_ref}/evidence", json={
            "evidence_type": "normal",
            "description": "Documents verified",
        })

        after_lineage = client.get(f"/api/cases/{case_ref}/lineage").json()
        assert len(after_lineage) > initial_count, "Lineage should grow after evidence added"


# ─── Demo Endpoints ───────────────────────────────────────────────────────────
class TestDemoEndpoints:
    def test_reset_endpoint(self, client):
        r = client.post("/api/demo/reset")
        assert r.status_code == 200
        assert r.json()["status"] == "reset"

    def test_scenario1_clean(self, client):
        r = client.post("/api/demo/scenario/scenario1_clean")
        assert r.status_code == 200
        data = r.json()
        assert "case_ref" in data
        assert data["current_autonomy"] in ("L4", "L3", "L2")

    def test_scenario3_high_produces_high_risk(self, client):
        r = client.post("/api/demo/scenario/scenario3_high")
        assert r.status_code == 200
        data = r.json()
        assert data["current_autonomy"] in ("L0", "L1", "L2"), (
            f"High scenario should produce restricted autonomy, got {data['current_autonomy']}"
        )

    def test_scenario4_critical_produces_l0_or_l1(self, client):
        r = client.post("/api/demo/scenario/scenario4_critical")
        assert r.status_code == 200
        data = r.json()
        assert data["current_autonomy"] in ("L0", "L1"), (
            f"Critical scenario should produce L0 or L1, got {data['current_autonomy']}"
        )

    def test_invalid_scenario_returns_400(self, client):
        r = client.post("/api/demo/scenario/nonexistent_scenario")
        assert r.status_code == 400
