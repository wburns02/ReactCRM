# Fix Call Map Visibility & SoftPhone Overlap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two bugs: (1) the call map never appears during active calls, and (2) the SoftPhone widget overlaps the CallMapFloater.

**Architecture:** Bug 1 has two root causes — CallMapBridge only reads RC calls (not Twilio), and Twilio calls don't expose CallSid to the bridge. Fix by having WebPhonePage directly push call SID into the callMapStore when Twilio calls start. Bug 2 is a CSS positioning conflict — move the CallMapFloater to the bottom-left corner to avoid competing with the SoftPhone on the bottom-right.

**Tech Stack:** React 19, TypeScript, Zustand, Twilio Voice SDK, Tailwind CSS 4

---

## File Structure

| File | Action | What Changes |
|------|--------|-------------|
| `src/features/phone/WebPhonePage.tsx` | Modify | Push Twilio call SID into callMapStore when calls start/end |
| `src/features/call-map/CallMapFloater.tsx` | Modify | Move to bottom-left corner to avoid SoftPhone overlap |
| `src/features/call-map/CallMapProvider.tsx` | Modify | Add caller-number-based location lookup as fallback when WS doesn't deliver location |

---

## Task 1: Push Twilio Call SID into CallMapStore from WebPhonePage

**Files:**
- Modify: `src/features/phone/WebPhonePage.tsx`

The core problem: `CallMapBridge` reads `activeCall` from `useSharedWebPhone()` (RC context only). When using the Twilio fallback, `twilioActiveCall` is local state in WebPhonePage — the bridge never sees it. Fix by directly calling `useCallMapStore.getState().setActiveCallSid()` when Twilio calls start.

- [ ] **Step 1: Add callMapStore import to WebPhonePage**

In `src/features/phone/WebPhonePage.tsx`, add import at top near other imports:

```typescript
import { useCallMapStore } from "@/features/call-map/callMapStore";
```

- [ ] **Step 2: Push call SID when Twilio outbound call starts**

In the `handleDial` function, after `twilioDeviceRef.current.connect()` returns, extract the CallSid and push it into the store. Find this code block (around line 277-289):

```typescript
        const outCall = await twilioDeviceRef.current.connect({
          params: { To: `+1${digits}` },
        });
        twilioCallRef.current = outCall;
        setTwilioActiveCall({
          direction: "outbound",
          remoteNumber: digits,
          startTime: Date.now(),
          muted: false,
          held: false,
          recording: false,
          session: outCall,
        });
        setDialInput("");
```

Add after `setDialInput("")`:

```typescript
        // Push call SID to map store for location detection
        const sid = outCall.parameters?.CallSid || outCall.outboundConnectionId || null;
        if (sid) {
          useCallMapStore.getState().setActiveCallSid(sid);
        }
```

- [ ] **Step 3: Push call SID when Twilio inbound call arrives**

In the `connectTwilio` function, inside the `device.on("incoming", ...)` handler, after `setTwilioActiveCall(...)`. Find this block (around line 185-200):

```typescript
      device.on("incoming", (incomingCall: TwilioCall) => {
        twilioCallRef.current = incomingCall;
        const from = incomingCall.parameters?.From || "Unknown";
        setTwilioActiveCall({
          ...
        });
        setTwilioState("ringing");
```

Add after `setTwilioState("ringing")`:

```typescript
        // Push call SID to map store
        const inSid = incomingCall.parameters?.CallSid || null;
        if (inSid) {
          useCallMapStore.getState().setActiveCallSid(inSid);
        }
```

- [ ] **Step 4: Clear call SID when Twilio call ends**

In the `handleHangup` function, before `setTwilioActiveCall(null)`:

```typescript
        useCallMapStore.getState().setActiveCallSid(null);
```

Also in the `outCall.on("disconnect", ...)` callback inside `handleDial`:

```typescript
        outCall.on("disconnect", () => {
          twilioCallRef.current = null;
          setTwilioActiveCall(null);
          setTwilioState("registered");
          useCallMapStore.getState().setActiveCallSid(null);
        });
```

And in the inbound call's `incomingCall.on("disconnect", ...)` callback inside `connectTwilio`:

```typescript
        incomingCall.on("disconnect", () => {
          twilioCallRef.current = null;
          setTwilioActiveCall(null);
          setTwilioState("registered");
          useCallMapStore.getState().setActiveCallSid(null);
        });
```

- [ ] **Step 5: Build and verify**

```bash
cd /home/will/ReactCRM && npm run build
```

Expected: Build passes with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/phone/WebPhonePage.tsx
git commit -m "fix: push Twilio call SID into callMapStore for map visibility"
```

---

## Task 2: Move CallMapFloater to Bottom-Left to Avoid SoftPhone Overlap

**Files:**
- Modify: `src/features/call-map/CallMapFloater.tsx`

The SoftPhone widget lives at `fixed bottom-4 right-4 z-50` (288px wide). The CallMapFloater is at the exact same position (`fixed bottom-4 right-4 z-50`, 380px wide). They stack on top of each other. Move the floater to the bottom-left.

- [ ] **Step 1: Change CallMapFloater position from bottom-right to bottom-left**

In `src/features/call-map/CallMapFloater.tsx`, line 37, change the position class:

```typescript
// Before:
<div className="fixed bottom-4 right-4 z-50 w-[380px] overflow-hidden rounded-xl border border-border bg-bg-card shadow-2xl">

