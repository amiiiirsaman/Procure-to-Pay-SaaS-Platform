"""Query REQ-00001 from database"""
import sys
sys.path.insert(0, '.')

from app.database import SessionLocal
from app.models.requisition import Requisition

db = SessionLocal()
req = db.query(Requisition).filter(Requisition.number == "REQ-00001").first()

if req:
    print("=" * 60)
    print("REQ-00001 Database Fields")
    print("=" * 60)
    
    for column in req.__table__.columns:
        value = getattr(req, column.name)
        print(f"{column.name:25} : {value}")
    
    print("=" * 60)
    print(f"\nTotal fields: {len(req.__table__.columns)}")
else:
    print("REQ-00001 not found in database")

db.close()
