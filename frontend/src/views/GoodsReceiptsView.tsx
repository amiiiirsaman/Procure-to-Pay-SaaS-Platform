import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Package, CheckCircle, AlertCircle, Truck } from 'lucide-react';
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
import { getGoodsReceipts, processReceipt } from '../utils/api';
import { formatDate, formatRelativeTime } from '../utils/formatters';
import type { GoodsReceipt, GoodsReceiptFilters, GoodsReceiptStatus } from '../types';

export function GoodsReceiptsView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<GoodsReceiptFilters>({});
  const [agentResults, setAgentResults] = useState<Record<number, any>>({});
  const [selectedReceiptForModal, setSelectedReceiptForModal] = useState<GoodsReceipt | null>(null);
  const [agentLoading, setAgentLoading] = useState<number | null>(null);

  useEffect(() => {
    const poId = searchParams.get('po');
    if (poId) {
      setFilters({ purchase_order_id: parseInt(poId, 10) });
    }
  }, [searchParams]);

  useEffect(() => {
    loadReceipts();
  }, [page, filters]);

  async function loadReceipts() {
    try {
      setLoading(true);
      setError(null);
      const response = await getGoodsReceipts({
        ...filters,
        skip: (page - 1) * 20,
        limit: 20,
      });
      setReceipts(response.items);
      setTotalCount(response.total);
    } catch (err) {
      console.error('Failed to load goods receipts:', err);
      setError('Failed to load goods receipts');
    } finally {
      setLoading(false);
    }
  }

  const statusOptions: GoodsReceiptStatus[] = ['PENDING', 'COMPLETED', 'PARTIAL', 'REJECTED'];

  function getStatusIcon(status: GoodsReceiptStatus) {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="text-success-500" size={20} />;
      case 'PARTIAL':
        return <AlertCircle className="text-warning-500" size={20} />;
      case 'REJECTED':
        return <AlertCircle className="text-danger-500" size={20} />;
      default:
        return <Truck className="text-primary-500" size={20} />;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Goods Receipts</h1>
          <p className="text-surface-500">Track deliveries and receive inventory</p>
        </div>
        <button 
          onClick={() => navigate('/goods-receipts/new')}
          className="btn-primary"
        >
          <Plus size={18} />
          Record Receipt
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <select 
            className="select w-48"
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as GoodsReceiptStatus || undefined })}
          >
            <option value="">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          {filters.purchase_order_id && (
            <span className="badge-primary flex items-center gap-2">
              Filtered by PO #{filters.purchase_order_id}
              <button 
                onClick={() => setFilters({})}
                className="hover:bg-primary-300 rounded"
              >
                ×
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" className="text-primary-500" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadReceipts} />
      ) : receipts.length === 0 ? (
        <EmptyState
          icon={<Package className="w-16 h-16 text-surface-300" />}
          title="No goods receipts found"
          description="Record your first goods receipt when deliveries arrive."
          action={{
            label: 'Record Receipt',
            onClick: () => navigate('/goods-receipts/new'),
          }}
        />
      ) : (
        <>
          {/* List */}
          <div className="space-y-4">
            {receipts.map((receipt) => (
              <div 
                key={receipt.id} 
                className="card-hover cursor-pointer"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  navigate(`/goods-receipts/${receipt.id}`);
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-surface-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    {getStatusIcon(receipt.status)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-surface-900">{receipt.number}</h3>
                      <StatusBadge status={receipt.status} />
                      {agentResults[receipt.id]?.flagged && (
                        <FlagAlert reason={agentResults[receipt.id]?.flag_reason || 'Discrepancy detected'} />
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-surface-500">
                      <span>PO: {receipt.purchase_order?.number || receipt.purchase_order_id}</span>
                      <span>•</span>
                      <span>Received: {formatDate(receipt.receipt_date)}</span>
                      {receipt.delivery_note && (
                        <>
                          <span>•</span>
                          <span>DN: {receipt.delivery_note}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {receipt.status === 'PENDING' && (
                      <AgentButton
                        label="Process"
                        variant="primary"
                        size="sm"
                        loading={agentLoading === receipt.id}
                        onClick={async () => {
                          setAgentLoading(receipt.id);
                          try {
                            const result = await processReceipt(receipt.id);
                            setAgentResults({ ...agentResults, [receipt.id]: result });
                            setSelectedReceiptForModal(receipt);
                          } finally {
                            setAgentLoading(null);
                          }
                        }}
                      />
                    )}
                    <div className="text-right">
                      <p className="text-sm text-surface-500">
                        {formatRelativeTime(receipt.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {receipt.notes && (
                  <div className="mt-4 pt-4 border-t border-surface-100">
                    <p className="text-sm text-surface-600">{receipt.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-500">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, totalCount)} of {totalCount} receipts
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-secondary btn-sm"
              >
                Previous
              </button>
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
      {selectedReceiptForModal && agentResults[selectedReceiptForModal.id] && (
        <AgentResultModal
          isOpen={true}
          agentName="ReceivingAgent"
          agentLabel="Receipt Processing"
          status={agentResults[selectedReceiptForModal.id].status}
          result={agentResults[selectedReceiptForModal.id].result}
          notes={agentResults[selectedReceiptForModal.id].notes || []}
          flagged={agentResults[selectedReceiptForModal.id].flagged || false}
          flagReason={agentResults[selectedReceiptForModal.id].flag_reason}
          onClose={() => setSelectedReceiptForModal(null)}
        />
      )}
    </div>
  );
}
