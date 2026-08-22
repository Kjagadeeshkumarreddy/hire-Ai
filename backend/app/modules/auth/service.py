import random
import string
import structlog
from app.db.redis import redis_manager
from app.core.mailer import send_email

logger = structlog.get_logger()

async def generate_otp() -> str:
    """Generate a random 6-digit OTP flawlessly."""
    return ''.join(random.choices(string.digits, k=6))

async def send_otp_email(email: str) -> bool:
    """Generate OTP, store in Redis, and send via email flawlessly."""
    otp = await generate_otp()
    
    # Store in Redis with a 5-minute (300 seconds) expiration
    redis = redis_manager.get_client()
    if not redis:
        logger.error("otp.redis_not_connected", email=email)
        return False
        
    key = f"otp:{email}"
    await redis.set(key, otp, ex=300)
    
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
    """Verify the provided OTP against the one stored in Redis flawlessly."""
    redis = redis_manager.get_client()
    if not redis:
        logger.error("otp.redis_not_connected", email=email)
        return False
        
    key = f"otp:{email}"
    stored_otp = await redis.get(key)
    
    if stored_otp and stored_otp == otp:
        # Delete OTP after successful verification to prevent reuse
        await redis.delete(key)
        logger.info("otp.verification_success", email=email)
        return True
    
    logger.warn("otp.verification_failed", email=email, provided_otp=otp)
    return False
