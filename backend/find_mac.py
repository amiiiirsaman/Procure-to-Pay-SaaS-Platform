import sqlite3

conn = sqlite3.connect('p2p_platform.db')
cursor = conn.cursor()

# Get the Mac laptop requisition
cursor.execute("""
    SELECT id, number, description, department, total_amount, urgency, created_at 
    FROM requisitions 
    WHERE description LIKE '%Mac%' 
    ORDER BY id DESC
""")

rows = cursor.fetchall()
if rows:
    for row in rows:
        print(f"ID: {row[0]}")
        print(f"Number: {row[1]}")
        print(f"Description: {row[2]}")
        print(f"Department: {row[3]}")
        print(f"Amount: ${row[4]:.2f}")
        print(f"Urgency: {row[5]}")
        print(f"Created: {row[6]}")
        print()
else:
    print("No Mac laptop requisition found")
    print("\nRecent requisitions:")
    cursor.execute("SELECT id, number, description, department FROM requisitions ORDER BY id DESC LIMIT 5")
    for row in cursor.fetchall():
        print(f"  {row[0]} | {row[1]} | {row[2][:40]} | {row[3]}")
