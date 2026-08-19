"""
main.py - NIYANTRA FastAPI Application Entry Point.

Run with:
    uvicorn app.main:app --reload

No authentication, no Docker, no external services required.
SQLite database is created automatically.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import all models BEFORE create_db_and_tables so they register with SQLModel metadata
import app.models  # noqa: F401

from app.database import create_db_and_tables
from app.api import cases, evidence, proposals, approvals, lineage, demo

# ─── Application ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="NIYANTRA - AI Governance System for CGHS",
    description=(
        "NIYANTRA demonstrates risk-based autonomy control for AI agents "
        "in government health claim processing. "
        "AI agents can propose but never execute. "
        "The Tool Gateway enforces governance on every action."
    ),
    version="1.0.0-prototype",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS - Allow the React frontend to call this API ────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Prototype only - lock down in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    """Create SQLite tables on startup. No migrations needed."""
    create_db_and_tables()
    print("✓ NIYANTRA backend started")
    print("✓ SQLite database initialized")
    print("✓ API docs: http://127.0.0.1:8000/docs")

# ─── Routes ───────────────────────────────────────────────────────────────────
app.include_router(cases.router)
app.include_router(evidence.router)
app.include_router(proposals.router)
app.include_router(approvals.router)
app.include_router(lineage.router)
app.include_router(demo.router)


@app.get("/", tags=["Health"])
def root():
    """Health check endpoint."""
    return {
        "system": "NIYANTRA",
        "status": "running",
        "version": "1.0.0-prototype",
        "docs": "/docs",
        "governance_principle": (
            "AI agents propose. Tool Gateway authorizes. "
            "Risk drives autonomy. Lineage records everything."
        ),
    }


@app.get("/api/health", tags=["Health"])
def health():
    """Detailed health check."""
    return {
        "status": "healthy",
        "components": {
            "database": "SQLite - connected",
            "risk_engine": "deterministic - ready",
            "autonomy_controller": "ready",
            "policy_engine": "CGHS-POLICY-V1 loaded",
            "tool_gateway": "ready",
            "simulated_cghs": "ready",
        },
    }
