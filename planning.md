# CSM Task Engine - Implementation Plan

> **Version:** 1.0
> **Date:** January 8, 2026
> **Status:** Planning Complete - Ready for Implementation

---

## Executive Summary

Building an outcome-driven CSM task queue system that transforms how CSMs work - from calendar-based activity checking to prioritized outcome-driven workflows with guided playbooks and quality gates.

---

## Phase 0: Research Findings Summary

### Key Insights from Industry Leaders

1. **Gainsight Pattern**: CTAs (Calls to Action) as atomic work units with attached playbooks
2. **ChurnZero Pattern**: Automated plays triggered by customer signals
3. **Planhat Pattern**: Kanban board views with AI-triggered workflows

### Outcome-Driven vs Activity-Driven

| Activity-Driven (BAD) | Outcome-Driven (GOOD) |
|-----------------------|------------------------|
| "Made 20 calls today" | "Saved 3 at-risk customers" |
| "Sent 50 emails" | "Onboarded 5 customers to value" |
| "Completed tasks" | "Secured $50K in renewals" |
| Calendar-based work | Priority queue-based work |

### Key Success Metrics
- **Time-to-Value (TTV)**: Speed to first success
- **Net Revenue Retention (NRR)**: Revenue retained + expanded
- **Health Score**: Composite risk indicator
- **Outcome Success Rate**: Goals achieved percentage

---

## Phase 1: Data Architecture

### 1.1 Core Entities

```
CSMTask
├── id: number
├── customer_id: number
├── csm_id: number
├── task_type_id: number
├── priority: 'urgent' | 'high' | 'standard' | 'low'
├── priority_score: number (calculated)
├── status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked' | 'snoozed'
├── due_date: datetime
├── snooze_until: datetime | null
├── outcome_type: 'completed' | 'rescheduled' | 'escalated' | 'blocked' | null
├── outcome_notes: string | null
├── sentiment: 'positive' | 'neutral' | 'frustrated' | 'angry' | null
├── next_action: string | null
├── next_action_date: datetime | null
├── quality_gates_completed: object (JSON)
├── playbook_id: number | null
├── created_at: datetime
├── started_at: datetime | null
├── completed_at: datetime | null
└── metadata: object (JSON)
```

```
TaskType
├── id: number
├── name: string
├── slug: string (unique)
├── description: string
├── category: 'onboarding' | 'adoption' | 'retention' | 'expansion' | 'renewal'
├── default_priority: 'urgent' | 'high' | 'standard' | 'low'
├── sla_hours: number
├── playbook_id: number | null
├── required_outcomes: string[] (JSON)
├── quality_gates: QualityGate[] (JSON)
├── auto_trigger_conditions: object (JSON)
├── is_active: boolean
└── created_at: datetime
```

```
QualityGate (embedded in TaskType)
├── id: string
├── question: string
├── gate_type: 'boolean' | 'select' | 'text' | 'rating'
├── required: boolean
├── options: string[] | null
└── order: number
```

```
TaskOutcome
├── id: number
├── task_id: number
├── outcome_type: 'connected' | 'voicemail' | 'no_answer' | 'rescheduled' | 'completed' | 'escalated'
├── objective_achieved: 'yes' | 'no' | 'partial' | null
├── blocker_reason: string | null
├── sentiment: 'positive' | 'neutral' | 'frustrated' | 'angry' | null
├── next_action_required: boolean
├── next_action_date: datetime | null
├── next_action_notes: string | null
├── quality_gate_responses: object (JSON)
├── notes: string
├── csm_id: number
├── created_at: datetime
└── metadata: object (JSON)
```

```
CSMPlaybook (extends existing Playbook)
├── id: number
├── task_type_id: number | null
├── name: string
├── version: string
├── objective: string
├── context_fields: string[] (what data to show CSM)
├── opening_script: string
├── key_questions: string[]
├── objection_handlers: ObjectionHandler[]
├── success_criteria: string
├── estimated_duration_minutes: number
├── is_active: boolean
└── updated_at: datetime
```

```
ObjectionHandler (embedded in CSMPlaybook)
├── id: string
├── trigger: string (what customer might say)
├── response: string (how to respond)
└── order: number
```

### 1.2 Task Types to Seed

