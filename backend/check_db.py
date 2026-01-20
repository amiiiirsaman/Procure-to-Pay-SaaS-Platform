#!/usr/bin/env python
"""Check and update requisitions in database."""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.requisition import Requisition
from app.models.enums import DocumentStatus

db = SessionLocal()

# Get all requisitions
reqs = db.query(Requisition).all()
print(f"Total requisitions: {len(reqs)}")
print("\nCurrent requisitions:")
print("=" * 100)

for req in reqs:
    status_val = req.status.value if hasattr(req.status, 'value') else str(req.status)
    flagged = "Yes" if req.flagged_by else "No"
    print(f"ID={req.id:2d} | Num={req.number:8s} | Status={status_val:16s} | Stage={str(req.current_stage or 'None'):20s} | Flagged={flagged}")

print("\n" + "=" * 100)

# Set first 6 requisitions to step_1
print("\nSetting first 6 requisitions to step_1...")
first_six = reqs[:6]
for req in first_six:
    req.current_stage = "step_1"
    print(f"  ✓ {req.number} (ID={req.id}) -> step_1")

db.commit()
print(f"\n✅ Updated {len(first_six)} requisitions to step_1!")

# Verify changes
print("\nVerifying all requisitions:")
print("=" * 100)
updated_reqs = db.query(Requisition).all()
for req in updated_reqs:
    status_val = req.status.value if hasattr(req.status, 'value') else str(req.status)
    print(f"ID={req.id:2d} | Num={req.number:8s} | Status={status_val:16s} | Stage={str(req.current_stage or 'None'):20s}")

db.close()
