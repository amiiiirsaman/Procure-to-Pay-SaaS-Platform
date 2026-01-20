#!/usr/bin/env python
"""Populate all P2P Engine agent fields with random realistic data for existing requisitions."""
import os
import sys
import random
import json
from datetime import date, timedelta

backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.models.requisition import Requisition

# ============= CONSTANTS FOR RANDOM GENERATION =============

PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "Net 90", "2/10 Net 30"]
SHIPPING_METHODS = ["Ground", "Express", "Overnight", "Freight", "LTL", "Standard"]
QUALITY_STATUSES = ["passed", "passed", "passed", "passed", "partial"]  # 80% pass
WAREHOUSES = ["WH-A01", "WH-A02", "WH-B01", "WH-B02", "WH-C01", "DC-MAIN", "DC-EAST"]
BANK_NAMES = ["Chase", "Bank of America", "Wells Fargo", "Citibank", "PNC", "US Bank"]
PAYMENT_METHODS = ["ACH", "ACH", "ACH", "Wire", "Check"]  # 60% ACH

# Supplier addresses
ADDRESSES = [
    "100 Enterprise Way, St. Louis, MO 63141",
    "200 Corporate Dr, San Francisco, CA 94105", 
    "500 Tech Park, Austin, TX 78701",
    "1000 Business Center, Chicago, IL 60601",
    "750 Innovation Blvd, Seattle, WA 98101",
    "300 Commerce St, Dallas, TX 75201",
    "450 Market St, Philadelphia, PA 19103"
]

# Document templates
REQUIRED_DOCS_TIER1 = ["Invoice", "Requestor Approval"]
REQUIRED_DOCS_TIER2 = ["Invoice", "PO", "Manager Approval", "Goods Receipt"]
REQUIRED_DOCS_TIER3 = ["Invoice", "PO", "Director Approval", "Goods Receipt", "3 Quotes", "Budget Confirmation"]
REQUIRED_DOCS_TIER4 = ["Invoice", "PO", "RFP", "VP Approval", "Finance Review", "Contract", "Goods Receipt"]
REQUIRED_DOCS_TIER5 = ["Invoice", "PO", "Formal RFP", "Evaluation Scorecard", "CFO Approval", "Legal Review", "Contract"]

DOC_TEMPLATES = {
    "Invoice": "INV-{req_num}-{supplier}.pdf",
    "PO": "PO-{req_num}.pdf",
    "Goods Receipt": "GR-{req_num}.pdf",
    "3 Quotes": "Quotes-{req_num}-Competitive.pdf",
    "Contract": "Contract-{supplier}-2026.pdf",
    "RFP": "RFP-{req_num}.pdf",
    "Formal RFP": "RFP-Formal-{req_num}.pdf",
    "Evaluation Scorecard": "Eval-{req_num}.xlsx",
    "Budget Confirmation": "Budget-Approval-{dept}.pdf",
    "Manager Approval": "Approval-Manager-{req_num}.pdf",
    "Director Approval": "Approval-Director-{req_num}.pdf",
    "VP Approval": "Approval-VP-{req_num}.pdf",
    "CFO Approval": "Approval-CFO-{req_num}.pdf",
    "Finance Review": "Finance-Review-{req_num}.pdf",
    "Legal Review": "Legal-Review-{req_num}.pdf",
    "Requestor Approval": "Approval-Requestor-{req_num}.pdf"
}


def get_approval_tier(amount: float) -> int:
    """Determine approval tier based on amount."""
    if amount < 1000:
        return 1
    elif amount < 5000:
        return 2
    elif amount < 25000:
        return 3
    elif amount < 50000:
        return 4
    elif amount < 100000:
        return 5
    return 6


def generate_approver_chain(tier: int) -> str:
    """Generate JSON approver chain based on tier."""
    chain = [{"role": "Requestor", "user": f"USR-{random.randint(1, 10):04d}", "status": "approved"}]
    if tier >= 2:
        chain.append({"role": "Manager", "user": f"USR-{random.randint(11, 20):04d}", "status": "approved"})
    if tier >= 3:
        chain.append({"role": "Director", "user": f"USR-{random.randint(21, 30):04d}", "status": "approved"})
    if tier >= 4:
        chain.append({"role": "VP", "user": f"USR-{random.randint(31, 35):04d}", "status": "approved"})
        chain.append({"role": "Finance", "user": "USR-FIN01", "status": "approved"})
    if tier >= 5:
        chain.append({"role": "CFO", "user": "USR-CFO01", "status": "approved"})
    if tier >= 6:
        chain.append({"role": "CEO", "user": "USR-CEO01", "status": "pending"})
    return json.dumps(chain)


def generate_documents(tier: int, req_num: str, supplier: str, dept: str) -> tuple:
    """Generate required and attached documents based on tier."""
    if tier == 1:
        docs = REQUIRED_DOCS_TIER1
    elif tier == 2:
        docs = REQUIRED_DOCS_TIER2
    elif tier == 3:
        docs = REQUIRED_DOCS_TIER3
    elif tier == 4:
        docs = REQUIRED_DOCS_TIER4
    else:
        docs = REQUIRED_DOCS_TIER5
    
    attached = []
    for doc in docs:
        template = DOC_TEMPLATES.get(doc, f"{doc}.pdf")
        name = template.format(
            req_num=req_num,
            supplier=(supplier or "Unknown").replace(" ", "_"),
            dept=dept
        )
        attached.append({"type": doc, "filename": name, "uploaded": True})
    return json.dumps(docs), json.dumps(attached)


