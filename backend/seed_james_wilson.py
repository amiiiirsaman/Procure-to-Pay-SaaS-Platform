"""
Comprehensive seed script for 30 requisitions with multiple users
- James Wilson (6 requisitions) - current user
- 5 other users (4-5 requisitions each)
Realistic business descriptions, justifications, and budget impact
"""

import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.requisition import Requisition
from app.models.user import User
from app.models.enums import UserRole, Department, DocumentStatus, Urgency
from app.database import Base

# Database setup
DATABASE_URL = "sqlite:///./p2p_platform.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# Define users with their departments
USERS = [
    {"id": "james-wilson-001", "email": "james.wilson@centene.com", "name": "James Wilson", "department": Department.IT, "role": UserRole.BUYER},
    {"id": "sarah-chen-001", "email": "sarah.chen@centene.com", "name": "Sarah Chen", "department": Department.MARKETING, "role": UserRole.BUYER},
    {"id": "michael-brown-001", "email": "michael.brown@centene.com", "name": "Michael Brown", "department": Department.FINANCE, "role": UserRole.MANAGER},
    {"id": "emily-davis-001", "email": "emily.davis@centene.com", "name": "Emily Davis", "department": Department.HR, "role": UserRole.BUYER},
    {"id": "robert-garcia-001", "email": "robert.garcia@centene.com", "name": "Robert Garcia", "department": Department.OPERATIONS, "role": UserRole.BUYER},
    {"id": "lisa-martinez-001", "email": "lisa.martinez@centene.com", "name": "Lisa Martinez", "department": Department.LEGAL, "role": UserRole.MANAGER},
]

