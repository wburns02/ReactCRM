# Reports & Analytics Module

This module provides comprehensive reporting and analytics capabilities for the MAC Septic CRM application.

## Features

### Reports Dashboard (`/reports`)
- **Key Metrics**: Total revenue, work orders completed, average job value, new customers, repeat customer rate, customer satisfaction
- **Revenue Trends**: Line/bar charts showing revenue over time
- **Service Breakdown**: Pie chart showing distribution of service types
- **Pipeline Metrics**: Sales pipeline value, prospects, conversion rate
- **Quick Links**: Navigate to detailed reports

### Revenue Report (`/reports/revenue`)
- Detailed revenue analysis and trends
- Work orders completed vs revenue correlation
- Service type breakdown with detailed statistics
- Revenue metrics with change percentages
- Chart type toggle (line/bar)
- Export functionality (CSV, PDF, Excel)

### Technician Performance (`/reports/technicians`)
- Individual technician performance metrics
- Jobs completed and revenue per technician
- Customer satisfaction ratings
- On-time completion rates
- Average job duration
- Sortable performance table
- Performance comparison charts

## Components

### Report Components (`components/`)

#### MetricCard
Displays a key metric with optional change percentage indicator.

```tsx
import { MetricCard } from '@/features/reports/components';

<MetricCard
  title="Total Revenue"
  value={125000}
  changePercent={12.5}
  icon="💰"
  format="currency"
/>
```

**Props:**
- `title`: string - Metric title
- `value`: string | number - Metric value
- `changePercent?`: number | null - Percentage change (optional)
- `icon?`: string - Emoji icon (optional)
- `format?`: 'number' | 'currency' | 'percent' - Value format
- `className?`: string - Additional CSS classes

#### DateRangePicker
Allows users to select date ranges for reports with presets.

```tsx
import { DateRangePicker } from '@/features/reports/components';

const [dateRange, setDateRange] = useState({
  start_date: '2024-01-01',
  end_date: '2024-01-31',
});

<DateRangePicker dateRange={dateRange} onChange={setDateRange} />
```

**Props:**
- `dateRange`: DateRange - Current date range
- `onChange`: (dateRange: DateRange) => void - Change handler
- `className?`: string - Additional CSS classes

**Presets:** Today, Week, Month, Quarter, Year, Custom

#### ExportButton
Export report data to various formats.

```tsx
import { ExportButton } from '@/features/reports/components';

<ExportButton
  reportType="revenue"
  dateRange={dateRange}
/>
```

**Props:**
- `reportType`: string - Type of report to export
- `dateRange?`: DateRange - Date range for export
- `className?`: string - Additional CSS classes

**Export Formats:** CSV, PDF, Excel

#### RevenueChart
Line or bar chart showing revenue trends over time.

```tsx
import { RevenueChart } from '@/features/reports/components';

<RevenueChart
  data={revenueData}
  chartType="line"
  showWorkOrders={true}
/>
```

**Props:**
- `data`: RevenueDataPoint[] - Revenue data points
- `chartType?`: 'line' | 'bar' - Chart visualization type
- `showWorkOrders?`: boolean - Show work orders overlay
- `className?`: string - Additional CSS classes

#### ServiceTypeBreakdown
Pie chart showing service type distribution.

```tsx
import { ServiceTypeBreakdown } from '@/features/reports/components';

<ServiceTypeBreakdown data={serviceBreakdown} />
```

**Props:**
- `data`: ServiceBreakdown[] - Service breakdown data
- `className?`: string - Additional CSS classes

## Analytics Components (`../analytics/components/`)

#### CustomerGrowthChart
Line chart showing customer growth over time.

```tsx
import { CustomerGrowthChart } from '@/features/analytics/components';

<CustomerGrowthChart data={customerGrowthData} />
```

**Props:**
- `data`: CustomerGrowthDataPoint[] - Customer growth data
- `className?`: string - Additional CSS classes

#### WorkOrderTrends
Stacked area chart showing work order status trends.

```tsx
import { WorkOrderTrends } from '@/features/analytics/components';

<WorkOrderTrends data={workOrderTrends} />
```

**Props:**
- `data`: WorkOrderTrendsDataPoint[] - Work order trend data
- `className?`: string - Additional CSS classes

#### SatisfactionScore
Star rating display for customer satisfaction.

```tsx
import { SatisfactionScore } from '@/features/analytics/components';

<SatisfactionScore
  score={4.5}
  maxScore={5}
  showNumeric={true}
/>
```

