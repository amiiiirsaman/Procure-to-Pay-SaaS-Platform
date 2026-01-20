"""Fix database schema to make title and category nullable."""
import sqlite3
import re

conn = sqlite3.connect('p2p_platform.db')
cursor = conn.cursor()

print('Getting current schema...')
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='requisitions'")
schema = cursor.fetchone()[0]

# Check if NOT NULL constraints exist for title and category
if 'title TEXT NOT NULL' in schema or 'category TEXT NOT NULL' in schema:
    print('Found NOT NULL constraints, fixing...')
    
    # Backup existing data
    print('Backing up existing data...')
    cursor.execute('CREATE TABLE requisitions_backup AS SELECT * FROM requisitions')
    
    # Drop the original table
    cursor.execute('DROP TABLE requisitions')
    print('Dropped original table')
    
    # Modify schema to remove NOT NULL from title and category
    new_schema = schema
    new_schema = re.sub(r'(title\s+TEXT)\s+NOT\s+NULL', r'\1', new_schema)
    new_schema = re.sub(r'(category\s+TEXT)\s+NOT\s+NULL', r'\1', new_schema)
    
    print('Creating table with modified schema...')
    cursor.execute(new_schema)
    
    # Restore data
    cursor.execute('INSERT INTO requisitions SELECT * FROM requisitions_backup')
    print('Restored data')
    
    # Drop backup
    cursor.execute('DROP TABLE requisitions_backup')
    print('Cleaned up backup')
    
    conn.commit()
    print('Schema fixed successfully!')
else:
    print('Schema already correct, no changes needed.')

conn.close()
