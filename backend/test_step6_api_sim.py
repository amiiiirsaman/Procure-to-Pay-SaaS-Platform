"""
Test Fraud Agent Step 6 - simulates API workflow call
"""
import os
os.environ["USE_MOCK_AGENTS"] = "true"

from app.agents.fraud_agent import FraudAgent
from app.config import settings

print("=" * 70)
print("STEP 6 FRAUD ANALYSIS - API SIMULATION TEST")
print("=" * 70)
print(f"Mock mode enabled: {settings.use_mock_agents}")

# Simulate req_dict as built in routes.py
req_dict = {
    "id": 62,
    "number": "REQ-1768913207",
    "description": "I want 12 Mac laptops for 12 new interns from Marketing department",
    "department": "marketing",
    "total_amount": 15000.0,
    "amount": 15000.0,  # Alias
    "budget": 100000,
    "budget_allocated": 100000,
    "allocated_budget": 100000,
    "supplier_name": "Office Supplies Co",
    "supplier_id": 1,
    # Fraud fields
    "supplier_bank_account": "****5678",
    "supplier_bank_account_changed_date": None,
    "supplier_ein": "12-3456789",
    "supplier_years_in_business": 10,
    "requester_vendor_relationship": "None",
    "similar_transactions_count": 0,
    "fraud_risk_score": 15,
    "fraud_indicators": "[]",
    # Documents
    "attached_documents": ["requisition", "purchase_order", "invoice"],
}

# Simulate vendor_info_for_fraud as built in routes.py
vendor_info_for_fraud = {
    "name": "Office Supplies Co",
    "id": 1,
    "risk_score": 20,
    "years_in_business": 10,
    "ein": "12-3456789",
    "bank_account": "****1234",
    "approved_vendor": True
}

print(f"\nRequisition: {req_dict['number']}")
print(f"Amount: ${req_dict['total_amount']:,.2f}")
print(f"Budget: ${req_dict['budget']:,.2f}")
print(f"Supplier: {req_dict['supplier_name']}")
print("-" * 70)

# Create agent as routes.py does - FORCE MOCK MODE
fraud_agent = FraudAgent(use_mock=True)  # Force mock mode for testing
print(f"Agent mock mode: {fraud_agent.use_mock}")

# Call analyze_transaction as routes.py does
result = fraud_agent.analyze_transaction(
    transaction=req_dict,
    vendor=vendor_info_for_fraud,
    transaction_history=[],
)

print("\n" + "=" * 70)
print("RESULT")
print("=" * 70)

# Apply verdict correction (same as routes.py)
key_checks = result.get("key_checks", [])
if key_checks:
    passed_count = sum(1 for c in key_checks if str(c.get("status", "")).lower() in ["pass", "passed"])
    failed_count = sum(1 for c in key_checks if str(c.get("status", "")).lower() in ["fail", "failed"])
    attention_count = sum(1 for c in key_checks if str(c.get("status", "")).lower() in ["attention", "warning"])
    
    if failed_count == 0 and attention_count == 0 and passed_count == len(key_checks):
        result["verdict"] = "AUTO_APPROVE"
        result["verdict_reason"] = f"All {passed_count} checks passed - approved for processing"

print(f"Verdict: {result.get('verdict')}")
print(f"Verdict Reason: {result.get('verdict_reason')}")
print(f"Risk Score: {result.get('risk_score')}")

print("\n6 KEY CHECKS:")
print("-" * 70)

for i, check in enumerate(result.get("key_checks", []), 1):
    status = check.get("status", "unknown")
    indicator = "[PASS]" if status == "pass" else "[FAIL]" if status == "fail" else "[WARN]"
    print(f"{i}. {indicator} {check.get('name')}")
    print(f"   Status: {status}")
    print(f"   Detail: {check.get('detail')}")
    print()

# Check summary
summary = result.get("checks_summary", {})
if summary:
    print(f"Summary: {summary.get('passed', 0)} passed, {summary.get('attention', 0)} attention, {summary.get('failed', 0)} failed")
