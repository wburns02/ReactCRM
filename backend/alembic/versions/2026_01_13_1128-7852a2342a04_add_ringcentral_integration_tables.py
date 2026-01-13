"""Add RingCentral integration tables

Revision ID: 7852a2342a04
Revises: 
Create Date: 2026-01-13 11:28:48.646392

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7852a2342a04'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ===== CREATE RC_ACCOUNTS TABLE =====
    op.create_table(
        'rc_accounts',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('user_id', sa.String(255), nullable=False, index=True, unique=True),
        sa.Column('access_token', sa.Text, nullable=True),
        sa.Column('refresh_token', sa.Text, nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('account_id', sa.String(255), nullable=True),
        sa.Column('extension_id', sa.String(255), nullable=True),
        sa.Column('extension_number', sa.String(50), nullable=True),
        sa.Column('account_name', sa.String(255), nullable=True),
        sa.Column('user_name', sa.String(255), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('is_connected', sa.Boolean, nullable=False, default=False),
        sa.Column('is_active', sa.Boolean, nullable=False, default=True),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_error', sa.Text, nullable=True),
        sa.Column('webhook_subscription_id', sa.String(255), nullable=True),
        sa.Column('webhook_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('webhook_delivery_mode', sa.String(50), nullable=True, default='WebHook'),
        sa.Column('auto_sync_enabled', sa.Boolean, nullable=True, default=True),
        sa.Column('sync_interval_minutes', sa.Integer, nullable=True, default=60),
        sa.Column('download_recordings', sa.Boolean, nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now(), onupdate=sa.func.now())
    )

    # ===== CREATE CALL_DISPOSITIONS TABLE =====
    op.create_table(
        'call_dispositions',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('color', sa.String(7), nullable=True, default='#6B7280'),
        sa.Column('auto_apply_enabled', sa.Boolean, nullable=True, default=False),
        sa.Column('auto_apply_conditions', sa.JSON, nullable=True),
        sa.Column('confidence_boost', sa.Integer, nullable=True, default=0),
        sa.Column('priority', sa.Integer, nullable=True, default=100),
        sa.Column('is_active', sa.Boolean, nullable=True, default=True),
        sa.Column('is_default', sa.Boolean, nullable=True, default=False),
        sa.Column('display_order', sa.Integer, nullable=True, default=100),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('usage_count', sa.Integer, nullable=True, default=0),
        sa.Column('auto_apply_success_rate', sa.Float, nullable=True, default=0.0),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now(), onupdate=sa.func.now())
    )

    # ===== CREATE CALL_LOGS TABLE =====
    op.create_table(
        'call_logs',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('rc_account_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('user_id', sa.String(255), nullable=False, index=True),
        sa.Column('rc_call_id', sa.String(255), nullable=False, index=True, unique=True),
        sa.Column('rc_session_id', sa.String(255), nullable=True, index=True),
        sa.Column('from_number', sa.String(50), nullable=False),
        sa.Column('to_number', sa.String(50), nullable=False),
        sa.Column('from_name', sa.String(255), nullable=True),
        sa.Column('to_name', sa.String(255), nullable=True),
        sa.Column('direction', sa.String(20), nullable=False, index=True),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('result', sa.String(50), nullable=True),
        sa.Column('call_type', sa.String(50), nullable=True),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=True, index=True),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_seconds', sa.Integer, nullable=True),
        sa.Column('ring_duration_seconds', sa.Integer, nullable=True),
        sa.Column('has_recording', sa.Boolean, nullable=False, default=False),
        sa.Column('recording_id', sa.String(255), nullable=True),
        sa.Column('recording_url', sa.Text, nullable=True),
        sa.Column('recording_content_uri', sa.Text, nullable=True),
        sa.Column('recording_downloaded', sa.Boolean, nullable=True, default=False),
        sa.Column('recording_file_path', sa.Text, nullable=True),
        sa.Column('recording_duration_seconds', sa.Integer, nullable=True),
        sa.Column('recording_file_size_bytes', sa.Integer, nullable=True),
        sa.Column('transcription_status', sa.String(20), nullable=True, default='pending'),
        sa.Column('analysis_status', sa.String(20), nullable=True, default='pending'),
        sa.Column('disposition_status', sa.String(20), nullable=True, default='pending'),
        sa.Column('transcription', sa.Text, nullable=True),
        sa.Column('ai_summary', sa.Text, nullable=True),
        sa.Column('sentiment', sa.String(20), nullable=True),
        sa.Column('sentiment_score', sa.Float, nullable=True),
        sa.Column('quality_score', sa.Integer, nullable=True),
        sa.Column('escalation_risk', sa.String(20), nullable=True),
        sa.Column('customer_id', sa.String(255), nullable=True, index=True),
        sa.Column('prospect_id', sa.String(255), nullable=True, index=True),
        sa.Column('contact_name', sa.String(255), nullable=True),
        sa.Column('work_order_id', sa.String(255), nullable=True),
        sa.Column('ticket_id', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('disposition_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('disposition_confidence', sa.Float, nullable=True),
        sa.Column('disposition_applied_by', sa.String(20), nullable=True, default='manual'),
        sa.Column('disposition_applied_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata', sa.JSON, nullable=True),
        sa.Column('billing_duration_seconds', sa.Integer, nullable=True),
        sa.Column('cost', sa.Float, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['rc_account_id'], ['rc_accounts.id']),
        sa.ForeignKeyConstraint(['disposition_id'], ['call_dispositions.id'])
    )

    # ===== CREATE RC_WEBHOOK_EVENTS TABLE =====
    op.create_table(
        'rc_webhook_events',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('event_type', sa.String(100), nullable=False, index=True),
        sa.Column('event_source', sa.String(100), nullable=True, default='ringcentral'),
        sa.Column('validation_token', sa.String(255), nullable=True),
        sa.Column('raw_payload', sa.JSON, nullable=False),
        sa.Column('headers', sa.JSON, nullable=True),
        sa.Column('signature', sa.String(255), nullable=True),
        sa.Column('signature_valid', sa.Boolean, nullable=True),
        sa.Column('processed', sa.Boolean, nullable=False, default=False),
        sa.Column('processing_status', sa.String(20), nullable=True, default='pending'),
        sa.Column('processing_attempts', sa.Integer, nullable=True, default=0),
        sa.Column('processing_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processing_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processing_duration_ms', sa.Integer, nullable=True),
        sa.Column('result_summary', sa.Text, nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('error_traceback', sa.Text, nullable=True),
        sa.Column('related_call_id', sa.String(255), nullable=True, index=True),
        sa.Column('related_user_id', sa.String(255), nullable=True, index=True),
        sa.Column('related_session_id', sa.String(255), nullable=True),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    )

    # ===== CREATE CALL_DISPOSITION_HISTORY TABLE =====
    op.create_table(
        'call_disposition_history',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('call_log_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('disposition_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('previous_disposition_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('action_type', sa.String(50), nullable=False),
        sa.Column('applied_by_type', sa.String(50), nullable=True, default='user'),
        sa.Column('applied_by_user_id', sa.String(255), nullable=True),
        sa.Column('disposition_name', sa.String(255), nullable=True),
        sa.Column('confidence_score', sa.Float, nullable=True),
        sa.Column('reasoning', sa.JSON, nullable=True),
        sa.Column('alternative_suggestions', sa.JSON, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('override_reason', sa.String(255), nullable=True),
        sa.Column('applied_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), index=True),
        sa.ForeignKeyConstraint(['call_log_id'], ['call_logs.id']),
        sa.ForeignKeyConstraint(['disposition_id'], ['call_dispositions.id'])
    )

    # ===== CREATE ADDITIONAL INDEXES =====
    # Performance indexes for common query patterns
    op.create_index('idx_call_logs_user_start_time', 'call_logs', ['user_id', 'start_time'])
    op.create_index('idx_call_logs_disposition_status', 'call_logs', ['disposition_status', 'created_at'])
    op.create_index('idx_webhook_events_type_received', 'rc_webhook_events', ['event_type', 'received_at'])
    op.create_index('idx_disposition_history_call_applied', 'call_disposition_history', ['call_log_id', 'applied_at'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes first
    op.drop_index('idx_disposition_history_call_applied', 'call_disposition_history')
    op.drop_index('idx_webhook_events_type_received', 'rc_webhook_events')
    op.drop_index('idx_call_logs_disposition_status', 'call_logs')
    op.drop_index('idx_call_logs_user_start_time', 'call_logs')

    # Drop tables in reverse dependency order
    op.drop_table('call_disposition_history')
    op.drop_table('rc_webhook_events')
    op.drop_table('call_logs')
    op.drop_table('call_dispositions')
    op.drop_table('rc_accounts')
