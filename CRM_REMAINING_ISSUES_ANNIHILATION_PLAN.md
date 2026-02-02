# CRM REMAINING ISSUES ANNIHILATION PLAN

> **Created:** February 2, 2026
> **Analyst:** Claude Opus - John Hammond No-Expense-Spared CRM Auditor
> **Purpose:** Strategic plan to fix remaining critical issues

---

## EXECUTION STRATEGY

### Phase 1: Quick Wins (Immediate Impact)
1. Add is_admin column to User model
2. Enable distributed rate limiting awareness

### Phase 2: Schema Stabilization (Medium-Term)
3. Add customer_uuid column for O(1) lookups
4. Consolidate runtime patches into proper migration

### Phase 3: Documentation & Monitoring
5. Add health check for schema state
6. Update Playwright tests for new fixes

---

## ISSUE #1: ADD is_admin COLUMN TO USER MODEL

### Problem
- User model lacks `is_admin` column
- RBAC uses `getattr(user, "is_admin", False)` fallback
- All non-superusers treated as basic USER role

### Solution

#### Step 1: Create Alembic Migration
```python
# alembic/versions/043_add_is_admin_column.py
"""Add is_admin column to api_users table.

Revision ID: 043
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('api_users', sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='false'))

def downgrade():
    op.drop_column('api_users', 'is_admin')
```

#### Step 2: Update User Model
```python
# app/models/user.py
class User(Base):
    __tablename__ = "api_users"
    # ... existing columns ...
    is_admin = Column(Boolean, default=False, nullable=False)  # NEW
```

#### Step 3: Update RBAC (Remove Fallback)
```python
# app/security/rbac.py
def get_user_role(user: "User") -> Role:
    if user.is_superuser:
        return Role.SUPERUSER
    if user.is_admin:  # Direct attribute access, no getattr
        return Role.ADMIN
    return Role.USER
```

#### Step 4: Promote Existing Admin User
```sql
UPDATE api_users SET is_admin = true WHERE email = 'will@macseptic.com';
```

### Verification
- Test RBAC with admin user
- Verify non-admin users can't access admin endpoints
- Add Playwright test

---

## ISSUE #2: DISTRIBUTED RATE LIMITING AWARENESS

### Problem
- Rate limiter uses in-memory storage by default
- `RATE_LIMIT_REDIS_ENABLED = False`
- Limits reset on restart, not shared across instances

### Solution

#### Step 1: Add Health Check Warning
```python
# app/main.py - in startup
if not settings.RATE_LIMIT_REDIS_ENABLED:
    logger.warning(
        "Rate limiting using in-memory storage. "
        "Set RATE_LIMIT_REDIS_ENABLED=true and REDIS_URL for production."
    )
```

#### Step 2: Add to Health Endpoint
```python
# app/api/v2/endpoints/health.py
@router.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "rate_limiting": "redis" if settings.RATE_LIMIT_REDIS_ENABLED else "memory",
        "warnings": [] if settings.RATE_LIMIT_REDIS_ENABLED else ["rate_limiting_not_distributed"]
    }
```

#### Step 3: Document in README
Add documentation about Redis configuration for production.

### Verification
- Check health endpoint shows warning
- Verify rate limiting works

---

## ISSUE #3: ADD customer_uuid COLUMN (SCHEMA BRIDGE)

### Problem
- Invoice.customer_id is UUID
- Customer.id is Integer
- Code computes UUID dynamically using `customer_id_to_uuid()`
- O(n) lookup instead of O(1)

### Solution

