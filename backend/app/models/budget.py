"""
Department Budget model for P2P Platform.
"""

from sqlalchemy import Column, String, Integer, Float, Enum
from sqlalchemy.orm import relationship

from ..database import Base
from .base import TimestampMixin
from .enums import Department


class DepartmentBudget(Base, TimestampMixin):
    """Department budget tracking entity."""

    __tablename__ = "department_budgets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    department = Column(Enum(Department), nullable=False, index=True)
    fiscal_year = Column(Integer, nullable=False, default=2026)
    quarter = Column(String(10), nullable=False)  # Q1, Q2, Q3, Q4
    
    # Budget amounts
    allocated = Column(Float, default=0.0)
    spent = Column(Float, default=0.0)
    remaining = Column(Float, default=0.0)
    
    # Annual tracking
    annual_allocated = Column(Float, default=0.0)

    def __repr__(self) -> str:
        return f"<DepartmentBudget {self.department.value} {self.fiscal_year} {self.quarter}: ${self.remaining:,.0f} remaining>"
    
    def update_remaining(self) -> None:
        """Recalculate remaining budget."""
        self.remaining = self.allocated - self.spent
    
    def can_approve(self, amount: float) -> bool:
        """Check if budget can accommodate the amount."""
        return amount <= self.remaining
