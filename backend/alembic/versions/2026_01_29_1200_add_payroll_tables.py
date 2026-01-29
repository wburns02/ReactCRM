"""Add payroll tables

Revision ID: e1f2g3h4i5j6
Revises: d1e2f3g4h5i6
Create Date: 2026-01-29 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'e1f2g3h4i5j6'
down_revision = 'd1e2f3g4h5i6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create payroll_periods table
    op.create_table('payroll_periods',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('period_type', sa.String(20), nullable=False, server_default='biweekly'),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('total_hours', sa.Float(), server_default='0'),
        sa.Column('total_regular_hours', sa.Float(), server_default='0'),
        sa.Column('total_overtime_hours', sa.Float(), server_default='0'),
        sa.Column('total_gross_pay', sa.Float(), server_default='0'),
        sa.Column('total_commissions', sa.Float(), server_default='0'),
        sa.Column('total_deductions', sa.Float(), server_default='0'),
        sa.Column('total_net_pay', sa.Float(), server_default='0'),
        sa.Column('technician_count', sa.Integer(), server_default='0'),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('approved_by', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_payroll_periods_dates', 'payroll_periods', ['start_date', 'end_date'])
    op.create_index('idx_payroll_periods_status', 'payroll_periods', ['status'])

    # Create time_entries table
    op.create_table('time_entries',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('technician_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('payroll_period_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('work_order_id', sa.String(50), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('clock_in', sa.DateTime(timezone=True), nullable=False),
        sa.Column('clock_out', sa.DateTime(timezone=True), nullable=True),
        sa.Column('regular_hours', sa.Float(), server_default='0'),
        sa.Column('overtime_hours', sa.Float(), server_default='0'),
        sa.Column('break_minutes', sa.Integer(), server_default='0'),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('clock_in_latitude', sa.Float(), nullable=True),
        sa.Column('clock_in_longitude', sa.Float(), nullable=True),
        sa.Column('clock_out_latitude', sa.Float(), nullable=True),
        sa.Column('clock_out_longitude', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['payroll_period_id'], ['payroll_periods.id'], ondelete='SET NULL')
    )
    op.create_index('idx_time_entries_technician_id', 'time_entries', ['technician_id'])
    op.create_index('idx_time_entries_technician_date', 'time_entries', ['technician_id', 'date'])
    op.create_index('idx_time_entries_period', 'time_entries', ['payroll_period_id'])

    # Create commissions table
    op.create_table('commissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('technician_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('payroll_period_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('work_order_id', sa.String(50), nullable=True),
        sa.Column('job_total', sa.Float(), nullable=False),
        sa.Column('commission_rate', sa.Float(), nullable=False),
        sa.Column('commission_amount', sa.Float(), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['payroll_period_id'], ['payroll_periods.id'], ondelete='SET NULL')
    )
    op.create_index('idx_commissions_technician', 'commissions', ['technician_id'])
    op.create_index('idx_commissions_period', 'commissions', ['payroll_period_id'])

    # Create technician_pay_rates table
    op.create_table('technician_pay_rates',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('technician_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('pay_type', sa.String(20), nullable=False),
        sa.Column('hourly_rate', sa.Float(), nullable=True),
        sa.Column('overtime_rate', sa.Float(), nullable=True),
        sa.Column('salary_amount', sa.Float(), nullable=True),
        sa.Column('commission_rate', sa.Float(), server_default='0'),
        sa.Column('effective_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_pay_rates_technician_id', 'technician_pay_rates', ['technician_id'])
    op.create_index('idx_pay_rates_technician_active', 'technician_pay_rates', ['technician_id', 'is_active'])
    op.create_index('idx_pay_rates_effective', 'technician_pay_rates', ['effective_date'])


def downgrade() -> None:
    op.drop_table('technician_pay_rates')
    op.drop_table('commissions')
    op.drop_table('time_entries')
    op.drop_table('payroll_periods')
