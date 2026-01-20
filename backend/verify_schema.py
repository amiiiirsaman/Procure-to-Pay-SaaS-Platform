"""Verify database schema."""
from app.database import engine
from sqlalchemy import inspect

inspector = inspect(engine)
print("Tables:", inspector.get_table_names())
print("\nSuppliers columns:")
for col in inspector.get_columns('suppliers'):
    print(f"  {col['name']}: {col['type']}")

print("\nRequisitions columns (selected):")
for col in inspector.get_columns('requisitions'):
    if col['name'] in ['category', 'supplier_name', 'cost_center', 'gl_account', 'spend_type', 
                       'supplier_risk_score', 'supplier_status', 'contract_on_file', 
                       'budget_available', 'budget_impact']:
        print(f"  {col['name']}: {col['type']}")
