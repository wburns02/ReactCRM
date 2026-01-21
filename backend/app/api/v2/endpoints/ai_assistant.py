"""
AI Assistant API Endpoints

FastAPI endpoints for AI assistant functionality including conversations,
messages, actions, context management, and health monitoring
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from uuid import UUID
import json
from datetime import datetime, timezone

from app.api.deps import get_current_active_user, get_db
from app.core.logging import get_logger
from app.models.user import User
from app.schemas.ai_assistant import (
    ConversationCreate, ConversationUpdate, ConversationResponse,
    MessageCreate, MessageResponse, ActionCreate, ActionUpdate, ActionResponse,
    AIContextRequest, AIContextResponse, QueryRequest, AIResponse,
    HealthCheckResponse, OverallHealthResponse, AnalyticsResponse,
    StreamChunk, ConversationListResponse, ConversationListPaginated,
    PaginationParams, AnalyticsEventCreate
)
from app.services.ai_assistant_service import AIAssistantService, get_ai_assistant_service

logger = get_logger(__name__)

router = APIRouter()


# ===== CONVERSATION ENDPOINTS =====

@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new AI assistant conversation"""
    service = get_ai_assistant_service(db)

    # Override user_id from token
    conversation_data.user_id = str(current_user.id)

    return await service.create_conversation(conversation_data)


