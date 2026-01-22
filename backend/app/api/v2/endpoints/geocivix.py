"""
Geocivix Portal API Endpoints.

Provides endpoints for:
- Manual sync trigger
- Permit listing from Geocivix source
- Sync status and statistics
"""

import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_db, get_current_active_user
from app.services.geocivix_service import get_geocivix_service
from app.models.septic_permit import SepticPermit, SourcePortal, State, County

logger = logging.getLogger(__name__)

router = APIRouter()


# ===== SCHEMAS =====

class GeocivixPermitResponse(BaseModel):
    """Response schema for Geocivix permit."""
    issuance_id: str
    permit_number: str
    permit_type: str
    status: str
    issue_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    issued_by: Optional[str] = None
    document_url: Optional[str] = None
    detail_url: str

    class Config:
        from_attributes = True


class GeocivixSyncResponse(BaseModel):
    """Response for sync operation."""
    status: str
    synced_count: int
    inserted: int
    updated: int
    errors: int
    synced_at: str
    portal_url: str


class GeocivixPermitListResponse(BaseModel):
    """Response for permit list."""
    permits: List[GeocivixPermitResponse]
    total: int
    source: str
    synced_at: Optional[str] = None


class GeocivixStatusResponse(BaseModel):
    """Response for sync status."""
    portal_name: str
    portal_url: str
    last_synced: Optional[str] = None
    total_records: int
    is_authenticated: bool


# ===== ENDPOINTS =====

