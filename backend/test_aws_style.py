"""
Complete P2P workflow test - Run this in a separate terminal while server is running.
"""
import requests
import json
import sys
import time

SERVER = "http://localhost:8000"

def test_step(step_num, step_name):
    """Test a single workflow step."""
    print(f"\n{'='*70}")
    print(f"STEP {step_num}: {step_name}")
    print('='*70)
    
    try:
        url = f"{SERVER}/api/v1/requisitions/REQ-000036/workflow-step?step={step_num}"
        print(f"\nCalling: {url}")
        
        response = requests.post(url, timeout=60)
        response.raise_for_status()
        
        data = response.json()
        
        print(f"\n✓ Status: {data.get('status')}")
        print(f"✓ Verdict: {data.get('result_data', {}).get('verdict')}")
        print(f"✓ Reason: {data.get('result_data', {}).get('verdict_reason')}")
        
        bullets = data.get('agent_notes', [])
        print(f"\nReasoning Bullets ({len(bullets)} total):")
        
        # Show first 20 bullets
        for bullet in bullets[:20]:
            print(f"  {bullet}")
        
        if len(bullets) > 20:
            print(f"\n  ... and {len(bullets) - 20} more bullets")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("\n✗ ERROR: Could not connect to server. Is it running on port 8000?")
        return False
    except requests.exceptions.Timeout:
        print("\n✗ ERROR: Request timed out after 60 seconds")
        return False
    except requests.exceptions.HTTPError as e:
        print(f"\n✗ ERROR: HTTP {e.response.status_code}: {e.response.text}")
        return False
    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n" + "="*70)
    print("P2P WORKFLOW TEST - REQ-000036")
    print("AWS Professional Style Output")
    print("="*70)
    
    # Check server health first
    try:
        response = requests.get(f"{SERVER}/health", timeout=5)
        print(f"\n✓ Server is healthy: {response.json()}")
    except:
        print(f"\n✗ Server is not responding at {SERVER}")
        print("Please start the server first:")
        print('  cd "d:\\ai_projects\\Procure_to_Pay_(P2P)_SaaS_Platform\\backend"')
        print('  & ".\\venv311\\Scripts\\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000')
        sys.exit(1)
    
    # Test Step 1
    if not test_step(1, "Requisition Validation"):
        sys.exit(1)
    
    # Add small delay between steps
    time.sleep(1)
    
    # Test Step 2
    if not test_step(2, "Approval Check"):
        sys.exit(1)
    
    print("\n" + "="*70)
    print("WORKFLOW TEST COMPLETED")
    print("="*70)

if __name__ == "__main__":
    main()
