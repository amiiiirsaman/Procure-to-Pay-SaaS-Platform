#!/usr/bin/env python
"""Synchronously initialize the database - run in a separate process."""

import sys
import time

print("Starting DB initialization...")
sys.stdout.flush()

try:
    from app.database import Base, engine
    from app import models
    
    print("Importing models completed")
    sys.stdout.flush()
    
    print("Calling create_all()...")
    sys.stdout.flush()
    
    Base.metadata.create_all(bind=engine)
    
    print("Database tables created successfully")
    sys.stdout.flush()
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.stdout.flush()
    sys.exit(1)
