"""Initialize the database."""
import sys
import traceback

try:
    from app.database import init_db
    init_db()
    print("Database initialized successfully!")
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    traceback.print_exc()
    sys.exit(1)
