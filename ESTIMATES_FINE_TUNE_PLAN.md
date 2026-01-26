# Estimates Fine-Tune Implementation Plan

## Goal
Transform manual line-item entry into a 2026-standard service selector with preset septic services for fast, accurate quoting.

## Implementation Phases

### Phase 1: Preset Service Constants (Frontend-First)

**Why frontend-first:** Fastest to implement, no backend changes needed.

**File:** `src/features/billing/constants/septicServices.ts`

```typescript
export const SEPTIC_SERVICES = {
  pumping: [
    { code: "PUMP-1000", name: "Pump Out - Up to 1000 gal", rate: 295, category: "pumping" },
    { code: "PUMP-1500", name: "Pump Out - Up to 1500 gal", rate: 395, category: "pumping" },
    { code: "PUMP-2000", name: "Pump Out - Up to 2000 gal", rate: 495, category: "pumping" },
  ],
  inspection: [
    { code: "INSP-ROUTINE", name: "Routine Inspection", rate: 195, category: "inspection" },
    { code: "INSP-REALESTATE", name: "Real Estate Inspection", rate: 395, category: "inspection" },
    { code: "INSP-CAMERA", name: "Camera Inspection", rate: 225, category: "inspection" },
  ],
  maintenance: [
    { code: "MAINT-FILTER", name: "Filter Cleaning", rate: 75, category: "maintenance" },
    { code: "MAINT-RISER", name: "Riser Installation", rate: 295, category: "maintenance" },
    { code: "MAINT-LID", name: "Lid Replacement", rate: 145, category: "maintenance" },
  ],
  repair: [
    { code: "REP-PUMP", name: "Pump Repair", rate: 325, category: "repair" },
    { code: "REP-BAFFLE", name: "Baffle Repair", rate: 225, category: "repair" },
    { code: "REP-LINE", name: "Line Repair (per foot)", rate: 85, category: "repair" },
  ],
  fees: [
    { code: "FEE-EMERGENCY", name: "Emergency/After-Hours Fee", rate: 195, category: "fees" },
    { code: "FEE-WEEKEND", name: "Weekend Service Fee", rate: 95, category: "fees" },
    { code: "FEE-DIG", name: "Digging/Access Fee", rate: 95, category: "fees" },
    { code: "FEE-LOCATE", name: "Tank Locating Fee", rate: 95, category: "fees" },
  ],
};

export const COMMON_SERVICES = [
  "PUMP-1000", "PUMP-1500", "INSP-ROUTINE", "FEE-EMERGENCY"
];

export const SERVICE_PACKAGES = [
  {
    code: "PKG-MAINT",
    name: "Maintenance Package",
    description: "Pump + Inspection + Filter Clean",
    items: ["PUMP-1000", "INSP-ROUTINE", "MAINT-FILTER"],
    discount: 10, // percent
  },
  {
    code: "PKG-REALESTATE",
    name: "Real Estate Package",
    description: "Full Inspection + Camera + Report",
    items: ["INSP-REALESTATE", "INSP-CAMERA"],
    discount: 5,
  },
];
```

### Phase 2: Service Selector Component

**File:** `src/features/billing/components/ServiceSelector.tsx`

**Features:**
- Search input with autocomplete
- Category tabs (All, Pumping, Inspection, Maintenance, Repair, Fees)
- Quick-add buttons for COMMON_SERVICES
- Click to select → auto-fill service name and rate
- Package selector with discount badge

**UI Design:**
```
┌──────────────────────────────────────────────────┐
│ Quick Add:                                        │
│ [Pump 1000gal] [Pump 1500gal] [Inspection] [+Emg]│
├──────────────────────────────────────────────────┤
│ 🔍 Search services...                            │
├──────────────────────────────────────────────────┤
│ [All] [Pumping] [Inspection] [Maint] [Repair]   │
├──────────────────────────────────────────────────┤
│ Pump Out - Up to 1000 gal              $295  [+]│
│ Pump Out - Up to 1500 gal              $395  [+]│
│ Routine Inspection                      $195  [+]│
└──────────────────────────────────────────────────┘
```

### Phase 3: Update CreateEstimateModal

**Changes to EstimatesPage.tsx:**

1. Add ServiceSelector above line items
2. When service selected:
   - Add new line item with pre-filled service name and rate
   - Quantity defaults to 1
   - User can still edit rate if needed

3. Keep manual entry option for custom services

**Updated Flow:**
```tsx
{/* Service Selector */}
<ServiceSelector onSelect={(service) => {
  setLineItems([...lineItems, {
    service: service.name,
    description: "",
    quantity: 1,
    rate: service.rate,
  }]);
}} />

{/* Line Items Table (existing, but now pre-filled) */}
{lineItems.map((item, index) => (
  <LineItemRow key={index} item={item} ... />
))}
```

### Phase 4: Smart Defaults

1. **Default Tax Rate:** Load from company settings (or use 8.25% for Texas)
2. **Default Valid Days:** 30 days
3. **Auto-description:** Service code in description for tracking

### Phase 5: Package Support

**Add "Add Package" button:**
- Shows available packages
- Click adds all items with discount applied
- Shows "Package: Maintenance (10% off)" badge

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/features/billing/constants/septicServices.ts` | CREATE | Service definitions |
| `src/features/billing/components/ServiceSelector.tsx` | CREATE | Service picker UI |
| `src/features/billing/pages/EstimatesPage.tsx` | MODIFY | Integrate ServiceSelector |

## Implementation Order

1. ✅ Create septicServices.ts constants
2. ✅ Create ServiceSelector.tsx component
3. ✅ Integrate into CreateEstimateModal
4. ✅ Add quick-add buttons
5. ✅ Add category filtering
6. ✅ Add package support
7. ✅ Test manually
8. ✅ Write Playwright tests

## Success Criteria

- [ ] Quick-add buttons for 4 most common services
- [ ] Searchable service list
- [ ] Category filtering
- [ ] Click service → adds line item with rate
- [ ] Package adds multiple items with discount
- [ ] Total updates in real-time
- [ ] Playwright tests pass
