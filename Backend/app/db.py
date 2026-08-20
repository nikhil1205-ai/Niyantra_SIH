from sqlmodel import create_engine, SQLModel, Session
import os
import sqlite3

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./niyantra.db")
DB_PATH = DATABASE_URL.replace("sqlite:///", "")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False
)

def _run_sqlite_migrations():
    """
    Safe column migrations for SQLite.
    SQLModel's create_all only creates missing tables, not missing columns.
    This function adds any new columns to existing tables without destroying data.
    """
    if "sqlite" not in DATABASE_URL:
        return  # Only needed for SQLite; Postgres/MySQL support proper migrations

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Fetch existing columns in the 'cases' table
        cursor.execute("PRAGMA table_info(cases)")
        existing_columns = {row[1] for row in cursor.fetchall()}

        # Module 4: action_state column
        if "action_state" not in existing_columns:
            cursor.execute(
                "ALTER TABLE cases ADD COLUMN action_state TEXT NOT NULL DEFAULT 'PROPOSED'"
            )
            print("[DB MIGRATION] Added column: cases.action_state")

        # Module 4: has_evidence_conflict column
        if "has_evidence_conflict" not in existing_columns:
            cursor.execute(
                "ALTER TABLE cases ADD COLUMN has_evidence_conflict INTEGER NOT NULL DEFAULT 0"
            )
            print("[DB MIGRATION] Added column: cases.has_evidence_conflict")

        # ── case_events table migrations ───────────────────────────────────────
        cursor.execute("PRAGMA table_info(case_events)")
        evt_columns = {row[1] for row in cursor.fetchall()}

        if "submitter_type" not in evt_columns:
            cursor.execute(
                "ALTER TABLE case_events ADD COLUMN submitter_type TEXT NOT NULL DEFAULT 'SYSTEM'"
            )
            print("[DB MIGRATION] Added column: case_events.submitter_type")

        if "verification_status" not in evt_columns:
            cursor.execute(
                "ALTER TABLE case_events ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'VERIFIED'"
            )
            print("[DB MIGRATION] Added column: case_events.verification_status")

        if "description" not in evt_columns:
            cursor.execute(
                "ALTER TABLE case_events ADD COLUMN description TEXT NOT NULL DEFAULT ''"
            )
            print("[DB MIGRATION] Added column: case_events.description")

        if "submitted_by" not in evt_columns:
            cursor.execute(
                "ALTER TABLE case_events ADD COLUMN submitted_by TEXT NOT NULL DEFAULT ''"
            )
            print("[DB MIGRATION] Added column: case_events.submitted_by")

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB MIGRATION WARNING] {e}")


def init_db():
    SQLModel.metadata.create_all(engine)
    _run_sqlite_migrations()

def get_session():
    with Session(engine) as session:
        yield session
