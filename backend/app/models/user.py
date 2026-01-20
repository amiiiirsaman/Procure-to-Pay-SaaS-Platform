"""
User model for P2P Platform.
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, Enum, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base
from .base import TimestampMixin
from .enums import UserRole, Department


class User(Base, TimestampMixin):
    """User entity representing employees in the system."""

    __tablename__ = "users"

    id = Column(String(50), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    department = Column(Enum(Department), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.REQUESTOR)
    manager_id = Column(String(50), ForeignKey("users.id"), nullable=True)
    approval_limit = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)

    # Relationships - DISABLED to avoid circular imports during schema creation
    # manager = relationship("User", remote_side=[id], backref="direct_reports")
    # requisitions = relationship("Requisition", back_populates="requestor")

    def __repr__(self) -> str:
        return f"<User {self.id}: {self.name} ({self.role.value})>"

    def can_approve_amount(self, amount: float) -> bool:
        """Check if user can approve the given amount."""
        return self.approval_limit >= amount
