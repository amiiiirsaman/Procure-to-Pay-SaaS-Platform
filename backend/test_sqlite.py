import sqlite3
conn = sqlite3.connect('d:/ai_projects/Procure_to_Pay_(P2P)_SaaS_Platform/backend/p2p_platform.db')
result = conn.execute('SELECT COUNT(*) FROM requisitions').fetchone()
print(f"Count: {result}")
conn.close()
