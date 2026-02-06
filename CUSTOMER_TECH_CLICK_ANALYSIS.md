# Customer & Technician Click Analysis

## Date: 2026-01-15

## Problem
Clicking anywhere on a customer or technician row does NOT navigate to the detail page. Only the explicit "View" button works.

## Files Analyzed

### CustomersList.tsx (src/features/customers/CustomersList.tsx)

**TableCustomerRow component (line 128-229):**
- `<tr>` element has `hover:bg-bg-hover transition-colors` and `tabIndex={0}`
- **NO onClick handler on the row**
- Navigation only happens via `<Link to={/customers/${customer.id}}>` wrapping the "View" button (line 189)

**MobileCustomerCard component (line 24-123):**
- `<Card>` has no onClick handler
- Navigation only via `<Link to={/customers/${customer.id}}>` wrapping the "View" button (line 95)

### TechniciansList.tsx (src/features/technicians/TechniciansList.tsx)

**TableTechnicianRow component (line 20-124):**
- `<tr>` element has `hover:bg-bg-hover transition-colors` and `tabIndex={0}`
- **NO onClick handler on the row**
- Navigation only happens via `<Link to={/technicians/${technician.id}}>` wrapping the "View" button (line 84)

## Root Cause

The rows visually appear clickable (hover effect, tabIndex) but have NO click handler attached. The only navigation mechanism is the explicit "View" button wrapped in a `<Link>`.

## Current Behavior
1. User clicks on customer/technician name → Nothing happens
2. User clicks on phone number → Nothing happens (or mailto/tel link if clicking exact text)
3. User clicks on empty space in row → Nothing happens
4. User clicks "View" button → Navigates to detail page ✓

## Expected Behavior
1. User clicks ANYWHERE on the row (except action buttons) → Navigate to detail page
2. "View" button still works
3. "Edit" and "Delete" buttons still work (don't trigger row navigation)
4. Email/phone links still work as links

## Fix Required
Add `onClick` handler to `<tr>` elements that navigates using `useNavigate()`, with `e.stopPropagation()` on nested interactive elements.
