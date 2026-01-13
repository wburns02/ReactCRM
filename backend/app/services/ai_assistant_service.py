"""
AI Assistant Service Layer

Business logic for AI assistant operations including conversation management,
message processing, action execution, and context aggregation
"""

import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, AsyncGenerator
from uuid import UUID, uuid4

from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, func
from fastapi import HTTPException, status

from app.models.ai_assistant import (
    AIConversation, AIMessage, AIAction, AIContext, AIHealth, AIAnalytics
)
from app.schemas.ai_assistant import (
    ConversationCreate, ConversationUpdate, ConversationResponse,
    MessageCreate, MessageResponse, ActionCreate, ActionUpdate, ActionResponse,
    AIContextRequest, AIContextResponse, QueryRequest, AIResponse,
    HealthCheckResponse, OverallHealthResponse, AnalyticsResponse,
    StreamChunk, ConversationListResponse, ActionStatus, HealthStatus,
    MessageRole, IntentType, AIDomain
)
from app.core.logging import get_logger

logger = get_logger(__name__)


class AIAssistantService:
    """
    AI Assistant Service

    Handles all AI assistant operations including conversations, messages,
    actions, context management, and health monitoring
    """

    def __init__(self, db: Session):
        self.db = db

    # ===== CONVERSATION MANAGEMENT =====

    async def create_conversation(self, conversation_data: ConversationCreate) -> ConversationResponse:
        """Create a new AI conversation"""
        try:
            conversation = AIConversation(
                user_id=conversation_data.user_id,
                session_id=conversation_data.session_id,
                title=conversation_data.title,
                settings=conversation_data.settings.dict(),
                status="active"
            )

            self.db.add(conversation)
            self.db.commit()
            self.db.refresh(conversation)

            logger.info(f"Created conversation {conversation.id} for user {conversation_data.user_id}")

            return ConversationResponse.from_orm(conversation)

        except Exception as e:
            logger.error(f"Failed to create conversation: {str(e)}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create conversation: {str(e)}"
            )

    async def get_conversation(self, conversation_id: UUID, user_id: str) -> ConversationResponse:
        """Get a conversation by ID"""
        conversation = self.db.query(AIConversation).filter(
            and_(
                AIConversation.id == conversation_id,
                AIConversation.user_id == user_id
            )
        ).first()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        return ConversationResponse.from_orm(conversation)

    async def update_conversation(
        self,
        conversation_id: UUID,
        user_id: str,
        update_data: ConversationUpdate
    ) -> ConversationResponse:
        """Update a conversation"""
        conversation = self.db.query(AIConversation).filter(
            and_(
                AIConversation.id == conversation_id,
                AIConversation.user_id == user_id
            )
        ).first()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        # Update fields
        update_dict = update_data.dict(exclude_unset=True)
        for field, value in update_dict.items():
            if hasattr(conversation, field):
                setattr(conversation, field, value)

        conversation.updated_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(conversation)

        return ConversationResponse.from_orm(conversation)

    async def list_conversations(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20
    ) -> List[ConversationListResponse]:
        """List conversations for a user"""
        conversations = self.db.query(
            AIConversation,
            func.count(AIMessage.id).label('message_count')
        ).outerjoin(AIMessage).filter(
            AIConversation.user_id == user_id
        ).group_by(AIConversation.id).order_by(
            desc(AIConversation.last_active_at)
        ).offset(skip).limit(limit).all()

        result = []
        for conversation, message_count in conversations:
            # Get last message preview
            last_message = self.db.query(AIMessage).filter(
                AIMessage.conversation_id == conversation.id
            ).order_by(desc(AIMessage.timestamp)).first()

            last_message_preview = None
            if last_message:
                preview = last_message.content[:100]
                last_message_preview = preview + "..." if len(last_message.content) > 100 else preview

            result.append(ConversationListResponse(
                id=conversation.id,
                title=conversation.title,
                status=conversation.status,
                message_count=message_count,
                last_message_preview=last_message_preview,
                last_active_at=conversation.last_active_at,
                created_at=conversation.created_at
            ))

        return result

    async def delete_conversation(self, conversation_id: UUID, user_id: str) -> bool:
        """Delete a conversation and all related data"""
        conversation = self.db.query(AIConversation).filter(
            and_(
                AIConversation.id == conversation_id,
                AIConversation.user_id == user_id
            )
        ).first()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        try:
            self.db.delete(conversation)
            self.db.commit()

            logger.info(f"Deleted conversation {conversation_id} for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to delete conversation {conversation_id}: {str(e)}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete conversation: {str(e)}"
            )

    # ===== MESSAGE MANAGEMENT =====

    async def create_message(self, message_data: MessageCreate) -> MessageResponse:
        """Create a new message in a conversation"""
        try:
            # Verify conversation exists and user has access
            conversation = self.db.query(AIConversation).filter(
                AIConversation.id == message_data.conversation_id
            ).first()

            if not conversation:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found"
                )

            # Create message
            message = AIMessage(
                conversation_id=message_data.conversation_id,
                role=message_data.role.value,
                content=message_data.content,
                confidence=message_data.confidence,
                metadata=message_data.metadata.dict(),
                intent_type=message_data.intent_type.value if message_data.intent_type else None,
                intent_domain=message_data.intent_domain.value if message_data.intent_domain else None,
                intent_operation=message_data.intent_operation,
                entities=[entity.dict() for entity in message_data.entities]
            )

            self.db.add(message)

            # Update conversation last_active_at
            conversation.last_active_at = datetime.now(timezone.utc)

            self.db.commit()
            self.db.refresh(message)

            logger.info(f"Created message {message.id} in conversation {message_data.conversation_id}")

            return MessageResponse.from_orm(message)

        except Exception as e:
            logger.error(f"Failed to create message: {str(e)}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create message: {str(e)}"
            )

    async def get_messages(
        self,
        conversation_id: UUID,
        user_id: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[MessageResponse]:
        """Get messages for a conversation"""
        # Verify user has access to conversation
        conversation = self.db.query(AIConversation).filter(
            and_(
                AIConversation.id == conversation_id,
                AIConversation.user_id == user_id
            )
        ).first()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        messages = self.db.query(AIMessage).filter(
            AIMessage.conversation_id == conversation_id
        ).order_by(AIMessage.timestamp).offset(skip).limit(limit).all()

        return [MessageResponse.from_orm(message) for message in messages]

    # ===== ACTION MANAGEMENT =====

    async def create_action(self, action_data: ActionCreate) -> ActionResponse:
        """Create a new AI action"""
        try:
            action = AIAction(
                conversation_id=action_data.conversation_id,
                message_id=action_data.message_id,
                type=action_data.type.value,
                domain=action_data.domain.value,
                operation=action_data.operation,
                payload=action_data.payload,
                requirements=[req.dict() for req in action_data.requirements],
                confidence=action_data.confidence,
                estimated_impact=action_data.estimated_impact.dict(),
                status="pending"
            )

            self.db.add(action)
            self.db.commit()
            self.db.refresh(action)

            logger.info(f"Created action {action.id} for conversation {action_data.conversation_id}")

            return ActionResponse.from_orm(action)

        except Exception as e:
            logger.error(f"Failed to create action: {str(e)}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create action: {str(e)}"
            )

    async def execute_action(
        self,
        action_id: UUID,
        user_id: str,
        execution_context: Optional[Dict[str, Any]] = None
    ) -> ActionResponse:
        """Execute an AI action"""
        action = self.db.query(AIAction).filter(AIAction.id == action_id).first()

        if not action:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Action not found"
            )

        # Verify user has access through conversation
        conversation = self.db.query(AIConversation).filter(
            and_(
                AIConversation.id == action.conversation_id,
                AIConversation.user_id == user_id
            )
        ).first()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        try:
            # Update status to executing
            action.status = "executing"
            action.executed_by = user_id
            action.executed_at = datetime.now(timezone.utc)

            # Execute the action based on domain and operation
            result = await self._execute_action_logic(action, execution_context)

            # Update action with results
            action.status = "completed"
            action.result = result
            action.updated_at = datetime.now(timezone.utc)

            self.db.commit()
            self.db.refresh(action)

            logger.info(f"Executed action {action_id} successfully")

            return ActionResponse.from_orm(action)

        except Exception as e:
            logger.error(f"Failed to execute action {action_id}: {str(e)}")

            # Update action status to failed
            action.status = "failed"
            action.error_message = str(e)
            action.updated_at = datetime.now(timezone.utc)

            self.db.commit()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Action execution failed: {str(e)}"
            )

    async def rollback_action(self, action_id: UUID, user_id: str) -> ActionResponse:
        """Rollback an executed action"""
        action = self.db.query(AIAction).filter(AIAction.id == action_id).first()

        if not action:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Action not found"
            )

        if action.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only rollback completed actions"
            )

        try:
            # Perform rollback logic based on action type
            rollback_result = await self._rollback_action_logic(action)

            # Update action status
            action.status = "cancelled"
            action.result = {
                **action.result,
                "rollback": rollback_result,
                "rolled_back_at": datetime.now(timezone.utc).isoformat(),
                "rolled_back_by": user_id
            }
            action.updated_at = datetime.now(timezone.utc)

            self.db.commit()
            self.db.refresh(action)

            logger.info(f"Rolled back action {action_id}")

            return ActionResponse.from_orm(action)

        except Exception as e:
            logger.error(f"Failed to rollback action {action_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Action rollback failed: {str(e)}"
            )

    # ===== CONTEXT MANAGEMENT =====

    async def get_ai_context(self, context_request: AIContextRequest) -> AIContextResponse:
        """Get aggregated AI context for processing queries"""
        try:
            # Get user context (would integrate with actual user service)
            user_context = {
                "id": context_request.user_id,
                "role": "user",  # Would fetch from user service
                "permissions": ["read:all", "write:tickets"],  # Would fetch actual permissions
                "preferences": {}
            }

            # Get app context
            app_context = {
                "current_page": context_request.page or "/dashboard",
                "current_entity": {
                    "type": context_request.entity_type,
                    "id": context_request.entity_id
                } if context_request.entity_type and context_request.entity_id else None,
                "session_data": {}
            }

            # Get domain context (would integrate with actual services)
            domain_context = await self._get_domain_context(context_request.user_id)

            # Get session context
            session_context = await self._get_session_context(
                context_request.user_id,
                context_request.session_id
            )

            return AIContextResponse(
                user=user_context,
                app=app_context,
                domain=domain_context,
                session=session_context
            )

        except Exception as e:
            logger.error(f"Failed to get AI context: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get AI context: {str(e)}"
            )

    # ===== HEALTH MONITORING =====

    async def check_ai_health(self) -> OverallHealthResponse:
        """Perform comprehensive health check of all AI domains"""
        try:
            health_checks = {}
            overall_status = HealthStatus.HEALTHY

            # Check each AI domain
            for domain in AIDomain:
                try:
                    health_check = await self._check_domain_health(domain)
                    health_checks[domain] = health_check

                    # Update overall status based on domain status
                    if health_check.status == HealthStatus.UNAVAILABLE:
                        overall_status = HealthStatus.UNAVAILABLE
                    elif health_check.status == HealthStatus.DEGRADED and overall_status == HealthStatus.HEALTHY:
                        overall_status = HealthStatus.DEGRADED

                    # Store health check result
                    health_record = AIHealth(
                        domain=domain.value,
                        status=health_check.status.value,
                        response_time_ms=health_check.response_time_ms,
                        success_rate=health_check.success_rate,
                        last_error=health_check.last_error,
                        error_count=health_check.error_count,
                        details=health_check.details
                    )
                    self.db.add(health_record)

                except Exception as e:
                    logger.error(f"Health check failed for domain {domain}: {str(e)}")
                    health_checks[domain] = HealthCheckResponse(
                        domain=domain,
                        status=HealthStatus.UNAVAILABLE,
                        response_time_ms=0.0,
                        success_rate=0.0,
                        last_error=str(e),
                        error_count=1,
                        details={},
                        checked_at=datetime.now(timezone.utc)
                    )

            self.db.commit()

            # Create summary
            total_domains = len(health_checks)
            healthy_domains = sum(1 for hc in health_checks.values() if hc.status == HealthStatus.HEALTHY)
            degraded_domains = sum(1 for hc in health_checks.values() if hc.status == HealthStatus.DEGRADED)
            unavailable_domains = sum(1 for hc in health_checks.values() if hc.status == HealthStatus.UNAVAILABLE)

            summary = {
                "total_domains": total_domains,
                "healthy_domains": healthy_domains,
                "degraded_domains": degraded_domains,
                "unavailable_domains": unavailable_domains,
                "health_percentage": (healthy_domains / total_domains) * 100 if total_domains > 0 else 0
            }

            return OverallHealthResponse(
                overall_status=overall_status,
                domains=health_checks,
                summary=summary,
                checked_at=datetime.now(timezone.utc)
            )

        except Exception as e:
            logger.error(f"Failed to perform health check: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Health check failed: {str(e)}"
            )

    # ===== ANALYTICS =====

    async def track_event(
        self,
        event_type: str,
        user_id: str,
        session_id: str,
        event_data: Dict[str, Any],
        **kwargs
    ) -> bool:
        """Track an analytics event"""
        try:
            event = AIAnalytics(
                event_type=event_type,
                user_id=user_id,
                session_id=session_id,
                event_data=event_data,
                processing_time_ms=kwargs.get('processing_time_ms'),
                confidence_score=kwargs.get('confidence_score'),
                success=kwargs.get('success', True),
                domain=kwargs.get('domain'),
                intent_type=kwargs.get('intent_type')
            )

            self.db.add(event)
            self.db.commit()

            return True

        except Exception as e:
            logger.error(f"Failed to track event: {str(e)}")
            return False

    async def get_analytics(
        self,
        user_id: Optional[str] = None,
        days: int = 7
    ) -> AnalyticsResponse:
        """Get analytics data"""
        try:
            start_date = datetime.now(timezone.utc) - timedelta(days=days)

            query = self.db.query(AIAnalytics).filter(
                AIAnalytics.created_at >= start_date
            )

            if user_id:
                query = query.filter(AIAnalytics.user_id == user_id)

            events = query.all()

            # Calculate metrics
            total_events = len(events)
            successful_events = sum(1 for event in events if event.success)
            success_rate = (successful_events / total_events) * 100 if total_events > 0 else 0

            response_times = [event.processing_time_ms for event in events if event.processing_time_ms]
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0

            # Most common intents
            intent_counts = {}
            for event in events:
                if event.intent_type:
                    intent_counts[event.intent_type] = intent_counts.get(event.intent_type, 0) + 1

            most_common_intents = [
                {"intent": intent, "count": count}
                for intent, count in sorted(intent_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            ]

            # Domain usage
            domain_counts = {}
            for event in events:
                if event.domain:
                    domain_counts[event.domain] = domain_counts.get(event.domain, 0) + 1

            # Error summary
            failed_events = [event for event in events if not event.success]
            error_summary = {
                "total_errors": len(failed_events),
                "error_rate": (len(failed_events) / total_events) * 100 if total_events > 0 else 0
            }

            return AnalyticsResponse(
                total_events=total_events,
                success_rate=success_rate,
                average_response_time=avg_response_time,
                most_common_intents=most_common_intents,
                domain_usage=domain_counts,
                error_summary=error_summary,
                time_period=f"{days} days"
            )

        except Exception as e:
            logger.error(f"Failed to get analytics: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get analytics: {str(e)}"
            )

    # ===== PRIVATE HELPER METHODS =====

    async def _execute_action_logic(self, action: AIAction, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute the actual logic for an action"""
        # This would integrate with actual services based on the action domain and operation
        # For now, return a mock result

        await asyncio.sleep(0.1)  # Simulate processing time

        return {
            "action_id": str(action.id),
            "domain": action.domain,
            "operation": action.operation,
            "status": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "result": f"Mock execution result for {action.operation} in {action.domain}"
        }

    async def _rollback_action_logic(self, action: AIAction) -> Dict[str, Any]:
        """Perform rollback logic for an action"""
        # This would implement actual rollback logic based on the action type

        await asyncio.sleep(0.05)  # Simulate rollback time

        return {
            "rollback_status": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": f"Rolled back {action.operation} in {action.domain}"
        }

    async def _get_domain_context(self, user_id: str) -> Dict[str, Any]:
        """Get domain-specific context data"""
        # This would integrate with actual services to get domain data
        return {
            "customers": [],
            "work_orders": [],
            "tickets": [],
            "technicians": []
        }

    async def _get_session_context(self, user_id: str, session_id: str) -> Dict[str, Any]:
        """Get session-specific context data"""
        # Get recent conversation history
        recent_messages = self.db.query(AIMessage).join(AIConversation).filter(
            and_(
                AIConversation.user_id == user_id,
                AIConversation.session_id == session_id
            )
        ).order_by(desc(AIMessage.timestamp)).limit(10).all()

        conversation_history = [
            {
                "role": msg.role,
                "content": msg.content[:100],  # Truncate for context
                "timestamp": msg.timestamp.isoformat()
            }
            for msg in recent_messages
        ]

        return {
            "conversation_history": conversation_history,
            "recent_queries": [],
            "active_tasks": []
        }

    async def _check_domain_health(self, domain: AIDomain) -> HealthCheckResponse:
        """Check health of a specific AI domain"""
        start_time = datetime.now(timezone.utc)

        try:
            # Simulate health check (would integrate with actual services)
            await asyncio.sleep(0.01)

            response_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

            return HealthCheckResponse(
                domain=domain,
                status=HealthStatus.HEALTHY,
                response_time_ms=response_time,
                success_rate=95.0,
                last_error=None,
                error_count=0,
                details={"version": "1.0.0", "last_check": "ok"},
                checked_at=datetime.now(timezone.utc)
            )

        except Exception as e:
            response_time = (datetime.now(timezone.utc) - start_time).total_seconds() * 1000

            return HealthCheckResponse(
                domain=domain,
                status=HealthStatus.UNAVAILABLE,
                response_time_ms=response_time,
                success_rate=0.0,
                last_error=str(e),
                error_count=1,
                details={},
                checked_at=datetime.now(timezone.utc)
            )


# ===== FACTORY FUNCTION =====

def get_ai_assistant_service(db: Session) -> AIAssistantService:
    """Factory function to create AI Assistant service instance"""
    return AIAssistantService(db)