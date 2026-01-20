"""
Test script for Receiving Agent (Step 4) - Goods Receipt Processing
Tests the 6 key checks:
1. Line Item Validation
2. Quantity Check
3. Variance Calculation
4. Discrepancy Flagging
5. Previous Receipts
6. Delivery Date
"""

import json
from datetime import datetime, timedelta
from app.agents.receiving_agent import ReceivingAgent


def test_receiving_agent():
    """Test Receiving Agent with REQ-1768913207 data."""
    
    # Sample requisition data matching REQ-1768913207 context
    requisition_context = {
        "id": 62,
        "number": "REQ-1768913207",
        "title": "Marketing Campaign Materials",
        "description": "Q1 2026 marketing campaign materials including brochures and promotional items",
        "total_amount": 15000.00,
        "department": "Marketing",
        "requestor_name": "John Smith",
        "requestor_email": "john.smith@company.com",
        "urgency": "STANDARD",
        "status": "PO_GENERATED",
        "supplier_id": 1,
        "supplier_name": "Office Supplies Co",
        "category": "Marketing Materials",
        "needed_by_date": "2026-02-15",
        "po_number": "PO-000062",
        "received_quantity": 1500,  # Received qty (matches ordered)
        "received_date": "2026-01-20",
        "quality_status": "passed",
        "damage_notes": None,
        "receiver_id": "USR-WH01",
        "warehouse_location": "WH-A01",
        "line_items": [
            {
                "id": 1,
                "product_name": "Marketing Brochures",
                "quantity": 1000,
                "unit_price": 10.00,
                "total": 10000.00
            },
            {
                "id": 2,
                "product_name": "Promotional Items",
                "quantity": 500,
                "unit_price": 10.00,
                "total": 5000.00
            }
        ]
    }
    
    # Receipt data - what was actually received
    receipt_data = {
        "items": [
            {
                "po_line_item_id": 1,
                "product_name": "Marketing Brochures",
                "quantity_received": 1000,
                "quality_status": "passed",
                "damage_notes": None
            },
            {
                "po_line_item_id": 2,
                "product_name": "Promotional Items",
                "quantity_received": 500,
                "quality_status": "passed",
                "damage_notes": None
            }
        ],
        "delivery_date": datetime.now().isoformat(),
        "requisition": requisition_context,
        "line_items": [
            {
                "product_name": "Marketing Brochures",
                "quantity_received": 1000,
                "po_line_item_id": 1
            },
            {
                "product_name": "Promotional Items",
                "quantity_received": 500,
                "po_line_item_id": 2
            }
        ]
    }
    
    # Purchase Order data
    purchase_order = {
        "po_number": "PO-000062",
        "number": "PO-000062",
        "requisition_id": 62,
        "requisition_number": "REQ-1768913207",
        "supplier_id": 1,
        "supplier_name": "Office Supplies Co",
        "total_amount": 15000.00,
        "ordered_qty": 1500,  # Total qty ordered (1000 + 500)
        "requisition_date": "2026-01-01",
        "created_at": "2026-01-05",
        "expected_delivery": "2026-02-15",
        "line_items": [
            {
                "id": 1,
                "product_name": "Marketing Brochures",
                "quantity": 1000,
                "unit_price": 10.00,
                "total": 10000.00
            },
            {
                "id": 2,
                "product_name": "Promotional Items",
                "quantity": 500,
                "unit_price": 10.00,
                "total": 5000.00
            }
        ]
    }
    
    print("=" * 70)
    print("RECEIVING AGENT (STEP 4) - GOODS RECEIPT PROCESSING TEST")
    print("=" * 70)
    print(f"\nTesting with requisition: {requisition_context['number']}")
    print(f"PO Number: {purchase_order['po_number']}")
    print(f"Amount: ${requisition_context['total_amount']:,.2f}")
    print(f"Supplier: {requisition_context['supplier_name']}")
    print(f"Total Ordered Qty: {purchase_order['ordered_qty']}")
    print(f"Total Received Qty: {requisition_context['received_quantity']}")
    print(f"Quality Status: {requisition_context['quality_status']}")
    print("-" * 70)
    
    # Initialize Receiving Agent (use_mock=True for testing)
    agent = ReceivingAgent(use_mock=True)
    
    # Process the receipt
    print("\nProcessing goods receipt...")
    result = agent.process_receipt(
        receipt_data=receipt_data,
        purchase_order=purchase_order,
        previous_receipts=[]
    )
    
    print("\n" + "=" * 70)
    print("RECEIVING AGENT RESULT")
    print("=" * 70)
    
    # Display result structure
    print(f"\nStatus: {result.get('status', 'N/A')}")
    print(f"Verdict: {result.get('verdict', 'N/A')}")
    print(f"Verdict Reason: {result.get('verdict_reason', 'N/A')}")
    
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
            if str(status).lower() in ['pass', 'passed', 'verified', 'valid']:
                indicator = "✅"
            elif str(status).lower() in ['fail', 'failed', 'invalid']:
                indicator = "❌"
            elif str(status).lower() in ['attention', 'warning', 'warn']:
                indicator = "⚠️"
            else:
                indicator = "ℹ️"
            
            print(f"{i}. {indicator} {check_name}")
            print(f"   ID: {check_id}")
            print(f"   Status: {status}")
            print(f"   Detail: {detail}")
            
            if items:
                print(f"   Items:")
                for item in items:
                    if isinstance(item, dict):
                        label = item.get('label', str(item))
                        passed = item.get('passed', False)
                        item_indicator = "✓" if passed else "✗"
                        print(f"      {item_indicator} {label}")
                    else:
                        print(f"      • {item}")
            print()
    
    # Display receipt summary if available
    if result.get('receipt_summary'):
        print("-" * 70)
        print("RECEIPT SUMMARY")
        print("-" * 70)
        receipt_summary = result.get('receipt_summary', {})
        print(json.dumps(receipt_summary, indent=2, default=str))
    
    # Display line details if available
    if result.get('line_details'):
        print("\n" + "-" * 70)
        print("LINE DETAILS")
        print("-" * 70)
        for line in result.get('line_details', []):
            print(f"  Line {line.get('po_line', 'N/A')}: "
                  f"Ordered={line.get('ordered_qty', 0)}, "
                  f"Received={line.get('received_qty', 0)}, "
                  f"Variance={line.get('variance_percent', 0):.1f}%, "
                  f"Status={line.get('status', 'N/A')}")
    
    # Show full result for debugging
    print("\n" + "-" * 70)
    print("FULL RESULT (for debugging)")
    print("-" * 70)
    print(json.dumps(result, indent=2, default=str))
    
    return result


if __name__ == "__main__":
    test_receiving_agent()
