import os
from groq import Groq
from dotenv import load_dotenv

# Load .env from the current directory
load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
print(f"Testing with API Key: {api_key[:5]}...{api_key[-5:] if api_key else 'None'}")

client = Groq(api_key=api_key)

models_to_test = ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile", "llama3-70b-8192"]

for model in models_to_test:
    print(f"\n--- Testing Model: {model} ---")
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Return 'hello' in JSON format."}],
            response_format={"type": "json_object"}
        )
        print(f"SUCCESS: {completion.choices[0].message.content}")
    except Exception as e:
        print(f"FAILED: {e}")
