"""
Product/Catalog item model for P2P Platform.
"""

from sqlalchemy import Column, String, Float, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base
from .base import TimestampMixin


class Product(Base, TimestampMixin):
    """Product/Catalog item entity."""

    __tablename__ = "products"

    id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)
    subcategory = Column(String(100), nullable=True)

    # Pricing
    unit_price = Column(Float, nullable=False)
    currency = Column(String(3), default="USD")
    unit_of_measure = Column(String(20), default="each")

    # Inventory
    sku = Column(String(50), nullable=True, unique=True)
    is_active = Column(Boolean, default=True)

    # Preferred supplier
    preferred_supplier_id = Column(
        String(50), ForeignKey("suppliers.id"), nullable=True
    )
    # DISABLED for SQLite concurrency
    # preferred_supplier = relationship("Supplier", back_populates="products")

    # GL Account mapping
    default_gl_account = Column(String(20), nullable=True)
    default_cost_center = Column(String(20), nullable=True)

    def __repr__(self) -> str:
        return f"<Product {self.id}: {self.name} (${self.unit_price})>"
