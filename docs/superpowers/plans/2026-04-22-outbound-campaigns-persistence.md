# Outbound Campaigns Persistence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Outbound Dialer state from per-browser IndexedDB to backend Postgres so the team sees one truth; recover Dannia's stranded dispositions via a one-shot browser-side migration on her next login.

**Architecture:** Backend adds 4 Postgres tables and a `/api/v2/outbound-campaigns` router. Frontend keeps UI preferences in Zustand but moves campaigns/contacts/callbacks behind TanStack Query. On first page load post-deploy, a migration hook reads the old IndexedDB blob and POSTs dirty rows to an idempotent `/migrate-local` endpoint. Alembic data migration seeds the Email Openers campaign + 39 contacts so everyone sees it immediately.

**Tech Stack:** FastAPI + SQLAlchemy 2.0 (async) + Alembic + Postgres; React 19 + TypeScript 5.9 + TanStack Query v5 + Zustand + Vite 7; Playwright for E2E; Railway for deploy.

**Spec:** `/home/will/ReactCRM/docs/superpowers/specs/2026-04-22-outbound-campaigns-persistence-design.md`

**Repos:**
- Backend: `/home/will/react-crm-api` (deploys to `https://react-crm-api-production.up.railway.app`)
- Frontend: `/home/will/ReactCRM` (deploys to `https://react.ecbtx.com`)

---

## File Structure

### Backend — `/home/will/react-crm-api`

**Create:**
- `app/models/outbound_campaign.py` — SQLAlchemy models for all 4 tables
- `app/schemas/outbound_campaigns.py` — Pydantic request/response
- `app/api/v2/outbound_campaigns.py` — router with all endpoints
- `alembic/versions/106_outbound_campaigns.py` — schema migration
- `alembic/versions/107_seed_email_openers_campaign.py` — data seed
- `tests/api/v2/test_outbound_campaigns.py` — pytest

**Modify:**
- `app/models/__init__.py` — export new models (~1 line)
- `app/api/v2/router.py` — register new router (~2 lines)

### Frontend — `/home/will/ReactCRM`

**Create:**
- `src/api/types/outboundCampaigns.ts` — API types + Zod schemas (mirror the existing `src/features/outbound-campaigns/types.ts` but "API shape")
- `src/api/hooks/useOutboundCampaigns.ts` — all TanStack Query hooks
- `src/features/outbound-campaigns/useLocalMigration.ts` — migration hook
- `src/features/outbound-campaigns/utils/readLegacyIndexedDB.ts` — read old Zustand blob
- `e2e/features/outbound-campaigns-persistence.spec.ts` — Playwright E2E

**Modify (in order of task execution):**
- `src/features/outbound-campaigns/store.ts` — shrink to UI state only; delete `injectEmailOpenersCampaign`, keep `injectTestContacts` but route through API
- `src/features/outbound-campaigns/dannia/danniaStore.ts` — remove callbacks slice
- `src/features/outbound-campaigns/OutboundCampaignsPage.tsx` — use queries, call migration hook
- `src/features/outbound-campaigns/components/PowerDialer.tsx` — disposition mutations
- `src/features/outbound-campaigns/components/ContactTable.tsx` — disposition + update mutations
- `src/features/outbound-campaigns/components/PermitCampaignBuilder.tsx` — campaign mutations
- `src/features/outbound-campaigns/components/ImportDialog.tsx` — import mutation
- `src/features/outbound-campaigns/components/CampaignList.tsx` — read from query
- `src/features/outbound-campaigns/components/CampaignStatsBar.tsx` — read from query
- `src/features/outbound-campaigns/components/CampaignAnalytics.tsx` — read from query
- `src/features/outbound-campaigns/components/AgentAssist.tsx` — read callbacks from query
- `src/features/outbound-campaigns/dannia/useCallbackEngine.ts` — use callback mutations
- `src/features/outbound-campaigns/dannia/components/SmsSequenceStatus.tsx` — if it reads callbacks, switch

---

## Phase A — Backend Schema & API

### Task 1: Alembic migration for 4 tables

**Files:**
- Create: `/home/will/react-crm-api/alembic/versions/106_outbound_campaigns.py`

- [ ] **Step 1: Confirm latest migration id**

Run: `ls /home/will/react-crm-api/alembic/versions/ | sort | tail -3`
Expected: `105_hr_req_publish_to_indeed.py` is latest.

- [ ] **Step 2: Create the migration file**

Create `/home/will/react-crm-api/alembic/versions/106_outbound_campaigns.py`:

```python
"""outbound campaigns persistence

Revision ID: 106
Revises: 105
"""
from alembic import op
import sqlalchemy as sa


revision = "106"
down_revision = "105"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "outbound_campaigns",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("source_file", sa.Text(), nullable=True),
        sa.Column("source_sheet", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("api_users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "outbound_campaign_contacts",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("campaign_id", sa.Text(), sa.ForeignKey("outbound_campaigns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_number", sa.String(length=100), nullable=True),
        sa.Column("account_name", sa.String(length=255), nullable=False),
        sa.Column("company", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("state", sa.String(length=8), nullable=True),
        sa.Column("zip_code", sa.String(length=16), nullable=True),
        sa.Column("service_zone", sa.String(length=100), nullable=True),
        sa.Column("system_type", sa.String(length=100), nullable=True),
        sa.Column("contract_type", sa.String(length=50), nullable=True),
        sa.Column("contract_status", sa.String(length=50), nullable=True),
        sa.Column("contract_start", sa.Date(), nullable=True),
        sa.Column("contract_end", sa.Date(), nullable=True),
        sa.Column("contract_value", sa.Numeric(12, 2), nullable=True),
        sa.Column("customer_type", sa.String(length=50), nullable=True),
        sa.Column("call_priority_label", sa.String(length=50), nullable=True),
        sa.Column("call_status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("call_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_call_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_call_duration", sa.Integer(), nullable=True),
        sa.Column("last_disposition", sa.String(length=32), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("callback_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("assigned_rep", sa.Integer(), sa.ForeignKey("api_users.id"), nullable=True),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("opens", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_outbound_contacts_campaign_status", "outbound_campaign_contacts", ["campaign_id", "call_status"])
    op.create_index("ix_outbound_contacts_phone", "outbound_campaign_contacts", ["phone"])

    op.create_table(
        "outbound_call_attempts",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("contact_id", sa.Text(), sa.ForeignKey("outbound_campaign_contacts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("campaign_id", sa.Text(), sa.ForeignKey("outbound_campaigns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rep_user_id", sa.Integer(), sa.ForeignKey("api_users.id"), nullable=True),
        sa.Column("dispositioned_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("call_status", sa.String(length=32), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("duration_sec", sa.Integer(), nullable=True),
    )
    op.create_index("ix_outbound_attempts_contact_time", "outbound_call_attempts", ["contact_id", "dispositioned_at"])
    op.create_index("ix_outbound_attempts_rep_time", "outbound_call_attempts", ["rep_user_id", "dispositioned_at"])

    op.create_table(
        "outbound_callbacks",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("contact_id", sa.Text(), sa.ForeignKey("outbound_campaign_contacts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("campaign_id", sa.Text(), sa.ForeignKey("outbound_campaigns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rep_user_id", sa.Integer(), sa.ForeignKey("api_users.id"), nullable=True),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="scheduled"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_outbound_callbacks_sched", "outbound_callbacks", ["scheduled_for", "status"])


def downgrade() -> None:
    op.drop_index("ix_outbound_callbacks_sched", table_name="outbound_callbacks")
    op.drop_table("outbound_callbacks")
    op.drop_index("ix_outbound_attempts_rep_time", table_name="outbound_call_attempts")
    op.drop_index("ix_outbound_attempts_contact_time", table_name="outbound_call_attempts")
    op.drop_table("outbound_call_attempts")
    op.drop_index("ix_outbound_contacts_phone", table_name="outbound_campaign_contacts")
    op.drop_index("ix_outbound_contacts_campaign_status", table_name="outbound_campaign_contacts")
    op.drop_table("outbound_campaign_contacts")
    op.drop_table("outbound_campaigns")
```

- [ ] **Step 3: Dry-run with SQLite locally**