@router.get("/conversations", response_model=ConversationListPaginated)
async def list_conversations(
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List conversations for the current user"""
    service = get_ai_assistant_service(db)

    conversations = await service.list_conversations(
        user_id=str(current_user.id),
        skip=pagination.skip,
        limit=pagination.limit
    )

    total = len(conversations)  # Would implement proper counting in production

    return ConversationListPaginated(
        items=conversations,
        total=total,
        skip=pagination.skip,
        limit=pagination.limit,
        has_next=len(conversations) == pagination.limit
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific conversation"""
    service = get_ai_assistant_service(db)
    return await service.get_conversation(conversation_id, str(current_user.id))


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: UUID,
    update_data: ConversationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a conversation"""
    service = get_ai_assistant_service(db)
    return await service.update_conversation(conversation_id, str(current_user.id), update_data)


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a conversation"""
    service = get_ai_assistant_service(db)
    await service.delete_conversation(conversation_id, str(current_user.id))
    return {"message": "Conversation deleted successfully"}


# ===== MESSAGE ENDPOINTS =====

@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def create_message(
    conversation_id: UUID,
    message_data: MessageCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new message in a conversation"""
    service = get_ai_assistant_service(db)

    # Override conversation_id from URL
    message_data.conversation_id = conversation_id

    message = await service.create_message(message_data)

    # Track analytics event in background
    background_tasks.add_task(
        service.track_event,
        event_type="message_created",
        user_id=str(current_user.id),
        session_id=message_data.conversation_id,
        event_data={
            "message_id": str(message.id),
            "role": message_data.role.value,
            "content_length": len(message_data.content),
            "intent_type": message_data.intent_type.value if message_data.intent_type else None,
            "intent_domain": message_data.intent_domain.value if message_data.intent_domain else None
        }
    )

    return message


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    conversation_id: UUID,
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get messages for a conversation"""
    service = get_ai_assistant_service(db)
    return await service.get_messages(
        conversation_id,
        str(current_user.id),
        skip=pagination.skip,
        limit=pagination.limit
    )


# ===== QUERY PROCESSING ENDPOINTS =====

@router.post("/query", response_model=AIResponse)
async def process_query(
    query_request: QueryRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Process a natural language query through the AI assistant"""
    start_time = datetime.now(timezone.utc)

    try:
        # This would integrate with the actual AI orchestrator
        # For now, return a mock response

        processing_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

        response = AIResponse(
            id=f"resp_{int(datetime.now().timestamp())}",
            conversation_id=str(query_request.conversation_id) if query_request.conversation_id else "new",
            timestamp=datetime.now(timezone.utc),
            primary_result={
                "type": "query_response",
                "content": f"I understand you're asking: '{query_request.message}'. This is a mock response from the AI assistant.",
                "confidence": 0.85
            },
            confidence=0.85,
            completeness=0.9,
            freshness=1.0,
            actionable_insights=[
                {
                    "type": "information",
                    "title": "Query Processed",
                    "description": "Your query has been successfully processed by the AI assistant.",
                    "priority": "low",
                    "confidence": 0.9
                }
            ],
            suggested_actions=[],
            follow_up_questions=[
                "Would you like me to provide more specific information?",
                "How can I help you further with this topic?"
            ],
            processing={
                "duration_ms": int(processing_time),
                "cache_hit": False,
                "model_version": "1.0.0",
                "domains_involved": ["search"]
            }
        )

        # Track analytics
        background_tasks.add_task(
            get_ai_assistant_service(db).track_event,
            event_type="query_processed",
            user_id=str(current_user.id),
            session_id=str(query_request.conversation_id) if query_request.conversation_id else "new",
            event_data={
                "query": query_request.message,
                "query_length": len(query_request.message),
                "confidence": response.confidence
            },
            processing_time_ms=processing_time,
            confidence_score=response.confidence,
            success=True
        )

        return response

    except Exception as e:
        logger.error(f"Failed to process query: {str(e)}")

        # Track error
        processing_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000
        background_tasks.add_task(
            get_ai_assistant_service(db).track_event,
            event_type="query_failed",
            user_id=str(current_user.id),
            session_id=str(query_request.conversation_id) if query_request.conversation_id else "new",
            event_data={
                "query": query_request.message,
                "error": str(e)
            },
            processing_time_ms=processing_time,
            success=False
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process query: {str(e)}"
        )


@router.post("/query/stream")
async def process_query_stream(
    query_request: QueryRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Process a query with streaming response"""

    async def generate_stream():
        """Generate streaming response chunks"""
        try:
            # Simulate streaming response
            chunks = [
                StreamChunk(
                    type="partial",
                    data={"content": "Processing your query..."},
                    timestamp=datetime.now(timezone.utc)
                ),
                StreamChunk(
                    type="partial",
                    data={"content": "Analyzing request..."},
                    timestamp=datetime.now(timezone.utc)
                ),
                StreamChunk(
                    type="insight",
                    data={
                        "type": "information",
                        "title": "Query Analysis Complete",
                        "description": "Successfully analyzed your request."
                    },
                    timestamp=datetime.now(timezone.utc)
                ),
                StreamChunk(
                    type="complete",
                    data={
                        "content": f"Here's my response to: '{query_request.message}'",
                        "confidence": 0.85
                    },
                    timestamp=datetime.now(timezone.utc)
                )
            ]

            for chunk in chunks:
                yield f"data: {json.dumps(chunk.dict())}\n\n"
                # Small delay to simulate processing
                import asyncio
                await asyncio.sleep(0.5)

        except Exception as e:
            error_chunk = StreamChunk(
                type="error",
                data={"error": str(e)},
                timestamp=datetime.now(timezone.utc)
            )
            yield f"data: {json.dumps(error_chunk.dict())}\n\n"

    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )


# ===== ACTION ENDPOINTS =====

@router.post("/actions", response_model=ActionResponse)
async def create_action(
    action_data: ActionCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new AI action"""
    service = get_ai_assistant_service(db)

    action = await service.create_action(action_data)

    # Track analytics
    background_tasks.add_task(
        service.track_event,
        event_type="action_created",
        user_id=str(current_user.id),
        session_id=str(action_data.conversation_id),
        event_data={
            "action_id": str(action.id),
            "type": action_data.type.value,
            "domain": action_data.domain.value,
            "operation": action_data.operation,
            "confidence": action_data.confidence
        },
        confidence_score=action_data.confidence,
        domain=action_data.domain.value
    )

    return action


@router.post("/actions/{action_id}/execute", response_model=ActionResponse)
async def execute_action(
    action_id: UUID,
    background_tasks: BackgroundTasks,
    execution_context: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Execute an AI action"""
    service = get_ai_assistant_service(db)

    start_time = datetime.now(timezone.utc)

    try:
        action = await service.execute_action(action_id, str(current_user.id), execution_context)

        processing_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

        # Track successful execution
        background_tasks.add_task(
            service.track_event,
            event_type="action_executed",
            user_id=str(current_user.id),
            session_id=str(action.conversation_id),
            event_data={
                "action_id": str(action_id),
                "execution_result": action.result
            },
            processing_time_ms=processing_time,
            success=True
        )

        return action

    except Exception as e:
        processing_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

        # Track failed execution
        background_tasks.add_task(
            service.track_event,
            event_type="action_execution_failed",
            user_id=str(current_user.id),
            session_id="unknown",
            event_data={
                "action_id": str(action_id),
                "error": str(e)
            },
            processing_time_ms=processing_time,
            success=False
        )

        raise


@router.post("/actions/{action_id}/rollback", response_model=ActionResponse)
async def rollback_action(
    action_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Rollback an executed action"""
    service = get_ai_assistant_service(db)

    action = await service.rollback_action(action_id, str(current_user.id))

    # Track rollback
    background_tasks.add_task(
        service.track_event,
        event_type="action_rolled_back",
        user_id=str(current_user.id),
        session_id=str(action.conversation_id),
        event_data={"action_id": str(action_id)},
        success=True
    )

    return action


# ===== CONTEXT ENDPOINTS =====

@router.post("/context", response_model=AIContextResponse)
async def get_ai_context(
    context_request: AIContextRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get AI context for query processing"""
    service = get_ai_assistant_service(db)

    # Override user_id from token
    context_request.user_id = str(current_user.id)

    return await service.get_ai_context(context_request)


# ===== HEALTH ENDPOINTS =====

@router.get("/health", response_model=OverallHealthResponse)
async def check_ai_health(
    db: Session = Depends(get_db)
):
    """Check overall health of AI assistant services"""
    service = get_ai_assistant_service(db)
    return await service.check_ai_health()


@router.get("/health/{domain}", response_model=HealthCheckResponse)
async def check_domain_health(
    domain: str,
    db: Session = Depends(get_db)
):
    """Check health of a specific AI domain"""
    service = get_ai_assistant_service(db)

    try:
        from app.schemas.ai_assistant import AIDomain
        domain_enum = AIDomain(domain)

        health_result = await service._check_domain_health(domain_enum)
        return health_result

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid domain: {domain}"
        )


# ===== ANALYTICS ENDPOINTS =====

@router.post("/analytics/track")
async def track_analytics_event(
    event: AnalyticsEventCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Track an analytics event"""
    service = get_ai_assistant_service(db)

    # Override user_id from token
    event.user_id = str(current_user.id)

    success = await service.track_event(
        event_type=event.event_type,
        user_id=event.user_id,
        session_id=event.session_id,
        event_data=event.event_data,
        processing_time_ms=event.processing_time_ms,
        confidence_score=event.confidence_score,
        success=event.success,
        domain=event.domain.value if event.domain else None,
        intent_type=event.intent_type.value if event.intent_type else None
    )

    return {"success": success}


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    days: int = Query(7, ge=1, le=90),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get analytics data"""
    service = get_ai_assistant_service(db)
    return await service.get_analytics(user_id=str(current_user.id), days=days)


@router.get("/analytics/system", response_model=AnalyticsResponse)
async def get_system_analytics(
    days: int = Query(7, ge=1, le=90),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get system-wide analytics (admin only)"""
    # Would check admin permissions here
    service = get_ai_assistant_service(db)
    return await service.get_analytics(days=days)