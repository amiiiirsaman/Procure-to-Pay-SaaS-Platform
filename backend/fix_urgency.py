"""Fix urgency value."""
import sqlite3

conn = sqlite3.connect('p2p_platform.db')
cursor = conn.cursor()
cursor.execute("UPDATE requisitions SET urgency = 'HIGH' WHERE LOWER(urgency) = 'high'")
print(f'Updated {cursor.rowcount} rows')
conn.commit()
conn.close()
