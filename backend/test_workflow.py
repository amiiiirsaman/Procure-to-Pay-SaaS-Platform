import requests
import json

print("\n" + "="*60)
print("TESTING P2P WORKFLOW - REQ-000036")
print("="*60)

# Test Step 1: Requisition Validation
print("\n>>> Testing Step 1: Requisition Validation...")
try:
    response = requests.post(
        "http://localhost:8000/api/requisitions/REQ-000036/workflow-step?step=1",
        timeout=60
    )
    data = response.json()
    
    print(f"\nStatus: {data.get('status')}")
    print(f"Verdict: {data.get('result_data', {}).get('verdict')}")
    print(f"\nReasoning Bullets ({len(data.get('agent_notes', []))} total):")
    
    for bullet in data.get('agent_notes', [])[:15]:  # Show first 15
        print(f"  {bullet}")
    
    if len(data.get('agent_notes', [])) > 15:
        print(f"  ... and {len(data['agent_notes']) - 15} more")
        
except Exception as e:
    print(f"ERROR: {e}")

print("\n" + "="*60)
