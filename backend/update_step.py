import sqlite3
conn = sqlite3.connect('p2p_platform.db')
cursor = conn.cursor()
cursor.execute('UPDATE requisitions SET current_step = 3 WHERE id = 68')
conn.commit()
print(f'Updated {cursor.rowcount} row(s)')
conn.close()
