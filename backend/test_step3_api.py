"""
Test Step 3 API endpoint directly.
"""
import requests
import json

def test_step3():
    url = "http://localhost:8000/api/v1/agents/workflow/run"
    payload = {
        "requisition_id": "1768913207",
        "start_from_step": 3,
        "run_single_step": True
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            step3 = data.get("steps", [{}])[0]
            print(f"\n=== STEP 3 RESULT ===")
            print(f"Step Name: {step3.get('step_name')}")
            print(f"Agent Name: {step3.get('agent_name')}")
            print(f"Status: {step3.get('status')}")
            
            result_data = step3.get("result_data", {})
            print(f"\n=== result_data ===")
            
            if "key_checks" in result_data:
                print(f"KEY CHECKS FOUND: {len(result_data['key_checks'])}")
                for check in result_data["key_checks"]:
                    print(f"  - {check.get('name')}: {check.get('status')}")
            else:
                print("NO key_checks in result_data!")
                print(f"Available keys: {list(result_data.keys())}")
                
            if "checks_summary" in result_data:
                print(f"\nchecks_summary: {result_data['checks_summary']}")
        else:
            print(f"Error response: {response.text[:500]}")
            
    except requests.exceptions.ConnectionError as e:
        print(f"Connection error: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_step3()