**Props:**
- `score`: number | null - Satisfaction score
- `maxScore?`: number - Maximum score (default: 5)
- `showNumeric?`: boolean - Show numeric value
- `className?`: string - Additional CSS classes

#### PipelineValue
Display total pipeline value with stage breakdown.

```tsx
import { PipelineValue } from '@/features/analytics/components';

<PipelineValue
  totalValue={500000}
  prospectsByStage={prospectStages}
/>
```

**Props:**
- `totalValue`: number - Total pipeline value
- `prospectsByStage?`: Array - Breakdown by stage
- `className?`: string - Additional CSS classes

#### ConversionFunnel
Visual funnel showing lead to customer conversion.

```tsx
import { ConversionFunnel } from '@/features/analytics/components';

<ConversionFunnel data={conversionData} />
```

**Props:**
- `data`: ConversionFunnel[] - Funnel stage data
- `className?`: string - Additional CSS classes

## API Hooks

### useRevenueMetrics
Fetch revenue metrics and report data.

```tsx
import { useRevenueMetrics } from '@/features/reports/api';

const { data, isLoading, error } = useRevenueMetrics(dateRange);
```

**Returns:** `RevenueReport`
- metrics: Revenue metrics with change percentages
- revenue_over_time: Revenue data points
- service_breakdown: Service type breakdown
- date_range: Report date range

### useTechnicianMetrics
Fetch technician performance metrics.

```tsx
import { useTechnicianMetrics } from '@/features/reports/api';

const { data, isLoading, error } = useTechnicianMetrics(dateRange);
```

**Returns:** `TechnicianReport`
- technicians: Array of technician metrics
- date_range: Report date range

### useCustomerMetrics
Fetch customer metrics and growth data.

```tsx
import { useCustomerMetrics } from '@/features/reports/api';

const { data, isLoading, error } = useCustomerMetrics(dateRange);
```

**Returns:** `CustomerReport`
- metrics: Customer metrics
- growth_over_time: Customer growth data points
- date_range: Report date range

### usePipelineMetrics
Fetch pipeline metrics for prospects/leads.

```tsx
import { usePipelineMetrics } from '@/features/reports/api';

const { data, isLoading, error } = usePipelineMetrics();
```

**Returns:** `PipelineMetrics`
- total_pipeline_value: Total value of pipeline
- total_prospects: Number of prospects
- prospects_by_stage: Breakdown by stage
- conversion_rate: Overall conversion rate
- average_deal_size: Average deal value

## Types

All types are defined in `types.ts` and validated with Zod schemas.

### Core Types
- `DateRange`: Date range for reports
- `RevenueMetrics`: Revenue KPIs
- `RevenueDataPoint`: Single revenue data point
- `ServiceBreakdown`: Service type breakdown
- `TechnicianMetrics`: Technician performance data
- `CustomerMetrics`: Customer KPIs
- `CustomerGrowthDataPoint`: Customer growth data point
- `WorkOrderTrendsDataPoint`: Work order trend data
- `PipelineMetrics`: Pipeline/prospect metrics
- `ConversionFunnel`: Funnel stage data

### Enums
- `TimePeriod`: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
- `ExportFormat`: 'csv' | 'pdf' | 'excel'
- `ReportType`: 'revenue' | 'technician' | 'customer' | 'work_orders' | 'pipeline'

## Backend API Endpoints

The reports module expects the following backend endpoints:

### Revenue Report
```
GET /api/reports/revenue?start_date=2024-01-01&end_date=2024-01-31
```

Response:
```json
{
  "metrics": {
    "total_revenue": 125000,
    "total_revenue_change_percent": 12.5,
    "work_orders_completed": 45,
    "work_orders_completed_change_percent": 8.2,
    "average_job_value": 2777.78,
    "average_job_value_change_percent": 3.5,
    "new_customers": 12,
    "new_customers_change_percent": 20.0,
    "repeat_customer_rate": 65.5,
    "repeat_customer_rate_change_percent": 2.1,
    "customer_satisfaction_score": 4.5,
    "customer_satisfaction_score_change_percent": 0.5
  },
  "revenue_over_time": [
    {
      "date": "2024-01-01",
      "revenue": 5000,
      "work_orders": 3
    }
  ],
  "service_breakdown": [
    {
      "service_type": "Septic Pumping",
      "count": 25,
      "revenue": 75000,
      "percentage": 60.0
    }
  ],
  "date_range": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  }
}
```

