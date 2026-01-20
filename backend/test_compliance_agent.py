"""
Test script for Compliance Agent (Step 7) - Compliance & Audit Check
Tests the 6 key checks:
1. Audit Trail
2. Required Documents
3. Segregation of Duties
4. Approval Chain
5. Policy Compliance
6. Vendor Compliance
"""

import json
from datetime import datetime, timedelta
from app.agents.compliance_agent import ComplianceAgent


def test_compliance_agent():
    """Test Compliance Agent with REQ-1768913207 data."""
    
    # Transaction data matching REQ-1768913207 context
    transaction_data = {
        "transaction_id": "TXN-2026-001234",
        "requisition_number": "REQ-1768913207",
        "requisition_id": 62,
        "po_number": "PO-000062",
        "invoice_number": "INV-2026-001234",
        "total_amount": 15000.00,  # Tier 3: $10,000 - $49,999
        "department": "Marketing",
        "cost_center": "CC-MKT-001",
        "requestor_id": "USR-001",
        "requestor_name": "John Smith",
        "supplier_id": 1,
        "supplier_name": "Office Supplies Co",
        "created_at": "2026-01-10T09:00:00",
        "approved_at": "2026-01-11T14:30:00",
        "po_created_at": "2026-01-12T10:00:00",
        "received_at": "2026-01-20T11:00:00",
        "invoiced_at": "2026-01-18T08:00:00",
        "audit_trail": [
            {
                "action": "requisition_created",
                "user_id": "USR-001",
                "timestamp": "2026-01-10T09:00:00",
                "details": "Requisition REQ-1768913207 created"
            },
            {
                "action": "requisition_approved",
                "user_id": "USR-MGR-001",
                "timestamp": "2026-01-11T14:30:00",
                "details": "Approved by department manager"
            },
            {
                "action": "po_created",
                "user_id": "USR-BUY-001",
                "timestamp": "2026-01-12T10:00:00",
                "details": "PO-000062 generated"
            },
            {
                "action": "goods_received",
                "user_id": "USR-WH-001",
                "timestamp": "2026-01-20T11:00:00",
                "details": "Goods received at warehouse WH-A01"
            },
            {
                "action": "invoice_received",
                "user_id": "USR-AP-001",
                "timestamp": "2026-01-18T08:00:00",
                "details": "Invoice INV-2026-001234 recorded"
            }
        ]
    }
    
    # Actors involved in the transaction
    actors = {
        "requestor": {
            "user_id": "USR-001",
            "name": "John Smith",
            "role": "requestor",
            "department": "Marketing"
        },
        "approver": {
            "user_id": "USR-MGR-001",
            "name": "Jane Doe",
            "role": "procurement_manager",
            "department": "Marketing"
        },
        "buyer": {
            "user_id": "USR-BUY-001",
            "name": "Bob Wilson",
            "role": "buyer",
            "department": "Procurement"
        },
        "receiver": {
            "user_id": "USR-WH-001",
            "name": "Alice Brown",
            "role": "warehouse",
            "department": "Operations"
        },
        "invoice_processor": {
            "user_id": "USR-AP-001",
            "name": "Charlie Davis",
            "role": "ap_clerk",
            "department": "Finance"
        }
    }
    
    # Documents attached (Tier 3 requires: invoice, PO, GR, 3 quotes, director approval, budget confirmation)
    documents = [
        {
            "document_type": "invoice",
            "document_id": "DOC-INV-001234",
            "filename": "INV-2026-001234.pdf",
            "uploaded_at": "2026-01-18T08:00:00",
            "status": "verified"
        },
        {
            "document_type": "purchase_order",
            "document_id": "DOC-PO-000062",
            "filename": "PO-000062.pdf",
            "uploaded_at": "2026-01-12T10:00:00",
            "status": "verified"
        },
        {
            "document_type": "goods_receipt",
            "document_id": "DOC-GR-000062",
            "filename": "GR-2026-000062.pdf",
            "uploaded_at": "2026-01-20T11:00:00",
            "status": "verified"
        },
        {
            "document_type": "three_competitive_quotes",
            "document_id": "DOC-QUOTES-001",
            "filename": "competitive_quotes.pdf",
            "uploaded_at": "2026-01-10T09:30:00",
            "status": "verified"
        },
        {
            "document_type": "director_approval",
            "document_id": "DOC-APPR-001",
            "filename": "director_approval.pdf",
            "uploaded_at": "2026-01-11T15:00:00",
            "status": "verified"
        },
        {
            "document_type": "budget_confirmation",
            "document_id": "DOC-BUDGET-001",
            "filename": "budget_confirmation.pdf",
            "uploaded_at": "2026-01-10T10:00:00",
            "status": "verified"
        }
    ]
    
    print("=" * 70)
    print("COMPLIANCE AGENT (STEP 7) - COMPLIANCE & AUDIT CHECK TEST")
    print("=" * 70)
    print(f"\nTesting with requisition: REQ-1768913207")
    print(f"Transaction Amount: ${transaction_data['total_amount']:,.2f}")
    print(f"Amount Tier: Tier 3 ($10,000 - $49,999)")
    print(f"Supplier: {transaction_data['supplier_name']}")
    print(f"Department: {transaction_data['department']}")
    print(f"Documents Attached: {len(documents)}")
    print(f"Actors Involved: {len(actors)}")
    print("-" * 70)
    
    # Initialize Compliance Agent (use_mock=True for testing)
    agent = ComplianceAgent(use_mock=True)
    
    # Check compliance
    print("\nPerforming compliance check...")
    result = agent.check_compliance(
        transaction=transaction_data,
        transaction_type="invoice",
        actors=actors,
        documents=documents
    )
    
    print("\n" + "=" * 70)
    print("COMPLIANCE AGENT RESULT")
    print("=" * 70)
    
    # Display result structure
    print(f"\nVerdict: {result.get('verdict', 'N/A')}")
    print(f"Verdict Reason: {result.get('verdict_reason', 'N/A')}")
    
    if result.get('compliance_status'):
        print(f"Compliance Status: {result.get('compliance_status')}")
    
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
    
    # Display violations if any
    if result.get('violations'):
        print("-" * 70)
        print("COMPLIANCE VIOLATIONS")
        print("-" * 70)
        for violation in result.get('violations', []):
            print(f"  ⚠️ {violation}")
    
    # Display recommendations if any
    if result.get('recommendations') or result.get('remediation_steps'):
        print("\n" + "-" * 70)
        print("RECOMMENDATIONS / REMEDIATION")
        print("-" * 70)
        for rec in result.get('recommendations', result.get('remediation_steps', [])):
            print(f"  → {rec}")
    
    # Show full result for debugging
    print("\n" + "-" * 70)
    print("FULL RESULT (for debugging)")
    print("-" * 70)
    print(json.dumps(result, indent=2, default=str))
    
    return result


if __name__ == "__main__":
    test_compliance_agent()
