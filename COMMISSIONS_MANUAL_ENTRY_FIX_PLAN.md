# Commissions Manual Entry - Fix Plan

## Date: 2026-02-04
## Status: Plan Ready for Implementation

---

## Objective

Update manual commission entry to:
1. Include Pump Out and Service job types
2. Add dump fees field (visible only for Pump Out)
3. Auto-calculate commission:
   - Pump Out: (Total - Dump Fees) × 20%
   - Service: Total × 15%

---

## Implementation Plan

### Step 1: Update Commission Types Enum (Frontend)

**File:** `src/features/payroll/components/CommissionFormModal.tsx`

**Change:**
```typescript
const COMMISSION_TYPES = [
  { value: "pump_out", label: "Pump Out", rate: 0.20, hasDumpFees: true },
  { value: "service", label: "Service", rate: 0.15, hasDumpFees: false },
  { value: "job_completion", label: "Job Completion" },
  { value: "upsell", label: "Upsell" },
  { value: "referral", label: "Referral" },
  { value: "bonus", label: "Bonus" },
] as const;
```

---

### Step 2: Add State for Manual Dump Fees

**File:** `src/features/payroll/components/CommissionFormModal.tsx`

**Add state:**
```typescript
const [manualDumpFee, setManualDumpFee] = useState("");
```

**Reset in useEffect on modal open:**
```typescript
setManualDumpFee("");
```

---

### Step 3: Show Dump Fees Field for Pump Out in Manual Mode

**File:** `src/features/payroll/components/CommissionFormModal.tsx`

**Add UI below commission type dropdown in manual mode:**
```typescript
{/* Dump Fees (Manual Mode - Pump Out only) */}
{manualMode && commissionType === "pump_out" && (
  <div>
    <Label htmlFor="manual-dump-fee">Dump Fees *</Label>
    <div className="relative">
      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
      <Input
        id="manual-dump-fee"
        type="number"
        step="0.01"
        min="0"
        placeholder="50.00"
        value={manualDumpFee}
        onChange={(e) => setManualDumpFee(e.target.value)}
        className="pl-9"
      />
    </div>
    <p className="text-xs text-text-secondary mt-1">
      Dump site fees to deduct before calculating commission
    </p>
  </div>
)}
```

---

### Step 4: Update Auto-Calculation Logic

**File:** `src/features/payroll/components/CommissionFormModal.tsx`

**Replace existing manual calculation useEffect:**
```typescript
// Smart calculation for manual mode based on commission type
useEffect(() => {
  if (!manualMode || !baseAmount) return;

  const base = parseFloat(baseAmount);
  if (isNaN(base)) return;

  // Get type config
  const typeConfig = COMMISSION_TYPES.find(t => t.value === commissionType);

  // Determine if using smart rates (pump_out or service)
  if (commissionType === "pump_out") {
    const dumpFee = parseFloat(manualDumpFee || "0") || 0;
    const commissionable = Math.max(0, base - dumpFee);
    const commission = commissionable * 0.20;
    setCommissionAmount(commission.toFixed(2));
    setRate("20"); // Show rate in UI
    setCommissionableAmount(commissionable);
    setDumpFeeAmount(dumpFee);
  } else if (commissionType === "service") {
    const commission = base * 0.15;
    setCommissionAmount(commission.toFixed(2));
    setRate("15"); // Show rate in UI
    setCommissionableAmount(base);
    setDumpFeeAmount(null);
    setManualDumpFee(""); // Clear dump fee when switching to service
  } else {
    // Legacy types - use user-entered rate
    if (rateType === "percent" && rate) {
      const rateDecimal = parseFloat(rate) / 100;
      if (!isNaN(rateDecimal)) {
        const calculated = base * rateDecimal;
        setCommissionAmount(calculated.toFixed(2));
      }
    } else if (rateType === "fixed" && rate) {
      setCommissionAmount(rate);
    }
  }
}, [manualMode, baseAmount, manualDumpFee, commissionType, rate, rateType]);
```

---

### Step 5: Show Calculation Preview

**File:** `src/features/payroll/components/CommissionFormModal.tsx`

