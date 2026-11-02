"""
TurfSync Direct Database Connection Module.
STRICT NO-ORM IMPLEMENTATION:
All database interactions use raw SQL queries via psycopg with parameterized inputs.
"""
import os
import contextlib
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DB_NAME = os.getenv("DB_NAME", "turfsync_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

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

def get_connection():
    """Returns a direct psycopg connection."""
    return psycopg.connect(**get_connection_params())

@contextlib.contextmanager
def db_cursor(as_dict=True, autocommit=False):
    """
    Context manager yielding a psycopg cursor.
    Default uses dict_row so results are returned as dictionaries.
    """
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
