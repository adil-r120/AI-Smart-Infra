from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# Find .env in the same directory as this file (backend/)
_backend_dir = os.path.dirname(os.path.abspath(__file__))
_env_path = os.path.join(_backend_dir, '.env')
load_dotenv(_env_path)

# Database URL Logic (MySQL Required)
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be set in .env or environment variables.")

# MySQL Engine Configuration
# Using pool_pre_ping to automatically reconnect after timeouts
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # Reconnect on stale connections
    pool_recycle=1800,         # Recycle connections every 30 min (prevents MySQL timeout)
    pool_size=10,              # Keep 10 persistent connections in pool
    max_overflow=20,           # Allow 20 extra connections under burst load
    pool_timeout=30,           # Wait up to 30s for a connection before erroring
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def init_db():
    Base.metadata.create_all(bind=engine)
    # Ensure newly added columns exist on existing tables without manual SQL migration scripts
    try:
        with engine.begin() as conn:
            for col_name, col_type in [
                ("assigned_worker", "VARCHAR(100) NULL"),
                ("worker_notes", "TEXT NULL"),
                ("assigned_at", "DATETIME NULL"),
            ]:
                try:
                    conn.execute(text(f"ALTER TABLE reports ADD COLUMN {col_name} {col_type}"))
                except Exception:
                    pass
    except Exception as e:
        print(f"[INIT_DB WARNING] Schema column check notice: {e}")

