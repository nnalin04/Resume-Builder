"""add profile fields to users

Revision ID: 2a3f8c1d7e9b
Revises: 1e753df9fc6b
Create Date: 2026-03-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '2a3f8c1d7e9b'
down_revision: Union[str, Sequence[str], None] = '1e753df9fc6b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('phone', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('location', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('bio', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('linkedin', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('github', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('website', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('email_verified', sa.Boolean(), nullable=True, server_default='0'))
        batch_op.add_column(sa.Column('phone_verified', sa.Boolean(), nullable=True, server_default='0'))


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('phone_verified')
        batch_op.drop_column('email_verified')
        batch_op.drop_column('website')
        batch_op.drop_column('github')
        batch_op.drop_column('linkedin')
        batch_op.drop_column('bio')
        batch_op.drop_column('location')
        batch_op.drop_column('phone')
