#!/usr/bin/env python
"""Reset to 3 requisitions at step_1, one with $5000 amount."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.requisition import Requisition

db = SessionLocal()

# Get all requisitions and sort by id
reqs = db.query(Requisition).order_by(Requisition.id).all()
print(f"Total requisitions in database: {len(reqs)}\n")

if len(reqs) > 0:
    # Reset first 3 to step_1, and set first one to $5000
    first_three = reqs[:3]
    print(f"Setting first 3 requisitions to step_1:")
    for i, req in enumerate(first_three, 1):
        req.current_stage = "step_1"
        if i == 1:
            req.total_amount = 5000.00
            print(f"  {i}. {req.number} (ID={req.id}) -> step_1, amount=$5000")
        else:
            print(f"  {i}. {req.number} (ID={req.id}) -> step_1")
    
    # Reset remaining to original stages
    print(f"\nResetting remaining requisitions to various stages:")
    remaining = reqs[3:]
    stages = ["step_2", "step_3", "step_4", "step_5", "step_6", "completed", "step_7", "step_2", "step_3"]
    for i, (req, stage) in enumerate(zip(remaining, stages)):
        req.current_stage = stage
        print(f"  {req.number} (ID={req.id}) -> {stage}")
    
    db.commit()
    print(f"\n✅ Updated successfully!")
    
    # Show summary
    print("\nAll requisitions status:")
    print("=" * 80)
    updated_reqs = db.query(Requisition).order_by(Requisition.id).all()
    step1_count = 0
    for req in updated_reqs:
        status = "✓ STEP 1" if req.current_stage == "step_1" else f"  {req.current_stage}"
        amount = f"${req.total_amount:,.0f}" if req.total_amount else "$0"
        print(f"{status:12} | {req.number:12} | {amount:10} | {req.description[:30]:30}")
        if req.current_stage == "step_1":
            step1_count += 1
    
    print("=" * 80)
    print(f"\nTotal at Step 1: {step1_count}/3")
else:
    print("❌ No requisitions found in database!")

db.close()
