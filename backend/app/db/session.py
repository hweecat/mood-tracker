import sqlite3
import os
import time
from app.core.security import get_password_hash

DATABASE_PATH = os.getenv("DATABASE_PATH", "data/mood-tracker.db")

def init_db():
    # Ensure the directory exists
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    try:
        cursor = conn.cursor()
        
        # Check if users table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            print("Initializing database schema...")
            # ... (CREATE TABLE code remains the same)
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE,
                    name TEXT,
                    email TEXT UNIQUE,
                    password_hash TEXT,
                    password_reset_token_hash TEXT,
                    password_reset_expires_at INTEGER,
                    password_reset_requested_at INTEGER,
                    image TEXT,
                    created_at INTEGER
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
                    action_plan_status TEXT NOT NULL DEFAULT 'pending',
                    user_id TEXT NOT NULL DEFAULT '1',
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS ai_audit_logs (
                    id TEXT PRIMARY KEY,
                    correlation_id TEXT NOT NULL,
                    user_id TEXT,
                    entry_type TEXT,
                    entry_id TEXT,
                    operation TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    model TEXT NOT NULL,
                    prompt_version_id TEXT,
                    masked_request_payload TEXT,
                    response_payload TEXT,
                    safety_ratings TEXT,
                    safety_tier TEXT,
                    latency_ms INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    error_code TEXT,
                    schema_version INTEGER NOT NULL,
                    created_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS ai_feedback_events (
                    id TEXT PRIMARY KEY,
                    audit_log_id TEXT,
                    user_id TEXT NOT NULL,
                    cbt_log_id TEXT NOT NULL,
                    accepted_distortions_payload TEXT,
                    ignored_distortions_payload TEXT,
                    accepted_reframe_payload TEXT,
                    ignored_reframes_payload TEXT,
                    user_rational_response TEXT,
                    accepted_action_plan_payload TEXT,
                    user_action_plan TEXT,
                    source TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                );
            """)
            
            # Seed default user
            demo_password_hash = get_password_hash("demo")
            created_at = int(time.time())
            conn.execute(
                "INSERT OR IGNORE INTO users (id, username, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                ('1', 'demo', 'Demo User', 'demo@example.com', demo_password_hash, created_at)
            )
            conn.commit()
            print("Database initialized successfully.")
        else:
            # Migration logic for existing database
            print("Checking for schema migrations...")
            cursor.execute("PRAGMA table_info(users)")
            columns = [info[1] for info in cursor.fetchall()]
            
            if "username" not in columns:
                print("Migrating users table: rebuilding to add username...")
                # SQLite cannot reorder columns or add UNIQUE constraints easily.
                # We must rebuild the table to enforce column order and constraints.
                conn.execute("ALTER TABLE users RENAME TO users_backup")
                
                # Create new table with desired schema and column order
                conn.execute("""
                    CREATE TABLE users (
                        id TEXT PRIMARY KEY,
                        name TEXT,
                        username TEXT UNIQUE,
                        email TEXT UNIQUE,
                        password_hash TEXT,
                        image TEXT,
                        created_at INTEGER
                    )
                """)
                
                # Copy data from backup. We map existing columns to new ones.
                # Note: password_hash and created_at might be missing in backup if this runs before they are added,
                # but our checks are sequential. To be safe, we check what columns exist in backup.
                
                # Dynamic column selection for copy
                cols_to_copy = ["id", "name", "email", "image"]
                if "password_hash" in columns:
                    cols_to_copy.append("password_hash")
                if "created_at" in columns:
                    cols_to_copy.append("created_at")
                
                cols_str = ", ".join(cols_to_copy)
                
                conn.execute(f"""
                    INSERT INTO users ({cols_str})
                    SELECT {cols_str}
                    FROM users_backup
                """)
                
                conn.execute("DROP TABLE users_backup")
                
                # We've rebuilt the table, so password_hash and created_at are now present (as nulls if they weren't copied)
                # We can skip the specific ADD COLUMN checks for them below, but we need to ensure the update logic runs.
                # To simplify, we'll let the subsequent checks run, but they check 'columns' variable which is stale.
                # Let's refresh columns.
                cursor.execute("PRAGMA table_info(users)")
                columns = [info[1] for info in cursor.fetchall()]

            if "password_hash" not in columns:
                print("Migrating users table: adding password_hash...")
                conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
            
            if "created_at" not in columns:
                print("Migrating users table: adding created_at...")
                conn.execute("ALTER TABLE users ADD COLUMN created_at INTEGER")

            if "password_reset_token_hash" not in columns:
                print("Migrating users table: adding password_reset_token_hash...")
                conn.execute("ALTER TABLE users ADD COLUMN password_reset_token_hash TEXT")

            if "password_reset_expires_at" not in columns:
                print("Migrating users table: adding password_reset_expires_at...")
                conn.execute("ALTER TABLE users ADD COLUMN password_reset_expires_at INTEGER")

            if "password_reset_requested_at" not in columns:
                print("Migrating users table: adding password_reset_requested_at...")
                conn.execute("ALTER TABLE users ADD COLUMN password_reset_requested_at INTEGER")

            _ensure_cbt_log_columns(conn)
            _ensure_ai_audit_tables(conn)
            
            # Ensure Demo User has a password hash and username
            demo_password_hash = get_password_hash("demo")
            conn.execute(
                "UPDATE users SET password_hash = ?, username = 'demo' WHERE id = '1'",
                (demo_password_hash,)
            )
            conn.commit()
            print("Schema checks complete.")

    finally:
        conn.close()

def _ensure_ai_audit_tables(conn: sqlite3.Connection):
    audit_columns = _table_columns(conn, "ai_audit_logs")
    if not audit_columns:
        conn.execute("""
            CREATE TABLE ai_audit_logs (
                id TEXT PRIMARY KEY,
                correlation_id TEXT NOT NULL,
                user_id TEXT,
                entry_type TEXT,
                entry_id TEXT,
                operation TEXT NOT NULL,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                prompt_version_id TEXT,
                masked_request_payload TEXT,
                response_payload TEXT,
                safety_ratings TEXT,
                safety_tier TEXT,
                latency_ms INTEGER NOT NULL,
                status TEXT NOT NULL,
                error_code TEXT,
                schema_version INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            )
        """)
    elif "provider" not in audit_columns:
        conn.execute("ALTER TABLE ai_audit_logs RENAME TO ai_audit_logs_backup")
        conn.execute("""
            CREATE TABLE ai_audit_logs (
                id TEXT PRIMARY KEY,
                correlation_id TEXT NOT NULL,
                user_id TEXT,
                entry_type TEXT,
                entry_id TEXT,
                operation TEXT NOT NULL,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                prompt_version_id TEXT,
                masked_request_payload TEXT,
                response_payload TEXT,
                safety_ratings TEXT,
                safety_tier TEXT,
                latency_ms INTEGER NOT NULL,
                status TEXT NOT NULL,
                error_code TEXT,
                schema_version INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            )
        """)
        conn.execute("""
            INSERT INTO ai_audit_logs (
                id,
                correlation_id,
                operation,
                provider,
                model,
                masked_request_payload,
                response_payload,
                safety_ratings,
                latency_ms,
                status,
                schema_version,
                created_at
            )
            SELECT
                id,
                correlation_id,
                'unknown',
                'gemini',
                'unknown',
                masked_payload,
                response_payload,
                safety_ratings,
                0,
                status,
                1,
                timestamp
            FROM ai_audit_logs_backup
        """)
        conn.execute("DROP TABLE ai_audit_logs_backup")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS ai_feedback_events (
            id TEXT PRIMARY KEY,
            audit_log_id TEXT,
            user_id TEXT NOT NULL,
            cbt_log_id TEXT NOT NULL,
            accepted_distortions_payload TEXT,
            ignored_distortions_payload TEXT,
            accepted_reframe_payload TEXT,
            ignored_reframes_payload TEXT,
            user_rational_response TEXT,
            accepted_action_plan_payload TEXT,
            user_action_plan TEXT,
            source TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )
    """)

def _ensure_cbt_log_columns(conn: sqlite3.Connection):
    cbt_columns = _table_columns(conn, "cbt_logs")
    if cbt_columns and "action_plan_status" not in cbt_columns:
        conn.execute(
            "ALTER TABLE cbt_logs ADD COLUMN action_plan_status TEXT NOT NULL DEFAULT 'pending'"
        )

def _table_columns(conn: sqlite3.Connection, table_name: str) -> list[str]:
    cursor = conn.execute(f"PRAGMA table_info({table_name})")
    return [row[1] for row in cursor.fetchall()]

def get_db():
    # Ensure the directory exists
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
