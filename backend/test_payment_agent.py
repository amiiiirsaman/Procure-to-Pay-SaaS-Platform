"""
Test script for Payment Agent (Step 9) - Payment Execution
Tests the payment processing via bank integration.
"""

import json
from datetime import datetime
from app.agents.payment_agent import PaymentAgent


def test_payment_agent():
    """Test Payment Agent with REQ-1768913207 data."""
    
    # Requisition data matching REQ-1768913207 context
    requisition_data = {
        "id": 62,
        "number": "REQ-1768913207",
        "title": "Marketing Campaign Materials",
        "description": "Q1 2026 marketing campaign materials including brochures and promotional items",
        "total_amount": 16200.00,  # Including tax
        "currency": "USD",
        "department": "Marketing",
        "requestor_name": "John Smith",
        "requestor_id": "USR-001",
        "supplier_id": 1,
        "supplier_name": "Office Supplies Co",
        "supplier_bank_name": "First National Bank",
        "supplier_bank_account": "****5678",
        "supplier_payment_terms": "Net 30",
        "payment_method": "ACH",
        "po_number": "PO-000062",
        "invoice_number": "INV-2026-001234",
        "status": "APPROVED",
        "created_at": "2026-01-10T09:00:00",
    }
    
    # Invoice data (optional, for 3-way match verification)
    invoice_data = {
        "number": "INV-2026-001234",
        "total_amount": 16200.00,
        "invoice_date": "2026-01-18",
        "due_date": "2026-02-17",
        "supplier_id": 1,
        "supplier_name": "Office Supplies Co"
    }
    
    # Previous agent notes from the pipeline
    previous_agent_notes = [
        "✅ Step 1: Requisition validated successfully",
        "✅ Step 2: Approval chain completed - Director approval obtained",
        "✅ Step 3: PO-000062 generated with supplier Office Supplies Co",
        "✅ Step 4: Goods received at warehouse WH-A01, quality passed",
        "✅ Step 5: Three-way match completed - Invoice validated",
        "✅ Step 6: Fraud analysis clear - Risk score 15/100 (Low)",
        "✅ Step 7: Compliance check passed - All documentation complete",
        "✅ Step 8: Final approval obtained from Finance Controller"
    ]
    
    print("=" * 70)
    print("PAYMENT AGENT (STEP 9) - PAYMENT EXECUTION TEST")
    print("=" * 70)
    print(f"\nTesting with requisition: {requisition_data['number']}")
    print(f"Payment Amount: ${requisition_data['total_amount']:,.2f}")
    print(f"Supplier: {requisition_data['supplier_name']}")
    print(f"Bank: {requisition_data['supplier_bank_name']}")
    print(f"Account: {requisition_data['supplier_bank_account']}")
    print(f"Payment Method: {requisition_data['payment_method']}")
    print(f"Payment Terms: {requisition_data['supplier_payment_terms']}")
    print("-" * 70)
    
    # Initialize Payment Agent (use_mock=True for testing)
    agent = PaymentAgent(use_mock=True)
    
    # Process the payment
    print("\nProcessing payment...")
    result = agent.process_payment(
        requisition_data=requisition_data,
        invoice_data=invoice_data,
        previous_agent_notes=previous_agent_notes
    )
    
    print("\n" + "=" * 70)
    print("PAYMENT AGENT RESULT")
    print("=" * 70)
    
    # Display result structure
    print(f"\nStatus: {result.get('status', 'N/A')}")
    print(f"Payment Authorized: {result.get('payment_authorized', 'N/A')}")
    print(f"Verdict: {result.get('verdict', 'N/A')}")
    print(f"Verdict Reason: {result.get('verdict_reason', 'N/A')}")
    
    # Display transaction details
    print("\n" + "-" * 70)
    print("TRANSACTION DETAILS")
    print("-" * 70)
    
    print(f"\nTransaction ID: {result.get('transaction_id', 'N/A')}")
    print(f"Bank Reference: {result.get('bank_reference', 'N/A')}")
    print(f"Amount Paid: ${result.get('amount_paid', 0):,.2f} {result.get('currency', 'USD')}")
    print(f"Payment Method: {result.get('payment_method', 'N/A')}")
    print(f"Supplier Account: {result.get('supplier_account', 'N/A')}")
    print(f"Payment Date: {result.get('payment_date', 'N/A')}")
    print(f"Bank Token Used: {result.get('bank_token_used', 'N/A')}")
    
    # Display confirmation message if available
    if result.get('confirmation_message'):
        print("\n" + "-" * 70)
        print("CONFIRMATION MESSAGE")
        print("-" * 70)
        print(result.get('confirmation_message'))
    
    # Display notes if available
    if result.get('notes'):
        print("\n" + "-" * 70)
        print("PROCESSING NOTES")
        print("-" * 70)
        for note in result.get('notes', []):
            print(f"  • {note}")
    
    # Display reasoning bullets if available
    if result.get('reasoning_bullets'):
        print("\n" + "-" * 70)
        print("REASONING")
        print("-" * 70)
        for bullet in result.get('reasoning_bullets', []):
            print(f"  {bullet}")
    
    # Show full result for debugging
    print("\n" + "-" * 70)
    print("FULL RESULT (for debugging)")
    print("-" * 70)
    print(json.dumps(result, indent=2, default=str))
    
    return result


if __name__ == "__main__":
    test_payment_agent()
