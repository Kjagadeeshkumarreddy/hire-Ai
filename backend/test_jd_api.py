import httpx
import asyncio
import json
import uuid

async def test_jd_generation():
    base_url = "http://localhost:8000/api/v1"
    test_email = f"tester_{uuid.uuid4().hex[:6]}@example.com"
    test_password = "password123"
    
    async with httpx.AsyncClient() as client:
        # 1. Register a test admin/hr user
        print(f"--- Registering {test_email} ---")
        reg_resp = await client.post(f"{base_url}/auth/register", json={
            "email": test_email,
            "password": test_password,
            "full_name": "Test Runner",
            "role": "admin"
        })
        print(f"Register Status: {reg_resp.status_code}")
        
        # 2. Login to get Access Token
        print("--- Logging In ---")
        login_resp = await client.post(f"{base_url}/auth/login", json={
            "email": test_email,
            "password": test_password
        })
        token = login_resp.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        print(f"Login Status: {login_resp.status_code}")
        
        # 3. Generate JD
        payload = {
            "title": "Senior Python Engineer",
            "department": "Engineering",
            "key_requirements": ["Python 3.11", "FastAPI", "PostgreSQL", "LangChain"],
            "seniority_level": "senior",
            "tone": "professional"
        }
        
        print("--- Generating JD with Groq ---")
        gen_resp = await client.post(
            f"{base_url}/jd/generate", 
            json=payload,
            headers=headers,
            timeout=60.0 # High timeout for LLM
        )
        
        print(f"Generate Status: {gen_resp.status_code}")
        if gen_resp.status_code == 200:
            data = gen_resp.json()
            print("\n--- Generated CONTENT Snippet ---")
            print(data.get("content")[:500] + "...")
            print("\n--- TEST SUCCESSFUL ---")
        else:
            print(f"Error: {gen_resp.text}")

if __name__ == "__main__":
    asyncio.run(test_jd_generation())