#### Step 1: Create Migration with Backfill
```python
# alembic/versions/044_add_customer_uuid.py
"""Add customer_uuid column with backfill.

Revision ID: 044
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

def upgrade():
    # Add column (nullable first)
    op.add_column('customers', sa.Column('customer_uuid', UUID(as_uuid=True), nullable=True))

    # Create index
    op.create_index('ix_customers_customer_uuid', 'customers', ['customer_uuid'], unique=True)

    # Backfill using deterministic UUID
    # Uses same namespace as invoices.py: 12345678-1234-5678-1234-567812345678
    op.execute("""
        UPDATE customers
        SET customer_uuid = uuid_generate_v5(
            '12345678-1234-5678-1234-567812345678'::uuid,
            id::text
        )
        WHERE customer_uuid IS NULL
    """)

def downgrade():
    op.drop_index('ix_customers_customer_uuid')
    op.drop_column('customers', 'customer_uuid')
```

#### Step 2: Update Customer Model
```python
# app/models/customer.py
customer_uuid = Column(UUID(as_uuid=True), unique=True, index=True, nullable=True)
```

#### Step 3: Update Invoice Queries
```python
# Before: O(n) lookup with customer_id_to_uuid()
# After: Direct JOIN on customer_uuid
```

### Verification
- Verify customer_uuid populated for all customers
- Test invoice queries use new column

---

## ISSUE #4: CONSOLIDATE RUNTIME PATCHES

### Problem
- 6 `ensure_*` functions in main.py run SQL at startup
- Migrations should be source of truth

### Solution (Long-term)

#### Option A: Fix Alembic Async
1. Investigate Railway PostgreSQL async compatibility
2. Update Alembic to use sync driver for migrations
3. Test migrations in staging environment

#### Option B: Consolidate into Single Migration
1. Create "schema reconciliation" migration
2. Idempotent: check before creating
3. Remove runtime patches after migration verified

### For Now: Add Schema Verification
```python
# app/main.py
async def verify_schema_state():
    """Log schema state for monitoring."""
    checks = {
        "work_order_photos": "table",
        "technician_pay_rates.pay_type": "column",
        "messages.type": "column",
        "email_templates": "table",
        "commissions.dump_site_id": "column",
        "work_orders.work_order_number": "column",
    }
    missing = []
    for check, check_type in checks.items():
        if not await schema_element_exists(check, check_type):
            missing.append(check)

    if missing:
        logger.warning(f"Schema elements missing (runtime fix applied): {missing}")
    else:
        logger.info("Schema state verified - all elements present")
```

---

## EXECUTION ORDER

### Immediate (This Session)

| # | Task | Impact | Risk |
|---|------|--------|------|
| 1 | Add is_admin column | HIGH | LOW |
| 2 | Add rate limiting warning | MEDIUM | LOW |
| 3 | Update health endpoint | MEDIUM | LOW |

### Follow-up (Next Session)

| # | Task | Impact | Risk |
|---|------|--------|------|
| 4 | Add customer_uuid column | HIGH | MEDIUM |
| 5 | Schema verification logging | MEDIUM | LOW |
| 6 | Investigate Alembic async | HIGH | HIGH |

---

## TESTING STRATEGY

### Unit Tests
- RBAC role detection with is_admin=true/false
- Rate limiter Redis vs memory mode

### E2E Tests (Playwright)
```typescript
// e2e/remaining-issues-fix.spec.ts

test.describe("Remaining Issues Fix Verification", () => {
  test("health endpoint shows rate limiting mode", async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    const data = await response.json();
    expect(data).toHaveProperty("rate_limiting");
  });

  test("admin role properly detected", async ({ request }) => {
    // Login as admin user
    // Verify can access admin endpoints
    // Verify RBAC working correctly
  });
});
```

---

## DEPLOYMENT CHECKLIST

### Pre-Deploy
- [ ] Run migration in staging
- [ ] Verify schema changes applied
- [ ] Test RBAC with admin user
- [ ] Run Playwright tests

### Deploy
- [ ] Push to GitHub
- [ ] Verify Railway deployment succeeds
- [ ] Check health endpoint version

### Post-Deploy
- [ ] Run Playwright against production
- [ ] Verify admin user has correct role
- [ ] Check logs for warnings

---

<promise>REMAINING_ISSUES_ANNIHILATION_PLAN_COMPLETE</promise>
