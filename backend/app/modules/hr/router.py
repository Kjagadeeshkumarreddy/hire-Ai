from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models import Candidate
from app.middleware.auth import RoleChecker

router = APIRouter(prefix="/hr", tags=["HR"])

hr_only = RoleChecker(["hr", "admin"])