# Realistic requisition templates by department
REQUISITION_TEMPLATES = {
    Department.IT: [
        {"title": "Dell Precision Workstations for Development Team", "category": "IT Equipment", "supplier": "Dell Technologies", "amount": 45000, "description": "15 Dell Precision 5570 workstations with 64GB RAM and NVIDIA RTX graphics for software development team expansion", "justification": "New development team members require high-performance workstations for AI/ML model training and testing"},
        {"title": "Microsoft 365 E5 Enterprise Licenses", "category": "Software Licenses", "supplier": "Microsoft", "amount": 28000, "description": "Annual renewal of Microsoft 365 E5 licenses for 200 employees including advanced security features", "justification": "Critical business software for productivity, collaboration, and enhanced security compliance"},
        {"title": "AWS Cloud Infrastructure Expansion", "category": "Cloud Services", "supplier": "Amazon Web Services", "amount": 75000, "description": "Q1 cloud infrastructure costs including EC2 reserved instances, S3 storage, and RDS databases", "justification": "Support growing customer base and ensure 99.99% uptime SLA compliance"},
        {"title": "Cisco Network Security Upgrade", "category": "IT Equipment", "supplier": "Cisco Systems", "amount": 120000, "description": "Firewall and network security hardware upgrade including Cisco Firepower 4110 appliances", "justification": "Required security infrastructure upgrade to meet new HIPAA compliance requirements"},
        {"title": "VMware vSphere Enterprise Plus", "category": "Software Licenses", "supplier": "VMware", "amount": 65000, "description": "VMware virtualization platform licenses for data center modernization project", "justification": "Enable hybrid cloud strategy and improve resource utilization by 40%"},
        {"title": "ServiceNow ITSM Platform Expansion", "category": "Software Licenses", "supplier": "ServiceNow", "amount": 95000, "description": "Additional ServiceNow ITSM modules for HR service delivery and security operations", "justification": "Streamline IT operations and reduce ticket resolution time by 35%"},
    ],
    Department.MARKETING: [
        {"title": "Annual Digital Marketing Campaign", "category": "Marketing Materials", "supplier": "Omnicom Group", "amount": 250000, "description": "Comprehensive digital marketing campaign including social media, PPC, and content marketing", "justification": "Drive Q1 lead generation goals and increase brand awareness by 25%"},
        {"title": "Trade Show Booth Design and Materials", "category": "Marketing Materials", "supplier": "Freeman Company", "amount": 85000, "description": "Custom trade show booth design and materials for HIMSS 2026 healthcare conference", "justification": "Major industry event for healthcare technology - expecting 500+ qualified leads"},
        {"title": "HubSpot Marketing Hub Enterprise", "category": "Software Licenses", "supplier": "HubSpot", "amount": 42000, "description": "Annual subscription for marketing automation platform with advanced analytics", "justification": "Improve marketing ROI tracking and automate lead nurturing workflows"},
        {"title": "Brand Photography and Video Production", "category": "Professional Services", "supplier": "MediaStorm Productions", "amount": 35000, "description": "Professional photography and video production for new product launch campaign", "justification": "Support Q2 product launch with high-quality marketing assets"},
        {"title": "Customer Research Study", "category": "Professional Services", "supplier": "Forrester Research", "amount": 55000, "description": "Comprehensive market research study on customer satisfaction and competitive landscape", "justification": "Data-driven insights to inform product roadmap and marketing strategy"},
    ],
    Department.FINANCE: [
        {"title": "Oracle NetSuite ERP Upgrade", "category": "Software Licenses", "supplier": "Oracle", "amount": 180000, "description": "ERP system upgrade including advanced financial planning and revenue recognition modules", "justification": "Required for ASC 606 compliance and improved financial reporting accuracy"},
        {"title": "External Audit Services - FY2025", "category": "Professional Services", "supplier": "Deloitte & Touche", "amount": 450000, "description": "Annual external audit and SOX compliance services for fiscal year 2025", "justification": "Regulatory requirement for public company compliance and investor confidence"},
        {"title": "Bloomberg Terminal Licenses", "category": "Software Licenses", "supplier": "Bloomberg LP", "amount": 48000, "description": "4 Bloomberg Terminal licenses for treasury and investment analysis team", "justification": "Essential tool for cash management and investment decision making"},
        {"title": "Accounts Payable Automation Solution", "category": "Software Licenses", "supplier": "Coupa Software", "amount": 95000, "description": "Implementation of Coupa AP automation for invoice processing and payment workflows", "justification": "Reduce invoice processing time by 70% and eliminate manual data entry errors"},
    ],
    Department.HR: [
        {"title": "Workday HCM Implementation Phase 2", "category": "Software Licenses", "supplier": "Workday", "amount": 320000, "description": "Phase 2 implementation of Workday HCM including talent management and learning modules", "justification": "Modernize HR systems and improve employee experience and retention"},
        {"title": "Leadership Development Program", "category": "Training", "supplier": "Korn Ferry", "amount": 125000, "description": "Executive leadership development program for 25 senior managers over 12 months", "justification": "Develop internal talent pipeline and reduce external executive hiring costs"},
        {"title": "Employee Benefits Platform Migration", "category": "Professional Services", "supplier": "Benefitfocus", "amount": 85000, "description": "Migration to new benefits administration platform with enhanced self-service capabilities", "justification": "Improve benefits enrollment experience and reduce HR administrative burden"},
        {"title": "Diversity, Equity & Inclusion Consulting", "category": "Professional Services", "supplier": "McKinsey & Company", "amount": 175000, "description": "Comprehensive DEI assessment and strategy development with implementation roadmap", "justification": "Strategic initiative to improve workforce diversity and create inclusive culture"},
        {"title": "Employee Engagement Survey Platform", "category": "Software Licenses", "supplier": "Qualtrics", "amount": 38000, "description": "Annual subscription for employee engagement and pulse survey platform", "justification": "Measure and improve employee satisfaction scores targeting 85% engagement"},
    ],
    Department.OPERATIONS: [
        {"title": "Warehouse Management System Upgrade", "category": "Software Licenses", "supplier": "Manhattan Associates", "amount": 275000, "description": "WMS upgrade with advanced inventory optimization and automated picking features", "justification": "Reduce order fulfillment time by 40% and inventory carrying costs by 15%"},
        {"title": "Fleet Vehicle Lease Renewal", "category": "Equipment Rental", "supplier": "Enterprise Fleet Management", "amount": 180000, "description": "Annual lease renewal for 45 delivery vehicles including maintenance and telematics", "justification": "Essential transportation for service delivery and customer support operations"},
        {"title": "Facility Security System Upgrade", "category": "Facilities", "supplier": "Johnson Controls", "amount": 95000, "description": "Access control and surveillance system upgrade for headquarters campus", "justification": "Enhanced security required for HIPAA compliance and data center protection"},
        {"title": "Energy Management System", "category": "Facilities", "supplier": "Schneider Electric", "amount": 145000, "description": "Smart building energy management system for 3 corporate facilities", "justification": "Reduce energy consumption by 25% and support sustainability goals"},
    ],
    Department.LEGAL: [
        {"title": "Contract Lifecycle Management Platform", "category": "Software Licenses", "supplier": "DocuSign", "amount": 68000, "description": "CLM platform for contract creation, negotiation, and compliance tracking", "justification": "Reduce contract cycle time by 50% and improve compliance visibility"},
        {"title": "Outside Legal Counsel - M&A Support", "category": "Professional Services", "supplier": "Skadden Arps", "amount": 750000, "description": "Legal advisory services for planned Q2 acquisition due diligence and closing", "justification": "Critical expertise required for strategic acquisition transaction"},
        {"title": "IP Portfolio Management Services", "category": "Professional Services", "supplier": "Fish & Richardson", "amount": 125000, "description": "Annual patent portfolio management and trademark prosecution services", "justification": "Protect intellectual property assets and maintain competitive advantage"},
        {"title": "Compliance Training Platform", "category": "Software Licenses", "supplier": "SAI Global", "amount": 42000, "description": "Annual subscription for compliance and ethics training for 2000 employees", "justification": "Regulatory requirement for healthcare compliance and risk mitigation"},
    ],
}

