# A++ Feature Implementation Workflow for reactCRM

## 1. Objective

The goal of this workflow is to systematically implement the features present in the legacy `Mac-Septic-CRM` into the modern `reactCRM` application. This process will be strictly driven by a "test-first" methodology using Playwright to ensure that each feature is robust, complete, and bug-free before being considered "done."

## 2. Core Methodology: Playwright-Driven Development (PDD)

For every feature listed below, the following process is non-negotiable:

1.  **Write the Test First:** Before writing a single line of implementation code, create a new Playwright test file (e.g., `e2e/features/quotes.spec.ts`). This test will define the feature's acceptance criteria from a user's perspective. It should try to navigate to the feature's page, interact with its (not-yet-existent) elements, and make assertions about the outcome.
2.  **Run and Watch it Fail:** Execute the new test and confirm that it fails, likely because the route doesn't exist or elements are not found. This is the "Red" step in Red-Green-Refactor.
3.  **Implement to Pass (The "Green" Step):**
    *   **UI Scaffolding:** Create the minimum necessary React components, pages (`src/features/...`), and routes (`src/routes/index.tsx`) to make the page load and remove the initial 404 errors. Add a temporary link to the new feature in the main navigation sidebar (`src/components/layout/AppLayout.tsx` or similar) so Playwright can access it.
    *   **API Mocking:** These features will require new backend APIs. **Do not assume they exist.** Use a frontend API mocking tool (like `msw` if available, or by wrapping `axios`/`fetch` calls in test-specific mocks) to define the expected API requests and provide mock responses. Your Playwright tests should run against this mocked API layer.
    *   **Logic Implementation:** Build out the feature's state management (Zustand), forms (React Hook Form), and other logic needed to make the Playwright test's assertions pass.
4.  **Iterate Until Zero Issues:** The feature is only considered **complete** when the entire Playwright test suite (`npm run test:e2e`) passes with zero failures or console errors.

---

## 3. Workflow & Prompts

Below are the prompts for implementing each missing feature set. Execute them in order.

### Foundational Step: Navigation

**Prompt #0: Setup Feature Navigation**

"Before adding new features, I need a scalable way to add them to the UI.

1.  **Analyze `src/components/layout/AppLayout.tsx`** and related components to understand how the navigation sidebar is generated.
2.  **Create a new file `src/components/layout/nav-items.ts`** that exports a configuration array for all navigation items, including icons, text, paths, and potentially feature flags.
3.  **Refactor the `AppLayout.tsx`** to generate the sidebar dynamically from this configuration file.
4.  **Write a Playwright test `e2e/core/navigation.spec.ts`** that verifies all existing navigation links are present and navigate to the correct pages. Ensure this test passes after your refactor. This makes adding future navigation items trivial."

---

### Part 1: Financial Module

**Prompt #1: Quotes & Contracts**

"I need to build a 'Quotes & Contracts' module. All API calls should be mocked.

1.  **Write a Playwright test `e2e/features/quotes.spec.ts`** that:
    *   Navigates to `/app/quotes`. It should fail (404).
    *   Asserts the page has a 'Create Quote' button.
    *   Tests the creation of a new quote (fills out customer info, line items, pricing).
    *   Asserts the new quote appears in a list on the `/app/quotes` page.
    *   Tests the ability to view a created quote and convert it into a 'Contract'.
2.  **Implement the feature** following the PDD methodology until the test passes.
    *   Add a 'Quotes' link to `nav-items.ts`.
    *   Create the required pages under `src/features/quotes/`.
    *   Mock all API endpoints (e.g., `GET /api/quotes`, `POST /api/quotes`, `GET /api/quotes/:id`, `POST /api/quotes/:id/convert-to-contract`)."

**Prompt #2: Payroll**

"Now, build a 'Payroll' module for processing employee payments. All API calls should be mocked.

1.  **Write a Playwright test `e2e/features/payroll.spec.ts`** that:
    *   Navigates to `/app/payroll` and asserts the page loads.
    *   Tests the ability to select a date range for a payroll run.
    *   Asserts that a list of technicians and their calculated earnings (based on mock data of completed work orders) is displayed.
    *   Tests a 'Process Payroll' button and asserts that a success message is shown.
2.  **Implement the feature** following the PDD methodology until the test passes.
    *   Add a 'Payroll' link to `nav-items.ts`.
    *   Create pages under `src/features/payroll/`.
    *   Mock API endpoints like `GET /api/payroll/run?start_date=...&end_date=...` and `POST /api/payroll/process`."

