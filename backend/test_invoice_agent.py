"""
Test script for Invoice Agent (Step 5) - Invoice Validation / Three-Way Matching
Tests the 6 key checks:
1. Goods Receipt Verification
2. Amount Match PO
3. Three-Way Match
4. Data Completeness
5. Supplier Verification
6. Payment Terms
"""

import json
from datetime import datetime, timedelta
from app.agents.invoice_agent import InvoiceAgent


def test_invoice_agent():
    """Test Invoice Agent with REQ-1768913207 data."""
    
    # Invoice data matching REQ-1768913207 context
    invoice_data = {
        "invoice_number": "INV-2026-001234",
        "invoice_date": "2026-01-18",
        "invoice_amount": 16200.00,  # $15,000 + 8% tax = $16,200
        "invoice_due_date": "2026-02-17",  # Net 30
        "invoice_file_url": "/invoices/INV-2026-001234.pdf",
        "supplier_id": 1,
        "supplier_name": "Office Supplies Co",
        "po_number": "PO-000062",
        "requisition_number": "REQ-1768913207",
        "currency": "USD",
        "tax_amount": 1200.00,
        "subtotal": 15000.00,
        "line_items": [
            {
                "line_number": 1,
                "description": "Marketing Brochures",
                "quantity": 1000,
                "unit_price": 10.00,
                "total": 10000.00
            },
            {
                "line_number": 2,
                "description": "Promotional Items",
                "quantity": 500,
                "unit_price": 10.00,
                "total": 5000.00
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
        "tax_rate": 0.08,
        "tax_amount": 1200.00,
        "grand_total": 16200.00,
        "payment_terms": "Net 30",
        "status": "RECEIVED",
        "created_at": "2026-01-05",
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
    
    # Goods Receipts data (from Step 4)
    goods_receipts = [
        {
            "receipt_number": "GR-2026-000062",
            "po_number": "PO-000062",
            "receipt_date": "2026-01-20",
            "received_by": "USR-WH01",
            "warehouse_location": "WH-A01",
            "quality_status": "passed",
            "total_received": 1500,
            "line_items": [
                {
                    "line_number": 1,
                    "product_name": "Marketing Brochures",
                    "quantity_ordered": 1000,
                    "quantity_received": 1000,
                    "status": "complete"
                },
                {
                    "line_number": 2,
                    "product_name": "Promotional Items",
                    "quantity_ordered": 500,
                    "quantity_received": 500,
                    "status": "complete"
                }
            ]
        }
    ]
    
    print("=" * 70)
    print("INVOICE AGENT (STEP 5) - INVOICE VALIDATION / THREE-WAY MATCH TEST")
    print("=" * 70)
    print(f"\nTesting with requisition: REQ-1768913207")
    print(f"Invoice Number: {invoice_data['invoice_number']}")
    print(f"PO Number: {purchase_order['po_number']}")
    print(f"Invoice Amount: ${invoice_data['invoice_amount']:,.2f}")
    print(f"PO Amount: ${purchase_order['grand_total']:,.2f}")
    print(f"Supplier: {invoice_data['supplier_name']}")
    print(f"Payment Terms: {purchase_order['payment_terms']}")
    print(f"Procurement Type: GOODS (Three-Way Match)")
    print("-" * 70)
    
    # Initialize Invoice Agent (use_mock=True for testing)
    agent = InvoiceAgent(use_mock=True)
    
    # Process the invoice
    print("\nProcessing invoice (Three-Way Match)...")
    result = agent.process_invoice(
        invoice=invoice_data,
        purchase_order=purchase_order,
        goods_receipts=goods_receipts,
        procurement_type="goods",
        service_acceptance=None
    )
    
    print("\n" + "=" * 70)
    print("INVOICE AGENT RESULT")
    print("=" * 70)
    
    # Apply verdict correction logic (same as routes.py)
    # If all key_checks pass, override verdict to AUTO_APPROVE
    key_checks = result.get('key_checks', [])
    if key_checks:
        passed_count = sum(1 for c in key_checks if str(c.get('status', '')).lower() in ['pass', 'passed', 'verified', 'valid'])
        failed_count = sum(1 for c in key_checks if str(c.get('status', '')).lower() in ['fail', 'failed', 'invalid'])
        attention_count = sum(1 for c in key_checks if str(c.get('status', '')).lower() in ['attention', 'warning', 'warn'])
        
        if failed_count == 0 and attention_count == 0 and passed_count == len(key_checks):
            result['verdict'] = 'AUTO_APPROVE'
            result['verdict_reason'] = f"All {passed_count} checks passed - approved for processing"
    
    # Display result structure
    print(f"\nVerdict: {result.get('verdict', 'N/A')}")
    print(f"Verdict Reason: {result.get('verdict_reason', 'N/A')}")
    print("\n💡 Note: The API route applies verdict correction logic. If all key_checks pass,"
          "\n   the verdict is changed to AUTO_APPROVE regardless of agent's raw output.")
    
    if result.get('match_status'):
        print(f"Match Status: {result.get('match_status')}")
    
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
    
    # Display match details if available
    if result.get('match_details'):
        print("-" * 70)
        print("MATCH DETAILS")
        print("-" * 70)
        match_details = result.get('match_details', {})
        print(json.dumps(match_details, indent=2, default=str))
    
    # Display payment info if available
    if result.get('payment_recommendation') or result.get('approved_amount'):
        print("\n" + "-" * 70)
        print("PAYMENT INFORMATION")
        print("-" * 70)
        if result.get('approved_amount'):
            print(f"  Approved Amount: ${result.get('approved_amount'):,.2f}")
        if result.get('payment_due_date'):
            print(f"  Due Date: {result.get('payment_due_date')}")
        if result.get('payment_recommendation'):
            print(f"  Recommendation: {result.get('payment_recommendation')}")
    
    # Show full result for debugging
    print("\n" + "-" * 70)
    print("FULL RESULT (for debugging)")
    print("-" * 70)
    print(json.dumps(result, indent=2, default=str))
    
    return result


if __name__ == "__main__":
    test_invoice_agent()
