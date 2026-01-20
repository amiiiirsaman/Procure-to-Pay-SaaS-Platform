"""Test database initialization."""
import sys
import traceback
from sqlalchemy import text, create_engine as sa_create_engine
from sqlalchemy.orm import declarative_base

print("1. Testing raw SQLAlchemy (in-memory)...")
sys.stdout.flush()
try:
    test_engine = sa_create_engine("sqlite:///:memory:", echo=False)
    with test_engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print(f"   OK: In-memory SQLite works")
    sys.stdout.flush()
except Exception as e:
    print(f"   FAIL: {e}")
    traceback.print_exc()
    sys.exit(1)

print("2. Testing file-based SQLite directly...")
sys.stdout.flush()
try:
    test_engine2 = sa_create_engine("sqlite:///p2p_platform.db", connect_args={"check_same_thread": False})
    with test_engine2.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print(f"   OK: File-based SQLite works")
    sys.stdout.flush()
except Exception as e:
    print(f"   FAIL: {e}")
    traceback.print_exc()
    sys.exit(1)

print("3. Testing app imports...")
sys.stdout.flush()
try:
    from app.database import Base, engine
    print(f"   OK: App imports work, URL: {engine.url}")
    sys.stdout.flush()
except Exception as e:
    print(f"   FAIL: {e}")
    traceback.print_exc()
    sys.exit(1)

print("4. Testing app engine connect...")
sys.stdout.flush()
try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print(f"   OK: App engine connected")
    sys.stdout.flush()
except Exception as e:
    print(f"   FAIL: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\nAll tests passed!")
sys.stdout.flush()
