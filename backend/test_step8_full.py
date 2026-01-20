"""Test Step 8 via actual API call - Full workflow run."""
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_step8_full_workflow():
    """Test Step 8 by running the full workflow from Step 1 to Step 8."""
    
    print("\n" + "=" * 70)
    print("STEP 8 FINAL APPROVAL - FULL WORKFLOW TEST")
    print("=" * 70)
    
    # Run the full workflow from Step 1 through 8
    payload = {
        "requisition_id": "1768913207",
        "start_from_step": 1,
        "run_single_step": False,  # Run all steps
    }
    
    print(f"\nRunning full workflow (Steps 1-8)...")
    
    response = requests.post(
        f"{BASE_URL}/agents/workflow/run",
        json=payload,
        timeout=120,  # Longer timeout for full workflow
    )
    
    print(f"\nResponse Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        
        # Print overall status
        print(f"\nWorkflow Status: {data.get('status')}")
        print(f"Overall Notes: {len(data.get('notes', []))} notes")
        
        # Find each step's verdict
        steps = data.get("steps", [])
        print(f"\n{'=' * 70}")
        print("STEP SUMMARY (1-8):")
        print(f"{'=' * 70}")
        
        for step in steps:
            step_id = step.get("step_id")
            verdict = step.get("verdict", "N/A")
            status = step.get("status", "unknown")
            print(f"  Step {step_id}: {verdict} ({status})")
        
        # Now check Step 8 details
        step8 = None
        for step in steps:
            if step.get("step_id") == 8:
                step8 = step
                break
        
        if step8:
            print(f"\n{'=' * 70}")
            print("STEP 8 DETAILS:")
            print(f"{'=' * 70}")
            
            print(f"\nStatus: {step8.get('status')}")
            print(f"Verdict: {step8.get('verdict', 'N/A')}")
            print(f"Verdict Reason: {step8.get('verdict_reason', 'N/A')}")
            
            result_data = step8.get("result_data", {})
            key_checks = result_data.get("key_checks", [])
            
            print(f"\n{'=' * 70}")
            print("6 KEY CHECKS (Summary of Steps 2-7):")
            print(f"{'=' * 70}")
            
            if key_checks:
                for i, check in enumerate(key_checks, 1):
                    status = check.get("status", "unknown")
                    if status == "pass":
                        status_str = "[PASS]"
                    elif status == "attention":
                        status_str = "[ATTENTION]"
                    else:
                        status_str = f"[{status.upper()}]"
                    
                    print(f"\n{i}. {status_str} {check.get('name', 'Unknown')}")
                    print(f"   Detail: {check.get('detail', 'N/A')}")
                    items = check.get("items", [])
                    if items:
                        for item in items:
                            print(f"   • {item}")
                
                # Summary
                passed = sum(1 for c in key_checks if c.get("status") == "pass")
                attention = sum(1 for c in key_checks if c.get("status") == "attention")
                failed = sum(1 for c in key_checks if c.get("status") == "fail")
                
                print(f"\n{'=' * 70}")
                print(f"Summary: {passed} passed, {attention} attention, {failed} failed")
                
                # Validation
                meaningful_details = sum(1 for c in key_checks if c.get("detail") not in ["Step not yet executed", "Completed", None])
                if meaningful_details == 6:
                    print("\n✅ SUCCESS: All 6 key checks have meaningful details!")
                elif meaningful_details > 0:
                    print(f"\n✅ PARTIAL: {meaningful_details}/6 checks have meaningful details")
                else:
                    print("\n⚠️ WARNING: Key checks don't have meaningful details")
            else:
                print("\n❌ No key_checks found in Step 8 result!")
        else:
            print("\n❌ Step 8 not found in response!")
    else:
        print(f"\n❌ API Error: {response.text}")


if __name__ == "__main__":
    test_step8_full_workflow()
