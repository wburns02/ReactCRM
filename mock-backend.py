#!/usr/bin/env python3
"""
Mock FastAPI backend for testing Call Intelligence Dashboard endpoints.
This provides the exact endpoints the frontend is looking for with sample data.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import uvicorn

app = FastAPI(title="Mock CRM API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Sample data
SAMPLE_AGENTS = [
    {
        "agent_id": "agent-001",
        "agent_name": "Sarah Johnson",
        "avatar_url": None,
        "total_calls": 45,
        "avg_quality_score": 87.5,
        "avg_sentiment_score": 72.3,
        "avg_handle_time": 245.8,
        "professionalism": 92.0,
        "empathy": 85.0,
        "clarity": 88.0,
        "resolution": 83.0,
        "quality_trend": "positive",
        "trend_percentage": 5.2,
        "rank": 1,
        "rank_change": 2,
        "strengths": ["Excellent communication", "Problem-solving", "Customer rapport"],
        "improvement_areas": ["Call closing techniques", "Product knowledge"]
    },
    {
        "agent_id": "agent-002",
        "agent_name": "Mike Chen",
        "avatar_url": None,
        "total_calls": 52,
        "avg_quality_score": 82.1,
        "avg_sentiment_score": 68.7,
        "avg_handle_time": 198.3,
        "professionalism": 85.0,
        "empathy": 78.0,
        "clarity": 90.0,
        "resolution": 85.0,
        "quality_trend": "neutral",
        "trend_percentage": -1.1,
        "rank": 2,
        "rank_change": -1,
        "strengths": ["Technical expertise", "Efficiency", "Clear explanations"],
        "improvement_areas": ["Empathy", "Active listening"]
    }
]

@app.get("/")
async def root():
    return {"message": "Mock CRM API is running", "status": "healthy"}

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# ===== AUTH ENDPOINTS =====

@app.post("/api/v2/auth/login")
async def mock_login():
    """Mock login endpoint for testing"""
    return {
        "access_token": "mock_token_12345",
        "token_type": "bearer",
        "user": {
            "id": "demo-user-001",
            "email": "will@macseptic.com",
            "name": "Will Burns",
            "role": "admin"
        }
    }

@app.get("/api/v2/auth/me")
async def mock_current_user():
    """Mock current user endpoint"""
    return {
        "id": "demo-user-001",
        "email": "will@macseptic.com",
        "name": "Will Burns",
        "role": "admin",
        "is_active": True
    }

# ===== CALL INTELLIGENCE ENDPOINTS =====

@app.get("/api/v2/ringcentral/calls/analytics")
async def get_call_analytics():
    """Mock call analytics matching CallAnalyticsResponse schema"""
    return {
        "metrics": {
            "total_calls": 157,
            "calls_today": 23,
            "calls_this_week": 89,
            "positive_calls": 94,
            "neutral_calls": 43,
            "negative_calls": 20,
            "avg_sentiment_score": 71.4,
            "avg_quality_score": 84.2,
            "quality_trend": 3.7,
            "escalation_rate": 8.9,
            "high_risk_calls": 12,
            "critical_risk_calls": 2,
            "avg_csat_prediction": 4.2,
            "auto_disposition_rate": 76.8,
            "auto_disposition_accuracy": 92.3,
            "sentiment_trend": [
                {"date": "2026-01-07", "value": 68.2, "positive": 12, "neutral": 8, "negative": 3},
                {"date": "2026-01-08", "value": 72.1, "positive": 15, "neutral": 6, "negative": 2},
                {"date": "2026-01-09", "value": 69.8, "positive": 11, "neutral": 9, "negative": 4},
                {"date": "2026-01-10", "value": 74.3, "positive": 18, "neutral": 5, "negative": 1},
                {"date": "2026-01-11", "value": 71.9, "positive": 13, "neutral": 7, "negative": 3},
                {"date": "2026-01-12", "value": 73.6, "positive": 16, "neutral": 6, "negative": 2},
                {"date": "2026-01-13", "value": 75.1, "positive": 19, "neutral": 4, "negative": 1}
            ],
            "quality_trend_data": [
                {"date": "2026-01-07", "value": 82.1},
                {"date": "2026-01-08", "value": 83.5},
                {"date": "2026-01-09", "value": 81.9},
                {"date": "2026-01-10", "value": 85.2},
                {"date": "2026-01-11", "value": 84.7},
                {"date": "2026-01-12", "value": 86.1},
                {"date": "2026-01-13", "value": 87.3}
            ],
            "volume_trend": [
                {"date": "2026-01-07", "value": 23},
                {"date": "2026-01-08", "value": 28},
                {"date": "2026-01-09", "value": 19},
                {"date": "2026-01-10", "value": 32},
                {"date": "2026-01-11", "value": 25},
                {"date": "2026-01-12", "value": 30},
                {"date": "2026-01-13", "value": 35}
            ]
        },
        "updated_at": datetime.now().isoformat()
    }

@app.get("/api/v2/ringcentral/agents/performance")
async def get_agents_performance():
    """Mock agent performance data"""
    return {
        "agents": SAMPLE_AGENTS,
        "total": len(SAMPLE_AGENTS)
    }

@app.get("/api/v2/ringcentral/quality/heatmap")
async def get_quality_heatmap(days: int = 14):
    """Mock quality heatmap data"""
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days-1)

    heatmap_data = []
    for agent in SAMPLE_AGENTS:
        daily_scores = []
        for i in range(days):
            date = start_date + timedelta(days=i)
            # Simulate varying quality scores
            base_score = agent["avg_quality_score"]
            variation = (-5 + (i % 11)) * 2  # Some variation
            score = max(60, min(100, base_score + variation))

            daily_scores.append({
                "date": date.strftime("%Y-%m-%d"),
                "score": round(score, 1),
                "call_count": 3 + (i % 8)  # Varying call counts
            })

        heatmap_data.append({
            "agent_id": agent["agent_id"],
            "agent_name": agent["agent_name"],
            "daily_scores": daily_scores
        })

    return {
        "data": heatmap_data,
        "date_range": {
            "start": start_date.strftime("%Y-%m-%d"),
            "end": end_date.strftime("%Y-%m-%d")
        }
    }

@app.get("/api/v2/ringcentral/coaching/insights")
async def get_coaching_insights(days: int = 30):
    """Mock coaching insights data"""
    return {
        "insights": {
            "top_strengths": [
                {"name": "Professional communication", "count": 23, "percentage": 67.6},
                {"name": "Technical expertise", "count": 19, "percentage": 55.9},
                {"name": "Problem resolution", "count": 17, "percentage": 50.0},
                {"name": "Customer empathy", "count": 14, "percentage": 41.2},
                {"name": "Clear explanations", "count": 12, "percentage": 35.3}
            ],
            "top_improvements": [
                {"name": "Call closing techniques", "count": 15, "percentage": 44.1},
                {"name": "Active listening", "count": 12, "percentage": 35.3},
                {"name": "Product knowledge", "count": 10, "percentage": 29.4},
                {"name": "Upselling skills", "count": 8, "percentage": 23.5},
                {"name": "Conflict resolution", "count": 6, "percentage": 17.6}
            ],
            "trending_topics": [
                {"topic": "Billing inquiries", "count": 45, "sentiment": "neutral"},
                {"topic": "Technical support", "count": 38, "sentiment": "positive"},
                {"topic": "Service complaints", "count": 22, "sentiment": "negative"},
                {"topic": "Account changes", "count": 19, "sentiment": "neutral"},
                {"topic": "New feature requests", "count": 12, "sentiment": "positive"}
            ],
            "recommended_training": [
                {"module": "Call Closing Techniques Training", "priority": "high", "agents_affected": 8},
                {"module": "Active Listening Training", "priority": "medium", "agents_affected": 6},
                {"module": "Product Knowledge Training", "priority": "medium", "agents_affected": 5}
            ]
        },
        "period": f"last_{days}_days"
    }

@app.get("/api/v2/call-dispositions/analytics")
async def get_disposition_analytics():
    """Mock call disposition analytics"""
    return {
        "dispositions": [
            {
                "disposition_id": "disp-001",
                "disposition_name": "Resolved - Customer Satisfied",
                "category": "positive",
                "color": "#10B981",
                "count": 67,
                "percentage": 42.7,
                "auto_applied_count": 52,
                "manual_count": 15,
                "avg_confidence": 87.3
            },
            {
                "disposition_id": "disp-002",
                "disposition_name": "Follow-up Required",
                "category": "neutral",
                "color": "#F59E0B",
                "count": 34,
                "percentage": 21.7,
                "auto_applied_count": 29,
                "manual_count": 5,
                "avg_confidence": 74.2
            },
            {
                "disposition_id": "disp-003",
                "disposition_name": "Information Provided",
                "category": "neutral",
                "color": "#6B7280",
                "count": 28,
                "percentage": 17.8,
                "auto_applied_count": 24,
                "manual_count": 4,
                "avg_confidence": 82.1
            },
            {
                "disposition_id": "disp-004",
                "disposition_name": "Escalation Required",
                "category": "negative",
                "color": "#EF4444",
                "count": 18,
                "percentage": 11.5,
                "auto_applied_count": 14,
                "manual_count": 4,
                "avg_confidence": 91.7
            },
            {
                "disposition_id": "disp-005",
                "disposition_name": "No Answer",
                "category": "neutral",
                "color": "#9CA3AF",
                "count": 10,
                "percentage": 6.4,
                "auto_applied_count": 10,
                "manual_count": 0,
                "avg_confidence": 98.5
            }
        ],
        "total_calls": 157
    }

if __name__ == "__main__":
    print("Starting Mock CRM API on http://localhost:8001")
    print("Call Intelligence endpoints available:")
    print("  GET /api/v2/ringcentral/calls/analytics")
    print("  GET /api/v2/ringcentral/agents/performance")
    print("  GET /api/v2/ringcentral/quality/heatmap")
    print("  GET /api/v2/ringcentral/coaching/insights")
    print("  GET /api/v2/call-dispositions/analytics")
    print("")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")