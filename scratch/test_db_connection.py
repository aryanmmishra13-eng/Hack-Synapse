import sys
import os

# Add backend directory to sys.path
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.insert(0, backend_path)

from app.core.config import settings
from app.database.session import engine, SessionLocal
from sqlalchemy import text, inspect

print("=" * 60)
print("CAMPUS SPORTS HUB - DATABASE CONNECTIVITY & HEALTH CHECK")
print("=" * 60)

# Mask credentials in url for display
db_url = settings.DATABASE_URL
masked_url = db_url
if "@" in db_url:
    prefix = db_url.split("@")[0]
    rest = db_url.split("@")[1]
    scheme = prefix.split("://")[0]
    masked_url = f"{scheme}://***:***@{rest}"

print(f"Database URL: {masked_url}")
print(f"Database Dialect: {engine.dialect.name}")

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        val = result.scalar()
        print(f"\n[PASS] Database ping (SELECT 1): Successful (result = {val})")
        
        # Test inspecting tables
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"\n[INFO] Total Tables Found: {len(tables)}")
        
        if tables:
            print("\nTable Row Counts:")
            print("-" * 40)
            for table in sorted(tables):
                try:
                    cnt = conn.execute(text(f'SELECT count(*) FROM "{table}"')).scalar()
                    print(f"  * {table:<25} : {cnt:>4} records")
                except Exception as e:
                    # Fallback for SQLite / unquoted
                    try:
                        cnt = conn.execute(text(f"SELECT count(*) FROM {table}")).scalar()
                        print(f"  * {table:<25} : {cnt:>4} records")
                    except Exception as err:
                        print(f"  * {table:<25} : Error ({err})")
        else:
            print("\n[WARNING] No tables found in database. You may need to run table creation or seed script.")

    # Test SessionLocal session creation and closing
    session = SessionLocal()
    session.close()
    print("\n[PASS] SessionLocal creation and teardown: Successful")
    print("=" * 60)
    print("CONCLUSION: Database is working correctly!")
    print("=" * 60)

except Exception as e:
    print("\n[FAIL] Database Connection Error:")
    print(f"Type: {type(e).__name__}")
    print(f"Details: {e}")
    print("=" * 60)
    sys.exit(1)
