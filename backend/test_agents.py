"""
Test script to verify all agents produce proper reasoning and verdicts.
"""
import json

print("=" * 60)
print("Testing P2P Engine Agents")
print("=" * 60)

# Test 1: ApprovalAgent
print("\n1. Testing ApprovalAgent...")
from app.agents import ApprovalAgent
a = ApprovalAgent(use_mock=True)
result = a._generate_mock_response('test', {
    'document': {
        'total_amount': 5000, 
        'department': 'IT', 
        'urgency': 'standard',
        'requestor_authority_level': 2500,
        'department_budget_limit': 100000,
    }
})
print(f"   Verdict: {result.get('verdict')}")
print(f"   Verdict Reason: {result.get('verdict_reason')}")
print(f"   Reasoning bullets ({len(result.get('reasoning_bullets', []))}):")
for b in result.get('reasoning_bullets', [])[:3]:
    print(f"     - {b}")

# Test 2: POAgent
print("\n2. Testing POAgent...")
from app.agents import POAgent
po = POAgent(use_mock=True)
result = po._generate_mock_response('test', {
    'requisition': {
        'total_amount': 10000,
        'supplier_name': 'Tech Supplies Inc',
        'supplier_payment_terms': 'Net 30',
        'shipping_method': 'Ground',
        'tax_rate': 7.5,
        'tax_amount': 750,
    }
})
print(f"   Verdict: {result.get('verdict')}")
print(f"   Verdict Reason: {result.get('verdict_reason')}")
print(f"   Reasoning bullets ({len(result.get('reasoning_bullets', []))}):")
for b in result.get('reasoning_bullets', [])[:3]:
    print(f"     - {b}")

# Test 3: ReceivingAgent
print("\n3. Testing ReceivingAgent...")
from app.agents import ReceivingAgent
ra = ReceivingAgent(use_mock=True)
result = ra._generate_mock_response('test', {
    'requisition': {
        'received_quantity': 95,
        'quality_status': 'passed',
        'warehouse_location': 'WH-A01',
    },
    'purchase_order': {
        'ordered_qty': 100,
        'po_number': 'PO-000001'
    }
})
print(f"   Verdict: {result.get('verdict')}")
print(f"   Verdict Reason: {result.get('verdict_reason')}")
print(f"   Reasoning bullets ({len(result.get('reasoning_bullets', []))}):")
for b in result.get('reasoning_bullets', [])[:3]:
    print(f"     - {b}")

# Test 4: InvoiceAgent
print("\n4. Testing InvoiceAgent...")
from app.agents import InvoiceAgent
ia = InvoiceAgent(use_mock=True)
result = ia._generate_mock_response('test', {
    'requisition': {
        'total_amount': 10000,
        'invoice_number': 'INV-123456',
        'invoice_amount': 10000,
        'three_way_match_status': 'matched',
        'received_quantity': 100,
    }
})
print(f"   Verdict: {result.get('verdict')}")
print(f"   Verdict Reason: {result.get('verdict_reason')}")
print(f"   Reasoning bullets ({len(result.get('reasoning_bullets', []))}):")
for b in result.get('reasoning_bullets', [])[:3]:
    print(f"     - {b}")

# Test 5: FraudAgent
print("\n5. Testing FraudAgent...")
from app.agents import FraudAgent
fa = FraudAgent(use_mock=True)
result = fa._generate_mock_response('test', {
    'requisition': {
        'total_amount': 10000,
        'supplier_years_in_business': 15,
        'fraud_risk_score': 12,
        'requester_vendor_relationship': 'None',
    }
})
print(f"   Verdict: {result.get('verdict')}")
print(f"   Verdict Reason: {result.get('verdict_reason')}")
print(f"   Risk Score: {result.get('risk_score')}")
print(f"   Reasoning bullets ({len(result.get('reasoning_bullets', []))}):")
for b in result.get('reasoning_bullets', [])[:3]:
    print(f"     - {b}")

# Test 6: ComplianceAgent
print("\n6. Testing ComplianceAgent...")
from app.agents import ComplianceAgent
ca = ComplianceAgent(use_mock=True)
result = ca._generate_mock_response('test', {
    'requisition': {
        'total_amount': 10000,
        'required_documents': '["Invoice", "PO", "Goods Receipt"]',
        'attached_documents': '[{"type": "Invoice"}, {"type": "PO"}, {"type": "Goods Receipt"}]',
        'segregation_of_duties_ok': True,
        'approver_chain': '[{"role": "Manager", "status": "approved"}]',
    }
})
print(f"   Verdict: {result.get('verdict')}")
print(f"   Verdict Reason: {result.get('verdict_reason')}")
print(f"   Payment Clearance: {result.get('payment_clearance')}")
print(f"   Reasoning bullets ({len(result.get('reasoning_bullets', []))}):")
for b in result.get('reasoning_bullets', [])[:3]:
    print(f"     - {b}")

# Test 7: PaymentAgent
print("\n7. Testing PaymentAgent...")
from app.agents.payment_agent import PaymentAgent
pa = PaymentAgent(use_mock=True)
result = pa._generate_mock_response('test', {
    'total_amount': 10000,
    'supplier_name': 'Tech Supplies Inc',
    'requisition_number': 'REQ-000001',
    'supplier_bank_name': 'Chase',
    'supplier_bank_account': '****1234',
    'payment_method': 'ACH',
})
print(f"   Verdict: {result.get('verdict')}")
print(f"   Verdict Reason: {result.get('verdict_reason')}")
print(f"   Payment Authorized: {result.get('payment_authorized')}")
print(f"   Transaction ID: {result.get('transaction_id')}")
print(f"   Reasoning bullets ({len(result.get('reasoning_bullets', []))}):")
for b in result.get('reasoning_bullets', [])[:3]:
    print(f"     - {b}")

print("\n" + "=" * 60)
print("All agent tests completed successfully!")
print("=" * 60)
