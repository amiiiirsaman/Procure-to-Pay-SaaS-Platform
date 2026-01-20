"""
Supplier/Vendor model for P2P Platform.
"""

from sqlalchemy import Column, String, Float, Boolean, Text, Enum, Date
from sqlalchemy.orm import relationship

from ..database import Base
from .base import TimestampMixin
from .enums import RiskLevel


class Supplier(Base, TimestampMixin):
    """Supplier/Vendor entity."""

    __tablename__ = "suppliers"

    id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False, index=True)
    tax_id = Column(String(50), nullable=True)
    status = Column(String(20), default="active")  # active, inactive, pending, blocked
    
    # Centene procurement fields
    department = Column(String(50), nullable=True)  # Primary department this vendor serves
    category = Column(String(100), nullable=True)   # Category of goods/services
    vendor_status = Column(String(20), nullable=True)  # preferred, known, new
    contract_active = Column(Boolean, default=False)
    contract_end_date = Column(Date, nullable=True)
    spend_type = Column(String(20), nullable=True)  # OPEX, CAPEX, INVENTORY

    # Contact info
    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)

    # Address
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(50), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(50), default="USA")

    # Payment info
    payment_terms = Column(String(50), default="Net 30")
    bank_name = Column(String(255), nullable=True)
    bank_account_last4 = Column(String(4), nullable=True)
    bank_verified = Column(Boolean, default=False)

    # Risk assessment
    risk_score = Column(Float, default=0.0)
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.LOW)

    # Certifications (JSON stored as text)
    certifications = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships - DISABLED for SQLite concurrency
    # purchase_orders = relationship("PurchaseOrder", back_populates="supplier")
    # invoices = relationship("Invoice", back_populates="supplier")
    # products = relationship("Product", back_populates="preferred_supplier")

    def __repr__(self) -> str:
        return f"<Supplier {self.id}: {self.name}>"

    @property
    def full_address(self) -> str:
        """Return formatted full address."""
        parts = [
            self.address_line1,
            self.address_line2,
            f"{self.city}, {self.state} {self.postal_code}",
            self.country,
        ]
        return "\n".join(p for p in parts if p)