| Slug | Name | Category | Default Priority | SLA Hours |
|------|------|----------|------------------|-----------|
| `onboarding_stall` | Onboarding Stall Recovery | onboarding | urgent | 24 |
| `day_30_checkin` | Day 30 Check-in | adoption | high | 48 |
| `day_60_checkin` | Day 60 Check-in | adoption | standard | 72 |
| `day_90_qbr` | Day 90 QBR | retention | high | 48 |
| `at_risk_recovery` | At-Risk Recovery | retention | urgent | 24 |
| `health_score_drop` | Health Score Drop Alert | retention | high | 24 |
| `renewal_prep` | Renewal Preparation | renewal | urgent | 48 |
| `nps_detractor_followup` | NPS Detractor Follow-up | retention | urgent | 24 |
| `expansion_opportunity` | Expansion Opportunity | expansion | standard | 72 |

### 1.3 Priority Algorithm

```typescript
function calculatePriorityScore(task: CSMTask, customer: Customer): number {
  let score = 0;

  // 1. Revenue at risk (ARR * churn_probability)
  const revenueRisk = customer.arr * customer.churn_probability;
  score += revenueRisk / 1000; // Normalize to 0-100

  // 2. Days overdue (exponential increase)
  const daysOverdue = Math.max(0, daysSince(task.due_date));
  score += Math.pow(daysOverdue, 1.5) * 10;

  // 3. Customer tier multiplier
  const tierMultiplier = {
    'vip': 2.0,
    'high_value': 1.5,
    'standard': 1.0,
    'low_value': 0.5
  }[customer.tier] || 1.0;
  score *= tierMultiplier;

  // 4. Task type default priority
  const priorityBase = {
    'urgent': 100,
    'high': 75,
    'standard': 50,
    'low': 25
  }[task.priority];
  score += priorityBase;

  // 5. Time sensitivity (renewal date proximity)
  if (customer.renewal_date) {
    const daysToRenewal = daysUntil(customer.renewal_date);
    if (daysToRenewal <= 30) score += 50;
    else if (daysToRenewal <= 60) score += 25;
    else if (daysToRenewal <= 90) score += 10;
  }

  return Math.round(score);
}
```

---

## Phase 2: API Endpoints

### 2.1 Task Queue Endpoints

```
GET /cs/csm-tasks/queue
  - Returns prioritized tasks for logged-in CSM
  - Params: status, task_type, priority, due_before, due_after, limit
  - Response: { items: CSMTask[], total: number }

GET /cs/csm-tasks/{id}
  - Task detail with playbook and customer context
  - Response: { task: CSMTask, playbook: CSMPlaybook, customer: Customer }

POST /cs/csm-tasks/{id}/start
  - Mark task as in_progress, set started_at

POST /cs/csm-tasks/{id}/complete
  - Validate quality gates
  - Save outcome
  - Remove from queue
  - Body: { outcome_type, objective_achieved, sentiment, quality_gates, notes, next_action }

POST /cs/csm-tasks/{id}/reschedule
  - Set new due_date
  - Add outcome record with reschedule reason
  - Body: { new_due_date, reason }

POST /cs/csm-tasks/{id}/escalate
  - Change status to escalated
  - Create escalation record
  - Body: { reason, escalate_to }

POST /cs/csm-tasks/{id}/snooze
  - Set snooze_until date
  - Body: { snooze_until, reason }

GET /cs/csm-tasks/generate
  - Trigger task generation for all/specific customers
  - Creates tasks based on customer state and triggers
  - Response: { tasks_created: number, tasks_skipped: number }
```

### 2.2 Task Type & Playbook Endpoints

```
GET /cs/task-types
  - List all task types
  - Response: { items: TaskType[] }

GET /cs/task-types/{id}
  - Task type detail with playbook
  - Response: { task_type: TaskType, playbook: CSMPlaybook }

GET /cs/csm-playbooks
  - List playbooks with task type association

GET /cs/csm-playbooks/{id}
  - Playbook detail with objection handlers
```

### 2.3 Outcome Metrics Endpoints

