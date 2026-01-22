"""
Property API endpoints.

Provides:
- Property search and retrieval
- Batch ingestion from ArcGIS/INIGO scrapers
- Statistics
- Permit-property linking
"""

import logging
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.schemas.property import (
    BatchPropertyRequest, BatchPropertyResponse,
    PropertyResponse, PropertySummary, PropertySearchResponse,
    PropertyStatsResponse
)
from app.services.property_service import get_property_service

logger = logging.getLogger(__name__)

router = APIRouter()


# ===== SEARCH =====

@router.get("/search", response_model=PropertySearchResponse)
async def search_properties(
    query: Optional[str] = Query(None, min_length=2, max_length=200, description="Search query"),
    state_code: Optional[str] = Query(None, max_length=2, description="State code (e.g., TN)"),
    county_id: Optional[int] = Query(None, description="County ID"),
    city: Optional[str] = Query(None, description="City name"),
    property_type: Optional[str] = Query(None, description="Property type"),
    min_year_built: Optional[int] = Query(None, ge=1700, le=2100),
    max_year_built: Optional[int] = Query(None, ge=1700, le=2100),
    min_bedrooms: Optional[int] = Query(None, ge=0),
    min_sqft: Optional[int] = Query(None, ge=0),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Search properties with filters.

    Supports:
    - Full-text search on address, owner, parcel ID
    - State/county/city filtering
    - Property type filtering
    - Year built range
    - Bedroom/sqft minimums
    - Pagination
    """
    try:
        service = get_property_service(db)
        return service.search(
            query=query,
            state_code=state_code,
            county_id=county_id,
            city=city,
            property_type=property_type,
            min_year_built=min_year_built,
            max_year_built=max_year_built,
            min_bedrooms=min_bedrooms,
            min_sqft=min_sqft,
            page=page,
            page_size=page_size
        )
    except Exception as e:
        logger.error(f"Property search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed"
        )


# ===== SINGLE PROPERTY =====

@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(
    property_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get a single property by ID with full details."""
    try:
        service = get_property_service(db)
        prop = service.get_property(property_id)

        if not prop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Property {property_id} not found"
            )

        return prop

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get property {property_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve property"
        )


@router.get("/{property_id}/permits")
async def get_property_permits(
    property_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get all permits associated with a property."""
    from app.models.septic_permit import SepticPermit, State, County

    try:
        # Verify property exists
        service = get_property_service(db)
        prop = service.get_property(property_id)
        if not prop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Property {property_id} not found"
            )

        # Get permits
        permits = db.query(SepticPermit).filter(
            SepticPermit.property_id == property_id,
            SepticPermit.is_active == True
        ).order_by(SepticPermit.permit_date.desc()).all()

        results = []
        for p in permits:
            state = db.query(State).filter(State.id == p.state_id).first()
            county = db.query(County).filter(County.id == p.county_id).first() if p.county_id else None

            results.append({
                "id": str(p.id),
                "permit_number": p.permit_number,
                "address": p.address,
                "city": p.city,
                "state_code": state.code if state else None,
                "county_name": county.name if county else None,
                "owner_name": p.owner_name,
                "permit_date": p.permit_date.isoformat() if p.permit_date else None,
                "system_type": p.system_type_raw,
                "permit_url": p.permit_url,
                "pdf_url": p.pdf_url
            })

        return {
            "property_id": str(property_id),
            "total": len(results),
            "permits": results
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get permits for property {property_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve permits"
        )


# ===== BATCH INGESTION =====

@router.post("/batch", response_model=BatchPropertyResponse)
async def ingest_batch(
    request: BatchPropertyRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Ingest a batch of properties from scrapers.

    - Normalizes addresses for deduplication
    - Updates existing records if changed
    - Links to permits with matching addresses
    - Returns statistics on processing
    """
    try:
        if len(request.properties) > 5000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Batch size cannot exceed 5,000 records"
            )

        service = get_property_service(db)
        return service.ingest_batch(request.properties, request.source_portal_code)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Property batch ingestion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Batch ingestion failed"
        )


# ===== STATISTICS =====

@router.get("/stats/overview", response_model=PropertyStatsResponse)
async def get_property_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get property statistics dashboard."""
    try:
        service = get_property_service(db)
        return service.get_stats()
    except Exception as e:
        logger.error(f"Failed to get property stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve statistics"
        )


# ===== LINKING =====

@router.post("/{property_id}/link-permits")
async def link_permits_to_property(
    property_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Find and link permits with matching addresses to this property.
    Useful for retroactively linking after property data is enriched.
    """
    from app.models.property import Property
    from app.models.septic_permit import SepticPermit

    try:
        prop = db.query(Property).filter(
            Property.id == property_id,
            Property.is_active == True
        ).first()

        if not prop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Property {property_id} not found"
            )

        if not prop.address_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Property has no address hash for matching"
            )

        # Find unlinked permits with matching address
        permits = db.query(SepticPermit).filter(
            SepticPermit.address_hash == prop.address_hash,
            SepticPermit.county_id == prop.county_id,
            SepticPermit.is_active == True,
            SepticPermit.property_id == None
        ).all()

        linked_count = 0
        for permit in permits:
            permit.property_id = property_id
            linked_count += 1

        db.commit()

        return {
            "property_id": str(property_id),
            "permits_linked": linked_count,
            "message": f"Linked {linked_count} permits to property"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to link permits: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to link permits"
        )


