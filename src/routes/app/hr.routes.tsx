import { Suspense, lazy } from "react";
import { Route } from "react-router-dom";

import { PageLoader } from "../utils";


const HrOverviewPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.HrOverviewPage })),
);

const RequisitionsListPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.RequisitionsListPage })),
);

const RequisitionEditorPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.RequisitionEditorPage })),
);

const RequisitionDetailPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.RequisitionDetailPage })),
);

const ApplicantDetailPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.ApplicantDetailPage })),
);

const ApplicantsListPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.ApplicantsListPage })),
);

const ApplicantInboxPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.ApplicantInboxPage })),
);

const MessageTemplatesAdminPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.MessageTemplatesAdminPage })),
);

const EmployeeDetailPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.EmployeeDetailPage })),
);

const OnboardingDetailPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.OnboardingDetailPage })),
);

const OffboardingDetailPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.OffboardingDetailPage })),
);

const OrgChartPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.OrgChartPage })),
);

const RecruitingHubPage = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.RecruitingHubPage })),
);

const RecruitingOverviewTab = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.RecruitingOverviewTab })),
);

const CandidatesTab = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.CandidatesTab })),
);

const OpenHeadcountTab = lazy(() =>
  import("@/features/hr").then((m) => ({ default: m.OpenHeadcountTab })),
);


export function HrRoutes() {
  return (
    <>
      <Route
        path="hr"
        element={
          <Suspense fallback={<PageLoader />}>
            <HrOverviewPage />
          </Suspense>
        }
      />
      <Route
        path="hr/org-chart"
        element={
          <Suspense fallback={<PageLoader />}>
            <OrgChartPage />
          </Suspense>
        }
      />
      <Route
        path="hr/recruiting"
        element={
          <Suspense fallback={<PageLoader />}>
            <RecruitingHubPage />
          </Suspense>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<PageLoader />}>
              <RecruitingOverviewTab />
            </Suspense>
          }
        />
        <Route
          path="overview"
          element={
            <Suspense fallback={<PageLoader />}>
              <RecruitingOverviewTab />
            </Suspense>
          }
        />
        <Route
          path="requisitions"
          element={
            <Suspense fallback={<PageLoader />}>
              <RequisitionsListPage />
            </Suspense>
          }
        />
        <Route
          path="candidates"
          element={
            <Suspense fallback={<PageLoader />}>
              <CandidatesTab />
            </Suspense>
          }
        />
        <Route
          path="open-headcount"
          element={
            <Suspense fallback={<PageLoader />}>
              <OpenHeadcountTab />
            </Suspense>
          }
        />
        <Route
          path="templates"
          element={
            <Suspense fallback={<PageLoader />}>
              <MessageTemplatesAdminPage />
            </Suspense>
          }
        />
      </Route>
      <Route
        path="hr/inbox"
        element={
          <Suspense fallback={<PageLoader />}>
            <ApplicantInboxPage />
          </Suspense>
        }
      />
      <Route
        path="hr/settings/message-templates"
        element={
          <Suspense fallback={<PageLoader />}>
            <MessageTemplatesAdminPage />
          </Suspense>
        }
      />
      <Route
        path="hr/requisitions"
        element={
          <Suspense fallback={<PageLoader />}>
            <RequisitionsListPage />
          </Suspense>
        }
      />
      <Route
        path="hr/requisitions/new"
        element={
          <Suspense fallback={<PageLoader />}>
            <RequisitionEditorPage />
          </Suspense>
        }
      />
      <Route
        path="hr/requisitions/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <RequisitionDetailPage />
          </Suspense>
        }
      />
      <Route
        path="hr/applicants"
        element={
          <Suspense fallback={<PageLoader />}>
            <ApplicantsListPage />
          </Suspense>
        }
      />
      <Route
        path="hr/applicants/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <ApplicantDetailPage />
          </Suspense>
        }
      />
      <Route
        path="hr/employees/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <EmployeeDetailPage />
          </Suspense>
        }
      />
      <Route
        path="hr/onboarding/:instanceId"
        element={
          <Suspense fallback={<PageLoader />}>
            <OnboardingDetailPage />
          </Suspense>
        }
      />
      <Route
        path="hr/offboarding/:instanceId"
        element={
          <Suspense fallback={<PageLoader />}>
            <OffboardingDetailPage />
          </Suspense>
        }
      />
    </>
  );
}
