"""
Comprehensive P2P Workflow Test - Nova Pro Production Mode
Tests REQ-000036 through all workflow steps with AWS-style output
"""
import requests
import json
from datetime import datetime

SERVER = "http://localhost:8000"

def print_header(text):
    """Print formatted header."""
    print(f"\n{'='*80}")
    print(f"  {text}")
    print('='*80)

def test_full_workflow():
    """Test complete P2P workflow."""
    print_header("P2P WORKFLOW TEST - NOVA PRO PRODUCTION MODE")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Requisition: REQ-000036")
    print(f"Mode: AWS Professional Style (No Emojis)")
    
    # Test health first
    try:
        response = requests.get(f"{SERVER}/health", timeout=5)
        print(f"\n[OK] Server Status: {response.json()['status'].upper()}")
    except:
        print("\n[ERROR] Server not responding")
        return
    
    # Run full workflow
    print_header("EXECUTING FULL WORKFLOW")
    
    try:
        workflow_request = {
            "requisition_id": 36  # REQ-000036
        }
        
        print(f"\nRequest: POST {SERVER}/api/v1/agents/workflow/run")
        print(f"Body: {json.dumps(workflow_request, indent=2)}")
        
        response = requests.post(
            f"{SERVER}/api/v1/agents/workflow/run",
            json=workflow_request,
            timeout=120
        )
        
        print(f"\nHTTP Status: {response.status_code}")
        
        if response.ok:
            data = response.json()
            
            # Print overall summary
            print_header("WORKFLOW EXECUTION RESULTS")
            print(f"\nOverall Status: {data.get('status', 'N/A')}")
            print(f"Completion: {data.get('message', 'N/A')}")
            
            # Print each step
            steps = data.get('steps', [])
            print(f"\nTotal Steps Executed: {len(steps)}")
            
            for i, step in enumerate(steps, 1):
                print_header(f"STEP {step.get('step_id', i)}: {step.get('step_name', 'Unknown')}")
                
                print(f"\nStatus: {step.get('status', 'N/A')}")
                print(f"Verdict: {step.get('result_data', {}).get('verdict', 'N/A')}")
                print(f"Reason: {step.get('result_data', {}).get('verdict_reason', 'N/A')}")
                
                # Print reasoning bullets
                bullets = step.get('agent_notes', [])
                if bullets:
                    print(f"\nReasoning Analysis ({len(bullets)} points):")
                    # Show first 15 bullets
                    for bullet in bullets[:15]:
                        print(f"  {bullet}")
                    if len(bullets) > 15:
                        print(f"  ... and {len(bullets) - 15} more points")
                
                # Check for HITL flagging
                if step.get('result_data', {}).get('verdict') == 'HITL_FLAG':
                    print(f"\n[ALERT] HUMAN REVIEW REQUIRED")
                    print(f"   Reason: {step.get('result_data', {}).get('verdict_reason')}")
            
            # Final summary
            print_header("EXECUTION SUMMARY")
            hitl_steps = [s for s in steps if s.get('result_data', {}).get('verdict') == 'HITL_FLAG']
            auto_approved = [s for s in steps if s.get('result_data', {}).get('verdict') == 'AUTO_APPROVE']
            
            print(f"\nAuto-Approved Steps: {len(auto_approved)}/{len(steps)}")
            print(f"HITL Flagged Steps: {len(hitl_steps)}/{len(steps)}")
            
            if hitl_steps:
                print(f"\nHuman Review Required For:")
                for step in hitl_steps:
                    print(f"  - Step {step.get('step_id')}: {step.get('step_name')}")
                    print(f"    Reason: {step.get('result_data', {}).get('verdict_reason')}")
            
            print(f"\n[SUCCESS] WORKFLOW TEST COMPLETED SUCCESSFULLY")
            
        else:
            print(f"\n[ERROR] HTTP {response.status_code}")
            print(f"Response: {response.text[:500]}")
            
    except requests.exceptions.Timeout:
        print("\n[ERROR] Request timed out after 120 seconds")
    except Exception as e:
        print(f"\n[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_full_workflow()
