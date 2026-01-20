"""
Test script for PO Agent (Step 3) - PO Generation
Tests the 6 key checks:
1. Contract Verification
2. Supplier Validation
3. Shipping Method
4. Delivery Date
5. Payment Terms
6. PO Amount Validation
"""

import json
from app.agents.po_agent import POAgent


def test_po_agent():
    """Test PO Agent with REQ-1768913207 data."""
    
    # Sample requisition data matching REQ-1768913207
    # This mirrors the format used in the workflow
    requisition_data = {
        "id": 62,
        "number": "REQ-1768913207",
        "title": "Marketing Campaign Materials",
        "description": "Q1 2026 marketing campaign materials including brochures and promotional items",
        "total_amount": 15000.00,
        "department": "Marketing",
        "requestor_name": "John Smith",
        "requestor_email": "john.smith@company.com",
        "urgency": "STANDARD",
        "status": "APPROVED",
        "supplier_id": 1,
        "supplier_name": "Office Supplies Co",
        "category": "Marketing Materials",
        "needed_by_date": "2026-02-15",
        "shipping_method": "Standard",
        "supplier_payment_terms": "Net 30",
        "contract_on_file": True,
        "contract_expiry": "2027-12-31",
        "supplier_status": "approved",
        "supplier_risk_score": 25,
        "tax_rate": 0.08,
        "items": [
            {
                "description": "Marketing Brochures",
                "quantity": 1000,
                "unit_price": 10.00,
                "total": 10000.00
            },
            {
                "description": "Promotional Items",
                "quantity": 500,
                "unit_price": 10.00,
                "total": 5000.00
            }
        ]
    }
    
    # Sample supplier data
    suppliers = [
        {
            "id": 1,
            "name": "Office Supplies Co",
            "status": "approved",
            "risk_score": 25,
            "category": "Marketing Materials"
        }
    ]
    
    print("=" * 70)
    print("PO AGENT (STEP 3) - PO GENERATION TEST")
    print("=" * 70)
    print(f"\nTesting with requisition: {requisition_data['number']}")
    print(f"Amount: ${requisition_data['total_amount']:,.2f}")
    print(f"Department: {requisition_data['department']}")
    print(f"Supplier: {requisition_data['supplier_name']}")
    print(f"Urgency: {requisition_data['urgency']}")
    print(f"Contract on File: {requisition_data['contract_on_file']}")
    print(f"Supplier Status: {requisition_data['supplier_status']}")
    print(f"Supplier Risk Score: {requisition_data['supplier_risk_score']}")
    print("-" * 70)
    
    # Initialize PO Agent (use_mock=True for testing without AWS Bedrock)
    agent = POAgent(use_mock=True)
    
    # Generate PO using the correct method
    print("\nProcessing PO generation...")
    result = agent.generate_po(
        requisition=requisition_data,
        suppliers=suppliers,
        contracts=[],
        vendor_performance={}
    )
    
    print("\n" + "=" * 70)
    print("PO AGENT RESULT")
    print("=" * 70)
    
    # Display result structure
    print(f"\nVerdict: {result.get('verdict', 'N/A')}")
    print(f"Verdict Reason: {result.get('verdict_reason', 'N/A')}")
    
    if result.get('po_number'):
        print(f"PO Number: {result.get('po_number')}")
    
    # Display checks summary
    checks_summary = result.get('checks_summary', {})
    if checks_summary:
        print(f"\nChecks Summary: {checks_summary.get('passed', 0)} passed, "
              f"{checks_summary.get('attention', 0)} attention, "
              f"{checks_summary.get('failed', 0)} failed")
    
    # Display the 6 key checks
    print("\n" + "-" * 70)
    print("6 KEY CHECKS OUTPUT")
    print("-" * 70)
    
    key_checks = result.get('key_checks', [])
    
    if not key_checks:
        print("\n⚠️  No key_checks found in result!")
        print("\nFull result structure:")
        print(json.dumps(result, indent=2, default=str))
    else:
        print(f"\nFound {len(key_checks)} key checks:\n")
        
        for i, check in enumerate(key_checks, 1):
            check_id = check.get('id', i)
            check_name = check.get('name', 'Unknown')
            status = check.get('status', 'Unknown')
            detail = check.get('detail', 'No details')
            items = check.get('items', [])
            
            # Status indicator
            if status.lower() in ['pass', 'passed', 'verified', 'valid']:
                indicator = "✅"
            elif status.lower() in ['fail', 'failed', 'invalid']:
                indicator = "❌"
            elif status.lower() in ['attention', 'warning', 'warn']:
                indicator = "⚠️"
            else:
                indicator = "ℹ️"
            
            print(f"{check_id}. {indicator} {check_name}")
            print(f"   Status: {status}")
            print(f"   Detail: {detail}")
            
            if items:
                print(f"   Items:")
                for item in items:
                    label = item.get('label', 'Unknown')
                    passed = item.get('passed', False)
                    item_indicator = "✓" if passed else "✗"
                    print(f"      {item_indicator} {label}")
            print()
    
    # Display PO details if available
    if result.get('purchase_order'):
        print("-" * 70)
        print("PURCHASE ORDER DETAILS")
        print("-" * 70)
        po_details = result.get('purchase_order', {})
        print(json.dumps(po_details, indent=2, default=str))
    
    # Show full result for debugging
    print("\n" + "-" * 70)
    print("FULL RESULT (for debugging)")
    print("-" * 70)
    print(json.dumps(result, indent=2, default=str))
    
    return result


if __name__ == "__main__":
    test_po_agent()
