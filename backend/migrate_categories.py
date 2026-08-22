import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.db.session import engine
from sqlalchemy import text

async def migrate():
    async with engine.begin() as conn:
        # 1. Create assessment_categories table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS assessment_categories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                max_marks INTEGER NOT NULL,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT now()
            );
        """))
        print("[OK] assessment_categories table created")

        # 2. Create index on job_id
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_assessment_cat_job 
            ON assessment_categories(job_id);
        """))
        print("[OK] assessment_categories index created")

        # 3. Create category_marks table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS category_marks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                technical_mark_id UUID NOT NULL REFERENCES technical_marks(id) ON DELETE CASCADE,
                category_id UUID NOT NULL REFERENCES assessment_categories(id) ON DELETE CASCADE,
                marks_obtained NUMERIC(5, 2) NOT NULL,
                CONSTRAINT uq_catmark_mark_cat UNIQUE(technical_mark_id, category_id)
            );
        """))
        print("[OK] category_marks table created")

        # 4. Create indexes
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_catmark_techmark 
            ON category_marks(technical_mark_id);
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_catmark_category 
            ON category_marks(category_id);
        """))
        print("[OK] category_marks indexes created")

asyncio.run(migrate())
print("Assessment categories migration complete!")
