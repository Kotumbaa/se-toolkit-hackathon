from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/expensesplitter")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create missing tables and apply lightweight schema fixes on startup."""
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        connection.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS is_admin INTEGER NOT NULL DEFAULT 0
        """))
        connection.execute(text("""
            UPDATE users
            SET is_admin = 1
            WHERE id = 1
              AND NOT EXISTS (
                  SELECT 1 FROM users WHERE is_admin = 1
              )
        """))