// After:
<div className="fixed bottom-4 left-4 z-50 w-[380px] overflow-hidden rounded-xl border border-border bg-bg-card shadow-2xl">
```

- [ ] **Step 2: Build and verify**

```bash
cd /home/will/ReactCRM && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/features/call-map/CallMapFloater.tsx
git commit -m "fix: move CallMapFloater to bottom-left to avoid SoftPhone overlap"
```

---

## Task 3: Add Caller Number Location Fallback in CallMapProvider

**Files:**
- Modify: `src/features/call-map/CallMapProvider.tsx`

Even with the call SID fix, the WS-based location detection may not fire if: (a) the backend WS doesn't have the call's media stream yet, (b) Nominatim is slow, or (c) the caller doesn't mention a location. Add a fallback: when a call starts, do an immediate REST-based customer phone lookup to get their location.

- [ ] **Step 1: Add phone-lookup fallback when activeCallSid changes**

In `src/features/call-map/CallMapProvider.tsx`, add a new `useEffect` after the WS connection effect. This effect fires when a call starts and tries to look up the caller's location via the CRM customer database:

```typescript
  // Fallback: look up caller location from CRM when call starts
  // (WS location detection can be slow or may not trigger for short calls)
  const callerNumber = useCallMapStore((s) => {
    // Get the remote number from the active Twilio or RC call
    // This is set separately — we'll add it in Step 2
    return s.callerNumber;
  });

  useEffect(() => {
    if (!activeCallSid || !callerNumber) return;

    const lookupCaller = async () => {
      try {
        // Search customers by phone number
        const { data } = await apiClient.get("/customers", {
          params: { search: callerNumber, page_size: 1 },
        });
        const customer = data?.items?.[0];
        if (customer?.latitude && customer?.longitude) {
          // Check zone via service-markets API
          let zone: "core" | "extended" | "outside" = "outside";
          let driveMinutes = 0;
          try {
            const { data: zoneData } = await apiClient.get(
              "/service-markets/nashville/zone-check",
              { params: { lat: customer.latitude, lng: customer.longitude } },
            );
            zone = zoneData.zone;
            driveMinutes = zoneData.drive_minutes;
          } catch {}

          const addr = [customer.address_line1, customer.city, customer.state]
            .filter(Boolean)
            .join(", ");

          setLocation({
            lat: Number(customer.latitude),
            lng: Number(customer.longitude),
            source: "customer_record",
            address_text: addr || "Customer location",
            zone,
            drive_minutes: driveMinutes,
            customer_id: customer.id,
            confidence: 0.95,
            transcript_excerpt: "",
          });
        }
      } catch {
        // Silent — this is a best-effort fallback
      }
    };

    // Small delay to let WS location fire first (if it does)
    const timer = setTimeout(lookupCaller, 2000);
    return () => clearTimeout(timer);
  }, [activeCallSid, callerNumber, setLocation]);
```

- [ ] **Step 2: Add callerNumber to CallMapStore**

In `src/features/call-map/types.ts`, add to `CallMapState`:

```typescript
  callerNumber: string | null;
  setCallerNumber: (number: string | null) => void;
```

In `src/features/call-map/callMapStore.ts`, add:

```typescript
  callerNumber: null,
  setCallerNumber: (callerNumber: string | null) => set({ callerNumber }),
```

And update `reset`:

```typescript
  reset: () =>
    set({
      location: null,
      nearbyJobs: [],
      isVisible: false,
      isExpanded: false,
      activeCallSid: null,
      callerNumber: null,
    }),
```

- [ ] **Step 3: Push caller number from WebPhonePage**

In `src/features/phone/WebPhonePage.tsx`, alongside the call SID pushes from Task 1:

For outbound calls (in `handleDial` after the SID push):
```typescript
        useCallMapStore.getState().setCallerNumber(digits);
```

For inbound calls (in `connectTwilio` incoming handler, after the SID push):
```typescript
        useCallMapStore.getState().setCallerNumber(from.replace(/\D/g, ""));
```

For call end (alongside the `setActiveCallSid(null)` calls):
```typescript
        useCallMapStore.getState().setCallerNumber(null);
```

- [ ] **Step 4: Build and verify**

```bash
cd /home/will/ReactCRM && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/features/call-map/CallMapProvider.tsx src/features/call-map/callMapStore.ts src/features/call-map/types.ts src/features/phone/WebPhonePage.tsx
git commit -m "feat: add customer phone lookup fallback for call map location"
```

---

## Task 4: Build, Push, and Playwright Verify

**Files:**
- No new files

- [ ] **Step 1: Final build**

```bash
cd /home/will/ReactCRM && npm run build
```

- [ ] **Step 2: Push to GitHub**

```bash
git push
```

- [ ] **Step 3: Wait for Railway deploy (~2 min)**

```bash
sleep 120
curl -s https://react.ecbtx.com/ | head -5
```

- [ ] **Step 4: Playwright verify — floater position**

Navigate to the web phone page, verify the CallMapFloater would appear on the bottom-left (not overlapping SoftPhone on bottom-right). Verify no console errors on the phone page.

- [ ] **Step 5: Playwright verify — SoftPhone not blocked**

Verify the SoftPhone "Connect Phone" button is visible in the bottom-right and not overlapped by any other element.