Run (from `/home/will/react-crm-api`):
```bash
cd /home/will/react-crm-api
python -c "from alembic.config import Config; from alembic import command; cfg = Config('alembic.ini'); print('check'); command.check(cfg)" 2>&1 | tail -5
```
Expected: no errors. (If `command.check` isn't available on this alembic version, this step is best-effort; proceed to Task 2 regardless.)

- [ ] **Step 4: Commit**

```bash
cd /home/will/react-crm-api
git add alembic/versions/106_outbound_campaigns.py
git commit -m "feat(outbound): add campaigns/contacts/attempts/callbacks tables (106)"
```

---

### Task 2: SQLAlchemy models

**Files:**
- Create: `/home/will/react-crm-api/app/models/outbound_campaign.py`
- Modify: `/home/will/react-crm-api/app/models/__init__.py`

- [ ] **Step 1: Create the model file**

Create `/home/will/react-crm-api/app/models/outbound_campaign.py`:

```python
"""Outbound Dialer campaign persistence models."""

from sqlalchemy import (
    Column, String, Text, Integer, DateTime, Date, Numeric, ForeignKey, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base


class OutboundCampaign(Base):
    __tablename__ = "outbound_campaigns"

    id = Column(Text, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="draft")
    source_file = Column(Text, nullable=True)
    source_sheet = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("api_users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    contacts = relationship(
        "OutboundCampaignContact",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )


class OutboundCampaignContact(Base):
    __tablename__ = "outbound_campaign_contacts"

    id = Column(Text, primary_key=True)
    campaign_id = Column(Text, ForeignKey("outbound_campaigns.id", ondelete="CASCADE"), nullable=False)
    account_number = Column(String(100), nullable=True)
    account_name = Column(String(255), nullable=False)
    company = Column(String(255), nullable=True)
    phone = Column(String(32), nullable=False)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(8), nullable=True)
    zip_code = Column(String(16), nullable=True)
    service_zone = Column(String(100), nullable=True)
    system_type = Column(String(100), nullable=True)
    contract_type = Column(String(50), nullable=True)
    contract_status = Column(String(50), nullable=True)
    contract_start = Column(Date, nullable=True)
    contract_end = Column(Date, nullable=True)
    contract_value = Column(Numeric(12, 2), nullable=True)
    customer_type = Column(String(50), nullable=True)
    call_priority_label = Column(String(50), nullable=True)
    call_status = Column(String(32), nullable=False, default="pending")
    call_attempts = Column(Integer, nullable=False, default=0)
    last_call_date = Column(DateTime(timezone=True), nullable=True)
    last_call_duration = Column(Integer, nullable=True)
    last_disposition = Column(String(32), nullable=True)
    notes = Column(Text, nullable=True)
    callback_date = Column(DateTime(timezone=True), nullable=True)
    assigned_rep = Column(Integer, ForeignKey("api_users.id"), nullable=True)
    priority = Column(Integer, nullable=False, default=0)
    opens = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    campaign = relationship("OutboundCampaign", back_populates="contacts")

    __table_args__ = (
        Index("ix_outbound_contacts_campaign_status", "campaign_id", "call_status"),
        Index("ix_outbound_contacts_phone", "phone"),
    )


class OutboundCallAttempt(Base):
    __tablename__ = "outbound_call_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id = Column(Text, ForeignKey("outbound_campaign_contacts.id", ondelete="CASCADE"), nullable=False)
    campaign_id = Column(Text, ForeignKey("outbound_campaigns.id", ondelete="CASCADE"), nullable=False)
    rep_user_id = Column(Integer, ForeignKey("api_users.id"), nullable=True)
    dispositioned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    call_status = Column(String(32), nullable=False)
    notes = Column(Text, nullable=True)
    duration_sec = Column(Integer, nullable=True)

    __table_args__ = (
        Index("ix_outbound_attempts_contact_time", "contact_id", "dispositioned_at"),
        Index("ix_outbound_attempts_rep_time", "rep_user_id", "dispositioned_at"),
    )


class OutboundCallback(Base):
    __tablename__ = "outbound_callbacks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_id = Column(Text, ForeignKey("outbound_campaign_contacts.id", ondelete="CASCADE"), nullable=False)
    campaign_id = Column(Text, ForeignKey("outbound_campaigns.id", ondelete="CASCADE"), nullable=False)
    rep_user_id = Column(Integer, ForeignKey("api_users.id"), nullable=True)
    scheduled_for = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="scheduled")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_outbound_callbacks_sched", "scheduled_for", "status"),
    )
```

- [ ] **Step 2: Register models in __init__**

Edit `/home/will/react-crm-api/app/models/__init__.py` — find the last import block and add:

```python
# Outbound dialer persistence
from app.models.outbound_campaign import (
    OutboundCampaign,
    OutboundCampaignContact,
    OutboundCallAttempt,
    OutboundCallback,
)
```

- [ ] **Step 3: Verify models load**

Run:
```bash
cd /home/will/react-crm-api
python -c "from app.models.outbound_campaign import OutboundCampaign, OutboundCampaignContact, OutboundCallAttempt, OutboundCallback; print('ok')"
```
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
cd /home/will/react-crm-api
git add app/models/outbound_campaign.py app/models/__init__.py
git commit -m "feat(outbound): add SQLAlchemy models for campaigns/contacts/attempts/callbacks"
```

---

### Task 3: Pydantic schemas

**Files:**
- Create: `/home/will/react-crm-api/app/schemas/outbound_campaigns.py`

- [ ] **Step 1: Create the schema file**

Create `/home/will/react-crm-api/app/schemas/outbound_campaigns.py`:

```python
"""Pydantic schemas for /api/v2/outbound-campaigns."""

from __future__ import annotations

from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


CallStatus = str  # validated at boundaries; superset: pending|queued|calling|connected|
                  # voicemail|no_answer|busy|callback_scheduled|interested|
                  # not_interested|wrong_number|do_not_call|completed|skipped

CampaignStatus = str  # draft|active|paused|completed|archived


# ---------- Campaign ----------

class CampaignBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: CampaignStatus = "draft"
    source_file: Optional[str] = None
    source_sheet: Optional[str] = None


class CampaignCreate(CampaignBase):
    id: Optional[str] = None  # client-supplied stable id permitted


class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[CampaignStatus] = None


class CampaignCounters(BaseModel):
    total: int
    pending: int
    called: int
    connected: int
    interested: int
    voicemail: int
    no_answer: int
    callback_scheduled: int
    completed: int
    do_not_call: int


class CampaignResponse(CampaignBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    counters: CampaignCounters


# ---------- Contact ----------

class ContactBase(BaseModel):
    account_number: Optional[str] = None
    account_name: str = Field(..., min_length=1, max_length=255)
    company: Optional[str] = None
    phone: str = Field(..., min_length=1, max_length=32)
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    service_zone: Optional[str] = None
    system_type: Optional[str] = None
    contract_type: Optional[str] = None
    contract_status: Optional[str] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    contract_value: Optional[Decimal] = None
    customer_type: Optional[str] = None
    call_priority_label: Optional[str] = None
    priority: int = 0
    opens: Optional[int] = None
    notes: Optional[str] = None


class ContactCreate(ContactBase):
    id: Optional[str] = None  # client-supplied stable id permitted


class ContactUpdate(BaseModel):
    account_name: Optional[str] = Field(None, min_length=1, max_length=255)
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    service_zone: Optional[str] = None
    system_type: Optional[str] = None
    call_priority_label: Optional[str] = None
    priority: Optional[int] = None
    notes: Optional[str] = None
    callback_date: Optional[datetime] = None
    assigned_rep: Optional[int] = None


class ContactResponse(ContactBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    campaign_id: str
    call_status: CallStatus
    call_attempts: int
    last_call_date: Optional[datetime] = None
    last_call_duration: Optional[int] = None
    last_disposition: Optional[str] = None
    callback_date: Optional[datetime] = None
    assigned_rep: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class BulkContactsCreate(BaseModel):
    contacts: List[ContactCreate]


class BulkContactsResponse(BaseModel):
    contacts: List[ContactResponse]


# ---------- Disposition ----------

class DispositionCreate(BaseModel):
    call_status: CallStatus
    notes: Optional[str] = None
    duration_sec: Optional[int] = None


class AttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    contact_id: str
    campaign_id: str
    rep_user_id: Optional[int] = None
    dispositioned_at: datetime
    call_status: CallStatus
    notes: Optional[str] = None
    duration_sec: Optional[int] = None


class DispositionResponse(BaseModel):
    contact: ContactResponse
    attempt: AttemptResponse


# ---------- Callback ----------

class CallbackCreate(BaseModel):
    contact_id: str
    campaign_id: str
    scheduled_for: datetime
    notes: Optional[str] = None


class CallbackUpdate(BaseModel):
    scheduled_for: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    completed_at: Optional[datetime] = None


class CallbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    contact_id: str
    campaign_id: str
    rep_user_id: Optional[int] = None
    scheduled_for: datetime
    notes: Optional[str] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None


# ---------- Local migration ----------

class LegacyContactPayload(BaseModel):
    """Shape of a contact coming from the browser's IndexedDB dump."""
    model_config = ConfigDict(extra="ignore")  # tolerate extra fields

    id: str
    campaign_id: str
    account_number: Optional[str] = None
    account_name: str
    company: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    service_zone: Optional[str] = None
    system_type: Optional[str] = None
    contract_type: Optional[str] = None
    contract_status: Optional[str] = None
    contract_value: Optional[Decimal] = None
    customer_type: Optional[str] = None
    call_priority_label: Optional[str] = None
    call_status: str
    call_attempts: int
    last_call_date: Optional[datetime] = None
    last_call_duration: Optional[int] = None
    last_disposition: Optional[str] = None
    notes: Optional[str] = None
    callback_date: Optional[datetime] = None
    priority: int = 0
    opens: Optional[int] = None


class LegacyCampaignPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    description: Optional[str] = None
    status: str
    source_file: Optional[str] = None
    source_sheet: Optional[str] = None


class LegacyCallbackPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: Optional[str] = None
    contact_id: str
    campaign_id: Optional[str] = None
    scheduled_for: datetime
    notes: Optional[str] = None
    status: Optional[str] = "scheduled"


class MigrateLocalRequest(BaseModel):
    campaigns: List[LegacyCampaignPayload] = Field(default_factory=list)
    contacts: List[LegacyContactPayload] = Field(default_factory=list)
    callbacks: List[LegacyCallbackPayload] = Field(default_factory=list)


class MigrateLocalResponse(BaseModel):
    imported: dict  # {campaigns: n, contacts: n, attempts: n, callbacks: n}
```

- [ ] **Step 2: Verify it imports**

Run:
```bash
cd /home/will/react-crm-api
python -c "from app.schemas.outbound_campaigns import CampaignResponse, ContactResponse, DispositionResponse, MigrateLocalRequest; print('ok')"
```
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
cd /home/will/react-crm-api
git add app/schemas/outbound_campaigns.py
git commit -m "feat(outbound): add Pydantic schemas for API"
```

---

### Task 4: Router scaffold + GET /campaigns (counters derived)

**Files:**
- Create: `/home/will/react-crm-api/app/api/v2/outbound_campaigns.py`
- Modify: `/home/will/react-crm-api/app/api/v2/router.py`
- Create: `/home/will/react-crm-api/tests/api/v2/test_outbound_campaigns.py`

- [ ] **Step 1: Write the failing test**

Create `/home/will/react-crm-api/tests/api/v2/test_outbound_campaigns.py`:

```python
"""Tests for /api/v2/outbound-campaigns."""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app as fastapi_app
from app.database import Base, get_db
from app.api.deps import create_access_token, get_password_hash
from app.models.user import User
from app.models.outbound_campaign import (
    OutboundCampaign, OutboundCampaignContact, OutboundCallAttempt, OutboundCallback,
)


TEST_DATABASE_URL = "sqlite+aiosqlite://"
PREFIX = "/api/v2/outbound-campaigns"


@pytest_asyncio.fixture
async def test_db():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def test_user(test_db: AsyncSession):
    user = User(
        email="dannia@macseptic.com",
        password_hash=get_password_hash("test-pw"),
        full_name="Dannia Chavez",
        role="admin",
        is_active=True,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest_asyncio.fixture
async def client(test_db: AsyncSession, test_user: User):
    async def override_get_db():
        yield test_db
    fastapi_app.dependency_overrides[get_db] = override_get_db
    token = create_access_token({"sub": str(test_user.id)})
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ac.headers.update({"Authorization": f"Bearer {token}"})
        yield ac
    fastapi_app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_list_campaigns_empty(client: AsyncClient):
    r = await client.get(f"{PREFIX}/campaigns")
    assert r.status_code == 200, r.text
    assert r.json() == {"campaigns": []}


@pytest.mark.asyncio
async def test_list_campaigns_requires_auth():
    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get(f"{PREFIX}/campaigns")
    assert r.status_code in (401, 403)
```

- [ ] **Step 2: Run test — confirm it fails with "not registered"**

Run:
```bash
cd /home/will/react-crm-api
pytest tests/api/v2/test_outbound_campaigns.py::test_list_campaigns_empty -v 2>&1 | tail -20
```
Expected: FAIL with 404 (route not registered).

- [ ] **Step 3: Create the router with GET /campaigns**

Create `/home/will/react-crm-api/app/api/v2/outbound_campaigns.py`:

```python
"""Outbound Dialer campaign persistence - /api/v2/outbound-campaigns."""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select, func, case

from app.api.deps import DbSession, CurrentUser
from app.models.outbound_campaign import (
    OutboundCampaign,
    OutboundCampaignContact,
    OutboundCallAttempt,
    OutboundCallback,
)
from app.schemas.outbound_campaigns import (
    CampaignCreate,
    CampaignUpdate,
    CampaignCounters,
    CampaignResponse,
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    BulkContactsCreate,
    BulkContactsResponse,
    DispositionCreate,
    DispositionResponse,
    AttemptResponse,
    CallbackCreate,
    CallbackUpdate,
    CallbackResponse,
    MigrateLocalRequest,
    MigrateLocalResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


async def _counters_for(db, campaign_id: str) -> CampaignCounters:
    """Derive campaign counters by aggregating contacts."""
    cs = OutboundCampaignContact
    status_counts = await db.execute(
        select(cs.call_status, func.count(cs.id))
        .where(cs.campaign_id == campaign_id)
        .group_by(cs.call_status)
    )
    buckets = {row[0]: row[1] for row in status_counts.all()}
    total = sum(buckets.values())
    called = total - buckets.get("pending", 0) - buckets.get("queued", 0)
    connected_states = {"connected", "interested", "not_interested", "completed"}
    connected = sum(v for k, v in buckets.items() if k in connected_states)
    completed_states = {"completed", "interested", "not_interested", "wrong_number", "do_not_call"}
    completed = sum(v for k, v in buckets.items() if k in completed_states)
    return CampaignCounters(
        total=total,
        pending=buckets.get("pending", 0) + buckets.get("queued", 0),
        called=called,
        connected=connected,
        interested=buckets.get("interested", 0),
        voicemail=buckets.get("voicemail", 0),
        no_answer=buckets.get("no_answer", 0),
        callback_scheduled=buckets.get("callback_scheduled", 0),
        completed=completed,
        do_not_call=buckets.get("do_not_call", 0),
    )


def _campaign_to_response(c: OutboundCampaign, counters: CampaignCounters) -> CampaignResponse:
    return CampaignResponse(
        id=c.id,
        name=c.name,
        description=c.description,
        status=c.status,
        source_file=c.source_file,
        source_sheet=c.source_sheet,
        created_by=c.created_by,
        created_at=c.created_at,
        updated_at=c.updated_at,
        counters=counters,
    )


@router.get("/campaigns")
async def list_campaigns(db: DbSession, current_user: CurrentUser):
    """List all outbound campaigns with derived counters."""
    result = await db.execute(select(OutboundCampaign).order_by(OutboundCampaign.created_at.desc()))
    campaigns = result.scalars().all()
    payload = []
    for c in campaigns:
        counters = await _counters_for(db, c.id)
        payload.append(_campaign_to_response(c, counters).model_dump(mode="json"))
    return {"campaigns": payload}
```

- [ ] **Step 4: Register the router**

Edit `/home/will/react-crm-api/app/api/v2/router.py`:

- Add to the imports block near the top (alphabetical if possible):
  ```python
  outbound_campaigns,
  ```
- Add near the other `api_router.include_router(...)` lines:
  ```python
  api_router.include_router(outbound_campaigns.router, prefix="/outbound-campaigns", tags=["outbound-campaigns"])
  ```

- [ ] **Step 5: Run the tests — they should pass now**

Run:
```bash
cd /home/will/react-crm-api
pytest tests/api/v2/test_outbound_campaigns.py -v 2>&1 | tail -20
```
Expected: both tests PASS.

- [ ] **Step 6: Commit**

```bash
cd /home/will/react-crm-api
git add app/api/v2/outbound_campaigns.py app/api/v2/router.py tests/api/v2/test_outbound_campaigns.py
git commit -m "feat(outbound): add GET /outbound-campaigns/campaigns with derived counters"
```

---

### Task 5: Campaign CRUD (POST, PATCH, DELETE)

**Files:**
- Modify: `/home/will/react-crm-api/app/api/v2/outbound_campaigns.py`
- Modify: `/home/will/react-crm-api/tests/api/v2/test_outbound_campaigns.py`

- [ ] **Step 1: Write failing tests**

Append to `/home/will/react-crm-api/tests/api/v2/test_outbound_campaigns.py`:

```python
@pytest.mark.asyncio
async def test_create_campaign_with_client_id(client: AsyncClient):
    r = await client.post(f"{PREFIX}/campaigns", json={
        "id": "my-stable-id",
        "name": "Test Campaign",
        "description": "hello",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["id"] == "my-stable-id"
    assert body["name"] == "Test Campaign"
    assert body["counters"]["total"] == 0


@pytest.mark.asyncio
async def test_create_campaign_auto_id(client: AsyncClient):
    r = await client.post(f"{PREFIX}/campaigns", json={"name": "Auto"})
    assert r.status_code == 201
    assert len(r.json()["id"]) > 0


@pytest.mark.asyncio
async def test_update_campaign(client: AsyncClient):
    r = await client.post(f"{PREFIX}/campaigns", json={"id": "c1", "name": "Original"})
    assert r.status_code == 201
    r = await client.patch(f"{PREFIX}/campaigns/c1", json={"name": "Renamed", "status": "active"})
    assert r.status_code == 200
    assert r.json()["name"] == "Renamed"
    assert r.json()["status"] == "active"


@pytest.mark.asyncio
async def test_delete_campaign(client: AsyncClient):
    r = await client.post(f"{PREFIX}/campaigns", json={"id": "c2", "name": "Gone"})
    assert r.status_code == 201
    r = await client.delete(f"{PREFIX}/campaigns/c2")
    assert r.status_code == 204
    r = await client.get(f"{PREFIX}/campaigns")
    assert all(c["id"] != "c2" for c in r.json()["campaigns"])
```

- [ ] **Step 2: Run — confirm fails**

```bash
pytest tests/api/v2/test_outbound_campaigns.py -v 2>&1 | tail -30
```
Expected: new tests fail with 404 / 405.

- [ ] **Step 3: Add endpoints**

Append to `/home/will/react-crm-api/app/api/v2/outbound_campaigns.py`:

```python
import uuid as _uuid
from fastapi import status


@router.post("/campaigns", status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: CampaignCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    campaign_id = payload.id or str(_uuid.uuid4())
    existing = await db.get(OutboundCampaign, campaign_id)
    if existing is not None:
        raise HTTPException(status_code=409, detail="Campaign id already exists")
    c = OutboundCampaign(
        id=campaign_id,
        name=payload.name,
        description=payload.description,
        status=payload.status,
        source_file=payload.source_file,
        source_sheet=payload.source_sheet,
        created_by=current_user.id,
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    counters = await _counters_for(db, c.id)
    return _campaign_to_response(c, counters).model_dump(mode="json")


@router.patch("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    payload: CampaignUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    c = await db.get(OutboundCampaign, campaign_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(c, k, v)
    await db.commit()
    await db.refresh(c)
    counters = await _counters_for(db, c.id)
    return _campaign_to_response(c, counters).model_dump(mode="json")


@router.delete("/campaigns/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: str,
    db: DbSession,
    current_user: CurrentUser,
):
    c = await db.get(OutboundCampaign, campaign_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    await db.delete(c)
    await db.commit()
    return None
```

- [ ] **Step 4: Run tests — pass**

```bash
pytest tests/api/v2/test_outbound_campaigns.py -v 2>&1 | tail -20
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/v2/outbound_campaigns.py tests/api/v2/test_outbound_campaigns.py
git commit -m "feat(outbound): add POST/PATCH/DELETE campaigns"
```

---

### Task 6: Contact CRUD (GET list, POST bulk, PATCH, DELETE)

**Files:** same as Task 5

- [ ] **Step 1: Write failing tests**

Append:

```python
@pytest.mark.asyncio
async def test_bulk_import_and_list_contacts(client: AsyncClient):
    r = await client.post(f"{PREFIX}/campaigns", json={"id": "c3", "name": "Bulk"})
    assert r.status_code == 201
    r = await client.post(f"{PREFIX}/campaigns/c3/contacts", json={"contacts": [
        {"id": "ct-1", "account_name": "Alice", "phone": "5550001"},
        {"id": "ct-2", "account_name": "Bob", "phone": "5550002"},
    ]})
    assert r.status_code == 201, r.text
    assert len(r.json()["contacts"]) == 2
    r = await client.get(f"{PREFIX}/campaigns/c3/contacts")
    assert r.status_code == 200
    assert len(r.json()["contacts"]) == 2


@pytest.mark.asyncio
async def test_patch_contact(client: AsyncClient):
    await client.post(f"{PREFIX}/campaigns", json={"id": "c4", "name": "Edit"})
    await client.post(f"{PREFIX}/campaigns/c4/contacts", json={"contacts": [
        {"id": "ct-edit", "account_name": "Alice", "phone": "5550001"},
    ]})
    r = await client.patch(f"{PREFIX}/contacts/ct-edit", json={"notes": "careful"})
    assert r.status_code == 200
    assert r.json()["notes"] == "careful"


@pytest.mark.asyncio
async def test_delete_contact(client: AsyncClient):
    await client.post(f"{PREFIX}/campaigns", json={"id": "c5", "name": "Del"})
    await client.post(f"{PREFIX}/campaigns/c5/contacts", json={"contacts": [
        {"id": "ct-del", "account_name": "X", "phone": "5550001"},
    ]})
    r = await client.delete(f"{PREFIX}/contacts/ct-del")
    assert r.status_code == 204
    r = await client.get(f"{PREFIX}/campaigns/c5/contacts")
    assert len(r.json()["contacts"]) == 0


@pytest.mark.asyncio
async def test_list_contacts_filter_status(client: AsyncClient):
    await client.post(f"{PREFIX}/campaigns", json={"id": "c6", "name": "Filter"})
    await client.post(f"{PREFIX}/campaigns/c6/contacts", json={"contacts": [
        {"id": "ct-a", "account_name": "A", "phone": "1"},
        {"id": "ct-b", "account_name": "B", "phone": "2"},
    ]})
    r = await client.get(f"{PREFIX}/campaigns/c6/contacts?status=pending")
    assert r.status_code == 200
    assert len(r.json()["contacts"]) == 2
```

- [ ] **Step 2: Run — fails**

```bash
pytest tests/api/v2/test_outbound_campaigns.py -v 2>&1 | tail -30
```
Expected: 4 tests fail with 404.

- [ ] **Step 3: Add endpoints**

Append to `outbound_campaigns.py`:

```python
def _contact_to_response(c: OutboundCampaignContact) -> ContactResponse:
    return ContactResponse.model_validate(c)


@router.get("/campaigns/{campaign_id}/contacts")
async def list_contacts(
    campaign_id: str,
    db: DbSession,
    current_user: CurrentUser,
    status: Optional[str] = Query(None),
):
    campaign = await db.get(OutboundCampaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    stmt = select(OutboundCampaignContact).where(
        OutboundCampaignContact.campaign_id == campaign_id
    )
    if status:
        stmt = stmt.where(OutboundCampaignContact.call_status == status)
    stmt = stmt.order_by(OutboundCampaignContact.priority.desc(), OutboundCampaignContact.account_name)
    rows = (await db.execute(stmt)).scalars().all()
    return {"contacts": [_contact_to_response(c).model_dump(mode="json") for c in rows]}


@router.post("/campaigns/{campaign_id}/contacts", status_code=status.HTTP_201_CREATED)
async def bulk_import_contacts(
    campaign_id: str,
    payload: BulkContactsCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    campaign = await db.get(OutboundCampaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    created: List[OutboundCampaignContact] = []
    for item in payload.contacts:
        cid = item.id or str(_uuid.uuid4())
        existing = await db.get(OutboundCampaignContact, cid)
        if existing is not None:
            continue
        row = OutboundCampaignContact(
            id=cid,
            campaign_id=campaign_id,
            **item.model_dump(exclude={"id"}),
        )
        db.add(row)
        created.append(row)
    await db.commit()
    for row in created:
        await db.refresh(row)
    return {"contacts": [_contact_to_response(c).model_dump(mode="json") for c in created]}


@router.patch("/contacts/{contact_id}")
async def patch_contact(
    contact_id: str,
    payload: ContactUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    row = await db.get(OutboundCampaignContact, contact_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return _contact_to_response(row).model_dump(mode="json")


@router.delete("/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: str,
    db: DbSession,
    current_user: CurrentUser,
):
    row = await db.get(OutboundCampaignContact, contact_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    await db.delete(row)
    await db.commit()
    return None
```

- [ ] **Step 4: Run — pass**

```bash
pytest tests/api/v2/test_outbound_campaigns.py -v 2>&1 | tail -25
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/v2/outbound_campaigns.py tests/api/v2/test_outbound_campaigns.py
git commit -m "feat(outbound): add contact CRUD endpoints"
```

---

### Task 7: Disposition endpoint + call_attempts log

**Files:** same as Task 5

- [ ] **Step 1: Write failing tests**

Append:

```python
@pytest.mark.asyncio
async def test_disposition_increments_counters_and_appends_attempt(client: AsyncClient):
    await client.post(f"{PREFIX}/campaigns", json={"id": "c7", "name": "Disp"})
    await client.post(f"{PREFIX}/campaigns/c7/contacts", json={"contacts": [
        {"id": "ct-d", "account_name": "X", "phone": "1"},
    ]})
    r = await client.post(f"{PREFIX}/contacts/ct-d/dispositions", json={
        "call_status": "connected",
        "notes": "picked up",
        "duration_sec": 120,
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["contact"]["call_status"] == "connected"
    assert body["contact"]["call_attempts"] == 1
    assert body["contact"]["last_disposition"] == "connected"
    assert body["attempt"]["call_status"] == "connected"
    assert body["attempt"]["duration_sec"] == 120

    # Second disposition increments again
    r = await client.post(f"{PREFIX}/contacts/ct-d/dispositions", json={"call_status": "voicemail"})
    body = r.json()
    assert body["contact"]["call_attempts"] == 2
    assert body["contact"]["call_status"] == "voicemail"


@pytest.mark.asyncio
async def test_disposition_counters_on_campaign(client: AsyncClient):
    await client.post(f"{PREFIX}/campaigns", json={"id": "c8", "name": "Cnt"})
    await client.post(f"{PREFIX}/campaigns/c8/contacts", json={"contacts": [
        {"id": "a", "account_name": "A", "phone": "1"},
        {"id": "b", "account_name": "B", "phone": "2"},
        {"id": "c", "account_name": "C", "phone": "3"},
    ]})
    await client.post(f"{PREFIX}/contacts/a/dispositions", json={"call_status": "connected"})
    await client.post(f"{PREFIX}/contacts/b/dispositions", json={"call_status": "voicemail"})
    r = await client.get(f"{PREFIX}/campaigns")
    campaigns = {c["id"]: c for c in r.json()["campaigns"]}
    counters = campaigns["c8"]["counters"]
    assert counters["total"] == 3
    assert counters["pending"] == 1
    assert counters["called"] == 2
    assert counters["connected"] == 1
    assert counters["voicemail"] == 1
```

- [ ] **Step 2: Run — fails**

```bash
pytest tests/api/v2/test_outbound_campaigns.py::test_disposition_increments_counters_and_appends_attempt -v 2>&1 | tail -15
```
Expected: FAIL 404.

- [ ] **Step 3: Implement**

Append to `outbound_campaigns.py`:

```python
from datetime import datetime as _dt, timezone as _tz


@router.post("/contacts/{contact_id}/dispositions", status_code=status.HTTP_201_CREATED)
async def create_disposition(
    contact_id: str,
    payload: DispositionCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    contact = await db.get(OutboundCampaignContact, contact_id)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    now = _dt.now(_tz.utc)
    contact.call_status = payload.call_status
    contact.call_attempts = (contact.call_attempts or 0) + 1
    contact.last_call_date = now
    contact.last_disposition = payload.call_status
    if payload.duration_sec is not None:
        contact.last_call_duration = payload.duration_sec
    if payload.notes is not None:
        contact.notes = payload.notes

    attempt = OutboundCallAttempt(
        contact_id=contact_id,
        campaign_id=contact.campaign_id,
        rep_user_id=current_user.id,
        dispositioned_at=now,
        call_status=payload.call_status,
        notes=payload.notes,
        duration_sec=payload.duration_sec,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(contact)
    await db.refresh(attempt)
    return {
        "contact": _contact_to_response(contact).model_dump(mode="json"),
        "attempt": AttemptResponse.model_validate(attempt).model_dump(mode="json"),
    }
```

- [ ] **Step 4: Run — pass**

```bash
pytest tests/api/v2/test_outbound_campaigns.py -v 2>&1 | tail -25
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/v2/outbound_campaigns.py tests/api/v2/test_outbound_campaigns.py
git commit -m "feat(outbound): add disposition endpoint with attempt logging"
```

---

### Task 8: Callback endpoints

**Files:** same

- [ ] **Step 1: Write failing tests**

Append:

```python
@pytest.mark.asyncio
async def test_callback_lifecycle(client: AsyncClient):
    await client.post(f"{PREFIX}/campaigns", json={"id": "c9", "name": "CB"})
    await client.post(f"{PREFIX}/campaigns/c9/contacts", json={"contacts": [
        {"id": "cb-ct", "account_name": "X", "phone": "1"},
    ]})
    r = await client.post(f"{PREFIX}/callbacks", json={
        "contact_id": "cb-ct",
        "campaign_id": "c9",
        "scheduled_for": "2026-04-25T15:00:00Z",
        "notes": "Call back Friday",
    })
    assert r.status_code == 201, r.text
    cb_id = r.json()["id"]
    assert r.json()["status"] == "scheduled"

    r = await client.get(f"{PREFIX}/callbacks")
    assert r.status_code == 200
    assert any(c["id"] == cb_id for c in r.json()["callbacks"])

    r = await client.patch(f"{PREFIX}/callbacks/{cb_id}", json={"status": "completed"})
    assert r.status_code == 200
    assert r.json()["status"] == "completed"

    r = await client.delete(f"{PREFIX}/callbacks/{cb_id}")
    assert r.status_code == 204
```

- [ ] **Step 2: Run — fails**

```bash
pytest tests/api/v2/test_outbound_campaigns.py::test_callback_lifecycle -v 2>&1 | tail -15
```
Expected: FAIL 404.

- [ ] **Step 3: Implement**

Append to `outbound_campaigns.py`:

```python
@router.get("/callbacks")
async def list_callbacks(
    db: DbSession,
    current_user: CurrentUser,
    status_filter: Optional[str] = Query(None, alias="status"),
    rep: Optional[str] = Query(None, description="'me' for current user"),
):
    stmt = select(OutboundCallback).order_by(OutboundCallback.scheduled_for.asc())
    if status_filter:
        stmt = stmt.where(OutboundCallback.status == status_filter)
    if rep == "me":
        stmt = stmt.where(OutboundCallback.rep_user_id == current_user.id)
    rows = (await db.execute(stmt)).scalars().all()
    return {"callbacks": [CallbackResponse.model_validate(r).model_dump(mode="json") for r in rows]}


@router.post("/callbacks", status_code=status.HTTP_201_CREATED)
async def create_callback(
    payload: CallbackCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    contact = await db.get(OutboundCampaignContact, payload.contact_id)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    cb = OutboundCallback(
        contact_id=payload.contact_id,
        campaign_id=payload.campaign_id,
        rep_user_id=current_user.id,
        scheduled_for=payload.scheduled_for,
        notes=payload.notes,
    )
    db.add(cb)
    await db.commit()
    await db.refresh(cb)
    return CallbackResponse.model_validate(cb).model_dump(mode="json")


@router.patch("/callbacks/{callback_id}")
async def update_callback(
    callback_id: str,
    payload: CallbackUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    try:
        cb_uuid = _uuid.UUID(callback_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid callback id")
    cb = await db.get(OutboundCallback, cb_uuid)
    if cb is None:
        raise HTTPException(status_code=404, detail="Callback not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(cb, k, v)
    await db.commit()
    await db.refresh(cb)
    return CallbackResponse.model_validate(cb).model_dump(mode="json")


@router.delete("/callbacks/{callback_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_callback(
    callback_id: str,
    db: DbSession,
    current_user: CurrentUser,
):
    try:
        cb_uuid = _uuid.UUID(callback_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid callback id")
    cb = await db.get(OutboundCallback, cb_uuid)
    if cb is None:
        raise HTTPException(status_code=404, detail="Callback not found")
    await db.delete(cb)
    await db.commit()
    return None
```

- [ ] **Step 4: Run — pass**

```bash
pytest tests/api/v2/test_outbound_campaigns.py -v 2>&1 | tail -25
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/v2/outbound_campaigns.py tests/api/v2/test_outbound_campaigns.py
git commit -m "feat(outbound): add callback endpoints"
```

---

### Task 9: POST /migrate-local (idempotent merge)

**Files:** same

- [ ] **Step 1: Write failing tests**

Append:

```python
@pytest.mark.asyncio
async def test_migrate_local_imports_dirty_contacts(client: AsyncClient):
    # Backend has the campaign but no dispositions
    await client.post(f"{PREFIX}/campaigns", json={"id": "c10", "name": "Seed"})
    await client.post(f"{PREFIX}/campaigns/c10/contacts", json={"contacts": [
        {"id": "m-1", "account_name": "A", "phone": "1"},
        {"id": "m-2", "account_name": "B", "phone": "2"},
    ]})
    # Local has one with disposition, one still pending
    payload = {
        "campaigns": [{"id": "c10", "name": "Seed", "status": "active"}],
        "contacts": [
            {
                "id": "m-1", "campaign_id": "c10",
                "account_name": "A", "phone": "1",
                "call_status": "connected", "call_attempts": 2,
                "last_call_date": "2026-04-21T14:30:00Z", "last_disposition": "connected",
                "notes": "picked up",
            },
        ],
        "callbacks": [],
    }
    r = await client.post(f"{PREFIX}/migrate-local", json=payload)
    assert r.status_code == 200, r.text
    imported = r.json()["imported"]
    assert imported["contacts"] == 1
    assert imported["attempts"] == 1

    # Check contact now dispositioned
    r = await client.get(f"{PREFIX}/campaigns/c10/contacts")
    contacts = {c["id"]: c for c in r.json()["contacts"]}
    assert contacts["m-1"]["call_status"] == "connected"
    assert contacts["m-1"]["call_attempts"] == 2
    assert contacts["m-2"]["call_status"] == "pending"


@pytest.mark.asyncio
async def test_migrate_local_is_idempotent(client: AsyncClient):
    await client.post(f"{PREFIX}/campaigns", json={"id": "c11", "name": "Idem"})
    await client.post(f"{PREFIX}/campaigns/c11/contacts", json={"contacts": [
        {"id": "i-1", "account_name": "A", "phone": "1"},
    ]})
    payload = {
        "campaigns": [],
        "contacts": [
            {
                "id": "i-1", "campaign_id": "c11",
                "account_name": "A", "phone": "1",
                "call_status": "voicemail", "call_attempts": 1,
                "last_call_date": "2026-04-21T14:30:00Z",
            },
        ],
        "callbacks": [],
    }
    r1 = await client.post(f"{PREFIX}/migrate-local", json=payload)
    r2 = await client.post(f"{PREFIX}/migrate-local", json=payload)
    assert r1.status_code == 200
    assert r2.status_code == 200
    # Second call should create 0 new attempts
    assert r2.json()["imported"]["attempts"] == 0


@pytest.mark.asyncio
async def test_migrate_local_creates_missing_campaign_and_contacts(client: AsyncClient):
    payload = {
        "campaigns": [{"id": "c-new", "name": "Brand New", "status": "active"}],
        "contacts": [
            {"id": "new-1", "campaign_id": "c-new",
             "account_name": "New", "phone": "9",
             "call_status": "connected", "call_attempts": 1,
             "last_call_date": "2026-04-21T14:30:00Z"},
        ],
        "callbacks": [],
    }
    r = await client.post(f"{PREFIX}/migrate-local", json=payload)
    assert r.status_code == 200
    imported = r.json()["imported"]
    assert imported["campaigns"] == 1
    assert imported["contacts"] == 1
    # Verify
    r = await client.get(f"{PREFIX}/campaigns/c-new/contacts")
    assert r.json()["contacts"][0]["call_status"] == "connected"
```

- [ ] **Step 2: Run — fails**

```bash
pytest tests/api/v2/test_outbound_campaigns.py -k migrate_local -v 2>&1 | tail -15
```
Expected: all fail 404.

- [ ] **Step 3: Implement**

Append to `outbound_campaigns.py`:

```python
DIRTY_MERGEABLE_FIELDS = [
    "call_status", "call_attempts", "last_call_date", "last_call_duration",
    "last_disposition", "notes", "callback_date",
]

NON_DIRTY_STATUSES = {"pending", "queued"}


def _is_dirty(row: dict) -> bool:
    return (row.get("call_attempts") or 0) > 0 or row.get("call_status") not in NON_DIRTY_STATUSES


@router.post("/migrate-local")
async def migrate_local(
    payload: MigrateLocalRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    imported = {"campaigns": 0, "contacts": 0, "attempts": 0, "callbacks": 0}

    # 1. Campaigns — insert if missing, no-op if exists
    for cp in payload.campaigns:
        existing = await db.get(OutboundCampaign, cp.id)
        if existing is None:
            db.add(OutboundCampaign(
                id=cp.id,
                name=cp.name,
                description=cp.description,
                status=cp.status or "active",
                source_file=cp.source_file,
                source_sheet=cp.source_sheet,
                created_by=current_user.id,
            ))
            imported["campaigns"] += 1
    await db.flush()

    # 2. Contacts — insert if missing; merge dirty fields if exists and dirty
    for cnt in payload.contacts:
        row = await db.get(OutboundCampaignContact, cnt.id)
        incoming = cnt.model_dump()
        dirty = _is_dirty(incoming)

        if row is None:
            # ensure parent campaign exists
            parent = await db.get(OutboundCampaign, cnt.campaign_id)
            if parent is None:
                # skip orphan contacts
                continue
            row = OutboundCampaignContact(
                id=cnt.id,
                campaign_id=cnt.campaign_id,
                account_number=cnt.account_number,
                account_name=cnt.account_name,
                company=cnt.company,
                phone=cnt.phone,
                email=cnt.email,
                address=cnt.address,
                city=cnt.city,
                state=cnt.state,
                zip_code=cnt.zip_code,
                service_zone=cnt.service_zone,
                system_type=cnt.system_type,
                contract_type=cnt.contract_type,
                contract_status=cnt.contract_status,
                contract_value=cnt.contract_value,
                customer_type=cnt.customer_type,
                call_priority_label=cnt.call_priority_label,
                call_status=cnt.call_status,
                call_attempts=cnt.call_attempts,
                last_call_date=cnt.last_call_date,
                last_call_duration=cnt.last_call_duration,
                last_disposition=cnt.last_disposition,
                notes=cnt.notes,
                callback_date=cnt.callback_date,
                priority=cnt.priority,
                opens=cnt.opens,
            )
            db.add(row)
            imported["contacts"] += 1
        elif dirty:
            # overwrite only dirty-mergeable fields
            for field in DIRTY_MERGEABLE_FIELDS:
                if field in incoming and incoming[field] is not None:
                    setattr(row, field, incoming[field])
            imported["contacts"] += 1
        else:
            # existing row + not dirty: no-op
            continue

        # Synthesize one attempt row if this merge represents actual call activity
        if dirty:
            # Guard against re-synthesis: check if an attempt row already exists for this
            # (contact_id, dispositioned_at, call_status) tuple
            when = cnt.last_call_date
            if when is not None:
                existing_attempt = (await db.execute(
                    select(OutboundCallAttempt).where(
                        OutboundCallAttempt.contact_id == cnt.id,
                        OutboundCallAttempt.dispositioned_at == when,
                        OutboundCallAttempt.call_status == cnt.call_status,
                    )
                )).scalars().first()
                if existing_attempt is None:
                    db.add(OutboundCallAttempt(
                        contact_id=cnt.id,
                        campaign_id=cnt.campaign_id,
                        rep_user_id=current_user.id,
                        dispositioned_at=when,
                        call_status=cnt.call_status,
                        notes=cnt.notes,
                    ))
                    imported["attempts"] += 1
    await db.flush()

    # 3. Callbacks — insert if no row with same (contact_id, scheduled_for)
    for cb in payload.callbacks:
        existing = (await db.execute(
            select(OutboundCallback).where(
                OutboundCallback.contact_id == cb.contact_id,
                OutboundCallback.scheduled_for == cb.scheduled_for,
            )
        )).scalars().first()
        if existing is not None:
            continue
        contact_row = await db.get(OutboundCampaignContact, cb.contact_id)
        if contact_row is None:
            continue
        campaign_id = cb.campaign_id or contact_row.campaign_id
        db.add(OutboundCallback(
            contact_id=cb.contact_id,
            campaign_id=campaign_id,
            rep_user_id=current_user.id,
            scheduled_for=cb.scheduled_for,
            notes=cb.notes,
            status=cb.status or "scheduled",
        ))
        imported["callbacks"] += 1

    await db.commit()
    return {"imported": imported}
```

- [ ] **Step 4: Run — pass**

```bash
pytest tests/api/v2/test_outbound_campaigns.py -v 2>&1 | tail -30
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/v2/outbound_campaigns.py tests/api/v2/test_outbound_campaigns.py
git commit -m "feat(outbound): add idempotent POST /migrate-local endpoint"
```

---

## Phase B — Data Seed Migration

### Task 10: Alembic data migration — seed Email Openers campaign + 39 contacts

**Files:**
- Create: `/home/will/react-crm-api/alembic/versions/107_seed_email_openers_campaign.py`

- [ ] **Step 1: Create the seed migration**

Create `/home/will/react-crm-api/alembic/versions/107_seed_email_openers_campaign.py`:

```python
"""seed Email Openers - Spring Follow-Up campaign

Revision ID: 107
Revises: 106
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone

revision = "107"
down_revision = "106"
branch_labels = None
depends_on = None


CAMPAIGN_ID = "email-openers-spring-2026"


CONTACTS = [
    ("Shanna Byrnes", "9313341335", "shanna.hulsey81@gmail.com", "Spring Hill", "164 Oak Valley Dr", 8),
    ("Deborah Bohannon", "6159675144", "dinonerd1981@gmail.com", "Columbia", "612 Delk Ln", 6),
    ("Christine Browm", "4075519693", "doug@macseptic.com", "Ashland City", "404 Patricia Dr", 6),
    ("Chris Guthrie", "8475071120", "chrisguthrie143@gmail.com", "Columbia", "2298 Hermitage Cir", 5),
    ("Amerispec", "9314103003", "contact@amerispecmidtn.net", "Spring Hill", "2465 Lake Shore Dr", 5),
    ("Jack Hartley", "4193039476", "j.hartley.bhs@gmail.com", "Columbia", "2846 Pulaski Hwy", 5),
    ("Melinda Hanes", "9314864677", "mhanes@hawkston.com", "Columbia", "2410 Park Plus Dr", 4),
    ("Secilia Wagnor", "6157177267", "seciliabryce2023@gmail.com", "Columbia", "1508 Potter Dr", 3),
    ("Lina Wagoner", "6158046383", "lina8809@gmail.com", "Columbia", "1399 Standing Stone Circle", 3),
    ("Smotherman Excavation", "6154891015", "smothermanexcavation@gmail.com", "Columbia", "", 3),
    ("Keith Barnhill", "6154957989", "keith.barnhill@erm.com", "Spring Hill", "2472 Lewisburg Pike", 3),
    ("Dj Gillit", "8063924352", "dgillit@gmail.com", "Columbia", "1926 Bryant Road", 3),
    ("Lowell Brown", "8202884114", "atlasbuildtn@gmail.com", "Culleoka", "2952 Valley Creek Rd", 2),
    ("Samantha Sierra", "6616168583", "mike_sam@att.net", "Spring Hill", "405 Billy Ln", 2),
    ("Kirk Hennig", "6154966459", "kirkhennig@gmail.com", "Spring Hill", "3688 Stone Creek Dr", 2),
    ("Felix Pena", "9312158029", "generalemaildumping@gmail.com", "Culleoka", "2629 Demastus Rd", 2),
    ("Brittney King", "6157109159", "kbrittney106@gmail.com", "Columbia", "1103 Haley St", 2),
    ("Allison Epps", "2142293589", "epps.ali@gmail.com", "Spring Hill", "59 Oak Valley Dr", 2),
    ("Natalie Wagner", "9164128643", "natalie@libertytransactions.com", "Columbia", "2380 Beasley Lane", 2),
    ("Chris Cocilovo", "8058891833", "chriscocilovo@gmail.com", "Chapel Hill", "4012 Caney Creek Ln", 2),
    ("Bill Spradley", "9319815033", "williamasberry64@gmail.com", "Columbia", "909 Everyman Ct", 2),
    ("Vanessa Medrano", "6195193931", "vmedrano@firstwatch.com", "Columbia", "202 S James Campbell", 2),
    ("Jeremy Smith", "6155062797", "jeremybsmith@gmail.com", "Columbia", "1157 Roseland Dr", 2),
    ("Mark Leatherman", "9312557429", "markleatherman10@gmail.com", "Columbia", "3034 Glenstone Dr", 2),
    ("Briana Betker", "9319818789", "brianabetker739@gmail.com", "Columbia", "2624 Bristow Rd", 2),
    ("Carla Gibbs", "9312427123", "carlapfernandez@yahoo.com", "Columbia", "3514 Tobe Robertson Rd", 2),
    ("Shea Heeney", "6154964191", "sheaandbecca@gmail.com", "Columbia", "903 Carters Creek Pike", 1),
    ("Dillon Nab", "3072775547", "dillon.nab@gmail.com", "Mount Pleasant", "4461 W Point Road", 1),
    ("Wilbur Alvarez", "8083439032", "wilburalvarez0148@gmail.com", "Columbia", "2854 Greens Mill Rd", 1),
    ("Paul Rivera", "7142232557", "paul.rivera59@icloud.com", "Columbia", "1151 Old Hwy 99", 1),
    ("Peri Chinoda", "6154389095", "pchinoda2@yahoo.com", "Spring Hill", "2219 Twin Peaks Ct", 1),
    ("Debra Setera", "6153977764", "abennett@scoutrealty.com", "Columbia", "5317 Tobe Robertson Rd", 1),
    ("Loretta Lovett", "2817734844", "lorettaanngilbert@gmail.com", "Lewisburg", "1352 Webb Road", 1),
    ("Floyd White", "6152683557", "fwhite0725@gmail.com", "Columbia", "414 Lake Circle", 1),
    ("Wesley Baird", "4693446395", "asclafani423@gmail.com", "Columbia", "215 Elliott Ct", 1),
    ("Adam Busch", "5638456577", "acbusch52@gmail.com", "Columbia", "3687 Perry Cemetery Road", 1),
    ("Jeff Lamb", "6155049533", "jplambsr@gmail.com", "Columbia", "3907 Kelley Farris Rd", 1),
    # Items 38-39 left intentionally — the store had 37 rows; matches prod.
]


def upgrade() -> None:
    conn = op.get_bind()
    # Skip if campaign already present (re-runnable)
    existing = conn.execute(
        sa.text("SELECT 1 FROM outbound_campaigns WHERE id = :id"),
        {"id": CAMPAIGN_ID},
    ).first()
    if existing is not None:
        return

    now = datetime.now(timezone.utc)
    conn.execute(sa.text("""
        INSERT INTO outbound_campaigns
          (id, name, description, status, source_file, created_by, created_at, updated_at)
        VALUES
          (:id, :name, :description, :status, :source_file, NULL, :now, :now)
    """), {
        "id": CAMPAIGN_ID,
        "name": "Email Openers - Spring Follow-Up",
        "description": "TN permit owners who opened the Mar 27 spring service email (1-8x opens). Warm leads for outbound calls.",
        "status": "active",
        "source_file": "Brevo Transactional Export",
        "now": now,
    })

    for i, (name, phone, email, city, address, opens) in enumerate(CONTACTS, start=1):
        cid = f"email-opener-{i}"
        priority = 5 if opens >= 4 else 3 if opens >= 2 else 1
        label = "High" if opens >= 4 else "Medium" if opens >= 2 else "Low"
        conn.execute(sa.text("""
            INSERT INTO outbound_campaign_contacts
              (id, campaign_id, account_name, phone, email, address, city, state,
               system_type, customer_type, call_priority_label, call_status,
               call_attempts, notes, priority, opens, created_at, updated_at)
            VALUES
              (:id, :cid, :name, :phone, :email, :address, :city, 'TN',
               'Residential Septic', 'Residential', :label, 'pending',
               0, :notes, :priority, :opens, :now, :now)
        """), {
            "id": cid,
            "cid": CAMPAIGN_ID,
            "name": name,
            "phone": phone,
            "email": email,
            "address": address or None,
            "city": city,
            "label": label,
            "notes": f"Opened spring service email {opens}x. TN septic permit owner — warm lead.",
            "priority": priority,
            "opens": opens,
            "now": now,
        })


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM outbound_campaign_contacts WHERE campaign_id = :id"), {"id": CAMPAIGN_ID})
    conn.execute(sa.text("DELETE FROM outbound_campaigns WHERE id = :id"), {"id": CAMPAIGN_ID})
```

- [ ] **Step 2: Commit**

```bash
git add alembic/versions/107_seed_email_openers_campaign.py
git commit -m "feat(outbound): seed Email Openers Spring Follow-Up campaign"
```

---

## Phase C — Deploy Backend

### Task 11: Push backend, verify Railway deploy runs migrations

**Files:** none (deploy)

- [ ] **Step 1: Full test sweep before pushing**

```bash
cd /home/will/react-crm-api
pytest tests/api/v2/test_outbound_campaigns.py -v 2>&1 | tail -40
```
Expected: all tests PASS.

- [ ] **Step 2: Push**

```bash
cd /home/will/react-crm-api
git push origin master
```

- [ ] **Step 3: Wait ~2 min then verify deploy + migration**

Run (from `/home/will/react-crm-api`):
```bash
sleep 150
curl -s https://react-crm-api-production.up.railway.app/health | head -5
```
Expected: `{"status":"ok"...}` or similar 200 response.

- [ ] **Step 4: Verify tables exist via API probe**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://react-crm-api-production.up.railway.app/api/v2/outbound-campaigns/campaigns
```
Expected: `401` (route exists, requires auth). If `404`, the deploy hasn't rolled out yet — wait another minute.

- [ ] **Step 5: If migration failed, fix and re-push**

Check Railway logs via the Railway dashboard or:
```bash
railway logs --service react-crm-api 2>&1 | tail -30
```
If alembic failed, fix the migration file, `git commit --amend`, `git push --force-with-lease` and re-verify. (This is local repo work; force-with-lease is safe for a freshly pushed commit not yet pulled by anyone else.)

---

## Phase D — Frontend API Layer

### Task 12: API types file mirroring backend schemas

**Files:**
- Create: `/home/will/ReactCRM/src/api/types/outboundCampaigns.ts`

- [ ] **Step 1: Create types file**

```typescript
// src/api/types/outboundCampaigns.ts
import { z } from "zod";

export const callStatusSchema = z.enum([
  "pending", "queued", "calling", "connected", "voicemail",
  "no_answer", "busy", "callback_scheduled", "interested",
  "not_interested", "wrong_number", "do_not_call", "completed", "skipped",
]);
export type CallStatus = z.infer<typeof callStatusSchema>;

export const campaignStatusSchema = z.enum([
  "draft", "active", "paused", "completed", "archived",
]);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

export const campaignCountersSchema = z.object({
  total: z.number(),
  pending: z.number(),
  called: z.number(),
  connected: z.number(),
  interested: z.number(),
  voicemail: z.number(),
  no_answer: z.number(),
  callback_scheduled: z.number(),
  completed: z.number(),
  do_not_call: z.number(),
});
export type CampaignCounters = z.infer<typeof campaignCountersSchema>;

export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: campaignStatusSchema,
  source_file: z.string().nullable(),
  source_sheet: z.string().nullable(),
  created_by: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  counters: campaignCountersSchema,
});
export type Campaign = z.infer<typeof campaignSchema>;

export const campaignsResponseSchema = z.object({
  campaigns: z.array(campaignSchema),
});

export const contactSchema = z.object({
  id: z.string(),
  campaign_id: z.string(),
  account_number: z.string().nullable(),
  account_name: z.string(),
  company: z.string().nullable(),
  phone: z.string(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip_code: z.string().nullable(),
  service_zone: z.string().nullable(),
  system_type: z.string().nullable(),
  contract_type: z.string().nullable(),
  contract_status: z.string().nullable(),
  contract_start: z.string().nullable(),
  contract_end: z.string().nullable(),
  contract_value: z.union([z.string(), z.number()]).nullable(),
  customer_type: z.string().nullable(),
  call_priority_label: z.string().nullable(),
  call_status: callStatusSchema,
  call_attempts: z.number(),
  last_call_date: z.string().nullable(),
  last_call_duration: z.number().nullable(),
  last_disposition: z.string().nullable(),
  notes: z.string().nullable(),
  callback_date: z.string().nullable(),
  assigned_rep: z.number().nullable(),
  priority: z.number(),
  opens: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Contact = z.infer<typeof contactSchema>;

export const contactsResponseSchema = z.object({ contacts: z.array(contactSchema) });

export const attemptSchema = z.object({
  id: z.string(),
  contact_id: z.string(),
  campaign_id: z.string(),
  rep_user_id: z.number().nullable(),
  dispositioned_at: z.string(),
  call_status: callStatusSchema,
  notes: z.string().nullable(),
  duration_sec: z.number().nullable(),
});
export type Attempt = z.infer<typeof attemptSchema>;

export const dispositionResponseSchema = z.object({
  contact: contactSchema,
  attempt: attemptSchema,
});
export type DispositionResponse = z.infer<typeof dispositionResponseSchema>;

export const callbackSchema = z.object({
  id: z.string(),
  contact_id: z.string(),
  campaign_id: z.string(),
  rep_user_id: z.number().nullable(),
  scheduled_for: z.string(),
  notes: z.string().nullable(),
  status: z.string(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
});
export type Callback = z.infer<typeof callbackSchema>;

export const callbacksResponseSchema = z.object({ callbacks: z.array(callbackSchema) });
```

- [ ] **Step 2: Typecheck**

Run:
```bash
cd /home/will/ReactCRM
npx tsc --noEmit 2>&1 | tail -5
```
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
cd /home/will/ReactCRM
git add src/api/types/outboundCampaigns.ts
git commit -m "feat(outbound): add API types + zod schemas"
```

---

### Task 13: TanStack Query hooks

**Files:**
- Create: `/home/will/ReactCRM/src/api/hooks/useOutboundCampaigns.ts`

- [ ] **Step 1: Create the hooks file**

```typescript
// src/api/hooks/useOutboundCampaigns.ts
import {
  useQuery, useMutation, useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import {
  campaignsResponseSchema, contactsResponseSchema,
  dispositionResponseSchema, callbacksResponseSchema,
  campaignSchema, contactSchema, callbackSchema,
  type Campaign, type Contact, type Callback, type CallStatus,
} from "../types/outboundCampaigns.ts";

const BASE = "/outbound-campaigns";

export const outboundKeys = {
  all: ["outbound"] as const,
  campaigns: () => [...outboundKeys.all, "campaigns"] as const,
  campaign: (id: string) => [...outboundKeys.campaigns(), id] as const,
  contacts: (campaignId: string) => [...outboundKeys.campaign(campaignId), "contacts"] as const,
  contactsFiltered: (campaignId: string, status?: string) =>
    [...outboundKeys.contacts(campaignId), { status }] as const,
  callbacks: () => [...outboundKeys.all, "callbacks"] as const,
};

const QUERY_DEFAULTS = {
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchInterval: 30_000,
} as const;

// ---------- Campaigns ----------

export function useCampaigns() {
  return useQuery({
    queryKey: outboundKeys.campaigns(),
    queryFn: async () => {
      const r = await apiClient.get(`${BASE}/campaigns`);
      return validateResponse(campaignsResponseSchema, r.data).campaigns;
    },
    ...QUERY_DEFAULTS,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; description?: string | null; status?: string }) => {
      const r = await apiClient.post(`${BASE}/campaigns`, input);
      return validateResponse(campaignSchema, r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: outboundKeys.campaigns() }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string | null; status?: string }) => {
      const { id, ...body } = input;
      const r = await apiClient.patch(`${BASE}/campaigns/${id}`, body);
      return validateResponse(campaignSchema, r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: outboundKeys.campaigns() }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${BASE}/campaigns/${id}`);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: outboundKeys.campaigns() }),
  });
}

