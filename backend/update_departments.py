"""Script to update department values to Title Case."""
import sqlite3

conn = sqlite3.connect('p2p_platform.db')
cursor = conn.cursor()

results = []

# Check current department values
cursor.execute('SELECT DISTINCT department FROM requisitions')
results.append(f'Current departments: {cursor.fetchall()}')

# Update departments to Title Case
updates = [
    ('Finance', 'finance'),
    ('Finance', 'FINANCE'),
    ('Operations', 'operations'),
    ('Operations', 'OPERATIONS'),
    ('HR', 'hr'),
    ('IT', 'it'),
    ('Marketing', 'marketing'),
    ('Marketing', 'MARKETING'),
    ('Facilities', 'facilities'),
    ('Facilities', 'FACILITIES'),
]

for new_val, old_val in updates:
    cursor.execute(
        'UPDATE requisitions SET department = ? WHERE LOWER(department) = LOWER(?)',
        (new_val, old_val)
    )
    if cursor.rowcount > 0:
        results.append(f'Updated {cursor.rowcount} rows from {old_val} to {new_val}')

conn.commit()

# Verify
cursor.execute('SELECT DISTINCT department FROM requisitions')
results.append(f'After update: {cursor.fetchall()}')

# Also check categories
cursor.execute('SELECT DISTINCT category FROM requisitions')
results.append(f'Categories: {cursor.fetchall()}')

conn.close()
results.append('Done!')

# Write results to file
with open('update_results.txt', 'w') as f:
    f.write('\n'.join(results))
print('\n'.join(results))
