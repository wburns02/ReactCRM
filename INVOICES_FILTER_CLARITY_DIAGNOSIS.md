# Invoices Filter Clarity Diagnosis

## Date: 2026-01-26

## Problem Statement
When users select a status filter (All, Draft, Sent, Paid, Overdue, Void), there is no clear visual indication of which filter is currently active. Users can easily get confused about what invoices they are viewing.

## Current Implementation Analysis

### File: `/src/features/invoicing/InvoicesPage.tsx`

### Filter Controls (Lines 156-172)
```tsx
<Select value={filters.status || ""} onChange={handleStatusChange}>
  <option value="">All Statuses</option>
  {Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => (
    <option key={value} value={value}>{label}</option>
  ))}
</Select>
```

### Table Header (Lines 213-218)
```tsx
<CardTitle>
  {data?.total
    ? `${data.total} invoice${data.total !== 1 ? "s" : ""}`
    : "Invoices"}
</CardTitle>
```

## Root Causes Identified

### 1. No Filter Status Label
- The CardTitle only shows count: "7 invoices" or "Invoices"
- It does NOT show which filter is active
- Users see "7 invoices" but don't know if that's All, Draft, Sent, etc.

### 2. Dropdown is the Only Indicator
- The dropdown itself shows the selected value
- But dropdowns are easy to miss or ignore
- No prominent label above table to confirm current filter

### 3. No Visual Feedback on Filter Change
- When switching filters, only the data changes
- No badge, chip, or text updates to confirm the change

## Available Status Filters
- `""` (empty) → "All Statuses"
- `draft` → "Draft"
- `sent` → "Sent"
- `paid` → "Paid"
- `overdue` → "Overdue"
- `void` → "Void"

## Expected 2026 Best Practices
1. Prominent label: "Viewing Draft Invoices" or "7 Draft Invoices"
2. Badge/chip with current filter and X to clear
3. Clear visual distinction when filter is active vs. all
4. Consistent pattern with other list pages

## Fix Required

Update the CardTitle to reflect the current filter:
- When no filter: "7 invoices" (current)
- When filter active: "7 Draft invoices" or "Viewing Draft Invoices (7)"

Also consider adding a filter badge/chip above the table.
