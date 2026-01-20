import sqlite3
import os

os.chdir(r"D:\ai_projects\Procure_to_Pay_(P2P)_SaaS_Platform\backend")
print(f"CWD: {os.getcwd()}")

print("Connecting to database...")
conn = sqlite3.connect("p2p_test.db")
print("Connected!")

cursor = conn.cursor()
cursor.execute("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)")
print("Table created!")

conn.commit()
conn.close()
print("Done!")

# Check file
import os
print(f"File exists: {os.path.exists('p2p_test.db')}")
