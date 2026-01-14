"""
Seed RingCentral data with realistic call logs for testing and demo purposes.
Creates at least 5 calls with proper analytics data.
"""

import uuid
import random
from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session

from app.models.ringcentral import CallLog, CallDisposition, RCAccount
from app.models.call_analysis import CallAnalysis
from app.database.base_class import SessionLocal


def create_sample_dispositions(db: Session) -> List[CallDisposition]:
    """Create sample call dispositions if they don't exist."""
    existing_count = db.query(CallDisposition).count()
    if existing_count > 0:
        return db.query(CallDisposition).all()

    dispositions = [
        {
            "name": "Resolved - Customer Satisfied",
            "category": "positive",
            "color": "#10B981",
            "description": "Call resolved, customer satisfied with outcome",
            "auto_apply_enabled": True,
            "auto_apply_conditions": {
                "sentiment_score": 70,
                "keywords": ["resolved", "satisfied", "thank you", "perfect"]
            }
        },
        {
            "name": "Sale Made",
            "category": "positive",
            "color": "#059669",
            "description": "Successful sale or contract signed",
            "auto_apply_enabled": True,
            "auto_apply_conditions": {
                "sentiment_score": 80,
                "keywords": ["purchase", "buy", "order", "contract", "signed"]
            }
        },
        {
            "name": "Follow-up Required",
            "category": "neutral",
            "color": "#F59E0B",
            "description": "Customer needs follow-up contact",
            "auto_apply_enabled": True
        },
        {
            "name": "Information Provided",
            "category": "neutral",
            "color": "#6B7280",
            "description": "Provided information, no further action needed",
            "auto_apply_enabled": True
        },
        {
            "name": "Customer Complaint",
            "category": "negative",
            "color": "#DC2626",
            "description": "Customer complaint or service issue",
            "auto_apply_enabled": True
        }
    ]

    created_dispositions = []
    for i, disp_data in enumerate(dispositions):
        disposition = CallDisposition(
            display_order=(i + 1) * 10,
            is_default=i == 0,
            **disp_data
        )
        db.add(disposition)
        created_dispositions.append(disposition)

    db.commit()
    return created_dispositions