**Prompt #3: Pricing Configuration**

"Build a 'Pricing' configuration page. All API calls should be mocked.

1.  **Write a Playwright test `e2e/features/pricing.spec.ts`** that:
    *   Navigates to `/app/admin/pricing` and asserts the page loads.
    *   Asserts a list of services and their prices is displayed.
    *   Tests the ability to edit the price of a service item.
    *   Tests the ability to add a new service item.
    *   Includes a button to 'Import from Clover' which shows a confirmation dialog (do not implement the full import).
2.  **Implement the feature** following the PDD methodology until the test passes.
    *   Add a 'Pricing' link under 'Admin Settings' in `nav-items.ts`.
    *   Create pages under `src/features/admin/pricing/`.
    *   Mock endpoints like `GET /api/pricing`, `PUT /api/pricing/:id`, `POST /api/pricing`."

---

### Part 2: Advanced Marketing Module

**Prompt #4: Marketing Hub**

"Create a centralized 'Marketing Hub'. All API calls should be mocked.

1.  **Write a Playwright test `e2e/features/marketing-hub.spec.ts`** that:
    *   Navigates to `/app/marketing` and asserts a dashboard-like page loads.
    *   The hub should display summary widgets for 'Email Campaigns', 'SMS Consent Stats', and 'Marketing AI Advisor'.
    *   Each widget should have a link to its respective (not-yet-built) feature page.
2.  **Implement the feature** following the PDD methodology until the test passes.
    *   Add a 'Marketing' link to `nav-items.ts`.
    *   Create pages under `src/features/marketing/`.
    *   Mock endpoints like `GET /api/marketing/summary`."

**Prompt #5: SMS Opt-in Management**

"Build a feature to manage SMS consent. All API calls should be mocked.

1.  **Write a Playwright test `e2e/features/sms-consent.spec.ts`** that:
    *   Navigates to `/app/marketing/sms` and asserts the page loads.
    *   Asserts a list of customers and their SMS opt-in status is displayed.
    *   Tests a search box to find a customer.
    *   Tests the ability to manually toggle a customer's SMS consent, which triggers a mocked API call and updates the UI.
2.  **Implement the feature** following the PDD methodology until the test passes.
    *   Create pages under `src/features/marketing/sms/`.
    *   Mock endpoints like `GET /api/sms-consent?search=...` and `POST /api/sms-consent/:customerId/toggle`."

---

### Part 3: Portals and Integrations

**Prompt #6: Employee Portal**

"Build a simple, read-only 'Employee Portal'.

1.  **Write a Playwright test `e2e/portals/employee-portal.spec.ts`** that:
    *   Logs in as a non-admin user (you may need to extend your auth mock).
    *   Navigates to `/app/my-portal` and asserts the page loads.
    *   Asserts the page displays the logged-in user's upcoming schedule and recent work orders.
    *   Asserts that admin-only links like 'Users', 'Admin', 'Payroll' are **not** visible in the sidebar.
2.  **Implement the feature** following the PDD methodology until the test passes.
    *   Create a route for `/my-portal`.
    *   Use conditional logic in `nav-items.ts` based on user role from the mocked auth context.
    *   Mock endpoints like `GET /api/me/portal-data`."

**Prompt #7: RingCentral Integration**

"Flesh out the RingCentral integration page.

1.  **Write a Playwright test `e2e/features/integrations/ringcentral.spec.ts`** that:
    *   Navigates to `/app/integrations/ringcentral`.
    *   Asserts the page shows a 'Connected' status.
    *   Asserts the page has sections for 'Call Dispositions', 'Call Performance', and 'Call Recordings'.
    *   Tests that clicking 'Call Recordings' reveals a list of mock call recording entries, each with a 'Listen' button.
2.  **Implement the feature** following the PDD methodology until the test passes.
    *   Create a sub-route for `/integrations/ringcentral`.
    *   Mock endpoints like `GET /api/integrations/ringcentral/status` and `GET /api/integrations/ringcentral/recordings`."

---

## 4. Final Verification

After all prompts have been completed, the final step is to run the **entire** test suite one last time.

**Prompt #FINAL: Full System Verification**

"Run `npm run test:e2e` and `npm run test`. Ensure every single test passes and there are zero console errors. The project is not complete until this condition is met."
