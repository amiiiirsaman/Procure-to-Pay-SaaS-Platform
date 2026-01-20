// ============================================================================
// P2P SaaS Platform - TypeScript Types
// ============================================================================

// Enums
export type Department = 
  | 'Finance' 
  | 'Operations' 
  | 'HR' 
  | 'IT' 
  | 'Marketing' 
  | 'Facilities' 
  | 'Legal' 
  | 'R&D' 
  | 'Engineering' 
  | 'Sales' 
  | 'Procurement';

export type UserRole = 
  | 'REQUESTER' 
  | 'APPROVER' 
  | 'BUYER' 
  | 'AP_CLERK' 
  | 'AP_MANAGER' 
  | 'CONTROLLER' 
  | 'CFO' 
  | 'ADMIN';

export type DocumentStatus = 
  | 'DRAFT' 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'ORDERED' 
  | 'RECEIVED' 
  | 'INVOICED' 
  | 'PAID' 
  | 'CANCELLED';

export type ApprovalStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'DELEGATED' 
  | 'SKIPPED';

export type Urgency = 
  | 'STANDARD' 
  | 'URGENT' 
  | 'EMERGENCY';

export type RiskLevel = 
  | 'LOW' 
  | 'MEDIUM' 
  | 'HIGH' 
  | 'CRITICAL';

export type MatchStatus = 
  | 'PENDING' 
  | 'MATCHED' 
  | 'PARTIAL' 
  | 'EXCEPTION';

export type PaymentStatus = 
  | 'NOT_SCHEDULED' 
  | 'SCHEDULED' 
  | 'PENDING'
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'FAILED'
  | 'CANCELLED';

export type SupplierStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'SUSPENDED' 
  | 'BLOCKED';

// ============================================================================
// Core Entity Interfaces
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: Department;
  approval_limit: number;
  manager_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  code?: string;
  name: string;
  tax_id?: string;
  status: SupplierStatus;
  category: SupplierCategory;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  payment_terms?: string;
  bank_name?: string;
  bank_account_last4?: string;
  bank_verified: boolean;
  risk_score?: number;
  risk_level?: RiskLevel;
  performance_rating?: number;
  is_active: boolean;
  is_preferred?: boolean;
  certifications?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type SupplierCategory =
  | 'RAW_MATERIALS'
  | 'COMPONENTS'
  | 'EQUIPMENT'
  | 'SERVICES'
  | 'IT'
  | 'LOGISTICS'
  | 'OFFICE_SUPPLIES'
  | 'MRO'
  | 'OTHER';

// ============================================================================
// Product
// ============================================================================

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  unit_of_measure: string;
  unit_price: number;
  supplier_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Requisition
// ============================================================================

