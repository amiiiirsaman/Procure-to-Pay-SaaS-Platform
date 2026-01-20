import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Filter, Search, Eye, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { 
  StatusBadge, 
  RiskBadge,
  MatchBadge,
  LoadingSpinner, 
  ErrorState, 
  EmptyState,
} from '../components/common';
import { 
  AgentButton, 
  AgentResultModal, 
  FlagAlert 
} from '../components/agents';
import { getInvoices, validateInvoice, analyzeFraud, checkCompliance } from '../utils/api';
import { formatCurrency, formatDate, isOverdue } from '../utils/formatters';
import type { Invoice, InvoiceFilters, DocumentStatus, RiskLevel, MatchStatus } from '../types';

export function InvoicesView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<InvoiceFilters>(() => {
    const initial: InvoiceFilters = {};
    if (searchParams.get('overdue') === 'true') initial.overdue_only = true;
    if (searchParams.get('risk') === 'high') initial.risk_level = 'HIGH';
    return initial;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [agentResults, setAgentResults] = useState<Record<number, any>>({});
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<Invoice | null>(null);
  const [agentLoading, setAgentLoading] = useState<number | null>(null);
  const [activeAgentType, setActiveAgentType] = useState<string>('validate');

  useEffect(() => {
    loadInvoices();
  }, [page, filters]);

  async function loadInvoices() {
    try {
      setLoading(true);
      setError(null);
      const response = await getInvoices({
        ...filters,
        search: searchQuery || undefined,
        skip: (page - 1) * 20,
        limit: 20,
      });
      setInvoices(response.items);
      setTotalCount(response.total);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadInvoices();
  }

  const statusOptions: DocumentStatus[] = [
    'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'
  ];

  const riskOptions: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const matchOptions: MatchStatus[] = ['PENDING', 'MATCHED', 'PARTIAL', 'EXCEPTION'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Invoices</h1>
          <p className="text-surface-500">Process and manage vendor invoices</p>
        </div>
        <button 
          onClick={() => navigate('/invoices/new')}
          className="btn-primary"
        >
          <Plus size={18} />
          New Invoice
        </button>
      </div>

      {/* Search & Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={18} />
            <input
              type="text"
              placeholder="Search invoices by number, vendor..."
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-surface-200">
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
              <label className="label">Match Status</label>
              <select 
                className="select"
                value={filters.match_status || ''}
                onChange={(e) => setFilters({ ...filters, match_status: e.target.value as MatchStatus || undefined })}
              >
                <option value="">All</option>
                {matchOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Risk Level</label>
              <select 
                className="select"
                value={filters.risk_level || ''}
                onChange={(e) => setFilters({ ...filters, risk_level: e.target.value as RiskLevel || undefined })}
              >
                <option value="">All</option>
                {riskOptions.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Overdue Only</label>
              <div className="flex items-center h-10">
                <input
                  type="checkbox"
                  checked={filters.overdue_only || false}
                  onChange={(e) => setFilters({ ...filters, overdue_only: e.target.checked || undefined })}
                  className="checkbox"
                />
                <span className="ml-2 text-sm text-surface-600">Show overdue</span>
              </div>
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
        <ErrorState message={error} onRetry={loadInvoices} />
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description="Upload or create invoices to get started."
          action={{
            label: 'Create Invoice',
            onClick: () => navigate('/invoices/new'),
          }}
        />
      ) : (
        <>
          {/* Table */}
          <div className="table-container bg-white">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Vendor Invoice</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Match</th>
                  <th>Risk</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className={inv.is_duplicate ? 'bg-danger-50' : ''}>
                    <td>
                      <span className="font-mono text-primary-600">{inv.number}</span>
                      {inv.is_duplicate && (
                        <span className="ml-2 badge-danger">Duplicate</span>
                      )}
                    </td>
                    <td>
                      <span className="text-sm text-surface-600">{inv.vendor_invoice_number}</span>
                    </td>
                    <td>
                      <p className="font-medium text-surface-900">
                        {inv.supplier?.name || inv.supplier_id}
                      </p>
                    </td>
                    <td>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td>
                      <MatchBadge status={inv.match_status} />
                    </td>
                    <td>
                      <RiskBadge level={inv.risk_level} />
                    </td>
                    <td>
                      <span className="font-medium text-surface-900">
                        {formatCurrency(inv.total_amount, inv.currency)}
                      </span>
                    </td>
                    <td>
                      <span className={`text-sm ${isOverdue(inv.due_date) && inv.status !== 'PAID' ? 'text-danger-600 font-medium' : 'text-surface-600'}`}>
                        {formatDate(inv.due_date)}
                        {isOverdue(inv.due_date) && inv.status !== 'PAID' && (
                          <AlertTriangle className="inline ml-1" size={14} />
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          className="btn-icon btn-ghost"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <AgentButton
                          label="Validate"
                          variant="ghost"
                          size="sm"
                          loading={agentLoading === inv.id && activeAgentType === 'validate'}
                          onClick={async () => {
                            setAgentLoading(inv.id);
                            setActiveAgentType('validate');
                            try {
                              const result = await validateInvoice(inv.id);
                              setAgentResults({ ...agentResults, [inv.id]: { ...result, type: 'validate' } });
                              setSelectedInvoiceForModal(inv);
                            } finally {
                              setAgentLoading(null);
                            }
                          }}
                        />
                        <AgentButton
                          label="Fraud"
                          variant="ghost"
                          size="sm"
                          loading={agentLoading === inv.id && activeAgentType === 'fraud'}
                          onClick={async () => {
                            setAgentLoading(inv.id);
                            setActiveAgentType('fraud');
                            try {
                              const result = await analyzeFraud(inv.id);
                              setAgentResults({ ...agentResults, [inv.id]: { ...result, type: 'fraud' } });
                              setSelectedInvoiceForModal(inv);
                            } finally {
                              setAgentLoading(null);
                            }
                          }}
                        />
                        {inv.requires_review && (
                          <button
                            className="btn-icon btn-ghost text-warning-600"
                            title="Requires Review"
                          >
                            <AlertTriangle size={16} />
                          </button>
                        )}
                        {agentResults[inv.id]?.flagged && (
                          <FlagAlert reason={agentResults[inv.id]?.flag_reason || 'Flagged for review'} />
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
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, totalCount)} of {totalCount} invoices
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
      {selectedInvoiceForModal && agentResults[selectedInvoiceForModal.id] && (
        <AgentResultModal
          isOpen={true}
          agentName={agentResults[selectedInvoiceForModal.id].type === 'fraud' ? 'FraudAnalysisAgent' : 'InvoiceValidationAgent'}
          agentLabel={agentResults[selectedInvoiceForModal.id].type === 'fraud' ? 'Fraud Analysis' : 'Invoice Validation'}
          status={agentResults[selectedInvoiceForModal.id].status}
          result={agentResults[selectedInvoiceForModal.id].result}
          notes={agentResults[selectedInvoiceForModal.id].notes || []}
          flagged={agentResults[selectedInvoiceForModal.id].flagged || false}
          flagReason={agentResults[selectedInvoiceForModal.id].flag_reason}
          onClose={() => setSelectedInvoiceForModal(null)}
        />
      )}
    </div>
  );
}