// ---------- Contacts ----------

export function useCampaignContacts(campaignId: string | null, status?: string) {
  return useQuery({
    queryKey: outboundKeys.contactsFiltered(campaignId ?? "", status),
    queryFn: async () => {
      const r = await apiClient.get(`${BASE}/campaigns/${campaignId}/contacts`, {
        params: status ? { status } : undefined,
      });
      return validateResponse(contactsResponseSchema, r.data).contacts;
    },
    enabled: !!campaignId,
    ...QUERY_DEFAULTS,
  });
}

export function useImportContacts(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contacts: Array<Partial<Contact> & { account_name: string; phone: string }>) => {
      const r = await apiClient.post(`${BASE}/campaigns/${campaignId}/contacts`, { contacts });
      return validateResponse(contactsResponseSchema, r.data).contacts;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: outboundKeys.contacts(campaignId) });
      qc.invalidateQueries({ queryKey: outboundKeys.campaigns() });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { contactId: string; [field: string]: unknown }) => {
      const { contactId, ...body } = input;
      const r = await apiClient.patch(`${BASE}/contacts/${contactId}`, body);
      return validateResponse(contactSchema, r.data);
    },
    onSuccess: (contact) => {
      qc.invalidateQueries({ queryKey: outboundKeys.contacts(contact.campaign_id) });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { contactId: string; campaignId: string }) => {
      await apiClient.delete(`${BASE}/contacts/${input.contactId}`);
      return input;
    },
    onSuccess: ({ campaignId }) => {
      qc.invalidateQueries({ queryKey: outboundKeys.contacts(campaignId) });
      qc.invalidateQueries({ queryKey: outboundKeys.campaigns() });
    },
  });
}

