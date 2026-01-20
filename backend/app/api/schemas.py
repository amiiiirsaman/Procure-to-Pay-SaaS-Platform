"""
Pydantic schemas for API request/response validation.
"""

from datetime import date, datetime
from typing import Any, Generic, Optional, TypeVar
from pydantic import BaseModel, Field, ConfigDict

from ..models.enums import (
    DocumentStatus,
    ApprovalStatus,
    RiskLevel,
    MatchStatus,
    Urgency,
    Department,
    UserRole,
)


# ============= Generic Types =============

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper."""

    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


class ErrorResponse(BaseModel):
    """Standard error response."""

    error: str
    detail: Optional[str] = None
    code: Optional[str] = None


# ============= User Schemas =============


class UserBase(BaseModel):
    """Base user schema."""

    email: str
    name: str
    department: Department
    role: UserRole = UserRole.REQUESTOR


class UserCreate(UserBase):
    """Schema for creating a user."""

    id: str
    manager_id: Optional[str] = None
    approval_limit: float = 0.0


class UserResponse(UserBase):
    """Schema for user response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    manager_id: Optional[str] = None
    approval_limit: float
    is_active: bool
    created_at: datetime


# ============= Supplier Schemas =============


class SupplierBase(BaseModel):
    """Base supplier schema."""

    name: str
    tax_id: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    payment_terms: str = "Net 30"


class SupplierCreate(SupplierBase):
    """Schema for creating a supplier."""

    id: str
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "USA"


class SupplierResponse(SupplierBase):
    """Schema for supplier response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    risk_score: float
    risk_level: RiskLevel
    bank_verified: bool
    created_at: datetime


# ============= Product Schemas =============


class ProductBase(BaseModel):
    """Base product schema."""

    name: str
    category: str
    unit_price: float
    currency: str = "USD"


class ProductCreate(ProductBase):
    """Schema for creating a product."""

    id: str
    description: Optional[str] = None
    sku: Optional[str] = None
    preferred_supplier_id: Optional[str] = None


class ProductResponse(ProductBase):
    """Schema for product response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    description: Optional[str]
    sku: Optional[str]
    is_active: bool
    created_at: datetime


# ============= Requisition Schemas =============


class RequisitionLineItemCreate(BaseModel):
    """Schema for creating a requisition line item."""

    description: str
    category: Optional[str] = None
    product_id: Optional[str] = None
    quantity: int = Field(gt=0)
    unit_price: float = Field(gt=0)
    suggested_supplier_id: Optional[str] = None
    gl_account: Optional[str] = None
    cost_center: Optional[str] = None


class RequisitionLineItemResponse(BaseModel):
    """Schema for requisition line item response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    line_number: int
    description: str
    category: Optional[str]
    quantity: int
    unit_price: float
    total: float


class RequisitionCreate(BaseModel):
    """Schema for creating a requisition."""

    requestor_id: str = "USR-0001"  # Default to James Wilson
    department: Department
    title: Optional[str] = None  # Requisition title (auto-generated if not provided)
    description: str
    justification: Optional[str] = None
    urgency: Urgency = Urgency.STANDARD
    needed_by_date: Optional[date] = None
    line_items: list[RequisitionLineItemCreate] = Field(min_length=1)
    # Procurement type (goods or services)
    procurement_type: Optional[str] = "goods"
    # Enterprise procurement fields
    supplier_name: Optional[str] = None
    category: Optional[str] = None
    cost_center: Optional[str] = None
    gl_account: Optional[str] = None
    spend_type: Optional[str] = None
    supplier_risk_score: Optional[int] = None
    supplier_status: Optional[str] = None
    contract_on_file: Optional[bool] = None
    budget_available: Optional[float] = None
    budget_impact: Optional[str] = None


class RequisitionResponse(BaseModel):
    """Schema for requisition response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    status: DocumentStatus
    requestor_id: str
    requestor_name: Optional[str] = "James Wilson"
    department: Department
    description: str
    justification: Optional[str]
    urgency: Urgency
    needed_by_date: Optional[date]
    total_amount: float
    currency: str
    supplier_name: Optional[str] = "Acme Corporation"
    category: Optional[str] = "General"
    # Procurement type (goods or services)
    procurement_type: Optional[str] = "goods"
    # Centene Enterprise Procurement Fields
    cost_center: Optional[str] = None
    gl_account: Optional[str] = None
    spend_type: Optional[str] = None
    supplier_risk_score: Optional[int] = None
    supplier_status: Optional[str] = None
    contract_on_file: Optional[bool] = None
    budget_available: Optional[float] = None
    budget_impact: Optional[str] = None
    # HITL/Workflow tracking fields
    current_stage: Optional[str] = None  # e.g., "step_1", "step_2", "completed"
    flagged_by: Optional[str] = None  # Agent name that flagged for HITL
    flag_reason: Optional[str] = None  # Why it was flagged
    flagged_at: Optional[datetime] = None  # When it was flagged
    agent_notes: Optional[str] = None  # AI agent notes
    line_items: list[RequisitionLineItemResponse] = []
    created_at: datetime
    updated_at: datetime


