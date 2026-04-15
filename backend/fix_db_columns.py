import os
import psycopg
from dotenv import load_dotenv

def fix_db():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not found in .env")
        return

    # Stripping SQLAlchemy driver names to create a sync connection string
    sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    # Handle the '@' character in the password if it's not already percent-encoded
    if "KJKR@12@" in sync_url:
        sync_url = sync_url.replace("KJKR@12@", "KJKR%4012@")
        
    print(f"Connecting to: {sync_url.split('@')[-1]}")
    
    queries = [
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ingestion_status VARCHAR(20) DEFAULT 'idle';",
        "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ingestion_progress JSONB DEFAULT '{}';"
    ]
    
    try:
        with psycopg.connect(sync_url) as conn:
            with conn.cursor() as cur:
                for query in queries:
                    print(f"Executing: {query}")
                    cur.execute(query)
                conn.commit()
        print("Database schema update complete!")
    except Exception as e:
        print(f"Error updating database: {e}")

if __name__ == "__main__":
    fix_db()
