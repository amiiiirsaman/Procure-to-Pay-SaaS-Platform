import sqlite3
c = sqlite3.connect('p2p_platform.db').cursor()
c.execute('SELECT DISTINCT department FROM requisitions')
print("Departments:", c.fetchall())
c.execute('SELECT DISTINCT category FROM requisitions')
print("Categories:", c.fetchall())
