# Geocivix Integration Plan - Williamson County, TN Permits

**Version:** 1.0
**Date:** January 22, 2026
**Status:** Ready for Implementation

## Overview

This document outlines the complete integration of Williamson County, TN permit data from the Geocivix portal into the ReactCRM system.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ReactCRM System                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Frontend   │◄───│   FastAPI    │◄───│  PostgreSQL  │      │
│  │   React      │    │   Backend    │    │   Database   │      │
│  └──────────────┘    └──────┬───────┘    └──────────────┘      │
│                             │                                   │
│                      ┌──────▼───────┐                          │
│                      │   Geocivix   │                          │
│                      │   Service    │                          │
│                      └──────┬───────┘                          │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │  Geocivix Portal       │
                 │  williamson.geocivix   │
                 │  .com/secure/          │
                 └────────────────────────┘
```

## Implementation Components

### 1. Database Model

**File:** `backend/app/models/geocivix_permit.py`

```python
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON
from sqlalchemy.sql import func
from app.database.base_class import Base

class GeocivixPermit(Base):
    __tablename__ = "geocivix_permits"

    id = Column(Integer, primary_key=True, index=True)

    # Geocivix identifiers
    issuance_id = Column(String(50), unique=True, index=True)  # Portal's internal ID
    permit_number = Column(String(100), index=True)  # BP-2020-00001

    # Permit details
    permit_type = Column(String(100))  # Building Permit, etc.
    status = Column(String(50))  # Issued, Pending, Closed
    issue_date = Column(DateTime(timezone=True))
    expiration_date = Column(DateTime(timezone=True), nullable=True)
    issued_by = Column(String(200), nullable=True)

    # Document information
    document_url = Column(Text, nullable=True)
    detail_url = Column(Text)

    # Raw data for debugging
    raw_html = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_synced = Column(DateTime(timezone=True))

    # Sync status
    is_active = Column(Boolean, default=True)
```

### 2. Pydantic Schemas

**File:** `backend/app/schemas/geocivix_permit.py`

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class GeocivixPermitBase(BaseModel):
    issuance_id: str
    permit_number: str
    permit_type: str
    status: str
    issue_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    issued_by: Optional[str] = None
    document_url: Optional[str] = None
    detail_url: str

class GeocivixPermitCreate(GeocivixPermitBase):
    raw_html: Optional[str] = None

class GeocivixPermitUpdate(BaseModel):
    status: Optional[str] = None
    expiration_date: Optional[datetime] = None
    document_url: Optional[str] = None
    last_synced: Optional[datetime] = None

class GeocivixPermitInDB(GeocivixPermitBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_synced: Optional[datetime] = None
    is_active: bool

    class Config:
        from_attributes = True

class GeocivixPermitResponse(GeocivixPermitInDB):
    pass

class GeocivixPermitListResponse(BaseModel):
    permits: list[GeocivixPermitResponse]
    total: int
    synced_at: Optional[datetime] = None
```

### 3. Geocivix Service

**File:** `backend/app/services/geocivix_service.py`

