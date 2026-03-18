"""baseline_schema_established

Revision ID: d43242eb11ac
Revises:
Create Date: 2026-03-17 11:06:05.315592

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd43242eb11ac'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables from scratch on a fresh database."""
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('auth_provider', sa.String(), nullable=True),
        sa.Column('profile_photo_url', sa.String(), nullable=True),
        sa.Column('free_downloads_used', sa.Integer(), nullable=True),
        sa.Column('subscription_status', sa.String(), nullable=True),
        sa.Column('subscription_plan', sa.String(), nullable=True),
        sa.Column('subscription_expiry', sa.DateTime(), nullable=True),
        sa.Column('cashfree_customer_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_id', 'users', ['id'], unique=False)
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    op.create_table(
        'resumes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('filename', sa.String(), nullable=True),
        sa.Column('original_text', sa.Text(), nullable=True),
        sa.Column('parsed_sections', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_resumes_id', 'resumes', ['id'], unique=False)
    op.create_index('ix_resumes_filename', 'resumes', ['filename'], unique=False)
    op.create_index('ix_resumes_user_id', 'resumes', ['user_id'], unique=False)

    op.create_table(
        'generated_resumes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('resume_id', sa.Integer(), sa.ForeignKey('resumes.id'), nullable=True),
        sa.Column('template', sa.String(), nullable=True),
        sa.Column('optimized_sections', sa.Text(), nullable=True),
        sa.Column('job_description', sa.Text(), nullable=True),
        sa.Column('requirements_prompt', sa.Text(), nullable=True),
        sa.Column('ats_score', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_generated_resumes_id', 'generated_resumes', ['id'], unique=False)
    op.create_index('ix_generated_resumes_resume_id', 'generated_resumes', ['resume_id'], unique=False)

    op.create_table(
        'chat_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('resume_id', sa.Integer(), sa.ForeignKey('resumes.id'), nullable=True),
        sa.Column('role', sa.String(), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_chat_history_id', 'chat_history', ['id'], unique=False)
    op.create_index('ix_chat_history_resume_id', 'chat_history', ['resume_id'], unique=False)

    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('cashfree_order_id', sa.String(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(), nullable=True),
        sa.Column('payment_method', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('type', sa.String(), nullable=True),
        sa.Column('plan', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('cashfree_order_id'),
    )
    op.create_index('ix_payments_id', 'payments', ['id'], unique=False)
    op.create_index('ix_payments_user_id', 'payments', ['user_id'], unique=False)

    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('cashfree_subscription_id', sa.String(), nullable=True),
        sa.Column('plan', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('current_period_start', sa.DateTime(), nullable=True),
        sa.Column('current_period_end', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index('ix_subscriptions_id', 'subscriptions', ['id'], unique=False)
    op.create_index('ix_subscriptions_user_id', 'subscriptions', ['user_id'], unique=False)


def downgrade() -> None:
    """Drop all tables."""
    op.drop_table('subscriptions')
    op.drop_table('payments')
    op.drop_table('chat_history')
    op.drop_table('generated_resumes')
    op.drop_table('resumes')
    op.drop_table('users')
