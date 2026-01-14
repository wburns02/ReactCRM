"""
Auto-disposition decision engine with confidence scoring.
Implements intelligent call disposition automation with configurable business rules.
"""

import logging
import json
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.config import settings
from app.models.ringcentral import CallLog, CallDisposition, CallDispositionHistory
from app.models.call_analysis import CallAnalysis
from app.database.base_class import get_db

logger = logging.getLogger(__name__)


class DispositionEngineError(Exception):
    """Custom exception for disposition engine errors."""
    pass


class CallDispositionEngine:
    """
    Intelligent call disposition engine with confidence-based automation.
    Implements multi-factor scoring and business rule evaluation.
    """

    def __init__(self):
        """Initialize disposition engine with configuration."""
        self.auto_apply_threshold = settings.AUTO_APPLY_CONFIDENCE_THRESHOLD
        self.suggest_threshold = settings.SUGGEST_CONFIDENCE_THRESHOLD

        # Multi-factor scoring weights (must sum to 100)
        self.scoring_weights = {
            "sentiment": 40,      # Sentiment analysis score
            "quality": 25,        # Call quality metrics
            "escalation": 20,     # Escalation risk factors
            "call_characteristics": 15  # Duration, status, etc.
        }

        # Confidence boost/penalty factors
        self.confidence_modifiers = {
            "high_quality_transcription": 5,    # Clear, long transcription
            "short_call": -10,                  # Very short calls
            "multiple_topics": -5,              # Complex multi-topic calls
            "technical_issues": -8,             # Technical problems mentioned
            "policy_violations": -15,           # Compliance issues detected
            "customer_escalation": -20,         # Customer asking for supervisor
        }

    async def evaluate_disposition(
        self,
        call_log_id: str,
        force_evaluation: bool = False,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Evaluate call disposition and determine auto-apply decision.

        Args:
            call_log_id: UUID of the call log
            force_evaluation: Force re-evaluation even if already processed
            db: Database session (optional)

        Returns:
            Dict with disposition decision and confidence scoring

        Raises:
            DispositionEngineError: If evaluation fails
        """
        if db is None:
            db = next(get_db())

        try:
            # Get call log and analysis
            call_log = db.query(CallLog).filter(CallLog.id == call_log_id).first()
            if not call_log:
                raise DispositionEngineError(f"Call log {call_log_id} not found")

            analysis = db.query(CallAnalysis).filter(
                CallAnalysis.call_log_id == call_log_id
            ).first()

            if not analysis:
                logger.warning(f"No analysis found for call {call_log_id} - using basic disposition logic")
                return await self._evaluate_without_analysis(call_log, db)

            logger.info(f"Evaluating disposition for call {call_log.rc_call_id}")

            # Check if already processed
            if call_log.disposition_status in ["auto_applied", "manual"] and not force_evaluation:
                return {
                    "status": "already_processed",
                    "current_disposition": call_log.disposition.name if call_log.disposition else None,
                    "confidence": call_log.disposition_confidence,
                    "applied_by": call_log.disposition_applied_by
                }

            # Get available dispositions
            available_dispositions = db.query(CallDisposition).filter(
                CallDisposition.is_active == True
            ).order_by(CallDisposition.priority, CallDisposition.display_order).all()

            if not available_dispositions:
                raise DispositionEngineError("No active dispositions found")

            # Run multi-factor scoring
            disposition_scores = {}
            confidence_factors = {}

            for disposition in available_dispositions:
                score, factors = await self._calculate_disposition_score(
                    disposition, call_log, analysis
                )
                disposition_scores[disposition.id] = {
                    "disposition": disposition,
                    "score": score,
                    "factors": factors
                }

            # Find best disposition
            best_disposition_id = max(disposition_scores.keys(), key=lambda x: disposition_scores[x]["score"])
            best_match = disposition_scores[best_disposition_id]

            # Calculate final confidence with modifiers
            base_confidence = best_match["score"]
            confidence_modifiers = self._calculate_confidence_modifiers(call_log, analysis)
            final_confidence = min(100, max(0, base_confidence + sum(confidence_modifiers.values())))

            # Determine action based on confidence
            action_decision = self._determine_action(final_confidence)

            # Prepare result
            result = {
                "status": "evaluated",
                "call_log_id": call_log_id,
                "rc_call_id": call_log.rc_call_id,
                "recommended_disposition": {
                    "id": str(best_match["disposition"].id),
                    "name": best_match["disposition"].name,
                    "category": best_match["disposition"].category,
                    "color": best_match["disposition"].color
                },
                "confidence": final_confidence,
                "base_confidence": base_confidence,
                "confidence_modifiers": confidence_modifiers,
                "action": action_decision["action"],
                "reasoning": {
                    "primary_factors": best_match["factors"],
                    "scoring_breakdown": {
                        "sentiment_score": self._get_sentiment_contribution(analysis),
                        "quality_score": self._get_quality_contribution(analysis),
                        "escalation_score": self._get_escalation_contribution(analysis),
                        "call_characteristics_score": self._get_call_characteristics_contribution(call_log)
                    },
                    "decision_rationale": action_decision["rationale"]
                },
                "alternatives": [
                    {
                        "disposition_name": scores["disposition"].name,
                        "score": scores["score"],
                        "category": scores["disposition"].category
                    }
                    for disp_id, scores in sorted(
                        disposition_scores.items(),
                        key=lambda x: x[1]["score"],
                        reverse=True
                    )[:3]  # Top 3 alternatives
                ],
                "evaluation_metadata": {
                    "engine_version": "1.0",
                    "evaluated_at": datetime.utcnow().isoformat(),
                    "auto_apply_threshold": self.auto_apply_threshold,
                    "suggest_threshold": self.suggest_threshold,
                    "dispositions_evaluated": len(available_dispositions)
                }
            }

            # Execute action if auto-apply or suggest
            if action_decision["action"] == "auto_apply":
                apply_result = await self._auto_apply_disposition(
                    call_log, best_match["disposition"], final_confidence, result, db
                )
                result.update(apply_result)
            elif action_decision["action"] == "suggest":
                suggest_result = await self._suggest_disposition(
                    call_log, best_match["disposition"], final_confidence, result, db
                )
                result.update(suggest_result)
            else:  # manual_required
                manual_result = await self._flag_for_manual_review(
                    call_log, result, db
                )
                result.update(manual_result)

            logger.info(
                f"Disposition evaluation completed for call {call_log.rc_call_id}: "
                f"{action_decision['action']} {best_match['disposition'].name} "
                f"({final_confidence}% confidence)"
            )

            return result

        except Exception as e:
            logger.error(f"Disposition evaluation failed for call {call_log_id}: {e}")
            raise DispositionEngineError(f"Disposition evaluation failed: {str(e)}") from e

    async def _calculate_disposition_score(
        self,
        disposition: CallDisposition,
        call_log: CallLog,
        analysis: CallAnalysis
    ) -> Tuple[float, Dict[str, Any]]:
        """Calculate compatibility score between call and disposition."""
        total_score = 0.0
        factors = {}

        # 1. Sentiment Factor (40% weight)
        sentiment_score = self._score_sentiment_match(disposition, analysis)
        total_score += sentiment_score * (self.scoring_weights["sentiment"] / 100)
        factors["sentiment"] = {
            "score": sentiment_score,
            "weight": self.scoring_weights["sentiment"],
            "contribution": sentiment_score * (self.scoring_weights["sentiment"] / 100),
            "details": f"Disposition category '{disposition.category}' vs call sentiment '{analysis.overall_sentiment}'"
        }

        # 2. Quality Factor (25% weight)
        quality_score = self._score_quality_match(disposition, analysis)
        total_score += quality_score * (self.scoring_weights["quality"] / 100)
        factors["quality"] = {
            "score": quality_score,
            "weight": self.scoring_weights["quality"],
            "contribution": quality_score * (self.scoring_weights["quality"] / 100),
            "details": f"Quality score {analysis.overall_quality_score} matches disposition expectations"
        }

        # 3. Escalation Risk Factor (20% weight)
        escalation_score = self._score_escalation_match(disposition, analysis)
        total_score += escalation_score * (self.scoring_weights["escalation"] / 100)
        factors["escalation"] = {
            "score": escalation_score,
            "weight": self.scoring_weights["escalation"],
            "contribution": escalation_score * (self.scoring_weights["escalation"] / 100),
            "details": f"Escalation risk '{analysis.escalation_risk}' compatibility"
        }

        # 4. Call Characteristics Factor (15% weight)
        characteristics_score = self._score_call_characteristics(disposition, call_log, analysis)
        total_score += characteristics_score * (self.scoring_weights["call_characteristics"] / 100)
        factors["call_characteristics"] = {
            "score": characteristics_score,
            "weight": self.scoring_weights["call_characteristics"],
            "contribution": characteristics_score * (self.scoring_weights["call_characteristics"] / 100),
            "details": f"Call duration {call_log.duration_seconds}s, direction {call_log.direction}"
        }

        # 5. Auto-apply conditions check
        if disposition.auto_apply_enabled and disposition.auto_apply_conditions:
            conditions_score = self._evaluate_auto_apply_conditions(disposition, call_log, analysis)
            if conditions_score > 0:
                total_score += disposition.confidence_boost or 0
                factors["auto_apply_boost"] = {
                    "score": conditions_score,
                    "boost": disposition.confidence_boost or 0,
                    "details": "Auto-apply conditions met, confidence boost applied"
                }

        return total_score, factors

    def _score_sentiment_match(self, disposition: CallDisposition, analysis: CallAnalysis) -> float:
        """Score how well disposition category matches call sentiment."""
        if not analysis.overall_sentiment:
            return 50.0  # Neutral score for missing sentiment

        disposition_category = disposition.category.lower()
        call_sentiment = analysis.overall_sentiment.lower()
        sentiment_score = analysis.sentiment_score or 0

        # Category-sentiment compatibility matrix
        compatibility = {
            ("positive", "positive"): 95,
            ("positive", "neutral"): 70 + (sentiment_score * 0.3) if sentiment_score > 0 else 60,
            ("positive", "negative"): 20,
            ("neutral", "positive"): 75,
            ("neutral", "neutral"): 90,
            ("neutral", "negative"): 75,
            ("negative", "positive"): 25,
            ("negative", "neutral"): 70 - (abs(sentiment_score) * 0.2) if sentiment_score < 0 else 60,
            ("negative", "negative"): 95
        }

        return compatibility.get((disposition_category, call_sentiment), 50.0)

    def _score_quality_match(self, disposition: CallDisposition, analysis: CallAnalysis) -> float:
        """Score disposition based on call quality metrics."""
        if not analysis.overall_quality_score:
            return 70.0  # Default score for missing quality data

        quality = analysis.overall_quality_score
        disposition_category = disposition.category.lower()

        # Quality expectations by disposition category
        if disposition_category == "positive":
            # Positive dispositions expect higher quality
            if quality >= 80:
                return 95.0
            elif quality >= 60:
                return 75.0
            else:
                return 40.0
        elif disposition_category == "negative":
            # Negative dispositions can have lower quality
            if quality <= 40:
                return 90.0
            elif quality <= 60:
                return 75.0
            else:
                return 60.0
        else:  # neutral
            # Neutral dispositions are quality-agnostic
            return 80.0

    def _score_escalation_match(self, disposition: CallDisposition, analysis: CallAnalysis) -> float:
        """Score disposition based on escalation risk factors."""
        if not analysis.escalation_risk:
            return 70.0  # Default for missing escalation data

        escalation = analysis.escalation_risk.lower()
        disposition_name = disposition.name.lower()

        # High escalation risk indicators
        if escalation in ["high", "critical"]:
            if "escalation" in disposition_name or "complaint" in disposition_name:
                return 95.0
            elif "resolved" in disposition_name or "satisfied" in disposition_name:
                return 20.0
            else:
                return 60.0

        # Low escalation risk
        elif escalation == "low":
            if "resolved" in disposition_name or "satisfied" in disposition_name:
                return 90.0
            elif "escalation" in disposition_name:
                return 30.0
            else:
                return 75.0

        # Medium escalation risk
        else:
            if "follow" in disposition_name or "information" in disposition_name:
                return 85.0
            else:
                return 70.0

    def _score_call_characteristics(self, disposition: CallDisposition, call_log: CallLog, analysis: CallAnalysis) -> float:
        """Score based on call duration, direction, and other characteristics."""
        score = 70.0  # Base score
        disposition_name = disposition.name.lower()

        # Duration-based scoring
        duration = call_log.duration_seconds or 0

        if duration < 30:
            # Very short calls
            if "no answer" in disposition_name or "not interested" in disposition_name:
                score += 20
            elif "resolved" in disposition_name:
                score -= 20
        elif duration > 300:  # 5+ minutes
            # Longer calls often indicate resolution or complex issues
            if "resolved" in disposition_name or "information" in disposition_name:
                score += 15
            elif "no answer" in disposition_name:
                score -= 25

        # Direction-based scoring
        if call_log.direction == "outbound":
            if "sale" in disposition_name or "not interested" in disposition_name:
                score += 10
        else:  # inbound
            if "complaint" in disposition_name or "escalation" in disposition_name:
                score += 10

        # Recording availability
        if not call_log.has_recording:
            if "no answer" in disposition_name:
                score += 15
            else:
                score -= 10

        return min(100.0, max(0.0, score))

    def _evaluate_auto_apply_conditions(self, disposition: CallDisposition, call_log: CallLog, analysis: CallAnalysis) -> float:
        """Evaluate custom auto-apply conditions for disposition."""
        if not disposition.auto_apply_conditions:
            return 0.0

        try:
            conditions = disposition.auto_apply_conditions
            matches = 0
            total_conditions = 0

            # Sentiment conditions
            if "sentiment_score" in conditions:
                total_conditions += 1
                required_score = conditions["sentiment_score"]
                actual_score = analysis.sentiment_score or 0
                if actual_score >= required_score:
                    matches += 1

            # Quality conditions
            if "quality_score" in conditions:
                total_conditions += 1
                required_score = conditions["quality_score"]
                actual_score = analysis.overall_quality_score or 0
                if actual_score >= required_score:
                    matches += 1

            # Keyword conditions
            if "keywords" in conditions and analysis.keywords:
                total_conditions += 1
                required_keywords = [kw.lower() for kw in conditions["keywords"]]
                call_keywords = [kw.lower() for kw in analysis.keywords]
                if any(kw in call_keywords for kw in required_keywords):
                    matches += 1

            # Escalation conditions
            if "escalation_risk" in conditions:
                total_conditions += 1
                required_risk = conditions["escalation_risk"].lower()
                actual_risk = (analysis.escalation_risk or "").lower()
                if actual_risk == required_risk:
                    matches += 1

            # Duration conditions
            if "duration_max_seconds" in conditions:
                total_conditions += 1
                max_duration = conditions["duration_max_seconds"]
                actual_duration = call_log.duration_seconds or 0
                if actual_duration <= max_duration:
                    matches += 1

            if "duration_min_seconds" in conditions:
                total_conditions += 1
                min_duration = conditions["duration_min_seconds"]
                actual_duration = call_log.duration_seconds or 0
                if actual_duration >= min_duration:
                    matches += 1

            # Calculate match percentage
            if total_conditions > 0:
                match_percentage = (matches / total_conditions) * 100
                return match_percentage if match_percentage >= 80 else 0  # Require 80%+ match
            else:
                return 0.0

        except Exception as e:
            logger.warning(f"Error evaluating auto-apply conditions for disposition {disposition.name}: {e}")
            return 0.0

    def _calculate_confidence_modifiers(self, call_log: CallLog, analysis: CallAnalysis) -> Dict[str, float]:
        """Calculate confidence modifiers based on call characteristics."""
        modifiers = {}

        # High-quality transcription boost
        if (call_log.transcript and
            call_log.transcript.word_count > 50 and
            (call_log.transcript.confidence_score or 0) > 0.8):
            modifiers["high_quality_transcription"] = self.confidence_modifiers["high_quality_transcription"]

        # Short call penalty
        if (call_log.duration_seconds or 0) < 30:
            modifiers["short_call"] = self.confidence_modifiers["short_call"]

        # Multiple topics complexity penalty
        if analysis.topics and len(analysis.topics) > 3:
            modifiers["multiple_topics"] = self.confidence_modifiers["multiple_topics"]

        # Technical issues mentioned
        if (analysis.keywords and
            any(keyword.lower() in ["error", "broken", "not working", "technical", "system"]
                for keyword in analysis.keywords)):
            modifiers["technical_issues"] = self.confidence_modifiers["technical_issues"]

        # Policy violations detected
        if analysis.policy_violations and len(analysis.policy_violations) > 0:
            modifiers["policy_violations"] = self.confidence_modifiers["policy_violations"]

        # Customer escalation indicators
        if (analysis.escalation_risk in ["high", "critical"] or
            (analysis.keywords and any(keyword.lower() in ["manager", "supervisor", "escalate"]
                                     for keyword in analysis.keywords))):
            modifiers["customer_escalation"] = self.confidence_modifiers["customer_escalation"]

        return modifiers

    def _determine_action(self, confidence: float) -> Dict[str, Any]:
        """Determine what action to take based on confidence score."""
        if confidence >= self.auto_apply_threshold:
            return {
                "action": "auto_apply",
                "rationale": f"High confidence ({confidence}%) meets auto-apply threshold ({self.auto_apply_threshold}%)"
            }
        elif confidence >= self.suggest_threshold:
            return {
                "action": "suggest",
                "rationale": f"Medium confidence ({confidence}%) suggests disposition for manual review"
            }
        else:
            return {
                "action": "manual_required",
                "rationale": f"Low confidence ({confidence}%) requires manual disposition"
            }

    async def _auto_apply_disposition(
        self,
        call_log: CallLog,
        disposition: CallDisposition,
        confidence: float,
        evaluation_result: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Automatically apply disposition with high confidence."""
        try:
            # Store previous disposition if any
            previous_disposition_id = call_log.disposition_id

            # Update call log
            call_log.disposition_id = disposition.id
            call_log.disposition_confidence = confidence
            call_log.disposition_applied_by = "auto_applied"
            call_log.disposition_applied_at = datetime.utcnow()
            call_log.disposition_status = "auto_applied"

            # Create disposition history record
            history = CallDispositionHistory(
                call_log_id=call_log.id,
                disposition_id=disposition.id,
                previous_disposition_id=previous_disposition_id,
                action_type="auto_applied",
                applied_by_type="system",
                disposition_name=disposition.name,
                confidence_score=confidence,
                reasoning=evaluation_result.get("reasoning"),
                alternative_suggestions=evaluation_result.get("alternatives"),
                applied_at=datetime.utcnow()
            )

            # Update disposition usage analytics
            disposition.usage_count += 1

            db.add(history)
            db.commit()

            logger.info(f"Auto-applied disposition '{disposition.name}' to call {call_log.rc_call_id}")

            return {
                "applied": True,
                "disposition_id": str(disposition.id),
                "history_id": str(history.id),
                "applied_at": history.applied_at.isoformat()
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to auto-apply disposition: {e}")
            raise DispositionEngineError(f"Auto-apply failed: {str(e)}")

    async def _suggest_disposition(
        self,
        call_log: CallLog,
        disposition: CallDisposition,
        confidence: float,
        evaluation_result: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Suggest disposition for manual review."""
        try:
            # Store suggestion in call log metadata
            metadata = call_log.metadata or {}
            metadata["suggested_disposition"] = {
                "disposition_id": str(disposition.id),
                "disposition_name": disposition.name,
                "confidence": confidence,
                "reasoning": evaluation_result.get("reasoning"),
                "alternatives": evaluation_result.get("alternatives"),
                "suggested_at": datetime.utcnow().isoformat(),
                "requires_review": True
            }
            call_log.metadata = metadata
            call_log.disposition_status = "suggested"

            db.commit()

            logger.info(f"Suggested disposition '{disposition.name}' for call {call_log.rc_call_id}")

            return {
                "suggested": True,
                "suggestion_stored": True,
                "requires_review": True
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to suggest disposition: {e}")
            raise DispositionEngineError(f"Suggestion failed: {str(e)}")

    async def _flag_for_manual_review(
        self,
        call_log: CallLog,
        evaluation_result: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Flag call for manual disposition review."""
        try:
            # Store evaluation results for manual review
            metadata = call_log.metadata or {}
            metadata["manual_review_required"] = {
                "reason": "Low confidence in auto-disposition",
                "evaluation_results": evaluation_result,
                "flagged_at": datetime.utcnow().isoformat(),
                "priority": "high" if evaluation_result.get("confidence", 0) < 30 else "medium"
            }
            call_log.metadata = metadata
            call_log.disposition_status = "manual_required"

            db.commit()

            logger.info(f"Flagged call {call_log.rc_call_id} for manual disposition review")

            return {
                "manual_required": True,
                "flagged": True,
                "review_priority": metadata["manual_review_required"]["priority"]
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to flag for manual review: {e}")
            raise DispositionEngineError(f"Manual flagging failed: {str(e)}")

    async def _evaluate_without_analysis(self, call_log: CallLog, db: Session) -> Dict[str, Any]:
        """Basic disposition evaluation when AI analysis is not available."""
        logger.info(f"Using basic disposition logic for call {call_log.rc_call_id}")

        # Simple rule-based disposition based on call metadata
        basic_disposition_name = None
        confidence = 85.0

        if call_log.status == "No Answer" or (call_log.duration_seconds or 0) < 10:
            basic_disposition_name = "No Answer"
            confidence = 95.0
        elif call_log.status == "Completed" and (call_log.duration_seconds or 0) > 60:
            basic_disposition_name = "Information Provided"
            confidence = 70.0
        elif call_log.direction == "outbound" and (call_log.duration_seconds or 0) < 60:
            basic_disposition_name = "Not Interested"
            confidence = 65.0

        if basic_disposition_name:
            # Find disposition by name
            disposition = db.query(CallDisposition).filter(
                CallDisposition.name == basic_disposition_name,
                CallDisposition.is_active == True
            ).first()

            if disposition and confidence >= self.auto_apply_threshold:
                # Auto-apply basic disposition
                call_log.disposition_id = disposition.id
                call_log.disposition_confidence = confidence
                call_log.disposition_applied_by = "auto_applied_basic"
                call_log.disposition_applied_at = datetime.utcnow()
                call_log.disposition_status = "auto_applied"

                # Create history record
                history = CallDispositionHistory(
                    call_log_id=call_log.id,
                    disposition_id=disposition.id,
                    action_type="auto_applied",
                    applied_by_type="system",
                    disposition_name=disposition.name,
                    confidence_score=confidence,
                    reasoning={"factors": ["basic_call_metadata"], "method": "rule_based"},
                    applied_at=datetime.utcnow()
                )

                db.add(history)
                db.commit()

                return {
                    "status": "auto_applied_basic",
                    "disposition": basic_disposition_name,
                    "confidence": confidence,
                    "method": "rule_based",
                    "applied": True
                }

        # Default to manual review
        call_log.disposition_status = "manual_required"
        db.commit()

        return {
            "status": "manual_required",
            "reason": "No AI analysis available and no clear rule match",
            "method": "fallback"
        }

    def _get_sentiment_contribution(self, analysis: CallAnalysis) -> Dict[str, Any]:
        """Get sentiment scoring contribution details."""
        return {
            "sentiment": analysis.overall_sentiment,
            "score": analysis.sentiment_score,
            "confidence": analysis.sentiment_confidence,
            "weight_percent": self.scoring_weights["sentiment"]
        }

    def _get_quality_contribution(self, analysis: CallAnalysis) -> Dict[str, Any]:
        """Get quality scoring contribution details."""
        return {
            "overall_score": analysis.overall_quality_score,
            "professionalism": analysis.professionalism_score,
            "empathy": analysis.empathy_score,
            "clarity": analysis.clarity_score,
            "resolution": analysis.resolution_score,
            "weight_percent": self.scoring_weights["quality"]
        }

    def _get_escalation_contribution(self, analysis: CallAnalysis) -> Dict[str, Any]:
        """Get escalation scoring contribution details."""
        return {
            "risk_level": analysis.escalation_risk,
            "score": analysis.escalation_score,
            "predicted_csat": analysis.predicted_csat_score,
            "weight_percent": self.scoring_weights["escalation"]
        }

    def _get_call_characteristics_contribution(self, call_log: CallLog) -> Dict[str, Any]:
        """Get call characteristics scoring contribution details."""
        return {
            "duration_seconds": call_log.duration_seconds,
            "direction": call_log.direction,
            "status": call_log.status,
            "has_recording": call_log.has_recording,
            "weight_percent": self.scoring_weights["call_characteristics"]
        }