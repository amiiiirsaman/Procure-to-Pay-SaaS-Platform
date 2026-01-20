"""Test script to verify Centene data in database."""
import sys
sys.path.insert(0, r"D:\ai_projects\Procure_to_Pay_(P2P)_SaaS_Platform\backend")

from app.database import get_db
from app.models.requisition import Requisition

# Get database session
db = next(get_db())

# Query first 5 requisitions
requisitions = db.query(Requisition).limit(5).all()

print("\n" + "="*70)
print("CENTENE DATA VERIFICATION TEST")
print("="*70)

for req in requisitions:
    print(f"\n{req.number} ({req.department.value if req.department else 'N/A'})")
    print(f"  Category:      {req.category or 'NOT SET'}")
    print(f"  Supplier:      {req.supplier_name or 'NOT SET'}")
    print(f"  Risk Score:    {req.supplier_risk_score if req.supplier_risk_score is not None else 'NOT SET'}")
    print(f"  Status:        {req.supplier_status or 'NOT SET'}")
    print(f"  Cost Center:   {req.cost_center or 'NOT SET'}")
    print(f"  GL Account:    {req.gl_account or 'NOT SET'}")
    print(f"  Spend Type:    {req.spend_type or 'NOT SET'}")
    print(f"  Contract:      {req.contract_on_file if req.contract_on_file is not None else 'NOT SET'}")

print("\n" + "="*70)
print(f"✅ Total requisitions in database: {db.query(Requisition).count()}")
enriched_count = db.query(Requisition).filter(Requisition.category.isnot(None)).count()
print(f"✅ Requisitions with Centene data: {enriched_count}")
print("="*70 + "\n")

db.close()