**Add calculation preview in manual mode:**
```typescript
{/* Manual Mode Calculation Preview */}
{manualMode && baseAmount && (commissionType === "pump_out" || commissionType === "service") && (
  <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
    <div className="flex items-start gap-2 mb-2">
      <Calculator className="w-5 h-5 text-primary mt-0.5" />
      <p className="text-sm font-medium text-primary">Commission Preview</p>
    </div>
    <div className="space-y-1 font-mono text-sm text-text-secondary">
      {commissionType === "pump_out" ? (
        <>
          <p>Job Total: {formatCurrency(parseFloat(baseAmount))}</p>
          <p>- Dump Fees: {formatCurrency(parseFloat(manualDumpFee || "0"))}</p>
          <p>= Commissionable: {formatCurrency(commissionableAmount || 0)}</p>
          <p>× 20% Rate</p>
        </>
      ) : (
        <>
          <p>Job Total: {formatCurrency(parseFloat(baseAmount))}</p>
          <p>× 15% Rate</p>
        </>
      )}
    </div>
    <div className="mt-2 pt-2 border-t border-primary/30 flex justify-between items-center">
      <span className="text-sm font-medium">Commission:</span>
      <span className="text-lg font-bold text-primary">
        {formatCurrency(parseFloat(commissionAmount || "0"))}
      </span>
    </div>
  </div>
)}
```

---

### Step 6: Update Submit Handler

**File:** `src/features/payroll/components/CommissionFormModal.tsx`

**Update input object in handleSubmit:**
```typescript
const input: CreateCommissionInput = {
  technician_id: technicianId,
  work_order_id: selectedWorkOrderId || undefined,
  commission_type: commissionType as CreateCommissionInput["commission_type"],
  base_amount: parseFloat(baseAmount),
  rate: parseFloat(rate) / 100,
  rate_type: rateType,
  commission_amount: parseFloat(commissionAmount),
  earned_date: earnedDate || undefined,
  description: description || undefined,
  // Include dump fees for manual pump_out entries
  dump_fee_amount: commissionType === "pump_out" && manualDumpFee
    ? parseFloat(manualDumpFee)
    : undefined,
  commissionable_amount: commissionableAmount || undefined,
  // Existing auto-calc fields for non-manual mode
  dump_site_id: dumpSiteId || undefined,
  job_type: jobType || undefined,
  gallons_pumped: gallons || undefined,
  dump_fee_per_gallon: dumpFeePerGallon || undefined,
};
```

---

### Step 7: Update TypeScript Types (if needed)

**File:** `src/api/types/payroll.ts`

**Ensure CreateCommissionInput accepts pump_out and service:**
```typescript
commission_type?: "job_completion" | "upsell" | "referral" | "bonus" | "pump_out" | "service";
```

---

### Step 8: Backend - Accept New Commission Types

**File:** `app/api/v2/payroll.py`

**Update docstring/comment at line 1284:**
```python
commission_type: str = "job_completion"  # job_completion, upsell, referral, bonus, pump_out, service
```

No validation changes needed - the field is a string and will accept any value.

---

### Step 9: Hide Rate Fields for Pump Out/Service

Since Pump Out and Service have fixed rates (20% and 15%), hide the manual rate entry for these types:

```typescript
{/* Rate Type & Rate - Only for legacy types */}
{(manualMode || isEditing) && commissionType !== "pump_out" && commissionType !== "service" && (
  <div className="grid grid-cols-2 gap-4">
    {/* Existing rate type and rate inputs */}
  </div>
)}
```

---

## Testing Plan

### Manual Testing
1. Login as will@macseptic.com
2. Navigate to Payroll → Commissions
3. Click "Add New Commission"
4. Select "Manual Entry"
5. Test Pump Out:
   - Select "Pump Out" type
   - Verify dump fees field appears
   - Enter total: $500, dump fees: $100
   - Verify commission shows: ($500 - $100) × 20% = $80
6. Test Service:
   - Select "Service" type
   - Verify dump fees field hidden
   - Enter total: $300
   - Verify commission shows: $300 × 15% = $45
7. Submit and verify success

### Playwright E2E Tests
See `tests/commissions-manual-entry.e2e.spec.ts`

---

## Commit Strategy

1. **Commit 1:** Add commission types and dump fees state
2. **Commit 2:** Add dump fees UI for Pump Out
3. **Commit 3:** Update calculation logic
4. **Commit 4:** Add calculation preview
5. **Commit 5:** Final polish and TypeScript types

Or single comprehensive commit for all changes.

---

## Rollback Plan

If issues occur:
1. Revert to previous CommissionFormModal.tsx
2. The database schema is unchanged, so no migration rollback needed
3. Existing commission records are unaffected

---

## Ready for Implementation
