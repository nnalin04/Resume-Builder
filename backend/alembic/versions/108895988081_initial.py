"""initial

Revision ID: 108895988081
Revises: d43242eb11ac
Create Date: 2026-03-17 22:28:18.562388

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = '108895988081'
down_revision: Union[str, Sequence[str], None] = 'd43242eb11ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op — all schema was created in the baseline migration."""
    pass


def downgrade() -> None:
    """No-op."""
    pass