# ============= Purchase Order Schemas =============


class POLineItemCreate(BaseModel):
    """Schema for creating a PO line item."""

    description: str
    quantity: int = Field(gt=0)
    unit_price: float = Field(gt=0)
    part_number: Optional[str] = None
    gl_account: Optional[str] = None
    cost_center: Optional[str] = None


class POLineItemResponse(BaseModel):
    """Schema for PO line item response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    line_number: int
    description: str
    quantity: int
    unit_price: float
    total: float
    received_quantity: int
    invoiced_quantity: int


class POCreate(BaseModel):
    """Schema for creating a purchase order."""

    requisition_id: Optional[int] = None
    supplier_id: str
    buyer_id: str
    ship_to_address: Optional[str] = None
    expected_delivery_date: Optional[date] = None
    payment_terms: str = "Net 30"
    line_items: list[POLineItemCreate] = Field(min_length=1)


class POResponse(BaseModel):
    """Schema for purchase order response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    status: DocumentStatus
    requisition_id: Optional[int]
    supplier_id: str
    buyer_id: str
    subtotal: float
    tax_amount: float
    shipping_amount: float
    total_amount: float
    currency: str
    payment_terms: str
    expected_delivery_date: Optional[date]
    line_items: list[POLineItemResponse] = []
    created_at: datetime


# ============= Goods Receipt Schemas =============


class GRLineItemCreate(BaseModel):
    """Schema for creating a GR line item."""

    po_line_item_id: int
    quantity_received: int = Field(ge=0)
    quantity_rejected: int = Field(ge=0, default=0)
    rejection_reason: Optional[str] = None
    storage_location: Optional[str] = None


class GRLineItemResponse(BaseModel):
    """Schema for GR line item response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    po_line_item_id: int
    quantity_received: int
    quantity_rejected: int
    rejection_reason: Optional[str]


class GoodsReceiptCreate(BaseModel):
    """Schema for creating a goods receipt."""

    purchase_order_id: int
    received_by_id: str
    delivery_note: Optional[str] = None
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    line_items: list[GRLineItemCreate] = Field(min_length=1)


class GoodsReceiptResponse(BaseModel):
    """Schema for goods receipt response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    purchase_order_id: int
    received_by_id: str
    received_at: datetime
    line_items: list[GRLineItemResponse] = []
    created_at: datetime


# ============= Invoice Schemas =============


class InvoiceLineItemCreate(BaseModel):
    """Schema for creating an invoice line item."""

    description: str
    quantity: int = Field(gt=0)
    unit_price: float = Field(gt=0)
    po_line_item_id: Optional[int] = None
    gl_account: Optional[str] = None
    cost_center: Optional[str] = None


class InvoiceLineItemResponse(BaseModel):
    """Schema for invoice line item response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    line_number: int
    description: str
    quantity: int
    unit_price: float
    total: float
    po_line_item_id: Optional[int]


class InvoiceCreate(BaseModel):
    """Schema for creating an invoice."""

    vendor_invoice_number: str
    supplier_id: str
    purchase_order_id: Optional[int] = None
    invoice_date: date
    due_date: date
    subtotal: float
    tax_amount: float = 0.0
    line_items: list[InvoiceLineItemCreate] = Field(min_length=1)


class InvoiceResponse(BaseModel):
    """Schema for invoice response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    vendor_invoice_number: str
    status: DocumentStatus
    supplier_id: str
    purchase_order_id: Optional[int]
    invoice_date: date
    due_date: date
    subtotal: float
    tax_amount: float
    total_amount: float
    match_status: MatchStatus
    fraud_score: float
    risk_level: RiskLevel
    on_hold: bool
    line_items: list[InvoiceLineItemResponse] = []
    created_at: datetime


