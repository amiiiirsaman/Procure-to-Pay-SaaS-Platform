"""
Enums for P2P Platform models.
"""

import enum


class DocumentStatus(str, enum.Enum):
    """Status for documents (requisitions, POs, invoices)."""

    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    UNDER_REVIEW = "under_review"  # HITL: Flagged for human review
    APPROVED = "approved"
    REJECTED = "rejected"
    ORDERED = "ordered"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    INVOICED = "invoiced"
    MATCHED = "matched"
    MISMATCH = "mismatch"  # 3-way match failed
    EXCEPTION = "exception"
    AWAITING_FINAL_APPROVAL = "awaiting_final_approval"  # Invoice ready for final human approval
    FINAL_APPROVED = "final_approved"  # Invoice approved, ready for payment
    PAID = "paid"
    CANCELLED = "cancelled"
    CLOSED = "closed"


class ApprovalStatus(str, enum.Enum):
    """Status for approval steps."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DELEGATED = "delegated"
    SKIPPED = "skipped"
    EXPIRED = "expired"


class RiskLevel(str, enum.Enum):
    """Risk level for fraud detection."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PaymentMethod(str, enum.Enum):
    """Payment methods."""

    ACH = "ach"
    WIRE = "wire"
    CHECK = "check"
    CARD = "card"
    VIRTUAL_CARD = "virtual_card"


class PaymentStatus(str, enum.Enum):
    """Payment processing status."""

    SCHEDULED = "scheduled"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class UserRole(str, enum.Enum):
    """User roles for authorization."""

    REQUESTOR = "requestor"
    BUYER = "buyer"
    MANAGER = "manager"  # Alias for approval workflow
    PROCUREMENT_MANAGER = "procurement_manager"
    AP_CLERK = "ap_clerk"
    AP_MANAGER = "ap_manager"
    WAREHOUSE = "warehouse"
    TREASURY = "treasury"
    FINANCE_CONTROLLER = "finance_controller"
    DIRECTOR = "director"
    VP = "vp"
    CFO = "cfo"
    CEO = "ceo"
    ADMIN = "admin"


class Department(str, enum.Enum):
    """Company departments."""

    FINANCE = "Finance"
    OPERATIONS = "Operations"
    HR = "HR"
    IT = "IT"
    MARKETING = "Marketing"
    FACILITIES = "Facilities"
    LEGAL = "Legal"
    RD = "R&D"
    ENGINEERING = "Engineering"
    SALES = "Sales"
    PROCUREMENT = "Procurement"  # Added for Centene dataset


class Urgency(str, enum.Enum):
    """Urgency levels for requisitions."""

    STANDARD = "standard"
    URGENT = "urgent"
    EMERGENCY = "emergency"
    HIGH = "high"  # Added for compatibility with existing data


class ProcurementType(str, enum.Enum):
    """Type of procurement - goods or services."""

    GOODS = "goods"
    SERVICES = "services"


class MatchStatus(str, enum.Enum):
    """Three-way match status."""

    PENDING = "pending"
    MATCHED = "matched"
    PARTIAL_MATCH = "partial_match"
    EXCEPTION = "exception"