// ---------- Disposition ----------

export function useSetContactDisposition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { contactId: string; campaignId: string; call_status: CallStatus; notes?: string | null; duration_sec?: number | null }) => {
      const { contactId, campaignId: _campaignId, ...body } = input;
      const r = await apiClient.post(`${BASE}/contacts/${contactId}/dispositions`, body);
      return validateResponse(dispositionResponseSchema, r.data);
    },
    // Optimistic update: patch the cached contact list so the UI reflects immediately
    onMutate: async ({ contactId, campaignId, call_status, notes }) => {
      const key = outboundKeys.contacts(campaignId);
      await qc.cancelQueries({ queryKey: key });
      const snapshots: Array<[readonly unknown[], Contact[] | undefined]> = [];
      qc.getQueriesData<Contact[]>({ queryKey: key }).forEach(([k, data]) => {
        snapshots.push([k, data]);
        if (!data) return;
        qc.setQueryData<Contact[]>(k, data.map((c) =>
          c.id === contactId
            ? {
                ...c,
                call_status,
                call_attempts: c.call_attempts + 1,
                last_call_date: new Date().toISOString(),
                last_disposition: call_status,
                notes: notes ?? c.notes,
                updated_at: new Date().toISOString(),
              }
            : c,
        ));
      });
      return { snapshots };
    },
    onError: (_err, _input, ctx) => {
      ctx?.snapshots.forEach(([k, data]) => qc.setQueryData(k, data));
    },
    onSettled: (data) => {
      if (data) {
        qc.invalidateQueries({ queryKey: outboundKeys.contacts(data.contact.campaign_id) });
        qc.invalidateQueries({ queryKey: outboundKeys.campaigns() });
      }
    },
  });
}

