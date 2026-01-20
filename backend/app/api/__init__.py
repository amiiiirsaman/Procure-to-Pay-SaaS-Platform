"""
API module for P2P Platform.
"""

from .schemas import (
    # Request schemas
    RequisitionCreate,
    RequisitionLineItemCreate,
    POCreate,
    InvoiceCreate,
    GoodsReceiptCreate,
    ApprovalAction,
    # Response schemas
    RequisitionResponse,
    POResponse,
    InvoiceResponse,
    GoodsReceiptResponse,
    WorkflowStatusResponse,
    DashboardMetrics,
    # Common
    PaginatedResponse,
    ErrorResponse,
)
from .routes import router

__all__ = [
    "router",
    "RequisitionCreate",
    "RequisitionLineItemCreate",
    "POCreate",
    "InvoiceCreate",
    "GoodsReceiptCreate",
    "ApprovalAction",
    "RequisitionResponse",
    "POResponse",
    "InvoiceResponse",
    "GoodsReceiptResponse",
    "WorkflowStatusResponse",
    "DashboardMetrics",
    "PaginatedResponse",
    "ErrorResponse",
]
