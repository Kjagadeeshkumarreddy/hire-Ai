import asyncio
from uuid import UUID
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models import Job, Candidate
from app.modules.candidates.service import send_bulk_emails

async def simulate_blast():
    async with AsyncSessionLocal() as db:
        # Get the 'full stack intern' job ID
        stmt = select(Job).where(Job.title == "full stack intern")
        res = await db.execute(stmt)
        job = res.scalars().first()
        
        if not job:
            print("FAILED: No job found with title 'full stack intern'")
            return

        print(f"Targeting Job: {job.title} ({job.id})")
        
        # Test Payload
        subject = "Hello {candidate_name}"
        body = "<p>Testing the blast to {candidate_name} for the {job_title} role.</p>"
        
        print("Executing Blast...")
        result = await send_bulk_emails(job.id, subject, body, db)
        print(f"RESULT: {result}")

if __name__ == "__main__":
    asyncio.run(simulate_blast())
