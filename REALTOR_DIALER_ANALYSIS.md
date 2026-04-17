# Realtor Dialer Analysis — Phase 1

## Existing System Overview

The Mac Septic CRM has a production-grade outbound dialing system with:
- **Dual telephony** (RingCentral WebRTC + Twilio fallback)
- **Power dialer** with auto-dial, smart scoring, contact cycling
- **Dannia AI subsystem** — gamification, performance tracking, smart dispositions, auto-summary
- **Real-time transcription** via WebSocket + Google Cloud STT
- **IndexedDB persistence** for 8K+ contacts via Zustand store

## Reusable Components (Zero Modification)

| Component | Path | Why Reusable |
|-----------|------|-------------|
| WebPhoneContext | `src/context/WebPhoneContext.tsx` | Phone state machine, call controls |
| SoftPhone widget | `src/features/phone/SoftPhone.tsx` | Floating dialer overlay |
| useTwilioPhone | `src/hooks/useTwilioPhone.ts` | Twilio Voice SDK integration |
| usePhone | `src/hooks/usePhone.ts` | Provider abstraction |
| useVoiceToText | `src/hooks/useVoiceToText.tsx` | Browser speech capture |
| useWebSocket | `src/hooks/useWebSocket.ts` | Real-time event bus |
| Call controls | mute, hold, DTMF, transfer, voicemail | All in WebPhoneContext |
| UI components | `src/components/ui/*` | Button, Dialog, Badge, etc. |
| Call disposition API | `src/features/phone/api.ts` | Query hooks for call records |
| Screen pop | `src/features/phone/components/ScreenPop.tsx` | Customer lookup on call |

## Components to Adapt

| Component | Path | What Changes |
|-----------|------|-------------|
| PowerDialer | `outbound-campaigns/components/PowerDialer.tsx` | Contact model fields, scoring logic |
| ContactTable | `outbound-campaigns/components/ContactTable.tsx` | Column schema for realtor fields |
| ContactScreenPop | `outbound-campaigns/components/ContactScreenPop.tsx` | Show brokerage, referral count |
| CampaignAnalytics | `outbound-campaigns/components/CampaignAnalytics.tsx` | Metrics: referrals, revenue/agent |
| SmartDisposition | `dannia/smartDisposition.ts` | Realtor-specific disposition tree |
| scoringV2 | `outbound-campaigns/scoring.ts` | Score by follow-up urgency, not contract |
| DanniaDashboard | `dannia/components/DanniaDashboard.tsx` | Realtor leaderboard tab |
| Gamification | `dannia/DanniaGamification.tsx` | Referral-based achievements |
| Zustand store | `outbound-campaigns/store.ts` | New data model, realtor-specific actions |

## New Components Needed

| Component | Purpose |
|-----------|---------|
| RealtorPipelinePage | Main page with pipeline kanban + table view |
| RealtorCard | Agent detail card (brokerage, coverage area, relationship status) |
| PipelineBoard | Kanban: cold → intro'd → warm → active referrer |
| ReferralTracker | Track which agent sent which inspection + revenue |
| FollowUpQueue | Auto-surface agents not contacted in 3+ weeks |
| DocumentSender | One-click send one-pager, quote, inspection report |
| AgentLeaderboard | Gamified ranking by referrals and revenue |
| RealtorDialer | Adapted PowerDialer with realtor context |

## Backend Architecture

- **Synchronous SQLAlchemy** with `SessionLocal` (not async)
- **UUID primary keys** on all models
- **Pydantic v2** schemas with `from_attributes = True`
- **Service layer** pattern (business logic in `services/`, not endpoints)
- **No existing Customer/Contact model** — contacts live in frontend Zustand store
- **CallLog model** references `customer_id` as String(255)

## Navigation Integration

Add to `src/components/layout/navConfig.ts`:
- Top-level: `{ path: "/realtor-pipeline", label: "Realtor Pipeline", icon: Building2 }`
- Or inside a "Sales" nav group

## Route Registration

Create `src/routes/app/realtor-pipeline.routes.tsx` and import in `src/routes/index.tsx`.
