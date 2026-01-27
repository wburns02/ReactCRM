"""
Quote/Estimate API endpoints.
Full CRUD for quote management.
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
    # Convert line items to response format
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
        customer_name=None,  # TODO: Join with customers table when available
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


@router.post("", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
async def create_quote(
    data: QuoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new quote/estimate."""
    try:
        service = get_quote_service(db)
        quote = service.create(data)
        logger.info(f"User {current_user.id} created quote {quote.quote_number}")
        return _to_response(quote)
    except ValueError as e:
        logger.error(f"Validation error creating quote: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create quote: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create quote"
        )


@router.get("", response_model=QuoteListResponse)
async def list_quotes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    status: Optional[str] = Query(None, description="Filter by status (comma-separated)"),
    customer_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List quotes with pagination and filtering."""
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
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to list quotes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list quotes"
        )


@router.get("/{quote_id}", response_model=QuoteResponse)
async def get_quote(
    quote_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a single quote by ID."""
    service = get_quote_service(db)
    quote = service.get_by_id(quote_id)

    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quote {quote_id} not found"
        )

    return _to_response(quote)


@router.patch("/{quote_id}", response_model=QuoteResponse)
async def update_quote(
    quote_id: UUID,
    data: QuoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a quote (partial update)."""
    try:
        service = get_quote_service(db)
        quote = service.update(quote_id, data)

        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quote {quote_id} not found"
            )

        logger.info(f"User {current_user.id} updated quote {quote_id}")
        return _to_response(quote)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update quote {quote_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update quote"
        )


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quote(
    quote_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a quote."""
    service = get_quote_service(db)
    deleted = service.delete(quote_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quote {quote_id} not found"
        )

    logger.info(f"User {current_user.id} deleted quote {quote_id}")
    return None


@router.post("/{quote_id}/send", response_model=QuoteSendResponse)
async def send_quote(
    quote_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send a quote to the customer (marks as 'sent')."""
    service = get_quote_service(db)
    quote = service.send(quote_id)

    if not quote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quote {quote_id} not found"
        )

    logger.info(f"User {current_user.id} sent quote {quote_id}")
    return QuoteSendResponse(
        success=True,
        message=f"Quote {quote.quote_number} has been sent",
        quote=_to_response(quote)
    )


@router.post("/{quote_id}/convert-to-invoice", response_model=QuoteConvertResponse)
async def convert_quote_to_invoice(
    quote_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Convert a quote to an invoice."""
    service = get_quote_service(db)
    invoice_id = service.convert_to_invoice(quote_id)

    if not invoice_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quote {quote_id} not found"
        )

    logger.info(f"User {current_user.id} converted quote {quote_id} to invoice {invoice_id}")
    return QuoteConvertResponse(
        success=True,
        invoice_id=invoice_id,
        message=f"Quote converted to invoice {invoice_id}"
    )
