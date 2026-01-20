#!/usr/bin/env python3
"""Test dashboard endpoint."""
import requests
import json
import time
import sys

# Wait for server to start
time.sleep(2)

try:
    response = requests.get("http://localhost:8001/api/v1/dashboard/requisitions-status")
    response.raise_for_status()
    data = response.json()
    
    # Filter for Mac laptop requisitions
    mac_reqs = [r for r in data.get('data', []) if r['number'] in ['REQ-1768911168', 'REQ-1768913207']]
    
    if mac_reqs:
        print("Mac Laptop Requisitions:")
        print(json.dumps(mac_reqs, indent=2, default=str))
    else:
        print("No Mac requisitions found")
        print(f"Total requisitions: {len(data.get('data', []))}")
        # Show first 5 as debug
        if data.get('data'):
            print("\nFirst 5 requisitions:")
            print(json.dumps(data['data'][:5], indent=2, default=str))
            
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
