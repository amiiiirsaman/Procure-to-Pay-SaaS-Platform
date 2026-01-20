"""
Database configuration and session management.
Supports PostgreSQL for production and SQLite for development.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

# Base class for all models
Base = declarative_base()

# Create engine based on database URL
if settings.database_url.startswith("sqlite"):
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False},
        echo=False,  # Disable SQL echo for cleaner output
    )
else:
    # PostgreSQL or other databases
    engine = create_engine(
        settings.database_url,
        echo=settings.debug,
        pool_pre_ping=True,
    )

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency for FastAPI to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    from . import models  # noqa: F401 - Import to register models
    Base.metadata.create_all(bind=engine)


def reset_db():
    """Drop and recreate all tables. Use for testing only."""
    from . import models  # noqa: F401
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