export interface RequisitionLineItem {
  id: number;
  requisition_id: number;
  line_number: number;
  description: string;
  part_number?: string;
  quantity: number;
  unit_of_measure: string;
  estimated_unit_price: number;
  total: number;
  gl_account?: string;
  cost_center?: string;
  suggested_supplier_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Requisition {
  id: number;
  number: string;
  title: string;
  description?: string;
  status: DocumentStatus;
  requester_id: string;
  requestor_id?: string; // Alternative field name from backend
  department: Department;
  urgency: Urgency;
  needed_by_date?: string;
  justification?: string;
  total_amount: number;
  amount?: number; // Alternative field name
  currency: string;
  cost_center?: string;
  project_code?: string;
  notes?: string;
  agent_notes?: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  line_items: RequisitionLineItem[];
  requester?: User;
  // HITL/Workflow tracking fields
  current_stage?: string;  // e.g., "step_1", "step_2", "completed"
  flagged_by?: string;  // Agent name that flagged for HITL
  flag_reason?: string;  // Why it was flagged
  flagged_at?: string;  // When it was flagged
  // Enterprise procurement fields (Centene dataset)
  category?: string;  // Product/service category
  supplier_name?: string;  // Supplier name from dataset
  gl_account?: string;  // GL Account code (e.g., 6100-SW)
  spend_type?: string;  // OPEX, CAPEX, INVENTORY
  procurement_type?: 'goods' | 'services';  // Type of procurement
  supplier_risk_score?: number;  // 0-100 risk score
  supplier_status?: string;  // preferred, known, new
  contract_on_file?: boolean;  // Has active contract
  budget_available?: number;  // Available budget amount
  budget_impact?: string;  // Budget impact description
}

// ============================================================================
// Purchase Order
// ============================================================================

export interface POLineItem {
  id: number;
  purchase_order_id: number;
  line_number: number;
  description: string;
  part_number?: string;
  product_id?: string;
  quantity: number;
  unit_of_measure: string;
  unit_price: number;
  total: number;
  received_quantity: number;
  invoiced_quantity: number;
  gl_account?: string;
  cost_center?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: number;
  number: string;
  status: DocumentStatus;
  requisition_id?: number;
  supplier_id: string;
  buyer_id: string;
  ship_to_name?: string;
  ship_to_address?: string;
  bill_to_name?: string;
  bill_to_address?: string;
  order_date: string;
  expected_delivery_date?: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  currency: string;
  payment_terms?: string;
  shipping_terms?: string;
  notes?: string;
  agent_notes?: string;
  created_at: string;
  updated_at: string;
  line_items: POLineItem[];
  supplier?: Supplier;
  requisition?: Requisition;
}

// ============================================================================
// Goods Receipt
// ============================================================================

export interface GRLineItem {
  id: number;
  goods_receipt_id: number;
  po_line_item_id: number;
  quantity_received: number;
  quantity_rejected: number;
  rejection_reason?: string;
  storage_location?: string;
  created_at: string;
  updated_at: string;
}

export interface GoodsReceipt {
  id: number;
  number: string;
  purchase_order_id: number;
  received_by_id: string;
  received_at: string;
  delivery_note?: string;
  carrier?: string;
  tracking_number?: string;
  notes?: string;
  agent_notes?: string;
  created_at: string;
  updated_at: string;
  line_items: GRLineItem[];
  purchase_order?: PurchaseOrder;
}

// ============================================================================
// Invoice
// ============================================================================

export interface InvoiceLineItem {
  id: number;
  invoice_id: number;
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  po_line_item_id?: number;
  gr_line_item_id?: number;
  gl_account?: string;
  cost_center?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: number;
  number: string;
  vendor_invoice_number: string;
  status: DocumentStatus;
  supplier_id: string;
  purchase_order_id?: number;
  invoice_date: string;
  received_date?: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  match_status: MatchStatus;
  match_exceptions?: string[];
  fraud_score: number;
  fraud_flags?: string[];
  risk_level: RiskLevel;
  payment_status: PaymentStatus;
  payment_id?: string;
  payment_date?: string;
  is_duplicate: boolean;
  requires_review: boolean;
  on_hold: boolean;
  hold_reason?: string;
  notes?: string;
  agent_notes?: string;
  created_at: string;
  updated_at: string;
  line_items: InvoiceLineItem[];
  supplier?: Supplier;
  purchase_order?: PurchaseOrder;
}

// ============================================================================
// Approval
// ============================================================================

export interface ApprovalStep {
  id: number;
  requisition_id?: number;
  purchase_order_id?: number;
  invoice_id?: number;
  step_number: number;
  approver_id: string;
  approver_role: UserRole;
  required_for_amount?: number;
  status: ApprovalStatus;
  action_at?: string;
  comments?: string;
  delegated_from_id?: string;
  created_at: string;
  updated_at: string;
  approver?: User;
}

// ============================================================================
// Audit Log
// ============================================================================

// ============================================================================
// Payment
// ============================================================================

export interface Payment {
  id: number;
  number: string;
  invoice_id: number;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: number;
  currency: string;
  scheduled_date: string;
  processed_date?: string;
  reference_number?: string;
  bank_reference?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  invoice?: Invoice;
}

export type PaymentMethod = 
  | 'BANK_TRANSFER' 
  | 'CHECK' 
  | 'WIRE' 
  | 'ACH' 
  | 'CREDIT_CARD' 
  | 'OTHER';

export interface AuditLog {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id?: string;
  actor_type: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  actor?: User;
}

// ============================================================================
// Dashboard & Metrics
// ============================================================================

export interface DashboardMetrics {
  pending_approvals: number;
  open_pos: number;
  pending_invoices: number;
  overdue_invoices: number;
  upcoming_payments: InvoiceSummary[];
  high_risk_invoices: number;
  recent_payments: PaymentSummary[];
}

export interface InvoiceSummary {
  id: number;
  number: string;
  supplier_name: string;
  total_amount: number;
  due_date: string;
}

export interface PaymentSummary {
  invoice_id: number;
  invoice_number: string;
  amount: number;
  payment_date: string;
}

export interface SpendByCategory {
  category: string;
  amount: number;
  percentage: number;
}

export interface SpendTrend {
  month: string;
  amount: number;
  count: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  detail: string;
  status_code: number;
}

// ============================================================================
// Form Types
// ============================================================================

export interface RequisitionFormData {
  title: string;
  description?: string;
  department: Department;
  urgency: Urgency;
  needed_by_date?: string;
  justification?: string;
  cost_center?: string;
  project_code?: string;
  line_items: Omit<RequisitionLineItem, 'id' | 'requisition_id' | 'created_at' | 'updated_at'>[];
}

export interface POFormData {
  requisition_id?: number;
  supplier_id: string;
  ship_to_name?: string;
  ship_to_address?: string;
  expected_delivery_date?: string;
  payment_terms?: string;
  shipping_terms?: string;
  notes?: string;
  line_items: Omit<POLineItem, 'id' | 'purchase_order_id' | 'received_quantity' | 'invoiced_quantity' | 'created_at' | 'updated_at'>[];
}

export interface InvoiceFormData {
  vendor_invoice_number: string;
  supplier_id: string;
  purchase_order_id?: number;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  line_items: Omit<InvoiceLineItem, 'id' | 'invoice_id' | 'created_at' | 'updated_at'>[];
}

export interface GoodsReceiptFormData {
  purchase_order_id: number;
  delivery_note?: string;
  carrier?: string;
  tracking_number?: string;
  line_items: {
    po_line_item_id: number;
    quantity_received: number;
    quantity_rejected?: number;
    rejection_reason?: string;
    storage_location?: string;
  }[];
}

export interface ApprovalActionData {
  action: 'approve' | 'reject' | 'delegate';
  comments?: string;
  delegate_to_id?: string;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface RequisitionFilters {
  status?: DocumentStatus;
  department?: Department;
  requester_id?: string;
  urgency?: Urgency;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface POFilters {
  status?: DocumentStatus;
  supplier_id?: string;
  buyer_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface InvoiceFilters {
  status?: DocumentStatus;
  match_status?: MatchStatus;
  risk_level?: RiskLevel;
  supplier_id?: string;
  overdue_only?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface PaymentFilters {
  status?: PaymentStatus;
  method?: PaymentMethod;
  invoice_id?: number;
  date_from?: string;
  date_to?: string;
}

export interface SupplierFilters {
  category?: SupplierCategory;
  risk_level?: RiskLevel;
  is_active?: boolean;
  is_preferred?: boolean;
  search?: string;
}

export interface GoodsReceiptFilters {
  purchase_order_id?: number;
  status?: GoodsReceiptStatus;
  date_from?: string;
  date_to?: string;
}

export interface AuditLogFilters {
  action?: string;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}

// ============================================================================
// Additional Types
// ============================================================================

export type GoodsReceiptStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'REJECTED';

// Compliance Metrics
export interface ComplianceMetrics {
  compliant_transactions: number;
  policy_violations: number;
  high_risk_suppliers: number;
  compliance_rate: number;
  recent_violations: {
    description: string;
    entity_type: string;
    severity: RiskLevel;
    created_at: string;
  }[];
}

