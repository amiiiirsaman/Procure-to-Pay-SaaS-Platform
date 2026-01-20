"""Test Step 8 via actual API call."""
import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_step8_api():
    """Test Step 8 by calling the workflow process endpoint."""
    
    print("\n" + "=" * 70)
    print("STEP 8 FINAL APPROVAL - ACTUAL API TEST")
    print("=" * 70)
    
    # First run steps 2-7 to populate steps_results
    print("\nRunning Steps 2-7 first...")
    for step in range(2, 8):
        payload = {
            "requisition_id": "1768913207",
            "start_from_step": step,
            "run_single_step": True,
        }
        
        response = requests.post(
            f"{BASE_URL}/agents/workflow/run",
            json=payload,
            timeout=60,
        )
        
        if response.status_code == 200:
            data = response.json()
            steps = data.get("steps", [])
            for s in steps:
                if s.get("step_id") == step:
                    print(f"  Step {step}: {s.get('verdict', 'N/A')}")
                    break
        else:
            print(f"  Step {step}: ERROR {response.status_code}")
    
    # Now run Step 8
    payload = {
        "requisition_id": "1768913207",
        "start_from_step": 8,
        "run_single_step": True,
    }
    
    print(f"\nCalling workflow endpoint for Step 8...")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    response = requests.post(
        f"{BASE_URL}/agents/workflow/run",
        json=payload,
        timeout=60,
    )
    
    print(f"\nResponse Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        
        print(f"\n{'=' * 70}")
        print("STEP 8 RESPONSE:")
        print(f"{'=' * 70}")
        
        # Find Step 8 in the steps array
        steps = data.get("steps", [])
        step8 = None
        for step in steps:
            if step.get("step_id") == 8:
                step8 = step
                break
        
        if step8:
            print(f"\nStep 8 Status: {step8.get('status')}")
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
                
                if len(key_checks) == 6:
                    print("\n✅ SUCCESS: Step 8 shows 6 key checks!")
                else:
                    print(f"\n⚠️ Expected 6 checks, got {len(key_checks)}")
            else:
                print("\n❌ No key_checks found in Step 8 result!")
                print(f"\nFull result_data: {json.dumps(result_data, indent=2)[:1000]}")
        else:
            print("\n❌ Step 8 not found in response!")
            print(f"Available steps: {[s.get('step_id') for s in steps]}")
    else:
        print(f"\n❌ API Error: {response.text}")


if __name__ == "__main__":
    test_step8_api()
