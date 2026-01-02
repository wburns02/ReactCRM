# CRM API Backend Documentation

> **Version:** v2.0 — December 31, 2025
> **Application URL:** https://react-crm-api-production.up.railway.app/api/v2
> **Repository:** react-crm-api (separate repo)

---

## ENFORCEMENT RULES (READ FIRST)

> **CRITICAL**: This document contains binding rules. All API changes must be verified via Playwright tests against https://react.ecbtx.com.

### Zero Tolerance for Fake Playwright Usage

All API testing claims **MUST** be verified via the React frontend:
- Navigate to relevant page on https://react.ecbtx.com
- Trigger the API call through UI interaction
- Capture network responses in evidence bundle
- Never claim "API works" without frontend verification

**Absolute Rules:**
- Any claim of API testing, endpoint verification, or behavior confirmation **MUST** include:
  1. Full Playwright script targeting react.ecbtx.com
  2. Network response capture showing status codes
  3. The mandatory evidence bundle (see quick-reference.md)
- Violation = invalid response. Restart the task.

### Recurring Bugs — PERMANENTLY BANNED

| Bug | Description | Required Fix |
|-----|-------------|--------------|
| PATCH 500 | Work order updates returning 500 | try/except + proper validation response |
| Missing pagination | Endpoints returning unbounded arrays | Enforce page_size limit |
| Auth bypass | Endpoints without token verification | @require_auth decorator on all routes |
| N+1 queries | Lazy loading in list endpoints | Eager load relationships |

### Relentless Autonomous Troubleshooter Mode

When user says: "Enter relentless autonomous troubleshooter mode" or similar

**You MUST:**
- Never ask permission to continue
- Never stop at phase boundaries
- Fix one bug → verify via Playwright on react.ecbtx.com → next bug
- Only stop when: All API calls return 200 (or expected status) and frontend works

---

## PROJECT ARCHITECTURE

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | FastAPI | 0.109+ |
| Language | Python | 3.11+ |
| ORM | SQLAlchemy | 2.0+ |
| Database | PostgreSQL | 16 |
| Validation | Pydantic | 2.0+ |
| Auth | JWT (python-jose) | - |
| Migration | Alembic | - |
| Server | Uvicorn | - |

### Directory Structure

```
app/
├── main.py                 # FastAPI app initialization
├── config.py               # Environment settings (pydantic-settings)
├── database.py             # SQLAlchemy engine + session
├── models/                 # SQLAlchemy models
│   ├── __init__.py
│   ├── customer.py
│   ├── work_order.py
│   ├── technician.py
│   ├── user.py
│   └── ...
├── schemas/                # Pydantic schemas
│   ├── __init__.py
│   ├── customer.py
│   ├── work_order.py
│   └── ...
├── routers/                # API route handlers
│   ├── __init__.py
│   ├── auth.py
│   ├── customers.py
│   ├── work_orders.py
│   ├── technicians.py
│   ├── schedule.py
│   └── ...
├── services/               # Business logic
│   ├── __init__.py
│   ├── customer_service.py
│   ├── work_order_service.py
│   └── ...
├── middleware/             # Request/response middleware
│   ├── auth.py
│   ├── cors.py
│   └── logging.py
└── utils/                  # Utilities
    ├── security.py
    ├── pagination.py
    └── ...
```

### Deployment

| Environment | URL |
|-------------|-----|
| Production API | https://react-crm-api-production.up.railway.app/api/v2 |
| Health Check | https://react-crm-api-production.up.railway.app/health |
| Local Dev | http://localhost:5001/api/v2 |

---

## API ENDPOINTS

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login, returns JWT |
| POST | `/auth/logout` | Logout (optional) |
| POST | `/auth/refresh` | Refresh token |
| GET | `/auth/me` | Current user info |

### Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customers/` | List customers (paginated) |
| GET | `/customers/{id}` | Get customer by ID |
| POST | `/customers/` | Create customer |
| PUT | `/customers/{id}` | Update customer |
| DELETE | `/customers/{id}` | Delete customer |
| GET | `/customers/{id}/work-orders` | Customer's work orders |