STATUSES = [
    DocumentStatus.PENDING_APPROVAL,
    DocumentStatus.APPROVED,
    DocumentStatus.ORDERED,
    DocumentStatus.RECEIVED,
    DocumentStatus.INVOICED,
    DocumentStatus.PAID,
]

# Categories that are services (not physical goods)
SERVICE_CATEGORIES = ["Professional Services", "Consulting", "Software Licenses", "Maintenance", "Training"]

SPEND_TYPES = ["CAPEX", "OPEX"]
URGENCIES = [Urgency.STANDARD, Urgency.URGENT, Urgency.EMERGENCY]
PAYMENT_METHODS = ["ACH", "Wire Transfer", "Check", "Corporate Card", "Purchase Order"]


def get_centene_cost_center(department):
    """Get cost center from Centene data mapping"""
    mapping = {
        Department.IT: "CC-IT-4521",
        Department.MARKETING: "CC-MKT-3210",
        Department.FINANCE: "CC-FIN-2100",
        Department.HR: "CC-HR-2500",
        Department.OPERATIONS: "CC-OPS-5100",
        Department.LEGAL: "CC-LEG-1900",
        Department.FACILITIES: "CC-FAC-6100",
        Department.SALES: "CC-SLS-4100",
        Department.RD: "CC-RND-7100",
        Department.ENGINEERING: "CC-ENG-3500",
    }
    return mapping.get(department, f"CC-{str(department.value)[:3].upper()}-{random.randint(1000, 9999)}")


