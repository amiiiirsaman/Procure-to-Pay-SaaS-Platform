#!/usr/bin/env python
"""Debug script to identify server issues."""
import sys
import os
import traceback

current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

try:
    print("1. Testing app import...", flush=True)
    from app.main import app
    print("   ✓ App imported", flush=True)
    
    print("2. Testing app routes...", flush=True)
    print(f"   ✓ Found {len(app.routes)} routes", flush=True)
    
    print("3. Testing ASGI call directly...", flush=True)
    from starlette.testclient import TestClient
    
    client = TestClient(app)
    print("   ✓ TestClient created", flush=True)
    
    print("4. Testing health endpoint...", flush=True)
    response = client.get("/health")
    print(f"   ✓ Health endpoint returned: {response.status_code}", flush=True)
    print(f"   Response: {response.json()}", flush=True)
    
except Exception as e:
    print(f"ERROR: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)
