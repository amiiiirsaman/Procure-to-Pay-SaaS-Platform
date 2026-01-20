"""
Purchase Order model for P2P Platform.
"""

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Text,
    Enum,
    ForeignKey,
    Date,
)
from sqlalchemy.orm import relationship

from ..database import Base
from .base import AuditMixin
from .enums import DocumentStatus


class PurchaseOrder(Base, AuditMixin):
    """Purchase Order entity."""

    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    number = Column(String(20), unique=True, nullable=False, index=True)
    status = Column(
        Enum(DocumentStatus), default=DocumentStatus.DRAFT, nullable=False
    )

    # Source requisition (optional - POs can be created directly)
    requisition_id = Column(Integer, ForeignKey("requisitions.id"), nullable=True)

    # Supplier
    supplier_id = Column(String(50), ForeignKey("suppliers.id"), nullable=False)

    # Buyer
    buyer_id = Column(String(50), ForeignKey("users.id"), nullable=False)

    # Shipping address
    ship_to_name = Column(String(255), nullable=True)
    ship_to_address = Column(Text, nullable=True)

    # Billing address
    bill_to_name = Column(String(255), nullable=True)
    bill_to_address = Column(Text, nullable=True)

    # Dates
    order_date = Column(Date, nullable=True)
    expected_delivery_date = Column(Date, nullable=True)

    # Totals
    subtotal = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    shipping_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    currency = Column(String(3), default="USD")

    # Terms
    payment_terms = Column(String(50), default="Net 30")
    shipping_terms = Column(String(100), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)
    agent_notes = Column(Text, nullable=True)

    # Relationships - DISABLED for SQLite concurrency
    # requisition = relationship("Requisition", back_populates="purchase_orders")
    # supplier = relationship("Supplier", back_populates="purchase_orders")
    # buyer = relationship("User")
    # line_items = relationship(
    #     "POLineItem", back_populates="purchase_order", cascade="all, delete-orphan"
    # )
    # goods_receipts = relationship("GoodsReceipt", back_populates="purchase_order")
    # invoices = relationship("Invoice", back_populates="purchase_order")
    # approval_steps = relationship(
    #     "ApprovalStep",
    #     back_populates="purchase_order",
    #     cascade="all, delete-orphan",
    #     foreign_keys="ApprovalStep.purchase_order_id",
    # )

    def __repr__(self) -> str:
        return f"<PO {self.number}: ${self.total_amount}>"

    def calculate_totals(self) -> float:
        """Recalculate totals from line items."""
        self.subtotal = sum(item.total for item in self.line_items)
        self.total_amount = self.subtotal + self.tax_amount + self.shipping_amount
        return self.total_amount


class POLineItem(Base, AuditMixin):
    """Line item for a Purchase Order."""

    __tablename__ = "po_line_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    purchase_order_id = Column(
        Integer, ForeignKey("purchase_orders.id"), nullable=False, index=True
    )
    line_number = Column(Integer, nullable=False)

    # Item details
    description = Column(String(500), nullable=False)
    part_number = Column(String(100), nullable=True)
    product_id = Column(String(50), ForeignKey("products.id"), nullable=True)

    # Quantity and pricing
    quantity = Column(Integer, nullable=False)
    unit_of_measure = Column(String(20), default="each")
    unit_price = Column(Float, nullable=False)
    total = Column(Float, nullable=False)

    # Receipt tracking
    received_quantity = Column(Integer, default=0)
    invoiced_quantity = Column(Integer, default=0)

    # Accounting
    gl_account = Column(String(20), nullable=True)
    cost_center = Column(String(20), nullable=True)

    # Relationships - DISABLED for SQLite concurrency
    # purchase_order = relationship("PurchaseOrder", back_populates="line_items")
    # product = relationship("Product")

    def __repr__(self) -> str:
        return f"<POLineItem {self.line_number}>"

    @property
    def remaining_to_receive(self) -> int:
        """Quantity not yet received."""
        return self.quantity - self.received_quantity

    @property
    def remaining_to_invoice(self) -> int:
        """Quantity not yet invoiced."""
        return self.quantity - self.invoiced_quantity
