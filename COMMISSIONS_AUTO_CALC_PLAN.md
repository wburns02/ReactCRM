# Commissions Auto-Calc Implementation Plan

## Goal
Transform the commission system from manual entry to intelligent auto-calculation based on:
- **Job Type**: 20% for pumpout, 15% for service
- **Dump Fees**: Deducted from pumpout commissions (gallons × cost_per_gallon)
- **Work Order Data**: Auto-fetch job details when selecting a work order

---

## Implementation Steps

### Step 1: Backend - Add Commission Calculation Endpoint
**File**: `/app/api/v2/payroll.py`

Add new endpoint:
```
POST /payroll/commissions/calculate
```

Request:
```json
{
  "work_order_id": "uuid",
  "dump_site_id": "uuid" (optional, required for pumping)
}
```

Response:
```json
{
  "job_type": "pumping",
  "job_total": 450.00,
  "gallons": 1000,
  "dump_site_name": "TX Disposal",
  "dump_fee_per_gallon": 0.08,
  "dump_fee_total": 80.00,
  "commissionable_amount": 370.00,
  "commission_rate": 0.20,
  "commission_amount": 74.00,
  "breakdown": {
    "formula": "(job_total - dump_fee) × rate",
    "calculation": "(450.00 - 80.00) × 0.20 = 74.00"
  }
}
```

### Step 2: Backend - Enhance Commission Model
**File**: `/app/models/payroll.py`

Add fields to Commission model:
- dump_site_id: UUID (nullable, FK to dump_sites)
- dump_fee_amount: Float (nullable)
- gallons_pumped: Integer (nullable)
- job_type: String(50) (nullable)

### Step 3: Backend - Add Work Order Fetch for Commissions
**File**: `/app/api/v2/payroll.py`

Add endpoint:
```
GET /payroll/work-orders-for-commission
```

Returns completed work orders that don't have commissions yet:
- id, job_type, total_amount, estimated_gallons, technician_name, scheduled_date

### Step 4: Frontend - Add Work Order Selector Hook
**File**: `/src/api/hooks/usePayroll.ts`

Add:
- useWorkOrdersForCommission() - fetch available work orders
- useCalculateCommission() - call calculation endpoint

### Step 5: Frontend - Enhance Commission Form Modal
**File**: `/src/features/payroll/components/CommissionFormModal.tsx`

Changes:
1. Add work order dropdown selector
2. When work order selected:
   - Auto-fill technician, job_type
   - Fetch job_total, estimated_gallons
   - Set rate based on job_type
3. If pumping/grease_trap:
   - Show dump site selector
   - Calculate dump fee
4. Show calculation breakdown
5. Allow manual override

### Step 6: Update Commission Creation API
**File**: `/app/api/v2/payroll.py`

Modify POST /payroll/commissions to:
- Accept dump_site_id
- Calculate and store dump_fee_amount
- Store job_type and gallons_pumped

---

## Commission Rate Configuration

```typescript
const COMMISSION_RATES: Record<string, { rate: number; applyDumpFee: boolean }> = {
  pumping: { rate: 0.20, applyDumpFee: true },
  grease_trap: { rate: 0.20, applyDumpFee: true },
  inspection: { rate: 0.15, applyDumpFee: false },
  repair: { rate: 0.15, applyDumpFee: false },
  installation: { rate: 0.10, applyDumpFee: false },
  emergency: { rate: 0.20, applyDumpFee: false },
  maintenance: { rate: 0.15, applyDumpFee: false },
  camera_inspection: { rate: 0.15, applyDumpFee: false },
};
```

---

## UI Flow

### Normal Service Job (repair, inspection, etc.)
1. Click "Add Commission"
2. Select work order from dropdown
3. Auto-fills: technician, job_type="repair", job_total=$300
4. Auto-sets rate: 15%
5. Auto-calculates: $300 × 15% = $45
6. User reviews and submits

### Pumpout Job
1. Click "Add Commission"
2. Select work order from dropdown
3. Auto-fills: technician, job_type="pumping", job_total=$450, gallons=1000
4. Auto-sets rate: 20%
5. **NEW**: Dump site selector appears
6. Select dump site (cost: $0.08/gallon)
7. Auto-calculates:
   - Dump fee: 1000 × $0.08 = $80
   - Commissionable: $450 - $80 = $370
   - Commission: $370 × 20% = $74
8. Shows breakdown
9. User reviews and submits

---

## Testing Plan

### Unit Tests
1. Commission calculation logic
2. Rate selection by job type
3. Dump fee calculation

### E2E Tests (Playwright)
1. Login with will@macseptic.com / #Espn2025
2. Navigate to /admin/dump-sites
3. Add dump site with cost per gallon
4. Navigate to /payroll → Commissions
5. Click Add Commission
6. Select a pumpout work order
7. Verify auto-calculation shows 20% minus dump fee
8. Select a service work order
9. Verify auto-calculation shows 15%
10. Submit commission
11. Verify commission appears in list

---

## Files to Create/Modify

### Backend (react-crm-api)
1. MODIFY: `/app/models/payroll.py` - Add dump_site_id, dump_fee_amount, etc.
2. MODIFY: `/app/api/v2/payroll.py` - Add calculate endpoint, enhance create
3. CREATE: Migration for new columns

### Frontend (ReactCRM)
1. MODIFY: `/src/api/hooks/usePayroll.ts` - Add new hooks
2. MODIFY: `/src/api/types/payroll.ts` - Add new types
3. MODIFY: `/src/features/payroll/components/CommissionFormModal.tsx` - Complete rewrite

### Tests
1. CREATE: `/e2e/tests/commissions-auto-calc.e2e.spec.ts`

---

## Success Criteria

1. ✅ Dump site selector appears for pumping jobs
2. ✅ Commission auto-calculates 20% for pumping (minus dump fee)
3. ✅ Commission auto-calculates 15% for service jobs
4. ✅ Calculation breakdown shows in form
5. ✅ Commission saves with dump_site_id and dump_fee_amount
6. ✅ Playwright tests pass
7. ✅ No console errors
