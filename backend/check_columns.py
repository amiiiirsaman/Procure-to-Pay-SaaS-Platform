import sqlite3
import os

db_path = "p2p_platform.db"
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=== REQUISITIONS TABLE COLUMNS ===")
cursor.execute("PRAGMA table_info(requisitions)")
cols = cursor.fetchall()
for col in cols:
    col_id, col_name, col_type, not_null, default, pk = col
    print(f"  {col_id:2d}. {col_name:20s} {col_type:15s} {'NOT NULL' if not_null else ''}")

conn.close()
