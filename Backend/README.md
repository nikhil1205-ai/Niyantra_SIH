# NIYANTRA Backend

**AI Governance System for CGHS Claim Processing**

NIYANTRA demonstrates a core AI safety principle: AI agents can **propose** actions but can **never directly execute** them. Every action goes through a **Tool Gateway** that enforces a risk-based autonomy policy in real time.

---

## 1. What NIYANTRA Does

NIYANTRA processes CGHS (Central Government Health Scheme) medical claims with automated risk assessment and governance:

- An AI agent analyzes a claim and **proposes** an action (e.g. settlement)
- The **Tool Gateway** checks the **current** risk score and autonomy level
- Based on risk, the Gateway **allows** or **blocks** execution
- Every decision is recorded in an **append-only lineage**
- Human-readable **explanations** are generated from the lineage

The key demonstration: *new evidence can arrive that increases risk and automatically revokes the AI's authority — even for actions it could previously perform.*

---

## 2. Architecture

```
React Frontend
      │
      │ REST API
      ▼
FastAPI Backend (monolith)
      │
      ├── Case Service          - Case CRUD + lifecycle
      ├── Evidence Service      - Evidence recording + risk trigger
      ├── Risk Engine           - Deterministic 5-factor scoring
      ├── Policy Engine         - CGHS rule evaluation (JSON rules)
      ├── Autonomy Controller   - Risk → Level mapping (L0-L4)
      ├── AI Proposal Layer     - Deterministic proposal generation
      ├── Tool Gateway          - Authorization + dispatch
      ├── Decision Lineage      - Append-only audit trail
      └── Explainability        - Narrative from lineage
               │
               ▼
             SQLite
```

---

## 3. How Risk Is Calculated

```
Risk = 0.30 × evidence_risk
     + 0.25 × policy_sensitivity
     + 0.20 × action_impact
     + 0.15 × confidence_risk
     + 0.10 × reversibility_risk
```

All scores are 0–100. The final score is clamped to [0, 100].

**Evidence risk**: Increases when anomalies are detected (rate mismatch, missing documents, duplicate claims, beneficiary conflicts).

**Policy sensitivity**: How much the claim violates CGHS policy rules. High overage = high sensitivity.

**Action impact**: How serious is this action? `read_case` = 5, `settlement` = 90.

**Confidence risk**: Low agent confidence = high risk. `confidence = 0.9 → risk = 10`; `confidence = 0.3 → risk = 70`.

**Reversibility risk**: Financial settlements are hard to undo. `settlement` = 90.

---

## 4. Autonomy Levels (L0–L4)

| Level | Meaning | Risk Range | Behavior |
|-------|---------|-----------|----------|
| L4 | Fully Autonomous | Risk < 20 | System executes without oversight |
| L3 | Audited Autonomous | 20 ≤ Risk < 40 | System executes with full audit logging |
| L2 | Human Approval Required | 40 ≤ Risk < 65 | System waits for human sign-off |
| L1 | AI Recommendation Only | 65 ≤ Risk < 85 | System cannot execute; human must act |
| L0 | Blocked | Risk ≥ 85 | System entirely prohibited |

The **Autonomy Controller** is the ONLY component that determines the autonomy level.

---

## 5. Why Agents Cannot Execute

This is enforced by design:

- `ProposalAgent` imports from `app.agents` only — it has no access to `app.gateway`
- The Agent returns a `ProposalOutput` dataclass
- Only the API layer (`/execute` endpoint) passes proposals to the Tool Gateway
- The Gateway is the single authorized executor

The architectural boundary is maintained at import level. The Agent literally cannot call the Gateway.

---

## 6. How the Tool Gateway Works

Before every execution:

1. **Receive** the proposal
2. **Read** the CURRENT case from the database (never cached)
3. **Ask** the Autonomy Controller for the current level (derived from live risk score)
4. **Compare** the proposed action against allowed actions for that level
5. **Execute** OR **Block**
6. **Write** a lineage record

