# Commissions Manual Entry - Root Cause Analysis

## Date: 2026-02-04
## Status: Root Cause Identified

---

## Root Cause Summary

The bug exists because the manual commission entry form was designed primarily for auto-calculate mode (linked to work orders) and manual mode was added as a simplified fallback without the service type logic.

---

## Detailed Root Cause Analysis

### 1. Missing Commission Types in Frontend

**File:** `/src/features/payroll/components/CommissionFormModal.tsx` (lines 42-47)

```typescript
const COMMISSION_TYPES = [
  { value: "job_completion", label: "Job Completion" },
  { value: "upsell", label: "Upsell" },
  { value: "referral", label: "Referral" },
  { value: "bonus", label: "Bonus" },
] as const;
```

**Problem:** The array is missing:
- `pump_out` - For Pump Out jobs (20% commission with dump fee deduction)
- `service` - For Service jobs (15% commission, no dump fees)

---

### 2. Dump Fees Only in Auto-Calculate Mode

**File:** `/src/features/payroll/components/CommissionFormModal.tsx` (lines 473-504)

```typescript
{/* Dump Site Selection (for pumping jobs) */}
{requiresDumpSite && !manualMode && selectedWorkOrderId && (
  // Only renders when NOT in manual mode
  <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
    ...
  </div>
)}
```

**Problem:** The condition `!manualMode` explicitly hides dump site selection in manual mode.

---

### 3. No Type-Based Auto-Calculation in Manual Mode

**File:** `/src/features/payroll/components/CommissionFormModal.tsx` (lines 274-285)

```typescript
// Manual calculation fallback (when not using work order)
useEffect(() => {
  if (manualMode && rateType === "percent" && baseAmount && rate) {
    const base = parseFloat(baseAmount);
    const rateDecimal = parseFloat(rate) / 100;
    if (!isNaN(base) && !isNaN(rateDecimal)) {
      const calculated = base * rateDecimal;  // Simple: base × rate
      setCommissionAmount(calculated.toFixed(2));
    }
  }
  // ...
}, [manualMode, baseAmount, rate, rateType]);
```

**Problem:**
- Uses user-entered rate instead of type-based automatic rate
- Does NOT deduct dump fees for Pump Out jobs
- No conditional logic based on commission type

---

### 4. Backend Has Existing Support

**File:** `/app/models/payroll.py` (lines 89-130)

The database model ALREADY supports:
- `commission_type` - String(50), can accept any type
- `dump_fee_amount` - Float, nullable
- `commissionable_amount` - Float, nullable

**The backend is ready** - the fix is primarily frontend.

---

## Why This Happened

The commission form was built with two modes:
1. **Auto-Calculate Mode:** Links to a work order, auto-detects job type, shows dump site selection for pumping jobs
2. **Manual Entry Mode:** Simplified mode for quick manual entries without work order linkage

The manual mode was designed as a "quick add" feature and assumed users would manually calculate. The requirement for Pump Out/Service types with automatic calculation was not implemented.

---

## Technical Debt

- Commission types are hardcoded in frontend instead of fetched from backend
- Rate configuration (20% for Pump Out, 15% for Service) is duplicated between auto-calc and should be centralized
- Manual mode should leverage the same calculation logic as auto mode

---

## Fix Strategy

### Frontend Changes Required

1. **Add commission types:**
   ```typescript
   const COMMISSION_TYPES = [
     { value: "pump_out", label: "Pump Out", rate: 0.20, hasDumpFees: true },
     { value: "service", label: "Service", rate: 0.15, hasDumpFees: false },
     // Existing types...
   ];
   ```

2. **Show dump fees field in manual mode when Pump Out selected:**
   ```typescript
   {manualMode && commissionType === "pump_out" && (
     <div>
       <Label>Dump Fees ($)</Label>
       <Input value={dumpFeeAmount} onChange={...} />
     </div>
   )}
   ```

3. **Update calculation logic:**
   ```typescript
   useEffect(() => {
     if (manualMode && baseAmount) {
       const base = parseFloat(baseAmount);
       const dumpFee = commissionType === "pump_out" ? parseFloat(dumpFeeAmount || "0") : 0;
       const commissionable = base - dumpFee;
       const rate = commissionType === "pump_out" ? 0.20 :
                    commissionType === "service" ? 0.15 : parseFloat(rate) / 100;
       setCommissionAmount((commissionable * rate).toFixed(2));
     }
   }, [manualMode, baseAmount, dumpFeeAmount, commissionType]);
   ```

### Backend Changes (Minimal)

- Accept `pump_out` and `service` as valid commission_type values
- Ensure dump_fee_amount is properly saved from manual entry

---

## Promise

<promise>COMMISSIONS_MANUAL_ENTRY_ROOT_CAUSE_FOUND</promise>