# ============= Approval Schemas =============


class ApprovalAction(BaseModel):
    """Schema for approval action."""

    action: str = Field(pattern="^(approve|reject|delegate)$")
    comments: Optional[str] = None
    delegate_to_id: Optional[str] = None


class ApprovalStepResponse(BaseModel):
    """Schema for approval step response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    step_number: int
    approver_id: str
    approver_role: UserRole
    status: ApprovalStatus
    action_at: Optional[datetime]
    comments: Optional[str]


# ============= Workflow Schemas =============


class WorkflowStatusResponse(BaseModel):
    """Schema for workflow status response."""

    workflow_id: str
    status: str
    current_step: str
    requisition_id: Optional[int]
    purchase_order_id: Optional[int]
    invoice_id: Optional[int]
    approval_status: str
    match_status: str
    fraud_score: int
    fraud_status: str
    compliance_status: str
    requires_human_action: bool
    agent_notes: list[dict[str, Any]] = []


# ============= Dashboard Schemas =============


class DashboardMetrics(BaseModel):
    """Schema for dashboard metrics."""

    pending_approvals: int
    open_pos: int
    open_pos_value: float
    pending_invoices: int
    pending_invoices_value: float
    overdue_invoices: int
    payments_due_this_week: int
    payments_due_value: float
    fraud_alerts: int
    avg_cycle_time_days: float


class PipelineStats(BaseModel):
    """Schema for P2P pipeline statistics."""

    total_requisitions: int
    requisitions_in_progress: int
    requisitions_completed: int
    requisitions_hitl_pending: int
    requisitions_rejected: int
    automation_rate: float  # Percentage of steps completed without HITL
    avg_processing_time_manual_hours: float
    avg_processing_time_agent_hours: float
    time_savings_percent: float
    compliance_score: float  # Percentage of compliant transactions
    roi_minutes_saved: int
    flagged_for_review_count: int
    accuracy_score: float  # Percentage flagged that needed attention


class RequisitionStatusSummary(BaseModel):
    """Summary of requisition by workflow status."""

    id: int
    number: str
    description: str
    department: str
    total_amount: float
    current_step: int  # 1-9
    step_name: str
    workflow_status: str  # draft, in_progress, hitl_pending, rejected, completed
    flagged_by: Optional[str] = None
    flag_reason: Optional[str] = None
    requestor_name: str = "James Wilson"
    requestor_id: Optional[str] = None
    supplier_name: Optional[str] = None
    category: Optional[str] = None
    justification: Optional[str] = None
    urgency: Optional[str] = None  # Priority/urgency field
    # Centene Enterprise Procurement Fields
    cost_center: Optional[str] = None
    gl_account: Optional[str] = None
    spend_type: Optional[str] = None
    supplier_risk_score: Optional[int] = None
    supplier_status: Optional[str] = None
    contract_on_file: Optional[bool] = None
    budget_available: Optional[float] = None
    budget_impact: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ProcurementGraphData(BaseModel):
    """Data for procurement graph visualization."""

    nodes: list[dict[str, Any]]  # {id, type, name, status, data}
    edges: list[dict[str, Any]]  # {source, target, type}


class SpendByCategory(BaseModel):
    """Schema for spend by category."""

    category: str
    amount: float
    percentage: float
    transaction_count: int


class SpendByVendor(BaseModel):
    """Schema for spend by vendor."""

    vendor_id: str
    vendor_name: str
    amount: float
    invoice_count: int


# ============= Payment Schemas =============


class PaymentCreate(BaseModel):
    """Schema for creating a payment."""

    invoice_id: int
    payment_method: str = "ACH"
    reference_number: Optional[str] = None
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    """Schema for payment response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_id: int
    amount: float
    payment_method: str
    status: str
    reference_number: Optional[str]
    payment_date: Optional[date]
    created_at: datetime


