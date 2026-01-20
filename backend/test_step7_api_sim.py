"""
Test Compliance Agent Step 7 - simulates API workflow call
"""
import os
os.environ["USE_MOCK_AGENTS"] = "true"

from app.agents.compliance_agent import ComplianceAgent
from app.config import settings

print("=" * 70)
print("STEP 7 COMPLIANCE CHECK - API SIMULATION TEST")
print("=" * 70)
print(f"Mock mode enabled: {settings.use_mock_agents}")

# Simulate req_dict as built in routes.py
req_dict = {
    "id": 62,
    "number": "REQ-1768913207",
    "description": "I want 12 Mac laptops for 12 new interns from Marketing department",
    "department": "marketing",
    "total_amount": 15000.0,
    "amount": 15000.0,
    "supplier_name": "Office Supplies Co",
    "supplier_id": 1,
    # Compliance fields
    "approver_chain": "[]",
    "required_documents": "[]",
    "attached_documents": ["requisition", "purchase_order", "invoice"],
    "quotes_attached": 3,  # 3 competitive quotes for Tier 3
    "contract_id": None,
    "contract_expiry": None,
    "audit_trail": "[]",
    "policy_exceptions": None,
    "segregation_of_duties_ok": True,
}

actors = {
    "requestor_id": "USR-001",
    "requestor_name": "John Smith",
    "department": "Marketing",
}

documents = req_dict.get("attached_documents", [])

print(f"\nRequisition: {req_dict['number']}")
print(f"Amount: ${req_dict['total_amount']:,.2f}")
print(f"Supplier: {req_dict['supplier_name']}")
print(f"Documents: {documents}")
print("-" * 70)

# Create agent - FORCE MOCK MODE
compliance_agent = ComplianceAgent(use_mock=True)
print(f"Agent mock mode: {compliance_agent.use_mock}")

# Call check_compliance as routes.py does
result = compliance_agent.check_compliance(
    transaction=req_dict,
    transaction_type="requisition",
    actors=actors,
    documents=documents,
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
else:
    print("No checks_summary found - checking key_checks count...")
    if key_checks:
        passed = sum(1 for c in key_checks if c.get("status") == "pass")
        attention = sum(1 for c in key_checks if c.get("status") == "attention")
        failed = sum(1 for c in key_checks if c.get("status") == "fail")
        print(f"Computed Summary: {passed} passed, {attention} attention, {failed} failed")
