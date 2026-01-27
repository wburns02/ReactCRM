"""
Estimates API endpoints - alias to quotes endpoints.
Provides /estimates routes that map to the same quote data.
"""
import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query

from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_active_user, User
from app.schemas.quote import (
    QuoteCreate, QuoteUpdate, QuoteResponse, QuoteListResponse,
    QuoteSendResponse, QuoteConvertResponse, LineItemResponse
)
from app.services.quote_service import get_quote_service

logger = logging.getLogger(__name__)
router = APIRouter()


def _to_response(quote) -> QuoteResponse:
    """Convert Quote model to response schema."""
    line_items = []
    for item in (quote.line_items or []):
        line_items.append(LineItemResponse(
            service=item.get("service", ""),
            description=item.get("description"),
            quantity=item.get("quantity", 0),
            rate=item.get("rate", 0),
            amount=item.get("amount", 0)
        ))

    return QuoteResponse(
        id=str(quote.id),
        quote_number=quote.quote_number,
        customer_id=str(quote.customer_id),
        customer_name=None,
        customer=None,
        status=quote.status,
        line_items=line_items,
        subtotal=quote.subtotal,
        tax_rate=quote.tax_rate,
        tax=quote.tax,
        total=quote.total,
        valid_until=quote.valid_until.isoformat() if quote.valid_until else None,
        notes=quote.notes,
        terms=quote.terms,
        created_at=quote.created_at.isoformat() if quote.created_at else None,
        updated_at=quote.updated_at.isoformat() if quote.updated_at else None
    )


@router.get("", response_model=QuoteListResponse)
async def list_estimates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    status: Optional[str] = Query(None, description="Filter by status"),
    customer_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List estimates (alias for quotes)."""
    try:
        service = get_quote_service(db)
        quotes, total = service.list(
            page=page,
            page_size=page_size,
            status=status,
            customer_id=customer_id
        )

        return QuoteListResponse(
            items=[_to_response(q) for q in quotes],
            total=total,
            page=page,
            page_size=page_size
        )
    except Exception as e:
        logger.error(f"Failed to list estimates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list estimates"
        )


@router.get("/{estimate_id}", response_model=QuoteResponse)
async def get_estimate(
    estimate_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a single estimate by ID."""
    service = get_quote_service(db)
    quote = service.get_by_id(estimate_id)

    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Estimate {estimate_id} not found"
        )

    return _to_response(quote)


@router.post("/{estimate_id}/send", response_model=QuoteSendResponse)
async def send_estimate(
    estimate_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send an estimate to the customer."""
    service = get_quote_service(db)
    quote = service.send(estimate_id)

    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Estimate {estimate_id} not found"
        )

    return QuoteSendResponse(
        success=True,
        message=f"Estimate {quote.quote_number} has been sent",
        quote=_to_response(quote)
    )


@router.post("/{estimate_id}/convert-to-invoice", response_model=QuoteConvertResponse)
async def convert_estimate_to_invoice(
    estimate_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Convert an estimate to an invoice."""
    service = get_quote_service(db)
    invoice_id = service.convert_to_invoice(estimate_id)

    if not invoice_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Estimate {estimate_id} not found"
        )

    return QuoteConvertResponse(
        success=True,
        invoice_id=invoice_id,
        message=f"Estimate converted to invoice {invoice_id}"
    )