```
GET /cs/csm-tasks/outcomes/weekly
  - CSM's outcome metrics for current week
  - Response: {
      onboarding_completions: { actual: number, goal: number },
      at_risk_saves: { actual: number, goal: number },
      health_improvements: number,
      renewals_secured: { amount: number, count: number },
      expansion_pipeline: { amount: number, count: number },
      activity: { calls: number, emails: number, tasks: number },
      trend_vs_last_week: number
    }

GET /cs/csm-tasks/outcomes/team
  - Manager view: team-level outcome metrics
```

---

## Phase 3: Frontend Components

### 3.1 Component Hierarchy

```
src/features/customer-success/components/
├── csm-queue/
│   ├── CSMQueuePage.tsx          # Main queue container
│   ├── PriorityQueue.tsx         # Task list sorted by priority
│   ├── TaskCard.tsx              # Individual task preview card
│   ├── TaskFilters.tsx           # Filter by type, priority, due date
│   ├── QueueStats.tsx            # Today's queue summary
│   └── index.ts
├── csm-task/
│   ├── TaskDetailView.tsx        # Full task with playbook
│   ├── PlaybookPanel.tsx         # Expanded playbook content
│   ├── ObjectionHandlers.tsx     # Expandable objection responses
│   ├── CustomerContextPanel.tsx  # Customer info sidebar
│   ├── InteractionHistory.tsx    # Past touchpoints
│   └── index.ts
├── csm-outcome/
│   ├── OutcomeForm.tsx           # Outcome capture form
│   ├── QualityGateChecklist.tsx  # Dynamic quality gate questions
│   ├── SentimentSelector.tsx     # Sentiment capture
│   ├── NextActionForm.tsx        # Next action scheduling
│   └── index.ts
├── csm-dashboard/
│   ├── WeeklyOutcomes.tsx        # Weekly outcome dashboard
│   ├── OutcomeMetricCard.tsx     # Individual metric display
│   ├── ActivitySummary.tsx       # Activity context (secondary)
│   ├── TeamComparison.tsx        # Comparison to team avg
│   └── index.ts
└── index.ts
```

### 3.2 Tab Integration

Add "CSM Queue" tab to CustomerSuccessPage.tsx:

```typescript
// Tab order (add after "Find Customers"):
const TABS = [
  'executive',
  'overview',
  'find',
  'csm-queue',  // NEW
  'surveys',
  // ... rest
];
```

### 3.3 Route Structure

```
/customer-success              # Existing CS page
  ?tab=csm-queue              # Queue tab
  ?tab=csm-queue&task={id}    # Queue with task detail open
  ?tab=csm-outcomes           # Weekly outcomes dashboard
```

### 3.4 Key UI Patterns

**Priority Indicators:**
```typescript
const PriorityBadge = ({ priority, score }) => {
  const config = {
    urgent: { icon: 'fire', color: 'red', label: 'URGENT' },
    high: { icon: 'zap', color: 'orange', label: 'HIGH' },
    standard: { icon: 'clipboard', color: 'blue', label: 'STANDARD' },
    low: { icon: 'clock', color: 'gray', label: 'LOW' }
  }[priority];

  return (
    <Badge color={config.color}>
      {config.icon} {config.label} ({score})
    </Badge>
  );
};
```

**Quality Gate Form:**
```typescript
// Dynamic form based on task type's quality gates
const QualityGateChecklist = ({ gates, responses, onChange }) => {
  return gates.map(gate => (
    <FormField key={gate.id} required={gate.required}>
      <Label>{gate.question}</Label>
      {gate.gate_type === 'boolean' && <YesNoToggle />}
      {gate.gate_type === 'select' && <Select options={gate.options} />}
      {gate.gate_type === 'text' && <Textarea />}
      {gate.gate_type === 'rating' && <RatingScale max={5} />}
    </FormField>
  ));
};
```

---

## Phase 4: Playbook Content

### 4.1 Onboarding Stall Recovery

