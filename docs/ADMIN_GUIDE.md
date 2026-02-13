# Mac Service Platform — Admin Guide

## Logging In

1. Navigate to https://react.ecbtx.com
2. Enter your email and password
3. If MFA is enabled, enter the 6-digit code from your authenticator app

## Dashboard

The main dashboard shows:
- **Quick Stats**: Total customers, active work orders, revenue, overdue invoices
- **Recent Activity**: Latest work orders, customer interactions
- **Charts**: Revenue trends, job completion rates, technician performance

## Managing Customers

**Customers** > View all customers in a searchable, sortable table.

- **Add Customer**: Click "Add Customer" button. Required: first name, last name, email or phone.
- **Edit**: Click any customer row to open the detail view.
- **Search**: Use the search bar to filter by name, email, phone, or address.

## Work Orders

**Work Orders** > Manage all service jobs.

- **Create**: Click "New Work Order". Select customer, service type, priority, technician.
- **Status Flow**: Draft → Scheduled → Confirmed → En Route → On Site → In Progress → Completed
- **Bulk Actions**: Select multiple work orders with checkboxes, then use the bulk action dropdown for status updates, technician assignment, or deletion.
- **Filters**: Filter by status, priority, technician, date range.

## Schedule

**Schedule** > Calendar view of all work orders.

- Drag and drop work orders between time slots
- Click a work order to view/edit details
- Use the technician filter to see individual schedules

## Technicians

**Technicians** > Manage field technicians.

- **Add**: Click "Add Technician". Required: first name, last name, email, phone.
- **Edit**: Click a technician row. Update contact info, skills, pay rates.
- **Active/Inactive**: Toggle technician status. Only active technicians appear in dropdowns.

## Payroll

**Payroll** > Commission-based pay management.

- **Pay Periods**: Create biweekly periods. End date cannot be in the future.
- **Commission Model**: 100% commission-based. If commissions are below the backboard threshold ($2,307.69/period by default), the backboard amount is paid instead.
- **Export**: Download CSV reports for each pay period.

## Invoices & Payments

**Invoices** > Track billing. **Payments** > Record payments.

- Create invoices from customer records
- Record payments (cash, check, credit card, Clover POS)
- Clover POS payments sync automatically from the Clover integration
- Search/filter by status, method, amount, date range

## Integrations

**Settings** > **Integrations** page:

| Integration | Purpose | Setup |
|-------------|---------|-------|
| **Clover POS** | Payment processing | Connect via OAuth in Integrations page |
| **Samsara** | Fleet GPS tracking | Set API token in Railway env vars |
| **RingCentral** | Phone system | Set credentials in Railway env vars |
| **Google Ads** | Marketing analytics | Set OAuth2 credentials in Railway env vars |

## Fleet Tracking

**Fleet** > Live vehicle tracking via Samsara GPS.

- Real-time vehicle positions on map
- Refreshes every 10 seconds
- Toggle between vehicle list and map views

## Reports & Analytics

**Reports** > Pre-built reports:
- Revenue by period, service type, location
- Technician performance and utilization
- Customer lifetime value
- Pipeline analysis

**Analytics** > Advanced dashboards:
- First-time fix rate
- Financial snapshots
- Operational metrics

## Dark Mode

Toggle dark/light mode using the sun/moon button in the sidebar footer or the top navigation bar. Your preference is saved locally.

## System Settings

**Settings** page (admin only):
- Company information
- Tax rate (default 8.25%)
- Service types configuration
- User management

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open AI Assistant |
| `Escape` | Close modals/dialogs |

## Getting Help

- **Onboarding**: New users see a setup wizard on first login
- **AI Assistant**: Click the floating orb (bottom-right) or press Ctrl+K
- **Help Center**: Available from the onboarding assistant
- **API Docs**: https://react-crm-api-production.up.railway.app/docs
