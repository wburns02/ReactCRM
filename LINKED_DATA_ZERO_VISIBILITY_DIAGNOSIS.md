# Linked Data Zero Visibility - Root Cause Diagnosis

## Date: January 22, 2026

## DIAGNOSIS COMPLETE ✅

### What We're Seeing

| Metric | Value |
|--------|-------|
| Total permits checked | 25 |
| `has_property = TRUE` | **0** |
| `has_property = FALSE` | **25** |
| Green icons displayed | **0** |
| Gray icons displayed | 25 |

### Root Cause

**The `property_id` column DOES NOT EXIST in the `SepticPermit` model.**

The backend code tries to check if permits are linked:
```python
# permit_search_service.py line 191
has_property = getattr(permit, 'property_id', None) is not None
```

Since `property_id` doesn't exist as a column, `getattr()` returns `None`, and `has_property` is always `False`.

### Why The Column Doesn't Exist

Looking at `react-crm-api/app/models/septic_permit.py`:
- The model has 50+ columns defined
- There is NO `property_id` column
- There is NO foreign key to a `properties` table
- There is NO `Property` model in the entire backend

**The linking infrastructure was never built.**

The plan file (`frolicking-wobbling-petal.md`) mentions:
- `backend/app/models/property.py`
- `backend/app/services/property_service.py`
- A `properties` table

But NONE of these files exist in the `react-crm-api` repository.

### Frontend Code Is Correct

The `PermitResults.tsx` component (lines 228-250) correctly:
- Shows green house icon when `has_property === true`
- Shows gray house icon when `has_property === false`
- Uses proper test IDs
- Has tooltips and accessibility labels

### Solution Options

#### Option 1: Add property_id Column (Backend Change)

Add to `SepticPermit` model:
```python
property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True)
```

But this requires:
1. Creating a `Property` model
2. Creating a `properties` table migration
3. Linking permits to properties (by address hash or manual assignment)

**Effort: HIGH** (2-3 days)

#### Option 2: Use Existing Data for "Linked" Status

Instead of linking to a separate properties table, use data we already have:
- `parcel_number` - if populated, consider it "linked"
- `latitude/longitude` - if populated, consider it "linked"
- `pdf_url` - if has document, show different indicator

Change backend:
```python
# Use existing data to determine "linked" status
has_property = bool(permit.parcel_number) or bool(permit.latitude)
```

**Effort: LOW** (30 minutes)

#### Option 3: Hard-code Sample Linked Permits

For demo purposes, mark specific permits as linked:
```python
# Demo: show some permits as linked
DEMO_LINKED_IDS = ["id1", "id2", ...]
has_property = str(permit.id) in DEMO_LINKED_IDS
```

**Effort: MINIMAL** (15 minutes, but not production-ready)

---

## Recommended Solution: Option 2

Use existing `parcel_number` as proxy for "linked" status. Many permits have parcel numbers from scraping.

### Implementation

1. **Backend Change** (`permit_search_service.py`):
```python
# Consider permit "linked" if it has parcel number or coordinates
has_property = bool(permit.parcel_number) or (permit.latitude is not None and permit.longitude is not None)
```

2. **Verify** with Playwright tests

3. **Future**: Build proper properties table and linking infrastructure

---

<promise>ZERO_VISIBILITY_ROOT_CAUSE_IDENTIFIED</promise>
