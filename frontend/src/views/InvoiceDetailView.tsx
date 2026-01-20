import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Invoice, DocumentStatus } from "../types";
import { api } from "../utils/api";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  StatusBadge,
  RiskBadge,
  Modal,
  LoadingSpinner as Spinner,
  ErrorState,
  EmptyState,
} from "../components/common";
import { AgentActivityFeed } from "../components/AgentActivityFeed";
import { WorkflowTracker } from "../components/WorkflowTracker";

interface InvoiceDetailState {
  invoice: Invoice | null;
  finalApprovalReport: any | null;
  loading: boolean;
  reportLoading: boolean;
  error: string | null;
  showApprovalModal: boolean;
  approvalComments: string;
  overrideReason: string;
  submitting: boolean;
  action: "approve" | "reject" | null;
}

export const InvoiceDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<InvoiceDetailState>({
    invoice: null,
    finalApprovalReport: null,
    loading: true,
    reportLoading: false,
    error: null,
    showApprovalModal: false,
    approvalComments: "",
    overrideReason: "",
    submitting: false,
    action: null,
  });

  // WebSocket real-time updates
  const { isConnected } = useWebSocket(id || 'default');

  // Load invoice details on mount
  useEffect(() => {
    if (!id) {
      setState((prev) => ({ ...prev, error: "No Invoice ID provided" }));
      return;
    }

    const loadInvoice = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await api.get(`/invoices/${id}`);
        setState((prev) => ({ ...prev, invoice: response.data, loading: false }));
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          error: err.response?.data?.detail || "Failed to load invoice",
          loading: false,
        }));
      }
    };

    loadInvoice();
  }, [id]);

  // Load final approval report if invoice is awaiting final approval
  useEffect(() => {
    if (state.invoice && state.invoice.status === 'PENDING_APPROVAL') {
      loadApprovalReport();
    }
  }, [state.invoice]);

  const loadApprovalReport = async () => {
    if (!state.invoice) return;
    
    try {
      setState((prev) => ({ ...prev, reportLoading: true }));
      const response = await api.get(`/invoices/${state.invoice.id}/final-approval-report`);
      setState((prev) => ({
        ...prev,
        finalApprovalReport: response.data,
        reportLoading: false,
      }));
    } catch (err: any) {
      // Report loading is optional, don't fail if not available
      console.error("Failed to load approval report:", err);
      setState((prev) => ({ ...prev, reportLoading: false }));
    }
  };

  // WebSocket connection status logging  
  useEffect(() => {
    if (isConnected) {
      console.log('WebSocket connected for Invoice:', id);
    }
  }, [isConnected, id]);

  if (state.loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="container mx-auto p-6">
        <ErrorState
          title="Failed to Load Invoice"
          message={state.error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!state.invoice) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          title="Invoice Not Found"
          message="The invoice you're looking for doesn't exist."
          actionText="Back to Invoices"
          onAction={() => navigate("/invoices")}
        />
      </div>
    );
  }

  const isAwaitingApproval =
    state.invoice.status === DocumentStatus.AWAITING_FINAL_APPROVAL;
  const isFinalized = [
    DocumentStatus.FINAL_APPROVED,
    DocumentStatus.REJECTED,
    DocumentStatus.PAID,
  ].includes(state.invoice.status);

  const handleApproveReject = async (action: "approve" | "reject") => {
    if (!state.invoice) return;
    
    // Check if override reason is needed
    const needsOverride =
      action === "approve" &&
      state.finalApprovalReport &&
      ["REJECT", "REVIEW_REQUIRED"].includes(state.finalApprovalReport.recommendation);

    if (needsOverride && !state.overrideReason) {
      setState((prev) => ({
        ...prev,
        error: `Override reason required when ${action}ing against recommendation`,
      }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, submitting: true }));
      await api.post(`/invoices/${state.invoice!.id}/final-approve`, {
        action,
        approver_id: "current_user", // In production, get from auth context
        comments: state.approvalComments,
        override_reason: needsOverride ? state.overrideReason : undefined,
      });

      // Refresh invoice data
      const response = await api.get(`/invoices/${state.invoice.id}`);
      setState((prev) => ({
        ...prev,
        invoice: response.data,
        submitting: false,
        showApprovalModal: false,
        approvalComments: "",
        overrideReason: "",
        action: null,
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        error: err.response?.data?.detail || `Failed to ${action} invoice`,
        submitting: false,
      }));
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {state.invoice.number}
            </h1>
            <p className="text-gray-500 mt-2">
              From: {state.invoice.supplier?.name || "Unknown"} • Invoice #{state.invoice.vendor_invoice_number}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              ${state.invoice.total_amount?.toFixed(2) || "0.00"}
            </div>
            <StatusBadge status={state.invoice.status} className="mt-2" />
          </div>
        </div>

        {/* Workflow Tracker */}
        <WorkflowTracker
          stages={[
            { name: "Received", status: "completed" },
            {
              name: "3-Way Match",
              status: "completed",
            },
            {
              name: "Fraud Check",
              status: "completed",
            },
            {
              name: "Final Approval",
              status: isAwaitingApproval ? "current" : isFinalized ? "completed" : "pending",
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Invoice Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Supplier</p>
                <p className="font-semibold">{state.invoice.supplier?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Supplier Risk</p>
                <RiskBadge level={state.invoice.supplier?.risk_level || "low"} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Invoice Date</p>
                <p className="font-semibold">
                  {new Date(state.invoice.invoice_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Due Date</p>
                <p className="font-semibold">
                  {new Date(state.invoice.due_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">PO Reference</p>
                <p className="font-semibold">
                  {state.invoice.purchase_order?.number || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">3-Way Match</p>
                <StatusBadge status={state.invoice.match_status || "pending"} />
              </div>
            </div>
          </div>

          {/* Final Approval Report (if available) */}
          {state.finalApprovalReport && !state.reportLoading && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Final Approval Report</h2>
              
              {/* Recommendation */}
              <div
                className={`mb-6 p-4 rounded ${
                  state.finalApprovalReport.recommendation === "APPROVE"
                    ? "bg-green-50 border border-green-200"
                    : "bg-yellow-50 border border-yellow-200"
                }`}
              >
                <p className="font-bold text-sm mb-2">
                  System Recommendation: {state.finalApprovalReport.recommendation}
                </p>
                <ul className="text-sm space-y-1">
                  {state.finalApprovalReport.recommendation_reasons?.map(
                    (reason: string, idx: number) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{reason}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* 3-Way Match */}
              {state.finalApprovalReport.three_way_match && (
                <div className="mb-6">
                  <h3 className="font-bold text-sm mb-3">3-Way Match Analysis</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>PO Amount:</span>
                      <span className="font-semibold">
                        ${state.finalApprovalReport.three_way_match.po_amount?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>GR Amount:</span>
                      <span className="font-semibold">
                        ${state.finalApprovalReport.three_way_match.gr_amount?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span>Invoice Amount:</span>
                      <span className="font-bold">
                        ${state.finalApprovalReport.three_way_match.invoice_amount?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Variance:</span>
                      <span className="font-semibold">
                        ${state.finalApprovalReport.three_way_match.variance_amount?.toFixed(2)} (
                        {state.finalApprovalReport.three_way_match.variance_percentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Line Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Line Items</h2>
            {state.invoice.line_items && state.invoice.line_items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 px-2">Description</th>
                      <th className="text-center py-2 px-2">Qty</th>
                      <th className="text-right py-2 px-2">Unit Price</th>
                      <th className="text-right py-2 px-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.invoice.line_items.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">{item.description}</td>
                        <td className="text-center py-3 px-2">{item.quantity}</td>
                        <td className="text-right py-3 px-2">
                          ${item.unit_price?.toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-2">
                          ${item.total?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No line items</p>
            )}
          </div>

          {/* Actions */}
          {isAwaitingApproval && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-bold text-blue-900 mb-2">Ready for Final Approval</h3>
              <p className="text-blue-800 text-sm mb-4">
                This invoice has passed all automated checks and is ready for your final approval before payment.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setState((prev) => ({
                      ...prev,
                      showApprovalModal: true,
                      action: "approve",
                    }));
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    setState((prev) => ({
                      ...prev,
                      showApprovalModal: true,
                      action: "reject",
                    }));
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Agent Activity */}
          <AgentActivityFeed
            documentType="invoice"
            documentId={state.invoice.id}
            maxItems={5}
          />

          {/* Quick Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold mb-4">Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <StatusBadge status={state.invoice.status} />
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">
                  ${state.invoice.subtotal?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span className="font-semibold">
                  ${state.invoice.tax_amount?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-lg">
                  ${state.invoice.total_amount?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      <Modal
        isOpen={state.showApprovalModal}
        onClose={() => setState((prev) => ({ ...prev, showApprovalModal: false }))}
        title={`${state.action === "approve" ? "Approve" : "Reject"} Invoice`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Comments</label>
            <textarea
              value={state.approvalComments}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  approvalComments: e.target.value,
                }))
              }
              rows={4}
              className="w-full border rounded px-3 py-2"
              placeholder="Enter your comments..."
            />
          </div>

          {state.action === "approve" &&
            state.finalApprovalReport &&
            ["REJECT", "REVIEW_REQUIRED"].includes(
              state.finalApprovalReport.recommendation
            ) && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Override Reason (Required)
                </label>
                <textarea
                  value={state.overrideReason}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      overrideReason: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Explain why you're overriding the system recommendation..."
                />
              </div>
            )}

          {state.error && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded p-3">
              {state.error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              onClick={() =>
                setState((prev) => ({ ...prev, showApprovalModal: false }))
              }
              className="px-4 py-2 text-gray-700 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => handleApproveReject(state.action!)}
              disabled={state.submitting}
              className={`px-4 py-2 rounded text-white ${
                state.action === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              } disabled:opacity-50`}
            >
              {state.submitting
                ? "Processing..."
                : state.action === "approve"
                ? "Approve"
                : "Reject"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InvoiceDetailView;
