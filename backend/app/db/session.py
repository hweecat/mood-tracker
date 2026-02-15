import sqlite3
import os
from contextlib import contextmanager

DATABASE_PATH = os.getenv("DATABASE_PATH", "data/mood-tracker.db")

def init_db():
    # Ensure the directory exists
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    try:
        # Simple check if users table exists
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("Initializing database schema...")
            # We'll use the existing appschema.sql if available, or just create basic tables
            # For robustness in Docker, we'll define the core schema here
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    email TEXT UNIQUE,
                    image TEXT
                );

                CREATE TABLE IF NOT EXISTS mood_entries (
                    id TEXT PRIMARY KEY,
                    rating INTEGER NOT NULL,
                    emotions TEXT NOT NULL,
                    note TEXT,
                    timestamp INTEGER NOT NULL,
                    trigger TEXT,
                    behavior TEXT,
                    user_id TEXT NOT NULL DEFAULT '1',
                    ai_analysis TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS cbt_logs (
                    id TEXT PRIMARY KEY,
                    timestamp INTEGER NOT NULL,
                    situation TEXT NOT NULL,
                    automatic_thoughts TEXT NOT NULL,
                    distortions TEXT NOT NULL,
                    rational_response TEXT NOT NULL,
                    mood_before INTEGER NOT NULL,
                    mood_after INTEGER,
                    behavioral_link TEXT,
                    user_id TEXT NOT NULL DEFAULT '1',
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );

                -- Seed default user
                INSERT OR IGNORE INTO users (id, name, email) VALUES ('1', 'Demo User', 'demo@example.com');
            """)
            conn.commit()
            print("Database initialized successfully.")
    finally:
        conn.close()

def get_db():
    # Ensure the directory exists
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
