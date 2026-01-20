#!/usr/bin/env python
"""Add P2P agent fields to existing requisitions table using ALTER TABLE."""
import os
import sys
import sqlite3

backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)

DB_PATH = os.path.join(backend_dir, "p2p_platform.db")

# New columns to add (column_name, type, default)
NEW_COLUMNS = [
    # Step 2: Approval Agent fields
    ("requestor_authority_level", "REAL", None),
    ("department_budget_limit", "REAL", None),
    ("prior_approval_reference", "VARCHAR(50)", None),
    
    # Step 3: PO Generation Agent fields
    ("supplier_payment_terms", "VARCHAR(50)", None),
    ("supplier_address", "VARCHAR(255)", None),
    ("supplier_contact", "VARCHAR(100)", None),
    ("shipping_method", "VARCHAR(50)", None),
    ("shipping_address", "VARCHAR(255)", None),
    ("tax_rate", "REAL", None),
    ("tax_amount", "REAL", None),
    ("po_number", "VARCHAR(20)", None),
    
    # Step 4: Goods Receipt Agent fields
    ("received_quantity", "INTEGER", None),
    ("received_date", "DATE", None),
    ("quality_status", "VARCHAR(20)", None),
    ("damage_notes", "TEXT", None),
    ("receiver_id", "VARCHAR(50)", None),
    ("warehouse_location", "VARCHAR(50)", None),
    
    # Step 5: Invoice Validation Agent fields
    ("invoice_number", "VARCHAR(50)", None),
    ("invoice_date", "DATE", None),
    ("invoice_amount", "REAL", None),
    ("invoice_due_date", "DATE", None),
    ("invoice_file_url", "VARCHAR(255)", None),
    ("three_way_match_status", "VARCHAR(20)", None),
    
    # Step 6: Fraud Analysis Agent fields
    ("supplier_bank_account", "VARCHAR(50)", None),
    ("supplier_bank_account_changed_date", "DATE", None),
    ("supplier_ein", "VARCHAR(20)", None),
    ("supplier_years_in_business", "INTEGER", None),
    ("requester_vendor_relationship", "VARCHAR(100)", None),
    ("similar_transactions_count", "INTEGER", None),
    ("fraud_risk_score", "INTEGER", None),
    ("fraud_indicators", "TEXT", None),
    
    # Step 7: Compliance Agent fields
    ("approver_chain", "TEXT", None),
    ("required_documents", "TEXT", None),
    ("attached_documents", "TEXT", None),
    ("quotes_attached", "INTEGER", None),
    ("contract_id", "VARCHAR(50)", None),
    ("contract_expiry", "DATE", None),
    ("audit_trail", "TEXT", None),
    ("policy_exceptions", "TEXT", None),
    ("segregation_of_duties_ok", "BOOLEAN", None),
    
    # Step 9: Payment Agent fields
    ("supplier_bank_name", "VARCHAR(100)", None),
    ("supplier_routing_number", "VARCHAR(20)", None),
    ("supplier_swift_code", "VARCHAR(20)", None),
    ("payment_method", "VARCHAR(20)", None),
    ("payment_scheduled_date", "DATE", None),
    ("payment_transaction_id", "VARCHAR(50)", None),
    ("payment_status", "VARCHAR(20)", None),
    
    # Historical Fraud Analysis fields
    ("past_transactions_clean", "BOOLEAN", "1"),
    ("fraud_history_score", "INTEGER", "0"),
    ("past_transaction_count", "INTEGER", None),
    ("past_issues_count", "INTEGER", "0"),
]

def get_existing_columns(cursor, table_name):
    """Get list of existing columns in a table."""
    cursor.execute(f"PRAGMA table_info({table_name})")
    return [row[1] for row in cursor.fetchall()]

def migrate():
    """Add new columns to requisitions table."""
    print("=" * 60)
    print("MIGRATING DATABASE: Adding P2P Agent Fields")
    print("=" * 60)
    print(f"Database: {DB_PATH}\n")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    existing_columns = get_existing_columns(cursor, "requisitions")
    print(f"Existing columns: {len(existing_columns)}")
    
    added = 0
    skipped = 0
    
    for col_name, col_type, default in NEW_COLUMNS:
        if col_name in existing_columns:
            print(f"  SKIP: {col_name} (already exists)")
            skipped += 1
        else:
            try:
                if default is not None:
                    sql = f"ALTER TABLE requisitions ADD COLUMN {col_name} {col_type} DEFAULT {default}"
                else:
                    sql = f"ALTER TABLE requisitions ADD COLUMN {col_name} {col_type}"
                cursor.execute(sql)
                print(f"  ADD:  {col_name} ({col_type})")
                added += 1
            except Exception as e:
                print(f"  ERROR: {col_name} - {e}")
    
    conn.commit()
    conn.close()
    
    print("\n" + "=" * 60)
    print(f"✅ Migration complete: {added} added, {skipped} skipped")
    print("=" * 60)

if __name__ == "__main__":
    migrate()
