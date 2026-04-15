import asyncio
import os
from app.agents.graph import get_compiled_graph

async def test_graph_compilation():
    try:
        graph = await get_compiled_graph()
        print("✅ Graph compiled successfully!")
        print("Nodes:", graph.get_graph().nodes.keys())
    except Exception as e:
        print(f"❌ Graph compilation failed: {e}")

if __name__ == "__main__":
    # Mocking environment for compilation test
    os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost/db"
    os.environ["REDIS_URL"] = "redis://localhost"
    os.environ["GROQ_API_KEY"] = "mock"
    os.environ["GITHUB_TOKEN"] = "mock"
    os.environ["SECRET_KEY"] = "mock"
    
    asyncio.run(test_graph_compilation())
