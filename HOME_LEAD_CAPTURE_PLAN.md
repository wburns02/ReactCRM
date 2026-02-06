# Home Page Lead Capture Implementation Plan

## Date: 2026-01-28

---

## Goals
1. Add MAC Septic logo and name prominently
2. Change location to "Central Texas"
3. Minimize clicks - autofill, smart defaults
4. Easiest signup for rural users - phone first, simple form
5. Add date/time frame selection
6. Match 2026 best practices

---

## Phase 1: Branding Updates

### 1.1 Add Logo to HeroSection
- Add MAC Septic logo image to hero
- Display company name "MAC Septic" prominently
- File: `src/features/landing/components/HeroSection.tsx`

### 1.2 Update Location Text
- Change "East Central Texas" → "Central Texas"
- Update in HeroSection.tsx headline
- Update page title in LandingPage.tsx

---

## Phase 2: Form Simplification

### 2.1 Reduce Form Fields
Current (7 fields) → Target (5 fields):

| Field | Keep | Notes |
|-------|------|-------|
| First Name | Yes | Combine with last as "Full Name" |
| Last Name | Merge | Single "Name" field |
| Phone | Yes | Required, primary contact |
| Email | Yes | Optional |
| Service Type | Yes | Dropdown |
| Address | Remove | Can get later |
| Message | Remove | Can get later |
| **NEW: Preferred Time** | Add | Quick select |

### 2.2 New Form Structure
```
1. Name (single field, required) - autocomplete="name"
2. Phone (required) - autocomplete="tel"
3. Email (optional) - autocomplete="email"
4. Service Type (dropdown, required)
5. Preferred Time (quick select, optional)
```

### 2.3 Add Autocomplete Attributes
```html
<input name="name" autocomplete="name" />
<input name="phone" type="tel" autocomplete="tel" />
<input name="email" type="email" autocomplete="email" />
```

---

## Phase 3: Date/Time Selection

### 3.1 Add Preferred Time Quick Select
Options (tile buttons, single select):
- "ASAP / Emergency"
- "Today"
- "Tomorrow"
- "This Week"
- "I'm Flexible"

### 3.2 Optional Time of Day
If Today/Tomorrow selected, show:
- "Morning (8am-12pm)"
- "Afternoon (12pm-5pm)"
- "Any Time"

---

## Phase 4: Files to Modify

### Primary Changes
1. `src/features/landing/components/HeroSection.tsx`
   - Add logo
   - Change "East Central Texas" → "Central Texas"

2. `src/features/landing/components/LeadCaptureForm.tsx`
   - Simplify to 5 fields
   - Add autocomplete attributes
   - Add preferred time quick select
   - Update validation schema

3. `src/features/landing/types/lead.ts`
   - Update schema for new fields
   - Add preferred_time field

4. `src/features/landing/LandingPage.tsx`
   - Update page title to "Central Texas"

### Supporting Changes
5. `src/features/landing/hooks/useLeadSubmit.ts`
   - Handle new preferred_time field

---

## Phase 5: Implementation Order

1. **Commit 1**: Update location text (East Central → Central Texas)
2. **Commit 2**: Add MAC Septic logo to hero
3. **Commit 3**: Add autocomplete attributes to form
4. **Commit 4**: Add preferred time quick select
5. **Commit 5**: Simplify form fields (remove address, message; merge name)

---

## Phase 6: Verification Checklist

After each commit, verify:
- [ ] Logo visible in hero
- [ ] "Central Texas" text present
- [ ] Phone click-to-call works
- [ ] Form autofills from browser
- [ ] Preferred time selection works
- [ ] Form submits successfully
- [ ] Success message displays
- [ ] No console errors

---

## Playwright Tests Required

```typescript
// e2e/home-lead-capture.e2e.spec.ts
1. Navigate to /home
2. Assert MAC Septic logo visible
3. Assert "Central Texas" text
4. Assert phone link works
5. Fill form with autofill attributes
6. Select preferred time
7. Submit form
8. Assert success message
9. Assert no console errors
```
