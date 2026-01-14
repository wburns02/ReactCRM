# Legacy → React CRM Feature Migration Plan

## Feature Parity Analysis

### ✅ FULLY IMPLEMENTED IN REACT
- Customer & Prospect Management
- Work Orders & Scheduling (drag-drop)
- Technician Management
- Invoicing & Payments (Stripe)
- SMS/Twilio Integration
- Email Marketing
- Dashboard & Analytics
- QuickBooks Integration
- AI Dispatch & Route Optimization
- Predictive Maintenance
- Fleet GPS Tracking (Leaflet maps)
- Tickets/Support System
- Customer Portal
- Notifications (push/email/SMS)
- Marketing Hub (Google Ads, SEO, Reviews)
- Equipment & Inventory
- Payroll

### ⚠️ PARTIALLY IMPLEMENTED (Needs Enhancement)
1. **Reports** - Basic reports exist, missing detailed BI dashboard
2. **Activities** - Basic logging, missing full timeline features
3. **User Management** - Basic CRUD, missing detailed permissions

### ❌ MISSING FROM REACT (Priority Migration)

#### HIGH PRIORITY - Core Business Features

1. **Call Center & Telephony**
   - RingCentral OAuth integration
   - Call log synchronization
   - Call recording playback
   - Call transcription (AI-powered)
   - Call dispositions management
   - QA scorecards
   - Call analytics (heatmaps, missed calls, callback metrics)
   - Sentiment analysis on calls

2. **Compliance & Regulatory Management**
   - License tracking with expiration alerts
   - Certification management
   - Permit tracking
   - Inspection scheduling & results
   - Compliance audit logs
   - County portal integration

3. **Contracts & Service Agreements**
   - Contract template management
   - Contract creation from templates
   - Scheduled service tracking
   - Contract renewal workflow
   - Recurring service subscriptions

4. **Time Tracking & Timesheets**
   - Clock in/out functionality
   - Timesheet management
   - Overtime tracking
   - Mobile time entry
   - Time entry approval workflow

5. **Job Costing & Profitability**
   - Labor cost tracking per job
   - Material cost tracking
   - Equipment rental costs
   - Profit margin calculations
   - Job profitability analysis
   - Cost vs estimate comparison

#### MEDIUM PRIORITY - Operational Enhancements

6. **Data Import/Export**
   - Bulk customer import (CSV)
   - Bulk work order import
   - Data validation & error handling
   - Import mapping customization
   - Export functionality

7. **Provider Portal**
   - Provider self-registration
   - Document submission workflow
   - Provider approval process
   - Provider status management
   - Provider analytics

8. **Advanced Fleet Integration (Samsara)**
   - Vehicle diagnostics sync
   - Driver safety scores
   - Maintenance alerts from vehicle data
   - Fuel efficiency tracking
   - Vehicle health monitoring

9. **Enhanced Reporting & BI**
   - Revenue by service/technician/location
   - Customer lifetime value (CLV)
   - Customer acquisition cost
   - Technician performance scoring
   - Service profitability analysis
   - Custom report builder
   - Report scheduling & email

10. **Multi-Location Support**
    - Location-based filtering
    - Territory assignment
    - Multi-location dispatch
    - Location-specific settings

#### LOWER PRIORITY - Nice to Have

11. **Advanced Communication Features**
    - Communication templates library
    - Scheduled message sending
    - Bulk messaging campaigns
    - Communication thread management

12. **Booking & Appointment Widget**
    - Customer-facing booking page
    - Available slot discovery
    - Service type selection
    - Appointment confirmation

13. **Document Management**
    - File attachment to customers/work orders
    - Document categorization
    - Document search
    - Document versioning

---

## Implementation Strategy

### Phase 1: Call Center (Week 1-2)
Critical for operations - many calls daily

### Phase 2: Compliance (Week 3-4)
Required for regulatory compliance

### Phase 3: Contracts & Time Tracking (Week 5-6)
Enables recurring revenue and payroll accuracy

### Phase 4: Job Costing (Week 7-8)
Enables profitability analysis

### Phase 5: Data Import & Provider Portal (Week 9-10)
Enables data migration and vendor management