### Technician Report
```
GET /api/reports/technician?start_date=2024-01-01&end_date=2024-01-31
```

Response:
```json
{
  "technicians": [
    {
      "technician_id": "tech-123",
      "technician_name": "John Doe",
      "jobs_completed": 30,
      "total_revenue": 90000,
      "average_job_duration_hours": 2.5,
      "customer_satisfaction": 4.8,
      "on_time_completion_rate": 95.0
    }
  ],
  "date_range": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  }
}
```

### Customer Report
```
GET /api/reports/customers?start_date=2024-01-01&end_date=2024-01-31
```

Response:
```json
{
  "metrics": {
    "total_customers": 500,
    "total_customers_change_percent": 10.0,
    "active_customers": 350,
    "active_customers_change_percent": 5.5,
    "new_customers_this_month": 25,
    "churn_rate": 2.5,
    "average_customer_lifetime_value": 5000
  },
  "growth_over_time": [
    {
      "date": "2024-01-01",
      "total_customers": 475,
      "new_customers": 5,
      "active_customers": 330
    }
  ],
  "date_range": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  }
}
```

### Pipeline Metrics
```
GET /api/reports/pipeline
```

Response:
```json
{
  "total_pipeline_value": 500000,
  "total_prospects": 75,
  "prospects_by_stage": [
    {
      "stage": "Lead",
      "count": 30,
      "total_value": 150000
    }
  ],
  "conversion_rate": 15.5,
  "average_deal_size": 6666.67
}
```

### Export Endpoint
```
GET /api/reports/{reportType}/export?format=csv&start_date=2024-01-01&end_date=2024-01-31
```

Returns: Binary file (CSV, Excel, or PDF)

## Styling

All components use Tailwind CSS with the MAC Septic CRM design system:

**Colors:**
- Primary: `#0091ae` (MAC Dark Blue)
- Success: `#22c55e` (Green)
- Warning: `#f59e0b` (Amber)
- Danger: `#ef4444` (Red)

**Component Classes:**
- Cards: `bg-bg-card border border-border rounded-lg`
- Text: `text-text-primary`, `text-text-secondary`, `text-text-muted`
- Buttons: `bg-primary text-white hover:bg-primary-dark`

## Chart Library

This module uses [Recharts](https://recharts.org/) for all data visualizations.

**Chart Types Used:**
- LineChart: Revenue trends, customer growth
- BarChart: Technician performance, comparisons
- PieChart: Service type breakdown
- AreaChart: Work order trends (stacked)

## Usage Example

```tsx
import { useState } from 'react';
import { useRevenueMetrics } from '@/features/reports/api';
import { MetricCard, RevenueChart, DateRangePicker } from '@/features/reports/components';

export function MyReportsPage() {
  const [dateRange, setDateRange] = useState({
    start_date: '2024-01-01',
    end_date: '2024-01-31',
  });

  const { data, isLoading } = useRevenueMetrics(dateRange);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <DateRangePicker dateRange={dateRange} onChange={setDateRange} />

      <div className="grid grid-cols-3 gap-6 mt-6">
        <MetricCard
          title="Total Revenue"
          value={data.metrics.total_revenue}
          changePercent={data.metrics.total_revenue_change_percent}
          format="currency"
        />
      </div>

      <RevenueChart
        data={data.revenue_over_time}
        chartType="line"
        showWorkOrders={true}
      />
    </div>
  );
}
```

## Navigation

The Reports module is accessible from the main navigation sidebar at `/reports`.

**Routes:**
- `/reports` - Main reports dashboard
- `/reports/revenue` - Detailed revenue report
- `/reports/technicians` - Technician performance report

## Testing

To test the reports module:

1. Navigate to `/app/reports` in your browser
2. Select different date ranges using the DateRangePicker
3. Verify metrics update correctly
4. Test chart interactions (hover, toggle chart types)
5. Test export functionality
6. Navigate to detailed report pages

## Future Enhancements

Potential improvements for the reports module:

- [ ] Real-time data updates with WebSockets
- [ ] Custom report builder
- [ ] Scheduled report delivery via email
- [ ] More export formats (JSON, XML)
- [ ] Report templates
- [ ] Comparison mode (compare periods)
- [ ] Drill-down capabilities
- [ ] Dashboard customization
- [ ] Mobile-optimized charts
- [ ] Advanced filtering options