@router.post("/geocivix/sync", response_model=GeocivixSyncResponse)
async def sync_geocivix_permits(
    full_sync: bool = Query(False, description="Perform full sync (not incremental)"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Trigger manual sync of Geocivix permits.

    Fetches all permits from Williamson County, TN Geocivix portal
    and upserts them into the database.
    """
    service = get_geocivix_service()
    inserted = 0
    updated = 0
    errors = 0

    try:
        # Login to portal
        if not await service.login():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Geocivix authentication failed"
            )

        # Fetch permits
        permits = await service.get_permit_list()
        logger.info(f"Geocivix sync: fetched {len(permits)} permits")

        # Ensure source portal exists
        portal = db.query(SourcePortal).filter(
            SourcePortal.code == 'geocivix_williamson_tn'
        ).first()

        if not portal:
            # Create source portal record
            portal = SourcePortal(
                code='geocivix_williamson_tn',
                name='Williamson County TN Geocivix',
                platform='geocivix',
                base_url='https://williamson.geocivix.com/secure/',
                is_active=True
            )
            db.add(portal)
            db.commit()
            db.refresh(portal)

        # Get TN state
        tn_state = db.query(State).filter(State.code == 'TN').first()
        if not tn_state:
            # Create TN state if needed
            tn_state = State(
                code='TN',
                name='Tennessee',
                region='South',
                is_active=True
            )
            db.add(tn_state)
            db.commit()
            db.refresh(tn_state)

        # Get Williamson County
        williamson_county = db.query(County).filter(
            County.state_id == tn_state.id,
            County.normalized_name == 'WILLIAMSON'
        ).first()

        if not williamson_county:
            # Create county if needed
            williamson_county = County(
                state_id=tn_state.id,
                name='Williamson County',
                normalized_name='WILLIAMSON',
                is_active=True
            )
            db.add(williamson_county)
            db.commit()
            db.refresh(williamson_county)

        # Process permits
        for permit_data in permits:
            try:
                issuance_id = permit_data.get('issuance_id')
                if not issuance_id:
                    errors += 1
                    continue

                # Check for existing permit by source portal and external ID
                existing = db.query(SepticPermit).filter(
                    SepticPermit.source_portal_code == 'geocivix_williamson_tn',
                    SepticPermit.permit_number == permit_data.get('permit_number')
                ).first()

                if existing:
                    # Update existing permit
                    existing.system_type_raw = permit_data.get('permit_type')
                    if permit_data.get('status'):
                        # Store status in a suitable field or raw_data
                        if existing.raw_data:
                            existing.raw_data['geocivix_status'] = permit_data.get('status')
                        else:
                            existing.raw_data = {'geocivix_status': permit_data.get('status')}
                    if permit_data.get('issue_date'):
                        existing.permit_date = permit_data.get('issue_date')
                    if permit_data.get('expiration_date'):
                        existing.expiration_date = permit_data.get('expiration_date')
                    if permit_data.get('document_url'):
                        existing.pdf_url = permit_data.get('document_url')
                    if permit_data.get('detail_url'):
                        existing.permit_url = permit_data.get('detail_url')

                    updated += 1
                else:
                    # Create new permit
                    new_permit = SepticPermit(
                        permit_number=permit_data.get('permit_number'),
                        state_id=tn_state.id,
                        county_id=williamson_county.id,
                        system_type_raw=permit_data.get('permit_type'),
                        permit_date=permit_data.get('issue_date'),
                        expiration_date=permit_data.get('expiration_date'),
                        pdf_url=permit_data.get('document_url'),
                        permit_url=permit_data.get('detail_url'),
                        source_portal_id=portal.id,
                        source_portal_code='geocivix_williamson_tn',
                        scraped_at=datetime.utcnow(),
                        raw_data={
                            'geocivix_issuance_id': issuance_id,
                            'geocivix_status': permit_data.get('status'),
                            'geocivix_issued_by': permit_data.get('issued_by'),
                            'geocivix_document_name': permit_data.get('document_name')
                        },
                        is_active=True
                    )
                    db.add(new_permit)
                    inserted += 1

            except Exception as e:
                logger.error(f"Error processing permit {permit_data.get('permit_number')}: {e}")
                errors += 1

        # Update portal stats
        portal.last_scraped_at = datetime.utcnow()
        portal.total_records_scraped = inserted + updated

        db.commit()

        synced_at = datetime.utcnow().isoformat()
        logger.info(f"Geocivix sync complete: {inserted} inserted, {updated} updated, {errors} errors")

        return GeocivixSyncResponse(
            status="success",
            synced_count=inserted + updated,
            inserted=inserted,
            updated=updated,
            errors=errors,
            synced_at=synced_at,
            portal_url="https://williamson.geocivix.com/secure/"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Geocivix sync failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}"
        )
    finally:
        await service.close()


@router.get("/geocivix/permits", response_model=GeocivixPermitListResponse)
async def list_geocivix_permits(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    permit_type: Optional[str] = Query(None, description="Filter by permit type"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    List permits from Geocivix source.

    Returns permits that were synced from Williamson County, TN Geocivix portal.
    """
    try:
        query = db.query(SepticPermit).filter(
            SepticPermit.source_portal_code == 'geocivix_williamson_tn',
            SepticPermit.is_active == True
        )

        # Apply filters
        if permit_type:
            query = query.filter(SepticPermit.system_type_raw == permit_type)

        # Note: status is stored in raw_data JSON
        # For now, we can filter on permit_type which maps to Geocivix permit type

        total = query.count()
        permits = query.order_by(SepticPermit.permit_date.desc()).offset(skip).limit(limit).all()

        # Get last sync time
        portal = db.query(SourcePortal).filter(
            SourcePortal.code == 'geocivix_williamson_tn'
        ).first()

        permit_list = []
        for p in permits:
            permit_list.append(GeocivixPermitResponse(
                issuance_id=p.raw_data.get('geocivix_issuance_id', '') if p.raw_data else '',
                permit_number=p.permit_number or '',
                permit_type=p.system_type_raw or '',
                status=p.raw_data.get('geocivix_status', '') if p.raw_data else '',
                issue_date=p.permit_date,
                expiration_date=p.expiration_date,
                issued_by=p.raw_data.get('geocivix_issued_by') if p.raw_data else None,
                document_url=p.pdf_url,
                detail_url=p.permit_url or ''
            ))

        return GeocivixPermitListResponse(
            permits=permit_list,
            total=total,
            source='geocivix_williamson_tn',
            synced_at=portal.last_scraped_at.isoformat() if portal and portal.last_scraped_at else None
        )

    except Exception as e:
        logger.exception(f"Failed to list Geocivix permits: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve permits"
        )


@router.get("/geocivix/status", response_model=GeocivixStatusResponse)
async def get_geocivix_status(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Get Geocivix portal sync status.

    Returns information about last sync and total records.
    """
    try:
        portal = db.query(SourcePortal).filter(
            SourcePortal.code == 'geocivix_williamson_tn'
        ).first()

        total_records = db.query(SepticPermit).filter(
            SepticPermit.source_portal_code == 'geocivix_williamson_tn',
            SepticPermit.is_active == True
        ).count()

        return GeocivixStatusResponse(
            portal_name='Williamson County TN Geocivix',
            portal_url='https://williamson.geocivix.com/secure/',
            last_synced=portal.last_scraped_at.isoformat() if portal and portal.last_scraped_at else None,
            total_records=total_records,
            is_authenticated=False  # We don't persist auth state
        )

    except Exception as e:
        logger.exception(f"Failed to get Geocivix status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve status"
        )


@router.get("/geocivix/test-connection")
async def test_geocivix_connection(
    current_user = Depends(get_current_active_user)
):
    """
    Test connection to Geocivix portal.

    Attempts to authenticate and returns connection status.
    """
    service = get_geocivix_service()

    try:
        success = await service.login()

        if success:
            return {
                "status": "connected",
                "message": "Successfully authenticated with Geocivix portal",
                "portal_url": "https://williamson.geocivix.com/secure/"
            }
        else:
            return {
                "status": "failed",
                "message": "Authentication failed - check credentials",
                "portal_url": "https://williamson.geocivix.com/secure/"
            }

    except Exception as e:
        logger.exception(f"Geocivix connection test failed: {e}")
        return {
            "status": "error",
            "message": str(e),
            "portal_url": "https://williamson.geocivix.com/secure/"
        }
    finally:
        await service.close()


@router.get("/geocivix/proxy/project/{project_id}")
async def proxy_geocivix_project(
    project_id: str,
    current_user = Depends(get_current_active_user)
):
    """
    Proxy endpoint to fetch Geocivix project details.

    Authenticates with Geocivix and fetches the project page,
    so users don't need their own Geocivix login.
    """
    from fastapi.responses import HTMLResponse

    service = get_geocivix_service()

    try:
        if not await service.login():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to authenticate with Geocivix portal"
            )

        # Fetch the project page
        url = f"https://williamson.geocivix.com/secure/project/?projectid={project_id}"
        resp = await service.client.get(url)

        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Failed to fetch project from Geocivix"
            )

        return HTMLResponse(content=resp.text, status_code=200)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Geocivix proxy error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        await service.close()


@router.get("/geocivix/proxy/permit/{issuance_id}")
async def proxy_geocivix_permit(
    issuance_id: str,
    current_user = Depends(get_current_active_user)
):
    """
    Proxy endpoint to fetch Geocivix permit details.

    Authenticates with Geocivix and fetches the permit page.
    """
    from fastapi.responses import HTMLResponse

    service = get_geocivix_service()

    try:
        if not await service.login():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to authenticate with Geocivix portal"
            )

        # Fetch the permit page
        url = f"https://williamson.geocivix.com/secure/permits/?issuanceid={issuance_id}"
        resp = await service.client.get(url)

        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Failed to fetch permit from Geocivix"
            )

        return HTMLResponse(content=resp.text, status_code=200)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Geocivix proxy error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        await service.close()


@router.get("/geocivix/proxy/document/{viewer_id}")
async def proxy_geocivix_document(
    viewer_id: str,
    current_user = Depends(get_current_active_user)
):
    """
    Proxy endpoint to fetch Geocivix document/PDF.

    Authenticates with Geocivix and fetches the document viewer page.
    Note: For actual PDF download, the document may need additional handling.
    """
    from fastapi.responses import Response

    service = get_geocivix_service()

    try:
        if not await service.login():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to authenticate with Geocivix portal"
            )

        # Fetch the document viewer
        url = f"https://williamson.geocivix.com/secure/utilities/viewer/?vid={viewer_id}"
        resp = await service.client.get(url)

        if resp.status_code != 200:
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Failed to fetch document from Geocivix"
            )

        # Determine content type
        content_type = resp.headers.get('content-type', 'text/html')

        return Response(
            content=resp.content,
            status_code=200,
            media_type=content_type
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Geocivix document proxy error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        await service.close()