def get_centene_gl_account(department, category):
    """Get GL account from Centene data mapping"""
    base_mapping = {
        "IT Equipment": "5100-400",
        "Software Licenses": "5200-300",
        "Cloud Services": "5200-350",
        "Professional Services": "5300-200",
        "Marketing Materials": "5400-100",
        "Training": "5500-150",
        "Facilities": "5600-200",
        "Equipment Rental": "5600-250",
    }
    return base_mapping.get(category, f"5000-{random.randint(100, 999)}")


def create_requisition_from_template(req_num, user, template, status):
    """Create a requisition from a template with all fields populated"""
    
    created_date = datetime.now() - timedelta(days=random.randint(1, 60))
    needed_by = created_date + timedelta(days=random.randint(14, 45))
    
    total = Decimal(str(template["amount"]))
    tax_rate = Decimal("0.0825")
    tax_amount = (total * tax_rate).quantize(Decimal("0.01"))
    
    supplier_risk = random.randint(10, 45)  # Most suppliers are low risk
    fraud_risk = random.randint(5, 35)
    
    is_approved = status in [DocumentStatus.APPROVED, DocumentStatus.ORDERED, DocumentStatus.RECEIVED, DocumentStatus.INVOICED, DocumentStatus.PAID]
    is_flagged = template["amount"] > 100000  # Flag high-value requisitions
    
    current_stage = {
        DocumentStatus.PENDING_APPROVAL: 2,
        DocumentStatus.APPROVED: 4,
        DocumentStatus.ORDERED: 5,
        DocumentStatus.RECEIVED: 6,
        DocumentStatus.INVOICED: 7,
        DocumentStatus.PAID: 8,
    }.get(status, 1)
    
    data = {
        # Core fields
        "number": f"REQ-{req_num:06d}",
        "status": status,
        "requestor_id": user["id"],
        "department": user["department"],
        "description": template["description"],
        "justification": template["justification"],
        "urgency": random.choice(URGENCIES),
        "needed_by_date": needed_by,
        "category": template["category"],
        "procurement_type": "services" if template["category"] in SERVICE_CATEGORIES else "goods",
        
        # Financial fields - Centene data
        "total_amount": float(total),
        "currency": "USD",
        "cost_center": get_centene_cost_center(user["department"]),
        "gl_account": get_centene_gl_account(user["department"], template["category"]),
        "spend_type": "CAPEX" if template["category"] in ["IT Equipment", "Facilities"] else "OPEX",
        "budget_available": float(total * Decimal(str(random.uniform(1.5, 2.5)))),
        "budget_impact": f"${float(total):,.2f} against Q1 budget allocation",
        "tax_rate": float(tax_rate),
        "tax_amount": float(tax_amount),
        
        # Supplier fields
        "supplier_name": template["supplier"],
        "supplier_risk_score": supplier_risk,
        "supplier_status": "Preferred" if supplier_risk < 30 else "Approved",
        "supplier_address": f"{random.randint(100, 999)} Corporate Blvd, Suite {random.randint(100, 500)}",
        "supplier_contact": f"{template['supplier']} Account Team",
        "supplier_payment_terms": random.choice(["Net 30", "Net 45", "Net 60"]),
        "contract_on_file": random.random() < 0.7,
        "supplier_bank_account": f"****{random.randint(1000, 9999)}",
        "supplier_ein": f"{random.randint(10, 99)}-{random.randint(1000000, 9999999)}",
        "supplier_years_in_business": random.randint(10, 50),
        "supplier_bank_name": random.choice(["JPMorgan Chase", "Bank of America", "Wells Fargo", "Citibank"]),
        "supplier_routing_number": f"0{random.randint(21000000, 99999999)}",
        "supplier_swift_code": f"{random.choice(['CHAS', 'BOFA', 'WFBI', 'CITI'])}US3{random.randint(1, 9)}",
        
        # Approval workflow
        "flagged_by": "system" if is_flagged else None,
        "flag_reason": "High value transaction requires additional approval" if is_flagged else None,
        "current_stage": current_stage,
        "flagged_at": created_date + timedelta(hours=2) if is_flagged else None,
        "requestor_authority_level": 3,
        "department_budget_limit": 500000.0,
        "prior_approval_reference": None,
        "approver_chain": "manager@centene.com,director@centene.com,vp@centene.com",
        "required_documents": "Quote,SOW,W9",
        "attached_documents": "quote.pdf,sow.pdf,w9.pdf",
        "quotes_attached": random.randint(1, 3),
        
        # Receiving fields
        "received_quantity": 1 if status in [DocumentStatus.RECEIVED, DocumentStatus.INVOICED, DocumentStatus.PAID] else None,
        "received_date": created_date + timedelta(days=20) if status in [DocumentStatus.RECEIVED, DocumentStatus.INVOICED, DocumentStatus.PAID] else None,
        "quality_status": "Accepted" if status in [DocumentStatus.RECEIVED, DocumentStatus.INVOICED, DocumentStatus.PAID] else None,
        "damage_notes": None,
        "receiver_id": user["id"] if status in [DocumentStatus.RECEIVED, DocumentStatus.INVOICED, DocumentStatus.PAID] else None,
        "warehouse_location": None,
        "shipping_method": "Digital Delivery" if template["category"] in ["Software Licenses", "Cloud Services"] else "Standard Shipping",
        "shipping_address": "7700 Forsyth Blvd, St. Louis, MO 63105",
        
        # Invoice fields
        "invoice_number": f"INV-{random.randint(100000, 999999)}" if status in [DocumentStatus.INVOICED, DocumentStatus.PAID] else None,
        "invoice_date": created_date + timedelta(days=25) if status in [DocumentStatus.INVOICED, DocumentStatus.PAID] else None,
        "invoice_amount": float(total + tax_amount) if status in [DocumentStatus.INVOICED, DocumentStatus.PAID] else None,
        "invoice_due_date": created_date + timedelta(days=60) if status in [DocumentStatus.INVOICED, DocumentStatus.PAID] else None,
        "invoice_file_url": f"/uploads/invoices/INV-{req_num}.pdf" if status in [DocumentStatus.INVOICED, DocumentStatus.PAID] else None,
        "three_way_match_status": "Matched" if status in [DocumentStatus.INVOICED, DocumentStatus.PAID] else None,
        "po_number": f"PO-{random.randint(100000, 999999)}" if is_approved else None,
        
        # Fraud detection
        "fraud_risk_score": fraud_risk,
        "fraud_indicators": "None detected",
        "requester_vendor_relationship": "None disclosed",
        "similar_transactions_count": random.randint(5, 25),
        "past_transactions_clean": True,
        "fraud_history_score": random.randint(0, 15),
        "past_transaction_count": random.randint(10, 100),
        "past_issues_count": 0,
        
        # Contract fields
        "contract_id": f"CTR-{random.randint(10000, 99999)}" if random.random() < 0.6 else None,
        "contract_expiry": needed_by + timedelta(days=365) if random.random() < 0.6 else None,
        
        # Payment fields
        "payment_method": random.choice(PAYMENT_METHODS) if status == DocumentStatus.PAID else None,
        "payment_scheduled_date": created_date + timedelta(days=45) if status == DocumentStatus.PAID else None,
        "payment_transaction_id": f"TXN-{random.randint(1000000, 9999999)}" if status == DocumentStatus.PAID else None,
        "payment_status": "Completed" if status == DocumentStatus.PAID else "Pending",
        
        # Compliance
        "audit_trail": f"Created by {user['name']} on {created_date.strftime('%Y-%m-%d')}; Validation passed; Approved by manager",
        "policy_exceptions": "None",
        "segregation_of_duties_ok": True,
        
        # Metadata
        "created_by": user["id"],
        "updated_by": user["id"],
        "created_at": created_date,
        "updated_at": created_date + timedelta(hours=random.randint(1, 24)),
        
        # Agent notes
        "agent_notes": f"✓ Supplier {template['supplier']} verified - {('Preferred' if supplier_risk < 30 else 'Approved')} vendor\n✓ Budget allocation confirmed for {user['department'].value}\n✓ Compliance checks passed\n✓ Cost center: {get_centene_cost_center(user['department'])}\n✓ GL Account: {get_centene_gl_account(user['department'], template['category'])}"
    }
    
    return data


