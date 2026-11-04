"""
TurfSync Automatic Database Setup Script
Runs schema.sql, indexes.sql, and seed.sql using Python and psycopg.
No need for brew or psql in your PATH!
"""
import os
import sys
from pathlib import Path
import psycopg
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DB_NAME = os.getenv("DB_NAME", "turfsync_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

def get_params(dbname=None):
    p = {
        "dbname": dbname or DB_NAME,
        "user": DB_USER,
        "host": DB_HOST,
        "port": DB_PORT,
    }
    if DB_PASSWORD:
        p["password"] = DB_PASSWORD
    return p

def main():
    print("=" * 60)
    print("🏟️  TurfSync Database Setup")
    print("=" * 60)
    print(f"Connecting to PostgreSQL at {DB_HOST}:{DB_PORT} as '{DB_USER}'...")

    # 1. Connect to default 'postgres' database to ensure turfsync_db exists
    try:
        conn = psycopg.connect(**get_params(dbname="postgres"), autocommit=True)
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
            exists = cur.fetchone()
            if not exists:
                print(f"Creating database '{DB_NAME}'...")
                cur.execute(f'CREATE DATABASE "{DB_NAME}"')
                print(f"✅ Database '{DB_NAME}' created successfully.")
            else:
                print(f"Database '{DB_NAME}' already exists.")
        conn.close()
    except Exception as e:
        print(f"\n❌ Error connecting to PostgreSQL default database:")
        print(e)
        print("\n💡 TIP: If your 'postgres' user requires a password, please set DB_PASSWORD in backend/.env")
        sys.exit(1)

    # 2. Connect to turfsync_db and run scripts
    try:
        conn = psycopg.connect(**get_params(dbname=DB_NAME))
        with conn.cursor() as cur:
            db_dir = Path(__file__).resolve().parent

            # Run schema.sql
            print("\n1. Applying schema.sql...")
            schema_sql = (db_dir / "schema.sql").read_text(encoding="utf-8")
            cur.execute(schema_sql)
            print("   ✅ Schema applied successfully.")

            # Run indexes.sql
            print("2. Applying indexes.sql...")
            indexes_sql = (db_dir / "indexes.sql").read_text(encoding="utf-8")
            cur.execute(indexes_sql)
            print("   ✅ Indexes applied successfully.")

            # Run seed.sql
            print("3. Applying seed.sql...")
            seed_sql = (db_dir / "seed.sql").read_text(encoding="utf-8")
            cur.execute(seed_sql)
            print("   ✅ Demo seed data inserted successfully.")

        conn.commit()
        conn.close()
        print("\n🎉 All database tables and demo seed data are ready!")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ Failed to apply database scripts: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

