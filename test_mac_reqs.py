#!/usr/bin/env python
"""Test dashboard and print Mac laptop requisitions."""
import requests
import json

try:
    response = requests.get("http://localhost:8001/api/v1/dashboard/requisitions-status", timeout=10)
    response.raise_for_status()
    data = response.json()
    
    print(f"Status: {response.status_code}")
    print(f"Total requisitions: {len(data)}")
    
    # Find Mac laptop requisitions
    mac_reqs = [x for x in data if x.get('number') in ['REQ-1768911168', 'REQ-1768913207']]
    
    if mac_reqs:
        print("\n=== MAC LAPTOP REQUISITIONS ===")
        print(json.dumps(mac_reqs, indent=2, default=str))
    else:
        print("\nNo Mac laptop requisitions found")
        if data:
            print("\nFirst 3 requisitions as sample:")
            print(json.dumps(data[:3], indent=2, default=str))
except Exception as e:
    print(f"Error: {e}")
