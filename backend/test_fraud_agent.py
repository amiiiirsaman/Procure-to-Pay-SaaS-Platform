"""
Test script for Fraud Agent (Step 6) - Fraud Detection / Risk Analysis
Tests the 6 key checks:
1. Budget Check
2. Supplier Risk Score
3. Duplicate Detection
4. Transaction Pattern
5. Document Completeness
6. Fraud Risk Score
"""

import json
from datetime import datetime, timedelta
from app.agents.fraud_agent import FraudAgent


def test_fraud_agent():
    """Test Fraud Agent with REQ-1768913207 data."""
    
    # Transaction data matching REQ-1768913207 context
    transaction_data = {
        "transaction_id": "TXN-2026-001234",
        "invoice_number": "INV-2026-001234",
        "invoice_date": "2026-01-18",
        "invoice_amount": 16200.00,
        "amount": 16200.00,  # Alias for invoice_amount
        "total_amount": 16200.00,  # Alias for invoice_amount
        "po_number": "PO-000062",
        "requisition_number": "REQ-1768913207",
        "supplier_id": 1,
        "supplier_name": "Office Supplies Co",
        "department": "Marketing",
        "requestor_name": "John Smith",
        "requestor_id": "USR-001",
        "payment_method": "ACH",
        "payment_terms": "Net 30",
        "budget": 20000.00,  # Budget for this transaction
        "budget_allocated": 20000.00,  # Budget for Marketing
        "allocated_budget": 20000.00,  # Alias
        "budget_used": 15000.00,  # Amount already used
        "created_at": "2026-01-18T10:30:00",
        # Fraud-related fields
        "fraud_risk_score": 15,
        "supplier_years_in_business": 15,
        # Documents attached
        "attached_documents": [
            "PO-000062.pdf",
            "INV-2026-001234.pdf",
            "GR-2026-000062.pdf"
        ],
        "documents": [
            "PO-000062.pdf",
            "INV-2026-001234.pdf",
            "GR-2026-000062.pdf"
        ]
    }
    
    # Vendor data
    vendor_data = {
        "vendor_id": 1,
        "vendor_name": "Office Supplies Co",
        "vendor_ein": "12-3456789",
        "vendor_address": "123 Business Park, Suite 100, Chicago, IL 60601",
        "vendor_phone": "312-555-1234",
        "vendor_email": "accounts@officesupplies.com",
        "vendor_website": "https://officesupplies.com",
        "vendor_status": "approved",
        "vendor_category": "Office Supplies",
        "years_in_business": 15,
        "risk_score": 25,  # Low risk (0-100)
        "bank_account_last_changed": "2024-06-15",
        "total_transactions": 50,
        "total_spend": 125000.00,
        "contract_on_file": True,
        "contract_expiry": "2027-12-31",
        "payment_history": "Good",
        "is_preferred": True
    }
    
    # Transaction history with this vendor
    transaction_history = [
        {
            "invoice_number": "INV-2025-008765",
            "invoice_date": "2025-11-15",
            "amount": 5000.00,
            "status": "paid"
        },
        {
            "invoice_number": "INV-2025-009123",
            "invoice_date": "2025-12-10",
            "amount": 7500.00,
            "status": "paid"
        }
    ]
    
    # Employee data for collusion check
    employee_data = [
        {
            "employee_id": "USR-001",
            "name": "John Smith",
            "department": "Marketing",
            "address": "456 Oak Street, Chicago, IL 60602",  # Different from vendor
            "phone": "312-555-9876"  # Different from vendor
        }
    ]
    
    print("=" * 70)
    print("FRAUD AGENT (STEP 6) - FRAUD DETECTION / RISK ANALYSIS TEST")
    print("=" * 70)
    print(f"\nTesting with requisition: REQ-1768913207")
    print(f"Transaction ID: {transaction_data['transaction_id']}")
    print(f"Invoice Number: {transaction_data['invoice_number']}")
    print(f"Invoice Amount: ${transaction_data['invoice_amount']:,.2f}")
    print(f"Vendor: {vendor_data['vendor_name']}")
    print(f"Vendor Risk Score: {vendor_data['risk_score']}")
    print(f"Budget Allocated: ${transaction_data['budget_allocated']:,.2f}")
    print(f"Budget Used: ${transaction_data['budget_used']:,.2f}")
    print("-" * 70)
    
    # Initialize Fraud Agent (use_mock=True for testing)
    agent = FraudAgent(use_mock=True)
    
    # Analyze the transaction
    print("\nAnalyzing transaction for fraud indicators...")
    result = agent.analyze_transaction(
        transaction=transaction_data,
        vendor=vendor_data,
        transaction_history=transaction_history,
        employee_data=employee_data
    )
    
    print("\n" + "=" * 70)
    print("FRAUD AGENT RESULT")
    print("=" * 70)
    
    # Display result structure
    print(f"\nVerdict: {result.get('verdict', 'N/A')}")
    print(f"Verdict Reason: {result.get('verdict_reason', 'N/A')}")
    
    if result.get('risk_score') is not None:
        print(f"Risk Score: {result.get('risk_score')}")
    if result.get('risk_level'):
        print(f"Risk Level: {result.get('risk_level')}")
    
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
            
            # Status indicator (ASCII only for Windows compatibility)
            if str(status).lower() in ['pass', 'passed', 'verified', 'valid']:
                indicator = "[PASS]"
            elif str(status).lower() in ['fail', 'failed', 'invalid']:
                indicator = "[FAIL]"
            elif str(status).lower() in ['attention', 'warning', 'warn']:
                indicator = "[WARN]"
            else:
                indicator = "[INFO]"
            
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
                        item_indicator = "[Y]" if passed else "[N]"
                        print(f"      {item_indicator} {label}")
                    else:
                        print(f"      - {item}")
            print()
    
    # Display fraud flags if any
    if result.get('fraud_flags'):
        print("-" * 70)
        print("FRAUD FLAGS DETECTED")
        print("-" * 70)
        for flag in result.get('fraud_flags', []):
            print(f"  ⚠️ {flag}")
    
    # Display investigation recommendations if any
    if result.get('recommendations') or result.get('investigation_actions'):
        print("\n" + "-" * 70)
        print("RECOMMENDATIONS")
        print("-" * 70)
        for rec in result.get('recommendations', result.get('investigation_actions', [])):
            print(f"  → {rec}")
    
    # Show full result for debugging
    print("\n" + "-" * 70)
    print("FULL RESULT (for debugging)")
    print("-" * 70)
    print(json.dumps(result, indent=2, default=str))
    
    return result


if __name__ == "__main__":
    test_fraud_agent()
