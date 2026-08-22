import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from app.db.session import engine
from sqlalchemy import text

async def migrate():
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE saved_offer_letters "
            "ADD COLUMN IF NOT EXISTS signature_status VARCHAR(20) DEFAULT 'unsigned';"
        ))
        print("Added signature_status column")

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS offer_signatures (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                saved_offer_id UUID NOT NULL REFERENCES saved_offer_letters(id) ON DELETE CASCADE,
                candidate_id UUID NOT NULL REFERENCES candidates(id),
                job_id UUID NOT NULL REFERENCES jobs(id),
                signing_token VARCHAR(64) UNIQUE NOT NULL,
                token_expires_at TIMESTAMPTZ NOT NULL,
                expires_in_days INTEGER NOT NULL DEFAULT 7,
                signature_image TEXT,
                signature_type VARCHAR(20),
                typed_name VARCHAR(255),
                signer_ip VARCHAR(45),
                signer_user_agent VARCHAR(500),
                consent_text TEXT,
                signed_at TIMESTAMPTZ,
                status VARCHAR(20) DEFAULT 'pending',
                signed_pdf_data TEXT,
                created_at TIMESTAMPTZ DEFAULT now()
            );
        """))
        print("offer_signatures table ensured")

        await conn.execute(text("""
            ALTER TABLE offer_signatures 
            ADD COLUMN IF NOT EXISTS hr_signature_image TEXT,
            ADD COLUMN IF NOT EXISTS hr_signature_type VARCHAR(20),
            ADD COLUMN IF NOT EXISTS hr_typed_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS hr_signed_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS hr_signer_ip VARCHAR(45),
            ADD COLUMN IF NOT EXISTS hr_signer_user_agent VARCHAR(500);
        """))
        await conn.execute(text("ALTER TABLE offer_signatures ALTER COLUMN status TYPE VARCHAR(30);"))
        print("Added HR signature columns and updated status type")

asyncio.run(migrate())
print("Migration complete!")
