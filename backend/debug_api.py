#!/usr/bin/env python
"""Debug API endpoint."""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.requisition import Requisition

db = SessionLocal()

print("Testing database connection...")

try:
    reqs = db.query(Requisition).limit(2).all()
    print(f"Found {len(reqs)} requisitions")
    
    for req in reqs:
        print(f"\nRequisition: {req.number}")
        print(f"  id: {req.id}")
        print(f"  description: {req.description[:50] if req.description else 'None'}...")
        print(f"  department: {req.department}")
        print(f"  total_amount: {req.total_amount}")
        print(f"  current_stage: {req.current_stage}")
        print(f"  status: {req.status}")
        print(f"  flagged_by: {req.flagged_by}")
        print(f"  requestor_id: {req.requestor_id}")
        print(f"  created_at: {req.created_at}")
        print(f"  updated_at: {req.updated_at}")
        
        # Check requestor relationship
        try:
            if req.requestor:
                print(f"  requestor.name: {req.requestor.name}")
            else:
                print(f"  requestor: None")
        except Exception as e:
            print(f"  requestor ERROR: {e}")
            
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