```python
import httpx
from bs4 import BeautifulSoup
from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class GeocivixService:
    BASE_URL = "https://williamson.geocivix.com/secure/"

    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self.client = httpx.AsyncClient(timeout=30.0)
        self.authenticated = False

    async def login(self) -> bool:
        """Authenticate with Geocivix portal"""
        try:
            # Step 1: User scheme check
            scheme_resp = await self.client.post(
                f"{self.BASE_URL}?action=user.scheme",
                data={
                    "username": self.username,
                    "rememberme": "false"
                }
            )

            # Step 2: Authenticate
            auth_resp = await self.client.post(
                f"{self.BASE_URL}?action=user.authenticate",
                data={
                    "username": self.username,
                    "password": self.password,
                    "rememberme": "false",
                    "token": ""
                }
            )

            auth_data = auth_resp.json()
            if auth_data.get("SUCCESS"):
                self.authenticated = True
                logger.info("Geocivix authentication successful")
                return True
            else:
                logger.error(f"Geocivix auth failed: {auth_data.get('MESSAGE')}")
                return False

        except Exception as e:
            logger.exception(f"Geocivix login error: {e}")
            return False

    async def get_permit_list(self) -> list[dict]:
        """Fetch and parse permit list from portal"""
        if not self.authenticated:
            await self.login()

        resp = await self.client.get(f"{self.BASE_URL}?action=permit.list")
        html = resp.text

        return self._parse_permit_html(html)

    def _parse_permit_html(self, html: str) -> list[dict]:
        """Parse HTML table into permit dictionaries"""
        soup = BeautifulSoup(html, 'html.parser')
        permits = []

        table = soup.find('table')
        if not table:
            logger.warning("No permit table found in HTML")
            return []

        rows = table.find('tbody').find_all('tr') if table.find('tbody') else []

        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 7:
                continue

            # Extract permit data
            permit_link = cells[0].find('a')
            doc_link = cells[6].find('a')
            action_btn = row.find('button', {'data-issuanceid': True})

            permit = {
                'permit_number': permit_link.get_text(strip=True) if permit_link else '',
                'detail_url': permit_link.get('href', '') if permit_link else '',
                'permit_type': cells[1].get_text(strip=True),
                'status': cells[2].get_text(strip=True),
                'issue_date': self._parse_date(cells[3].get_text(strip=True)),
                'issued_by': cells[4].get_text(strip=True),
                'expiration_date': self._parse_date(cells[5].get_text(strip=True)),
                'document_url': doc_link.get('href', '') if doc_link else None,
                'issuance_id': action_btn.get('data-issuanceid') if action_btn else None
            }

            permits.append(permit)

        logger.info(f"Parsed {len(permits)} permits from Geocivix")
        return permits

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse date string from portal (M/D/YY format)"""
        if not date_str or date_str.lower() == 'n/a':
            return None
        try:
            return datetime.strptime(date_str, '%m/%d/%y')
        except ValueError:
            return None

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
```

### 4. API Endpoints

**File:** `backend/app/api/v2/endpoints/geocivix.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime

from app.database.session import get_db
from app.schemas.geocivix_permit import (
    GeocivixPermitResponse,
    GeocivixPermitListResponse
)
from app.services.geocivix_service import GeocivixService
from app.core.config import settings

router = APIRouter()

@router.get("/geocivix/permits", response_model=GeocivixPermitListResponse)
async def list_geocivix_permits(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    permit_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List Geocivix permits from database"""
    # Query permits from database
    query = select(GeocivixPermit).where(GeocivixPermit.is_active == True)

    if status:
        query = query.where(GeocivixPermit.status == status)
    if permit_type:
        query = query.where(GeocivixPermit.permit_type == permit_type)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    permits = result.scalars().all()

    total_query = select(func.count(GeocivixPermit.id)).where(GeocivixPermit.is_active == True)
    total = await db.scalar(total_query)

    return GeocivixPermitListResponse(
        permits=permits,
        total=total
    )

@router.post("/geocivix/sync")
async def sync_geocivix_permits(db: AsyncSession = Depends(get_db)):
    """Trigger manual sync of Geocivix permits"""
    service = GeocivixService(
        username=settings.GEOCIVIX_USERNAME,
        password=settings.GEOCIVIX_PASSWORD
    )

    try:
        if not await service.login():
            raise HTTPException(status_code=401, detail="Geocivix authentication failed")

        permits = await service.get_permit_list()

        # Upsert permits into database
        synced_count = 0
        for permit_data in permits:
            existing = await db.execute(
                select(GeocivixPermit).where(
                    GeocivixPermit.issuance_id == permit_data['issuance_id']
                )
            )
            existing_permit = existing.scalar_one_or_none()

            if existing_permit:
                # Update existing
                for key, value in permit_data.items():
                    setattr(existing_permit, key, value)
                existing_permit.last_synced = datetime.utcnow()
            else:
                # Create new
                new_permit = GeocivixPermit(**permit_data)
                new_permit.last_synced = datetime.utcnow()
                db.add(new_permit)

            synced_count += 1

        await db.commit()

        return {
            "status": "success",
            "synced_count": synced_count,
            "synced_at": datetime.utcnow().isoformat()
        }

    finally:
        await service.close()

@router.get("/geocivix/permits/{issuance_id}", response_model=GeocivixPermitResponse)
async def get_geocivix_permit(
    issuance_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get single Geocivix permit by issuance ID"""
    result = await db.execute(
        select(GeocivixPermit).where(GeocivixPermit.issuance_id == issuance_id)
    )
    permit = result.scalar_one_or_none()

    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")

    return permit
```