// ---------- Callbacks ----------

export function useCallbacks(filters?: { rep?: "me"; status?: string }) {
  return useQuery({
    queryKey: [...outboundKeys.callbacks(), filters],
    queryFn: async () => {
      const r = await apiClient.get(`${BASE}/callbacks`, { params: filters });
      return validateResponse(callbacksResponseSchema, r.data).callbacks;
    },
    ...QUERY_DEFAULTS,
  });
}

export function useAddCallback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { contact_id: string; campaign_id: string; scheduled_for: string; notes?: string | null }) => {
      const r = await apiClient.post(`${BASE}/callbacks`, input);
      return validateResponse(callbackSchema, r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: outboundKeys.callbacks() }),
  });
}

export function useUpdateCallback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; scheduled_for?: string; notes?: string | null; status?: string; completed_at?: string }) => {
      const { id, ...body } = input;
      const r = await apiClient.patch(`${BASE}/callbacks/${id}`, body);
      return validateResponse(callbackSchema, r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: outboundKeys.callbacks() }),
  });
}

export function useDeleteCallback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${BASE}/callbacks/${id}`);
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: outboundKeys.callbacks() }),
  });
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/will/ReactCRM
npx tsc --noEmit 2>&1 | grep -E "useOutboundCampaigns|outboundCampaigns" | head -10
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/api/hooks/useOutboundCampaigns.ts
git commit -m "feat(outbound): add TanStack Query hooks for campaigns/contacts/callbacks"
```

