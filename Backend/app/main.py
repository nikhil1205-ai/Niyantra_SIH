from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.api.cases import router as cases_router
from app.api.actions import router as actions_router
from app.api.officer_review import router as officer_review_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables on startup
    init_db()
    yield

app = FastAPI(
    title="NIYANTRA API Core",
    description="Dynamic Risk-Adaptive AI Governance Platform Backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for local frontend applications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases_router)
app.include_router(actions_router)
app.include_router(officer_review_router)

@app.get("/")
def root_health_check():
    return {
        "status": "online",
        "service": "NIYANTRA Backend Engine",
        "version": "1.0.0",
        "module": "Modules 1-6 — Intake, AI Review, Risk, Autonomy, Tool Gateway & Officer Review"
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
