#!/usr/bin/env python
"""Create fresh database with sample data."""
import os
import sys

# Set working directory
backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

print(f"Working directory: {os.getcwd()}")

# Import and create database
from app.database import engine, Base, SessionLocal
from app import models

print("Creating tables...")
Base.metadata.create_all(engine)

# Verify tables
from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"Tables created: {tables}")

# Check if db file exists
db_path = os.path.join(backend_dir, "p2p_platform.db")
print(f"DB file exists: {os.path.exists(db_path)}")

# Create a test session
db = SessionLocal()
print("Session created successfully")

# Create initial user
from app.models.user import User
existing_user = db.query(User).filter(User.id == "user-1").first()
if not existing_user:
    user = User(
        id="user-1",
        email="jameswilson@centene.com",
        name="James Wilson",
        department="IT",
        role="MANAGER"
    )
    db.add(user)
    db.commit()
    print("Created user: James Wilson")
else:
    print("User already exists")

db.close()
print("Database setup complete!")
