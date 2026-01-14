# Enterprise Customer Success Platform - Architecture Plan

> **Version:** 1.0
> **Date:** January 6, 2026
> **Status:** Planning

---

## Executive Summary

Building a world-class Enterprise Customer Success Platform inspired by Gainsight, Totango, and ChurnZero, but custom-built and innovative. The platform will enable scaling personalized nurture programs for enterprise/VIP clients while maintaining concierge-level service quality.

---

## 1. Core Architecture

### 1.1 Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React 19 + TypeScript | Already in use, excellent DX |
| State | TanStack Query + Zustand | Server state + local state |
| Backend | FastAPI (Python) | Already in use, async support |
| Database | PostgreSQL | Already in use, excellent for relational data |
| AI/ML | OpenAI API + Local embeddings | Predictive churn, smart segmentation |
| Real-time | WebSocket | Already implemented |
| Cache | Redis (optional) | Session data, health score caching |

### 1.2 Module Structure

```
Frontend (ReactCRM):
src/features/customer-success/
├── components/
│   ├── CustomerHealth/
│   ├── JourneyBuilder/
│   ├── PlaybookEditor/
│   ├── SegmentManager/
│   ├── SuccessDashboard/
│   ├── RiskAlerts/
│   └── QBRManager/
├── hooks/
│   ├── useHealthScore.ts
│   ├── usePlaybooks.ts
│   ├── useJourneys.ts
│   └── useSegments.ts
├── api/
│   └── customerSuccess.ts
└── types/
    └── customerSuccess.ts

Backend (react-crm-api):
app/api/v2/customer_success/
├── health_scores.py
├── playbooks.py
├── journeys.py
├── segments.py
├── tasks.py
├── touchpoints.py
└── analytics.py

app/models/customer_success/
├── health_score.py
├── playbook.py
├── journey.py
├── segment.py
├── cs_task.py
└── touchpoint.py

app/services/customer_success/
├── health_calculator.py
├── churn_predictor.py
├── journey_orchestrator.py
└── automation_engine.py
```

---

## 2. Data Models

### 2.1 Entity Relationship Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    Customer     │────▶│   HealthScore    │────▶│   HealthEvent   │
│  (existing)     │     │                  │     │                 │
└────────┬────────┘     └──────────────────┘     └─────────────────┘
         │
         │     ┌──────────────────┐     ┌─────────────────┐
         ├────▶│ CustomerSegment  │────▶│     Segment     │
         │     │   (junction)     │     │                 │
         │     └──────────────────┘     └─────────────────┘
         │
         │     ┌──────────────────┐     ┌─────────────────┐
         ├────▶│ JourneyEnrollment│────▶│     Journey     │
         │     │                  │     │                 │
         │     └────────┬─────────┘     └────────┬────────┘
         │              │                        │
         │              │                        ▼
         │              │               ┌─────────────────┐
         │              └──────────────▶│  JourneyStep    │
         │                              │                 │
         │                              └─────────────────┘
         │
         │     ┌──────────────────┐     ┌─────────────────┐
         ├────▶│    CSTask        │────▶│    Playbook     │
         │     │                  │     │                 │
         │     └──────────────────┘     └────────┬────────┘
         │                                       │
         │                                       ▼
         │                              ┌─────────────────┐
         │                              │  PlaybookStep   │
         │                              │                 │
         │                              └─────────────────┘
         │
         │     ┌──────────────────┐
         └────▶│   Touchpoint     │
               │ (interactions)   │
               └──────────────────┘
```

### 2.2 Core Models

#### HealthScore
```python
class HealthScore(Base):
    __tablename__ = "cs_health_scores"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)

    # Overall score (0-100)
    overall_score = Column(Integer, nullable=False)
    health_status = Column(Enum('healthy', 'at_risk', 'critical', 'churned'))

    # Component scores (0-100 each)
    product_adoption_score = Column(Integer)
    engagement_score = Column(Integer)
    relationship_score = Column(Integer)
    financial_score = Column(Integer)
    support_score = Column(Integer)

    # Predictive metrics
    churn_probability = Column(Float)  # 0.0-1.0
    expansion_probability = Column(Float)
    nps_predicted = Column(Integer)

    # Time-based
    days_since_last_login = Column(Integer)
    days_to_renewal = Column(Integer)

    # Trend
    score_trend = Column(Enum('improving', 'stable', 'declining'))
    score_change_30d = Column(Integer)

    calculated_at = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
