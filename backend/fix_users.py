"""Fix user records to have proper names and consolidate to test-user-1."""
import sqlite3

conn = sqlite3.connect('p2p_platform.db')
cursor = conn.cursor()

# Update any requisitions with user-001 to use test-user-1
cursor.execute("UPDATE requisitions SET requestor_id = 'test-user-1' WHERE requestor_id = 'user-001'")

conn.commit()

# Verify
cursor.execute("SELECT id, name FROM users")
print("Users:", cursor.fetchall())

cursor.execute("SELECT COUNT(*) FROM requisitions WHERE requestor_id = 'test-user-1'")
print("Requisitions with test-user-1:", cursor.fetchone()[0])

cursor.execute("SELECT COUNT(*) FROM requisitions WHERE requestor_id = 'user-001'")
print("Requisitions with user-001:", cursor.fetchone()[0])

conn.close()
print("Done!")
