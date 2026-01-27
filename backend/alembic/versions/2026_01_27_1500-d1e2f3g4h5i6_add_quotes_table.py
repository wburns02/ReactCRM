"""Add quotes table

Revision ID: d1e2f3g4h5i6
Revises: c1d2e3f4g5h6
Create Date: 2026-01-27 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd1e2f3g4h5i6'
down_revision: Union[str, None] = 'c1d2e3f4g5h6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create quotes table
    op.create_table(
        'quotes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('quote_number', sa.String(50), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        sa.Column('line_items', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('subtotal', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('tax_rate', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('tax', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('total', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('valid_until', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('terms', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('idx_quotes_quote_number', 'quotes', ['quote_number'], unique=True)
    op.create_index('idx_quotes_customer_id', 'quotes', ['customer_id'])
    op.create_index('idx_quotes_status', 'quotes', ['status'])
    op.create_index('idx_quotes_customer_status', 'quotes', ['customer_id', 'status'])
    op.create_index('idx_quotes_created_at', 'quotes', ['created_at'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_quotes_created_at', table_name='quotes')
    op.drop_index('idx_quotes_customer_status', table_name='quotes')
    op.drop_index('idx_quotes_status', table_name='quotes')
    op.drop_index('idx_quotes_customer_id', table_name='quotes')
    op.drop_index('idx_quotes_quote_number', table_name='quotes')

    # Drop table
    op.drop_table('quotes')
