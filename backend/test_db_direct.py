#!/usr/bin/env python
"""Test if database is readable."""

import sqlite3

try:
    print("Opening database...")
    conn = sqlite3.connect('p2p_platform.db', timeout=10)
    conn.row_factory = sqlite3.Row
    
    print("Querying requisitions table...")
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM requisitions")
    row = cursor.fetchone()
    print(f"Requisitions count: {row['count']}")
    
    cursor.execute("SELECT id, number FROM requisitions LIMIT 5")
    rows = cursor.fetchall()
    for row in rows:
        print(f"  ID: {row['id']}, Number: {row['number']}")
    
    conn.close()
    print("Success!")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
