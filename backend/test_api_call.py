#!/usr/bin/env python3
"""Quick test script to debug the workflow status endpoint."""
import requests
import traceback

try:
    url = "http://localhost:8000/api/v1/agents/workflow/status/1768913207"
    print(f"Calling: {url}")
    r = requests.get(url)
    print(f"Status: {r.status_code}")
    print(f"Headers: {dict(r.headers)}")
    print(f"Body: {r.text}")
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
