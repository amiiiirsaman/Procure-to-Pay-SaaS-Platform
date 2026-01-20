"""
Approval workflow model for P2P Platform.
"""

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Text,
    Enum,
    ForeignKey,
    DateTime,
)
from sqlalchemy.orm import relationship

from ..database import Base
from .base import TimestampMixin
from .enums import ApprovalStatus, UserRole


class ApprovalStep(Base, TimestampMixin):
    """Approval step in a workflow."""

    __tablename__ = "approval_steps"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Document reference (one of these will be set)
    requisition_id = Column(Integer, ForeignKey("requisitions.id"), nullable=True)
    purchase_order_id = Column(
        Integer, ForeignKey("purchase_orders.id"), nullable=True
    )
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)

    # Step details
    step_number = Column(Integer, nullable=False)
    approver_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    approver_role = Column(Enum(UserRole), nullable=False)

    # Threshold that triggered this step
    required_for_amount = Column(Float, nullable=False)

    # Status
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDING)
    action_at = Column(DateTime, nullable=True)
    comments = Column(Text, nullable=True)

    # Delegation
    delegated_from_id = Column(String(50), ForeignKey("users.id"), nullable=True)

    # Relationships - DISABLED for SQLite concurrency
    # approver = relationship("User", foreign_keys=[approver_id])
    # delegated_from = relationship("User", foreign_keys=[delegated_from_id])
    # requisition = relationship(
    #     "Requisition",
    #     back_populates="approval_steps",
    #     foreign_keys=[requisition_id],
    # )
    # purchase_order = relationship(
    #     "PurchaseOrder",
    #     back_populates="approval_steps",
    #     foreign_keys=[purchase_order_id],
    # )
    # invoice = relationship(
    #     "Invoice",
    #     back_populates="approval_steps",
    #     foreign_keys=[invoice_id],
    # )

    def __repr__(self) -> str:
        return f"<ApprovalStep {self.step_number}>"

    @property
    def document_type(self) -> str:
        """Return the type of document this approval is for."""
        if self.requisition_id:
            return "requisition"
        elif self.purchase_order_id:
            return "purchase_order"
        elif self.invoice_id:
            return "invoice"
        return "unknown"