# ============= Audit Log Schemas =============


class AuditLogResponse(BaseModel):
    """Schema for audit log response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    document_type: str
    document_id: str
    document_number: Optional[str] = None
    action: str
    user_id: str
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    field_changes: Optional[str] = None
    details: Optional[str] = None
    timestamp: datetime


# ============= Compliance Schemas =============


class ComplianceMetrics(BaseModel):
    """Schema for compliance metrics."""

    total_documents: int
    compliant_documents: int
    non_compliant_documents: int
    compliance_rate: float
    high_risk_suppliers: int
    pending_reviews: int
    recent_violations: list[dict[str, Any]] = []


class ComplianceCheckResponse(BaseModel):
    """Schema for compliance check response."""

    document_type: str
    document_id: int
    is_compliant: bool
    issues: list[str] = []
    recommendations: list[str] = []
    checked_at: datetime


# ============= Agent Schemas =============


class AgentTriggerRequest(BaseModel):
    """Schema for triggering an agent manually."""

    document_type: str = Field(pattern="^(requisition|invoice|po|receipt)$")
    document_id: int
    action: str = "analyze"


class AgentTriggerResponse(BaseModel):
    """Schema for agent trigger response."""

    agent_name: str
    status: str
    result: dict[str, Any] = {}
    notes: list[str] = []
    flagged: bool = False
    flag_reason: Optional[str] = None


# ============= HITL Workflow Schemas =============


class AgentNoteResponse(BaseModel):
    """Schema for agent note response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    document_type: str
    document_id: int
    agent_name: str
    note: str
    note_type: str
    flagged: int
    flag_reason: Optional[str]
    resolved: int
    resolved_by: Optional[str]
    resolved_at: Optional[datetime]
    resolution_note: Optional[str]
    timestamp: datetime


class RequisitionWithNotesResponse(RequisitionResponse):
    """Requisition response with agent notes for HITL review."""

    flagged_by: Optional[str] = None
    flag_reason: Optional[str] = None
    current_stage: Optional[str] = None
    flagged_at: Optional[date] = None
    notes: list[AgentNoteResponse] = []


class HITLApprovalRequest(BaseModel):
    """Request schema for HITL approval/rejection."""

    action: str = Field(pattern="^(approve|reject)$")
    reviewer_id: str
    comments: Optional[str] = None
    override_reason: Optional[str] = None  # Required when overriding agent recommendations


class HITLApprovalResponse(BaseModel):
    """Response schema for HITL approval/rejection."""

    requisition_id: int
    action: str
    reviewer_id: str
    new_status: str
    comments: Optional[str]
    processed_at: datetime


# ============= Final Invoice Approval Schemas =============


class InvoiceProcessingStep(BaseModel):
    """A step in the invoice processing history."""

    step_name: str
    status: str
    completed_at: Optional[datetime] = None
    agent_name: Optional[str] = None
    details: str = ""
    flagged: bool = False
    flag_reason: Optional[str] = None


class ThreeWayMatchSummary(BaseModel):
    """Summary of the 3-way match results."""

    status: str
    po_amount: float
    gr_amount: float
    invoice_amount: float
    variance_amount: float
    variance_percentage: float
    exceptions: list[str] = []


class FraudCheckSummary(BaseModel):
    """Summary of fraud detection results."""

    fraud_score: float
    risk_level: str
    flags_detected: list[str] = []
    is_duplicate: bool = False
    supplier_risk_score: float = 0.0


class ComplianceSummary(BaseModel):
    """Summary of compliance check results."""

    is_compliant: bool
    issues: list[str] = []
    recommendations: list[str] = []
    sod_violations: list[str] = []


class ApprovalSummaryItem(BaseModel):
    """Summary of an approval step."""

    approver_name: str
    approver_role: str
    status: str
    approved_at: Optional[datetime] = None
    comments: Optional[str] = None


