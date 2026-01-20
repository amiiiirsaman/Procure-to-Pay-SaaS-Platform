import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { PurchaseOrder, DocumentStatus } from "../types";
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

interface PODetailState {
  po: PurchaseOrder | null;
  loading: boolean;
  error: string | null;
  showApprovalModal: boolean;
  approvalComments: string;
  submitting: boolean;
}

export const PODetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<PODetailState>({
    po: null,
    loading: true,
    error: null,
    showApprovalModal: false,
    approvalComments: "",
    submitting: false,
  });

  // WebSocket real-time updates
  const { isConnected } = useWebSocket(id || 'default');

  // Load PO details on mount
  useEffect(() => {
    if (!id) {
      setState((prev) => ({ ...prev, error: "No PO ID provided" }));
      return;
    }

    const loadPO = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await api.get(`/purchase-orders/${id}`);
        setState((prev) => ({ ...prev, po: response.data, loading: false }));
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          error: err.response?.data?.detail || "Failed to load PO",
          loading: false,
        }));
      }
    };

    loadPO();
  }, [id]);

  // WebSocket connection status logging
  useEffect(() => {
    if (isConnected) {
      console.log('WebSocket connected for PO:', id);
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
          title="Failed to Load PO"
          message={state.error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!state.po) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          title="PO Not Found"
          message="The purchase order you're looking for doesn't exist."
          actionText="Back to POs"
          onAction={() => navigate("/purchase-orders")}
        />
      </div>
    );
  }

  const canSend = state.po.status === 'APPROVED';
  const isSent = (
    ['ORDERED', 'RECEIVED', 'INVOICED', 'PAID'] as DocumentStatus[]
  ).includes(state.po.status);

  const handleSendPO = async () => {
    if (!state.po) return;
    
    try {
      setState((prev) => ({ ...prev, submitting: true }));
      await api.post(`/purchase-orders/${state.po!.id}/send`);
      
      // Refresh PO data
      const response = await api.get(`/purchase-orders/${state.po.id}`);
      setState((prev) => ({
        ...prev,
        po: response.data,
        submitting: false,
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        error: err.response?.data?.detail || "Failed to send PO",
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
              {state.po.number}
            </h1>
            <p className="text-gray-500 mt-2">
              Vendor: {state.po.supplier?.name || "Unknown"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              ${state.po.total_amount?.toFixed(2) || "0.00"}
            </div>
            <StatusBadge status={state.po.status} className="mt-2" />
          </div>
        </div>

        {/* Workflow Tracker */}
        <WorkflowTracker
          stages={[
            { name: "Created", status: "completed" },
            {
              name: "Approved",
              status:
                state.po.status === DocumentStatus.APPROVED ? "current" : "completed",
            },
            {
              name: "Sent",
              status:
                state.po.status === DocumentStatus.ORDERED
                  ? "current"
                  : isSent
                  ? "completed"
                  : "pending",
            },
            {
              name: "Received",
              status:
                state.po.status === DocumentStatus.RECEIVED
                  ? "completed"
                  : "pending",
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* PO Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Purchase Order Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Supplier</p>
                <p className="font-semibold">{state.po.supplier?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Supplier Risk</p>
                <RiskBadge level={state.po.supplier?.risk_level || "low"} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Requisition</p>
                <p className="font-semibold">
                  {state.po.requisition?.number || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <StatusBadge status={state.po.status} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Expected Delivery</p>
                <p className="font-semibold">
                  {state.po.expected_delivery_date
                    ? new Date(state.po.expected_delivery_date).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Terms</p>
                <p className="font-semibold">{state.po.payment_terms || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Line Items</h2>
            {state.po.line_items && state.po.line_items.length > 0 ? (
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
                    {state.po.line_items.map((item, idx) => (
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
          {canSend && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-bold text-blue-900 mb-2">Ready to Send</h3>
              <p className="text-blue-800 text-sm mb-4">
                This purchase order has been approved and is ready to be sent to the supplier.
              </p>
              <button
                onClick={handleSendPO}
                disabled={state.submitting}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {state.submitting ? "Sending..." : "Send to Supplier"}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Agent Activity */}
          <AgentActivityFeed
            documentType="po"
            documentId={state.po.id}
            maxItems={5}
          />

          {/* Quick Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold mb-4">Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-semibold">
                  {new Date(state.po.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Buyer:</span>
                <span className="font-semibold">{state.po.buyer?.name || "Unknown"}</span>
              </div>
              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">
                  ${state.po.subtotal?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-lg">
                  ${state.po.total_amount?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PODetailView;