```

#### Segment
```python
class Segment(Base):
    __tablename__ = "cs_segments"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)

    # Segment type
    segment_type = Column(Enum('static', 'dynamic', 'ai_generated'))

    # For dynamic segments - JSON rules
    rules = Column(JSON)  # e.g., {"health_score": {"lt": 50}, "arr": {"gte": 100000}}

    # AI-generated segment metadata
    ai_confidence = Column(Float)
    ai_reasoning = Column(Text)

    # Segment metrics
    customer_count = Column(Integer, default=0)
    total_arr = Column(Numeric)
    avg_health_score = Column(Float)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
```

#### Journey
```python
class Journey(Base):
    __tablename__ = "cs_journeys"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)

    # Journey type
    journey_type = Column(Enum(
        'onboarding', 'adoption', 'renewal',
        'expansion', 'risk_mitigation', 'advocacy',
        'win_back', 'custom'
    ))

    # Trigger conditions
    trigger_type = Column(Enum('manual', 'segment_entry', 'event', 'scheduled'))
    trigger_config = Column(JSON)

    # Journey settings
    is_active = Column(Boolean, default=True)
    allow_re_enrollment = Column(Boolean, default=False)
    max_concurrent_enrollments = Column(Integer)

    # Metrics
    total_enrolled = Column(Integer, default=0)
    total_completed = Column(Integer, default=0)
    avg_completion_days = Column(Float)
    success_rate = Column(Float)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
```

#### JourneyStep
```python
class JourneyStep(Base):
    __tablename__ = "cs_journey_steps"

    id = Column(Integer, primary_key=True)
    journey_id = Column(Integer, ForeignKey("cs_journeys.id"), nullable=False)

    step_order = Column(Integer, nullable=False)
    name = Column(String(100), nullable=False)

    # Step type
    step_type = Column(Enum(
        'email', 'in_app_message', 'task', 'wait',
        'condition', 'webhook', 'segment_update',
        'health_check', 'human_touchpoint'
    ))

    # Configuration based on step_type
    config = Column(JSON)

    # Wait configuration (for 'wait' type)
    wait_days = Column(Integer)
    wait_until_event = Column(String(100))

    # Condition configuration (for 'condition' type)
    condition_rules = Column(JSON)
    true_next_step_id = Column(Integer, ForeignKey("cs_journey_steps.id"))
    false_next_step_id = Column(Integer, ForeignKey("cs_journey_steps.id"))

    # Metrics
    times_executed = Column(Integer, default=0)
    success_count = Column(Integer, default=0)

    created_at = Column(DateTime, default=func.now())
```

#### Playbook
```python
class Playbook(Base):
    __tablename__ = "cs_playbooks"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)

    # Playbook category
    category = Column(Enum(
        'onboarding', 'adoption', 'renewal',
        'churn_risk', 'expansion', 'escalation',
        'qbr', 'executive_sponsor', 'custom'
    ))

    # Trigger conditions
    trigger_health_threshold = Column(Integer)  # Trigger when health drops below
    trigger_days_to_renewal = Column(Integer)
    trigger_event = Column(String(100))
    trigger_segment_id = Column(Integer, ForeignKey("cs_segments.id"))

    # Playbook settings
    priority = Column(Enum('low', 'medium', 'high', 'critical'), default='medium')
    is_active = Column(Boolean, default=True)
    auto_assign = Column(Boolean, default=True)

    # Estimated effort
    estimated_hours = Column(Float)

    # Success criteria
    success_criteria = Column(JSON)  # e.g., {"health_score_increase": 10}

    # Metrics
    times_triggered = Column(Integer, default=0)
    times_completed = Column(Integer, default=0)
    avg_completion_days = Column(Float)
    success_rate = Column(Float)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
