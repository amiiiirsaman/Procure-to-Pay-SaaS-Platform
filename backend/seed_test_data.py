"""
Seed script to populate the P2P database with test requisitions at various workflow stages.
This helps verify that all dashboard features are working correctly.
"""
import os
import sys
import random
from datetime import datetime, timedelta

# Add backend to path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.database import SessionLocal, init_db
from app.models import Requisition, RequisitionLineItem, ApprovalStep, User
from app.models.enums import DocumentStatus, Urgency, Department, UserRole


def seed_test_data():
    """Seed the database with test requisitions at various workflow stages."""
    init_db()
    db = SessionLocal()
    
    try:
        # First, ensure we have a test user
        test_user = db.query(User).filter(User.id == "test-user-1").first()
        if not test_user:
            test_user = User(
                id="test-user-1",
                email="test@example.com",
                name="Test User",
                role=UserRole.MANAGER,
                department=Department.OPERATIONS,
                approval_limit=50000.0,
                is_active=True,
            )
            db.add(test_user)
            db.flush()
            print("Created test user: test-user-1")
        
        # Check if we already have test data
        existing_count = db.query(Requisition).filter(
            Requisition.number.like("REQ-TEST-%")
        ).count()
        
        if existing_count >= 10:
            print(f"Database already has {existing_count} test requisitions. Skipping seed.")
            return
        
        print("Seeding test data for dashboard verification...")
        
        # Define test requisitions with various stages
        test_requisitions = [
            {
                "number": "REQ-TEST-001",
                "description": "Office Supplies Q1 - Completed - quarterly order fully processed",
                "status": DocumentStatus.APPROVED,
                "department": Department.OPERATIONS,
                "urgency": Urgency.STANDARD,
                "requestor_id": "test-user-1",
                "total_amount": 2500.00,
                "currency": "USD",
                "current_stage": "completed",
                "flagged_by": None,
                "flag_reason": None,
            },
            {
                "number": "REQ-TEST-002",
                "description": "IT Equipment - HITL Pending (Step 3) - requires VP approval",
                "status": DocumentStatus.PENDING_APPROVAL,
                "department": Department.IT,
                "urgency": Urgency.URGENT,
                "requestor_id": "test-user-1",
                "total_amount": 15000.00,
                "currency": "USD",
                "current_stage": "step_3",
                "flagged_by": "ApprovalChainAgent",
                "flag_reason": "Budget exceeds department limit - requires VP approval",
            },
            {
                "number": "REQ-TEST-003",
                "description": "Marketing Materials - In Progress (Step 5) - trade show promos",
                "status": DocumentStatus.ORDERED,
                "department": Department.MARKETING,
                "urgency": Urgency.STANDARD,
                "requestor_id": "test-user-1",
                "total_amount": 5000.00,
                "currency": "USD",
                "current_stage": "step_5",
                "flagged_by": None,
                "flag_reason": None,
            },
            {
                "number": "REQ-TEST-004",
                "description": "Safety Equipment - HITL Pending (Step 2) - new supplier verification",
                "status": DocumentStatus.PENDING_APPROVAL,
                "department": Department.OPERATIONS,
                "urgency": Urgency.URGENT,
                "requestor_id": "test-user-1",
                "total_amount": 8500.00,
                "currency": "USD",
                "current_stage": "step_2",
                "flagged_by": "RequisitionAgent",
                "flag_reason": "New supplier requires verification before proceeding",
            },
            {
                "number": "REQ-TEST-005",
                "description": "Software Licenses - Completed - annual renewals done",
                "status": DocumentStatus.APPROVED,
                "department": Department.IT,
                "urgency": Urgency.STANDARD,
                "requestor_id": "test-user-1",
                "total_amount": 12000.00,
                "currency": "USD",
                "current_stage": "completed",
                "flagged_by": None,
                "flag_reason": None,
            },
            {
                "number": "REQ-TEST-006",
                "description": "Training Services - In Progress (Step 6) - staff development",
                "status": DocumentStatus.ORDERED,
                "department": Department.HR,
                "urgency": Urgency.STANDARD,
                "requestor_id": "test-user-1",
                "total_amount": 7500.00,
                "currency": "USD",
                "current_stage": "step_6",
                "flagged_by": None,
                "flag_reason": None,
            },
            {
                "number": "REQ-TEST-007",
                "description": "Cloud Services - Rejected - vendor not on approved list",
                "status": DocumentStatus.REJECTED,
                "department": Department.ENGINEERING,
                "urgency": Urgency.URGENT,
                "requestor_id": "test-user-1",
                "total_amount": 25000.00,
                "currency": "USD",
                "current_stage": "step_2_rejected",
                "flagged_by": "ComplianceAgent",
                "flag_reason": "Vendor not on approved list - compliance violation",
            },
            {
                "number": "REQ-TEST-008",
                "description": "Office Furniture - Step 1 - expansion equipment",
                "status": DocumentStatus.PENDING_APPROVAL,
                "department": Department.OPERATIONS,
                "urgency": Urgency.STANDARD,
                "requestor_id": "test-user-1",
                "total_amount": 4500.00,
                "currency": "USD",
                "current_stage": "step_1",
                "flagged_by": None,
                "flag_reason": None,
            },
            {
                "number": "REQ-TEST-009",
                "description": "Consulting Services - In Progress (Step 7) - process improvement",
                "status": DocumentStatus.ORDERED,
                "department": Department.FINANCE,
                "urgency": Urgency.STANDARD,
                "requestor_id": "test-user-1",
                "total_amount": 18000.00,
                "currency": "USD",
                "current_stage": "step_7",
                "flagged_by": None,
                "flag_reason": None,
            },
            {
                "number": "REQ-TEST-010",
                "description": "Lab Equipment - HITL Pending (Step 4) - unusual payment pattern",
                "status": DocumentStatus.ORDERED,
                "department": Department.ENGINEERING,
                "urgency": Urgency.URGENT,
                "requestor_id": "test-user-1",
                "total_amount": 35000.00,
                "currency": "USD",
                "current_stage": "step_4",
                "flagged_by": "FraudAnalysisAgent",
                "flag_reason": "Unusual payment pattern detected - manual review required",
            },
        ]
        
        created_count = 0
        for i, req_data in enumerate(test_requisitions):
            # Check if this requisition already exists
            existing = db.query(Requisition).filter(
                Requisition.number == req_data["number"]
            ).first()
            
            if existing:
                print(f"  Skipping existing: {req_data['number']}")
                continue
            
            # Create the requisition
            req = Requisition(
                number=req_data["number"],
                description=req_data["description"],
                status=req_data["status"],
                department=req_data["department"],
                urgency=req_data["urgency"],
                requestor_id=req_data["requestor_id"],
                total_amount=req_data["total_amount"],
                currency=req_data["currency"],
                current_stage=req_data.get("current_stage"),
                flagged_by=req_data.get("flagged_by"),
                flag_reason=req_data.get("flag_reason"),
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                updated_at=datetime.utcnow(),
            )
            
            db.add(req)
            db.flush()  # Get the ID
            
            # Add a sample line item
            line_item = RequisitionLineItem(
                requisition_id=req.id,
                line_number=1,
                description=f"Sample item for {req.description[:30]}...",
                quantity=random.randint(1, 10),
                unit_of_measure="each",
                unit_price=req_data["total_amount"] / random.randint(1, 5),
                total=req_data["total_amount"],
            )
            db.add(line_item)
            
            created_count += 1
            print(f"  Created: {req_data['number']} - {req_data['description'][:40]}...")
        
        db.commit()
        print(f"\nSuccessfully seeded {created_count} test requisitions!")
        
        # Print summary
        print("\n--- Data Summary ---")
        total = db.query(Requisition).count()
        completed = db.query(Requisition).filter(Requisition.current_stage == "completed").count()
        hitl = db.query(Requisition).filter(Requisition.flagged_by != None).count()
        rejected = db.query(Requisition).filter(Requisition.status == DocumentStatus.REJECTED).count()
        in_progress = db.query(Requisition).filter(
            Requisition.current_stage.like("step_%"),
            Requisition.status != DocumentStatus.REJECTED
        ).count()
        
        print(f"Total Requisitions: {total}")
        print(f"Completed: {completed}")
        print(f"In Progress: {in_progress}")
        print(f"HITL Pending (flagged): {hitl}")
        print(f"Rejected: {rejected}")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_test_data()
