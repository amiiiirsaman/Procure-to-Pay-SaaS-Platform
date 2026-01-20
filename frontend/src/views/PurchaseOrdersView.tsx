import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, Search, Eye, Package, Truck } from 'lucide-react';
import { 
  StatusBadge, 
  LoadingSpinner, 
  ErrorState, 
  EmptyState,
} from '../components/common';
import { 
  AgentButton, 
  AgentResultModal, 
  FlagAlert 
} from '../components/agents';
import { getPurchaseOrders, analyzeFraud, checkCompliance } from '../utils/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { PurchaseOrder, POFilters, DocumentStatus } from '../types';

export function PurchaseOrdersView() {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<POFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [agentResults, setAgentResults] = useState<Record<number, any>>({});
  const [selectedPOForModal, setSelectedPOForModal] = useState<PurchaseOrder | null>(null);
  const [agentLoading, setAgentLoading] = useState<number | null>(null);
  useEffect(() => {
    loadPurchaseOrders();
  }, [page, filters]);

  async function loadPurchaseOrders() {
    try {
      setLoading(true);
      setError(null);
      const response = await getPurchaseOrders({
        ...filters,
        search: searchQuery || undefined,
        skip: (page - 1) * 20,
        limit: 20,
      });
      setPurchaseOrders(response.items);
      setTotalCount(response.total);
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
      setError('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadPurchaseOrders();
  }

  const statusOptions: DocumentStatus[] = [
    'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'RECEIVED', 'INVOICED', 'PAID', 'CANCELLED'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Purchase Orders</h1>
          <p className="text-surface-500">Manage purchase orders and track deliveries</p>
        </div>
        <button 
          onClick={() => navigate('/purchase-orders/new')}
          className="btn-primary"
        >
          <Plus size={18} />
          New PO
        </button>
      </div>

      {/* Search & Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={18} />
            <input
              type="text"
              placeholder="Search POs by number, supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </form>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'bg-surface-200' : ''}`}
          >
            <Filter size={18} />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-surface-200">
            <div>
              <label className="label">Status</label>
              <select 
                className="select"
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as DocumentStatus || undefined })}
              >
                <option value="">All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date From</label>
              <input
                type="date"
                className="input"
                value={filters.date_from || ''}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined })}
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={() => setFilters({})}
                className="btn-ghost"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" className="text-primary-500" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadPurchaseOrders} />
      ) : purchaseOrders.length === 0 ? (
        <EmptyState
          title="No purchase orders found"
          description="Create your first purchase order or convert a requisition."
          action={{
            label: 'Create Purchase Order',
            onClick: () => navigate('/purchase-orders/new'),
          }}
        />
      ) : (
        <>
          {/* Table */}
          <div className="table-container bg-white">
            <table className="table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Order Date</th>
                  <th>Expected Delivery</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr key={po.id}>
                    <td>
                      <span className="font-mono text-primary-600">{po.number}</span>
                      {po.requisition_id && (
                        <p className="text-xs text-surface-500">From REQ</p>
                      )}
                    </td>
                    <td>
                      <p className="font-medium text-surface-900">
                        {po.supplier?.name || po.supplier_id}
                      </p>
                    </td>
                    <td>
                      <StatusBadge status={po.status} />
                    </td>
                    <td>
                      <span className="text-sm text-surface-600">{formatDate(po.order_date)}</span>
                    </td>
                    <td>
                      {po.expected_delivery_date ? (
                        <span className="text-sm text-surface-600">
                          {formatDate(po.expected_delivery_date)}
                        </span>
                      ) : (
                        <span className="text-sm text-surface-400">-</span>
                      )}
                    </td>
                    <td>
                      <span className="font-medium text-surface-900">
                        {formatCurrency(po.total_amount, po.currency)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/purchase-orders/${po.id}`)}
                          className="btn-icon btn-ghost"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <AgentButton
                          label="Check Fraud"
                          variant="ghost"
                          size="sm"
                          loading={agentLoading === po.id}
                          onClick={async () => {
                            setAgentLoading(po.id);
                            try {
                              const result = await analyzeFraud(po.id);
                              setAgentResults({ ...agentResults, [po.id]: result });
                              setSelectedPOForModal(po);
                            } finally {
                              setAgentLoading(null);
                            }
                          }}
                        />
                        {(po.status === 'ORDERED' || po.status === 'APPROVED') && (
                          <button
                            onClick={() => navigate(`/goods-receipts/new?po=${po.id}`)}
                            className="btn-icon btn-ghost text-success-600"
                            title="Receive Goods"
                          >
                            <Truck size={16} />
                          </button>
                        )}
                        {agentResults[po.id]?.flagged && (
                          <FlagAlert reason={agentResults[po.id]?.flag_reason || 'Flagged for review'} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-500">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, totalCount)} of {totalCount} POs
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-secondary btn-sm"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-surface-600">
                Page {page} of {Math.ceil(totalCount / 20) || 1}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(totalCount / 20)}
                className="btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* Agent Result Modal */}
      {selectedPOForModal && agentResults[selectedPOForModal.id] && (
        <AgentResultModal
          isOpen={true}
          agentName="FraudAnalysisAgent"
          agentLabel="Fraud Analysis"
          status={agentResults[selectedPOForModal.id].status}
          result={agentResults[selectedPOForModal.id].result}
          notes={agentResults[selectedPOForModal.id].notes || []}
          flagged={agentResults[selectedPOForModal.id].flagged || false}
          flagReason={agentResults[selectedPOForModal.id].flag_reason}
          onClose={() => setSelectedPOForModal(null)}
        />
      )}
    </div>
  );
}
