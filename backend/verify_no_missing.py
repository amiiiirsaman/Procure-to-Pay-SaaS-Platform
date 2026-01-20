#!/usr/bin/env python
"""Verify all requisitions have complete Centene fields - no missing values."""
import os
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.models.requisition import Requisition

# Fields that must have values (no None/NULL)
REQUIRED_FIELDS = [
    'category',
    'supplier_name',
    'cost_center',
    'gl_account',
    'spend_type',
    'supplier_risk_score',
    'supplier_status',
    'contract_on_file',
    'budget_available',
    'budget_impact',
]

db = SessionLocal()

print("=" * 70)
print("VERIFYING REQUISITIONS - NO MISSING CENTENE FIELDS")
print("=" * 70)

requisitions = db.query(Requisition).order_by(Requisition.id).all()
print(f"Total requisitions: {len(requisitions)}\n")

all_complete = True
missing_summary = {}

for req in requisitions:
    missing_fields = []
    for field in REQUIRED_FIELDS:
        value = getattr(req, field, None)
        if value is None or value == "" or value == "N/A":
            missing_fields.append(field)
    
    if missing_fields:
        all_complete = False
        print(f"❌ {req.number}: Missing {missing_fields}")
        for f in missing_fields:
            missing_summary[f] = missing_summary.get(f, 0) + 1
    else:
        print(f"✓ {req.number}: COMPLETE - {req.category} / {req.supplier_name} ({req.supplier_status})")

print("\n" + "=" * 70)
if all_complete:
    print("✅ ALL REQUISITIONS HAVE COMPLETE CENTENE DATA - NO MISSING VALUES!")
else:
    print("⚠️  SOME REQUISITIONS HAVE MISSING FIELDS:")
    for field, count in sorted(missing_summary.items(), key=lambda x: -x[1]):
        print(f"   - {field}: {count} records")
print("=" * 70)

# Show sample data for verification
print("\n📊 SAMPLE DATA (First 5 records):")
print("-" * 70)
for req in requisitions[:5]:
    print(f"\n{req.number}:")
    print(f"  Department:     {req.department.value if req.department else 'N/A'}")
    print(f"  Category:       {req.category}")
    print(f"  Supplier:       {req.supplier_name}")
    print(f"  Status:         {req.supplier_status}")
    print(f"  Risk Score:     {req.supplier_risk_score}")
    print(f"  Cost Center:    {req.cost_center}")
    print(f"  GL Account:     {req.gl_account}")
    print(f"  Spend Type:     {req.spend_type}")
    print(f"  Contract:       {req.contract_on_file}")
    print(f"  Budget Avail:   ${req.budget_available:,.2f}" if req.budget_available else "  Budget Avail:   N/A")
    print(f"  Budget Impact:  {req.budget_impact}")

db.close()
