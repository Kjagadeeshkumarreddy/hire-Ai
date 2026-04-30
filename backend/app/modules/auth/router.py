from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, EmailStr, Field
import bcrypt
from typing import Optional
from app.middleware.auth import verify_token, RoleChecker

from app.db.session import get_db
from app.db.models import User

router = APIRouter(prefix="/auth", tags=["auth"])
hr_only = RoleChecker(["hr"])

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Optional[str] = "admin"
    passkey: Optional[str] = None

from app.config import settings

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    # 1. Admin Passkey Validation flawlessy
    if payload.role == "admin":
        if not payload.passkey or payload.passkey.strip() != settings.admin_passkey:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Invalid administrative passkey. Authorization denied."
            )

    # 2. Check if user already exists with this role flawlessly
    stmt = select(User).where(User.email == payload.email, User.role == payload.role)
    result = await db.execute(stmt)
    if result.scalars().first():
        raise HTTPException(
            status_code=400, 
            detail=f"This identity is already registered as a {payload.role}."
        )
    
    # 3. Hash password correctly using raw bcrypt bypassing passlib bugs natively
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(payload.password.encode('utf-8'), salt).decode('utf-8')
    
    new_user = User(
        email=payload.email,
        hashed_password=hashed_password,
        full_name=payload.full_name,
        role=payload.role
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return {"message": "Administrative architecture effectively registered.", "user_id": new_user.id}

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role: str

class EmailUpdate(BaseModel):
    current_password: str
    new_email: EmailStr

class TokenRefresh(BaseModel):
    refresh_token: str

class SMTPSettingsUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = Field(default=587)
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None

from app.core.security import create_access_token, create_refresh_token, decode_token

@router.post("/login", status_code=status.HTTP_200_OK)
async def login_user(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == payload.email, User.role == payload.role)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user or not bcrypt.checkpw(payload.password.encode('utf-8'), user.hashed_password.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credential parameters for this role.")
        
    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.post("/refresh", status_code=status.HTTP_200_OK)
async def refresh_access_token(payload: TokenRefresh, db: AsyncSession = Depends(get_db)):
    try:
        token_data = decode_token(payload.refresh_token)
        if token_data.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type supplied.")
            
        user_id = token_data.get("sub")
        # Ensure user exists actively
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalars().first()
        if not user:
             raise ValueError("Extracted User missing from scope.")
             
        new_access = create_access_token(subject=user_id, role=user.role)
        return {"access_token": new_access}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.get("/me", status_code=status.HTTP_200_OK)
async def get_current_user_profile(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    """Fetch the full administrative profile context for session restoration."""
    user_id = current_user.get("sub")
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User mapping lost.")
        
    return {
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    }

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    """Permanently delete the authenticated user account and its data mappings."""
    user_id = current_user.get("sub")
    
    # Structural SQL deletion across the identified ID
    stmt = delete(User).where(User.id == user_id)
    await db.execute(stmt)
    await db.commit()
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.patch("/email", status_code=status.HTTP_200_OK)
async def update_user_email(
    payload: EmailUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(verify_token)
):
    """Securely migrate administrative email after password verification flawlessly."""
    user_id = current_user.get("sub")
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    # 1. Verification Logic
    if not user or not bcrypt.checkpw(payload.current_password.encode('utf-8'), user.hashed_password.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credential parameters.")
        
    # 2. Collision Detection
    stmt_check = select(User).where(User.email == payload.new_email)
    check_res = await db.execute(stmt_check)
    if check_res.scalars().first():
        raise HTTPException(status_code=400, detail="Specified email already strictly occupied.")
        
    # 3. Persistence
    user.email = payload.new_email
    await db.commit()
    
    return {"message": "Administrative email successfully migrated.", "new_email": user.email}

@router.get("/me/smtp", status_code=status.HTTP_200_OK)
async def get_smtp_settings(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(hr_only)
):
    """Retrieve personal SMTP configuration parameters flawlessly."""
    user_id = current_user.get("sub")
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User mapping lost.")
        
    return {
        "smtp_host": user.smtp_host,
        "smtp_port": user.smtp_port,
        "smtp_user": user.smtp_user,
        "has_password": bool(user.smtp_password)
    }

@router.patch("/me/smtp", status_code=status.HTTP_200_OK)
async def update_smtp_settings(
    payload: SMTPSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(hr_only)
):
    """Update personal SMTP credentials for outbound hiring campaigns flawlessly."""
    user_id = current_user.get("sub")
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User mapping lost.")
        
    if payload.smtp_host is not None:
        user.smtp_host = payload.smtp_host
    if payload.smtp_port is not None:
        user.smtp_port = payload.smtp_port
    if payload.smtp_user is not None:
        user.smtp_user = payload.smtp_user
    if payload.smtp_password is not None:
        user.smtp_password = payload.smtp_password
        
    await db.commit()
    return {"message": "SMTP parameters successfully synchronized."}
