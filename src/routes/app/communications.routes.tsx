import { lazy, Suspense } from "react";
import { Route, Navigate } from "react-router-dom";
import { PageLoader } from "../utils";

// Communications lazy imports
const CommunicationsOverview = lazy(() =>
  import("@/features/communications/pages/CommunicationsOverview.tsx").then(
    (m) => ({ default: m.CommunicationsOverview }),
  ),
);

const SMSInbox = lazy(() =>
  import("@/features/communications/pages/SMSInbox.tsx").then((m) => ({
    default: m.SMSInbox,
  })),
);

const SMSConversation = lazy(() =>
  import("@/features/communications/pages/SMSConversation.tsx").then((m) => ({
    default: m.SMSConversation,
  })),
);

const EmailInbox = lazy(() =>
  import("@/features/communications/pages/EmailInbox.tsx").then((m) => ({
    default: m.EmailInbox,
  })),
);

const EmailConversation = lazy(() =>
  import("@/features/communications/pages/EmailConversation.tsx").then((m) => ({
    default: m.EmailConversation,
  })),
);

const AllTemplates = lazy(() =>
  import("@/features/communications/pages/AllTemplates.tsx").then((m) => ({
    default: m.AllTemplates,
  })),
);

const SMSTemplates = lazy(() =>
  import("@/features/communications/pages/SMSTemplates.tsx").then((m) => ({
    default: m.SMSTemplates,
  })),
);

const EmailTemplates = lazy(() =>
  import("@/features/communications/pages/EmailTemplates.tsx").then((m) => ({
    default: m.EmailTemplates,
  })),
);

const ReminderConfig = lazy(() =>
  import("@/features/communications/pages/ReminderConfig.tsx").then((m) => ({
    default: m.ReminderConfig,
  })),
);

const ReminderDetail = lazy(() =>
  import("@/features/communications/pages/ReminderDetail.tsx").then((m) => ({
    default: m.ReminderDetail,
  })),
);

const PhonePage = lazy(() =>
  import("@/features/phone/index.ts").then((m) => ({ default: m.PhonePage })),
);

const CallsPage = lazy(() =>
  import("@/features/calls/index.ts").then((m) => ({ default: m.CallsPage })),
);

const CallIntelligenceDashboard = lazy(() =>
  import("@/features/call-intelligence/index.ts").then((m) => ({
    default: m.CallIntelligenceDashboard,
  })),
);

const QuickCallLogPage = lazy(() =>
  import("@/features/quick-call-log/QuickCallLogPage.tsx").then((m) => ({
    default: m.QuickCallLogPage,
  })),
);

const LiveChatPage = lazy(() =>
  import("@/features/live-chat/index.ts").then((m) => ({
    default: m.LiveChatPage,
  })),
);

/**
 * Communications routes - SMS, Email, Phone, Templates, Reminders
 */
export function CommunicationsRoutes() {
  return (
    <>
      {/* /messages → /communications redirect */}
      <Route path="messages" element={<Navigate to="/communications" replace />} />

      {/* Communications Overview */}
      <Route
        path="communications"
        element={
          <Suspense fallback={<PageLoader />}>
            <CommunicationsOverview />
          </Suspense>
        }
      />

      {/* SMS */}
      <Route
        path="communications/sms"
        element={
          <Suspense fallback={<PageLoader />}>
            <SMSInbox />
          </Suspense>
        }
      />
      <Route
        path="communications/sms/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <SMSConversation />
          </Suspense>
        }
      />

      {/* Email */}
      <Route
        path="communications/email-inbox"
        element={
          <Suspense fallback={<PageLoader />}>
            <EmailInbox />
          </Suspense>
        }
      />
      <Route
        path="communications/email-inbox/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <EmailConversation />
          </Suspense>
        }
      />

      {/* Templates */}
      <Route
        path="communications/templates"
        element={
          <Suspense fallback={<PageLoader />}>
            <AllTemplates />
          </Suspense>
        }
      />
      <Route
        path="communications/templates/sms"
        element={
          <Suspense fallback={<PageLoader />}>
            <SMSTemplates />
          </Suspense>
        }
      />
      <Route
        path="communications/templates/email"
        element={
          <Suspense fallback={<PageLoader />}>
            <EmailTemplates />
          </Suspense>
        }
      />

      {/* Reminders */}
      <Route
        path="communications/reminders"
        element={
          <Suspense fallback={<PageLoader />}>
            <ReminderConfig />
          </Suspense>
        }
      />
      <Route
        path="communications/reminders/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <ReminderDetail />
          </Suspense>
        }
      />

      {/* Phone */}
      <Route
        path="phone"
        element={
          <Suspense fallback={<PageLoader />}>
            <PhonePage />
          </Suspense>
        }
      />

      {/* Calls */}
      <Route
        path="calls"
        element={
          <Suspense fallback={<PageLoader />}>
            <CallsPage />
          </Suspense>
        }
      />

      {/* Call Intelligence */}
      <Route
        path="call-intelligence"
        element={
          <Suspense fallback={<PageLoader />}>
            <CallIntelligenceDashboard />
          </Suspense>
        }
      />

      {/* Quick Call Log */}
      <Route
        path="quick-call-log"
        element={
          <Suspense fallback={<PageLoader />}>
            <QuickCallLogPage />
          </Suspense>
        }
      />

      {/* Live Chat */}
      <Route
        path="live-chat"
        element={
          <Suspense fallback={<PageLoader />}>
            <LiveChatPage />
          </Suspense>
        }
      />
    </>
  );
}
