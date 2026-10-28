import random
import string
import time
from typing import Optional, Dict, Tuple
import structlog
from app.db.redis import redis_manager
from app.core.mailer import send_email

logger = structlog.get_logger()

# In-memory fallback dictionary: {email: (otp, expiration_timestamp)}
_in_memory_otp_cache: Dict[str, Tuple[str, float]] = {}

async def generate_otp() -> str:
    """Generate a random 6-digit OTP flawlessly."""
    return ''.join(random.choices(string.digits, k=6))

async def _save_otp(email: str, otp: str, ttl_seconds: int = 300) -> None:
    """Store OTP in Redis if available, with in-memory fallback."""
    redis = redis_manager.get_client()
    if redis:
        try:
            await redis.set(f"otp:{email}", otp, ex=ttl_seconds)
            return
        except Exception as e:
            logger.warning("otp.redis_set_fallback", email=email, error=str(e))
    # Fallback to local memory
    _in_memory_otp_cache[email] = (otp, time.time() + ttl_seconds)

async def _get_and_remove_otp(email: str) -> Optional[str]:
    """Retrieve and delete OTP from Redis or in-memory cache."""
    redis = redis_manager.get_client()
    if redis:
        try:
            key = f"otp:{email}"
            val = await redis.get(key)
            if val:
                await redis.delete(key)
                return str(val)
        except Exception as e:
            logger.warning("otp.redis_get_fallback", email=email, error=str(e))

    # Fallback to local memory
    stored = _in_memory_otp_cache.pop(email, None)
    if stored:
        otp_val, expires_at = stored
        if time.time() <= expires_at:
            return otp_val
    return None

async def send_otp_email(email: str) -> bool:
    """Generate OTP, store it, and send via email flawlessly."""
    otp = await generate_otp()
    
    # Store OTP with a 5-minute (300 seconds) expiration
    await _save_otp(email, otp, ttl_seconds=300)
    
    # Prepare email content
    subject = "Your Verification Code - Hire-AI"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333;">Welcome to Hire-AI</h2>
        <p>To complete your registration, please use the following One-Time Password (OTP):</p>
        <div style="font-size: 24px; font-weight: bold; color: #4F46E5; letter-spacing: 5px; padding: 15px; background: #f3f4f6; text-align: center; border-radius: 5px;">
            {otp}
        </div>
        <p style="margin-top: 20px; color: #666;">This code will expire in 5 minutes.</p>
        <p style="color: #666;">If you didn't request this, please ignore this email.</p>
    </div>
    """
    
    # Send email
    success = await send_email(to_email=email, subject=subject, html_body=html_body)
    
    if success:
        logger.info("otp.sent_successfully", email=email)
    else:
        logger.error("otp.send_failed", email=email)
        
    return success

async def verify_otp(email: str, otp: str) -> bool:
    """Verify the provided OTP against Redis or in-memory fallback."""
    stored_otp = await _get_and_remove_otp(email)
    
    if stored_otp and stored_otp == otp.strip():
        logger.info("otp.verification_success", email=email)
        return True
    
    logger.warn("otp.verification_failed", email=email, provided_otp=otp)
    return False
