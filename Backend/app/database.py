"""
database.py - SQLite database setup using SQLModel

Creates all tables automatically on startup.
No migrations needed for the prototype.
"""
from sqlmodel import SQLModel, create_engine, Session

# SQLite file-based database - created automatically on first run
DATABASE_URL = "sqlite:///./niyantra.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Required for SQLite + FastAPI
    echo=False,  # Set to True to see SQL queries in logs
)


def create_db_and_tables() -> None:
    """Create all tables defined via SQLModel on application startup."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """FastAPI dependency that yields a database session."""
    with Session(engine) as session:
        yield session