```

#### PlaybookStep
```python
class PlaybookStep(Base):
    __tablename__ = "cs_playbook_steps"

    id = Column(Integer, primary_key=True)
    playbook_id = Column(Integer, ForeignKey("cs_playbooks.id"), nullable=False)

    step_order = Column(Integer, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)

    # Step type
    step_type = Column(Enum(
        'call', 'email', 'meeting', 'internal_task',
        'product_demo', 'training', 'review',
        'escalation', 'custom'
    ))

    # Assignee
    default_assignee_role = Column(String(50))  # 'csm', 'manager', 'executive'

    # Timing
    days_from_start = Column(Integer)
    due_days = Column(Integer)  # Days allowed to complete

    # Templates
    email_template_id = Column(Integer)
    meeting_agenda_template = Column(Text)

    # Requirements
    required_artifacts = Column(JSON)  # ["meeting_notes", "action_items"]

    created_at = Column(DateTime, default=func.now())
```

#### CSTask
```python
class CSTask(Base):
    __tablename__ = "cs_tasks"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)

    # Task origin
    playbook_id = Column(Integer, ForeignKey("cs_playbooks.id"))
    playbook_step_id = Column(Integer, ForeignKey("cs_playbook_steps.id"))
    journey_enrollment_id = Column(Integer, ForeignKey("cs_journey_enrollments.id"))

    # Task details
    title = Column(String(200), nullable=False)
    description = Column(Text)
    task_type = Column(Enum(
        'call', 'email', 'meeting', 'internal',
        'review', 'escalation', 'follow_up', 'custom'
    ))

    # Assignment
    assigned_to_user_id = Column(Integer, ForeignKey("api_users.id"))
    assigned_to_role = Column(String(50))

    # Priority and status
    priority = Column(Enum('low', 'medium', 'high', 'critical'), default='medium')
    status = Column(Enum('pending', 'in_progress', 'completed', 'cancelled', 'blocked'))

    # Timing
    due_date = Column(Date)
    completed_at = Column(DateTime)

    # Outcome
    outcome = Column(Enum('successful', 'unsuccessful', 'rescheduled', 'no_response'))
    outcome_notes = Column(Text)

    # Metrics
    time_spent_minutes = Column(Integer)

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
```

#### Touchpoint
```python
class Touchpoint(Base):
    __tablename__ = "cs_touchpoints"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)

    # Touchpoint type
    touchpoint_type = Column(Enum(
        'email_sent', 'email_opened', 'email_clicked',
        'call', 'meeting', 'webinar', 'support_ticket',
        'product_login', 'feature_usage', 'nps_response',
        'qbr', 'escalation', 'renewal_discussion',
        'in_app_message', 'custom'
    ))

    # Details
    subject = Column(String(255))
    description = Column(Text)

    # Direction
    direction = Column(Enum('inbound', 'outbound'))
    channel = Column(Enum('email', 'phone', 'video', 'in_app', 'in_person'))

    # Participants
    contact_id = Column(Integer)  # Customer contact
    user_id = Column(Integer, ForeignKey("api_users.id"))  # Our team member

    # Sentiment (AI-analyzed)
    sentiment_score = Column(Float)  # -1.0 to 1.0
    sentiment_label = Column(Enum('positive', 'neutral', 'negative'))
    key_topics = Column(JSON)  # AI-extracted topics

    # Related entities
    task_id = Column(Integer, ForeignKey("cs_tasks.id"))

    # Metadata
    duration_minutes = Column(Integer)
    recording_url = Column(String(500))

    occurred_at = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
```

---

## 3. Health Scoring Algorithm

### 3.1 Component Weights

| Component | Weight | Data Sources |
|-----------|--------|--------------|
| Product Adoption | 30% | Feature usage, login frequency, active users |
| Engagement | 25% | Touchpoints, email opens, webinar attendance |
| Relationship | 15% | Champion status, executive access, NPS |
| Financial | 20% | ARR growth, payment history, contract value |
| Support | 10% | Ticket volume, resolution satisfaction |

### 3.2 Calculation Formula

```python
def calculate_health_score(customer_id: int) -> HealthScore:
    # Component scores (each 0-100)
    adoption = calculate_adoption_score(customer_id)
    engagement = calculate_engagement_score(customer_id)
    relationship = calculate_relationship_score(customer_id)
    financial = calculate_financial_score(customer_id)
    support = calculate_support_score(customer_id)

    # Weighted average
    overall = (
        adoption * 0.30 +
        engagement * 0.25 +
        relationship * 0.15 +
        financial * 0.20 +
        support * 0.10
    )

    # Apply risk multipliers
    if days_to_renewal < 30:
        overall *= 0.95  # Slight penalty near renewal
    if has_open_escalation:
        overall *= 0.90
    if champion_left:
        overall *= 0.85

    # Determine status
    if overall >= 80:
        status = 'healthy'
    elif overall >= 60:
        status = 'at_risk'
    else:
        status = 'critical'

    return HealthScore(
        customer_id=customer_id,
        overall_score=int(overall),
        health_status=status,
        # ... component scores
    )
