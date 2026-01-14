# Call Intelligence Dashboard - Design Specification

## Page Route
`/call-intelligence` or `/dashboard/call-analytics`

## Layout Structure

```
+------------------------------------------------------------------+
|  HEADER: Call Intelligence Dashboard    [Filters] [Export] [Refresh]
+------------------------------------------------------------------+
|                                                                    |
|  +----------------+  +----------------+  +----------------+  +----+|
|  | Total Calls    |  | Avg Sentiment  |  | Quality Score  |  |CSAT||
|  | 1,234          |  | +42 (Positive) |  | 87/100         |  |4.2 ||
|  | +12% vs last   |  | [sparkline]    |  | [sparkline]    |  |    ||
|  +----------------+  +----------------+  +----------------+  +----+|
|                                                                    |
+------------------------------------------------------------------+
|  +---------------------------+  +-------------------------------+  |
|  | SENTIMENT TRENDS          |  | QUALITY HEATMAP               |  |
|  | [Area Chart]              |  | [Matrix by Agent/Day]         |  |
|  | - Positive (green)        |  |                               |  |
|  | - Neutral (gray)          |  | Agent1 [##][##][##][##][##]   |  |
|  | - Negative (red)          |  | Agent2 [##][##][##][##][##]   |  |
|  | X-axis: Time              |  | Agent3 [##][##][##][##][##]   |  |
|  +---------------------------+  +-------------------------------+  |
|                                                                    |
+------------------------------------------------------------------+
|  +---------------------------+  +-------------------------------+  |
|  | DISPOSITION BREAKDOWN     |  | ESCALATION RISK              |  |
|  | [Donut Chart]             |  | [Gauge + List]               |  |
|  |                           |  |                               |  |
|  | - Resolved (45%)          |  |    HIGH: 12 calls            |  |
|  | - Follow-up (25%)         |  |    MEDIUM: 34 calls          |  |
|  | - Escalated (15%)         |  |    LOW: 188 calls            |  |
|  | - Other (15%)             |  |                               |  |
|  +---------------------------+  +-------------------------------+  |
|                                                                    |
+------------------------------------------------------------------+
|  +---------------------------+  +-------------------------------+  |
|  | AGENT LEADERBOARD         |  | COACHING INSIGHTS            |  |
|  | [Table with Rankings]     |  | [Word Cloud + Cards]         |  |
|  |                           |  |                               |  |
|  | 1. John (94/100)          |  | Top Strengths:               |  |
|  | 2. Sarah (91/100)         |  |   - Empathy, Clarity         |  |
|  | 3. Mike (88/100)          |  | Improvement Areas:           |  |
|  |                           |  |   - Resolution Speed         |  |
|  +---------------------------+  +-------------------------------+  |
|                                                                    |
+------------------------------------------------------------------+
|  RECENT CALLS TABLE                                               |
|  [Sortable, Filterable, Clickable for Detail View]                |
|  +----------------------------------------------------------------+
|  | Time | From | To | Duration | Sentiment | Quality | Disposition |
|  |------|------|-----|---------|-----------|---------|-------------|
|  | 2:30 | +1.. | Ext | 4:32    | [+42]     | 89      | Resolved    |
|  | 2:15 | +1.. | Ext | 8:12    | [-15]     | 72      | Escalated   |
|  +----------------------------------------------------------------+
+------------------------------------------------------------------+
```

## Component Hierarchy

```
CallIntelligenceDashboard/
├── DashboardHeader
│   ├── Title
│   ├── FilterBar (DateRange, Agent, Team, Disposition)
│   ├── ExportButton
│   └── RefreshButton
├── KPICards (grid of 4-6)
│   ├── TotalCallsCard
│   ├── AvgSentimentCard
│   ├── QualityScoreCard
│   ├── CSATCard
│   ├── EscalationRateCard
│   └── AutoDispositionCard
├── ChartsRow1
│   ├── SentimentTrendChart (AreaChart)
│   └── QualityHeatmap (Matrix)
├── ChartsRow2
│   ├── DispositionBreakdown (DonutChart)
│   └── EscalationRiskGauge (Gauge + List)
├── ChartsRow3
│   ├── AgentLeaderboard (Table)
│   └── CoachingInsightsPanel (WordCloud + Cards)
└── RecentCallsTable
    ├── TableHeader (sortable columns)
    ├── TableBody (call rows)
    └── Pagination
```

## Component Specifications

### 1. KPI Cards
- Large number with trend indicator
- Sparkline showing 7-day trend
- Click to drill down
- Color-coded based on threshold

### 2. Sentiment Trend Chart
- Recharts AreaChart with 3 series
- Stacked or layered view toggle
- Hover tooltip with exact values
- Click point to see calls

### 3. Quality Heatmap
- Custom grid component
- Color scale: red (0-50) -> yellow (50-75) -> green (75-100)
- Cell click opens agent detail
- Row/column averages shown

### 4. Disposition Donut
- Recharts PieChart with inner label
- Custom colors per disposition
- Click slice to filter table
- Legend with counts

### 5. Escalation Risk Gauge
- Semi-circular gauge (0-100)
- Color zones: green/yellow/orange/red
- Count cards below for each level
- Click to see at-risk calls

### 6. Agent Leaderboard
- Sortable table
- Avatar + name
- Quality score with progress bar
- Trend arrow (up/down/neutral)
- Click for agent detail

### 7. Coaching Insights
- Word cloud of improvement areas
- Top 3 strengths (green badges)
- Top 3 improvements (amber badges)
- Recommended training links

### 8. Recent Calls Table
- Virtual scrolling for performance
- Inline sentiment badge
- Inline quality score
- Click row for call detail modal

## Filters

- **Date Range**: Today, 7d, 30d, Custom
- **Agent**: Multi-select dropdown
- **Team**: Multi-select dropdown
- **Disposition**: Multi-select dropdown
- **Sentiment**: Positive/Neutral/Negative
- **Quality Score**: Range slider
- **Escalation Risk**: Low/Medium/High/Critical

## Mobile Responsive

- Stack cards 2x2 then 1x1
- Charts stack vertically
- Table becomes card list
- Filter panel collapses to drawer
