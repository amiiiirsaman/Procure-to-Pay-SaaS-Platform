"""
Goods Receipt model for P2P Platform.
"""

from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    ForeignKey,
    DateTime,
)
from sqlalchemy.orm import relationship

from ..database import Base
from .base import AuditMixin


class GoodsReceipt(Base, AuditMixin):
    """Goods Receipt entity for recording received deliveries."""

    __tablename__ = "goods_receipts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    number = Column(String(20), unique=True, nullable=False, index=True)

    # Source PO
    purchase_order_id = Column(
        Integer, ForeignKey("purchase_orders.id"), nullable=False, index=True
    )

    # Receipt details
    received_by_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    received_at = Column(DateTime, nullable=False)

    # Shipping info
    delivery_note = Column(String(100), nullable=True)
    carrier = Column(String(100), nullable=True)
    tracking_number = Column(String(100), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)
    agent_notes = Column(Text, nullable=True)

    # Relationships - DISABLED for SQLite concurrency
    # purchase_order = relationship("PurchaseOrder", back_populates="goods_receipts")
    # received_by = relationship("User")
    # line_items = relationship(
    #     "GRLineItem", back_populates="goods_receipt", cascade="all, delete-orphan"
    # )

    def __repr__(self) -> str:
        return f"<GoodsReceipt {self.number} for PO {self.purchase_order_id}>"


class GRLineItem(Base, AuditMixin):
    """Line item for a Goods Receipt."""

    __tablename__ = "gr_line_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    goods_receipt_id = Column(
        Integer, ForeignKey("goods_receipts.id"), nullable=False, index=True
    )

    # Reference to PO line
    po_line_item_id = Column(
        Integer, ForeignKey("po_line_items.id"), nullable=False
    )

    # Receipt quantities
    quantity_received = Column(Integer, nullable=False)
    quantity_rejected = Column(Integer, default=0)
    rejection_reason = Column(String(255), nullable=True)

    # Storage
    storage_location = Column(String(100), nullable=True)

    # Relationships - DISABLED for SQLite concurrency
    # goods_receipt = relationship("GoodsReceipt", back_populates="line_items")
    # po_line_item = relationship("POLineItem")

    def __repr__(self) -> str:
        return f"<GRLineItem: received {self.quantity_received}>"

    @property
    def net_received(self) -> int:
        """Net quantity received (excluding rejected)."""
        return self.quantity_received - self.quantity_rejected
