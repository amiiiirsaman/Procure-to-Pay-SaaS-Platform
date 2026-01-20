import traceback
import sys
import json

try:
    from fastapi.testclient import TestClient
    from app.main import app
    
    client = TestClient(app, raise_server_exceptions=False)
    
    print("Making request...")
    response = client.post(
        "/api/v1/agents/workflow/run",
        json={"requisition_id": 6, "start_from_step": 1, "run_single_step": True},
        timeout=120
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:1000] if len(response.text) > 1000 else response.text}")
    
except Exception as e:
    traceback.print_exc()
    print(f"\nError: {e}")
