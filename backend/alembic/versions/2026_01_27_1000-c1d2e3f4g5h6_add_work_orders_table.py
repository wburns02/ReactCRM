"""Add work_orders table

Revision ID: c1d2e3f4g5h6
Revises: b2c3d4e5f6a7
Create Date: 2026-01-27 10:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'c1d2e3f4g5h6'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create work_orders table."""
    op.create_table(
        'work_orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('customer_id', sa.Integer, nullable=False),

        # Status and type as VARCHAR
        sa.Column('status', sa.String(30), nullable=False, server_default='draft'),
        sa.Column('job_type', sa.String(30), nullable=False),
        sa.Column('priority', sa.String(20), nullable=False, server_default='normal'),

        # Scheduling
        sa.Column('scheduled_date', sa.Date, nullable=True),
        sa.Column('time_window_start', sa.String(10), nullable=True),
        sa.Column('time_window_end', sa.String(10), nullable=True),
        sa.Column('estimated_duration_hours', sa.Float, nullable=True),

        # Assignment
        sa.Column('technician_id', sa.String(255), nullable=True),
        sa.Column('assigned_technician', sa.String(255), nullable=True),
        sa.Column('assigned_vehicle', sa.String(100), nullable=True),

        # Service address
        sa.Column('service_address_line1', sa.String(255), nullable=True),
        sa.Column('service_address_line2', sa.String(255), nullable=True),
        sa.Column('service_city', sa.String(100), nullable=True),
        sa.Column('service_state', sa.String(2), nullable=True),
        sa.Column('service_postal_code', sa.String(20), nullable=True),
        sa.Column('service_latitude', sa.Float, nullable=True),
        sa.Column('service_longitude', sa.Float, nullable=True),

        # Work details
        sa.Column('checklist', postgresql.JSON, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, server_default=sa.func.now()),
    )

    # Create indexes
    op.create_index('idx_work_orders_customer_id', 'work_orders', ['customer_id'])
    op.create_index('idx_work_orders_status', 'work_orders', ['status'])
    op.create_index('idx_work_orders_scheduled_date', 'work_orders', ['scheduled_date'])
    op.create_index('idx_work_orders_technician_id', 'work_orders', ['technician_id'])
    op.create_index('idx_work_orders_status_date', 'work_orders', ['status', 'scheduled_date'])
    op.create_index('idx_work_orders_technician_date', 'work_orders', ['technician_id', 'scheduled_date'])


def downgrade() -> None:
    """Drop work_orders table."""
    op.drop_index('idx_work_orders_technician_date', table_name='work_orders')
    op.drop_index('idx_work_orders_status_date', table_name='work_orders')
    op.drop_index('idx_work_orders_technician_id', table_name='work_orders')
    op.drop_index('idx_work_orders_scheduled_date', table_name='work_orders')
    op.drop_index('idx_work_orders_status', table_name='work_orders')
    op.drop_index('idx_work_orders_customer_id', table_name='work_orders')
    op.drop_table('work_orders')
