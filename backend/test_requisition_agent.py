"""
Test script for Requisition Agent (Step 1) - Requisition Validation
Tests the requisition validation and product/vendor suggestions.
"""

import json
from datetime import datetime
from app.agents.requisition_agent import RequisitionAgent


def test_requisition_agent():
    """Test Requisition Agent with REQ-1768913207 data."""
    
    # Requisition data matching REQ-1768913207
    requisition_data = {
        "id": 62,
        "number": "REQ-1768913207",
        "title": "Marketing Campaign Materials",
        "description": "Q1 2026 marketing campaign materials including brochures and promotional items",
        "total_amount": 15000.00,
        "currency": "USD",
        "department": "Marketing",
        "cost_center": "CC-MKT-001",
        "requestor_id": "USR-001",
        "requestor_name": "John Smith",
        "requestor_email": "john.smith@company.com",
        "urgency": "STANDARD",
        "category": "Marketing Materials",
        "needed_by_date": "2026-02-15",
        "supplier_id": 1,
        "supplier_name": "Office Supplies Co",
        "gl_account": "6100-MKT-PROMO",
        "created_at": "2026-01-10T09:00:00",
        "line_items": [
            {
                "id": 1,
                "description": "Marketing Brochures",
                "quantity": 1000,
                "unit_price": 10.00,
                "total": 10000.00,
                "category": "Print Materials"
            },
            {
                "id": 2,
                "description": "Promotional Items",
                "quantity": 500,
                "unit_price": 10.00,
                "total": 5000.00,
                "category": "Promotional"
            }
        ]
    }
    
    # Sample product catalog for suggestions
    catalog = [
        {"id": "CAT-001", "name": "Standard Brochures (100 pack)", "price": 100.00, "category": "Print Materials"},
        {"id": "CAT-002", "name": "Premium Brochures (100 pack)", "price": 150.00, "category": "Print Materials"},
        {"id": "CAT-003", "name": "Promotional Pens (100 pack)", "price": 75.00, "category": "Promotional"},
        {"id": "CAT-004", "name": "Branded Notebooks (50 pack)", "price": 125.00, "category": "Promotional"},
        {"id": "CAT-005", "name": "Marketing Banner", "price": 250.00, "category": "Display"},
    ]
    
    # Recent requisitions for duplicate check
    recent_requisitions = [
        {
            "number": "REQ-1768913100",
            "description": "Office supplies for Q4",
            "total_amount": 2500.00,
            "department": "Operations",
            "created_at": "2025-12-15"
        },
        {
            "number": "REQ-1768913150",
            "description": "IT Equipment upgrade",
            "total_amount": 45000.00,
            "department": "IT",
            "created_at": "2025-12-20"
        },
        {
            "number": "REQ-1768913180",
            "description": "Marketing flyers and banners",
            "total_amount": 5000.00,
            "department": "Marketing",
            "created_at": "2026-01-05"
        }
    ]
    
    print("=" * 70)
    print("REQUISITION AGENT (STEP 1) - REQUISITION VALIDATION TEST")
    print("=" * 70)
    print(f"\nTesting with requisition: {requisition_data['number']}")
    print(f"Description: {requisition_data['description']}")
    print(f"Amount: ${requisition_data['total_amount']:,.2f}")
    print(f"Department: {requisition_data['department']}")
    print(f"Requestor: {requisition_data['requestor_name']}")
    print(f"Urgency: {requisition_data['urgency']}")
    print(f"Category: {requisition_data['category']}")
    print(f"Line Items: {len(requisition_data['line_items'])}")
    print("-" * 70)
    
    # Initialize Requisition Agent (use_mock=True for testing)
    agent = RequisitionAgent(use_mock=True)
    
    # Validate the requisition
    print("\nValidating requisition...")
    result = agent.validate_requisition(
        requisition=requisition_data,
        catalog=catalog,
        recent_requisitions=recent_requisitions
    )
    
    print("\n" + "=" * 70)
    print("REQUISITION AGENT RESULT")
    print("=" * 70)
    
    # Display result structure
    print(f"\nStatus: {result.get('status', 'N/A')}")
    print(f"Verdict: {result.get('verdict', 'N/A')}")
    print(f"Verdict Reason: {result.get('verdict_reason', 'N/A')}")
    print(f"Confidence: {result.get('confidence', 'N/A')}")
    
    # Display validation errors if any
    if result.get('validation_errors'):
        print("\n" + "-" * 70)
        print("VALIDATION ERRORS")
        print("-" * 70)
        for error in result.get('validation_errors', []):
            print(f"  ❌ {error}")
    
    # Display suggestions if available
    suggestions = result.get('suggestions', {})
    if suggestions:
        print("\n" + "-" * 70)
        print("SUGGESTIONS")
        print("-" * 70)
        
        if suggestions.get('products'):
            print("\n  📦 Product Suggestions:")
            for prod in suggestions.get('products', []):
                print(f"      • {prod}")
        
        if suggestions.get('vendors'):
            print("\n  🏢 Vendor Suggestions:")
            for vendor in suggestions.get('vendors', []):
                print(f"      • {vendor}")
        
        if suggestions.get('gl_account'):
            print(f"\n  📊 GL Account: {suggestions.get('gl_account')}")
        
        if suggestions.get('cost_center'):
            print(f"  💰 Cost Center: {suggestions.get('cost_center')}")
    
    # Display duplicate check results
    duplicate_check = result.get('duplicate_check', {})
    if duplicate_check:
        print("\n" + "-" * 70)
        print("DUPLICATE CHECK")
        print("-" * 70)
        is_dup = duplicate_check.get('is_potential_duplicate', False)
        print(f"\n  Potential Duplicate: {'⚠️ Yes' if is_dup else '✅ No'}")
        if duplicate_check.get('similar_requisitions'):
            print(f"  Similar Requisitions:")
            for sim in duplicate_check.get('similar_requisitions', []):
                print(f"      • {sim}")
    
    # Display risk flags if any
    if result.get('risk_flags'):
        print("\n" + "-" * 70)
        print("RISK FLAGS")
        print("-" * 70)
        for flag in result.get('risk_flags', []):
            print(f"  ⚠️ {flag}")
    
    # Display recommendation
    if result.get('recommendation'):
        print("\n" + "-" * 70)
        print("RECOMMENDATION")
        print("-" * 70)
        print(f"\n  {result.get('recommendation')}")
    
    # Display key_checks if available
    key_checks = result.get('key_checks', [])
    if key_checks:
        print("\n" + "-" * 70)
        print("KEY CHECKS")
        print("-" * 70)
        for i, check in enumerate(key_checks, 1):
            check_name = check.get('name', 'Unknown')
            status = check.get('status', 'Unknown')
            detail = check.get('detail', 'No details')
            
            if str(status).lower() in ['pass', 'passed', 'valid']:
                indicator = "✅"
            elif str(status).lower() in ['fail', 'failed', 'invalid']:
                indicator = "❌"
            else:
                indicator = "⚠️"
            
            print(f"\n  {i}. {indicator} {check_name}")
            print(f"     Status: {status}")
            print(f"     Detail: {detail}")
    
    # Show full result for debugging
    print("\n" + "-" * 70)
    print("FULL RESULT (for debugging)")
    print("-" * 70)
    print(json.dumps(result, indent=2, default=str))
    
    return result


if __name__ == "__main__":
    test_requisition_agent()