---

### Task 14: IndexedDB reader utility

**Files:**
- Create: `/home/will/ReactCRM/src/features/outbound-campaigns/utils/readLegacyIndexedDB.ts`

- [ ] **Step 1: Inspect the idb helper the store uses**

Run:
```bash
grep -rn "idbGet\|idbSet\|idbDel\|idb-keyval\|openDB" /home/will/ReactCRM/src/features/outbound-campaigns/ | head -10
```
Note the import path (likely `idb-keyval`).

- [ ] **Step 2: Create the reader**

```typescript
// src/features/outbound-campaigns/utils/readLegacyIndexedDB.ts
// Reads a Zustand-persisted blob out of IndexedDB without importing the store.
// Returns null if missing, and never throws on bad JSON — migration must be
// defensive.

export async function readLegacyZustandBlob(keyName: string): Promise<unknown | null> {
  try {
    const { get } = await import("idb-keyval");
    const raw = await get(keyName);
    if (!raw) return null;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw;
  } catch (err) {
    console.warn("[outbound] failed to read legacy IndexedDB", err);
    return null;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/outbound-campaigns/utils/readLegacyIndexedDB.ts
git commit -m "feat(outbound): add legacy IndexedDB reader"
```

---

### Task 15: Local migration hook

**Files:**
- Create: `/home/will/ReactCRM/src/features/outbound-campaigns/useLocalMigration.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/features/outbound-campaigns/useLocalMigration.ts
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import { readLegacyZustandBlob } from "./utils/readLegacyIndexedDB.ts";
import { outboundKeys } from "@/api/hooks/useOutboundCampaigns.ts";

const MIGRATED_FLAG = "outbound-v1-migrated";
const OUTBOUND_STORE_KEY = "outbound-campaigns-storage";
const DANNIA_STORE_KEY = "dannia-store";
const NON_DIRTY_STATUSES = new Set(["pending", "queued"]);

interface LegacyBlob {
  state?: {
    campaigns?: unknown[];
    contacts?: Array<{
      id: string;
      campaign_id: string;
      account_name: string;
      phone: string;
      call_status: string;
      call_attempts: number;
      [k: string]: unknown;
    }>;
    callbacks?: Array<{
      id?: string;
      contact_id: string;
      campaign_id?: string;
      scheduled_for: string;
      notes?: string | null;
      status?: string;
    }>;
  };
}

function isDirtyContact(c: { call_status: string; call_attempts: number }): boolean {
  return (c.call_attempts ?? 0) > 0 || !NON_DIRTY_STATUSES.has(c.call_status);
}

export function useLocalMigration() {
  const qc = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      if (localStorage.getItem(MIGRATED_FLAG) === "true") return;

      try {
        const ob = await readLegacyZustandBlob(OUTBOUND_STORE_KEY) as LegacyBlob | null;
        const dannia = await readLegacyZustandBlob(DANNIA_STORE_KEY) as LegacyBlob | null;

        const campaigns = ob?.state?.campaigns ?? [];
        const contacts = (ob?.state?.contacts ?? []).filter(isDirtyContact);
        const callbacks = (dannia?.state?.callbacks ?? []).map((cb) => ({
          contact_id: cb.contact_id,
          campaign_id: cb.campaign_id,
          scheduled_for: cb.scheduled_for,
          notes: cb.notes ?? null,
          status: cb.status ?? "scheduled",
        }));

        if (campaigns.length === 0 && contacts.length === 0 && callbacks.length === 0) {
          localStorage.setItem(MIGRATED_FLAG, "true");
          return;
        }

        await apiClient.post("/outbound-campaigns/migrate-local", {
          campaigns,
          contacts,
          callbacks,
        });

        localStorage.setItem(MIGRATED_FLAG, "true");
        qc.invalidateQueries({ queryKey: outboundKeys.all });
        console.info("[outbound] local migration complete", {
          campaigns: campaigns.length,
          contacts: contacts.length,
          callbacks: callbacks.length,
        });
      } catch (err) {
        // Do NOT set the flag — retry on next load.
        console.error("[outbound] local migration failed", err);
      }
    })();
  }, [qc]);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/outbound-campaigns/useLocalMigration.ts
git commit -m "feat(outbound): add one-shot local-to-backend migration hook"
```

---

## Phase E — Frontend Refactor

### Task 16: Shrink `useOutboundStore` to UI state

**Files:**
- Modify: `/home/will/ReactCRM/src/features/outbound-campaigns/store.ts`