class InvoiceFinalApprovalReport(BaseModel):
    """Comprehensive summary report for final invoice approval decision."""

    # Invoice info
    invoice_id: int
    invoice_number: str
    vendor_invoice_number: str
    invoice_amount: float
    currency: str
    supplier_name: str
    supplier_id: str

    # Source documents
    purchase_order_number: Optional[str] = None
    goods_receipt_number: Optional[str] = None
    requisition_number: Optional[str] = None

    # Processing timeline
    processing_steps: list[InvoiceProcessingStep] = []

    # Summary sections
    three_way_match: ThreeWayMatchSummary
    fraud_check: FraudCheckSummary
    compliance: ComplianceSummary

    # Approval chain
    approval_history: list[ApprovalSummaryItem] = []

    # Flags and resolutions
    flags_raised: list[str] = []
    flags_resolved: list[str] = []
    unresolved_issues: list[str] = []

    # Agent notes (bullets from past steps)
    agent_reasoning: list[str] = []

    # Final recommendation
    recommendation: str  # "APPROVE", "REJECT", "REVIEW_REQUIRED"
    recommendation_reasons: list[str] = []

    # Metadata
    report_generated_at: datetime


class FinalApprovalRequest(BaseModel):
    """Request for final invoice approval."""

    approver_id: str
    action: str = Field(pattern="^(approve|reject)$")
    comments: Optional[str] = None
    override_reason: Optional[str] = None  # Required if overriding recommendation


class FinalApprovalResponse(BaseModel):
    """Response after final invoice approval."""

    invoice_id: int
    invoice_number: str
    action: str
    approver_id: str
    new_status: str
    previous_status: str
    payment_scheduled: bool = False
    payment_due_date: Optional[date] = None
    comments: Optional[str]
    processed_at: datetime


