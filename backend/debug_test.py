"""Test to capture detailed error output."""
import requests
import traceback

try:
    print("Testing health endpoint...")
    response = requests.get("http://localhost:8000/health", timeout=5)
    print(f"✓ Health check passed: {response.json()}")
    
    print("\nTesting Step 1...")
    response = requests.post(
        "http://localhost:8000/api/v1/requisitions/REQ-000036/workflow-step?step=1",
        timeout=60
    )
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text[:500]}")
    
    if response.ok:
        data = response.json()
        print(f"\n✓ Success!")
        print(f"Status: {data.get('status')}")
        print(f"Verdict: {data.get('result_data', {}).get('verdict')}")
        bullets = data.get('agent_notes', [])
        print(f"\nFirst 10 bullets:")
        for b in bullets[:10]:
            print(f"  {b}")
    else:
        print(f"\n✗ Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"\n✗ Exception: {e}")
    traceback.print_exc()
