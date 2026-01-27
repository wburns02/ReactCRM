"""
SQLAlchemy model for Quotes/Estimates.
"""
import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, DateTime, Date, Float, Integer, String, Text, JSON, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base_class import Base


class Quote(Base):
    """Quote/Estimate model for customer pricing proposals."""
    __tablename__ = "quotes"

    # Primary key - UUID for frontend compatibility
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Auto-generated quote number (e.g., "Q-2026-0001")
    quote_number = Column(String(50), unique=True, nullable=False, index=True)

    # Customer relationship (integer ID from legacy system)
    customer_id = Column(Integer, nullable=False, index=True)

    # Status: draft, sent, accepted, declined, expired
    status = Column(String(20), nullable=False, default="draft", index=True)

    # Line items stored as JSON array
    # Each item: { service, description, quantity, rate, amount }
    line_items = Column(JSON, nullable=False, default=list)

    # Pricing
    subtotal = Column(Float, nullable=False, default=0.0)
    tax_rate = Column(Float, nullable=False, default=0.0)  # Percentage (e.g., 8.25)
    tax = Column(Float, nullable=False, default=0.0)
    total = Column(Float, nullable=False, default=0.0)

    # Validity
    valid_until = Column(Date, nullable=True)

    # Additional fields
    notes = Column(Text, nullable=True)
    terms = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Indexes for common queries
    __table_args__ = (
        Index('idx_quotes_customer_status', 'customer_id', 'status'),
        Index('idx_quotes_created_at', 'created_at'),
    )

    def __repr__(self):
        return f"<Quote(id={self.id}, quote_number={self.quote_number}, status={self.status})>"
