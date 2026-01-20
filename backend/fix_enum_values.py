"""Fix database enum values to use enum names instead of values."""
import sqlite3

conn = sqlite3.connect('p2p_platform.db')
cursor = conn.cursor()

# Map status values to enum names
status_map = {
    'draft': 'DRAFT',
    'pending_approval': 'PENDING_APPROVAL',
    'under_review': 'UNDER_REVIEW',
    'approved': 'APPROVED',
    'rejected': 'REJECTED',
    'ordered': 'ORDERED',
    'shipped': 'SHIPPED',
    'delivered': 'DELIVERED',
    'partially_received': 'PARTIALLY_RECEIVED',
    'received': 'RECEIVED',
    'invoiced': 'INVOICED',
    'matched': 'MATCHED',
    'mismatch': 'MISMATCH',
    'exception': 'EXCEPTION',
    'awaiting_final_approval': 'AWAITING_FINAL_APPROVAL',
    'final_approved': 'FINAL_APPROVED',
    'paid': 'PAID',
    'cancelled': 'CANCELLED',
    'closed': 'CLOSED',
}

# Map department values to enum names
department_map = {
    'finance': 'FINANCE',
    'operations': 'OPERATIONS',
    'hr': 'HR',
    'it': 'IT',
    'marketing': 'MARKETING',
    'facilities': 'FACILITIES',
    'legal': 'LEGAL',
    'r&d': 'RD',
    'engineering': 'ENGINEERING',
    'sales': 'SALES',
    'procurement': 'PROCUREMENT',
}

# Map urgency values to enum names
urgency_map = {
    'standard': 'STANDARD',
    'urgent': 'URGENT',
    'emergency': 'EMERGENCY',
}

print("Current values in requisitions:")
cursor.execute("SELECT DISTINCT status FROM requisitions")
print("Status:", cursor.fetchall())
cursor.execute("SELECT DISTINCT department FROM requisitions")
print("Department:", cursor.fetchall())
cursor.execute("SELECT DISTINCT urgency FROM requisitions")
print("Urgency:", cursor.fetchall())

# Fix status values
for old_val, new_val in status_map.items():
    cursor.execute("UPDATE requisitions SET status = ? WHERE LOWER(status) = ?", (new_val, old_val))
    if cursor.rowcount > 0:
        print(f'Status: {old_val} -> {new_val}: {cursor.rowcount} rows')

# Fix department values
for old_val, new_val in department_map.items():
    cursor.execute("UPDATE requisitions SET department = ? WHERE LOWER(department) = ?", (new_val, old_val))
    if cursor.rowcount > 0:
        print(f'Department: {old_val} -> {new_val}: {cursor.rowcount} rows')

# Fix urgency values
for old_val, new_val in urgency_map.items():
    cursor.execute("UPDATE requisitions SET urgency = ? WHERE LOWER(urgency) = ?", (new_val, old_val))
    if cursor.rowcount > 0:
        print(f'Urgency: {old_val} -> {new_val}: {cursor.rowcount} rows')

conn.commit()

print("\nAfter update:")
cursor.execute("SELECT DISTINCT status FROM requisitions")
print("Status:", cursor.fetchall())
cursor.execute("SELECT DISTINCT department FROM requisitions")
print("Department:", cursor.fetchall())
cursor.execute("SELECT DISTINCT urgency FROM requisitions")
print("Urgency:", cursor.fetchall())

conn.close()
print('\nDone!')
