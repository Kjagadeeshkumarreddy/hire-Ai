import asyncio
from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.db.models import Candidate, Job

async def check():
    async with AsyncSessionLocal() as db:
        # Count shortlisted candidates per job
        stmt = (
            select(Job.title, func.count(Candidate.id))
            .join(Candidate, Candidate.job_id == Job.id)
            .where(Candidate.is_shortlisted == True)
            .group_by(Job.title)
        )
        res = await db.execute(stmt)
        results = res.all()
        
        if not results:
            print("ALERT: No shortlisted candidates found for ANY job.")
            # Check total candidates
            total_stmt = select(func.count(Candidate.id))
            total_cand = (await db.execute(total_stmt)).scalar()
            print(f"Total Candidates in DB: {total_cand}")
            
            # Check shortlisted candidates (any job)
            any_short_stmt = select(func.count(Candidate.id)).where(Candidate.is_shortlisted == True)
            any_short = (await db.execute(any_short_stmt)).scalar()
            print(f"Total Shortlisted (Global): {any_short}")
        else:
            print("--- Shortlisted Talent Pool ---")
            for title, count in results:
                print(f"Role: {title} | Shortlisted Candidates: {count}")

if __name__ == "__main__":
    asyncio.run(check())
