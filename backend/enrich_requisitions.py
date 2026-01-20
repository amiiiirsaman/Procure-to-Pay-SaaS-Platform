import sys
import os
import random

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Requisition
from app.data.centene_procurement_data import (
    get_suppliers_by_department,
    get_cost_center,
    get_gl_account,
    DEPARTMENT_CATEGORIES,
)

def enrich_requisitions():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("ENRICHING REQUISITIONS WITH CENTENE DATA")
        print("=" * 60)
        
        requisitions = db.query(Requisition).all()
        print(f"\nFound {len(requisitions)} requisitions to enrich\n")
        
        updated_count = 0
        
        for req in requisitions:
            dept_name = req.department.value if hasattr(req.department, "value") else str(req.department)
            categories = DEPARTMENT_CATEGORIES.get(dept_name, ["Software"])
            category = random.choice(categories)
            suppliers = get_suppliers_by_department(dept_name)
            
            if not suppliers:
                print(f"  Warning: No suppliers for {dept_name}, skipping {req.number}")
                continue
            
            supplier_weights = {"preferred": 50, "known": 30, "new": 20}
            weighted_suppliers = []
            for sup in suppliers:
                weight = supplier_weights.get(sup.get("status", "new"), 20)
                weighted_suppliers.extend([sup] * weight)
            
            supplier = random.choice(weighted_suppliers)
            cost_center = get_cost_center(dept_name)
            gl_account = get_gl_account(dept_name, category)
            
            req.category = category
            req.supplier_name = supplier["name"]
            req.cost_center = cost_center
            req.gl_account = gl_account
            req.spend_type = supplier.get("spend_type", "OPEX")
            req.supplier_risk_score = supplier.get("risk_score", 50)
            req.supplier_status = supplier.get("status", "known")
            req.contract_on_file = supplier.get("contract_active", False)
            req.budget_available = None
            req.budget_impact = "Procurement analysis pending"
            req.requestor_id = "USR-0001"
            
            updated_count += 1
            risk = req.supplier_risk_score
            print(f"  OK {req.number}: {dept_name} -> {category} -> {supplier['name']} (risk: {risk})")
        
        db.commit()
        print("\n" + "=" * 60)
        print(f"ENRICHED {updated_count} REQUISITIONS")
        print("=" * 60)
        
    except Exception as e:
        print(f"\nError: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    enrich_requisitions()
