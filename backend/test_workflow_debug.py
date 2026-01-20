"""Debug script to test the workflow run endpoint logic."""
import traceback
import time
import uuid
from datetime import datetime

# Setup database
from app.database import get_db
from app.models import Requisition

def test_workflow():
    db = next(get_db())
    
    # Simulating the request
    requisition_id = 1768931613
    mode = "auto"
    
    print(f"Testing workflow for requisition_id: {requisition_id}")
    
    workflow_id = str(uuid.uuid4())
    workflow_start = time.time()
    
    # Get the requisition - support both integer ID and number lookup
    requisition = None
    req_id = str(requisition_id)
    print(f"Looking up requisition with req_id: {req_id}")
    
    if req_id.isdigit():
        requisition = db.query(Requisition).filter(Requisition.id == int(req_id)).first()
        print(f"By integer ID: {requisition}")
        # Also try to find by number containing the digits
        if not requisition:
            requisition = db.query(Requisition).filter(
                Requisition.number.like(f"%{req_id}%")
            ).first()
            print(f"By number LIKE: {requisition}")
    
    if not requisition:
        # Try direct number match
        requisition = db.query(Requisition).filter(Requisition.number == req_id).first()
        print(f"By direct number match: {requisition}")
        
    if not requisition:
        # Try with REQ- prefix
        requisition = db.query(Requisition).filter(Requisition.number == f"REQ-{req_id}").first()
        print(f"By REQ- prefix: {requisition}")
        
    if not requisition:
        print(f"Requisition not found!")
        return
    
    print(f"\nFound requisition: id={requisition.id}, number={requisition.number}")
    print(f"Status: {requisition.status}")
    print(f"Description: {requisition.description}")
    
    # Test agent imports
    print("\nTesting agent imports...")
    from app.agents import (
        RequisitionAgent,
        ApprovalAgent,
        POAgent,
        ReceivingAgent,
        InvoiceAgent,
        FraudAgent,
        ComplianceAgent,
    )
    from app.agents.payment_agent import PaymentAgent
    print("All agents imported successfully")
    
    # Build the req_dict (like in routes.py)
    print("\nBuilding req_dict...")
    req_dict = {
        "id": requisition.id,
        "number": requisition.number,
        "description": requisition.description,
        "status": requisition.status.value if hasattr(requisition.status, 'value') else str(requisition.status),
        "priority": requisition.priority.value if hasattr(requisition.priority, 'value') else str(requisition.priority),
        "total_amount": float(requisition.total_amount) if requisition.total_amount else 0.0,
        "currency": requisition.currency,
        "requester_id": requisition.requester_id,
        "requester_email": requisition.requester_email,
        "requester_name": requisition.requester_name,
        "department": requisition.department,
        "cost_center": requisition.cost_center,
        "requested_date": requisition.requested_date.isoformat() if requisition.requested_date else None,
        "needed_by_date": requisition.needed_by_date.isoformat() if requisition.needed_by_date else None,
        "created_at": requisition.created_at.isoformat() if requisition.created_at else None,
        "updated_at": requisition.updated_at.isoformat() if requisition.updated_at else None,
        "vendor_id": requisition.vendor_id,
        "vendor_name": requisition.vendor_name,
    }
    print(f"req_dict built: {list(req_dict.keys())}")
    
    # Initialize agents (like in routes.py)
    print("\nInitializing agents...")
    try:
        req_agent = RequisitionAgent()
        print("RequisitionAgent initialized")
    except Exception as e:
        print(f"RequisitionAgent failed: {e}")
        traceback.print_exc()
        
    try:
        approval_agent = ApprovalAgent()
        print("ApprovalAgent initialized")
    except Exception as e:
        print(f"ApprovalAgent failed: {e}")
        traceback.print_exc()
        
    try:
        po_agent = POAgent()
        print("POAgent initialized")
    except Exception as e:
        print(f"POAgent failed: {e}")
        traceback.print_exc()
        
    try:
        receiving_agent = ReceivingAgent()
        print("ReceivingAgent initialized")
    except Exception as e:
        print(f"ReceivingAgent failed: {e}")
        traceback.print_exc()
        
    try:
        invoice_agent = InvoiceAgent()
        print("InvoiceAgent initialized")
    except Exception as e:
        print(f"InvoiceAgent failed: {e}")
        traceback.print_exc()
        
    try:
        fraud_agent = FraudAgent()
        print("FraudAgent initialized")
    except Exception as e:
        print(f"FraudAgent failed: {e}")
        traceback.print_exc()
        
    try:
        compliance_agent = ComplianceAgent()
        print("ComplianceAgent initialized")
    except Exception as e:
        print(f"ComplianceAgent failed: {e}")
        traceback.print_exc()
        
    try:
        payment_agent = PaymentAgent()
        print("PaymentAgent initialized")
    except Exception as e:
        print(f"PaymentAgent failed: {e}")
        traceback.print_exc()
    
    print("\n=== All initialization successful! ===")
    
    # Try to call the first step
    print("\n\nTrying Step 1: Requisition Validation...")
    try:
        result = req_agent.validate_requisition(req_dict)
        print(f"Step 1 result: {result}")
    except Exception as e:
        print(f"Step 1 failed: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    try:
        test_workflow()
    except Exception as e:
        print(f"ERROR: {e}")
        traceback.print_exc()
