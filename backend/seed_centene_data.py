"""
Seed script for Centene Procurement Dataset.
Populates suppliers and department budgets only. Does NOT modify existing requisitions.
"""

import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, init_db, engine
from app.models import Supplier, Department
from app.models.budget import DepartmentBudget
from app.data.centene_procurement_data import (
    SUPPLIERS,
    DEPARTMENT_BUDGETS,
)

# Map string to enum
DEPT_MAP = {
    "IT": Department.IT,
    "Finance": Department.FINANCE,
    "Operations": Department.OPERATIONS,
    "HR": Department.HR,
    "Marketing": Department.MARKETING,
    "Facilities": Department.FACILITIES,
}


def seed_suppliers(db):
    """Seed suppliers from Centene dataset."""
    print("\n=== Seeding Suppliers ===")
    
    for i, supplier_data in enumerate(SUPPLIERS, 1):
        supplier_id = f"SUP-{i:04d}"
        
        # Check if supplier exists
        existing = db.query(Supplier).filter(Supplier.name == supplier_data["name"]).first()
        if existing:
            # Update existing
            existing.department = supplier_data["department"]
            existing.category = supplier_data["category"]
            existing.risk_score = supplier_data["risk_score"]
            existing.vendor_status = supplier_data["status"]
            existing.contract_active = supplier_data["contract_active"]
            existing.spend_type = supplier_data["spend_type"]
            if supplier_data["contract_end_date"]:
                existing.contract_end_date = datetime.strptime(
                    supplier_data["contract_end_date"], "%Y-%m-%d"
                ).date()
            print(f"  Updated: {supplier_data['name']}")
        else:
            # Create new
            contract_end = None
            if supplier_data["contract_end_date"]:
                contract_end = datetime.strptime(
                    supplier_data["contract_end_date"], "%Y-%m-%d"
                ).date()
            
            supplier = Supplier(
                id=supplier_id,
                name=supplier_data["name"],
                department=supplier_data["department"],
                category=supplier_data["category"],
                risk_score=supplier_data["risk_score"],
                vendor_status=supplier_data["status"],
                contract_active=supplier_data["contract_active"],
                contract_end_date=contract_end,
                spend_type=supplier_data["spend_type"],
                status="active",
            )
            db.add(supplier)
            print(f"  Created: {supplier_data['name']} ({supplier_data['status']}, risk={supplier_data['risk_score']})")
    
    db.commit()
    print(f"\n  Total suppliers: {len(SUPPLIERS)}")


def seed_budgets(db):
    """Seed department budgets from Centene dataset."""
    print("\n=== Seeding Department Budgets ===")
    
    for dept_name, budget_data in DEPARTMENT_BUDGETS.items():
        dept_enum = DEPT_MAP.get(dept_name)
        if not dept_enum:
            print(f"  Skipping unknown department: {dept_name}")
            continue
        
        annual_total = budget_data.get("annual_total", 0)
        
        for quarter in ["Q1", "Q2", "Q3", "Q4"]:
            q_data = budget_data.get(quarter, {})
            if not q_data:
                continue
            
            # Check if exists
            existing = db.query(DepartmentBudget).filter(
                DepartmentBudget.department == dept_enum,
                DepartmentBudget.fiscal_year == 2026,
                DepartmentBudget.quarter == quarter,
            ).first()
            
            if existing:
                existing.allocated = q_data["allocated"]
                existing.spent = q_data["spent"]
                existing.remaining = q_data["remaining"]
                existing.annual_allocated = annual_total
                print(f"  Updated: {dept_name} {quarter}")
            else:
                budget = DepartmentBudget(
                    department=dept_enum,
                    fiscal_year=2026,
                    quarter=quarter,
                    allocated=q_data["allocated"],
                    spent=q_data["spent"],
                    remaining=q_data["remaining"],
                    annual_allocated=annual_total,
                )
                db.add(budget)
                print(f"  Created: {dept_name} {quarter} - ${q_data['remaining']:,.0f} remaining")
    
    db.commit()
    print(f"\n  Total budget records: {len(DEPARTMENT_BUDGETS) * 4}")


def create_tables():
    """Create any missing tables."""
    from app.models.budget import DepartmentBudget
    from app.database import Base
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    print("Database tables created/verified.")


def main():
    """Main seed function."""
    print("=" * 60)
    print("CENTENE PROCUREMENT DATASET SEED")
    print("=" * 60)
    
    # Initialize database
    init_db()
    create_tables()
    
    db = SessionLocal()
    try:
        seed_suppliers(db)
        seed_budgets(db)
        
        print("\n" + "=" * 60)
        print("SEED COMPLETE!")
        print("=" * 60)
        
        # Summary
        supplier_count = db.query(Supplier).count()
        budget_count = db.query(DepartmentBudget).count()
        print(f"\nDatabase Summary:")
        print(f"  Suppliers: {supplier_count}")
        print(f"  Budget Records: {budget_count}")
        
    except Exception as e:
        print(f"\nError: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