class InvoiceAwaitingApprovalResponse(BaseModel):
    """Invoice awaiting final approval with summary."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    vendor_invoice_number: str
    status: DocumentStatus
    supplier_id: str
    supplier_name: str
    invoice_date: date
    due_date: date
    total_amount: float
    currency: str
    match_status: MatchStatus
    fraud_score: float
    risk_level: RiskLevel
    recommendation: str
    flags_count: int
    unresolved_flags: int
    created_at: datetime


# ============= Agent-Assisted Requisition Schemas =============


class ProductSuggestion(BaseModel):
    """Suggested product from catalog."""

    product_id: str
    name: str
    category: str
    unit_price: float
    preferred_supplier_id: Optional[str] = None
    preferred_supplier_name: Optional[str] = None
    match_score: float = 0.0  # How well it matches the description


class SupplierSuggestion(BaseModel):
    """Suggested supplier for items."""

    supplier_id: str
    name: str
    risk_score: float
    risk_level: str
    avg_lead_time_days: int = 14
    on_time_delivery_rate: float = 0.95
    price_competitiveness: str = "competitive"  # low, competitive, premium


class GLAccountSuggestion(BaseModel):
    """Suggested GL account for categorization."""

    account_code: str
    account_name: str
    category: str
    confidence: float = 0.0


class AgentAssistedRequisitionRequest(BaseModel):
    """Request for agent-assisted requisition creation."""

    requestor_id: str
    department: Department
    description: str
    items_description: str  # Natural language description of what user needs
    estimated_budget: Optional[float] = None
    urgency: Urgency = Urgency.STANDARD
    needed_by_date: Optional[date] = None


# ============= Natural Language Parsing Schemas =============


class ParseInputRequest(BaseModel):
    """Request for parsing natural language requisition input."""
    
    user_input: str = Field(..., description="Natural language description of the requisition need")


class ParsedRequisitionData(BaseModel):
    """Response containing parsed requisition data from natural language input."""
    
    title: Optional[str] = Field(None, description="Generated title for the requisition")
    description: str = Field(..., description="Original user input")
    department: Optional[str] = Field(None, description="Detected department (IT, Marketing, etc.)")
    category: Optional[str] = Field(None, description="Product/service category")
    amount: Optional[float] = Field(None, description="Estimated budget/amount")
    priority: Optional[str] = Field(None, description="Urgency level (Low, Medium, High, Urgent, Critical)")
    supplier: Optional[str] = Field(None, description="Preferred vendor/supplier name")
    justification: Optional[str] = Field(None, description="Business justification for the purchase")
    
    # Metadata
    parsing_method: str = Field(default="llm", description="Method used: 'llm' or 'regex'")
    confidence: float = Field(default=0.9, description="Confidence score of the parsing")


class AgentAssistedRequisitionResponse(BaseModel):
    """Response with agent suggestions for requisition."""

    # Parsed intent
    interpreted_needs: list[str] = []
    
    # Suggestions
    product_suggestions: list[ProductSuggestion] = []
    supplier_suggestions: list[SupplierSuggestion] = []
    gl_account_suggestions: list[GLAccountSuggestion] = []
    
    # Recommended line items
    recommended_line_items: list[dict[str, Any]] = []
    
    # Estimated totals
    estimated_total: float = 0.0
    currency: str = "USD"
    
    # Warnings/Recommendations
    warnings: list[str] = []
    recommendations: list[str] = []
    
    # Agent notes
    agent_notes: list[str] = []


# ============= Receipt Confirmation Schemas =============


class ReceiptConfirmationRequest(BaseModel):
    """Request for confirming goods receipt."""

    received_by_id: str
    delivery_note: Optional[str] = None
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    items: list[dict[str, Any]]  # [{po_line_item_id, quantity_received, quantity_rejected, rejection_reason}]
    inspection_notes: Optional[str] = None


class ReceiptConfirmationResponse(BaseModel):
    """Response after receipt confirmation."""

    goods_receipt_id: int
    goods_receipt_number: str
    purchase_order_id: int
    purchase_order_number: str
    status: str
    items_received: int
    items_rejected: int
    all_items_received: bool
    can_proceed_to_invoice: bool
    agent_notes: list[str] = []


# ============= Auto PO Generation Schemas =============


class AutoPORequest(BaseModel):
    """Request for auto-generating PO from approved requisition."""

    requisition_id: int
    buyer_id: str
    override_supplier_id: Optional[str] = None  # Override suggested supplier


class AutoPOResponse(BaseModel):
    """Response after auto PO generation."""

    purchase_order_id: int
    purchase_order_number: str
    requisition_id: int
    requisition_number: str
    supplier_id: str
    supplier_name: str
    total_amount: float
    status: str
    line_items_count: int
    agent_notes: list[str] = []
    warnings: list[str] = []


# ============= P2P Engine Workflow Schemas =============


class P2PWorkflowStepResult(BaseModel):
    """Result of a single P2P workflow step."""

    step_id: int
    step_name: str
    agent_name: str
    status: str  # 'completed', 'error', 'flagged'
    agent_notes: list[str] = []
    result_data: dict[str, Any] = {}
    flagged: bool = False
    flag_reason: Optional[str] = None
    execution_time_ms: int = 0


class P2PWorkflowRequest(BaseModel):
    """Request for running full P2P engine workflow."""

    requisition_id: int | str  # Can be integer ID or number like "1768931613"
    start_from_step: Optional[int] = 1  # Resume from specific step
    run_single_step: bool = False  # Run only one step and pause for approval


class P2PStepApprovalRequest(BaseModel):
    """Request to approve or reject a workflow step."""

    requisition_id: int | str  # Can be integer ID or number
    step_id: int
    action: str  # 'approve', 'reject', 'hold'
    comments: Optional[str] = None


class P2PStepApprovalResponse(BaseModel):
    """Response from step approval action."""

    requisition_id: int
    step_id: int
    action: str
    success: bool
    message: str
    next_step: Optional[int] = None
    workflow_status: str  # 'pending', 'approved', 'rejected', 'on_hold'


class P2PWorkflowStatusResponse(BaseModel):
    """Current workflow status for a requisition."""

    requisition_id: int
    current_step: int
    total_steps: int
    step_name: str
    step_status: str  # 'not_started', 'in_progress', 'pending_approval', 'approved', 'rejected'
    workflow_status: str
    can_continue: bool
    completed_steps: list[dict[str, Any]] = []
    flagged_items: list[str] = []


class P2PWorkflowResponse(BaseModel):
    """Response from P2P engine workflow execution."""

    workflow_id: str
    requisition_id: int
    status: str  # 'completed', 'in_progress', 'failed', 'needs_approval'
    current_step: int
    total_steps: int
    steps: list[P2PWorkflowStepResult] = []
    overall_notes: list[str] = []
    execution_time_ms: int = 0
    final_approval_required: bool = True
    flagged_issues: list[str] = []
