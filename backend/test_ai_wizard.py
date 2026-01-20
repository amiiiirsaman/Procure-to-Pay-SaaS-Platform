"""Test AI Wizard with REQ-00001 data"""
import requests
import json

# REQ-00001 data
req_data = {
    "requisition_number": "REQ-00001",
    "description": "Requisition for Software",
    "department": "IT",
    "amount": 26984.50,
    "category": "Hardware",
    "supplier_name": "Dell Technologies",
    "cost_center": "CC-1000-IT",
    "gl_account": "6200-HW",
    "spend_type": "CAPEX",
    "supplier_risk_score": 18,
    "supplier_status": "preferred",
    "contract_on_file": True,
    "urgency": "standard"
}

print("=" * 70)
print("Testing AI Wizard with REQ-00001")
print("=" * 70)
print(f"\nInput Data:")
print(json.dumps(req_data, indent=2))
print("\n" + "=" * 70)
print("Calling AI Wizard API...")
print("=" * 70)

try:
    response = requests.post(
        "http://localhost:8000/api/v1/requisitions/ai-wizard",
        json=req_data,
        timeout=30
    )
    
    if response.status_code == 200:
        result = response.json()
        print("\n✅ AI Wizard Response:")
        print("=" * 70)
        print(json.dumps(result, indent=2))
        print("=" * 70)
        
        # Extract key info
        print("\n📊 Summary:")
        print(f"  Requires Approval: {result.get('requires_approval')}")
        print(f"  Approval Level: {result.get('approval_level')}")
        print(f"  Flagged for HITL: {result.get('flagged_for_human_review')}")
        
        if result.get('flags'):
            print(f"\n⚠️  Flags ({len(result['flags'])}):")
            for flag in result['flags']:
                print(f"    - {flag}")
        
        if result.get('recommendations'):
            print(f"\n💡 Recommendations ({len(result['recommendations'])}):")
            for rec in result['recommendations']:
                print(f"    - {rec}")
                
    else:
        print(f"\n❌ Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"\n❌ Exception: {e}")