def create_sample_account(db: Session, user_id: str = "demo-user-001") -> RCAccount:
    """Create a sample RingCentral account."""
    existing = db.query(RCAccount).filter(RCAccount.user_id == user_id).first()
    if existing:
        return existing

    account = RCAccount(
        user_id=user_id,
        account_id="12345678",
        extension_id="101",
        extension_number="101",
        account_name="ECBTX Demo Account",
        user_name="Demo Agent",
        email="demo@ecbtx.com",
        is_connected=True,
        is_active=True,
        last_sync_at=datetime.utcnow(),
        auto_sync_enabled=True,
        sync_interval_minutes=60,
        download_recordings=True
    )

    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def create_sample_call_logs(db: Session, account: RCAccount, dispositions: List[CallDisposition], count: int = 15) -> List[CallLog]:
    """Create sample call logs with realistic data."""
    existing_count = db.query(CallLog).filter(CallLog.user_id == account.user_id).count()
    if existing_count >= count:
        return db.query(CallLog).filter(CallLog.user_id == account.user_id).limit(count).all()

    # Sample customer data
    customers = [
        {"name": "John Smith", "number": "+1-555-123-4567", "customer_id": "CUST-001"},
        {"name": "Sarah Johnson", "number": "+1-555-234-5678", "customer_id": "CUST-002"},
        {"name": "Michael Brown", "number": "+1-555-345-6789", "customer_id": "CUST-003"},
        {"name": "Emily Davis", "number": "+1-555-456-7890", "customer_id": "CUST-004"},
        {"name": "David Wilson", "number": "+1-555-567-8901", "customer_id": "CUST-005"},
        {"name": "Lisa Anderson", "number": "+1-555-678-9012", "customer_id": "CUST-006"},
        {"name": "Robert Taylor", "number": "+1-555-789-0123", "customer_id": "CUST-007"},
        {"name": "Jennifer Garcia", "number": "+1-555-890-1234", "customer_id": "CUST-008"}
    ]

    # Sample transcripts and scenarios
    scenarios = [
        {
            "transcript": "Hello, this is John from ECBTX. I'm calling about your recent service request. How can I help you today? The customer explained their HVAC unit wasn't cooling properly. After troubleshooting over the phone, we scheduled a technician visit for tomorrow morning. Customer was satisfied with the quick response.",
            "sentiment": "positive",
            "sentiment_score": 85.0,
            "quality_score": 92,
            "escalation_risk": "low",
            "summary": "HVAC cooling issue resolved, technician visit scheduled",
            "disposition_idx": 0  # Resolved - Customer Satisfied
        },
        {
            "transcript": "Thank you for calling ECBTX! I understand you're interested in our annual maintenance plan. Let me explain the benefits... After discussing the features and pricing, the customer decided to sign up for our premium service package. Payment was processed successfully.",
            "sentiment": "positive",
            "sentiment_score": 92.0,
            "quality_score": 88,
            "escalation_risk": "low",
            "summary": "Customer purchased annual maintenance plan",
            "disposition_idx": 1  # Sale Made
        },
        {
            "transcript": "Hi, I'm calling to follow up on your recent service appointment. How did everything go with our technician yesterday? The customer mentioned they need to think about the additional repairs suggested. I'll follow up in a few days to see if they have any questions.",
            "sentiment": "neutral",
            "sentiment_score": 45.0,
            "quality_score": 75,
            "escalation_risk": "medium",
            "summary": "Follow-up call, customer considering additional repairs",
            "disposition_idx": 2  # Follow-up Required
        },
        {
            "transcript": "Hello, I'm calling to provide you with information about our new smart thermostat installation service. The customer asked several questions about compatibility and pricing. I provided all the details they requested and sent them our brochure via email.",
            "sentiment": "neutral",
            "sentiment_score": 60.0,
            "quality_score": 80,
            "escalation_risk": "low",
            "summary": "Information provided about smart thermostat service",
            "disposition_idx": 3  # Information Provided
        },
        {
            "transcript": "I'm calling about your complaint regarding our recent service. I understand you're not satisfied with the work performed. Let me review what happened and see how we can make this right... The customer was still upset despite our efforts to resolve the issue.",
            "sentiment": "negative",
            "sentiment_score": -75.0,
            "quality_score": 45,
            "escalation_risk": "high",
            "summary": "Customer complaint about recent service quality",
            "disposition_idx": 4  # Customer Complaint
        }
    ]

    call_logs = []
    now = datetime.utcnow()

    for i in range(count):
        # Create varied call times over the past 30 days
        days_back = random.randint(0, 30)
        hours_back = random.randint(0, 23)
        minutes_back = random.randint(0, 59)
        start_time = now - timedelta(days=days_back, hours=hours_back, minutes=minutes_back)

        # Random call duration (2-45 minutes)
        duration_seconds = random.randint(120, 2700)
        end_time = start_time + timedelta(seconds=duration_seconds)

        # Random customer
        customer = random.choice(customers)

        # Random scenario
        scenario = random.choice(scenarios)

        # Random call direction
        direction = random.choice(["inbound", "outbound"])

        # Set phone numbers based on direction
        if direction == "inbound":
            from_number = customer["number"]
            to_number = account.extension_number
            from_name = customer["name"]
            to_name = account.user_name
        else:
            from_number = account.extension_number
            to_number = customer["number"]
            from_name = account.user_name
            to_name = customer["name"]

        call_log = CallLog(
            rc_account_id=account.id,
            user_id=account.user_id,
            rc_call_id=f"RC-{uuid.uuid4().hex[:12]}",
            rc_session_id=f"SES-{uuid.uuid4().hex[:12]}",

            # Participants
            from_number=from_number,
            to_number=to_number,
            from_name=from_name,
            to_name=to_name,

            # Call metadata
            direction=direction,
            status="completed",
            result="connected",
            call_type="voice",

            # Timing
            start_time=start_time,
            end_time=end_time,
            duration_seconds=duration_seconds,
            ring_duration_seconds=random.randint(5, 30),

            # Recording
            has_recording=random.choice([True, False, True]),  # 2/3 chance of recording
            recording_id=f"REC-{uuid.uuid4().hex[:12]}" if random.choice([True, False]) else None,

            # AI Processing
            transcription_status="completed",
            analysis_status="completed",
            disposition_status="auto_applied" if random.choice([True, False]) else "manual_required",

            # AI Results
            transcription=scenario["transcript"],
            ai_summary=scenario["summary"],
            sentiment=scenario["sentiment"],
            sentiment_score=scenario["sentiment_score"],
            quality_score=scenario["quality_score"],
            escalation_risk=scenario["escalation_risk"],

            # CRM Integration
            customer_id=customer["customer_id"],
            contact_name=customer["name"],

            # Disposition
            disposition_id=dispositions[scenario["disposition_idx"]].id,
            disposition_confidence=random.uniform(75.0, 95.0),
            disposition_applied_by="auto" if random.choice([True, False]) else "manual",
            disposition_applied_at=start_time + timedelta(minutes=random.randint(5, 60)),

            # Metadata
            billing_duration_seconds=duration_seconds,
            cost=round(duration_seconds * 0.02 / 60, 2),  # $0.02 per minute

            created_at=start_time,
            updated_at=start_time
        )

        db.add(call_log)
        call_logs.append(call_log)

    db.commit()

    # Refresh all objects to get IDs
    for call_log in call_logs:
        db.refresh(call_log)

    return call_logs