```json
{
  "name": "Onboarding Stall Recovery",
  "objective": "Get customer to complete [missing_step] today",
  "context_fields": ["signup_date", "completed_steps", "missing_steps", "last_contact", "customer_notes"],
  "opening_script": "Hi [name], this is [csm] from [company]. I noticed you started setup but haven't gotten to [missing_step] yet. That's actually the part that [value_prop]. Do you have 10 minutes? I can walk you through it now.",
  "key_questions": [
    "What's been keeping you from completing setup?",
    "Is there anything confusing about the process?",
    "What are you hoping to achieve with our product?"
  ],
  "objection_handlers": [
    {
      "trigger": "Been busy/traveling",
      "response": "Totally understand. The [step] takes just [X] minutes—can we knock it out right now while we're talking?"
    },
    {
      "trigger": "I'll do it later",
      "response": "I hear you. The risk is [consequence of delay]. Let's at least [small commitment]."
    },
    {
      "trigger": "Having technical issues",
      "response": "Let me help with that right now. Can you [troubleshooting step]?"
    },
    {
      "trigger": "Not sure I need this",
      "response": "That's fair to question. The reason [step] matters is [specific value]. Can I show you?"
    }
  ],
  "success_criteria": "Customer completes missing step OR concrete follow-up scheduled within 48 hours",
  "quality_gates": [
    { "question": "Did customer complete the missing step?", "type": "boolean", "required": true },
    { "question": "If not completed, what is the specific blocker?", "type": "text", "required": false },
    { "question": "Is follow-up scheduled?", "type": "boolean", "required": true }
  ]
}
```

### 4.2 Day 30 Check-in

```json
{
  "name": "Day 30 Check-in",
  "objective": "Confirm customer is realizing value, identify any friction",
  "context_fields": ["signup_date", "adoption_metrics", "feature_usage", "health_score", "recent_interactions"],
  "opening_script": "Hi [name], it's been about a month since you started with us. I wanted to check in and see how things are going. What's been most useful so far?",
  "key_questions": [
    "What's been most valuable?",
    "Anything confusing or frustrating?",
    "Anyone else who should have access?",
    "Any upcoming needs we should know about?"
  ],
  "objection_handlers": [],
  "success_criteria": "Customer confirms value OR friction identified and logged for follow-up",
  "quality_gates": [
    { "question": "Did customer confirm value received?", "type": "boolean", "required": true },
    { "question": "Is customer on track for renewal?", "type": "select", "options": ["Yes", "No", "Unsure"], "required": true },
    { "question": "Any expansion opportunities identified?", "type": "boolean", "required": true },
    { "question": "Expansion notes", "type": "text", "required": false }
  ]
}
```

### 4.3 At-Risk Recovery

```json
{
  "name": "At-Risk Recovery",
  "objective": "Understand root cause, create recovery plan, prevent churn",
  "context_fields": ["health_score_history", "risk_factors", "recent_tickets", "usage_decline", "payment_issues"],
  "opening_script": "Hi [name], I wanted to reach out personally. I noticed [specific signal—usage drop/missed payment/low score]. I want to make sure we're delivering what you need. Can we talk about what's going on?",
  "key_questions": [
    "What's changed since you started using us?",
    "What would need to happen for this to be successful for you?",
    "Is there anything we could do differently?"
  ],
  "objection_handlers": [
    {
      "trigger": "Thinking of canceling",
      "response": "I appreciate you being direct. Before you decide, can you help me understand what's not working? I may be able to fix it."
    },
    {
      "trigger": "Not getting value",
      "response": "That's on us. What did you expect that you're not seeing? Let's figure out how to get you there."
    },
    {
      "trigger": "Too expensive",
      "response": "I understand budget matters. Let's look at what you're actually using and see if there's a better fit."
    }
  ],
  "success_criteria": "Root cause identified, recovery action taken, follow-up scheduled",
  "quality_gates": [
    { "question": "Root cause identified?", "type": "boolean", "required": true },
    { "question": "What is the primary risk factor?", "type": "select", "options": ["Low usage", "Support issues", "Budget", "Champion left", "Competition", "Other"], "required": true },
    { "question": "Recovery action taken?", "type": "boolean", "required": true },
    { "question": "Customer retained?", "type": "select", "options": ["Yes - saved", "Yes - at risk", "No - churned", "Pending"], "required": true }
  ]
}
```

---

## Phase 5: Test Data Generator

### 5.1 Customer Scenarios

Generate 50+ customers across states:
- 10 mid-onboarding (some stalled)
- 15 healthy/active
- 10 at-risk (various signals)
- 5 recently churned (for history)
- 10 approaching renewal (30/60/90 days)

### 5.2 Task Distribution

Generate 200+ historical tasks:
- 60% completed with outcomes
- 20% in progress
- 15% pending
- 5% escalated/blocked

