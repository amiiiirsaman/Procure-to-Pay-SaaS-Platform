"""
Seed script to populate the database with 30 requisitions matching the frontend mock data.
Run this script to initialize the database with realistic test data.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
from app.database import SessionLocal, init_db
from app.models import (
    Requisition, RequisitionLineItem, User, Supplier, Product,
    DocumentStatus, Department, Urgency
)

# Initialize database
init_db()

# Requisition data matching the frontend MOCK_REQUISITIONS
REQUISITIONS_DATA = [
    # === FINANCE DEPARTMENT (8 records) ===
    {
        "number": "REQ-000001",
        "title": "Q1 Financial Audit",
        "requestor_name": "Jennifer Adams",
        "department": Department.FINANCE,
        "amount": 75000,
        "status": DocumentStatus.CLOSED,
        "urgency": Urgency.URGENT,
        "created_at": "2026-01-05",
        "supplier": "Deloitte",
        "category": "Professional Services",
        "current_step": 9,
        "current_stage": "payment_completed",
        "description": "Annual financial audit and SOX compliance review.",
        "justification": "Required annual audit for regulatory compliance and investor reporting.",
    },
    {
        "number": "REQ-000002",
        "title": "Accounting Software Renewal",
        "requestor_name": "Robert Martinez",
        "department": Department.FINANCE,
        "amount": 45000,
        "status": DocumentStatus.CLOSED,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-06",
        "supplier": "SAP",
        "category": "Software",
        "current_step": 9,
        "current_stage": "payment_completed",
        "description": "SAP S/4HANA license renewal for finance team.",
        "justification": "Critical ERP system for all financial operations.",
    },
    {
        "number": "REQ-000003",
        "title": "Tax Compliance System",
        "requestor_name": "Jennifer Adams",
        "department": Department.FINANCE,
        "amount": 28000,
        "status": DocumentStatus.CLOSED,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-07",
        "supplier": "Thomson Reuters",
        "category": "Software",
        "current_step": 9,
        "current_stage": "payment_completed",
        "description": "Tax compliance and reporting software subscription.",
        "justification": "Required for multi-state tax compliance.",
    },
    {
        "number": "REQ-000004",
        "title": "Budget Forecasting Tools",
        "requestor_name": "Robert Martinez",
        "department": Department.FINANCE,
        "amount": 15000,
        "status": DocumentStatus.CLOSED,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-08",
        "supplier": "Adaptive Insights",
        "category": "Software",
        "current_step": 9,
        "current_stage": "payment_completed",
        "description": "Cloud-based budgeting and forecasting platform.",
        "justification": "Enables real-time financial planning and analysis.",
    },
    {
        "number": "REQ-000005",
        "title": "Expense Management System",
        "requestor_name": "Jennifer Adams",
        "department": Department.FINANCE,
        "amount": 22000,
        "status": DocumentStatus.CLOSED,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-09",
        "supplier": "Concur",
        "category": "Software",
        "current_step": 9,
        "current_stage": "payment_completed",
        "description": "Employee expense tracking and reimbursement system.",
        "justification": "Streamlines expense reporting and approval workflows.",
    },
    {
        "number": "REQ-000006",
        "title": "Financial Consulting Services",
        "requestor_name": "Robert Martinez",
        "department": Department.FINANCE,
        "amount": 95000,
        "status": DocumentStatus.PENDING_APPROVAL,
        "urgency": Urgency.URGENT,
        "created_at": "2026-01-10",
        "supplier": "McKinsey",
        "category": "Professional Services",
        "current_step": 6,
        "current_stage": "step_6",
        "description": "Strategic financial advisory for M&A activities.",
        "justification": "Required expert guidance for potential acquisition.",
        "flagged": True,
        "flag_reason": "High-value engagement requires executive approval",
    },
    {
        "number": "REQ-000007",
        "title": "Treasury Management Platform",
        "requestor_name": "Jennifer Adams",
        "department": Department.FINANCE,
        "amount": 67000,
        "status": DocumentStatus.PENDING_APPROVAL,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-11",
        "supplier": "Kyriba",
        "category": "Software",
        "current_step": 4,
        "current_stage": "step_4",
        "description": "Cash management and treasury operations platform.",
        "justification": "Improves cash visibility and liquidity management.",
        "flagged": True,
        "flag_reason": "New vendor requires security assessment",
    },
    {
        "number": "REQ-000008",
        "title": "Audit Documentation Services",
        "requestor_name": "Robert Martinez",
        "department": Department.FINANCE,
        "amount": 18000,
        "status": DocumentStatus.REJECTED,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-12",
        "supplier": "PwC",
        "category": "Professional Services",
        "current_step": 2,
        "current_stage": "step_2",
        "description": "External audit documentation preparation.",
        "justification": "Support for annual audit process.",
        "flagged": True,
        "flag_reason": "Duplicate request - similar service already contracted",
    },
    # === IT DEPARTMENT (8 records) ===
    {
        "number": "REQ-000009",
        "title": "Cloud Infrastructure Upgrade",
        "requestor_name": "Michael Chen",
        "department": Department.IT,
        "amount": 125000,
        "status": DocumentStatus.CLOSED,
        "urgency": Urgency.URGENT,
        "created_at": "2026-01-05",
        "supplier": "Amazon Web Services",
        "category": "Cloud Services",
        "current_step": 9,
        "current_stage": "payment_completed",
        "description": "AWS infrastructure expansion for new applications.",
        "justification": "Support growing application demands and DR requirements.",
    },
    {
        "number": "REQ-000010",
        "title": "Cybersecurity Assessment",
        "requestor_name": "Sarah Johnson",
        "department": Department.IT,
        "amount": 85000,
        "status": DocumentStatus.CLOSED,
        "urgency": Urgency.URGENT,
        "created_at": "2026-01-06",
        "supplier": "CrowdStrike",
        "category": "Security Services",
        "current_step": 9,
        "current_stage": "payment_completed",
        "description": "Comprehensive security audit and penetration testing.",
        "justification": "Annual security compliance requirement.",
    },
    {
        "number": "REQ-000011",
        "title": "Developer Workstations",
        "requestor_name": "Michael Chen",
        "department": Department.IT,
        "amount": 48000,
        "status": DocumentStatus.CLOSED,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-07",
        "supplier": "Dell Technologies",
        "category": "Hardware",
        "current_step": 9,
        "current_stage": "payment_completed",
        "description": "High-performance workstations for development team.",
        "justification": "Replace aging hardware for improved productivity.",
    },
    {
        "number": "REQ-000012",
        "title": "Network Equipment Refresh",
        "requestor_name": "Sarah Johnson",
        "department": Department.IT,
        "amount": 156000,
        "status": DocumentStatus.UNDER_REVIEW,
        "urgency": Urgency.URGENT,
        "created_at": "2026-01-08",
        "supplier": "Cisco",
        "category": "Hardware",
        "current_step": 5,
        "current_stage": "step_5",
        "description": "Core network switch and router replacement.",
        "justification": "End-of-life equipment replacement for network reliability.",
    },
    {
        "number": "REQ-000013",
        "title": "Software Development Tools",
        "requestor_name": "Michael Chen",
        "department": Department.IT,
        "amount": 32000,
        "status": DocumentStatus.UNDER_REVIEW,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-09",
        "supplier": "JetBrains",
        "category": "Software",
        "current_step": 3,
        "current_stage": "step_3",
        "description": "IDE licenses and development tool subscriptions.",
        "justification": "Annual renewal of essential development tools.",
    },
    {
        "number": "REQ-000014",
        "title": "Data Center Cooling System",
        "requestor_name": "Sarah Johnson",
        "department": Department.IT,
        "amount": 78000,
        "status": DocumentStatus.PENDING_APPROVAL,
        "urgency": Urgency.URGENT,
        "created_at": "2026-01-10",
        "supplier": "Schneider Electric",
        "category": "Infrastructure",
        "current_step": 6,
        "current_stage": "step_6",
        "description": "Upgraded cooling system for server room.",
        "justification": "Prevent overheating issues during peak loads.",
        "flagged": True,
        "flag_reason": "Requires facilities coordination",
    },
    {
        "number": "REQ-000015",
        "title": "AI/ML Platform Subscription",
        "requestor_name": "Michael Chen",
        "department": Department.IT,
        "amount": 92000,
        "status": DocumentStatus.PENDING_APPROVAL,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-11",
        "supplier": "Databricks",
        "category": "Cloud Services",
        "current_step": 4,
        "current_stage": "step_4",
        "description": "Machine learning platform for data science team.",
        "justification": "Enable advanced analytics and AI capabilities.",
        "flagged": True,
        "flag_reason": "New technology requires architecture review",
    },
    {
        "number": "REQ-000016",
        "title": "Legacy System Migration",
        "requestor_name": "Sarah Johnson",
        "department": Department.IT,
        "amount": 145000,
        "status": DocumentStatus.REJECTED,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-12",
        "supplier": "Accenture",
        "category": "Professional Services",
        "current_step": 2,
        "current_stage": "step_2",
        "description": "Consulting for legacy application modernization.",
        "justification": "Reduce technical debt and maintenance costs.",
        "flagged": True,
        "flag_reason": "Budget reallocation required - deferred to Q2",
    },
    # === OPERATIONS DEPARTMENT (7 records) ===
    {
        "number": "REQ-000017",
        "title": "Warehouse Management System",
        "requestor_name": "David Wilson",
        "department": Department.OPERATIONS,
        "amount": 68000,
        "status": DocumentStatus.CLOSED,
        "urgency": Urgency.URGENT,
        "created_at": "2026-01-05",
        "supplier": "Manhattan Associates",
        "category": "Software",
        "current_step": 9,
        "current_stage": "payment_completed",
        "description": "WMS implementation for distribution center.",
        "justification": "Improve inventory accuracy and fulfillment speed.",
    },
    {
        "number": "REQ-000018",
        "title": "Fleet Vehicle Maintenance",
        "requestor_name": "Lisa Brown",
        "department": Department.OPERATIONS,
        "amount": 42000,
        "status": DocumentStatus.CLOSED,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-06",
        "supplier": "Penske",
        "category": "Services",
        "current_step": 9,
        "current_stage": "payment_completed",
        "description": "Annual maintenance contract for delivery fleet.",
        "justification": "Ensure fleet reliability and safety compliance.",
    },
    {
        "number": "REQ-000019",
        "title": "Packaging Equipment",
        "requestor_name": "David Wilson",
        "department": Department.OPERATIONS,
        "amount": 55000,
        "status": DocumentStatus.UNDER_REVIEW,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-08",
        "supplier": "Sealed Air",
        "category": "Equipment",
        "current_step": 4,
        "current_stage": "step_4",
        "description": "Automated packaging machines for fulfillment.",
        "justification": "Increase packaging throughput by 40%.",
    },
    {
        "number": "REQ-000020",
        "title": "Safety Equipment Order",
        "requestor_name": "Lisa Brown",
        "department": Department.OPERATIONS,
        "amount": 18500,
        "status": DocumentStatus.UNDER_REVIEW,
        "urgency": Urgency.URGENT,
        "created_at": "2026-01-09",
        "supplier": "Grainger",
        "category": "Safety",
        "current_step": 3,
        "current_stage": "step_3",
        "description": "PPE and safety equipment for warehouse staff.",
        "justification": "OSHA compliance and employee safety.",
    },
    {
        "number": "REQ-000021",
        "title": "Forklift Fleet Expansion",
        "requestor_name": "David Wilson",
        "department": Department.OPERATIONS,
        "amount": 89000,
        "status": DocumentStatus.PENDING_APPROVAL,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-10",
        "supplier": "Toyota Material Handling",
        "category": "Equipment",
        "current_step": 5,
        "current_stage": "step_5",
        "description": "Additional forklifts for expanded warehouse.",
        "justification": "Support increased warehouse capacity.",
        "flagged": True,
        "flag_reason": "Capital expenditure requires CFO approval",
    },
    {
        "number": "REQ-000022",
        "title": "Quality Control Equipment",
        "requestor_name": "Lisa Brown",
        "department": Department.OPERATIONS,
        "amount": 34000,
        "status": DocumentStatus.PENDING_APPROVAL,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-11",
        "supplier": "Keyence",
        "category": "Equipment",
        "current_step": 4,
        "current_stage": "step_4",
        "description": "Automated inspection systems for QC.",
        "justification": "Reduce defect rate and improve quality metrics.",
        "flagged": True,
        "flag_reason": "Technical specifications need validation",
    },
    {
        "number": "REQ-000023",
        "title": "Logistics Consulting",
        "requestor_name": "David Wilson",
        "department": Department.OPERATIONS,
        "amount": 52000,
        "status": DocumentStatus.REJECTED,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-12",
        "supplier": "DHL Consulting",
        "category": "Professional Services",
        "current_step": 2,
        "current_stage": "step_2",
        "description": "Supply chain optimization consulting.",
        "justification": "Identify cost reduction opportunities.",
        "flagged": True,
        "flag_reason": "Scope overlap with existing project",
    },
    # === MARKETING DEPARTMENT (4 records) ===
    {
        "number": "REQ-000024",
        "title": "Digital Marketing Campaign",
        "requestor_name": "Emily Taylor",
        "department": Department.MARKETING,
        "amount": 65000,
        "status": DocumentStatus.CLOSED,
        "urgency": Urgency.URGENT,
        "created_at": "2026-01-06",
        "supplier": "WPP",
        "category": "Marketing Services",
        "current_step": 9,
        "current_stage": "payment_completed",
        "description": "Q1 digital advertising and social media campaign.",
        "justification": "Drive brand awareness and lead generation.",
    },
    {
        "number": "REQ-000025",
        "title": "Marketing Analytics Platform",
        "requestor_name": "James Anderson",
        "department": Department.MARKETING,
        "amount": 38000,
        "status": DocumentStatus.UNDER_REVIEW,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-08",
        "supplier": "HubSpot",
        "category": "Software",
        "current_step": 4,
        "current_stage": "step_4",
        "description": "Marketing automation and analytics subscription.",
        "justification": "Improve campaign tracking and ROI measurement.",
    },
    {
        "number": "REQ-000026",
        "title": "Trade Show Booth",
        "requestor_name": "Emily Taylor",
        "department": Department.MARKETING,
        "amount": 28000,
        "status": DocumentStatus.PENDING_APPROVAL,
        "urgency": Urgency.URGENT,
        "created_at": "2026-01-10",
        "supplier": "Exhibit Systems",
        "category": "Marketing Materials",
        "current_step": 3,
        "current_stage": "step_3",
        "description": "Custom booth design for industry conference.",
        "justification": "Flagship event for lead generation.",
        "flagged": True,
        "flag_reason": "Design approval pending from brand team",
    },
    {
        "number": "REQ-000027",
        "title": "Brand Refresh Project",
        "requestor_name": "James Anderson",
        "department": Department.MARKETING,
        "amount": 120000,
        "status": DocumentStatus.REJECTED,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-12",
        "supplier": "Pentagram",
        "category": "Creative Services",
        "current_step": 2,
        "current_stage": "step_2",
        "description": "Complete brand identity redesign.",
        "justification": "Modernize brand for market repositioning.",
        "flagged": True,
        "flag_reason": "Deferred pending strategic review",
    },
    # === HR DEPARTMENT (3 records) ===
    {
        "number": "REQ-000028",
        "title": "HR Management System",
        "requestor_name": "Patricia Moore",
        "department": Department.HR,
        "amount": 55000,
        "status": DocumentStatus.CLOSED,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-07",
        "supplier": "Workday",
        "category": "Software",
        "current_step": 9,
        "current_stage": "payment_completed",
        "description": "HRIS platform annual subscription.",
        "justification": "Core HR operations and employee management.",
    },
    {
        "number": "REQ-000029",
        "title": "Employee Training Program",
        "requestor_name": "Thomas Garcia",
        "department": Department.HR,
        "amount": 32000,
        "status": DocumentStatus.UNDER_REVIEW,
        "urgency": Urgency.STANDARD,
        "created_at": "2026-01-09",
        "supplier": "LinkedIn Learning",
        "category": "Training",
        "current_step": 3,
        "current_stage": "step_3",
        "description": "Company-wide learning platform subscription.",
        "justification": "Employee development and skill building.",
    },
    {
        "number": "REQ-000030",
        "title": "Recruitment Agency Services",
        "requestor_name": "Patricia Moore",
        "department": Department.HR,
        "amount": 75000,
        "status": DocumentStatus.PENDING_APPROVAL,
        "urgency": Urgency.URGENT,
        "created_at": "2026-01-11",
        "supplier": "Robert Half",
        "category": "Professional Services",
        "current_step": 5,
        "current_stage": "step_5",
        "description": "Executive search and recruitment services.",
        "justification": "Fill critical leadership positions.",
        "flagged": True,
        "flag_reason": "Requires executive committee approval for exec hire",
    },
]


def seed_requisitions():
    """Seed the database with 30 requisitions."""
    db = SessionLocal()
    
    try:
        # First, check if we already have requisitions
        existing_count = db.query(Requisition).count()
        print(f"Existing requisitions in database: {existing_count}")
        
        # Delete existing requisitions to start fresh
        if existing_count > 0:
            print("Clearing existing requisitions...")
            db.query(RequisitionLineItem).delete()
            db.query(Requisition).delete()
            db.commit()
            print("Cleared existing data.")
        
        # Get or create a default user
        default_user = db.query(User).first()
        if not default_user:
            default_user = User(
                id="user-001",
                email="james.wilson@company.com",
                name="James Wilson",
                role="procurement_manager",
                department=Department.operations,
            )
            db.add(default_user)
            db.commit()
            print("Created default user: James Wilson")
        
        # Get or create suppliers
        suppliers = {}
        supplier_counter = 1
        for req_data in REQUISITIONS_DATA:
            supplier_name = req_data["supplier"]
            if supplier_name not in suppliers:
                existing = db.query(Supplier).filter(Supplier.name == supplier_name).first()
                if not existing:
                    supplier_id = f"SUP-{supplier_counter:03d}"
                    supplier = Supplier(
                        id=supplier_id,
                        name=supplier_name,
                        contact_email=f"contact@{supplier_name.lower().replace(' ', '')}.com",
                        status="active",
                    )
                    db.add(supplier)
                    db.flush()
                    suppliers[supplier_name] = supplier
                    supplier_counter += 1
                else:
                    suppliers[supplier_name] = existing
        db.commit()
        print(f"Ensured {len(suppliers)} suppliers exist.")
        
        # Create requisitions
        for i, req_data in enumerate(REQUISITIONS_DATA, start=1):
            # Parse date
            created_date = datetime.strptime(req_data["created_at"], "%Y-%m-%d")
            
            requisition = Requisition(
                number=req_data["number"],
                requestor_id=default_user.id,
                department=req_data["department"],
                description=req_data["description"],
                justification=req_data["justification"],
                urgency=req_data["urgency"],
                needed_by_date=created_date + timedelta(days=14),
                total_amount=req_data["amount"],
                status=req_data["status"],
                current_stage=req_data.get("current_stage", "step_1"),
                flagged_by=req_data.get("flag_reason", None) and "system",
                flag_reason=req_data.get("flag_reason"),
                created_at=created_date,
                created_by=default_user.id,
            )
            db.add(requisition)
            db.flush()
            
            # Add a line item
            line_item = RequisitionLineItem(
                requisition_id=requisition.id,
                line_number=1,
                description=req_data["title"],
                category=req_data["category"],
                quantity=1,
                unit_price=req_data["amount"],
                total=req_data["amount"],
                suggested_supplier_id=suppliers[req_data["supplier"]].id if req_data["supplier"] in suppliers else None,
                gl_account="6000",
            )
            db.add(line_item)
            
            print(f"  [{i:02d}] Created: {req_data['number']} - {req_data['title'][:40]}... (${req_data['amount']:,.0f})")
        
        db.commit()
        print(f"\n✅ Successfully seeded {len(REQUISITIONS_DATA)} requisitions!")
        
        # Verify
        final_count = db.query(Requisition).count()
        print(f"Total requisitions in database: {final_count}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("P2P Platform - Database Seeder")
    print("=" * 60)
    seed_requisitions()
    print("=" * 60)
