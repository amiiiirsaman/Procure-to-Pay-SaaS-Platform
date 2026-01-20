#!/usr/bin/env python
"""Update first 6 requisitions to step_1."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.requisition import Requisition

db = SessionLocal()

# Get all requisitions
reqs = db.query(Requisition).order_by(Requisition.id).all()
print(f"Total requisitions in database: {len(reqs)}\n")

if len(reqs) > 0:
    # Update first 6 to step_1
    first_six = reqs[:6]
    print(f"Updating first 6 requisitions to step_1:")
    for i, req in enumerate(first_six, 1):
        req.current_stage = "step_1"
        print(f"  {i}. {req.number} (ID={req.id}) -> step_1")
    
    db.commit()
    print(f"\n✅ Updated {len(first_six)} requisitions successfully!")
    
    # Show all requisitions
    print("\nAll requisitions status:")
    print("=" * 80)
    updated_reqs = db.query(Requisition).order_by(Requisition.id).all()
    step1_count = 0
    for req in updated_reqs:
        status = "✓ STEP 1" if req.current_stage == "step_1" else f"  Step {req.current_stage or 'unknown'}"
        print(f"{status:12} | {req.number:12} | {req.description[:40]:40}")
        if req.current_stage == "step_1":
            step1_count += 1
    
    print("=" * 80)
    print(f"\nTotal at Step 1: {step1_count}/6")
else:
    print("❌ No requisitions found in database!")

db.close()