def create_sample_call_analysis(db: Session, call_logs: List[CallLog]) -> None:
    """Create detailed call analysis records."""
    strengths_options = [
        ["Professional Communication", "Clear Explanation"],
        ["Empathy", "Active Listening", "Problem Resolution"],
        ["Technical Knowledge", "Efficiency"],
        ["Customer Focus", "Patience"],
        ["Sales Skills", "Relationship Building"]
    ]

    improvement_options = [
        ["Response Time", "Follow-up"],
        ["Technical Explanation", "Documentation"],
        ["Closing Technique", "Upselling"],
        ["Call Control", "Time Management"]
    ]

    topics = [
        "Service Scheduling", "Technical Support", "Sales Inquiry",
        "Billing Question", "Complaint Resolution", "Product Information",
        "Maintenance Request", "Emergency Service"
    ]

    for call_log in call_logs:
        # Skip if analysis already exists
        existing = db.query(CallAnalysis).filter(CallAnalysis.call_log_id == call_log.id).first()
        if existing:
            continue

        analysis = CallAnalysis(
            call_log_id=call_log.id,

            # Quality breakdown
            professionalism_score=random.randint(70, 100),
            empathy_score=random.randint(60, 95),
            clarity_score=random.randint(75, 100),
            resolution_score=random.randint(65, 90),

            # Sentiment analysis
            overall_sentiment=call_log.sentiment,
            customer_satisfaction=random.randint(3, 5) if call_log.sentiment == "positive" else random.randint(1, 3),
            agent_tone="professional",

            # Topic and content
            primary_topic=random.choice(topics),
            keywords=["HVAC", "service", "technician", "appointment"],
            entities={"customer_name": call_log.contact_name, "service_type": "HVAC"},

            # Performance insights
            strengths=random.choice(strengths_options),
            improvement_areas=random.choice(improvement_options) if random.choice([True, False]) else [],

            # Predictions
            predicted_csat_score=random.uniform(3.5, 4.8) if call_log.sentiment == "positive" else random.uniform(1.5, 3.2),
            escalation_probability=random.uniform(0.1, 0.3) if call_log.escalation_risk == "low" else random.uniform(0.6, 0.9),

            # Timing
            analysis_duration_seconds=random.randint(30, 120),
            processed_at=call_log.created_at + timedelta(minutes=random.randint(1, 10)),
            created_at=call_log.created_at + timedelta(seconds=random.randint(60, 300))
        )

        db.add(analysis)

    db.commit()


def seed_ringcentral_data(db: Session, user_id: str = "demo-user-001", call_count: int = 15) -> dict:
    """
    Main function to seed comprehensive RingCentral data.

    Args:
        db: Database session
        user_id: User ID to associate with the data
        call_count: Number of call logs to create

    Returns:
        Dict with summary of created data
    """
    try:
        # Create dispositions
        dispositions = create_sample_dispositions(db)

        # Create account
        account = create_sample_account(db, user_id)

        # Create call logs
        call_logs = create_sample_call_logs(db, account, dispositions, call_count)

        # Create detailed analysis
        create_sample_call_analysis(db, call_logs)

        # Count final results
        final_dispositions = db.query(CallDisposition).count()
        final_accounts = db.query(RCAccount).count()
        final_calls = db.query(CallLog).filter(CallLog.user_id == user_id).count()
        final_analyses = db.query(CallAnalysis).join(CallLog).filter(CallLog.user_id == user_id).count()

        return {
            "success": True,
            "message": "RingCentral data seeded successfully",
            "data": {
                "dispositions_created": final_dispositions,
                "accounts_created": final_accounts,
                "calls_created": final_calls,
                "analyses_created": final_analyses,
                "user_id": user_id
            }
        }

    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "message": f"Failed to seed data: {str(e)}",
            "error": str(e)
        }


if __name__ == "__main__":
    # For standalone execution
    db = SessionLocal()
    try:
        result = seed_ringcentral_data(db, call_count=15)
        print(f"Seeding result: {result}")
    finally:
        db.close()