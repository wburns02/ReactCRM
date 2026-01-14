# Call Intelligence Dashboard - Visualization Specification

## Color Palette

### Sentiment Colors
```javascript
SENTIMENT_COLORS = {
  positive: '#22c55e',   // Green-500
  neutral: '#6b7280',    // Gray-500
  negative: '#ef4444',   // Red-500
  mixed: '#f59e0b'       // Amber-500
}
```

### Quality Score Colors
```javascript
QUALITY_COLORS = {
  excellent: '#10b981',  // Emerald-500 (85-100)
  good: '#22c55e',       // Green-500 (70-84)
  average: '#f59e0b',    // Amber-500 (55-69)
  poor: '#f97316',       // Orange-500 (40-54)
  critical: '#ef4444'    // Red-500 (0-39)
}
```

### Escalation Risk Colors
```javascript
RISK_COLORS = {
  low: '#22c55e',        // Green
  medium: '#f59e0b',     // Amber
  high: '#f97316',       // Orange
  critical: '#ef4444'    // Red
}
```

### Disposition Colors
```javascript
DISPOSITION_COLORS = {
  resolved: '#10b981',   // Emerald
  followUp: '#f59e0b',   // Amber
  escalated: '#ef4444',  // Red
  sale: '#059669',       // Green-600
  noAnswer: '#9ca3af',   // Gray-400
  complaint: '#dc2626',  // Red-600
  info: '#6b7280'        // Gray-500
}
```

## Chart Specifications

### 1. Sentiment Trend (AreaChart)
```typescript
{
  type: 'AreaChart',
  library: 'Recharts',
  config: {
    height: 300,
    margin: { top: 10, right: 30, left: 0, bottom: 0 },
    xAxis: { dataKey: 'date', tickFormatter: formatChartDate },
    yAxis: { domain: [-100, 100] },
    tooltip: { custom: SentimentTooltip },
    areas: [
      { dataKey: 'positive', fill: '#22c55e', fillOpacity: 0.6 },
      { dataKey: 'neutral', fill: '#6b7280', fillOpacity: 0.4 },
      { dataKey: 'negative', fill: '#ef4444', fillOpacity: 0.6 }
    ],
    animation: { duration: 500 }
  }
}
```

### 2. Quality Heatmap (Custom Grid)
```typescript
{
  type: 'HeatmapGrid',
  library: 'Custom (React + Tailwind)',
  config: {
    rows: agents,
    columns: days,
    cellSize: { width: 40, height: 40 },
    colorScale: {
      min: 0,
      max: 100,
      colors: ['#ef4444', '#f59e0b', '#22c55e']
    },
    tooltip: {
      show: true,
      content: '{agent} on {date}: {score}/100'
    },
    onClick: (agent, date) => openAgentDetail(agent, date)
  }
}
```

### 3. Disposition Donut (PieChart)
```typescript
{
  type: 'PieChart',
  library: 'Recharts',
  config: {
    height: 300,
    innerRadius: 60,
    outerRadius: 100,
    paddingAngle: 2,
    dataKey: 'count',
    nameKey: 'disposition',
    label: {
      position: 'outside',
      formatter: '{name}: {percent}%'
    },
    centerLabel: {
      show: true,
      content: 'Total: {sum}'
    },
    legend: { position: 'bottom' },
    onClick: (slice) => filterByDisposition(slice.disposition)
  }
}
```

### 4. Escalation Risk Gauge (Custom)
```typescript
{
  type: 'GaugeChart',
  library: 'Custom (SVG + React)',
  config: {
    width: 200,
    height: 150,
    startAngle: -120,
    endAngle: 120,
    min: 0,
    max: 100,
    zones: [
      { from: 0, to: 25, color: '#22c55e', label: 'Low' },
      { from: 25, to: 50, color: '#f59e0b', label: 'Medium' },
      { from: 50, to: 75, color: '#f97316', label: 'High' },
      { from: 75, to: 100, color: '#ef4444', label: 'Critical' }
    ],
    needle: {
      value: currentRiskScore,
      color: '#1f2937'
    },
    centerText: {
      value: '{value}%',
      fontSize: 24
    }
  }
}
```

### 5. Agent Leaderboard (Table)
```typescript
{
  type: 'DataTable',
  library: 'Custom (React + Tailwind)',
  config: {
    columns: [
      { key: 'rank', header: '#', width: 40 },
      { key: 'agent', header: 'Agent', render: AgentCell },
      { key: 'qualityScore', header: 'Quality', render: ScoreBar },
      { key: 'sentiment', header: 'Sentiment', render: SentimentBadge },
      { key: 'calls', header: 'Calls', align: 'right' },
      { key: 'trend', header: 'Trend', render: TrendArrow }
    ],
    sortable: true,
    defaultSort: { key: 'qualityScore', direction: 'desc' },
    rowHover: true,
    onRowClick: (agent) => openAgentDetail(agent)
  }
}
```

### 6. Word Cloud (Custom)
```typescript
{
  type: 'WordCloud',
  library: 'react-wordcloud or Custom',
  config: {
    words: coachingKeywords,
    fontSizes: [14, 48],
    colors: ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'],
    rotations: 2,
    rotationAngles: [0, 90],
    padding: 2,
    spiral: 'archimedean',
    onClick: (word) => filterByTopic(word.text)
  }
}
```

## Animation Specifications

### Chart Animations
```javascript
ANIMATION_CONFIG = {
  charts: {
    duration: 500,
    easing: 'ease-out'
  },
  cards: {
    countUp: {
      duration: 1000,
      useEasing: true
    }
  },
  transitions: {
    filter: 300,
    modal: 200
  }
}
```

### Loading States
- Skeleton components matching chart shapes
- Pulse animation during loading
- Staggered fade-in on data load

## Interaction Specifications

### Tooltips
- Appear on hover after 200ms delay
- Show detailed breakdown
- Include mini-chart when relevant
- Position: prefer top, fallback to sides

### Click Actions
- Chart elements → filter/drill-down
- Table rows → detail modal
- Cards → expanded view
- Badges → filter by that value

### Keyboard Navigation
- Tab through interactive elements
- Enter to activate
- Escape to close modals
- Arrow keys for chart navigation

## Responsive Breakpoints

```javascript
BREAKPOINTS = {
  sm: 640,   // Single column, stacked charts
  md: 768,   // 2 columns, side-by-side charts
  lg: 1024,  // 3+ columns, full layout
  xl: 1280   // Expanded views, larger charts
}
```

### Mobile Adaptations
- Charts reduce height by 30%
- Heatmap becomes scrollable
- Table converts to card stack
- Filter panel becomes slide-out drawer