def main():
    """Main seeding function"""
    print("=" * 80)
    print("P2P DATABASE SEEDING - JAMES WILSON & TEAM")
    print("Creating 30 requisitions with realistic Centene business data")
    print("=" * 80)
    
    # Initialize database tables
    print("\n✓ Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Clear existing requisitions (for fresh start)
        db.query(Requisition).delete()
        db.commit()
        print("✓ Cleared existing requisitions")
        
        # Create or update users
        print("\n✓ Creating users...")
        created_users = []
        for user_data in USERS:
            existing = db.query(User).filter(User.id == user_data["id"]).first()
            if existing:
                existing.name = user_data["name"]
                existing.email = user_data["email"]
                existing.department = user_data["department"]
                existing.role = user_data["role"]
                db.commit()
                print(f"  Updated: {user_data['name']} ({user_data['department'].value})")
            else:
                user = User(
                    id=user_data["id"],
                    email=user_data["email"],
                    name=user_data["name"],
                    role=user_data["role"],
                    department=user_data["department"],
                    approval_limit=100000.0,
                    is_active=True
                )
                db.add(user)
                db.commit()
                print(f"  Created: {user_data['name']} ({user_data['department'].value})")
            created_users.append(user_data)
        
        print("\n" + "=" * 80)
        print("CREATING 30 REQUISITIONS")
        print("=" * 80)
        
        req_num = 1
        
        # James Wilson gets 6 requisitions (IT department)
        james = USERS[0]
        it_templates = REQUISITION_TEMPLATES[Department.IT]
        for i, template in enumerate(it_templates):
            status = STATUSES[i % len(STATUSES)]
            req_data = create_requisition_from_template(req_num, james, template, status)
            requisition = Requisition(**req_data)
            db.add(requisition)
            print(f"✓ REQ-{req_num:06d} | {james['name']:20s} | {template['category']:25s} | ${template['amount']:>10,.0f} | {status.value}")
            req_num += 1
        
        # Other users get 4-5 requisitions each
        other_users = USERS[1:]
        for user in other_users:
            dept = user["department"]
            templates = REQUISITION_TEMPLATES.get(dept, [])
            for i, template in enumerate(templates[:5]):  # Max 5 per user
                status = STATUSES[i % len(STATUSES)]
                req_data = create_requisition_from_template(req_num, user, template, status)
                requisition = Requisition(**req_data)
                db.add(requisition)
                print(f"✓ REQ-{req_num:06d} | {user['name']:20s} | {template['category']:25s} | ${template['amount']:>10,.0f} | {status.value}")
                req_num += 1
        
        db.commit()
        
        print("\n" + "=" * 80)
        print("DATABASE STATISTICS")
        print("=" * 80)
        
        total_reqs = db.query(Requisition).count()
        james_reqs = db.query(Requisition).filter(Requisition.requestor_id == "james-wilson-001").count()
        
        # Total value
        all_reqs = db.query(Requisition).all()
        total_value = sum(r.total_amount for r in all_reqs if r.total_amount)
        
        print(f"\n✓ Total Requisitions: {total_reqs}")
        print(f"✓ James Wilson's Requisitions: {james_reqs}")
        print(f"✓ Total Value: ${total_value:,.2f}")
        
        # By user
        print("\nBy User:")
        for user in USERS:
            count = db.query(Requisition).filter(Requisition.requestor_id == user["id"]).count()
            print(f"  - {user['name']:20s}: {count} requisitions")
        
        print("\n" + "=" * 80)
        print("✓ SEEDING COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
