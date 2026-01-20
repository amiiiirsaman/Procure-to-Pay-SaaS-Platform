import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { GoodsReceipt, DocumentStatus } from "../types";
import { api } from "../utils/api";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  StatusBadge,
  LoadingSpinner as Spinner,
  ErrorState,
  EmptyState,
} from "../components/common";
import { AgentActivityFeed } from "../components/AgentActivityFeed";
import { WorkflowTracker } from "../components/WorkflowTracker";

interface GRDetailState {
  gr: GoodsReceipt | null;
  loading: boolean;
  error: string | null;
}

export const GoodsReceiptDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<GRDetailState>({
    gr: null,
    loading: true,
    error: null,
  });

  // WebSocket real-time updates
  const { isConnected } = useWebSocket(id ? `workflow_gr_${id}` : null);

  // Load GR details on mount
  useEffect(() => {
    if (!id) {
      setState((prev) => ({ ...prev, error: "No Receipt ID provided" }));
      return;
    }

    const loadGR = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await api.get(`/goods-receipts/${id}`);
        setState((prev) => ({ ...prev, gr: response.data, loading: false }));
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          error: err.response?.data?.detail || "Failed to load goods receipt",
          loading: false,
        }));
      }
    };

    loadGR();
  }, [id]);

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
          title="Failed to Load Goods Receipt"
          message={state.error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (!state.gr) {
    return (
      <div className="container mx-auto p-6">
        <EmptyState
          title="Goods Receipt Not Found"
          message="The goods receipt you're looking for doesn't exist."
          actionText="Back to Receipts"
          onAction={() => navigate("/goods-receipts")}
        />
      </div>
    );
  }

  const hasRejections = state.gr.line_items?.some(
    (item) => (item.quantity_rejected || 0) > 0
  );

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {state.gr.number}
            </h1>
            <p className="text-gray-500 mt-2">
              For PO: {state.gr.purchase_order?.number || "Unknown"}
            </p>
          </div>
          <div className="text-right">
            <StatusBadge
              status={state.gr.purchase_order?.status || "pending"}
              className="mt-2"
            />
            <p className="text-sm text-gray-500 mt-2">
              Received: {new Date(state.gr.received_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Workflow Tracker */}
        <WorkflowTracker
          stages={[
            { name: "PO Sent", status: "completed" },
            {
              name: "In Transit",
              status: state.gr.carrier ? "completed" : "pending",
            },
            {
              name: "Delivered",
              status: "completed",
            },
            {
              name: "Inspected",
              status: hasRejections ? "warning" : "completed",
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Receipt Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Receipt Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Purchase Order</p>
                <p className="font-semibold">
                  {state.gr.purchase_order?.number || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Received By</p>
                <p className="font-semibold">
                  {state.gr.received_by?.name || "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Carrier</p>
                <p className="font-semibold">{state.gr.carrier || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tracking Number</p>
                <p className="font-semibold">
                  {state.gr.tracking_number || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Received Date</p>
                <p className="font-semibold">
                  {new Date(state.gr.received_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Delivery Note</p>
                <p className="font-semibold">{state.gr.delivery_note || "None"}</p>
              </div>
            </div>
          </div>

          {/* Line Items with Rejection Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Received Items</h2>
            {state.gr.line_items && state.gr.line_items.length > 0 ? (
              <div className="space-y-4">
                {state.gr.line_items.map((item, idx) => {
                  const hasRejection = (item.quantity_rejected || 0) > 0;
                  return (
                    <div
                      key={idx}
                      className={`border rounded p-4 ${
                        hasRejection ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold">
                            Line {item.po_line_item?.line_number}: {item.po_line_item?.description}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Storage Location: {item.storage_location || "Not specified"}
                          </p>
                        </div>
                        <div className="text-right">
                          {hasRejection ? (
                            <span className="text-red-700 font-bold text-sm">
                              ⚠ PARTIAL RECEIPT
                            </span>
                          ) : (
                            <span className="text-green-700 font-bold text-sm">
                              ✓ ACCEPTED
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Ordered</p>
                          <p className="font-bold">
                            {item.po_line_item?.quantity || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Received</p>
                          <p className="font-bold text-green-700">
                            {item.quantity_received || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Rejected</p>
                          <p className={`font-bold ${hasRejection ? "text-red-700" : "text-gray-600"}`}>
                            {item.quantity_rejected || 0}
                          </p>
                        </div>
                      </div>

                      {hasRejection && (
                        <div className="mt-3 p-3 bg-red-100 rounded border border-red-300">
                          <p className="text-sm font-bold text-red-900">Rejection Reason:</p>
                          <p className="text-sm text-red-800 mt-1">
                            {item.rejection_reason || "No reason provided"}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No line items</p>
            )}
          </div>

          {/* Status and Next Steps */}
          <div
            className={`rounded-lg p-6 ${
              hasRejections
                ? "bg-yellow-50 border border-yellow-200"
                : "bg-green-50 border border-green-200"
            }`}
          >
            <h3 className={`font-bold mb-2 ${hasRejections ? "text-yellow-900" : "text-green-900"}`}>
              {hasRejections
                ? "Partial Receipt - Action Required"
                : "Full Receipt - Ready for Invoice"}
            </h3>
            <p className={`text-sm mb-4 ${hasRejections ? "text-yellow-800" : "text-green-800"}`}>
              {hasRejections
                ? "Some items were rejected. Please follow up with the supplier regarding replacement shipment."
                : "All items have been received and accepted. You can now proceed to invoice reconciliation."}
            </p>
            {!hasRejections && (
              <button
                onClick={() => navigate(`/invoices?po_id=${state.gr.purchase_order?.id}`)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Proceed to Invoice
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Agent Activity */}
          <AgentActivityFeed
            documentType="receipt"
            documentId={state.gr.id}
            maxItems={5}
          />

          {/* Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold mb-4">Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Items Ordered:</span>
                <span className="font-semibold">
                  {state.gr.line_items?.reduce(
                    (sum, item) => sum + (item.po_line_item?.quantity || 0),
                    0
                  ) || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Items Received:</span>
                <span className="font-bold text-green-700">
                  {state.gr.line_items?.reduce(
                    (sum, item) => sum + (item.quantity_received || 0),
                    0
                  ) || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Items Rejected:</span>
                <span className={`font-bold ${hasRejections ? "text-red-700" : "text-gray-600"}`}>
                  {state.gr.line_items?.reduce(
                    (sum, item) => sum + (item.quantity_rejected || 0),
                    0
                  ) || 0}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="text-gray-600">Receipt Status:</span>
                <span className="font-bold">
                  {hasRejections ? "Partial" : "Complete"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold mb-4">Related Documents</h3>
            <div className="space-y-2">
              <a
                href={`/purchase-orders/${state.gr.purchase_order?.id}`}
                className="block text-blue-600 hover:underline text-sm"
              >
                → View Purchase Order
              </a>
              {state.gr.purchase_order?.requisition && (
                <a
                  href={`/requisitions/${state.gr.purchase_order.requisition.id}`}
                  className="block text-blue-600 hover:underline text-sm"
                >
                  → View Requisition
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoodsReceiptDetailView;
