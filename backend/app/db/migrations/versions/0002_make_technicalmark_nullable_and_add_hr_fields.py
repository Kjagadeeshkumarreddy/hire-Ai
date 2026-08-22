"""make technicalmark credential nullable and add hr audit fields

Revision ID: 0002_make_technicalmark_nullable_and_add_hr_fields
Revises: 
Create Date: 2026-05-20
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0002'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Make credential_id nullable
    op.alter_column('technical_marks', 'credential_id', existing_type=sa.UUID(), nullable=True)

    # Add submitted_by_user_id, submitted_by_role, edited_at
    op.add_column('technical_marks', sa.Column('submitted_by_user_id', sa.UUID(), nullable=True))
    op.add_column('technical_marks', sa.Column('submitted_by_role', sa.String(length=20), nullable=True))
    op.add_column('technical_marks', sa.Column('edited_at', sa.DateTime(timezone=True), nullable=True))

    # Add foreign key constraint for submitted_by_user_id
    op.create_foreign_key(
        'fk_technical_marks_submitted_by_user',
        'technical_marks', 'users', ['submitted_by_user_id'], ['id']
    )


def downgrade():
    op.drop_constraint('fk_technical_marks_submitted_by_user', 'technical_marks', type_='foreignkey')
    op.drop_column('technical_marks', 'edited_at')
    op.drop_column('technical_marks', 'submitted_by_role')
    op.drop_column('technical_marks', 'submitted_by_user_id')
    op.alter_column('technical_marks', 'credential_id', existing_type=sa.UUID(), nullable=False)