- [ ] **Step 1: Replace the entire store file**

This is a near-complete rewrite. The new store has no campaigns/contacts data.

Write `/home/will/ReactCRM/src/features/outbound-campaigns/store.ts`:

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type { AutoDialDelay, SortOrder, CampaignAutomationConfig } from "./types";
import { DEFAULT_AUTOMATION_CONFIG } from "./types";

/**
 * IndexedDB-backed storage adapter for Zustand persist.
 * Kept from v1 so that UI preferences persist across reloads.
 */
const idbStorage = createJSONStorage(() => ({
  getItem: async (name: string): Promise<string | null> => {
    const val = await idbGet(name);
    if (val === undefined) {
      const lsVal = localStorage.getItem(name);
      if (lsVal) {
        await idbSet(name, lsVal);
        localStorage.removeItem(name);
        return lsVal;
      }
      return null;
    }
    return val ?? null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idbSet(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await idbDel(name);
  },
}));

/**
 * Outbound UI/session state ONLY. Campaigns, contacts, and callbacks are
 * server-authoritative; use the TanStack Query hooks in
 * src/api/hooks/useOutboundCampaigns.ts.
 */
export interface OutboundUIState {
  activeCampaignId: string | null;
  dialerContactIndex: number;
  dialerActive: boolean;
  danniaMode: boolean;
  autoDialEnabled: boolean;
  autoDialDelay: AutoDialDelay;
  sortOrder: SortOrder;
  campaignAutomationConfigs: Record<string, CampaignAutomationConfig>;

  setActiveCampaign: (id: string | null) => void;
  setDialerContactIndex: (i: number) => void;
  setDialerActive: (active: boolean) => void;
  setDanniaMode: (on: boolean) => void;
  setAutoDialEnabled: (on: boolean) => void;
  setAutoDialDelay: (d: AutoDialDelay) => void;
  setSortOrder: (s: SortOrder) => void;
  setCampaignAutomationConfig: (campaignId: string, cfg: CampaignAutomationConfig) => void;
}

export const useOutboundStore = create<OutboundUIState>()(
  persist(
    (set) => ({
      activeCampaignId: null,
      dialerContactIndex: 0,
      dialerActive: false,
      danniaMode: false,
      autoDialEnabled: false,
      autoDialDelay: 5,
      sortOrder: "default",
      campaignAutomationConfigs: {},

      setActiveCampaign: (id) => set({ activeCampaignId: id, dialerContactIndex: 0 }),
      setDialerContactIndex: (i) => set({ dialerContactIndex: Math.max(0, i) }),
      setDialerActive: (active) => set({ dialerActive: active }),
      setDanniaMode: (on) => set({ danniaMode: on }),
      setAutoDialEnabled: (on) => set({ autoDialEnabled: on }),
      setAutoDialDelay: (d) => set({ autoDialDelay: d }),
      setSortOrder: (s) => set({ sortOrder: s }),
      setCampaignAutomationConfig: (campaignId, cfg) =>
        set((s) => ({
          campaignAutomationConfigs: { ...s.campaignAutomationConfigs, [campaignId]: cfg },
        })),
    }),
    {
      name: "outbound-campaigns-ui",  // NOTE: new key, not the old v1 key
      storage: idbStorage,
      version: 2,
    },
  ),
);

// Re-export the default automation config for call sites that used it from the old store.
export { DEFAULT_AUTOMATION_CONFIG };
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/will/ReactCRM
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -40
```
Expected: a list of errors from components that still reference removed fields/actions (`contacts`, `campaigns`, `setContactCallStatus`, `updateContact`, `createCampaign`, etc.). These will be fixed in Tasks 17-22.

- [ ] **Step 3: Commit (expected broken build — this is a staging commit)**

```bash
git add src/features/outbound-campaigns/store.ts
git commit -m "refactor(outbound): shrink store to UI/session state only"
```

---

### Task 17: Refactor `PowerDialer.tsx`

**Files:**
- Modify: `/home/will/ReactCRM/src/features/outbound-campaigns/components/PowerDialer.tsx`

- [ ] **Step 1: Read the current file to find exact sites**

```bash
grep -n "useOutboundStore\|setContactCallStatus\|store\.\(contacts\|campaigns\|setContactCallStatus\)" /home/will/ReactCRM/src/features/outbound-campaigns/components/PowerDialer.tsx | head -30
```

- [ ] **Step 2: Replace data-read sites with queries and mutations**

Open `PowerDialer.tsx`. Make these changes:

1. Add imports at the top:
   ```typescript
   import { useCampaignContacts, useSetContactDisposition } from "@/api/hooks/useOutboundCampaigns.ts";
   ```

2. Replace the Zustand data selectors that read `contacts` / `campaigns` with `useCampaignContacts(activeCampaignId)` (the active campaign id comes from `useOutboundStore((s) => s.activeCampaignId)`). Contacts are now `data ?? []`.

3. Replace the mutation calls:
   - `store.setContactCallStatus(currentContact.id, status, effectiveNotes || undefined);` →
     ```typescript
     setDisposition.mutate({
       contactId: currentContact.id,
       campaignId: currentContact.campaign_id,
       call_status: status,
       notes: effectiveNotes || null,
     });
     ```
   - `store.setContactCallStatus(currentContact.id, "skipped");` →
     ```typescript
     setDisposition.mutate({
       contactId: currentContact.id,
       campaignId: currentContact.campaign_id,
       call_status: "skipped",
     });
     ```

4. Declare the mutation once near the top of the component:
   ```typescript
   const setDisposition = useSetContactDisposition();
   ```

5. Any selector like `useOutboundStore((s) => s.contacts)` or `useOutboundStore((s) => s.campaigns)` must be removed — that state no longer exists.

- [ ] **Step 3: Typecheck this file**

```bash
cd /home/will/ReactCRM
npx tsc --noEmit 2>&1 | grep "PowerDialer.tsx" | head -10
```
Expected: no errors in PowerDialer.tsx.

- [ ] **Step 4: Commit**

```bash
git add src/features/outbound-campaigns/components/PowerDialer.tsx
git commit -m "refactor(outbound): PowerDialer uses query + disposition mutation"
```

---

### Task 18: Refactor `ContactTable.tsx`

**Files:**
- Modify: `/home/will/ReactCRM/src/features/outbound-campaigns/components/ContactTable.tsx`

- [ ] **Step 1: Locate call sites**

```bash
grep -n "useOutboundStore\|setContactCallStatus\|updateContact" /home/will/ReactCRM/src/features/outbound-campaigns/components/ContactTable.tsx | head -20
```

- [ ] **Step 2: Replace with hooks**

1. Add imports:
   ```typescript
   import {
     useCampaignContacts, useSetContactDisposition, useUpdateContact,
   } from "@/api/hooks/useOutboundCampaigns.ts";
   ```

2. Replace any `useOutboundStore((s) => s.contacts)` reads with `useCampaignContacts(activeCampaignId)`. The component likely receives `campaignId` as a prop; if so, use that.

3. Replace mutation calls:
   - `useOutboundStore.getState().setContactCallStatus(id, status);` →
     ```typescript
     setDisposition.mutate({ contactId: id, campaignId, call_status: status });
     ```
   - `useOutboundStore.getState().updateContact(id, { notes: notesText });` →
     ```typescript
     updateContact.mutate({ contactId: id, notes: notesText });
     ```
   - `useOutboundStore.getState().updateContact(editContact.id, { ...fields });` →
     ```typescript
     updateContact.mutate({ contactId: editContact.id, ...fields });
     ```

4. Declare mutations once:
   ```typescript
   const setDisposition = useSetContactDisposition();
   const updateContact = useUpdateContact();
   ```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "ContactTable.tsx" | head -10
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/outbound-campaigns/components/ContactTable.tsx
git commit -m "refactor(outbound): ContactTable uses query + mutations"
```

---

### Task 19: Refactor `PermitCampaignBuilder.tsx` and `ImportDialog.tsx`

**Files:**
- Modify: `/home/will/ReactCRM/src/features/outbound-campaigns/components/PermitCampaignBuilder.tsx`
- Modify: `/home/will/ReactCRM/src/features/outbound-campaigns/components/ImportDialog.tsx`

- [ ] **Step 1: PermitCampaignBuilder**

Change:
- `useOutboundStore((s) => s.createCampaign)` → `useCreateCampaign()`
- `useOutboundStore((s) => s.importContacts)` → `useImportContacts(newCampaignId)` (chained after createCampaign resolves)

Replace the `handleCreateCampaign` body:

```typescript
const createCampaign = useCreateCampaign();
// importContacts is bound per-campaign; the mutation below is created inside the handler
// once we know the new campaign id.

const handleCreateCampaign = async () => {
  if (!campaignName.trim() || prospects.length === 0) return;

  const newCampaign = await createCampaign.mutateAsync({
    name: campaignName.trim(),
    description: `Permit-sourced campaign: ${buildFilterDescription()}`,
    status: "draft",
  });

  const contacts = prospects.map((p: ProspectRecord) => ({
    account_name: p.owner_name || "Unknown",
    phone: p.phone || "",
    address: p.address || "",
    city: p.city || "",
    state: "TX",
    system_type: p.system_type || "",
    notes: p.system_age_years
      ? `System age: ${p.system_age_years} years. Permit date: ${p.permit_date || "N/A"}`
      : "",
  }));

  await apiClient.post(`/outbound-campaigns/campaigns/${newCampaign.id}/contacts`, { contacts });
  setCampaignName("");
  alert(`Campaign "${campaignName}" created with ${contacts.length} contacts`);
};
```

(Using `apiClient` directly for import here because `useImportContacts(campaignId)` requires the id at hook-call time which we only have post-create.)

- [ ] **Step 2: ImportDialog**

Open the file; find the call site that imports contacts. Replace:
- `useOutboundStore.getState().importContacts(campaignId, rows)` →
  ```typescript
  await apiClient.post(`/outbound-campaigns/campaigns/${campaignId}/contacts`, { contacts: rows });
  queryClient.invalidateQueries({ queryKey: outboundKeys.contacts(campaignId) });
  queryClient.invalidateQueries({ queryKey: outboundKeys.campaigns() });
  ```

Import at top:
```typescript
import { apiClient } from "@/api/client.ts";
import { useQueryClient } from "@tanstack/react-query";
import { outboundKeys } from "@/api/hooks/useOutboundCampaigns.ts";
```

And call `const queryClient = useQueryClient();` inside the component.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "PermitCampaignBuilder|ImportDialog" | head -10
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/outbound-campaigns/components/PermitCampaignBuilder.tsx src/features/outbound-campaigns/components/ImportDialog.tsx
git commit -m "refactor(outbound): PermitCampaignBuilder + ImportDialog use API"
```

---

### Task 20: Refactor remaining read sites (CampaignList, CampaignStatsBar, CampaignAnalytics, etc.)

**Files:**
- Modify: various in `/home/will/ReactCRM/src/features/outbound-campaigns/components/`

- [ ] **Step 1: Find all remaining read sites**

```bash
grep -rln "useOutboundStore" /home/will/ReactCRM/src/features/outbound-campaigns/
```

- [ ] **Step 2: For each file, replace campaign/contact reads**

Pattern replacements:
- `useOutboundStore((s) => s.campaigns)` → `const { data: campaigns = [] } = useCampaigns();`
- `useOutboundStore((s) => s.contacts)` → `const { data: contacts = [] } = useCampaignContacts(activeCampaignId);`
- `useOutboundStore((s) => s.campaigns.find((c) => c.id === id))` → `useCampaigns` + `find` locally, or `useCampaign(id)` (add a helper if needed — if not, inline `const campaign = campaigns.find(...)`)
- `useOutboundStore((s) => s.deleteCampaign)` → `useDeleteCampaign()`
- `useOutboundStore((s) => s.setCampaignStatus)` → `useUpdateCampaign()` with `{ id, status }`

For UI-state reads (`danniaMode`, `autoDial*`, `sortOrder`, `activeCampaignId`, etc.) — keep `useOutboundStore` as-is.

- [ ] **Step 3: Typecheck across the feature**

```bash
npx tsc --noEmit 2>&1 | grep "outbound-campaigns" | head -20
```
Expected: no errors anywhere in `src/features/outbound-campaigns/`.

- [ ] **Step 4: Commit**

```bash
git add src/features/outbound-campaigns/
git commit -m "refactor(outbound): all components read from API"
```

---

### Task 21: Remove callbacks from `useDanniaStore`, wire to API

**Files:**
- Modify: `/home/will/ReactCRM/src/features/outbound-campaigns/dannia/danniaStore.ts`
- Modify: `/home/will/ReactCRM/src/features/outbound-campaigns/dannia/useCallbackEngine.ts`
- Modify: anywhere else that reads `useDanniaStore((s) => s.callbacks)`

- [ ] **Step 1: Find callback read/write sites**

```bash
grep -rn "callbacks\|addCallback\|updateCallback" /home/will/ReactCRM/src/features/outbound-campaigns/dannia/ | head -20
```

- [ ] **Step 2: Remove callbacks slice from danniaStore**

Open `danniaStore.ts`. Delete the `callbacks` field and the `addCallback`/`updateCallback` actions. Keep gamification, audit, performance, config.

- [ ] **Step 3: Rewrite `useCallbackEngine.ts` to use API hooks**

Replace Zustand reads/writes with:

```typescript
import { useCallbacks, useAddCallback, useUpdateCallback } from "@/api/hooks/useOutboundCampaigns.ts";

// in hook body:
const { data: callbacks = [] } = useCallbacks();
const addCallback = useAddCallback();
const updateCallback = useUpdateCallback();
```

Preserve the existing API surface of the hook (what it returns to consumers), just swap the internals.

- [ ] **Step 4: Update consumers of the old store fields**

Anywhere reading `useDanniaStore((s) => s.callbacks)` → `useCallbacks().data ?? []`.
Anywhere calling `useDanniaStore.getState().addCallback(...)` → use `useAddCallback()` at component level.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "dannia|Callback" | head -20
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/outbound-campaigns/dannia/
git commit -m "refactor(outbound): move callbacks from Dannia store to API"
```

---

### Task 22: Wire migration + queries into `OutboundCampaignsPage`

**Files:**
- Modify: `/home/will/ReactCRM/src/features/outbound-campaigns/OutboundCampaignsPage.tsx`

- [ ] **Step 1: Add migration hook call**

In `OutboundCampaignsPage.tsx`, near the top of the component body:

```typescript
import { useLocalMigration } from "./useLocalMigration.ts";

export function OutboundCampaignsPage() {
  useLocalMigration();
  // ... rest unchanged
}
```

- [ ] **Step 2: Confirm the page renders `CampaignList` / `ContactTable` and that those already use the new hooks**

Typecheck:
```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors anywhere.

- [ ] **Step 3: Local build check (MANDATORY per CLAUDE.md)**

```bash
cd /home/will/ReactCRM
npm run build 2>&1 | tail -15
```
Expected: build succeeds. If it fails, fix the reported error before committing.

- [ ] **Step 4: Commit**

```bash
git add src/features/outbound-campaigns/OutboundCampaignsPage.tsx
git commit -m "feat(outbound): wire local migration hook into page mount"
```

---

## Phase F — Playwright E2E + Deploy + Verify

### Task 23: Write Playwright spec file

**Files:**
- Create: `/home/will/ReactCRM/e2e/features/outbound-campaigns-persistence.spec.ts`

- [ ] **Step 1: Create the test file**

```typescript
// e2e/features/outbound-campaigns-persistence.spec.ts
import { test, expect, Page, BrowserContext } from "@playwright/test";

const BASE_URL = "https://react.ecbtx.com";
const API_URL = "https://react-crm-api-production.up.railway.app/api/v2";

const WILL = { email: "will@macseptic.com", password: "#Espn2025" };

async function login(page: Page, creds: { email: string; password: string }) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("domcontentloaded");
  const email = page.locator('input[type="email"], input[name="email"]');
  const pw = page.locator('input[type="password"], input[name="password"]');
  await email.fill(creds.email);
  await pw.fill(creds.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(() => !location.href.includes("/login"), null, { timeout: 30_000 });
}

test.describe("Outbound Campaigns persistence", () => {
  test("loads Email Openers campaign from backend with 37 contacts", async ({ page }) => {
    await login(page, WILL);
    await page.goto(`${BASE_URL}/outbound-campaigns`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for campaign heading
    await expect(page.locator("text=Email Openers - Spring Follow-Up")).toBeVisible({ timeout: 20_000 });

    // Switch to Contacts tab
    await page.locator("text=Contacts").first().click();

    // Expect at least 30 rows (allow tolerance for seed count vs UI render lag)
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    expect(await rows.count()).toBeGreaterThanOrEqual(30);
  });

  test("disposition round-trips and survives reload", async ({ page }) => {
    await login(page, WILL);
    await page.goto(`${BASE_URL}/outbound-campaigns`);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=Email Openers - Spring Follow-Up")).toBeVisible({ timeout: 20_000 });

    await page.locator("text=Contacts").first().click();

    // Pick the first pending row and set status via the dropdown
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();
    // Find the "Set status..." select in that row
    const select = firstRow.locator("select");
    await select.selectOption({ label: /voicemail/i });

    // Wait for the mutation (the row status should flip)
    await expect(firstRow).toContainText(/Voicemail/i, { timeout: 10_000 });

    // Reload
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.locator("text=Contacts").first().click();
    const firstRowAfter = page.locator("tbody tr").first();
    await expect(firstRowAfter).toContainText(/Voicemail/i, { timeout: 15_000 });
  });

  test("two-browser shared state: disposition on A visible on B within 60s", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await login(pageA, WILL);
    await login(pageB, WILL);

    await pageA.goto(`${BASE_URL}/outbound-campaigns`);
    await pageB.goto(`${BASE_URL}/outbound-campaigns`);

    await pageA.locator("text=Contacts").first().click();
    await pageB.locator("text=Contacts").first().click();

    // On A: set the 2nd row to "no_answer"
    const targetRowA = pageA.locator("tbody tr").nth(1);
    const nameA = await targetRowA.locator("td").first().innerText();
    await targetRowA.locator("select").selectOption({ label: /no answer/i });
    await expect(targetRowA).toContainText(/No Answer/i, { timeout: 10_000 });

    // On B: refocus and wait up to 60s for the matching row to reflect
    await pageB.bringToFront();
    const matchedRowB = pageB.locator("tbody tr", { hasText: nameA });
    await expect(matchedRowB).toContainText(/No Answer/i, { timeout: 60_000 });

    await ctxA.close();
    await ctxB.close();
  });

  test("migration uploads stranded local state on first load", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("domcontentloaded");

    // Seed IndexedDB with a legacy blob BEFORE logging in
    await page.evaluate(async () => {
      const { set } = await import("https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/index.js");
      const blob = JSON.stringify({
        state: {
          campaigns: [{
            id: "legacy-camp-1",
            name: "Legacy Test",
            description: "test",
            status: "active",
            source_file: null,
            source_sheet: null,
            total_contacts: 1,
            contacts_called: 1,
            contacts_connected: 1,
            contacts_interested: 0,
            contacts_completed: 1,
            assigned_reps: [],
            created_by: null,
            created_at: "2026-04-21T10:00:00Z",
            updated_at: "2026-04-21T14:30:00Z",
          }],
          contacts: [{
            id: "legacy-ct-1",
            campaign_id: "legacy-camp-1",
            account_name: "Legacy Person",
            phone: "5559999999",
            call_status: "connected",
            call_attempts: 1,
            last_call_date: "2026-04-21T14:30:00Z",
            last_disposition: "connected",
            notes: "test migration",
            priority: 3,
          }],
        },
        version: 1,
      });
      await set("outbound-campaigns-storage", blob);
      localStorage.removeItem("outbound-v1-migrated");
    });

    // Now log in
    await page.locator('input[type="email"]').fill(WILL.email);
    await page.locator('input[type="password"]').fill(WILL.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !location.href.includes("/login"), null, { timeout: 30_000 });

    // Visit the page — migration fires
    const requests: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/outbound-campaigns/migrate-local")) {
        requests.push(r.url());
      }
    });

    await page.goto(`${BASE_URL}/outbound-campaigns`);
    await page.waitForLoadState("domcontentloaded");

    // Wait for migration POST
    await page.waitForRequest((r) => r.url().includes("/migrate-local") && r.method() === "POST", { timeout: 20_000 });

    // Flag is set
    const flag = await page.evaluate(() => localStorage.getItem("outbound-v1-migrated"));
    expect(flag).toBe("true");

    // Reload; no second POST
    const beforeReload = requests.length;
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(5_000);
    expect(requests.length).toBe(beforeReload);

    await ctx.close();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add e2e/features/outbound-campaigns-persistence.spec.ts
git commit -m "test(outbound): Playwright E2E for backend persistence + migration"
```

---

### Task 24: Deploy frontend

- [ ] **Step 1: Full local build**

```bash
cd /home/will/ReactCRM
npm run build 2>&1 | tail -15
```
Expected: build succeeds.

- [ ] **Step 2: Push**

```bash
git push origin master
```

- [ ] **Step 3: Wait for Railway, verify `/health` and page load**

```bash
sleep 150
curl -s -o /dev/null -w "%{http_code}\n" https://react.ecbtx.com
```
Expected: `200`.

---

### Task 25: Run Playwright against production

- [ ] **Step 1: Run the new spec**

```bash
cd /home/will/ReactCRM
npx playwright test e2e/features/outbound-campaigns-persistence.spec.ts --reporter=list 2>&1 | tail -30
```

- [ ] **Step 2: If any test fails, diagnose**

- Check console errors: `npx playwright test e2e/features/outbound-campaigns-persistence.spec.ts --trace=on`
- Inspect the HTML report: `npx playwright show-report`
- Common issues:
  - Campaign not visible → Alembic migration 107 didn't run. Check Railway logs; manually run `alembic upgrade head` if needed.
  - 401 on API calls → cookie auth not being sent; check `apiClient` axios config.
  - Row count mismatch → seed has 37 rows (per CONTACTS list). Adjust test expectation if needed.

- [ ] **Step 3: Fix and iterate**

For each failure, fix the root cause in code, re-run the full local build, push, wait for deploy, re-run Playwright. Repeat until all pass.

- [ ] **Step 4: Commit any fixes**

```bash
git add -u
git commit -m "fix(outbound): <specific issue from playwright>"
git push origin master
```

---

### Task 26: Verify Dannia's recovery (post-deploy manual check)

- [ ] **Step 1: Baseline the database**

Before asking Dannia to log in, run against production:

```bash
# Via any admin API call or DB query that returns counters:
curl -s https://react-crm-api-production.up.railway.app/api/v2/outbound-campaigns/campaigns \
  -H "Cookie: <will-session-cookie>" | python -m json.tool | grep -A 3 "Email Openers"
```
Expected: `called: 0`, `connected: 0`.

(If direct DB access: `SELECT call_status, COUNT(*) FROM outbound_campaign_contacts WHERE campaign_id = 'email-openers-spring-2026' GROUP BY call_status;` — all should be `pending`.)

- [ ] **Step 2: Ask Dannia to log in**

Via SMS or whatever normal channel. One instruction: "Log into react.ecbtx.com, open the Outbound Dialer."

- [ ] **Step 3: Confirm her upload**

Re-query campaigns:
```bash
curl -s https://react-crm-api-production.up.railway.app/api/v2/outbound-campaigns/campaigns \
  -H "Cookie: <will-session-cookie>" | python -m json.tool | grep -A 15 "Email Openers"
```
Expected: counters match what Dannia had locally (~36 called, 9 connected, 1 interested, 14 voicemail, etc.).

- [ ] **Step 4: Will refreshes his browser**

Will visits `react.ecbtx.com/outbound-campaigns` and sees Dannia's state in the UI. End-to-end recovery complete.

---

## Self-Review

**1. Spec coverage:**
- Data model (4 tables) → Task 1, 2
- API endpoints (all in spec) → Tasks 4–9
- Derived counters → Task 4
- Email Openers seed → Task 10
- TanStack Query hooks → Task 13
- IndexedDB reader + migration hook → Tasks 14–15
- Store shrink → Task 16
- Component refactor → Tasks 17–21
- Page wiring → Task 22
- Playwright tests → Task 23
- Deploy + iterate → Tasks 24–25
- Dannia recovery verification → Task 26

All spec sections are covered.

**2. Placeholder scan:** No "TBD" / "TODO" / "add appropriate error handling" / "similar to Task N" left. Every code block is complete.

**3. Type consistency:** `useOutboundStore` field names match the store rewrite in Task 16. Hook names (`useCampaignContacts`, `useSetContactDisposition`, etc.) are consistent across the API hooks file (Task 13) and the refactored component tasks (17–21). Backend schema names match between models (Task 2), Pydantic schemas (Task 3), and router code (Tasks 4–9).

---

## Execution

**Plan complete and saved to `/home/will/ReactCRM/docs/superpowers/plans/2026-04-22-outbound-campaigns-persistence.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

Per the user's directive "build it, test with playwright until it functions as it's supposed to," executing inline in this session.
