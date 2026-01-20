// ============================================================================
// P2P SaaS Platform - API Client
// ============================================================================

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
    public rawBody?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });
  } catch (networkError) {
    // Network error - fetch failed before getting a response (connection refused, etc.)
    const errorMsg = networkError instanceof Error 
      ? `Network error: ${networkError.message}. Is the backend server running on port 8000?` 
      : 'Network error: Failed to connect to backend server. Run: cd backend && uvicorn app.main:app --reload';
    
    console.error('[NETWORK ERROR]', {
      endpoint,
      url,
      error: networkError,
    });
    
    throw new ApiError(0, errorMsg, { networkError: true }, errorMsg);
  }

  if (!response.ok) {
    const rawBody = await response.text();  // get full body once
    let errorData: Record<string, unknown> = {};
    try {
      errorData = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      // non-JSON body; leave errorData as {}
    }

    // Extract error message, handling object types properly
    let msg: string;
    const detail = errorData?.detail;
    const error = errorData?.error;
    
    if (detail) {
      // FastAPI validation errors return detail as array of objects
      if (Array.isArray(detail)) {
        msg = detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
      } else if (typeof detail === 'object') {
        msg = JSON.stringify(detail);
      } else {
        msg = String(detail);
      }
    } else if (error) {
      msg = typeof error === 'object' ? JSON.stringify(error) : String(error);
    } else {
      msg = rawBody || 'An error occurred';
    }

    console.error('[API ERROR]', {
      endpoint,
      status: response.status,
      message: msg,
      rawBody,
      errorData,
    });

    throw new ApiError(response.status, msg, errorData, rawBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ============================================================================
// Axios-style API wrapper for legacy code compatibility
// ============================================================================

interface ApiResponse<T> {
  data: T;
  status: number;
}

export const api = {
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const data = await fetchApi<T>(endpoint);
    return { data, status: 200 };
  },
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    const data = await fetchApi<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
    return { data, status: 200 };
  },
  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    const data = await fetchApi<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
    return { data, status: 200 };
  },
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const data = await fetchApi<T>(endpoint, { method: 'DELETE' });
    return { data, status: 200 };
  },
};

// ============================================================================
// Health
// ============================================================================

export async function checkHealth(): Promise<{ status: string }> {
  return fetchApi('/health');
}

// ============================================================================
// Users
// ============================================================================

import type { User, PaginatedResponse } from '../types';

export async function getUsers(params?: { skip?: number; limit?: number }): Promise<PaginatedResponse<User>> {
  return fetchApi('/users/', { params });
}

export async function getUser(id: string): Promise<User> {
  return fetchApi(`/users/${id}`);
}

export async function createUser(data: Partial<User>): Promise<User> {
  return fetchApi('/users/', { method: 'POST', body: JSON.stringify(data) });
}

// ============================================================================
// Suppliers
// ============================================================================

import type { Supplier } from '../types';

export async function getSuppliers(params?: { 
  skip?: number; 
  limit?: number;
  status?: string;
  search?: string;
}): Promise<PaginatedResponse<Supplier>> {
  return fetchApi('/suppliers/', { params });
}

export async function getSupplier(id: string): Promise<Supplier> {
  return fetchApi(`/suppliers/${id}`);
}

