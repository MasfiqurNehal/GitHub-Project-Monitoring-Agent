import psycopg2
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from app.config import settings

def apply_migration():
    print("Applying migration 001_create_chatbot_tables.sql to NeonDB...")
    migration_file = Path(__file__).parent.parent / "database" / "migrations" / "001_create_chatbot_tables.sql"
    sql_content = migration_file.read_text(encoding="utf-8")

    db_url = settings.DATABASE_URL
    if not db_url:
        print("ERROR: DATABASE_URL is empty!")
        sys.exit(1)

    # Clean connection string for psycopg2 if needed
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    with conn.cursor() as cursor:
        cursor.execute(sql_content)
    conn.close()
    print("[+] Migration successfully applied to NeonDB PostgreSQL!")

if __name__ == "__main__":
    apply_migration()
