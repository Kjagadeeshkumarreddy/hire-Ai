import asyncio
import os
import sys

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.db.models import AuditLog, Job, JDVersion
from sqlalchemy import select

async def check_db():
    async with SessionLocal() as db:
        # Check Logs
        res = await db.execute(select(AuditLog))
        logs = res.scalars().all()
        print(f"Total Audit Logs: {len(logs)}")
        for l in logs:
            print(f"Log: {l.action} (Job: {l.job_id}) at {l.created_at}")
        
        # Check draft JDs
        res = await db.execute(select(JDVersion).where(JDVersion.status == 'draft'))
        drafts = res.scalars().all()
        print(f"\nTotal Draft JDs: {len(drafts)}")
        for d in drafts:
            print(f"Draft: Job {d.job_id} version {d.version}")

if __name__ == "__main__":
    asyncio.run(check_db())
