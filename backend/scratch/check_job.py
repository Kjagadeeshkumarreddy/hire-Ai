import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from app.db.session import get_db
from app.db.models import Job
from uuid import UUID

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def check():
    user_id = UUID('59e8968f-7ab9-4ac8-8239-b3d9c11665d6')
    from app.db.models import User
    async for db in get_db():
        user = await db.get(User, user_id)
        if user:
            print(f"User Found: {user.email}")
            print(f"Role: {user.role}")
        else:
            print("User Not Found")
        break

if __name__ == "__main__":
    asyncio.run(check())
