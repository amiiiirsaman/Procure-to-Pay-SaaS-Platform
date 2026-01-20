"""Test script to diagnose SQLAlchemy crash."""
from sqlalchemy import create_engine, Column, String, Integer
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import StaticPool

Base = declarative_base()

class TestModel(Base):
    __tablename__ = "test"
    id = Column(Integer, primary_key=True)
    name = Column(String(50))

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
print("Engine created")
Base.metadata.create_all(bind=engine)
print("Tables created OK")