```

### 3.3 Churn Prediction Model

```python
def predict_churn(customer_id: int) -> float:
    """
    ML-based churn prediction using:
    - Historical churn patterns
    - Health score trends
    - Engagement decay
    - Support ticket sentiment
    - Renewal timing
    - Champion status changes
    """
    features = extract_churn_features(customer_id)

    # Use pre-trained model or AI API
    probability = churn_model.predict_proba(features)[0][1]

    return probability  # 0.0 to 1.0
```

---

## 4. Journey Orchestration Engine

### 4.1 Journey Types

| Journey | Trigger | Duration | Goal |
|---------|---------|----------|------|
| Onboarding | New customer | 90 days | Time-to-value < 30 days |
| Adoption | Low adoption score | 60 days | Adoption score > 70 |
| Renewal | 90 days before renewal | 90 days | Renewal signed |
| Risk Mitigation | Health < 60 | 30 days | Health > 70 |
| Expansion | High health + trigger | 45 days | Upsell closed |
| Advocacy | Health > 90 | 30 days | Reference/case study |
| Win-back | 30 days after churn | 90 days | Reactivation |

### 4.2 Step Types

1. **Email** - Automated email with personalization
2. **In-App Message** - Contextual in-product guidance
3. **Task** - Human touchpoint (call, meeting)
4. **Wait** - Time delay or event-based wait
5. **Condition** - Branch based on customer data
6. **Webhook** - External system integration
7. **Segment Update** - Move customer between segments
8. **Health Check** - Evaluate and potentially exit journey

### 4.3 Example Onboarding Journey

```
Start → Welcome Email → Wait 2 days → Kickoff Call Task
                                            ↓
                            ┌─────── Kickoff Complete? ───────┐
                            │ Yes                             │ No
                            ↓                                 ↓
                    Training Email                    Reschedule Task
                            ↓                                 │
                    Wait 7 days                               │
                            ↓                                 │
                    Adoption Check ◄──────────────────────────┘
                            ↓
            ┌────── Adoption > 50%? ──────┐
            │ Yes                         │ No
            ↓                             ↓
    Continue to Week 2            Intervention Playbook
            ↓
    30-Day Review Task
            ↓
    Health Check
            ↓
    ┌── Health > 70? ──┐
    │ Yes              │ No
    ↓                  ↓
  Exit (Success)    Risk Journey
```

---

## 5. Playbook System

### 5.1 Standard Playbooks

| Playbook | Trigger | Steps | Est. Hours |
|----------|---------|-------|------------|
| Onboarding Excellence | New customer | 8 | 6 |
| Renewal Prep | 90 days to renewal | 5 | 4 |
| Risk Response | Health < 50 | 6 | 8 |
| Executive Escalation | Critical risk | 4 | 4 |
| Expansion Discovery | High health + signals | 5 | 3 |
| QBR Planning | Quarterly | 6 | 5 |
| Champion Change | Champion left | 4 | 3 |

### 5.2 Playbook Step Template

```yaml
playbook: risk_response
steps:
  - order: 1
    name: "Internal Risk Assessment"
    type: internal_task
    due_days: 1
    description: |
      Review customer data:
      - Recent support tickets
      - Usage decline reasons
      - Last touchpoints
      - Champion status
    artifacts: ["risk_assessment_doc"]

  - order: 2
    name: "Stakeholder Sync"
    type: meeting
    due_days: 2
    description: "Internal meeting with sales, support, product"
    meeting_agenda: |
      1. Current situation review
      2. Root cause analysis
      3. Action plan development
      4. Resource needs

  - order: 3
    name: "Executive Reach-out"
    type: call
    due_days: 3
    description: "Call to executive sponsor"
    talk_track: |
      - Acknowledge concerns
      - Present action plan
      - Commit to timeline
      - Schedule follow-up

  - order: 4
    name: "Action Plan Delivery"
    type: email
    due_days: 5
    template: "risk_action_plan"

  - order: 5
    name: "Weekly Check-in"
    type: call
    due_days: 7
    recurring: weekly
    duration_weeks: 4

  - order: 6
    name: "Health Review"
    type: review
    due_days: 30
    success_criteria:
      health_score_increase: 15
