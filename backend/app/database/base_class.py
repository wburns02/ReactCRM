"""
Database configuration and base models for the CRM application.
"""

from typing import Any
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import as_declarative, declared_attr
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_database_url

# ===== DATABASE ENGINE SETUP =====
DATABASE_URL = get_database_url()

# Configure SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    poolclass=StaticPool,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=False  # Set to True for SQL query logging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Metadata for migrations
metadata = MetaData()


# ===== BASE MODEL CLASS =====
@as_declarative(metadata=metadata)
class Base:
    """Base class for all database models."""

    id: Any
    __name__: str

    # Generate __tablename__ automatically
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower()


# ===== DATABASE DEPENDENCY =====
def get_db():
    """
    Dependency function to get database session.
    Used with FastAPI's Depends() for dependency injection.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===== DATABASE UTILITIES =====
def create_all_tables():
    """Create all database tables."""
    Base.metadata.create_all(bind=engine)


def drop_all_tables():
    """Drop all database tables. USE WITH CAUTION!"""
    Base.metadata.drop_all(bind=engine)


def get_engine():
    """Get the SQLAlchemy engine instance."""
    return engine


def get_session_local():
    """Get the session factory."""
    return SessionLocal


# ===== CONNECTION TESTING =====
def test_database_connection() -> bool:
    """Test if database connection is working."""
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
            return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False


# ===== DATABASE HEALTH CHECK =====
def get_database_info():
    """Get database connection information for health checks."""
    try:
        with engine.connect() as conn:
            result = conn.execute("SELECT version()")
            db_version = result.fetchone()[0] if result else "Unknown"

            return {
                "status": "connected",
                "url": DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else DATABASE_URL,
                "version": db_version,
                "pool_size": engine.pool.size(),
                "checked_in": engine.pool.checkedin(),
                "checked_out": engine.pool.checkedout()
            }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }