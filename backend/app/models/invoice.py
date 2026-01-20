"""
Invoice model for P2P Platform.
"""

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Text,
    Boolean,
    Enum,
    ForeignKey,
    Date,
)
from sqlalchemy.orm import relationship

from ..database import Base
from .base import AuditMixin
from .enums import DocumentStatus, MatchStatus, RiskLevel, PaymentStatus


class Invoice(Base, AuditMixin):
    """Supplier Invoice entity."""

    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    number = Column(String(20), unique=True, nullable=False, index=True)
    vendor_invoice_number = Column(String(100), nullable=False, index=True)
    status = Column(
        Enum(DocumentStatus), default=DocumentStatus.DRAFT, nullable=False
    )

    # Supplier
    supplier_id = Column(String(50), ForeignKey("suppliers.id"), nullable=False)

    # Source PO (optional for non-PO invoices)
    purchase_order_id = Column(
        Integer, ForeignKey("purchase_orders.id"), nullable=True
    )

    # Dates
    invoice_date = Column(Date, nullable=False)
    received_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=False)

    # Totals
    subtotal = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, nullable=False)
    currency = Column(String(3), default="USD")

    # Three-way match
    match_status = Column(Enum(MatchStatus), default=MatchStatus.PENDING)
    match_exceptions = Column(Text, nullable=True)  # JSON string

    # Fraud detection
    fraud_score = Column(Float, default=0.0)
    fraud_flags = Column(Text, nullable=True)  # JSON string
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.LOW)

    # Payment
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.SCHEDULED)
    payment_id = Column(String(50), nullable=True)
    payment_date = Column(Date, nullable=True)

    # Final Approval (ALWAYS MANUAL)
    final_approval_status = Column(String(50), default="pending")  # pending, approved, rejected
    final_approved_by = Column(String(100), nullable=True)
    final_approved_at = Column(Date, nullable=True)
    final_approval_comments = Column(Text, nullable=True)
    recommendation = Column(String(50), default="pending")  # APPROVE, REJECT, REVIEW_REQUIRED
    recommendation_reasons = Column(Text, nullable=True)  # JSON array

    # Flags
    is_duplicate = Column(Boolean, default=False)
    requires_review = Column(Boolean, default=False)
    on_hold = Column(Boolean, default=False)
    hold_reason = Column(String(255), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)
    agent_notes = Column(Text, nullable=True)

    # Relationships - DISABLED for SQLite concurrency
    # supplier = relationship("Supplier", back_populates="invoices")
    # purchase_order = relationship("PurchaseOrder", back_populates="invoices")
    # line_items = relationship(
    #     "InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan"
    # )
    # approval_steps = relationship(
    #     "ApprovalStep",
    #     back_populates="invoice",
    #     cascade="all, delete-orphan",
    #     foreign_keys="ApprovalStep.invoice_id",
    # )

    def __repr__(self) -> str:
        return f"<Invoice {self.number}: ${self.total_amount}>"

    def calculate_totals(self) -> float:
        """Recalculate totals from line items."""
        # self.subtotal = sum(item.total for item in self.line_items)
        # self.total_amount = self.subtotal + self.tax_amount
        return self.total_amount


class InvoiceLineItem(Base, AuditMixin):
    """Line item for an Invoice."""

    __tablename__ = "invoice_line_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(
        Integer, ForeignKey("invoices.id"), nullable=False, index=True
    )
    line_number = Column(Integer, nullable=False)

    # Item details
    description = Column(String(500), nullable=False)

    # Quantity and pricing
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total = Column(Float, nullable=False)

    # Reference to PO line (for matching)
    po_line_item_id = Column(Integer, ForeignKey("po_line_items.id"), nullable=True)

    # Reference to GR line (for matching)
    gr_line_item_id = Column(Integer, ForeignKey("gr_line_items.id"), nullable=True)

    # Accounting
    gl_account = Column(String(20), nullable=True)
    cost_center = Column(String(20), nullable=True)

    # Relationships - DISABLED for SQLite concurrency
    # invoice = relationship("Invoice", back_populates="line_items")
    # po_line_item = relationship("POLineItem")
    # gr_line_item = relationship("GRLineItem")

    def __repr__(self) -> str:
        return f"<InvoiceLineItem {self.line_number}>"
