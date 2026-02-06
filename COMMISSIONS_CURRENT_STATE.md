# Commissions Current State Analysis

## Executive Summary

The commission system has most infrastructure in place but lacks the key auto-calculation feature that ties together:
- Job type (pumping vs service)
- Dump fees (gallons × cost per gallon)
- Commission rates (20% pumping, 15% service)

---

## Backend Infrastructure Status

### Dump Sites ✅ COMPLETE
**Model**: `/app/models/dump_site.py`
- id (UUID)
- name
- address_state, address_city, address_line1, address_postal_code
- latitude, longitude
- fee_per_gallon
- is_active
- contact_name, contact_phone
- notes
- created_at, updated_at

**API Endpoints**: `/app/api/v2/dump_sites.py`
- GET /dump-sites - List with filtering
- GET /dump-sites/{id} - Get single
- POST /dump-sites - Create
- PATCH /dump-sites/{id} - Update
- DELETE /dump-sites/{id} - Soft delete

**Router Registration**: `/app/api/v2/router.py`
- Registered at prefix `/dump-sites`

### Commission Model ✅ EXISTS (needs enhancement)
**Fields available**:
- technician_id
- work_order_id (optional link)
- commission_type (job_completion, upsell, referral, bonus)
- base_amount
- rate
- rate_type (percent, fixed)
- commission_amount
- status (pending, approved, paid)

**Missing fields for auto-calc**:
- dump_fee_amount
- dump_site_id
- gallons_pumped
- job_type

---

## Frontend Infrastructure Status

### Dump Sites ✅ COMPLETE
**Page**: `/src/features/admin/DumpSitesPage.tsx`
- Full CRUD UI
- State filtering
- Fee per gallon input (in cents)
- State suggestions (TX: 7¢, SC: 10¢, TN: 12¢)
- Contact info, notes

**Hooks**: `/src/api/hooks/useDumpSites.ts`
- useDumpSites(filters)
- useDumpSite(id)
- useCreateDumpSite()
- useUpdateDumpSite()
- useDeleteDumpSite()

**Types**: `/src/api/types/dumpSite.ts`
- DumpSite interface
- CreateDumpSiteInput
- UpdateDumpSiteInput

**Route**: `/admin/dump-sites`

### Commission Form ❌ NEEDS ENHANCEMENT
**Current File**: `/src/features/payroll/components/CommissionFormModal.tsx`

**Current Flow**:
1. Select technician (dropdown)
2. Select commission type (job_completion, upsell, referral, bonus)
3. Enter work order ID (text input - NOT a selector)
4. Enter base amount manually
5. Enter rate manually (default 5%)
6. Auto-calc: base_amount × rate = commission_amount

**Missing**:
1. Work order selector (dropdown with completed jobs)
2. Auto-fetch job_type, job_total, gallons from selected work order
3. Dump site selector
4. Auto-calc dump fee (gallons × cost_per_gallon)
5. Job type-based rate (20% pumping, 15% service)
6. Show calculation breakdown

---

## What Needs to Be Built

### 1. Enhanced Commission Form
**Changes to CommissionFormModal.tsx**:
- Add work order selector (completed work orders only)
- When work order selected:
  - Fetch job_type, total_amount, estimated_gallons
  - Auto-set rate based on job_type
  - If pumping/grease_trap: show dump site selector
- Add dump site selector (only for pumping jobs)
- Display calculation breakdown:
  ```
  Job Total: $450.00
  Gallons: 1,000
  Dump Fee: 1,000 × $0.08 = $80.00
  Commissionable: $450.00 - $80.00 = $370.00
  Rate: 20%
  Commission: $370.00 × 20% = $74.00
  ```

### 2. Backend Commission Calculation Endpoint
**New endpoint or enhance existing**:
- Accept work_order_id, dump_site_id
- Return calculated commission with breakdown
- Store dump_fee_amount on commission record

### 3. Commission Model Enhancement
**Add fields**:
- dump_site_id (foreign key)
- dump_fee_amount (decimal)
- gallons_pumped (integer)
- job_type (string)

---

## Testing Access Points

### Dump Sites Admin
URL: https://react.ecbtx.com/admin/dump-sites
- Should be able to add/edit/delete dump sites
- Fee per gallon in cents

### Commission Form
URL: https://react.ecbtx.com/payroll → Commissions tab → Add Commission button
- Currently manual entry only

---

## Commission Rate Mapping

| Job Type | Rate | Dump Fee Applies |
|----------|------|------------------|
| pumping | 20% | YES |
| grease_trap | 20% | YES |
| inspection | 15% | NO |
| repair | 15% | NO |
| installation | 10% | NO |
| emergency | 20% | NO |
| maintenance | 15% | NO |
| camera_inspection | 15% | NO |
