from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")
load_dotenv()

DATABASE_HOST = os.getenv("DATABASE_HOST", "localhost")
DATABASE_PORT = os.getenv("DATABASE_PORT", "3306")
DATABASE_USER = os.getenv("DATABASE_USER", "root")
DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD", "")
DATABASE_NAME = os.getenv("DATABASE_NAME", "chatbot_db")

SQLALCHEMY_DATABASE_URL = URL.create(
    drivername="mysql+pymysql",
    username=DATABASE_USER,
    password=DATABASE_PASSWORD,
    host=DATABASE_HOST,
    port=int(DATABASE_PORT),
    database=DATABASE_NAME,
    query={"charset": "utf8mb4"},
)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    future=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
Base = declarative_base()


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_required_columns()


def _ensure_required_columns() -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        if "users" in existing_tables:
            user_columns = {column["name"] for column in inspector.get_columns("users")}
            if "created_at" not in user_columns:
                connection.execute(
                    text("ALTER TABLE users ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP")
                )

        if "chat_history" in existing_tables:
            chat_columns = {column["name"] for column in inspector.get_columns("chat_history")}
            if "created_at" not in chat_columns:
                connection.execute(
                    text("ALTER TABLE chat_history ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP")
                )
            if "session_id" not in chat_columns:
                connection.execute(
                    text("ALTER TABLE chat_history ADD COLUMN session_id INT NULL")
                )
                connection.execute(
                    text("CREATE INDEX ix_chat_history_session_id ON chat_history (session_id)")
                )

        refreshed_tables = set(inspect(engine).get_table_names())
        if "chat_sessions" in refreshed_tables and "chat_history" in refreshed_tables:
            connection.execute(
                text(
                    """
                    INSERT INTO chat_sessions (user_id, title, created_at, updated_at)
                    SELECT user_id, 'Previous chats', MIN(created_at), MAX(created_at)
                    FROM chat_history
                    WHERE session_id IS NULL
                    GROUP BY user_id
                    """
                )
            )
            connection.execute(
                text(
                    """
                    UPDATE chat_history h
                    JOIN chat_sessions s
                      ON s.user_id = h.user_id
                     AND s.title = 'Previous chats'
                    SET h.session_id = s.id
                    WHERE h.session_id IS NULL
                    """
                )
            )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