```

---

## 6. API Endpoints

### 6.1 Health Scores

```
GET    /api/v2/customer-success/health-scores
GET    /api/v2/customer-success/health-scores/{customer_id}
POST   /api/v2/customer-success/health-scores/{customer_id}/recalculate
GET    /api/v2/customer-success/health-scores/{customer_id}/history
GET    /api/v2/customer-success/health-scores/{customer_id}/components
```

### 6.2 Segments

```
GET    /api/v2/customer-success/segments
POST   /api/v2/customer-success/segments
GET    /api/v2/customer-success/segments/{id}
PUT    /api/v2/customer-success/segments/{id}
DELETE /api/v2/customer-success/segments/{id}
GET    /api/v2/customer-success/segments/{id}/customers
POST   /api/v2/customer-success/segments/{id}/refresh
```

### 6.3 Journeys

```
GET    /api/v2/customer-success/journeys
POST   /api/v2/customer-success/journeys
GET    /api/v2/customer-success/journeys/{id}
PUT    /api/v2/customer-success/journeys/{id}
DELETE /api/v2/customer-success/journeys/{id}
GET    /api/v2/customer-success/journeys/{id}/steps
POST   /api/v2/customer-success/journeys/{id}/steps
PUT    /api/v2/customer-success/journeys/{id}/steps/{step_id}
DELETE /api/v2/customer-success/journeys/{id}/steps/{step_id}
GET    /api/v2/customer-success/journeys/{id}/enrollments
POST   /api/v2/customer-success/journeys/{id}/enroll
```

### 6.4 Playbooks

```
GET    /api/v2/customer-success/playbooks
POST   /api/v2/customer-success/playbooks
GET    /api/v2/customer-success/playbooks/{id}
PUT    /api/v2/customer-success/playbooks/{id}
DELETE /api/v2/customer-success/playbooks/{id}
GET    /api/v2/customer-success/playbooks/{id}/steps
POST   /api/v2/customer-success/playbooks/{id}/trigger/{customer_id}
```

### 6.5 Tasks

```
GET    /api/v2/customer-success/tasks
POST   /api/v2/customer-success/tasks
GET    /api/v2/customer-success/tasks/{id}
PUT    /api/v2/customer-success/tasks/{id}
DELETE /api/v2/customer-success/tasks/{id}
POST   /api/v2/customer-success/tasks/{id}/complete
GET    /api/v2/customer-success/tasks/my-tasks
GET    /api/v2/customer-success/tasks/customer/{customer_id}
```

### 6.6 Touchpoints

```
GET    /api/v2/customer-success/touchpoints
POST   /api/v2/customer-success/touchpoints
GET    /api/v2/customer-success/touchpoints/{id}
GET    /api/v2/customer-success/touchpoints/customer/{customer_id}
GET    /api/v2/customer-success/touchpoints/customer/{customer_id}/timeline
```

### 6.7 Analytics

```
GET    /api/v2/customer-success/analytics/dashboard
GET    /api/v2/customer-success/analytics/health-distribution
GET    /api/v2/customer-success/analytics/churn-risk
GET    /api/v2/customer-success/analytics/journey-performance
GET    /api/v2/customer-success/analytics/playbook-performance
GET    /api/v2/customer-success/analytics/csm-performance
GET    /api/v2/customer-success/analytics/nps-trends
GET    /api/v2/customer-success/analytics/time-to-value
```

---

## 7. Frontend Components

### 7.1 Dashboard (Main View)

```tsx
// src/features/customer-success/pages/SuccessDashboardPage.tsx
- Overall health distribution (healthy/at-risk/critical)
- Active journeys count
- Tasks due today/this week
- Recent alerts
- Key metrics (NPS, churn rate, time-to-value)
- Top at-risk customers
```

### 7.2 Customer 360 View

```tsx
// src/features/customer-success/components/Customer360/
- Health score gauge with trend
- Component score breakdown
- Journey enrollment status
- Active playbooks
- Recent touchpoints timeline
- Key contacts
- Expansion opportunities
- Risk indicators
```

### 7.3 Journey Builder (Visual)

```tsx
// src/features/customer-success/components/JourneyBuilder/
- Drag-and-drop step creation
- Visual flow editor
- Step configuration panels
- Condition branching visualization
- Preview mode
- Metrics overlay
```

### 7.4 Playbook Editor

```tsx
// src/features/customer-success/components/PlaybookEditor/
- Step-by-step editor
- Template library
- Trigger configuration
- Success criteria definition
- Assignment rules
```

### 7.5 Segment Manager

```tsx
// src/features/customer-success/components/SegmentManager/
- Rule builder (AND/OR conditions)
- Customer preview
- Segment overlap visualization
- Auto-refresh settings
- Export capability
```

### 7.6 Task Manager

```tsx
// src/features/customer-success/components/TaskManager/
- Kanban board view
- List view with filters
- Calendar integration
- Bulk actions
- Task templates
```

### 7.7 Risk Alerts

```tsx
// src/features/customer-success/components/RiskAlerts/
- Real-time alert feed
- Severity levels
- Quick actions
- Alert history
- Notification preferences
```

---

## 8. Automation Engine

### 8.1 Scheduled Jobs

| Job | Frequency | Purpose |
|-----|-----------|---------|
| Health Score Refresh | Daily | Recalculate all scores |
| Churn Prediction | Daily | Update churn probabilities |
| Segment Refresh | Hourly | Re-evaluate dynamic segments |
| Journey Processor | Every 5 min | Execute pending journey steps |
| Task Due Reminders | Daily | Send task due notifications |
| Risk Alert Check | Hourly | Generate new risk alerts |

### 8.2 Event Triggers

| Event | Actions |
|-------|---------|
| Health drops below threshold | Create alert, trigger playbook |
| Customer enters segment | Enroll in journey |
| Task completed | Progress journey, update health |
| Champion marked as left | Trigger champion change playbook |
| Support ticket escalated | Create CS task, notify CSM |
| Renewal within 90 days | Trigger renewal playbook |

---

## 9. Security & Compliance

### 9.1 Data Access Controls

- Role-based access to customer data
- CSM can only see assigned customers
- Managers can see team's customers
- Admins have full access

### 9.2 Audit Trail

- Log all customer data access
- Track health score changes
- Record playbook/journey modifications
- Export audit logs for compliance

### 9.3 Data Retention

- Touchpoints: 7 years (compliance)
- Health score history: 3 years
- Task outcomes: 2 years
- Journey analytics: 2 years

---

## 10. Implementation Phases

### Phase 1: Foundation (Current)
- [x] Create architecture plan
- [ ] Database models and migrations
- [ ] Basic CRUD APIs

### Phase 2: Health Scoring
- [ ] Health calculation service
- [ ] Component score calculators
- [ ] Churn prediction integration
- [ ] Health score API endpoints

### Phase 3: Playbooks
- [ ] Playbook models
- [ ] Playbook trigger engine
- [ ] Task generation
- [ ] Playbook API endpoints

### Phase 4: Journeys
- [ ] Journey models
- [ ] Journey orchestration engine
- [ ] Step execution
- [ ] Journey API endpoints

### Phase 5: Segments
- [ ] Segment models
- [ ] Rule evaluation engine
- [ ] Dynamic segment refresh
- [ ] Segment API endpoints

### Phase 6: Frontend - Core
- [ ] Success Dashboard
- [ ] Customer 360 view
- [ ] Task Manager
- [ ] Risk Alerts

### Phase 7: Frontend - Advanced
- [ ] Journey Builder
- [ ] Playbook Editor
- [ ] Segment Manager
- [ ] Analytics Dashboards

### Phase 8: Automation & Polish
- [ ] Scheduled jobs
- [ ] Event-driven automation
- [ ] Email/notification integration
- [ ] Performance optimization

---

## 11. Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Churn Rate | TBD | < 5% | Monthly |
| Time-to-Value | TBD | < 30 days | Per customer |
| NPS | TBD | > 50 | Quarterly |
| Health Score Coverage | 0% | 100% | Weekly |
| Playbook Completion | N/A | > 80% | Monthly |
| Journey Success Rate | N/A | > 70% | Monthly |
| CSM Efficiency | TBD | +30% | Quarterly |

---

*Plan Version 1.0 - Ready for Implementation*
