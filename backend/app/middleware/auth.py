from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import structlog
from typing import Optional
from app.config import settings

logger = structlog.get_logger()
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token and decode contained user context."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("auth.token_expired")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.PyJWTError:
        logger.warning("auth.invalid_token")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: dict = Depends(verify_token)):
        # Diagnostic logging capturing raw role bounds natively for terminal verification
        user_role = user.get("role")
        logger.info("auth.authorize_request", sub=user.get("sub"), role=user_role, required_roles=self.allowed_roles)
        
        if user_role not in self.allowed_roles:
            logger.warning("auth.forbidden_role", user_id=user.get("sub"), role=user_role)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Operation not permitted. Expected: {self.allowed_roles}, Got: {user_role}")
        return user
