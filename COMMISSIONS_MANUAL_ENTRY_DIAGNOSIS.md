# Commissions Manual Entry - Bug Diagnosis

## Date: 2026-02-04
## Status: Bug Reproduced and Documented

---

## Bug Description

**Critical Issue:** Manual commission entries lack specific job types (Pump Out or Service), no field for dump fees in manual mode, and Pump Out commission should auto-calculate as total revenue minus dump fees.

---

## Current Implementation Analysis

### Commission Types Available (CommissionFormModal.tsx:42-47)
```typescript
const COMMISSION_TYPES = [
  { value: "job_completion", label: "Job Completion" },
  { value: "upsell", label: "Upsell" },
  { value: "referral", label: "Referral" },
  { value: "bonus", label: "Bonus" },
];
```

**MISSING:**
- `pump_out` - Pump Out job (20% commission, dump fees apply)
- `service` - Service job (15% commission, no dump fees)

### Dump Fees Field
- **Auto-Calculate Mode:** Dump site selection appears when job_type is "pumping" or "grease_trap"
- **Manual Entry Mode:** NO dump fees field at all - this is the bug

### Auto-Calculation Logic (Manual Mode - lines 274-285)
```typescript
// Manual calculation fallback (when not using work order)
useEffect(() => {
  if (manualMode && rateType === "percent" && baseAmount && rate) {
    const base = parseFloat(baseAmount);
    const rateDecimal = parseFloat(rate) / 100;
    if (!isNaN(base) && !isNaN(rateDecimal)) {
      const calculated = base * rateDecimal;
      setCommissionAmount(calculated.toFixed(2));
    }
  } else if (manualMode && rateType === "fixed" && rate) {
    setCommissionAmount(rate);
  }
}, [manualMode, baseAmount, rate, rateType]);
```

**PROBLEM:** This calculation:
1. Does NOT consider service type (Pump Out vs Service)
2. Does NOT deduct dump fees for Pump Out jobs
3. Uses user-entered rate instead of automatic rate based on type

---

## Expected Behavior

### For Pump Out (20% rate):
```
Commission = (Job Total - Dump Fees) × 20%
```

### For Service (15% rate):
```
Commission = Job Total × 15%
```

---

## Files Involved

### Frontend (ReactCRM)
- `/src/features/payroll/components/CommissionFormModal.tsx` - Main form modal
- `/src/api/types/payroll.ts` - TypeScript types
- `/src/api/hooks/usePayroll.ts` - API hooks

### Backend (react-crm-api)
- `/app/api/v2/payroll.py` - API endpoints
- `/app/models/payroll.py` - Database model
- `/app/schemas/payroll.py` - Pydantic schemas (if exists)

---

## Bug Reproduction Steps

1. Login with will@macseptic.com / #Espn2025
2. Go to Payroll page
3. Click Commissions tab
4. Click "Add New Commission" button
5. Select "Manual Entry" radio option
6. **Observe:** Commission Type dropdown shows:
   - Job Completion
   - Upsell
   - Referral
   - Bonus
   - **MISSING: Pump Out, Service**
7. **Observe:** NO dump fees input field in manual mode
8. Enter base amount and rate manually
9. **Observe:** Calculation is simple: base × rate (NO type-based logic)

---

## Root Cause Summary

1. **Missing Types:** `pump_out` and `service` not in COMMISSION_TYPES array
2. **No Dump Fees in Manual Mode:** Dump site/fee UI only shows in auto-calc mode
3. **No Smart Calculation:** Manual mode doesn't apply type-specific rates or dump fee deduction

---

## Required Changes

### Frontend
1. Add "Pump Out" and "Service" to commission types dropdown
2. Show dump fees input when "Pump Out" is selected in manual mode
3. Auto-calculate based on type:
   - Pump Out: (total - dump_fees) × 0.20
   - Service: total × 0.15

### Backend
1. Add `pump_out` and `service` to accepted commission_type values
2. Handle dump_fees in manual commission creation
3. Auto-calculate if commission_amount not provided

---

## Promise

<promise>COMMISSIONS_MANUAL_ENTRY_BUG_REPRODUCED</promise>