@router.post("/link-all")
async def link_all_permits(
    state_code: str = Query(..., description="State code to process"),
    county_name: Optional[str] = Query(None, description="County name (optional)"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Batch link all unlinked permits to properties by matching addresses.
    Useful after bulk property ingestion.
    """
    from app.models.property import Property
    from app.models.septic_permit import SepticPermit, State, County

    try:
        # Get state
        state = db.query(State).filter(State.code == state_code.upper()).first()
        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"State {state_code} not found"
            )

        # Get county if specified
        county_id = None
        if county_name:
            county = db.query(County).filter(
                County.state_id == state.id,
                County.name.ilike(f"%{county_name}%")
            ).first()
            if county:
                county_id = county.id

        # Get all properties with address hashes
        prop_query = db.query(Property).filter(
            Property.state_id == state.id,
            Property.address_hash != None,
            Property.is_active == True
        )
        if county_id:
            prop_query = prop_query.filter(Property.county_id == county_id)

        properties = prop_query.all()
        logger.info(f"Found {len(properties)} properties to match")

        # Build address hash lookup
        hash_to_property = {p.address_hash: p.id for p in properties}

        # Find unlinked permits
        permit_query = db.query(SepticPermit).filter(
            SepticPermit.state_id == state.id,
            SepticPermit.address_hash != None,
            SepticPermit.property_id == None,
            SepticPermit.is_active == True
        )
        if county_id:
            permit_query = permit_query.filter(SepticPermit.county_id == county_id)

        permits = permit_query.all()
        logger.info(f"Found {len(permits)} unlinked permits")

        # Link by hash
        linked_count = 0
        for permit in permits:
            if permit.address_hash in hash_to_property:
                permit.property_id = hash_to_property[permit.address_hash]
                linked_count += 1

        db.commit()

        return {
            "state_code": state_code,
            "county_name": county_name,
            "properties_checked": len(properties),
            "permits_checked": len(permits),
            "permits_linked": linked_count
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch linking failed: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Batch linking failed"
        )


@router.post("/relink-enhanced")
async def relink_permits_enhanced(
    state_code: str = Query(..., description="State code to process"),
    county_name: Optional[str] = Query(None, description="County name (optional)"),
    dry_run: bool = Query(True, description="If true, only report what would be linked"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Re-link permits using enhanced address normalization.

    This handles permit addresses that include city/state/zip info that
    prevents matching with the standard normalization:
    - "1000 Mabel DR, Franklin, TN, 37064" -> matches "1000 MABEL DR"
    - "9001 Haggard Ln, College Grove, TN 37046" -> matches "9001 HAGGARD LN"

    Use dry_run=true first to see what would be linked without making changes.
    """
    from app.models.property import Property
    from app.models.septic_permit import SepticPermit, State, County
    from app.services.property_service import PropertyService

    try:
        # Get state
        state = db.query(State).filter(State.code == state_code.upper()).first()
        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"State {state_code} not found"
            )

        # Get county if specified
        county_id = None
        if county_name:
            county = db.query(County).filter(
                County.state_id == state.id,
                County.name.ilike(f"%{county_name}%")
            ).first()
            if county:
                county_id = county.id

        # Get county for hash computation
        county_obj = db.query(County).filter(County.id == county_id).first() if county_id else None
        county_name_for_hash = county_obj.name if county_obj else ""

        # Build property address lookup (enhanced normalized -> property_id)
        prop_query = db.query(Property).filter(
            Property.state_id == state.id,
            Property.address_normalized != None,
            Property.is_active == True
        )
        if county_id:
            prop_query = prop_query.filter(Property.county_id == county_id)

        properties = prop_query.all()
        logger.info(f"Found {len(properties)} properties to index")

        # Build lookup with BOTH standard and enhanced normalized addresses
        address_to_property = {}
        for p in properties:
            # Standard normalized (already in DB)
            if p.address_normalized:
                address_to_property[p.address_normalized] = p.id

        logger.info(f"Built lookup with {len(address_to_property)} address entries")

        # Find unlinked permits
        permit_query = db.query(SepticPermit).filter(
            SepticPermit.state_id == state.id,
            SepticPermit.property_id == None,
            SepticPermit.is_active == True
        )
        if county_id:
            permit_query = permit_query.filter(SepticPermit.county_id == county_id)

        unlinked_permits = permit_query.all()
        logger.info(f"Found {len(unlinked_permits)} unlinked permits")

        # Try to match using enhanced normalization
        would_link = []
        linked_count = 0

        for permit in unlinked_permits:
            if not permit.address:
                continue

            # Apply enhanced normalization to permit address
            enhanced_addr = PropertyService.normalize_address_enhanced(permit.address)

            if enhanced_addr and enhanced_addr in address_to_property:
                property_id = address_to_property[enhanced_addr]

                would_link.append({
                    "permit_id": str(permit.id),
                    "original_address": permit.address,
                    "normalized_address": enhanced_addr,
                    "property_id": str(property_id)
                })

                if not dry_run:
                    permit.property_id = property_id
                    linked_count += 1

        if not dry_run:
            db.commit()
            logger.info(f"Linked {linked_count} permits with enhanced normalization")

        return {
            "state_code": state_code,
            "county_name": county_name,
            "dry_run": dry_run,
            "properties_indexed": len(properties),
            "unlinked_permits_checked": len(unlinked_permits),
            "would_link": len(would_link),
            "actually_linked": linked_count if not dry_run else 0,
            "sample_matches": would_link[:20] if would_link else []
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enhanced relinking failed: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Enhanced relinking failed: {str(e)}"
        )
