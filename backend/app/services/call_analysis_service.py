"""
AI-powered call analysis service using OpenAI GPT models.
Performs sentiment analysis, quality scoring, coaching insights, and auto-disposition.
"""

import logging
import asyncio
import time
import json
from typing import Optional, Dict, Any, List
from datetime import datetime

from openai import AsyncOpenAI
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.ringcentral import CallLog
from app.models.call_transcript import CallTranscript
from app.models.call_analysis import CallAnalysis, CallAnalysisMetric
from app.database.base_class import get_db

logger = logging.getLogger(__name__)


class CallAnalysisError(Exception):
    """Custom exception for call analysis-related errors."""
    pass


class CallAnalysisService:
    """Service for AI-powered call analysis using GPT models."""

    def __init__(self):
        """Initialize analysis service with OpenAI client."""
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.GPT_ANALYSIS_MODEL
        self.analysis_version = "1.0"

    async def analyze_call(
        self,
        call_log_id: str,
        analysis_modules: Optional[List[str]] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Perform comprehensive AI analysis on a call recording.

        Args:
            call_log_id: UUID of the call log
            analysis_modules: List of analysis modules to run (optional)
            db: Database session (optional)

        Returns:
            Dict with analysis results and metadata

        Raises:
            CallAnalysisError: If analysis fails
        """
        start_time = time.time()

        # Get database session
        if db is None:
            db = next(get_db())

        # Default analysis modules
        if analysis_modules is None:
            analysis_modules = [
                "sentiment_analysis",
                "quality_scoring",
                "escalation_assessment",
                "topic_extraction",
                "coaching_insights",
                "auto_disposition"
            ]

        try:
            # Get call log and transcript
            call_log = db.query(CallLog).filter(CallLog.id == call_log_id).first()
            if not call_log:
                raise CallAnalysisError(f"Call log {call_log_id} not found")

            transcript = db.query(CallTranscript).filter(
                CallTranscript.call_log_id == call_log_id
            ).first()

            if not transcript or not transcript.full_transcript:
                raise CallAnalysisError(
                    f"No transcript found for call {call_log_id}. Transcription must be completed first."
                )

            # Update call log status
            call_log.analysis_status = "processing"
            db.commit()

            logger.info(f"Starting AI analysis for call {call_log.rc_call_id} with modules: {analysis_modules}")

            # Prepare analysis context
            context = self._prepare_analysis_context(call_log, transcript)

            # Run analysis modules
            analysis_results = {}
            total_tokens = 0

            for module in analysis_modules:
                logger.debug(f"Running analysis module: {module}")
                try:
                    module_result = await self._run_analysis_module(module, context)
                    analysis_results[module] = module_result
                    total_tokens += module_result.get('tokens_used', 0)
                except Exception as e:
                    logger.error(f"Analysis module {module} failed: {e}")
                    analysis_results[module] = {
                        "status": "failed",
                        "error": str(e)
                    }

            # Compile final analysis
            compiled_analysis = self._compile_analysis_results(analysis_results, context)

            # Store analysis in database
            analysis_record = self._create_analysis_record(
                call_log_id, compiled_analysis, total_tokens, db
            )

            # Update call log
            call_log.analysis_status = "completed"
            call_log.sentiment = compiled_analysis.get('overall_sentiment')
            call_log.sentiment_score = compiled_analysis.get('sentiment_score')
            call_log.quality_score = compiled_analysis.get('overall_quality_score')
            call_log.escalation_risk = compiled_analysis.get('escalation_risk')

            db.commit()

            processing_time = time.time() - start_time
            logger.info(
                f"Analysis completed for call {call_log.rc_call_id} in {processing_time:.2f}s. "
                f"Tokens used: {total_tokens}"
            )

            return {
                "status": "success",
                "call_log_id": call_log_id,
                "rc_call_id": call_log.rc_call_id,
                "analysis_id": str(analysis_record.id),
                "modules_completed": list(analysis_results.keys()),
                "processing_time_seconds": processing_time,
                "tokens_used": total_tokens,
                "results": compiled_analysis
            }

        except Exception as e:
            # Update status to failed
            if 'call_log' in locals() and call_log:
                call_log.analysis_status = "failed"

                # Store error details
                metadata = call_log.metadata or {}
                metadata['analysis_error'] = {
                    'error': str(e),
                    'error_type': type(e).__name__,
                    'occurred_at': datetime.utcnow().isoformat(),
                    'processing_time': time.time() - start_time
                }
                call_log.metadata = metadata

                try:
                    db.commit()
                except Exception as commit_error:
                    logger.error(f"Failed to update call log after analysis error: {commit_error}")

            logger.error(f"Analysis failed for call {call_log_id}: {e}")
            raise CallAnalysisError(f"Analysis failed: {str(e)}") from e

    def _prepare_analysis_context(self, call_log: CallLog, transcript: CallTranscript) -> Dict[str, Any]:
        """Prepare context for AI analysis."""
        return {
            "call_log": {
                "rc_call_id": call_log.rc_call_id,
                "direction": call_log.direction,
                "duration_seconds": call_log.duration_seconds,
                "from_number": call_log.from_number,
                "to_number": call_log.to_number,
                "from_name": call_log.from_name,
                "to_name": call_log.to_name,
                "status": call_log.status,
                "has_recording": call_log.has_recording,
                "customer_id": call_log.customer_id,
                "contact_name": call_log.contact_name
            },
            "transcript": {
                "full_text": transcript.full_transcript,
                "word_count": transcript.word_count,
                "language": transcript.language,
                "duration_seconds": transcript.audio_duration_seconds,
                "segments": transcript.segments or []
            },
            "business_context": {
                "industry": "HVAC/Home Services",
                "call_center_type": "Customer Service & Sales",
                "typical_call_types": [
                    "Service scheduling",
                    "Technical support",
                    "Sales inquiries",
                    "Complaint resolution",
                    "Emergency calls"
                ]
            }
        }

    async def _run_analysis_module(self, module: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Run a specific analysis module."""
        module_handlers = {
            "sentiment_analysis": self._analyze_sentiment,
            "quality_scoring": self._analyze_quality,
            "escalation_assessment": self._assess_escalation,
            "topic_extraction": self._extract_topics,
            "coaching_insights": self._generate_coaching,
            "auto_disposition": self._predict_disposition
        }

        if module not in module_handlers:
            raise CallAnalysisError(f"Unknown analysis module: {module}")

        handler = module_handlers[module]
        return await handler(context)

    async def _analyze_sentiment(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze call sentiment and emotional trajectory."""
        prompt = f"""
Analyze the sentiment and emotional trajectory of this customer service call.

Call Details:
- Direction: {context['call_log']['direction']}
- Duration: {context['call_log']['duration_seconds']} seconds
- Customer: {context['call_log']['contact_name'] or 'Unknown'}

Transcript:
{context['transcript']['full_text']}

Please analyze:
1. Overall sentiment (positive/neutral/negative) and score (-100 to 100)
2. Customer sentiment vs agent sentiment
3. How sentiment changed during the call
4. Key emotional moments or turning points
5. Confidence level in your analysis (0-100)

Return analysis as JSON with this structure:
{{
    "overall_sentiment": "positive|neutral|negative",
    "sentiment_score": -100 to 100,
    "sentiment_confidence": 0 to 100,
    "customer_sentiment": "positive|neutral|negative",
    "agent_sentiment": "positive|neutral|negative",
    "sentiment_trajectory": ["initial", "middle", "end"],
    "emotional_peaks": [
        {{"time": "early|middle|late", "type": "positive|negative", "description": "brief description"}}
    ],
    "key_indicators": ["list", "of", "sentiment", "indicators"]
}}
"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert in call center sentiment analysis. Provide accurate, objective analysis of customer service interactions."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )

        try:
            result = json.loads(response.choices[0].message.content)
            result['tokens_used'] = response.usage.total_tokens
            result['model'] = self.model
            return result
        except json.JSONDecodeError as e:
            raise CallAnalysisError(f"Failed to parse sentiment analysis response: {e}")

    async def _analyze_quality(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze call quality and professional standards."""
        prompt = f"""
Analyze the quality of this customer service call based on professional standards.

Call Details:
- Direction: {context['call_log']['direction']}
- Duration: {context['call_log']['duration_seconds']} seconds
- Industry: {context['business_context']['industry']}

Transcript:
{context['transcript']['full_text']}

Rate the call on these dimensions (0-100 scale):
1. Overall quality score
2. Professionalism (courtesy, respect, appropriate language)
3. Empathy (understanding, compassion, active listening)
4. Clarity (clear communication, avoiding jargon)
5. Resolution (problem-solving effectiveness)
6. Efficiency (time management, staying on topic)

Also analyze:
- Agent talk ratio (estimate percentage of time agent spoke)
- Communication pace (slow/normal/fast/rushed)
- Any interruptions or dead air
- Specific strengths and weaknesses

Return analysis as JSON:
{{
    "overall_quality_score": 0 to 100,
    "quality_confidence": 0 to 100,
    "professionalism_score": 0 to 100,
    "empathy_score": 0 to 100,
    "clarity_score": 0 to 100,
    "resolution_score": 0 to 100,
    "efficiency_score": 0 to 100,
    "agent_talk_ratio": 0.0 to 1.0,
    "pace_rating": "slow|normal|fast|rushed",
    "interruption_count": number,
    "strengths": ["list", "of", "strengths"],
    "weaknesses": ["list", "of", "weaknesses"],
    "improvement_suggestions": ["specific", "actionable", "suggestions"]
}}
"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert call center quality analyst. Evaluate calls objectively based on industry best practices."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )

        try:
            result = json.loads(response.choices[0].message.content)
            result['tokens_used'] = response.usage.total_tokens
            return result
        except json.JSONDecodeError as e:
            raise CallAnalysisError(f"Failed to parse quality analysis response: {e}")

    async def _assess_escalation(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Assess escalation risk and customer satisfaction."""
        prompt = f"""
Assess the escalation risk and customer satisfaction for this service call.

Call Context:
- Direction: {context['call_log']['direction']}
- Status: {context['call_log']['status']}
- Duration: {context['call_log']['duration_seconds']} seconds

Transcript:
{context['transcript']['full_text']}

Analyze:
1. Escalation risk level (low/medium/high/critical)
2. Risk factors present
3. Predicted customer satisfaction (1-5 scale)
4. Whether follow-up is needed
5. Call outcome assessment

Return analysis as JSON:
{{
    "escalation_risk": "low|medium|high|critical",
    "escalation_score": 0 to 100,
    "escalation_indicators": ["list", "of", "risk", "factors"],
    "predicted_csat_score": 1 to 5,
    "csat_confidence": 0 to 100,
    "call_outcome": "resolved|pending|escalated|transferred",
    "resolution_type": "immediate|scheduled|follow_up_required",
    "next_action_required": true or false,
    "follow_up_needed": true or false,
    "urgency_level": "low|medium|high",
    "risk_mitigation": ["suggested", "actions"]
}}
"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert in customer escalation prediction and satisfaction assessment."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )

        try:
            result = json.loads(response.choices[0].message.content)
            result['tokens_used'] = response.usage.total_tokens
            return result
        except json.JSONDecodeError as e:
            raise CallAnalysisError(f"Failed to parse escalation analysis response: {e}")

    async def _extract_topics(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Extract topics, keywords, and entities from the call."""
        prompt = f"""
Extract topics, keywords, and key information from this service call.

Business Context: {context['business_context']['industry']}
Common Call Types: {', '.join(context['business_context']['typical_call_types'])}

Transcript:
{context['transcript']['full_text']}

Extract:
1. Primary topic/purpose of the call
2. All relevant topics discussed
3. Important keywords and phrases
4. Named entities (companies, products, locations)
5. Action items identified
6. Agent commitments made
7. Customer requests

Return as JSON:
{{
    "primary_topic": "main purpose of call",
    "topics": ["all", "topics", "discussed"],
    "keywords": ["important", "keywords"],
    "entities": {{
        "companies": ["company names"],
        "products": ["product names"],
        "locations": ["addresses", "cities"],
        "people": ["person names"],
        "other": ["other entities"]
    }},
    "action_items": ["action", "items", "identified"],
    "agent_commitments": ["promises", "made", "by agent"],
    "customer_requests": ["specific", "customer", "requests"],
    "technical_issues": ["technical", "problems", "mentioned"],
    "service_types": ["services", "discussed"]
}}
"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert information extraction specialist for customer service calls."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )

        try:
            result = json.loads(response.choices[0].message.content)
            result['tokens_used'] = response.usage.total_tokens
            return result
        except json.JSONDecodeError as e:
            raise CallAnalysisError(f"Failed to parse topic extraction response: {e}")

    async def _generate_coaching(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate coaching insights and recommendations."""
        prompt = f"""
Provide coaching insights for this customer service call.

Call Details:
- Agent handled: {context['call_log']['direction']} call
- Duration: {context['call_log']['duration_seconds']} seconds
- Industry: {context['business_context']['industry']}

Transcript:
{context['transcript']['full_text']}

Provide coaching analysis:
1. What the agent did well (strengths)
2. Areas for improvement
3. Specific coaching feedback
4. Training recommendations
5. Skill gaps identified
6. Overall coaching priority

Return as JSON:
{{
    "strengths": ["specific", "things", "done", "well"],
    "improvement_areas": ["areas", "needing", "work"],
    "coaching_priority": "low|medium|high",
    "specific_feedback": [
        {{"category": "communication", "feedback": "specific advice"}},
        {{"category": "technical", "feedback": "specific advice"}}
    ],
    "recommended_training": ["training", "modules"],
    "skill_gaps": ["identified", "skill", "gaps"],
    "recognition_worthy": ["achievements", "to", "recognize"],
    "development_focus": "primary area for development"
}}
"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert call center coach. Provide constructive, specific coaching feedback."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2
        )

        try:
            result = json.loads(response.choices[0].message.content)
            result['tokens_used'] = response.usage.total_tokens
            return result
        except json.JSONDecodeError as e:
            raise CallAnalysisError(f"Failed to parse coaching analysis response: {e}")

    async def _predict_disposition(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Predict the appropriate call disposition."""
        # This would integrate with the disposition engine
        # For now, return a basic prediction

        common_dispositions = [
            "Resolved - Customer Satisfied",
            "Follow-up Required",
            "Information Provided",
            "Escalation Required",
            "Customer Complaint",
            "Sale Made",
            "No Answer",
            "Not Interested"
        ]

        prompt = f"""
Based on this customer service call, predict the most appropriate call disposition.

Call Context:
- Direction: {context['call_log']['direction']}
- Status: {context['call_log']['status']}
- Duration: {context['call_log']['duration_seconds']} seconds

Available Dispositions: {', '.join(common_dispositions)}

Transcript:
{context['transcript']['full_text']}

Predict the best disposition and provide reasoning:

{{
    "predicted_disposition": "exact disposition name from list",
    "disposition_confidence": 0 to 100,
    "reasoning": ["factor1", "factor2", "factor3"],
    "alternative_dispositions": [
        {{"disposition": "name", "confidence": 0 to 100, "reason": "why this could apply"}}
    ],
    "auto_apply_recommendation": "apply|suggest|manual",
    "confidence_factors": {{
        "sentiment_clarity": 0 to 100,
        "outcome_clarity": 0 to 100,
        "resolution_status": 0 to 100
    }}
}}
"""

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert at categorizing customer service call outcomes."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )

        try:
            result = json.loads(response.choices[0].message.content)
            result['tokens_used'] = response.usage.total_tokens
            return result
        except json.JSONDecodeError as e:
            raise CallAnalysisError(f"Failed to parse disposition prediction response: {e}")

    def _compile_analysis_results(self, analysis_results: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Compile all analysis module results into a final analysis."""
        compiled = {
            "analysis_version": self.analysis_version,
            "model_used": self.model,
            "analysis_modules": list(analysis_results.keys())
        }

        # Extract sentiment data
        sentiment = analysis_results.get("sentiment_analysis", {})
        compiled.update({
            "overall_sentiment": sentiment.get("overall_sentiment"),
            "sentiment_score": sentiment.get("sentiment_score"),
            "sentiment_confidence": sentiment.get("sentiment_confidence"),
            "customer_sentiment": sentiment.get("customer_sentiment"),
            "agent_sentiment": sentiment.get("agent_sentiment"),
            "sentiment_trajectory": sentiment.get("sentiment_trajectory"),
            "emotional_peaks": sentiment.get("emotional_peaks")
        })

        # Extract quality data
        quality = analysis_results.get("quality_scoring", {})
        compiled.update({
            "overall_quality_score": quality.get("overall_quality_score"),
            "quality_confidence": quality.get("quality_confidence"),
            "professionalism_score": quality.get("professionalism_score"),
            "empathy_score": quality.get("empathy_score"),
            "clarity_score": quality.get("clarity_score"),
            "resolution_score": quality.get("resolution_score"),
            "efficiency_score": quality.get("efficiency_score"),
            "agent_talk_ratio": quality.get("agent_talk_ratio"),
            "pace_rating": quality.get("pace_rating"),
            "interruption_count": quality.get("interruption_count")
        })

        # Extract escalation data
        escalation = analysis_results.get("escalation_assessment", {})
        compiled.update({
            "escalation_risk": escalation.get("escalation_risk"),
            "escalation_score": escalation.get("escalation_score"),
            "escalation_indicators": escalation.get("escalation_indicators"),
            "predicted_csat_score": escalation.get("predicted_csat_score"),
            "csat_confidence": escalation.get("csat_confidence"),
            "call_outcome": escalation.get("call_outcome"),
            "resolution_type": escalation.get("resolution_type"),
            "next_action_required": escalation.get("next_action_required"),
            "follow_up_needed": escalation.get("follow_up_needed")
        })

        # Extract topic data
        topics = analysis_results.get("topic_extraction", {})
        compiled.update({
            "primary_topic": topics.get("primary_topic"),
            "topics": topics.get("topics"),
            "keywords": topics.get("keywords"),
            "entities": topics.get("entities"),
            "action_items": topics.get("action_items"),
            "agent_commitments": topics.get("agent_commitments"),
            "customer_requests": topics.get("customer_requests")
        })

        # Extract coaching data
        coaching = analysis_results.get("coaching_insights", {})
        compiled.update({
            "strengths": coaching.get("strengths"),
            "improvement_areas": coaching.get("improvement_areas"),
            "coaching_priority": coaching.get("coaching_priority"),
            "specific_feedback": coaching.get("specific_feedback"),
            "recommended_training": coaching.get("recommended_training"),
            "skill_gaps": coaching.get("skill_gaps")
        })

        # Extract disposition data
        disposition = analysis_results.get("auto_disposition", {})
        compiled.update({
            "predicted_disposition": disposition.get("predicted_disposition"),
            "disposition_confidence": disposition.get("disposition_confidence"),
            "disposition_reasoning": disposition.get("reasoning"),
            "alternative_dispositions": disposition.get("alternative_dispositions")
        })

        # Store raw results for debugging
        compiled["raw_analysis_response"] = analysis_results

        return compiled

    def _create_analysis_record(
        self,
        call_log_id: str,
        analysis_data: Dict[str, Any],
        tokens_used: int,
        db: Session
    ) -> CallAnalysis:
        """Create and store the analysis record in the database."""
        analysis = CallAnalysis(
            call_log_id=call_log_id,

            # Sentiment data
            overall_sentiment=analysis_data.get("overall_sentiment"),
            sentiment_score=analysis_data.get("sentiment_score"),
            sentiment_confidence=analysis_data.get("sentiment_confidence"),
            customer_sentiment=analysis_data.get("customer_sentiment"),
            agent_sentiment=analysis_data.get("agent_sentiment"),
            sentiment_trajectory=analysis_data.get("sentiment_trajectory"),
            emotional_peaks=analysis_data.get("emotional_peaks"),

            # Quality data
            overall_quality_score=analysis_data.get("overall_quality_score"),
            quality_confidence=analysis_data.get("quality_confidence"),
            professionalism_score=analysis_data.get("professionalism_score"),
            empathy_score=analysis_data.get("empathy_score"),
            clarity_score=analysis_data.get("clarity_score"),
            resolution_score=analysis_data.get("resolution_score"),
            efficiency_score=analysis_data.get("efficiency_score"),
            agent_talk_ratio=analysis_data.get("agent_talk_ratio"),
            pace_rating=analysis_data.get("pace_rating"),
            interruption_count=analysis_data.get("interruption_count"),

            # Escalation data
            escalation_risk=analysis_data.get("escalation_risk"),
            escalation_score=analysis_data.get("escalation_score"),
            escalation_indicators=analysis_data.get("escalation_indicators"),
            predicted_csat_score=analysis_data.get("predicted_csat_score"),
            csat_confidence=analysis_data.get("csat_confidence"),
            call_outcome=analysis_data.get("call_outcome"),
            resolution_type=analysis_data.get("resolution_type"),
            next_action_required=analysis_data.get("next_action_required"),
            follow_up_needed=analysis_data.get("follow_up_needed"),

            # Topic data
            primary_topic=analysis_data.get("primary_topic"),
            topics=analysis_data.get("topics"),
            keywords=analysis_data.get("keywords"),
            entities=analysis_data.get("entities"),
            action_items=analysis_data.get("action_items"),
            agent_commitments=analysis_data.get("agent_commitments"),
            customer_requests=analysis_data.get("customer_requests"),

            # Disposition data
            predicted_disposition=analysis_data.get("predicted_disposition"),
            disposition_confidence=analysis_data.get("disposition_confidence"),
            disposition_reasoning=analysis_data.get("disposition_reasoning"),
            alternative_dispositions=analysis_data.get("alternative_dispositions"),

            # Coaching data
            strengths=analysis_data.get("strengths"),
            improvement_areas=analysis_data.get("improvement_areas"),
            coaching_priority=analysis_data.get("coaching_priority"),
            specific_feedback=analysis_data.get("specific_feedback"),
            recommended_training=analysis_data.get("recommended_training"),
            skill_gaps=analysis_data.get("skill_gaps"),

            # Processing metadata
            analysis_model=analysis_data.get("model_used", self.model),
            analysis_version=analysis_data.get("analysis_version", self.analysis_version),
            tokens_used=tokens_used,
            raw_analysis_response=analysis_data.get("raw_analysis_response"),
            status="completed"
        )

        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        return analysis