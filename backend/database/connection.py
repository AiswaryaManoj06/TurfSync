"""
TurfSync Direct Database Connection Module.
STRICT NO-ORM IMPLEMENTATION:
All database interactions use raw SQL queries.
Primary: PostgreSQL via psycopg with dictionary rows.
Automatic Fallback: High-performance SQLite engine if PostgreSQL is offline or unreachable.
"""
import os
import contextlib
import logging
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DB_NAME = os.getenv("DB_NAME", "turfsync_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

_USE_SQLITE_FALLBACK = None
logger = logging.getLogger(__name__)

def get_connection_params():
    params = {
        "dbname": DB_NAME,
        "user": DB_USER,
        "host": DB_HOST,
        "port": DB_PORT,
    }
    if DB_PASSWORD:
        params["password"] = DB_PASSWORD
    return params

def _check_postgres_available():
    global _USE_SQLITE_FALLBACK
    if _USE_SQLITE_FALLBACK is not None:
        return not _USE_SQLITE_FALLBACK

    if os.getenv("DB_ENGINE") == "sqlite" or not DB_PASSWORD:
        _USE_SQLITE_FALLBACK = True
        return False

    try:
        import psycopg
        conn = psycopg.connect(**get_connection_params(), connect_timeout=1)
        conn.close()
        _USE_SQLITE_FALLBACK = False
        print("✅ Connected to PostgreSQL database:", DB_NAME)
        return True
    except Exception as e:
        _USE_SQLITE_FALLBACK = True
        print("ℹ️  PostgreSQL not running/reachable. Using SQLite fallback database.")
        from database import sqlite_fallback
        sqlite_fallback.init_sqlite_db()
        return False

def get_connection():
    """Returns a direct psycopg connection or sqlite connection."""
    if _check_postgres_available():
        import psycopg
        return psycopg.connect(**get_connection_params())
    else:
        from database import sqlite_fallback
        return sqlite_fallback.get_sqlite_connection()

@contextlib.contextmanager
def db_cursor(as_dict=True, autocommit=False):
    """
    Context manager yielding a cursor.
    Default uses dictionary rows so results are returned as dictionaries.
    """
    if _check_postgres_available():
        import psycopg
        from psycopg.rows import dict_row
        conn = psycopg.connect(**get_connection_params(), autocommit=autocommit)
        try:
            row_factory = dict_row if as_dict else None
            with conn.cursor(row_factory=row_factory) as cur:
                yield cur
            if not autocommit:
                conn.commit()
        except Exception:
            if not autocommit:
                conn.rollback()
            raise
        finally:
            conn.close()
    else:
        from database import sqlite_fallback
        with sqlite_fallback.sqlite_cursor(as_dict=as_dict, autocommit=autocommit) as cur:
            yield cur

def query_all(query, params=None):
    """Executes a SELECT query and returns all matching rows as dictionaries."""
    with db_cursor(as_dict=True) as cur:
        cur.execute(query, params or ())
        return cur.fetchall()

def query_one(query, params=None):
    """Executes a SELECT query and returns a single row as a dictionary, or None."""
    with db_cursor(as_dict=True) as cur:
        cur.execute(query, params or ())
        return cur.fetchone()

def execute_insert(query, params=None, returning=None):
    """
    Executes an INSERT query with parameters.
    If 'returning' is provided (e.g. 'RETURNING id'), returns the returned value.
    """
    if _check_postgres_available():
        with db_cursor(as_dict=True) as cur:
            if returning:
                if not query.strip().upper().endswith("RETURNING " + returning.upper()) and "RETURNING" not in query.upper():
                    query = f"{query.rstrip(';')} RETURNING {returning};"
                cur.execute(query, params or ())
                res = cur.fetchone()
                return res.get(returning) if res else None
            else:
                cur.execute(query, params or ())
                return cur.rowcount
    else:
        from database import sqlite_fallback
        return sqlite_fallback.execute_insert(query, params, returning=returning)

def execute_update(query, params=None):
    """Executes an UPDATE or DELETE query with parameters and returns affected rows."""
    with db_cursor(as_dict=True) as cur:
        cur.execute(query, params or ())
        return cur.rowcount

def execute_batch(query, param_list):
    """Executes a batch of queries inside a single transaction."""
    with db_cursor(as_dict=True) as cur:
        cur.executemany(query, param_list)
        return cur.rowcount
