import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Starting test...")
try:
    from app.database import SessionLocal
    print("SessionLocal imported")
    from app.models.requisition import Requisition
    print("Requisition imported")
    
    db = SessionLocal()
    print("Session created")
    
    count = db.query(Requisition).count()
    print(f"Requisition count: {count}")
    
    db.close()
    print("Done!")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
