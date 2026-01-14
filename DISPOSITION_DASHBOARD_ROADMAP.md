# Call Intelligence Dashboard - Build Roadmap

## Phase 1: Foundation (Steps 1-3)

### Step 1: API Hooks & Types
**Files to create:**
- `src/features/call-intelligence/api.ts` - React Query hooks
- `src/features/call-intelligence/types.ts` - TypeScript interfaces

**Endpoints to consume:**
- GET `/ringcentral/calls` - Call list with analysis data
- GET `/ringcentral/dispositions` - Disposition list
- GET `/call-dispositions/analytics` - Disposition analytics
- GET `/local-ai/health` - AI service status

### Step 2: Page Shell & Routing
**Files to create:**
- `src/features/call-intelligence/CallIntelligenceDashboard.tsx`
- Add route in `src/App.tsx`

**Components:**
- Page layout with header
- Filter bar placeholder
- Grid layout for cards/charts

### Step 3: KPI Cards
**Components to build:**
- `TotalCallsCard`
- `AvgSentimentCard`
- `QualityScoreCard`
- `CSATCard`

**Features:**
- Large number display
- Trend indicator
- Sparkline chart
- Click for drill-down

---

## Phase 2: Core Charts (Steps 4-6)

### Step 4: Sentiment Trend Chart
**Component:** `SentimentTrendChart.tsx`

**Implementation:**
- Recharts AreaChart
- 3 stacked series (positive/neutral/negative)
- Date range on X-axis
- Hover tooltip with details
- Click point to filter calls

### Step 5: Quality Heatmap
**Component:** `QualityHeatmap.tsx`

**Implementation:**
- Custom grid with color-coded cells
- Agents as rows, days as columns
- Color scale: red → yellow → green
- Click cell for agent/day detail

### Step 6: Disposition Donut
**Component:** `DispositionBreakdown.tsx`

**Implementation:**
- Recharts PieChart with inner radius
- Custom colors per disposition
- Center label with total
- Click slice to filter

---

## Phase 3: Advanced Widgets (Steps 7-9)

### Step 7: Escalation Risk Gauge
**Component:** `EscalationRiskGauge.tsx`

**Implementation:**
- Custom SVG gauge component
- Color zones (green/yellow/orange/red)
- Risk count cards below
- Click to see at-risk calls

### Step 8: Agent Leaderboard
**Component:** `AgentLeaderboard.tsx`

**Implementation:**
- Sortable table
- Quality score progress bars
- Sentiment badges
- Trend arrows
- Click row for agent detail

### Step 9: Coaching Insights Panel
**Components:**
- `CoachingInsightsPanel.tsx`
- `WordCloud.tsx` (optional)

**Implementation:**
- Word cloud of improvement areas
- Top strengths (green badges)
- Top improvements (amber badges)
- Training recommendations

---

## Phase 4: Data Table & Interactions (Steps 10-12)

### Step 10: Recent Calls Table
**Component:** `RecentCallsTable.tsx`

**Implementation:**
- Sortable columns
- Inline sentiment/quality badges
- Virtual scrolling for performance
- Click row for detail modal

### Step 11: Call Detail Modal
**Component:** `CallDetailModal.tsx`

**Implementation:**
- Full call information
- Transcript display
- AI analysis breakdown
- Disposition history
- Audio player (if recording)

### Step 12: Filter System
**Component:** `DashboardFilters.tsx`

**Implementation:**
- Date range picker
- Agent multi-select
- Disposition multi-select
- Sentiment filter
- Quality range slider
- URL sync for shareable links

---

## Phase 5: Polish & Testing (Steps 13-15)

### Step 13: Loading & Error States
**Implementation:**
- Skeleton components for each chart
- Error boundaries
- Empty state displays
- Retry mechanisms

### Step 14: Responsive Design
**Implementation:**
- Mobile-first grid adjustments
- Collapsible filter drawer
- Touch-friendly interactions
- Chart size adaptations

### Step 15: Playwright E2E Tests
**Test file:** `e2e/call-intelligence-dashboard.spec.ts`

**Test cases:**
1. Page loads with all components
2. KPI cards show correct data
3. Charts render correctly
4. Filters update data
5. Table sorting works
6. Modal opens/closes
7. Export functionality
8. Mobile responsiveness

---

## Dependencies

### Required Packages (already installed)
- recharts (v3.6.0)
- @tanstack/react-query
- date-fns

### Optional Additions
- react-wordcloud (for word cloud)
- react-countup (for number animations)
- react-window (for virtual scrolling)

---

## Git Commit Strategy

```bash
# Phase 1
git add . && git commit -m "feat(call-intelligence): add API hooks and types"
git add . && git commit -m "feat(call-intelligence): add page shell and routing"
git add . && git commit -m "feat(call-intelligence): add KPI cards"

# Phase 2
git add . && git commit -m "feat(call-intelligence): add sentiment trend chart"
git add . && git commit -m "feat(call-intelligence): add quality heatmap"
git add . && git commit -m "feat(call-intelligence): add disposition donut"

# Phase 3
git add . && git commit -m "feat(call-intelligence): add escalation risk gauge"
git add . && git commit -m "feat(call-intelligence): add agent leaderboard"
git add . && git commit -m "feat(call-intelligence): add coaching insights panel"

# Phase 4
git add . && git commit -m "feat(call-intelligence): add recent calls table"
git add . && git commit -m "feat(call-intelligence): add call detail modal"
git add . && git commit -m "feat(call-intelligence): add filter system"

# Phase 5
git add . && git commit -m "feat(call-intelligence): add loading and error states"
git add . && git commit -m "feat(call-intelligence): add responsive design"
git add . && git commit -m "test(call-intelligence): add Playwright E2E tests"

# Final
git push origin master
```

---

## Success Criteria

1. Dashboard loads in < 2 seconds
2. All charts render with real data
3. Filters update all components
4. Mobile responsive at all breakpoints
5. Playwright tests pass 100%
6. No console errors
7. Accessibility: keyboard navigable
8. Performance: 60fps animations
