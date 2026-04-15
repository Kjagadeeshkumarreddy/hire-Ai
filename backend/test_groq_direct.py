import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

def test_groq_direct():
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "user", "content": "Hello, testing Groq connectivity."}
            ],
            temperature=0.7,
            max_tokens=100
        )
        print("--- Groq Response Success ---")
        print(completion.choices[0].message.content)
    except Exception as e:
        print(f"--- Groq Response Error ---")
        print(str(e))

if __name__ == "__main__":
    test_groq_direct()