### 5. Configuration

**File:** `backend/app/core/config.py` (additions)

```python
# Geocivix Portal Settings
GEOCIVIX_USERNAME: str = os.getenv("GEOCIVIX_USERNAME", "willwalterburns@gmail.com")
GEOCIVIX_PASSWORD: str = os.getenv("GEOCIVIX_PASSWORD", "#Espn2025")
GEOCIVIX_BASE_URL: str = "https://williamson.geocivix.com/secure/"
GEOCIVIX_SYNC_INTERVAL: int = 3600  # 1 hour
```

### 6. Frontend Component

**File:** `src/features/permits/GeocivixPermitsList.tsx`

```tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';

interface GeocivixPermit {
  id: number;
  issuance_id: string;
  permit_number: string;
  permit_type: string;
  status: string;
  issue_date: string;
  expiration_date: string | null;
  document_url: string | null;
}

export function GeocivixPermitsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['geocivix-permits'],
    queryFn: () => apiClient.get('/geocivix/permits').then(r => r.data)
  });

  const columns = [
    {
      header: 'Permit #',
      accessorKey: 'permit_number',
      cell: ({ row }) => (
        <span className="font-mono">{row.original.permit_number}</span>
      )
    },
    {
      header: 'Type',
      accessorKey: 'permit_type'
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'Issued' ? 'success' : 'secondary'}>
          {row.original.status}
        </Badge>
      )
    },
    {
      header: 'Issue Date',
      accessorKey: 'issue_date',
      cell: ({ row }) => new Date(row.original.issue_date).toLocaleDateString()
    },
    {
      header: 'Document',
      accessorKey: 'document_url',
      cell: ({ row }) => row.original.document_url ? (
        <a href={row.original.document_url} target="_blank" className="text-blue-600">
          View PDF
        </a>
      ) : 'N/A'
    }
  ];

  if (isLoading) return <div>Loading permits...</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        Williamson County Permits ({data?.total || 0})
      </h2>
      <DataTable columns={columns} data={data?.permits || []} />
    </div>
  );
}
```

### 7. Database Migration

**File:** `backend/alembic/versions/xxx_add_geocivix_permits.py`

```python
"""Add geocivix_permits table

Revision ID: xxx
Create Date: 2026-01-22
"""
from alembic import op
import sqlalchemy as sa

revision = 'xxx_geocivix'
down_revision = 'previous_revision'

def upgrade():
    op.create_table(
        'geocivix_permits',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('issuance_id', sa.String(50), unique=True, index=True),
        sa.Column('permit_number', sa.String(100), index=True),
        sa.Column('permit_type', sa.String(100)),
        sa.Column('status', sa.String(50)),
        sa.Column('issue_date', sa.DateTime(timezone=True)),
        sa.Column('expiration_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('issued_by', sa.String(200), nullable=True),
        sa.Column('document_url', sa.Text(), nullable=True),
        sa.Column('detail_url', sa.Text()),
        sa.Column('raw_html', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('last_synced', sa.DateTime(timezone=True)),
        sa.Column('is_active', sa.Boolean(), default=True)
    )

def downgrade():
    op.drop_table('geocivix_permits')
```

## Implementation Order

1. **Database Setup**
   - Create migration
   - Create model
   - Create schemas

2. **Backend Service**
   - Implement GeocivixService
   - Add configuration
   - Create API endpoints
   - Register routes

3. **Frontend Integration**
   - Create permits list component
   - Add to navigation
   - Style with existing design system

4. **Testing**
   - Unit tests for service
   - Integration tests for API
   - E2E tests with Playwright

5. **Deployment**
   - Add environment variables to Railway
   - Run migrations
   - Verify sync works in production

## Environment Variables Required

```
GEOCIVIX_USERNAME=willwalterburns@gmail.com
GEOCIVIX_PASSWORD=#Espn2025
```

## Success Criteria

- [ ] Geocivix service authenticates successfully
- [ ] Permit list endpoint returns 1000+ permits
- [ ] Database stores all permits with correct data
- [ ] Frontend displays permits in DataTable
- [ ] Sync endpoint updates permits
- [ ] E2E test proves data flows from portal to CRM

---

**Ready for PHASE 3: Implementation**
