"""
Requisition model for P2P Platform.
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
    Boolean,
)
from sqlalchemy.orm import relationship

from ..database import Base
from .base import AuditMixin
from .enums import DocumentStatus, Urgency, Department


class SpendType(str):
    """Spend type enum values."""
    OPEX = "OPEX"
    CAPEX = "CAPEX"
    INVENTORY = "INVENTORY"


class Requisition(Base, AuditMixin):
    """Purchase Requisition entity."""

    __tablename__ = "requisitions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    number = Column(String(20), unique=True, nullable=False, index=True)
    status = Column(
        Enum(DocumentStatus), default=DocumentStatus.DRAFT, nullable=False
    )

    # Requestor info
    requestor_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    department = Column(Enum(Department), nullable=False)

    # Request details
    description = Column(String(500), nullable=False)
    justification = Column(Text, nullable=True)
    urgency = Column(Enum(Urgency), default=Urgency.STANDARD)
    needed_by_date = Column(Date, nullable=True)
    
    # Category and Supplier (for Centene dataset)
    category = Column(String(100), nullable=True)
    supplier_name = Column(String(255), nullable=True)

    # Totals
    total_amount = Column(Float, default=0.0)
    currency = Column(String(3), default="USD")
    
    # Enterprise fields (AI Wizard populated)
    cost_center = Column(String(20), nullable=True)  # CC-1000-IT
    gl_account = Column(String(20), nullable=True)   # 6100-SW
    spend_type = Column(String(20), nullable=True)   # OPEX, CAPEX, INVENTORY
    procurement_type = Column(String(20), nullable=True, default="goods")  # goods or services
    
    # Supplier enrichment (from Centene dataset)
    supplier_risk_score = Column(Integer, nullable=True)  # 0-100
    supplier_status = Column(String(20), nullable=True)   # preferred, known, new
    contract_on_file = Column(Boolean, nullable=True)
    
    # Budget tracking
    budget_available = Column(Float, nullable=True)
    budget_impact = Column(String(100), nullable=True)  # "Within budget" or "Exceeds by $X"

    # AI Agent notes (legacy field)
    agent_notes = Column(Text, nullable=True)
    
    # HITL Flagging fields
    flagged_by = Column(String(100), nullable=True)  # Agent name that flagged this
    flag_reason = Column(Text, nullable=True)  # Why it was flagged
    current_stage = Column(String(50), nullable=True)  # Current workflow stage
    flagged_at = Column(Date, nullable=True)  # When it was flagged
    
    # ============= P2P ENGINE AGENT FIELDS =============
    
    # Step 2: Approval Agent fields
    requestor_authority_level = Column(Float, nullable=True)  # Max amount user can approve
    department_budget_limit = Column(Float, nullable=True)  # Department spending cap
    prior_approval_reference = Column(String(50), nullable=True)  # Pre-approved project ref
    
    # Step 3: PO Generation Agent fields
    supplier_payment_terms = Column(String(50), nullable=True)  # Net 30, Net 60, etc.
    supplier_address = Column(String(255), nullable=True)  # Supplier address
    supplier_contact = Column(String(100), nullable=True)  # Contact name/email
    shipping_method = Column(String(50), nullable=True)  # Ground, Express, etc.
    shipping_address = Column(String(255), nullable=True)  # Delivery address
    tax_rate = Column(Float, nullable=True)  # Tax percentage
    tax_amount = Column(Float, nullable=True)  # Calculated tax
    po_number = Column(String(20), nullable=True)  # Generated PO number
    
    # Step 4: Goods Receipt Agent fields
    received_quantity = Column(Integer, nullable=True)  # Actual qty received
    received_date = Column(Date, nullable=True)  # Actual delivery date
    quality_status = Column(String(20), nullable=True)  # passed, failed, partial
    damage_notes = Column(Text, nullable=True)  # Damage description if any
    receiver_id = Column(String(50), nullable=True)  # Who received goods
    warehouse_location = Column(String(50), nullable=True)  # Storage location
    
    # Step 5: Invoice Validation Agent fields
    invoice_number = Column(String(50), nullable=True)  # Unique invoice ID
    invoice_date = Column(Date, nullable=True)  # Billing date
    invoice_amount = Column(Float, nullable=True)  # Billed total
    invoice_due_date = Column(Date, nullable=True)  # Payment due date
    invoice_file_url = Column(String(255), nullable=True)  # Attached PDF path
    three_way_match_status = Column(String(20), nullable=True)  # matched, partial, failed
    
    # Step 6: Fraud Analysis Agent fields  
    supplier_bank_account = Column(String(50), nullable=True)  # Bank account (masked)
    supplier_bank_account_changed_date = Column(Date, nullable=True)  # Recent change flag
    supplier_ein = Column(String(20), nullable=True)  # Tax ID for shell company check
    supplier_years_in_business = Column(Integer, nullable=True)  # New vendor risk
    requester_vendor_relationship = Column(String(100), nullable=True)  # Conflict of interest
    similar_transactions_count = Column(Integer, nullable=True)  # Split detection
    fraud_risk_score = Column(Integer, nullable=True)  # Calculated fraud score 0-100
    fraud_indicators = Column(Text, nullable=True)  # JSON list of indicators
    
    # Step 7: Compliance Agent fields
    approver_chain = Column(Text, nullable=True)  # JSON list of approvers with roles
    required_documents = Column(Text, nullable=True)  # JSON list of required docs
    attached_documents = Column(Text, nullable=True)  # JSON list of attached doc names
    quotes_attached = Column(Integer, nullable=True)  # Number of competitive quotes
    contract_id = Column(String(50), nullable=True)  # Contract reference
    contract_expiry = Column(Date, nullable=True)  # Contract end date
    audit_trail = Column(Text, nullable=True)  # JSON audit log
    policy_exceptions = Column(Text, nullable=True)  # Any approved exceptions
    segregation_of_duties_ok = Column(Boolean, nullable=True)  # SOD check passed
    
    # Step 9: Payment Agent fields
    supplier_bank_name = Column(String(100), nullable=True)  # Bank name
    supplier_routing_number = Column(String(20), nullable=True)  # Routing (masked)
    supplier_swift_code = Column(String(20), nullable=True)  # International wire
    payment_method = Column(String(20), nullable=True)  # ACH, Wire, Check
    payment_scheduled_date = Column(Date, nullable=True)  # When to pay
    payment_transaction_id = Column(String(50), nullable=True)  # Confirmation number
    payment_status = Column(String(20), nullable=True)  # pending, completed, failed
    
    # Historical Fraud Analysis fields (all past transactions clean)
    past_transactions_clean = Column(Boolean, default=True)
    fraud_history_score = Column(Integer, default=0)  # 0 = clean history
    past_transaction_count = Column(Integer, nullable=True)
    past_issues_count = Column(Integer, default=0)  # 0 = no past issues

    # Relationships - DISABLED for SQLite concurrency
    # requestor = relationship("User", back_populates="requisitions")
    # line_items = relationship(
    #     "RequisitionLineItem",
    #     back_populates="requisition",
    #     cascade="all, delete-orphan",
    # )
    # approval_steps = relationship(
    #     "ApprovalStep",
    #     back_populates="requisition",
    #     cascade="all, delete-orphan",
    #     foreign_keys="ApprovalStep.requisition_id",
    # )
    # purchase_orders = relationship("PurchaseOrder", back_populates="requisition")

    def __repr__(self) -> str:
        return f"<Requisition {self.number}: ${self.total_amount} ({self.status.value})>"

    def calculate_total(self) -> float:
        """Recalculate total from line items."""
        self.total_amount = sum(item.total for item in self.line_items)
        return self.total_amount


class RequisitionLineItem(Base, AuditMixin):
    """Line item for a requisition."""

    __tablename__ = "requisition_line_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    requisition_id = Column(
        Integer, ForeignKey("requisitions.id"), nullable=False, index=True
    )
    line_number = Column(Integer, nullable=False)

    # Item details
    description = Column(String(500), nullable=False)
    category = Column(String(100), nullable=True)
    product_id = Column(String(50), ForeignKey("products.id"), nullable=True)

    # Quantity and pricing
    quantity = Column(Integer, nullable=False)
    unit_of_measure = Column(String(20), default="each")
    unit_price = Column(Float, nullable=False)
    total = Column(Float, nullable=False)

    # Suggested vendor
    suggested_supplier_id = Column(
        String(50), ForeignKey("suppliers.id"), nullable=True
    )

    # Accounting
    gl_account = Column(String(20), nullable=True)
    cost_center = Column(String(20), nullable=True)

    # Relationships - DISABLED for SQLite concurrency
    # requisition = relationship("Requisition", back_populates="line_items")
    # product = relationship("Product")
    # suggested_supplier = relationship("Supplier")

    def __repr__(self) -> str:
        return f"<ReqLineItem {self.line_number}: {self.description[:30]}>"