### Work Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/work-orders/` | List work orders (paginated) |
| GET | `/work-orders/{id}` | Get work order by ID |
| POST | `/work-orders/` | Create work order |
| PATCH | `/work-orders/{id}` | **Partial update** (scheduling) |
| PUT | `/work-orders/{id}` | Full update |
| DELETE | `/work-orders/{id}` | Delete work order |

**CRITICAL: PATCH `/work-orders/{id}` must not return 500**

```python
# Correct implementation
@router.patch("/{id}")
async def update_work_order(
    id: int,
    data: WorkOrderPatch,
    db: Session = Depends(get_db)
):
    try:
        work_order = db.query(WorkOrder).filter(WorkOrder.id == id).first()
        if not work_order:
            raise HTTPException(status_code=404, detail="Work order not found")

        # Only update provided fields
        update_data = data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(work_order, field, value)

        db.commit()
        db.refresh(work_order)
        return work_order
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
```

### Technicians

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/technicians/` | List technicians |
| GET | `/technicians/{id}` | Get technician by ID |
| POST | `/technicians/` | Create technician |
| PUT | `/technicians/{id}` | Update technician |
| GET | `/technicians/{id}/schedule` | Technician's schedule |

### Schedule

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/schedule/` | Get schedule (by date range) |
| GET | `/schedule/unassigned` | Unassigned work orders |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/summary` | Dashboard summary |
| GET | `/reports/technician-performance` | Technician metrics |
| GET | `/reports/customer-activity` | Customer activity |

### Email Marketing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/email-campaigns/` | List campaigns |
| POST | `/email-campaigns/` | Create campaign |
| POST | `/email-campaigns/{id}/send` | Send campaign |

---

## DATABASE MODELS

### Customer

```python
class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    address = Column(String(500))
    city = Column(String(100))
    state = Column(String(50))
    zip_code = Column(String(20))
    region = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    # Relationships
    work_orders = relationship("WorkOrder", back_populates="customer")
```

### Work Order

```python
class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    assigned_technician_id = Column(Integer, ForeignKey("technicians.id"))
    status = Column(String(50), default="pending")
    priority = Column(Integer, default=3)
    scheduled_date = Column(Date)
    scheduled_time = Column(Time)
    description = Column(Text)
    notes = Column(Text)
    estimated_duration = Column(Integer)  # minutes
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)

    # Relationships
    customer = relationship("Customer", back_populates="work_orders")
    technician = relationship("Technician", back_populates="work_orders")
```

### Technician

```python
class Technician(Base):
    __tablename__ = "technicians"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    skills = Column(ARRAY(String))
    is_active = Column(Boolean, default=True)
    color = Column(String(7))  # Hex color for UI

    # Relationships
    work_orders = relationship("WorkOrder", back_populates="technician")
```

---

## PYDANTIC SCHEMAS

### Pagination

```python
class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int
```

### Work Order Schemas

```python
class WorkOrderBase(BaseModel):
    customer_id: int
    description: Optional[str] = None
    priority: int = 3
    status: str = "pending"

class WorkOrderCreate(WorkOrderBase):
    pass

class WorkOrderPatch(BaseModel):
    """Partial update - all fields optional"""
    assigned_technician_id: Optional[int] = None
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[time] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class WorkOrderResponse(WorkOrderBase):
    id: int
    assigned_technician_id: Optional[int]
    scheduled_date: Optional[date]
    created_at: datetime
    customer: CustomerResponse
    technician: Optional[TechnicianResponse]

    class Config:
        from_attributes = True
```

---

## AUTHENTICATION

### JWT Implementation

```python
# utils/security.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### Auth Dependency

```python
# middleware/auth.py
async def get_current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db)
) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")

    token = authorization.split(" ")[1]
    payload = verify_token(token)

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user
```

---

## PERFORMANCE OPTIMIZATIONS

### Database Indexing

```sql
-- Critical indexes
CREATE INDEX idx_work_orders_scheduled_date ON work_orders(scheduled_date);
CREATE INDEX idx_work_orders_technician ON work_orders(assigned_technician_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_composite ON work_orders(scheduled_date, assigned_technician_id, status);
CREATE INDEX idx_customers_region ON customers(region);
CREATE INDEX idx_customers_name ON customers(name);
```

### Pagination Limits

```python
# Enforce maximum page size
MAX_PAGE_SIZE = 200
DEFAULT_PAGE_SIZE = 50

def get_pagination(
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE)
):
    return {"page": page, "page_size": page_size}
