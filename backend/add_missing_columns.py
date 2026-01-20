import sqlite3

conn = sqlite3.connect('p2p_platform.db')
cursor = conn.cursor()

# Check existing columns
cursor.execute("PRAGMA table_info(requisitions)")
existing_cols = {row[1] for row in cursor.fetchall()}
print(f"Existing columns: {existing_cols}")

# Define columns that should exist based on model
required_cols = {
    'category': 'VARCHAR(100)',
    'supplier_name': 'VARCHAR(255)',
    'cost_center': 'VARCHAR(20)',
    'gl_account': 'VARCHAR(20)',
    'spend_type': 'VARCHAR(20)',
    'procurement_type': 'VARCHAR(20)',
    'supplier_risk_score': 'INTEGER',
    'supplier_status': 'VARCHAR(20)',
    'contract_on_file': 'BOOLEAN',
    'budget_available': 'FLOAT',
    'budget_impact': 'VARCHAR(100)',
    'requestor_authority_level': 'FLOAT',
    'department_budget_limit': 'FLOAT',
    'prior_approval_reference': 'VARCHAR(50)',
    'supplier_payment_terms': 'VARCHAR(50)',
    'supplier_address': 'VARCHAR(255)',
    'supplier_contact': 'VARCHAR(100)',
    'shipping_method': 'VARCHAR(50)',
    'shipping_address': 'VARCHAR(255)',
    'tax_rate': 'FLOAT',
    'tax_amount': 'FLOAT',
    'po_number': 'VARCHAR(20)',
}

# Add missing columns
for col_name, col_type in required_cols.items():
    if col_name not in existing_cols:
        try:
            cursor.execute(f"ALTER TABLE requisitions ADD COLUMN {col_name} {col_type}")
            print(f"✓ Added column: {col_name}")
        except Exception as e:
            print(f"✗ Failed to add {col_name}: {e}")

conn.commit()
conn.close()
print("\nDone!")
