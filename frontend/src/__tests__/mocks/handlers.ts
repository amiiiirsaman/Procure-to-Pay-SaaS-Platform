import { http, HttpResponse } from 'msw';

const API_BASE = '/api/v1';

// ============================================================================
// Mock Data
// ============================================================================

export const mockUsers = [
  {
    id: 'user-1',
    email: 'john.doe@example.com',
    name: 'John Doe',
    role: 'MANAGER',
    department: 'ENGINEERING',
    approval_limit: 50000,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    email: 'jane.smith@example.com',
    name: 'Jane Smith',
    role: 'APPROVER',
    department: 'FINANCE',
    approval_limit: 100000,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

export const mockSuppliers = [
  {
    id: 'supplier-1',
    code: 'SUP-001',
    name: 'Acme Corp',
    status: 'APPROVED',
    category: 'IT',
    contact_email: 'sales@acme.com',
    contact_phone: '+1-555-0100',
    city: 'San Francisco',
    country: 'USA',
    risk_level: 'LOW',
    performance_rating: 4.5,
    is_active: true,
    is_preferred: true,
    bank_verified: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'supplier-2',
    code: 'SUP-002',
    name: 'Global Materials Inc',
    status: 'APPROVED',
    category: 'RAW_MATERIALS',
    contact_email: 'info@globalmaterials.com',
    city: 'New York',
    country: 'USA',
    risk_level: 'MEDIUM',
    performance_rating: 3.8,
    is_active: true,
    is_preferred: false,
    bank_verified: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

export const mockRequisitions = [
  {
    id: 1,
    number: 'REQ-2025-001',
    title: 'Office Supplies Q1',
    description: 'Quarterly office supplies order',
    status: 'PENDING_APPROVAL',
    department: 'OPERATIONS',
    urgency: 'STANDARD',
    requester_id: 'user-1',
    total_amount: 2500.0,
    currency: 'USD',
    created_at: '2025-01-10T09:00:00Z',
    updated_at: '2025-01-10T09:00:00Z',
    line_items: [
      {
        id: 1,
        requisition_id: 1,
        item_code: 'PENS-001',
        description: 'Premium Ballpoint Pens (Box of 100)',
        quantity: 10,
        unit: 'BOX',
        estimated_unit_price: 25.0,
        estimated_total: 250.0,
        created_at: '2025-01-10T09:00:00Z',
        updated_at: '2025-01-10T09:00:00Z',
      },
    ],
  },
  {
    id: 2,
    number: 'REQ-2025-002',
    title: 'Server Hardware Upgrade',
    description: 'New servers for data center',
    status: 'APPROVED',
    department: 'IT',
    urgency: 'URGENT',
    requester_id: 'user-1',
    total_amount: 75000.0,
    currency: 'USD',
    created_at: '2025-01-08T14:30:00Z',
    updated_at: '2025-01-09T10:00:00Z',
    line_items: [],
  },
  {
    id: 3,
    number: 'REQ-2025-003',
    title: 'Marketing Materials',
    description: 'Trade show booth materials',
    status: 'DRAFT',
    department: 'MARKETING',
    urgency: 'STANDARD',
    requester_id: 'user-2',
    total_amount: 5000.0,
    currency: 'USD',
    created_at: '2025-01-12T11:00:00Z',
    updated_at: '2025-01-12T11:00:00Z',
    line_items: [],
  },
];

export const mockPurchaseOrders = [
  {
    id: 1,
    number: 'PO-2025-001',
    requisition_id: 2,
    supplier_id: 'supplier-1',
    status: 'ORDERED',
    order_date: '2025-01-09T12:00:00Z',
    expected_delivery_date: '2025-01-20T00:00:00Z',
    total_amount: 75000.0,
    currency: 'USD',
    created_at: '2025-01-09T12:00:00Z',
    updated_at: '2025-01-09T12:00:00Z',
    supplier: mockSuppliers[0],
    line_items: [],
  },
];

export const mockInvoices = [
  {
    id: 1,
    number: 'INV-2025-001',
    vendor_invoice_number: 'ACME-INV-5001',
    status: 'PENDING_APPROVAL',
    supplier_id: 'supplier-1',
    purchase_order_id: 1,
    invoice_date: '2025-01-15T00:00:00Z',
    due_date: '2025-02-15T00:00:00Z',
    subtotal: 70000.0,
    tax_amount: 5000.0,
    total_amount: 75000.0,
    currency: 'USD',
    match_status: 'MATCHED',
    fraud_score: 0.05,
    risk_level: 'LOW',
    payment_status: 'NOT_SCHEDULED',
    is_duplicate: false,
    requires_review: false,
    on_hold: false,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    supplier: mockSuppliers[0],
    line_items: [],
  },
  {
    id: 2,
    number: 'INV-2025-002',
    vendor_invoice_number: 'GLOB-2025-100',
    status: 'APPROVED',
    supplier_id: 'supplier-2',
    invoice_date: '2025-01-10T00:00:00Z',
    due_date: '2025-01-25T00:00:00Z',
    subtotal: 15000.0,
    tax_amount: 1200.0,
    total_amount: 16200.0,
    currency: 'USD',
    match_status: 'PARTIAL',
    fraud_score: 0.25,
    risk_level: 'MEDIUM',
    payment_status: 'SCHEDULED',
    is_duplicate: false,
    requires_review: true,
    on_hold: false,
    created_at: '2025-01-10T14:00:00Z',
    updated_at: '2025-01-12T09:00:00Z',
    supplier: mockSuppliers[1],
    line_items: [],
  },
];

export const mockApprovals = [
  {
    id: 1,
    requisition_id: 1,
    step_number: 1,
    approver_id: 'user-2',
    approver_role: 'MANAGER',
    status: 'PENDING',
    created_at: '2025-01-10T09:05:00Z',
    updated_at: '2025-01-10T09:05:00Z',
  },
  {
    id: 2,
    invoice_id: 1,
    step_number: 1,
    approver_id: 'user-2',
    approver_role: 'FINANCE_MANAGER',
    status: 'PENDING',
    required_for_amount: 50000,
    created_at: '2025-01-15T10:05:00Z',
    updated_at: '2025-01-15T10:05:00Z',
  },
];

export const mockGoodsReceipts = [
  {
    id: 1,
    number: 'GR-2025-001',
    purchase_order_id: 1,
    status: 'COMPLETED',
    receipt_date: '2025-01-20T00:00:00Z',
    delivery_note: 'DN-12345',
    created_at: '2025-01-20T14:00:00Z',
    updated_at: '2025-01-20T14:30:00Z',
    purchase_order: mockPurchaseOrders[0],
    line_items: [],
  },
];

export const mockPayments = [
  {
    id: 1,
    number: 'PAY-2025-001',
    invoice_id: 2,
    status: 'SCHEDULED',
    method: 'BANK_TRANSFER',
    amount: 16200.0,
    currency: 'USD',
    scheduled_date: '2025-01-25T00:00:00Z',
    created_at: '2025-01-12T10:00:00Z',
    updated_at: '2025-01-12T10:00:00Z',
    invoice: mockInvoices[1],
  },
];

export const mockDashboardMetrics = {
  pending_approvals: 5,
  open_purchase_orders: 12,
  pending_invoices: 8,
  overdue_invoices: 2,
  high_risk_invoices: 1,
  upcoming_payments: [
    {
      id: 2,
      number: 'INV-2025-002',
      supplier_name: 'Global Materials Inc',
      total_amount: 16200.0,
      due_date: '2025-01-25T00:00:00Z',
    },
  ],
  recent_payments: [
    {
      invoice_id: 3,
      invoice_number: 'INV-2024-150',
      amount: 5000.0,
      payment_date: '2025-01-05T00:00:00Z',
    },
  ],
  spend_by_category: [
    { category: 'IT', amount: 150000, percentage: 45 },
    { category: 'Operations', amount: 80000, percentage: 24 },
    { category: 'Marketing', amount: 50000, percentage: 15 },
    { category: 'Other', amount: 53000, percentage: 16 },
  ],
  spend_trends: [
    { month: '2024-08', amount: 120000, count: 45 },
    { month: '2024-09', amount: 135000, count: 52 },
    { month: '2024-10', amount: 115000, count: 48 },
    { month: '2024-11', amount: 145000, count: 55 },
    { month: '2024-12', amount: 160000, count: 60 },
    { month: '2025-01', amount: 95000, count: 35 },
  ],
};

export const mockComplianceMetrics = {
  compliant_transactions: 342,
  policy_violations: 8,
  high_risk_suppliers: 3,
  compliance_rate: 97.7,
  recent_violations: [
    {
      description: 'PO exceeds approval limit without proper authorization',
      entity_type: 'PURCHASE_ORDER',
      severity: 'HIGH',
      created_at: '2025-01-11T09:00:00Z',
    },
  ],
};

export const mockAuditLogs = [
  {
    id: 1,
    action: 'CREATE',
    entity_type: 'REQUISITION',
    entity_id: '1',
    user_id: 'user-1',
    description: 'Created requisition REQ-2025-001',
    ip_address: '192.168.1.100',
    created_at: '2025-01-10T09:00:00Z',
    user: mockUsers[0],
  },
  {
    id: 2,
    action: 'APPROVE',
    entity_type: 'REQUISITION',
    entity_id: '2',
    user_id: 'user-2',
    description: 'Approved requisition REQ-2025-002',
    ip_address: '192.168.1.101',
    created_at: '2025-01-09T10:00:00Z',
    user: mockUsers[1],
  },
];

// ============================================================================
// Helper for paginated responses
// ============================================================================

function paginatedResponse<T>(items: T[], skip = 0, limit = 20) {
  const paginatedItems = items.slice(skip, skip + limit);
  return {
    items: paginatedItems,
    total: items.length,
    page: Math.floor(skip / limit) + 1,
    page_size: limit,
    total_pages: Math.ceil(items.length / limit),
  };
}

// ============================================================================
// Request Handlers
// ============================================================================

export const handlers = [
  // Health
  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json({ status: 'healthy' });
  }),

  // Users
  http.get(`${API_BASE}/users/`, ({ request }) => {
    const url = new URL(request.url);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(paginatedResponse(mockUsers, skip, limit));
  }),

  http.get(`${API_BASE}/users/:id`, ({ params }) => {
    const user = mockUsers.find((u) => u.id === params.id);
    if (!user) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  // Suppliers
  http.get(`${API_BASE}/suppliers/`, ({ request }) => {
    const url = new URL(request.url);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(paginatedResponse(mockSuppliers, skip, limit));
  }),

  http.get(`${API_BASE}/suppliers/:id`, ({ params }) => {
    const supplier = mockSuppliers.find((s) => s.id === params.id);
    if (!supplier) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(supplier);
  }),

  // Requisitions
  http.get(`${API_BASE}/requisitions/`, ({ request }) => {
    const url = new URL(request.url);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status');
    
    let filtered = [...mockRequisitions];
    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }
    
    return HttpResponse.json(paginatedResponse(filtered, skip, limit));
  }),

  http.get(`${API_BASE}/requisitions/:id`, ({ params }) => {
    const req = mockRequisitions.find((r) => r.id === Number(params.id));
    if (!req) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(req);
  }),

  http.post(`${API_BASE}/requisitions/`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newReq = {
      id: mockRequisitions.length + 1,
      number: `REQ-2025-00${mockRequisitions.length + 1}`,
      status: 'DRAFT',
      total_amount: 0,
      currency: 'USD',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      line_items: [],
      ...body,
    };
    return HttpResponse.json(newReq, { status: 201 });
  }),

  http.post(`${API_BASE}/requisitions/:id/submit`, ({ params }) => {
    const req = mockRequisitions.find((r) => r.id === Number(params.id));
    if (!req) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ ...req, status: 'PENDING_APPROVAL' });
  }),

  http.post(`${API_BASE}/requisitions/:id/cancel`, ({ params }) => {
    const req = mockRequisitions.find((r) => r.id === Number(params.id));
    if (!req) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ ...req, status: 'CANCELLED' });
  }),

  // Purchase Orders
  http.get(`${API_BASE}/purchase-orders/`, ({ request }) => {
    const url = new URL(request.url);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(paginatedResponse(mockPurchaseOrders, skip, limit));
  }),

  http.get(`${API_BASE}/purchase-orders/:id`, ({ params }) => {
    const po = mockPurchaseOrders.find((p) => p.id === Number(params.id));
    if (!po) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(po);
  }),

  // Goods Receipts
  http.get(`${API_BASE}/goods-receipts/`, ({ request }) => {
    const url = new URL(request.url);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(paginatedResponse(mockGoodsReceipts, skip, limit));
  }),

  // Invoices
  http.get(`${API_BASE}/invoices/`, ({ request }) => {
    const url = new URL(request.url);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(paginatedResponse(mockInvoices, skip, limit));
  }),

  http.get(`${API_BASE}/invoices/:id`, ({ params }) => {
    const invoice = mockInvoices.find((i) => i.id === Number(params.id));
    if (!invoice) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(invoice);
  }),

  // Approvals
  http.get(`${API_BASE}/approvals/pending/:userId`, () => {
    return HttpResponse.json(mockApprovals.filter((a) => a.status === 'PENDING'));
  }),

  http.post(`${API_BASE}/approvals/:id`, async ({ params, request }) => {
    const body = await request.json() as { action: string };
    const approval = mockApprovals.find((a) => a.id === Number(params.id));
    if (!approval) {
      return new HttpResponse(null, { status: 404 });
    }
    const newStatus = body.action === 'approve' ? 'APPROVED' : body.action === 'reject' ? 'REJECTED' : 'DELEGATED';
    return HttpResponse.json({ ...approval, status: newStatus, action_at: new Date().toISOString() });
  }),

  // Payments
  http.get(`${API_BASE}/payments/`, ({ request }) => {
    const url = new URL(request.url);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    return HttpResponse.json(paginatedResponse(mockPayments, skip, limit));
  }),

  // Dashboard
  http.get(`${API_BASE}/dashboard/metrics`, () => {
    return HttpResponse.json(mockDashboardMetrics);
  }),

  // Compliance
  http.get(`${API_BASE}/compliance/metrics`, () => {
    return HttpResponse.json(mockComplianceMetrics);
  }),

  // Audit Logs
  http.get(`${API_BASE}/audit-logs/`, ({ request }) => {
    const url = new URL(request.url);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    return HttpResponse.json(paginatedResponse(mockAuditLogs, skip, limit));
  }),

  // Agent Endpoints
  http.post(`${API_BASE}/agents/requisition/validate`, async ({ request }) => {
    const body = await request.json() as { requisition_id: number };
    return HttpResponse.json({
      status: 'completed',
      result: {
        valid: true,
        compliance_score: 0.92,
        budget_check: 'PASSED',
        policy_check: 'PASSED',
      },
      notes: [
        'Requisition meets all policy requirements',
        'Budget allocation verified',
        'Supplier is on approved vendor list',
      ],
      flagged: false,
      flag_reason: null,
      workflow_id: `wf-val-${body.requisition_id}`,
    });
  }),

  http.post(`${API_BASE}/agents/approval/determine-chain`, async ({ request }) => {
    const body = await request.json() as { entity_id: number; entity_type: string };
    return HttpResponse.json({
      status: 'completed',
      result: {
        approval_chain: [
          { role: 'Manager', required: true, order: 1 },
          { role: 'Finance Director', required: true, order: 2 },
        ],
        estimated_time: '2-3 business days',
        recommendations: ['Fast-track eligible due to urgency level'],
      },
      recommendations: [
        { title: 'Approve', description: 'All criteria met for approval', priority: 'high' },
        { title: 'Review budget impact', description: 'Consider quarterly budget allocation', priority: 'medium' },
      ],
      notes: ['Standard approval workflow applies'],
      flagged: false,
      flag_reason: null,
      workflow_id: `wf-appr-${body.entity_id}`,
    });
  }),

  http.post(`${API_BASE}/agents/po/generate`, async ({ request }) => {
    const body = await request.json() as { requisition_id: number };
    return HttpResponse.json({
      status: 'completed',
      result: {
        po_number: `PO-2025-${Math.floor(Math.random() * 1000)}`,
        supplier_matched: true,
        terms_applied: 'NET30',
      },
      notes: ['PO generated successfully', 'Awaiting supplier confirmation'],
      flagged: false,
      flag_reason: null,
      workflow_id: `wf-po-${body.requisition_id}`,
    });
  }),

  http.post(`${API_BASE}/agents/receiving/process`, async ({ request }) => {
    const body = await request.json() as { receipt_id: number };
    return HttpResponse.json({
      status: 'completed',
      result: {
        quantity_verified: true,
        quality_check: 'PASSED',
        discrepancies: [],
      },
      notes: ['All items received match PO specifications', 'Quality inspection complete'],
      flagged: false,
      flag_reason: null,
      workflow_id: `wf-recv-${body.receipt_id}`,
    });
  }),

  http.post(`${API_BASE}/agents/invoice/validate`, async ({ request }) => {
    const body = await request.json() as { invoice_id: number };
    return HttpResponse.json({
      status: 'completed',
      result: {
        three_way_match: 'MATCHED',
        po_match: true,
        receipt_match: true,
        amount_variance: 0,
      },
      notes: [
        'Invoice matches PO quantities and prices',
        'Goods receipt confirmed',
        'Ready for payment processing',
      ],
      flagged: false,
      flag_reason: null,
      workflow_id: `wf-inv-${body.invoice_id}`,
    });
  }),

  http.post(`${API_BASE}/agents/fraud/analyze`, async ({ request }) => {
    const body = await request.json() as { document_id: number; document_type?: string };
    const isFraud = Math.random() > 0.8;
    return HttpResponse.json({
      status: 'completed',
      result: {
        fraud_score: isFraud ? 0.75 : 0.15,
        risk_level: isFraud ? 'HIGH' : 'LOW',
        anomalies_detected: isFraud ? ['Unusual payment pattern', 'New supplier'] : [],
        recommendation: isFraud ? 'Manual review required' : 'Safe to process',
      },
      notes: isFraud 
        ? ['High fraud risk detected', 'Recommend manual review before processing']
        : ['No fraud indicators detected', 'Transaction appears legitimate'],
      flagged: isFraud,
      flag_reason: isFraud ? 'High fraud score detected' : null,
      workflow_id: `wf-fraud-${body.document_id}`,
    });
  }),

  http.post(`${API_BASE}/agents/compliance/check`, async () => {
    return HttpResponse.json({
      status: 'completed',
      result: {
        compliance_score: 0.95,
        violations: [],
        recommendations: [
          'All transactions compliant with policy',
          'Audit trail complete',
        ],
      },
      notes: ['Full compliance check completed', 'No violations found'],
      flagged: false,
      flag_reason: null,
      workflow_id: `wf-comp-${Date.now()}`,
    });
  }),

  http.get(`${API_BASE}/agents/health`, () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      agents: [
        { name: 'RequisitionAgent', status: 'healthy', lastActivity: new Date().toISOString() },
        { name: 'ApprovalChainAgent', status: 'healthy', lastActivity: new Date().toISOString() },
        { name: 'POGeneratorAgent', status: 'healthy', lastActivity: new Date().toISOString() },
        { name: 'ReceivingAgent', status: 'healthy', lastActivity: new Date().toISOString() },
        { name: 'InvoiceValidationAgent', status: 'healthy', lastActivity: new Date().toISOString() },
        { name: 'FraudAnalysisAgent', status: 'healthy', lastActivity: new Date().toISOString() },
        { name: 'ComplianceAgent', status: 'healthy', lastActivity: new Date().toISOString() },
      ],
    });
  }),

  // ============================================================================
  // Dashboard Endpoints
  // ============================================================================

  http.get(`${API_BASE}/dashboard/pipeline-stats`, () => {
    return HttpResponse.json({
      total_requisitions: 25,
      requisitions_in_progress: 8,
      requisitions_completed: 15,
      requisitions_hitl_pending: 2,
      requisitions_rejected: 0,
      automation_rate: 92.5,
      avg_processing_time_manual_hours: 4.0,
      avg_processing_time_agent_hours: 0.25,
      time_savings_percent: 93.75,
      compliance_score: 98.5,
      roi_minutes_saved: 450,
      flagged_for_review_count: 2,
      accuracy_score: 95.0,
    });
  }),

  http.get(`${API_BASE}/dashboard/requisitions-status`, ({ request }) => {
    const url = new URL(request.url);
    const hitlOnly = url.searchParams.get('hitl_only') === 'true';
    
    const allRequisitions = [
      {
        id: 1,
        number: 'REQ-2025-001',
        title: 'Office Supplies Q1',
        department: 'OPERATIONS',
        total_amount: 2500.0,
        currency: 'USD',
        current_step: 7,
        step_name: 'Compliance Check',
        workflow_status: 'completed',
        flagged_for_review: false,
        flag_reason: null,
        created_at: '2025-01-10T09:00:00Z',
      },
      {
        id: 2,
        number: 'REQ-2025-002',
        title: 'IT Equipment Refresh',
        department: 'IT',
        total_amount: 15000.0,
        currency: 'USD',
        current_step: 3,
        step_name: 'PO Generation',
        workflow_status: 'hitl_pending',
        flagged_for_review: true,
        flag_reason: 'Budget exceeds department limit - requires VP approval',
        created_at: '2025-01-12T11:30:00Z',
      },
      {
        id: 3,
        number: 'REQ-2025-003',
        title: 'Marketing Materials',
        department: 'MARKETING',
        total_amount: 5000.0,
        currency: 'USD',
        current_step: 5,
        step_name: 'Invoice Validation',
        workflow_status: 'in_progress',
        flagged_for_review: false,
        flag_reason: null,
        created_at: '2025-01-14T14:00:00Z',
      },
      {
        id: 4,
        number: 'REQ-2025-004',
        title: 'Safety Equipment',
        department: 'OPERATIONS',
        total_amount: 8500.0,
        currency: 'USD',
        current_step: 2,
        step_name: 'Approval Check',
        workflow_status: 'hitl_pending',
        flagged_for_review: true,
        flag_reason: 'New supplier requires verification',
        created_at: '2025-01-15T09:15:00Z',
      },
    ];
    
    if (hitlOnly) {
      return HttpResponse.json(
        allRequisitions.filter(r => r.workflow_status === 'hitl_pending')
      );
    }
    
    return HttpResponse.json(allRequisitions);
  }),

  http.get(`${API_BASE}/dashboard/procurement-graph`, ({ request }) => {
    const url = new URL(request.url);
    const department = url.searchParams.get('department');
    const statusFilter = url.searchParams.get('status_filter');
    
    // Base graph data
    const nodes = [
      { id: 'dept_1', type: 'department', name: 'IT', status: 'active', color: '#3b82f6', data: { requisition_count: 5 } },
      { id: 'dept_2', type: 'department', name: 'OPERATIONS', status: 'active', color: '#10b981', data: { requisition_count: 8 } },
      { id: 'dept_3', type: 'department', name: 'MARKETING', status: 'active', color: '#f59e0b', data: { requisition_count: 3 } },
      { id: 'req_1', type: 'requisition', name: 'REQ-2025-001', status: 'completed', color: '#3b82f6', data: { amount: 2500 } },
      { id: 'req_2', type: 'requisition', name: 'REQ-2025-002', status: 'hitl_pending', color: '#3b82f6', data: { amount: 15000 } },
      { id: 'cat_1', type: 'category', name: 'Office Supplies', status: 'active', color: '#a855f7', data: {} },
      { id: 'cat_2', type: 'category', name: 'IT Equipment', status: 'active', color: '#a855f7', data: {} },
      { id: 'sup_1', type: 'supplier', name: 'Acme Corp', status: 'approved', color: '#f59e0b', data: { rating: 4.5 } },
      { id: 'status_completed', type: 'status', name: 'Completed', status: 'completed', color: '#22c55e', data: {} },
      { id: 'status_hitl', type: 'status', name: 'HITL Pending', status: 'hitl_pending', color: '#eab308', data: {} },
    ];
    
    const edges = [
      { source: 'dept_2', target: 'req_1', type: 'has_requisition' },
      { source: 'dept_1', target: 'req_2', type: 'has_requisition' },
      { source: 'req_1', target: 'cat_1', type: 'belongs_to_category' },
      { source: 'req_2', target: 'cat_2', type: 'belongs_to_category' },
      { source: 'cat_1', target: 'sup_1', type: 'supplied_by' },
      { source: 'req_1', target: 'status_completed', type: 'has_status' },
      { source: 'req_2', target: 'status_hitl', type: 'has_status' },
    ];
    
    // Filter by department if specified
    let filteredNodes = nodes;
    let filteredEdges = edges;
    
    if (department) {
      const deptNode = nodes.find(n => n.type === 'department' && n.name === department);
      if (deptNode) {
        filteredNodes = nodes.filter(n => 
          n.id === deptNode.id || 
          edges.some(e => e.source === deptNode.id && e.target === n.id)
        );
      }
    }
    
    if (statusFilter) {
      filteredNodes = nodes.filter(n => 
        n.type !== 'requisition' || n.status === statusFilter
      );
    }
    
    return HttpResponse.json({ nodes: filteredNodes, edges: filteredEdges });
  }),
];