```

### Eager Loading

```python
# Avoid N+1 queries
def get_work_orders(db: Session, page: int, page_size: int):
    query = db.query(WorkOrder).options(
        joinedload(WorkOrder.customer),
        joinedload(WorkOrder.technician)
    )
    return paginate(query, page, page_size)
```

### Async Endpoints

```python
# Use async for I/O bound operations
@router.get("/")
async def list_work_orders(
    db: AsyncSession = Depends(get_async_db)
):
    result = await db.execute(
        select(WorkOrder).options(selectinload(WorkOrder.customer))
    )
    return result.scalars().all()
```

### Background Tasks

```python
# Non-critical operations
from fastapi import BackgroundTasks

@router.post("/email-campaigns/{id}/send")
async def send_campaign(
    id: int,
    background_tasks: BackgroundTasks
):
    background_tasks.add_task(send_campaign_emails, id)
    return {"status": "Campaign queued"}
```

---

## ERROR HANDLING

### Global Exception Handler

```python
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

@app.exception_handler(SQLAlchemyError)
async def database_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error: {exc}")
    return JSONResponse(
        status_code=400,
        content={"detail": "Database operation failed"}
    )
```

### Validation Errors

```python
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )
```

---

## ENVIRONMENT VARIABLES

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret

# CORS
ALLOWED_ORIGINS=https://react.ecbtx.com,http://localhost:5173

# Optional
SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=INFO
```

### Configuration Class

```python
# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    JWT_SECRET: str
    ALLOWED_ORIGINS: str = "http://localhost:5173"
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## RAILWAY DEPLOYMENT

### Service Configuration

| Setting | Value |
|---------|-------|
| Service Name | react-crm-api-production |
| Port | 5001 |
| Build | Dockerfile or Nixpacks |
| Health Check | `/health` |

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5001"]
```

### Health Endpoint

```python
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": str(e)}
        )
```

---

## PLAYWRIGHT VERIFICATION

**All API changes must be verified via the React frontend at https://react.ecbtx.com**

### Standard Verification Template

```typescript
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture API responses
  const apiResponses: {url: string, status: number}[] = [];
  page.on('response', response => {
    if (response.url().includes('/api/v2/')) {
      apiResponses.push({
        url: response.url(),
        status: response.status()
      });
    }
  });

  // Login
  await page.goto('https://react.ecbtx.com/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');

  // Navigate to page that triggers API
  await page.goto('https://react.ecbtx.com/schedule');
  await page.waitForLoadState('networkidle');

  // Verify API responses
  console.log('API Responses:', apiResponses);

  await browser.close();
})();
```

### Evidence Bundle Format

```
PLAYWRIGHT RUN RESULTS:
Timestamp: [ISO timestamp]
Target URL: https://react.ecbtx.com/[path]
API Endpoints Tested:
  • GET /api/v2/work-orders → 200
  • PATCH /api/v2/work-orders/123 → 200
  • GET /api/v2/technicians → 200
Actions Performed:
  1. Logged in via /login
  2. Navigated to /schedule
  3. Performed drag operation
  4. Verified PATCH response
Console Logs: [none or errors]
Screenshot Description:
  • Schedule board loaded with work orders
  • Drag operation completed successfully
Test Outcome: PASS
```

**Missing bundle = invalid response**

---

## CRITICAL REMINDERS

1. **PATCH must not return 500** — wrap in try/except, return proper validation errors
2. **All endpoints require auth** — use `Depends(get_current_user)`
3. **Enforce pagination limits** — max page_size=200
4. **Eager load relationships** — avoid N+1 queries
5. **Verify via Playwright** — all API changes need frontend verification
6. **Never claim "API works"** — without evidence bundle from react.ecbtx.com
