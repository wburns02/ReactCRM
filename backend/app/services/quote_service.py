"""
Quote service layer for business logic.
"""
import logging
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.quote import Quote
from app.schemas.quote import QuoteCreate, QuoteUpdate

logger = logging.getLogger(__name__)


class QuoteService:
    """Service class for quote operations."""

    def __init__(self, db: Session):
        self.db = db

    def _generate_quote_number(self) -> str:
        """Generate a unique quote number like Q-2026-0001."""
        year = datetime.now().year

        # Get the highest quote number for this year
        result = self.db.query(func.max(Quote.quote_number)).filter(
            Quote.quote_number.like(f"Q-{year}-%")
        ).scalar()

        if result:
            # Extract the sequence number and increment
            try:
                seq = int(result.split("-")[-1])
                next_seq = seq + 1
            except (ValueError, IndexError):
                next_seq = 1
        else:
            next_seq = 1

        return f"Q-{year}-{next_seq:04d}"

    def _calculate_totals(self, line_items: list, tax_rate: float) -> Tuple[float, float, float]:
        """Calculate subtotal, tax, and total from line items."""
        subtotal = sum(
            item.get("quantity", 0) * item.get("rate", 0)
            for item in line_items
        )
        tax = subtotal * (tax_rate / 100)
        total = subtotal + tax
        return round(subtotal, 2), round(tax, 2), round(total, 2)

    def _process_line_items(self, line_items: list) -> list:
        """Process line items and add calculated amounts."""
        processed = []
        for item in line_items:
            processed_item = {
                "service": item.service if hasattr(item, 'service') else item.get("service"),
                "description": item.description if hasattr(item, 'description') else item.get("description"),
                "quantity": item.quantity if hasattr(item, 'quantity') else item.get("quantity"),
                "rate": item.rate if hasattr(item, 'rate') else item.get("rate"),
            }
            processed_item["amount"] = round(
                processed_item["quantity"] * processed_item["rate"], 2
            )
            processed.append(processed_item)
        return processed

    def create(self, data: QuoteCreate) -> Quote:
        """Create a new quote."""
        # Process line items
        line_items = self._process_line_items(data.line_items)

        # Calculate totals
        subtotal, tax, total = self._calculate_totals(line_items, data.tax_rate)

        # Generate unique quote number
        quote_number = self._generate_quote_number()

        # Parse valid_until - handle both YYYY-MM-DD and YYYY-MM-DDTHH:MM:SS formats
        valid_until_date = None
        if data.valid_until:
            date_str = data.valid_until.split('T')[0]  # Extract date part only
            valid_until_date = date.fromisoformat(date_str)

        quote = Quote(
            quote_number=quote_number,
            customer_id=data.customer_id,
            status=data.status or "draft",
            line_items=line_items,
            subtotal=subtotal,
            tax_rate=data.tax_rate,
            tax=tax,
            total=total,
            valid_until=valid_until_date,
            notes=data.notes,
            terms=data.terms
        )

        self.db.add(quote)
        self.db.commit()
        self.db.refresh(quote)

        logger.info(f"Created quote {quote.quote_number} for customer {data.customer_id}")
        return quote

    def get_by_id(self, quote_id: UUID) -> Optional[Quote]:
        """Get quote by ID."""
        return self.db.query(Quote).filter(Quote.id == quote_id).first()

    def list(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        customer_id: Optional[int] = None
    ) -> Tuple[List[Quote], int]:
        """List quotes with filtering and pagination."""
        query = self.db.query(Quote)

        # Apply filters
        if status:
            # Support comma-separated status values
            statuses = [s.strip() for s in status.split(",")]
            query = query.filter(Quote.status.in_(statuses))

        if customer_id:
            query = query.filter(Quote.customer_id == customer_id)

        # Get total count
        total = query.count()

        # Apply pagination
        offset = (page - 1) * page_size
        quotes = query.order_by(Quote.created_at.desc()).offset(offset).limit(page_size).all()

        return quotes, total

    def update(self, quote_id: UUID, data: QuoteUpdate) -> Optional[Quote]:
        """Update a quote with partial data."""
        quote = self.get_by_id(quote_id)
        if not quote:
            return None

        update_data = data.model_dump(exclude_unset=True)

        # If line items are being updated, recalculate totals
        if "line_items" in update_data and update_data["line_items"]:
            line_items = self._process_line_items(update_data["line_items"])
            update_data["line_items"] = line_items

            tax_rate = update_data.get("tax_rate", quote.tax_rate)
            subtotal, tax, total = self._calculate_totals(line_items, tax_rate)
            update_data["subtotal"] = subtotal
            update_data["tax"] = tax
            update_data["total"] = total
        elif "tax_rate" in update_data:
            # Tax rate changed but not line items - recalculate
            subtotal, tax, total = self._calculate_totals(quote.line_items, update_data["tax_rate"])
            update_data["subtotal"] = subtotal
            update_data["tax"] = tax
            update_data["total"] = total

        # Handle date conversion - handle both YYYY-MM-DD and YYYY-MM-DDTHH:MM:SS formats
        if "valid_until" in update_data:
            val = update_data["valid_until"]
            if val:
                date_str = val.split('T')[0]  # Extract date part only
                update_data["valid_until"] = date.fromisoformat(date_str)
            else:
                update_data["valid_until"] = None

        for field, value in update_data.items():
            setattr(quote, field, value)

        self.db.commit()
        self.db.refresh(quote)

        logger.info(f"Updated quote {quote_id}")
        return quote

    def delete(self, quote_id: UUID) -> bool:
        """Delete a quote."""
        quote = self.get_by_id(quote_id)
        if not quote:
            return False

        self.db.delete(quote)
        self.db.commit()

        logger.info(f"Deleted quote {quote_id}")
        return True

    def send(self, quote_id: UUID) -> Optional[Quote]:
        """Mark quote as sent."""
        quote = self.get_by_id(quote_id)
        if not quote:
            return None

        quote.status = "sent"
        self.db.commit()
        self.db.refresh(quote)

        logger.info(f"Sent quote {quote_id}")
        return quote

    def convert_to_invoice(self, quote_id: UUID) -> Optional[str]:
        """
        Convert quote to invoice.
        Returns the new invoice ID.
        Note: Invoice creation requires invoice model - for now returns placeholder.
        """
        quote = self.get_by_id(quote_id)
        if not quote:
            return None

        # Mark quote as accepted
        quote.status = "accepted"
        self.db.commit()

        # TODO: Create actual invoice when invoice model is implemented
        # For now, return a placeholder invoice ID
        import uuid
        invoice_id = str(uuid.uuid4())

        logger.info(f"Converted quote {quote_id} to invoice {invoice_id}")
        return invoice_id


def get_quote_service(db: Session) -> QuoteService:
    """Factory function for dependency injection."""
    return QuoteService(db)
