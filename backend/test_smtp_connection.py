import smtplib
import os
from dotenv import load_dotenv

load_dotenv()

smtp_host = os.getenv("SMTP_HOST")
smtp_port = int(os.getenv("SMTP_PORT", 587))
smtp_user = os.getenv("SMTP_USER")
smtp_pass = os.getenv("SMTP_PASSWORD")

print(f"Testing SMTP: {smtp_host}:{smtp_port}")
print(f"User: {smtp_user}")

try:
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        print("SUCCESS: SMTP Authentication successful!")
except Exception as e:
    print(f"FAILED: {e}")