### 5.3 Outcome Variety

- Mix of positive/negative outcomes
- Various sentiment levels
- Different blocker types
- Quality gate completion patterns

---

## Phase 6: Playwright Test Scenarios

### Test 1: CSM Login → Queue View
```typescript
test('CSM sees prioritized task queue', async ({ page }) => {
  // Login as CSM user
  // Navigate to Customer Success
  // Click CSM Queue tab
  // Verify tasks load sorted by priority_score DESC
  // Verify URGENT tasks appear at top (red badges)
  // Screenshot queue
});
```

### Test 2: Task → Playbook → Complete
```typescript
test('CSM completes task with playbook and outcome', async ({ page }) => {
  // Click on task from queue
  // Verify playbook loads with correct content
  // Verify customer context panel shows customer data
  // Fill outcome form:
  //   - Select outcome type
  //   - Complete quality gates
  //   - Add notes
  // Submit
  // Verify task removed from queue
  // Verify success toast
});
```

### Test 3: Quality Gate Enforcement
```typescript
test('Cannot submit without required quality gates', async ({ page }) => {
  // Open task with quality gates
  // Try to submit without completing required gates
  // Verify error message shows
  // Complete required gates
  // Verify submission succeeds
});
```

### Test 4: Weekly Outcomes Dashboard
```typescript
test('Weekly outcomes show correct metrics', async ({ page }) => {
  // Complete 3 tasks with positive outcomes
  // Navigate to Weekly Outcomes
  // Verify metrics updated:
  //   - Onboarding completions
  //   - At-risk saves
  //   - Renewals secured
  // Screenshot dashboard
});
```

---

## Phase 7: Implementation Order

1. **Types** (30 min)
   - Add types to `src/api/types/customerSuccess.ts`
   - CSMTaskQueue types
   - TaskType, QualityGate, CSMPlaybook types
   - Outcome types

2. **API Hooks** (45 min)
   - Add to `src/api/hooks/useCustomerSuccess.ts`
   - useCSMTaskQueue
   - useCSMTask
   - useCompleteCSMTask
   - useRescheduleCSMTask
   - useEscalateCSMTask
   - useWeeklyOutcomes

3. **Demo Data** (30 min)
   - Create demo data arrays for:
     - Task types with playbooks
     - Sample tasks with priorities
     - Weekly outcome metrics

4. **Queue Components** (2 hr)
   - CSMQueueTab.tsx (main container)
   - PriorityQueue.tsx (task list)
   - TaskCard.tsx (preview cards)
   - QueueFilters.tsx

5. **Task Detail Components** (2 hr)
   - TaskDetailView.tsx
   - PlaybookPanel.tsx
   - CustomerContextPanel.tsx

6. **Outcome Components** (1.5 hr)
   - OutcomeForm.tsx
   - QualityGateChecklist.tsx
   - SentimentSelector.tsx

7. **Weekly Dashboard** (1 hr)
   - WeeklyOutcomes.tsx
   - OutcomeMetricCard.tsx

8. **Tab Integration** (30 min)
   - Add tab to CustomerSuccessPage.tsx
   - Update routing

9. **Playwright Tests** (1 hr)
   - Write tests
   - Run and fix issues
   - Screenshot evidence

10. **Deploy & Verify** (30 min)
    - Build
    - Push to GitHub
    - Verify Railway deployment
    - Run Playwright against production

---

## Success Criteria

- [ ] CSM Queue tab visible and loads
- [ ] Tasks sorted by priority score (highest first)
- [ ] Priority badges show correctly (URGENT/HIGH/STANDARD/LOW)
- [ ] Task click opens detail with playbook
- [ ] Customer context panel shows relevant data
- [ ] Outcome form validates quality gates
- [ ] Completed tasks removed from queue
- [ ] Weekly outcomes dashboard shows metrics
- [ ] All Playwright tests pass
- [ ] Production deployment successful

---

## Evidence to Capture

- `/evidence/screenshots/queue_view.png`
- `/evidence/screenshots/task_detail_playbook.png`
- `/evidence/screenshots/outcome_form.png`
- `/evidence/screenshots/weekly_dashboard.png`
- `/evidence/test_results.txt`

---

**Plan Status:** COMPLETE - Ready for Implementation