def populate_agent_fields(req: Requisition) -> None:
    """Populate all agent fields for a requisition."""
    amount = req.total_amount or 1000
    tier = get_approval_tier(amount)
    today = date.today()
    
    # Step 2: Approval fields
    req.requestor_authority_level = float(random.choice([1000, 5000, 10000, 25000]))
    req.department_budget_limit = float(random.randint(50000, 500000))
    if random.random() < 0.2:  # 20% have prior approval
        req.prior_approval_reference = f"PRJ-{random.randint(1000, 9999)}"
    
    # Step 3: PO Generation fields
    req.supplier_payment_terms = random.choice(PAYMENT_TERMS)
    req.supplier_address = random.choice(ADDRESSES)
    supplier_name = (req.supplier_name or "supplier").lower().replace(" ", "").replace("&", "")
    req.supplier_contact = f"contact@{supplier_name[:20]}.com"
    req.shipping_method = random.choice(SHIPPING_METHODS)
    req.shipping_address = "7700 Forsyth Blvd, Clayton, MO 63105"  # Centene HQ
    req.tax_rate = random.choice([0.0, 6.25, 7.5, 8.25, 8.875])
    req.tax_amount = round(amount * (req.tax_rate / 100), 2)
    req.po_number = f"PO-{req.id:06d}"
    
    # Step 4: Goods Receipt fields
    req.received_quantity = random.randint(1, 100)
    req.received_date = today - timedelta(days=random.randint(1, 30))
    req.quality_status = random.choice(QUALITY_STATUSES)
    if req.quality_status == "partial":
        req.damage_notes = random.choice([
            "Minor packaging damage, contents intact",
            "1 unit short, backorder expected",
            "Quality inspection pending for batch sample"
        ])
    req.receiver_id = f"USR-WH{random.randint(1, 5):02d}"
    req.warehouse_location = random.choice(WAREHOUSES)
    
    # Step 5: Invoice Validation fields
    req.invoice_number = f"INV-{random.randint(100000, 999999)}"
    req.invoice_date = req.received_date + timedelta(days=random.randint(1, 5))
    invoice_variance = random.choice([0, 0, 0, 0, 0.02, -0.01])  # 80% exact match
    req.invoice_amount = round(amount * (1 + invoice_variance), 2)
    payment_days = 30
    if req.supplier_payment_terms and "Net" in req.supplier_payment_terms:
        try:
            payment_days = int(req.supplier_payment_terms.split()[1])
        except (IndexError, ValueError):
            payment_days = 30
    req.invoice_due_date = req.invoice_date + timedelta(days=payment_days)
    req.invoice_file_url = f"/documents/invoices/{req.invoice_number}.pdf"
    req.three_way_match_status = "matched" if invoice_variance == 0 else "partial"
    
    # Step 6: Fraud Analysis fields
    req.supplier_bank_account = f"****{random.randint(1000, 9999)}"
    req.supplier_bank_account_changed_date = None  # No recent changes (clean)
    req.supplier_ein = f"{random.randint(10, 99)}-{random.randint(1000000, 9999999)}"
    req.supplier_years_in_business = random.randint(5, 50)  # Established vendors
    req.requester_vendor_relationship = "None"  # No conflicts
    req.similar_transactions_count = random.randint(0, 3)  # Normal range
    req.fraud_risk_score = random.randint(5, 25)  # Low risk
    req.fraud_indicators = json.dumps([])  # No indicators
    
    # Step 7: Compliance fields
    req.approver_chain = generate_approver_chain(tier)
    dept_str = req.department.value if hasattr(req.department, 'value') else str(req.department)
    req.required_documents, req.attached_documents = generate_documents(
        tier, req.number, req.supplier_name, dept_str
    )
    req.quotes_attached = 3 if tier >= 3 else 0
    if req.contract_on_file:
        req.contract_id = f"CTR-{random.randint(1000, 9999)}"
        req.contract_expiry = today + timedelta(days=random.randint(180, 730))
    req.audit_trail = json.dumps([
        {"action": "created", "by": req.requestor_id, "at": str(today - timedelta(days=30))},
        {"action": "submitted", "by": req.requestor_id, "at": str(today - timedelta(days=28))},
        {"action": "approved", "by": "system", "at": str(today - timedelta(days=25))}
    ])
    req.policy_exceptions = None  # No exceptions
    req.segregation_of_duties_ok = True  # All pass SOD
    
    # Step 9: Payment fields
    req.supplier_bank_name = random.choice(BANK_NAMES)
    req.supplier_routing_number = f"****{random.randint(1000, 9999)}"
    req.supplier_swift_code = None  # Domestic payments
    req.payment_method = random.choice(PAYMENT_METHODS)
    req.payment_scheduled_date = req.invoice_due_date - timedelta(days=2)
    req.payment_transaction_id = f"TXN-{random.randint(100000000, 999999999)}"
    req.payment_status = random.choice(["pending", "pending", "completed", "completed", "completed"])
    
    # Historical Fraud fields (ALL CLEAN)
    req.past_transactions_clean = True
    req.fraud_history_score = 0
    req.past_transaction_count = random.randint(10, 200)
    req.past_issues_count = 0


if __name__ == "__main__":
    db = SessionLocal()
    print("=" * 60)
    print("POPULATING P2P ENGINE AGENT FIELDS")
    print("=" * 60)

    requisitions = db.query(Requisition).all()
    print(f"Found {len(requisitions)} requisitions\n")

    for req in requisitions:
        populate_agent_fields(req)
        tier = get_approval_tier(req.total_amount or 1000)
        print(f"  {req.number}: Tier {tier}, Fraud Risk {req.fraud_risk_score}, {req.payment_status}")

    db.commit()
    db.close()
    print("\n" + "=" * 60)
    print("✅ All agent fields populated!")
    print("=" * 60)
