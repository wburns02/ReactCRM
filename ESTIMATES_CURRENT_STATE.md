# Estimates Current State Analysis

## Date: January 25, 2026

## Overview

The Estimates page is functional - data loads and basic creation works. However, the line item entry is manual free-text input with no service selector or presets.

## Current Flow

### 1. Estimate Creation (EstimatesPage.tsx)

**CreateEstimateModal Component:**
- Customer selector dropdown ✓
- Line items with fields: Service, Description, Qty, Rate
- Tax rate input
- Valid days input
- Notes textarea
- Real-time total calculation ✓

**Line Item Entry (CURRENT - Manual):**
```tsx
<Input placeholder="Service" value={item.service} />  // Free text
<Input placeholder="Description" value={item.description} />
<Input type="number" placeholder="Qty" value={item.quantity} />
<Input type="number" placeholder="Rate" value={item.rate} />
```

**Gap:** Users must type service names and remember rates manually.

### 2. Existing Preset Services (NOT CONNECTED)

**Frontend Presets (ConfigureServicesStep.tsx):**
```typescript
const PRESET_SERVICES = [
  { name: "Septic Tank Pumping", price: 350 },
  { name: "Septic Inspection", price: 250 },
  { name: "Grease Trap Cleaning", price: 200 },
  { name: "Emergency Service", price: 500 },
  { name: "Septic Repair", price: 400 },
  { name: "System Installation", price: 5000 },
  { name: "Drain Cleaning", price: 150 },
  { name: "Maintenance Contract", price: 300 },
];
```

**Pricing Engine (pricingEngine.ts):**
```typescript
export const SERVICE_PRICES = {
  pumping: { name: "Septic Pumping", basePrice: 350, unit: "service" },
  inspection: { name: "System Inspection", basePrice: 175, unit: "service" },
  repair: { name: "Repair Service", basePrice: 150, unit: "hour" },
  // ... more services
};
```

### 3. Backend Services (EXISTS)

**ServiceCatalog Model (pricing.py):**
- `code`, `name`, `description`
- `category` (pumping, repair, inspection, installation)
- `base_price`, `cost`, `min_price`, `max_price`
- `unit` (each, hour, gallon, foot)
- `is_active`, `is_taxable`

**API Endpoint:**
- `GET /api/v2/services` - List services with filtering
- `POST /api/v2/services` - Create service

### 4. Quote/Line Item Structure

**Quote Form Data:**
```typescript
{
  customer_id: number,
  status: "draft",
  line_items: [{
    service: string,      // Service name
    description?: string, // Optional
    quantity: number,
    rate: number,
  }],
  tax_rate: number,
  valid_until: string,
  notes?: string,
}
```

## What's Missing

| Feature | Status |
|---------|--------|
| Service selector dropdown | ❌ Missing |
| Quick-add common services | ❌ Missing |
| Search services | ❌ Missing |
| Category filters | ❌ Missing |
| Auto-fill rate from preset | ❌ Missing |
| Service packages/bundles | ❌ Missing |
| Default tax from settings | ❌ Missing |

## Files to Modify

1. **EstimatesPage.tsx** - Add service selector to CreateEstimateModal
2. **New: useServices.ts** - Hook to fetch service catalog from API
3. **New: ServiceSelector.tsx** - Reusable service picker component
4. **Backend: seed services** - Populate service_catalog with septic services

## Current User Flow

1. User clicks "Create Estimate"
2. Modal opens
3. User selects customer ✓
4. User manually types "Septic Pumping" (may misspell)
5. User manually enters rate (may not know correct price)
6. User adjusts quantity
7. User enters tax rate (no default)
8. User clicks Create

## Desired User Flow

1. User clicks "Create Estimate"
2. Modal opens
3. User selects customer ✓
4. **User sees quick-add buttons for common services**
5. **User clicks "Pump Out - 1000gal" → auto-fills service, rate**
6. **Or user searches "inspection" → sees matching services**
7. User adjusts quantity if needed
8. **Tax rate pre-filled from company settings**
9. User clicks Create

## Technical Notes

- Backend ServiceCatalog exists but may not be populated
- Frontend has PRESET_SERVICES constant that could be used immediately
- Could use local presets first, then migrate to API-backed later
