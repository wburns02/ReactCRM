# Payroll Page Diagnosis

## Issue Summary
The Payroll page was broken with multiple 500 and 405 errors preventing basic functionality.

## Root Causes Identified

### Bug 1: export_payroll Dependency Injection (500 Error)
**Location:** `/react-crm-api/app/api/v2/payroll.py` lines 335-337

**Problem:**
```python
async def export_payroll(
    ...
    db: DbSession = None,      # BUG: defaults to None
    current_user: CurrentUser = None,  # BUG: defaults to None
):
```

When the endpoint was called, `db.execute()` failed with `AttributeError: 'NoneType' object has no attribute 'execute'`

**Fix:** Remove `= None` defaults, use proper dependency injection.

### Bug 2: Missing POST /payroll/periods (405 Error)
**Location:** `/react-crm-api/app/api/v2/payroll.py`

**Problem:** Frontend calls `POST /payroll/periods` to create new periods, but only `GET /periods` existed.

**Fix:** Added new endpoint:
```python
@router.post("/periods")
async def create_payroll_period(request, db, current_user):
    # Creates new payroll period
```

### Bug 3: TechnicianPayRate Unique Constraint (500 Error)
**Location:** `/react-crm-api/app/models/payroll.py` line 128

**Problem:**
```python
technician_id = Column(String(36), unique=True, ...)
```

This prevented creating multiple pay rate records for the same technician (needed for rate history).

**Fix:** Removed `unique=True` constraint.

### Bug 4: Time Entries Response Key Mismatch
**Location:** API returns `items`, frontend expects `entries`

**Fix:** Changed response key from `items` to `entries`.

## Fixes Applied
All fixes committed in `52c8163` and deployed.

---
Diagnosed: 2026-01-26