export async function createSupplier(data: Partial<Supplier>): Promise<Supplier> {
  return fetchApi('/suppliers/', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
  return fetchApi(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

// ============================================================================
// Products
// ============================================================================

import type { Product } from '../types';

export async function getProducts(params?: { 
  skip?: number; 
  limit?: number;
  category?: string;
  search?: string;
}): Promise<PaginatedResponse<Product>> {
  return fetchApi('/products/', { params });
}

export async function getProduct(id: string): Promise<Product> {
  return fetchApi(`/products/${id}`);
}

// ============================================================================
// Requisitions
// ============================================================================

import type { Requisition, RequisitionFormData, RequisitionFilters } from '../types';

export async function getRequisitions(params?: RequisitionFilters & { 
  skip?: number; 
  limit?: number;
}): Promise<PaginatedResponse<Requisition>> {
  return fetchApi('/requisitions/', { params: params as Record<string, string | number | boolean | undefined> });
}

export async function getRequisition(id: number): Promise<Requisition> {
  return fetchApi(`/requisitions/${id}`);
}

export async function createRequisition(data: RequisitionFormData): Promise<Requisition> {
  return fetchApi('/requisitions/', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateRequisition(id: number, data: Partial<RequisitionFormData>): Promise<Requisition> {
  return fetchApi(`/requisitions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

// ============================================================================
// Natural Language Parsing
// ============================================================================

export interface ParsedRequisitionData {
  title: string | null;
  description: string;
  department: string | null;
  category: string | null;
  amount: number | null;
  priority: string | null;
  supplier: string | null;
  justification: string | null;
  parsing_method: 'llm' | 'regex';
  confidence: number;
}

/**
 * Parse natural language input to extract requisition data using Bedrock LLM.
 * 
 * @param userInput - Natural language description of the requisition need
 * @returns Parsed requisition data including title, amount, supplier, category, etc.
 * 
 * @example
 * const result = await parseRequisitionInput("Need laptops for $5000, vendor is Dell");
 * // result.amount = 5000
 * // result.supplier = "Dell"
 * // result.category = "IT Equipment"
 */
export async function parseRequisitionInput(userInput: string): Promise<ParsedRequisitionData> {
  return fetchApi('/requisitions/parse-input', { 
    method: 'POST', 
    body: JSON.stringify({ user_input: userInput }) 
  });
}

export async function submitRequisition(id: number): Promise<Requisition> {
  return fetchApi(`/requisitions/${id}/submit`, { method: 'POST' });
}

export async function cancelRequisition(id: number): Promise<Requisition> {
  return fetchApi(`/requisitions/${id}/cancel`, { method: 'POST' });
}

// ============================================================================
// Purchase Orders
// ============================================================================

import type { PurchaseOrder, POFormData, POFilters } from '../types';

export async function getPurchaseOrders(params?: POFilters & { 
  skip?: number; 
  limit?: number;
}): Promise<PaginatedResponse<PurchaseOrder>> {
  return fetchApi('/purchase-orders/', { params: params as Record<string, string | number | boolean | undefined> });
}

export async function getPurchaseOrder(id: number): Promise<PurchaseOrder> {
  return fetchApi(`/purchase-orders/${id}`);
}

export async function createPurchaseOrder(data: POFormData): Promise<PurchaseOrder> {
  return fetchApi('/purchase-orders/', { method: 'POST', body: JSON.stringify(data) });
}

export async function updatePurchaseOrder(id: number, data: Partial<POFormData>): Promise<PurchaseOrder> {
  return fetchApi(`/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

// ============================================================================
// Goods Receipts
// ============================================================================

import type { GoodsReceipt, GoodsReceiptFormData } from '../types';

export async function getGoodsReceipts(params?: { 
  skip?: number; 
  limit?: number;
  purchase_order_id?: number;
}): Promise<PaginatedResponse<GoodsReceipt>> {
  return fetchApi('/goods-receipts/', { params });
}

export async function getGoodsReceipt(id: number): Promise<GoodsReceipt> {
  return fetchApi(`/goods-receipts/${id}`);
}

export async function createGoodsReceipt(data: GoodsReceiptFormData): Promise<GoodsReceipt> {
  return fetchApi('/goods-receipts/', { method: 'POST', body: JSON.stringify(data) });
}

// ============================================================================
// Invoices
// ============================================================================

import type { Invoice, InvoiceFormData, InvoiceFilters } from '../types';

export async function getInvoices(params?: InvoiceFilters & { 
  skip?: number; 
  limit?: number;
}): Promise<PaginatedResponse<Invoice>> {
  return fetchApi('/invoices/', { params: params as Record<string, string | number | boolean | undefined> });
}

export async function getInvoice(id: number): Promise<Invoice> {
  return fetchApi(`/invoices/${id}`);
}

export async function createInvoice(data: InvoiceFormData): Promise<Invoice> {
  return fetchApi('/invoices/', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateInvoice(id: number, data: Partial<InvoiceFormData>): Promise<Invoice> {
  return fetchApi(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

// ============================================================================
// Approvals
// ============================================================================

import type { ApprovalStep, ApprovalActionData } from '../types';

export async function getPendingApprovals(userId: string): Promise<ApprovalStep[]> {
  return fetchApi(`/approvals/pending/${userId}`);
}

export async function processApproval(stepId: number, data: ApprovalActionData): Promise<ApprovalStep> {
  return fetchApi(`/approvals/${stepId}`, { method: 'POST', body: JSON.stringify(data) });
}

// ============================================================================
// Payments
// ============================================================================

import type { Payment, PaymentFilters } from '../types';

export async function getPayments(params?: PaymentFilters & { 
  skip?: number; 
  limit?: number;
}): Promise<PaginatedResponse<Payment>> {
  return fetchApi('/payments/', { params: params as Record<string, string | number | boolean | undefined> });
}

export async function getPayment(id: number): Promise<Payment> {
  return fetchApi(`/payments/${id}`);
}

export async function createPayment(data: Partial<Payment>): Promise<Payment> {
  return fetchApi('/payments/', { method: 'POST', body: JSON.stringify(data) });
}

// ============================================================================
// Dashboard
// ============================================================================

import type { DashboardMetrics, ComplianceMetrics } from '../types';

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return fetchApi('/dashboard/metrics');
}

export async function getComplianceMetrics(): Promise<ComplianceMetrics> {
  return fetchApi('/compliance/metrics');
}

// ============================================================================
// Audit Logs
// ============================================================================

import type { AuditLog, AuditLogFilters } from '../types';

export async function getAuditLogs(params?: AuditLogFilters & {
  skip?: number;
  limit?: number;
}): Promise<PaginatedResponse<AuditLog>> {
  return fetchApi('/audit-logs/', { params: params as Record<string, string | number | boolean | undefined> });
}

// ============================================================================
// Agents
// ============================================================================

interface AgentTriggerRequest {
  document_type: string;
  document_id: number;
  parameters?: Record<string, any>;
}

interface AgentTriggerResponse {
  agent_name: string;
  status: 'completed' | 'error';
  result?: Record<string, any>;
  notes?: string[];
  flagged?: boolean;
  flag_reason?: string;
}

export async function triggerAgent(
  agentName: string,
  request: AgentTriggerRequest
): Promise<AgentTriggerResponse> {
  return fetchApi(`/agents/${agentName}/run`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getAgentHistory(
  agentName: string,
  params?: { skip?: number; limit?: number }
): Promise<PaginatedResponse<any>> {
  return fetchApi(`/agents/${agentName}/history`, { params });
}

// Convenience methods for triggering specific agents
export async function triggerRequisitionAgent(documentId: number): Promise<AgentTriggerResponse> {
  return triggerAgent('requisition', {
    document_type: 'requisition',
    document_id: documentId,
  });
}

export async function triggerApprovalAgent(documentId: number, documentType: string = 'requisition'): Promise<AgentTriggerResponse> {
  return triggerAgent('approval', {
    document_type: documentType,
    document_id: documentId,
  });
}

export async function triggerFraudAgent(documentId: number, documentType: string = 'invoice'): Promise<AgentTriggerResponse> {
  return triggerAgent('fraud', {
    document_type: documentType,
    document_id: documentId,
  });
}

export async function triggerComplianceAgent(documentId: number, documentType: string = 'invoice'): Promise<AgentTriggerResponse> {
  return triggerAgent('compliance', {
    document_type: documentType,
    document_id: documentId,
  });
}

export async function triggerPOAgent(documentId: number): Promise<AgentTriggerResponse> {
  return triggerAgent('po', {
    document_type: 'requisition',
    document_id: documentId,
  });
}

export async function triggerReceivingAgent(documentId: number): Promise<AgentTriggerResponse> {
  return triggerAgent('receiving', {
    document_type: 'po',
    document_id: documentId,
  });
}

export async function triggerInvoiceAgent(documentId: number): Promise<AgentTriggerResponse> {
  return triggerAgent('invoice', {
    document_type: 'invoice',
    document_id: documentId,
  });
}

// ============================================================================
// New Dedicated Agent Endpoints (Step 8)
// ============================================================================

/**
 * Validate a requisition using the RequisitionAgent
 */
export async function validateRequisition(documentId: string | number): Promise<AgentTriggerResponse> {
  return fetchApi('/agents/requisition/validate', {
    method: 'POST',
    body: JSON.stringify({
      document_type: 'requisition',
      document_id: documentId,
    }),
  });
}

/**
 * Determine approval chain for a document
 */
export async function determineApprovalChain(
  documentId: string | number,
  documentType: string = 'requisition'
): Promise<AgentTriggerResponse> {
  return fetchApi('/agents/approval/determine-chain', {
    method: 'POST',
    body: JSON.stringify({
      document_type: documentType,
      document_id: documentId,
    }),
  });
}

/**
 * Generate a purchase order from a requisition
 */
export async function generatePO(documentId: string | number): Promise<AgentTriggerResponse> {
  return fetchApi('/agents/po/generate', {
    method: 'POST',
    body: JSON.stringify({
      document_type: 'requisition',
      document_id: documentId,
    }),
  });
}

/**
 * Process a goods receipt
 */
export async function processReceipt(documentId: string | number): Promise<AgentTriggerResponse> {
  return fetchApi('/agents/receiving/process', {
    method: 'POST',
    body: JSON.stringify({
      document_type: 'goods_receipt',
      document_id: documentId,
    }),
  });
}

/**
 * Validate an invoice (3-way matching)
 */
export async function validateInvoice(documentId: string | number): Promise<AgentTriggerResponse> {
  return fetchApi('/agents/invoice/validate', {
    method: 'POST',
    body: JSON.stringify({
      document_type: 'invoice',
      document_id: documentId,
    }),
  });
}

/**
 * Analyze a transaction for fraud risk
 */
export async function analyzeFraud(
  documentId: string | number,
  documentType: string = 'invoice'
): Promise<AgentTriggerResponse> {
  return fetchApi('/agents/fraud/analyze', {
    method: 'POST',
    body: JSON.stringify({
      document_type: documentType,
      document_id: documentId,
    }),
  });
}

/**
 * Check compliance for a document
 */
export async function checkCompliance(
  documentId: string | number,
  documentType: string = 'invoice'
): Promise<AgentTriggerResponse> {
  return fetchApi('/agents/compliance/check', {
    method: 'POST',
    body: JSON.stringify({
      document_type: documentType,
      document_id: documentId,
    }),
  });
}

/**
 * Check health of all agents
 */
interface AgentHealthStatus {
  service: string;
  status: 'healthy' | 'degraded';
  agents: Record<string, {
    status: 'healthy' | 'unhealthy';
    agent_name?: string;
    initialized: boolean;
    error?: string;
  }>;
  timestamp: string;
}

export async function checkAgentHealth(): Promise<AgentHealthStatus> {
  return fetchApi('/agents/health');
}

// ============================================================================
// P2P Engine Full Workflow
// ============================================================================

// Key Check item for individual sub-checks
export interface KeyCheckItem {
  label: string;
  passed: boolean;
  required?: boolean;
}

// Key Check structure for approval agent
export interface KeyCheck {
  id: number;
  name: string;
  status: 'pass' | 'fail' | 'attention';
  detail: string;
  items?: KeyCheckItem[];
}

// Summary of all checks
export interface ChecksSummary {
  total: number;
  passed: number;
  attention: number;
  failed: number;
}

export interface P2PWorkflowStepResult {
  step_id: number;
  step_name: string;
  agent_name: string;
  status: 'completed' | 'error' | 'flagged';
  agent_notes: string[];
  result_data: Record<string, any> & {
    key_checks?: KeyCheck[];
    checks_summary?: ChecksSummary;
  };
  flagged: boolean;
  flag_reason?: string;
  execution_time_ms: number;
}

export interface P2PWorkflowResponse {
  workflow_id: string;
  requisition_id: number;
  status: 'completed' | 'in_progress' | 'failed' | 'needs_approval';
  current_step: number;
  total_steps: number;
  steps: P2PWorkflowStepResult[];
  overall_notes: string[];
  execution_time_ms: number;
  final_approval_required: boolean;
  flagged_issues: string[];
}

export interface P2PWorkflowStatusResponse {
  requisition_id: number;
  current_step: number;
  total_steps: number;
  step_name: string;
  step_status: 'not_started' | 'in_progress' | 'pending_approval' | 'approved' | 'rejected';
  workflow_status: string;
  can_continue: boolean;
  completed_steps: Array<{
    agent: string;
    note: string;
    flagged: boolean;
    timestamp: string | null;
  }>;
  flagged_items: string[];
}

export interface P2PStepApprovalResponse {
  requisition_id: number;
  step_id: number;
  action: string;
  success: boolean;
  message: string;
  next_step: number | null;
  workflow_status: string;
}

/**
 * Get the current workflow status for a requisition.
 */
export async function getWorkflowStatus(requisitionId: number): Promise<P2PWorkflowStatusResponse> {
  return fetchApi(`/agents/workflow/status/${requisitionId}`);
}

/**
 * Run the P2P Engine workflow for a requisition.
 * Can run all steps or a single step at a time.
 * 
 * @param requisitionId - The requisition ID to process
 * @param startFromStep - Start from this step (default: 1)
 * @param runSingleStep - If true, run only one step and pause for approval
 */
export async function runP2PWorkflow(
  requisitionId: number,
  startFromStep: number = 1,
  runSingleStep: boolean = false
): Promise<P2PWorkflowResponse> {
  return fetchApi('/agents/workflow/run', {
    method: 'POST',
    body: JSON.stringify({
      requisition_id: requisitionId,
      start_from_step: startFromStep,
      run_single_step: runSingleStep,
    }),
  });
}

/**
 * Approve, reject, or hold a workflow step.
 * 
 * @param requisitionId - The requisition ID
 * @param stepId - The step ID to take action on
 * @param action - 'approve', 'reject', or 'hold'
 * @param comments - Optional comments for the action
 */
export async function approveWorkflowStep(
  requisitionId: number,
  stepId: number,
  action: 'approve' | 'reject' | 'hold',
  comments?: string
): Promise<P2PStepApprovalResponse> {
  return fetchApi('/agents/workflow/step/approve', {
    method: 'POST',
    body: JSON.stringify({
      requisition_id: requisitionId,
      step_id: stepId,
      action,
      comments,
    }),
  });
}

// ============================================================================
// Pipeline Stats & Dashboard API
// ============================================================================

export interface PipelineStats {
  total_requisitions: number;
  requisitions_in_progress: number;
  requisitions_completed: number;
  requisitions_hitl_pending: number;
  requisitions_rejected: number;
  automation_rate: number;
  avg_processing_time_manual_hours: number;
  avg_processing_time_agent_hours: number;
  time_savings_percent: number;
  compliance_score: number;
  roi_minutes_saved: number;
  flagged_for_review_count: number;
  accuracy_score: number;
}

export interface RequisitionStatusSummary {
  id: number;
  number: string;
  description: string;
  department: string;
  total_amount: number;
  current_step: number;
  step_name: string;
  workflow_status: 'draft' | 'in_progress' | 'hitl_pending' | 'rejected' | 'completed';
  flagged_by?: string;
  flag_reason?: string;
  requestor_name: string;
  requestor_id?: string;
  supplier_name?: string;
  category?: string;
  justification?: string;
  urgency?: string;  // Priority/urgency from API
  // Centene Enterprise Procurement Fields
  cost_center?: string;
  gl_account?: string;
  spend_type?: string;
  supplier_risk_score?: number;
  supplier_status?: string;
  contract_on_file?: boolean;
  budget_available?: number;
  budget_impact?: string;
  created_at: string;
  updated_at: string;
}

export interface ProcurementGraphNode {
  id: string;
  type: 'department' | 'requisition' | 'category' | 'supplier' | 'status';
  name: string;
  status: string;
  color: string;
  data: Record<string, any>;
}

export interface ProcurementGraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface ProcurementGraphData {
  nodes: ProcurementGraphNode[];
  edges: ProcurementGraphEdge[];
}

/**
 * Get pipeline statistics for dashboard
 */
export async function getPipelineStats(): Promise<PipelineStats> {
  return fetchApi('/dashboard/pipeline-stats');
}

/**
 * Get all requisitions with workflow status for dashboard display
 * @param hitlOnly - Filter to only HITL pending items
 */
export async function getRequisitionsStatus(hitlOnly: boolean = false): Promise<RequisitionStatusSummary[]> {
  const params = hitlOnly ? '?hitl_only=true' : '';
  return fetchApi(`/dashboard/requisitions-status${params}`);
}

/**
 * Get procurement graph data for visualization
 */
export async function getProcurementGraphData(
  department?: string,
  budgetThreshold?: number,
  statusFilter?: string
): Promise<ProcurementGraphData> {
  const params = new URLSearchParams();
  if (department) params.append('department', department);
  if (budgetThreshold) params.append('budget_threshold', budgetThreshold.toString());
  if (statusFilter) params.append('status_filter', statusFilter);
  
  const queryString = params.toString();
  return fetchApi(`/dashboard/procurement-graph${queryString ? '?' + queryString : ''}`);
}

export { ApiError };
