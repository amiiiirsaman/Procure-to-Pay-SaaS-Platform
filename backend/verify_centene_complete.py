#!/usr/bin/env python
"""
Final verification that all requisitions have complete Centene data.
Run this to confirm zero missingness across all Centene enterprise fields.
"""
import os
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.models.requisition import Requisition

# All Centene fields that must have non-null values
CENTENE_FIELDS = [
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

def main():
    db = SessionLocal()
    
    print("\n" + "=" * 80)
    print(" CENTENE REQUISITION DATABASE - FINAL VERIFICATION REPORT")
    print("=" * 80)
    
    requisitions = db.query(Requisition).order_by(Requisition.id).all()
    total = len(requisitions)
    
    print(f"\n📊 Total Requisitions: {total}")
    print("-" * 80)
    
    # Statistics
    complete_count = 0
    incomplete_count = 0
    field_missing_counts = {f: 0 for f in CENTENE_FIELDS}
    
    # Department distribution
    dept_counts = {}
    supplier_status_counts = {'preferred': 0, 'known': 0, 'new': 0}
    risk_levels = {'low': 0, 'medium': 0, 'high': 0}
    
    for req in requisitions:
        # Check completeness
        missing = []
        for field in CENTENE_FIELDS:
            val = getattr(req, field, None)
            if val is None or val == "" or val == "N/A":
                missing.append(field)
                field_missing_counts[field] += 1
        
        if missing:
            incomplete_count += 1
        else:
            complete_count += 1
        
        # Track department
        dept = req.department.value if hasattr(req.department, 'value') else str(req.department)
        dept_counts[dept] = dept_counts.get(dept, 0) + 1
        
        # Track supplier status
        if req.supplier_status:
            supplier_status_counts[req.supplier_status] = supplier_status_counts.get(req.supplier_status, 0) + 1
        
        # Track risk levels
        if req.supplier_risk_score:
            if req.supplier_risk_score <= 30:
                risk_levels['low'] += 1
            elif req.supplier_risk_score <= 60:
                risk_levels['medium'] += 1
            else:
                risk_levels['high'] += 1
    
    # Print results
    print(f"\n✅ Complete Records: {complete_count}/{total} ({complete_count/total*100:.1f}%)")
    print(f"❌ Incomplete Records: {incomplete_count}/{total} ({incomplete_count/total*100:.1f}%)")
    
    if incomplete_count > 0:
        print("\n⚠️  FIELDS WITH MISSING DATA:")
        for field, count in field_missing_counts.items():
            if count > 0:
                print(f"   - {field}: {count} records missing")
    else:
        print("\n🎉 ALL CENTENE FIELDS ARE FULLY POPULATED!")
    
    print("\n" + "-" * 80)
    print("📁 DEPARTMENT DISTRIBUTION:")
    for dept, count in sorted(dept_counts.items()):
        print(f"   • {dept}: {count} requisitions")
    
    print("\n🏢 SUPPLIER STATUS DISTRIBUTION:")
    for status, count in sorted(supplier_status_counts.items()):
        print(f"   • {status.upper()}: {count} suppliers")
    
    print("\n⚠️  RISK SCORE DISTRIBUTION:")
    print(f"   • LOW (0-30): {risk_levels['low']} suppliers")
    print(f"   • MEDIUM (31-60): {risk_levels['medium']} suppliers")
    print(f"   • HIGH (61+): {risk_levels['high']} suppliers")
    
    print("\n" + "=" * 80)
    if complete_count == total:
        print(" ✅ DATABASE VERIFICATION: PASSED - No missing values!")
    else:
        print(" ❌ DATABASE VERIFICATION: FAILED - Some values are missing!")
    print("=" * 80 + "\n")
    
    db.close()
    return complete_count == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