### Phase 6: Enhanced Reporting (Week 11-12)
Business intelligence and insights

---

## API Endpoints Needed (FastAPI Backend)

### Call Center
```
POST   /api/v2/ringcentral/authorize
GET    /api/v2/ringcentral/callback
GET    /api/v2/calls
GET    /api/v2/calls/{id}
GET    /api/v2/calls/{id}/recording
POST   /api/v2/calls/{id}/transcribe
GET    /api/v2/call-dispositions
POST   /api/v2/calls/{id}/disposition
GET    /api/v2/calls/analytics
GET    /api/v2/calls/heatmap
```

### Compliance
```
GET    /api/v2/compliance/licenses
POST   /api/v2/compliance/licenses
GET    /api/v2/compliance/certifications
POST   /api/v2/compliance/inspections
GET    /api/v2/compliance/alerts
GET    /api/v2/compliance/dashboard
```

### Contracts
```
GET    /api/v2/contracts
POST   /api/v2/contracts
GET    /api/v2/contract-templates
POST   /api/v2/contracts/{id}/activate
GET    /api/v2/subscriptions
POST   /api/v2/subscriptions
```

### Time Tracking
```
POST   /api/v2/time-entries/clock-in
POST   /api/v2/time-entries/clock-out
GET    /api/v2/time-entries
GET    /api/v2/timesheets
POST   /api/v2/timesheets/{id}/approve
```

### Job Costing
```
GET    /api/v2/work-orders/{id}/costs
POST   /api/v2/work-orders/{id}/costs
GET    /api/v2/job-costing/summary
GET    /api/v2/job-costing/profitability
```

---

## React Components Needed

### Call Center Module
- `CallList.tsx` - Call log table with filters
- `CallDetails.tsx` - Individual call view with recording player
- `CallRecordingPlayer.tsx` - Audio player with transcription
- `CallDispositions.tsx` - Disposition management
- `CallAnalytics.tsx` - Charts and heatmaps
- `RingCentralSettings.tsx` - OAuth connection UI

### Compliance Module
- `ComplianceDashboard.tsx` - Overview with alerts
- `LicenseList.tsx` - License tracking
- `CertificationList.tsx` - Certification management
- `InspectionCalendar.tsx` - Inspection scheduling
- `ComplianceAlerts.tsx` - Expiration warnings

### Contracts Module
- `ContractList.tsx` - Contract management
- `ContractTemplates.tsx` - Template library
- `ContractBuilder.tsx` - Contract creation
- `SubscriptionList.tsx` - Recurring services

### Time Tracking Module
- `TimeClockWidget.tsx` - Clock in/out button
- `TimesheetView.tsx` - Weekly timesheet
- `TimeEntryList.tsx` - Time entry history
- `TimesheetApproval.tsx` - Manager approval

### Job Costing Module
- `JobCostingPanel.tsx` - Cost entry on work orders
- `ProfitabilityReport.tsx` - Job profit analysis
- `CostBreakdown.tsx` - Labor/material/equipment split

---

## Database Models Needed (FastAPI/SQLAlchemy)

Already exist in Legacy - can reference:
- `CallLog` / `call_data`
- `CallDisposition`
- `License`, `Certification`, `Permit`, `Inspection`
- `Contract`, `ContractTemplate`
- `Subscription`
- `TimeEntry`, `Timesheet`
- `JobCost`

---

## Estimated Effort

| Feature | Frontend | Backend | Total |
|---------|----------|---------|-------|
| Call Center | 5 days | 3 days | 8 days |
| Compliance | 4 days | 2 days | 6 days |
| Contracts | 3 days | 2 days | 5 days |
| Time Tracking | 3 days | 2 days | 5 days |
| Job Costing | 2 days | 2 days | 4 days |
| Data Import | 2 days | 2 days | 4 days |
| Provider Portal | 3 days | 2 days | 5 days |
| Enhanced Reports | 4 days | 3 days | 7 days |
| Multi-Location | 2 days | 2 days | 4 days |
| **TOTAL** | **28 days** | **20 days** | **48 days** |

With overnight autonomous loops running, this could be accelerated significantly.
