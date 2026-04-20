---
name: Dannia Mode "Calling From" Line Selector
description: Add a prominent outbound caller-ID line picker to Dannia Mode, sharing selection with the Web Phone via a persisted Zustand store
type: design
---

# Dannia Mode — "Calling From" Line Selector

## Problem

In Dannia Mode (`/outbound-campaigns` with Dannia toggle ON), there is no way to choose which phone line Dannia calls out from. The outbound call always uses the backend default. The Web Phone page (`/web-phone`) already has a line picker backed by `/ringcentral/phone-numbers`, but its selection is local component state and isn't reused anywhere else.

We want Dannia to pick her outbound line from the same list the Web Phone shows, with the selection shared across both pages so picking once sticks.

## Goals

1. Dannia Mode shows the current "Calling From" line prominently in the purple header banner, with a dropdown to change it.
2. The line list is the same one the Web Phone uses (RingCentral `/ringcentral/phone-numbers` with `OFFICE_LABELS` static fallback).
3. The selected line is stored in one shared Zustand store, persisted to `localStorage`, so Web Phone and Dannia Mode read/write the same value.
4. When Dannia dials, the selected line is passed as the `fromNumber` argument to `call(number, fromNumber)`.

## Non-Goals

- No backend changes. The `/ringcentral/phone-numbers` endpoint already exists.
- No change to the Dannia-mode contact-phone override (`9792361958` for training) — unrelated.
- No new line-management UI (add/remove lines).
- Regular (non-Dannia) Outbound mode does not get the picker in this change.

## Architecture

### New files

**`src/api/hooks/usePhoneNumbers.ts`**
Extracted from `WebPhonePage.tsx`. Exports:
- `PhoneLine` interface (id, phone_number, label, usage_type, features, can_call)
- `OFFICE_LABELS` record
- `DEFAULT_LINE` constant (`+16153452544`, Nashville TN)
- `usePhoneNumbers()` TanStack Query hook (keeps existing query key `["phone", "numbers"]` and `staleTime: 300_000` so the existing Web Phone cache is preserved)
- `getLineLabel(phoneNumber)` helper — returns `OFFICE_LABELS[phoneNumber] ?? "Unknown Line"`

**`src/stores/useOutboundLineStore.ts`**
Zustand store with `persist` middleware:
```ts
interface OutboundLineState {
  selectedLine: string; // E.164 phone number, or "" if unset
  setSelectedLine: (line: string) => void;
}
```
- Persist key: `"outbound-line"` in `localStorage`
- Initial `selectedLine` = `""` (empty). Components resolve the effective line as `selectedLine || DEFAULT_LINE` when they need a value — so the store stays truthful about whether the user has made an explicit choice, and the default isn't baked in.

**`src/features/outbound-campaigns/dannia/components/DanniaLineSelector.tsx`**
Compact dropdown for the Dannia header banner. Styled to sit inline with the "Dannia Mode ON" pill on a gradient background — white/translucent chip, small phone icon, label + formatted E.164 number, chevron. Opens a small panel listing every `line.can_call === true` entry from `usePhoneNumbers()`, matching the Web Phone's existing styling for consistency.

### Modified files

**`src/features/phone/WebPhonePage.tsx`**
- Remove the inline `PhoneLine`, `OFFICE_LABELS`, `DEFAULT_LINE`, `usePhoneNumbers`, `getLineLabel` — import from `@/api/hooks/usePhoneNumbers` instead.
- Replace `const [selectedLine, setSelectedLine] = useState<string>("")` with the shared store: `const { selectedLine, setSelectedLine } = useOutboundLineStore()`.
- All existing usages of `selectedLine` / `setSelectedLine` continue to work unchanged.

**`src/features/outbound-campaigns/OutboundCampaignsPage.tsx`**
- In the Dannia gradient header's right-side cluster (where the "Dannia Mode ON" pill lives today, lines 144–155), render `<DanniaLineSelector />` to the LEFT of the pill.
- Normal (non-Dannia) header is untouched.

**`src/features/outbound-campaigns/components/PowerDialer.tsx`**
- Read `selectedLine` from `useOutboundLineStore`.
- In `handleDial` (line 417), pass the resolved line to `call`:
  - `await call(currentContact.phone, selectedLine || DEFAULT_LINE)`
  - Applied to both the post-connect path (line 426) and the already-registered path (line 429).

**`src/hooks/useTwilioPhone.ts`**
- Add optional `fromNumber` param to the `call` signature (line 11) and implementation, matching `useWebPhone.call(number, fromNumber?)`.
- Twilio's voice SDK takes call params via `device.connect({ params: { To, From } })` — pass `From: fromNumber` when provided. (If Twilio's outbound TwiML app doesn't accept a caller-ID override, the param is simply ignored — behavior is unchanged from today for Twilio calls.)

### Data flow

```
  Web Phone page                 Dannia Mode header
  ────────────────               ─────────────────────
  line dropdown                  DanniaLineSelector
        │                                │
        └────────────┬───────────────────┘
                     ▼
           useOutboundLineStore  (Zustand, persist → localStorage)
                     │
                     ▼
             selectedLine (E.164)
                     │
                     ▼
        PowerDialer.handleDial → call(phone, selectedLine || DEFAULT_LINE)
                                   │
                     ┌─────────────┴──────────────┐
                     ▼                            ▼
              useWebPhone.call             useTwilioPhone.call
              (RC invite w/ From)          (device.connect From)
```

## Edge Cases

- **Empty list / RingCentral down**: `usePhoneNumbers` already falls back to `OFFICE_LABELS` static lines. The selector always has something to show.
- **Selected line deleted from RC**: if `selectedLine` no longer appears in `lines`, the dropdown label shows `getLineLabel(selectedLine)` (falls back to "Unknown Line"). User can pick a valid one. We don't auto-reset — that would be surprising if RC is briefly unavailable.
- **First-ever load**: `selectedLine === ""`. Selector shows "Nashville, TN" (from `DEFAULT_LINE`). Dial uses `DEFAULT_LINE`. Once the user picks, the choice persists.
- **Regular outbound mode**: picker isn't rendered. `handleDial` still passes `selectedLine || DEFAULT_LINE` — existing behavior is either unchanged (if store is empty → `DEFAULT_LINE` matches today's backend default) or honors a choice made elsewhere. Acceptable; no regression risk.

## Testing Plan

Per the project's Sacred Loop and the user's explicit instruction: **must be verified with Playwright after deploy.**

1. **Local build**: `npm run build` passes.
2. **Playwright E2E test**, run against production after Railway deploy:
   - Navigate to `/outbound-campaigns`, toggle Dannia Mode ON.
   - Assert the "Calling From" selector is visible in the purple header banner.
   - Open the dropdown, assert it lists multiple lines from `OFFICE_LABELS` at minimum.
   - Click a line (e.g. "San Marcos, TX"). Assert selector label updates.
   - Navigate to `/web-phone`. Assert the Web Phone's line selector now reads the same line (proves shared store + persistence).
   - Reload the page. Assert selection survived (proves `localStorage` persistence).
   - Filter known-noisy console errors per project rules (API Schema Violation, Sentry, ResizeObserver, favicon).
3. **Manual smoke**: on Dannia Mode, click "Connect & Dial" on a training contact, confirm a call lands on Will's cell showing the selected line's caller ID.

## Rollout

Single PR / single deploy. No migrations, no feature flag — the picker is additive and the default selection (`DEFAULT_LINE`) matches today's implicit default, so Web Phone users and Dannia users both see sensible behavior on first load.
