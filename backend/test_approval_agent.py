"""Test Approval Agent (Step 2) for REQ-1768913207."""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_approval_agent():
    # First get the requisition details
    print("=" * 60)
    print("STEP 1: GET REQUISITION DATA")
    print("=" * 60)
    
    r = requests.get(f"{BASE_URL}/requisitions/1768913207", timeout=30)
    print(f"Status: {r.status_code}")
    
    if r.status_code != 200:
        print(f"Error: {r.text}")
        return
    
    req = r.json()
    print(f"ID: {req.get('id')}")
    print(f"Number: {req.get('number')}")
    print(f"Amount: ${req.get('total_amount', 0):,.2f}")
    print(f"Department: {req.get('department')}")
    print(f"Urgency: {req.get('urgency')}")
    print(f"Status: {req.get('status')}")
    print(f"Supplier: {req.get('supplier_name')}")
    print(f"Contract on File: {req.get('contract_on_file')}")
    
    # Now run the workflow and extract Step 2 results
    print("\n" + "=" * 60)
    print("STEP 2: RUN WORKFLOW - APPROVAL CHECK")
    print("=" * 60)
    
    r = requests.post(
        f"{BASE_URL}/agents/workflow/run",
        json={"requisition_id": 1768913207, "mode": "auto"},
        timeout=120
    )
    print(f"Workflow Status: {r.status_code}")
    
    if r.status_code != 200:
        print(f"Error: {r.text[:1000]}")
        return
    
    data = r.json()
    print(f"Workflow ID: {data.get('workflow_id')}")
    print(f"Overall Status: {data.get('status')}")
    print(f"Total Steps: {data.get('total_steps')}")
    print(f"Steps Completed: {len(data.get('steps', []))}")
    
    # Find Step 2 - Approval Check
    steps = data.get("steps", [])
    step2 = None
    for step in steps:
        if step.get("step_id") == 2 or step.get("step_name") == "Approval Check":
            step2 = step
            break
    
    if not step2:
        print("\nStep 2 (Approval Check) not found in results!")
        print("Available steps:")
        for s in steps:
            print(f"  - Step {s.get('step_id')}: {s.get('step_name')}")
        return
    
    print("\n" + "=" * 60)
    print("APPROVAL CHECK (STEP 2) - DETAILED OUTPUT")
    print("=" * 60)
    
    print(f"\nStep Name: {step2.get('step_name')}")
    print(f"Status: {step2.get('status')}")
    
    # Get result_data where key_checks lives
    result_data = step2.get("result_data", {})
    
    print(f"Verdict: {result_data.get('verdict')}")
    print(f"Verdict Reason: {result_data.get('verdict_reason')}")
    print(f"Flagged: {step2.get('flagged')}")
    print(f"Flag Reason: {step2.get('flag_reason')}")
    
    # Print agent notes
    agent_notes = step2.get("agent_notes", [])
    if agent_notes:
        print(f"\n--- AGENT NOTES ---")
        for note in agent_notes:
            print(f"  {note}")
    
    # Print key checks from result_data
    key_checks = result_data.get("key_checks", [])
    print(f"\n--- KEY CHECKS ({len(key_checks)} total) ---")
    
    for check in key_checks:
        status_icon = "✅" if check.get("status") == "pass" else "⚠️" if check.get("status") == "attention" else "❌"
        print(f"\n{status_icon} Check {check.get('id')}: {check.get('name')}")
        print(f"   Status: {check.get('status')}")
        print(f"   Detail: {check.get('detail')}")
        items = check.get("items", [])
        for item in items:
            item_icon = "✓" if item.get("passed") else "✗"
            required = " (required)" if item.get("required") else ""
            print(f"      [{item_icon}] {item.get('label')}{required}")
    
    # Print summary from result_data
    summary = result_data.get("checks_summary", {})
    print(f"\n--- CHECKS SUMMARY ---")
    print(f"Total: {summary.get('total', 0)}")
    print(f"Passed: {summary.get('passed', 0)}")
    print(f"Attention: {summary.get('attention', 0)}")
    print(f"Failed: {summary.get('failed', 0)}")
    
    # Print approval chain from result_data
    approval_chain = result_data.get("approval_chain", [])
    if approval_chain:
        print(f"\n--- APPROVAL CHAIN ---")
        for approver in approval_chain:
            print(f"  Step {approver.get('step')}: {approver.get('role')} - {approver.get('status')}")
    
    # Print tier info from result_data
    print(f"\n--- TIER INFO ---")
    print(f"Tier: {result_data.get('tier')}")
    print(f"Tier Description: {result_data.get('tier_description')}")
    
    # Policy flags (check both places)
    policy_flags = result_data.get("policy_flags", []) or step2.get("policy_flags", [])
    if policy_flags:
        print(f"\n--- POLICY FLAGS ---")
        for flag in policy_flags:
            print(f"  ⚠️ {flag}")
    
    # Special reviews (check both places)
    special_reviews = result_data.get("special_reviews_required", []) or step2.get("special_reviews_required", [])
    if special_reviews:
        print(f"\n--- SPECIAL REVIEWS REQUIRED ---")
        for review in special_reviews:
            print(f"  📋 {review}")

if __name__ == "__main__":
    test_approval_agent()