```
Proposal: settlement
Current risk: 72
Current level: L1
Allowed at L1: read_case, verify_beneficiary
Result: BLOCKED
```

---

## 7. How to Run

```bash
# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

That's it. No Docker, no Firebase, no Redis, no authentication required.

---

## 8. API Endpoints

### Cases
```
POST /api/cases                         Create a new case
GET  /api/cases/{case_ref}              Get case with risk + autonomy info
```

### Evidence
```
POST /api/cases/{case_ref}/evidence     Add evidence (triggers risk recalculation)
```

### Governance Flow
```
POST /api/cases/{case_ref}/propose      AI agent proposes an action
POST /api/cases/{case_ref}/execute      Tool Gateway processes the proposal
POST /api/cases/{case_ref}/approve      Human approval (for L2 cases)
```

### Lineage & Explanation
```
GET /api/cases/{case_ref}/lineage       Full audit trail (append-only)
GET /api/cases/{case_ref}/explain       Human-readable narrative explanation
```

### Demo
```
POST /api/demo/reset                    Clear all data
POST /api/demo/scenario/{name}          Run a demo scenario
```

---

## 9. Demo Scenarios

### Scenario 1: Clean
```
POST /api/demo/scenario/scenario1_clean
```
Normal low-risk claim. Claimed within rate. Settlement allowed.

### Scenario 2: Medium
```
POST /api/demo/scenario/scenario2_medium
```
Slight rate overage. Risk ~45, L2. Human approval required.

### Scenario 3: High (Rate Mismatch)
```
POST /api/demo/scenario/scenario3_high
```
Claimed ₹65,000 vs approved ₹40,000. Risk ~65-75, L1. Settlement BLOCKED.

### Scenario 4: Critical
```
POST /api/demo/scenario/scenario4_critical
```
Rate mismatch + missing docs + duplicate + beneficiary conflict. Risk ~85-95, L0. Fully blocked.

### Live Demo (Primary Demonstration)
```
POST /api/demo/scenario/live_demo
```
Starts clean. Follow the step-by-step instructions returned to demonstrate dynamic authority revocation.

---

## 10. The Primary Live Demo

This is the most important demonstration:

```
1. POST /api/demo/reset
2. POST /api/demo/scenario/live_demo         → Returns case_ref and step-by-step guide
3. POST /api/cases/{case_ref}/propose        → body: {"action_type": "settlement"}
4. POST /api/cases/{case_ref}/execute        → ALLOWED (Risk ~15, L4)
5. POST /api/cases/{case_ref}/evidence       → body: {"evidence_type": "rate_mismatch", ...}
6. POST /api/cases/{case_ref}/propose        → body: {"action_type": "settlement"}
7. POST /api/cases/{case_ref}/execute        → BLOCKED (Risk ~70, L1)
8. GET  /api/cases/{case_ref}/lineage        → Full audit trail
9. GET  /api/cases/{case_ref}/explain        → Human-readable explanation
```

---

## 11. Running Tests

```bash
cd Backend
pytest tests/ -v
```

---

## 12. Prototype Limitations

```
Authentication is intentionally disabled.

SQLite is used instead of a production database.

The AI agent is simulated with deterministic Python logic.
No actual LLM is integrated (designed to be replaceable).

The CGHS system is simulated (simulated_cghs.py).
No real government API is called.

Only synthetic data is used.
No real patient, beneficiary, hospital, or government data.

WebSocket/live streaming is not implemented.
The frontend polls REST endpoints.

PM-JAY domain is reserved for a future extension.

This prototype demonstrates the governance architecture,
not production deployment infrastructure.
```

---

## 13. Future Production Improvements

- Replace SQLite with PostgreSQL
- Add JWT authentication and RBAC
- Replace the deterministic ProposalAgent with a real LLM
- Connect to actual CGHS APIs
- Add Redis for caching (but NOT for authorization - Gateway must always re-read)
- Add real-time notifications via WebSockets
- Add Prometheus metrics and Grafana dashboards
- Implement PM-JAY domain extension
- Add proper secret management
- Container deployment with Docker/Kubernetes
