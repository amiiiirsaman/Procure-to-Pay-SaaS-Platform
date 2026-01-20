import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, Search, Eye, Edit, Send, X, Circle } from 'lucide-react';
import { 
  StatusBadge, 
  UrgencyBadge, 
  LoadingSpinner, 
  ErrorState, 
  EmptyState,
  Modal,
} from '../components/common';
import { 
  AgentButton, 
  AgentResultModal, 
  FlagAlert 
} from '../components/agents';
import { getRequisitions, submitRequisition, cancelRequisition, validateRequisition } from '../utils/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { Requisition, RequisitionFilters, DocumentStatus, Department, Urgency } from '../types';
import {
  getStepName,
  getStatusColor,
  getStatusDisplayText,
  parseStepFromStage,
  calculateWorkflowStatus,
  getStepCircleColor,
} from '../constants/workflow';

export function RequisitionsView() {
  const navigate = useNavigate();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<RequisitionFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [agentResults, setAgentResults] = useState<Record<number, any>>({});
  const [selectedReqForModal, setSelectedReqForModal] = useState<Requisition | null>(null);

  useEffect(() => {
    loadRequisitions();
  }, [page, filters]);

  async function loadRequisitions() {
    try {
      setLoading(true);
      setError(null);
      const response = await getRequisitions({
        ...filters,
        search: searchQuery || undefined,
        skip: (page - 1) * 20,
        limit: 20,
      });
      setRequisitions(response.items);
      setTotalCount(response.total);
    } catch (err) {
      console.error('Failed to load requisitions:', err);
      setError('Failed to load requisitions');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(id: number) {
    try {
      await submitRequisition(id);
      loadRequisitions();
    } catch (err) {
      console.error('Failed to submit requisition:', err);
    }
  }

  async function handleCancel(id: number) {
    try {
      await cancelRequisition(id);
      loadRequisitions();
    } catch (err) {
      console.error('Failed to cancel requisition:', err);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadRequisitions();
  }

  const statusOptions: DocumentStatus[] = [
    'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ORDERED', 'CANCELLED'
  ];

  const departmentOptions: Department[] = [
    'IT', 'Finance', 'Operations', 'HR', 'Marketing', 'Facilities', 'Legal', 'Engineering', 'Sales', 'Procurement'
  ];

  const urgencyOptions: Urgency[] = ['STANDARD', 'URGENT', 'EMERGENCY'];

  // Workflow step names and status helpers are imported from '../constants/workflow'
  // Helper to get step number from requisition
  const getReqStep = (req: Requisition): number => parseStepFromStage(req.current_stage);
  
  // Helper to get workflow status from requisition
  const getReqWorkflowStatus = (req: Requisition): string => {
    const isRejected = req.status === 'REJECTED' || req.current_stage?.includes('rejected');
    return calculateWorkflowStatus(req.current_stage, req.flagged_by, isRejected);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Requisitions</h1>
          <p className="text-surface-500">Manage purchase requisitions</p>
        </div>
        <button 
          onClick={() => navigate('/requisitions/new')}
          className="btn-primary"
        >
          <Plus size={18} />
          New Requisition
        </button>
      </div>

      {/* Search & Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={18} />
            <input
              type="text"
              placeholder="Search requisitions by number, title, or requester..."
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

        {/* Filter Panel */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-surface-200">
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
              <label className="label">Department</label>
              <select 
                className="select"
                value={filters.department || ''}
                onChange={(e) => setFilters({ ...filters, department: e.target.value as Department || undefined })}
              >
                <option value="">All Departments</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Urgency</label>
              <select 
                className="select"
                value={filters.urgency || ''}
                onChange={(e) => setFilters({ ...filters, urgency: e.target.value as Urgency || undefined })}
              >
                <option value="">All Urgencies</option>
                {urgencyOptions.map((urgency) => (
                  <option key={urgency} value={urgency}>{urgency}</option>
                ))}
              </select>
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
        <ErrorState message={error} onRetry={loadRequisitions} />
      ) : requisitions.length === 0 ? (
        <EmptyState
          title="No requisitions found"
          description="Create your first requisition to get started."
          action={{
            label: 'Create Requisition',
            onClick: () => navigate('/requisitions/new'),
          }}
        />
      ) : (
        <>
          {/* Table */}
          <div className="table-container bg-white">
            <table className="table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Step</th>
                  <th>Workflow</th>
                  <th>Department</th>
                  <th>Urgency</th>
                  <th>Amount</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <span className="font-mono text-primary-600">{req.number}</span>
                    </td>
                    <td>
                      <div>
                        <p className="font-medium text-surface-900 truncate max-w-xs">{req.title}</p>
                        {req.description && (
                          <p className="text-sm text-surface-500 truncate max-w-xs">{req.description}</p>
                        )}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={req.status} />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={`relative inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                          getReqWorkflowStatus(req) === 'completed' ? 'bg-green-100 text-green-700' :
                          getReqWorkflowStatus(req) === 'rejected' ? 'bg-red-100 text-red-700' :
                          getReqWorkflowStatus(req) === 'hitl_pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {getReqStep(req)}
                        </div>
                        <span className="text-xs text-surface-600 max-w-[100px] truncate" title={getStepName(getReqStep(req))}>
                          {getStepName(getReqStep(req))}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(getReqWorkflowStatus(req))}`}>
                        {getStatusDisplayText(getReqWorkflowStatus(req))}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-surface-600">{req.department}</span>
                    </td>
                    <td>
                      <UrgencyBadge urgency={req.urgency} />
                    </td>
                    <td>
                      <span className="font-medium text-surface-900">
                        {formatCurrency(req.total_amount, req.currency)}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-surface-500">{formatDate(req.created_at)}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/requisitions/${req.id}`)}
                          className="btn-icon btn-ghost"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        {req.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => navigate(`/requisitions/${req.id}/edit`)}
                              className="btn-icon btn-ghost"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => {
                                const result = validateRequisition(req.id);
                                result.then(res => {
                                  setAgentResults({ ...agentResults, [req.id]: res });
                                  setSelectedReqForModal(req);
                                });
                              }}
                              className="btn-icon btn-ghost text-blue-600 hover:bg-blue-50"
                              title="Validate with Agent"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleSubmit(req.id)}
                              className="btn-icon btn-ghost text-success-600"
                              title="Submit for Approval"
                            >
                              <Send size={16} />
                            </button>
                            <button
                              onClick={() => handleCancel(req.id)}
                              className="btn-icon btn-ghost text-danger-600"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => navigate(`/automation?requisition=${req.id}`)}
                          className="btn-sm btn-primary"
                          title="Go to Automation"
                        >
                          Go to Automation
                        </button>
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
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, totalCount)} of {totalCount} requisitions
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
      {selectedReqForModal && agentResults[selectedReqForModal.id] && (
        <AgentResultModal
          isOpen={true}
          agentName="RequisitionAgent"
          agentLabel="Requisition Validation"
          status={agentResults[selectedReqForModal.id].status}
          result={agentResults[selectedReqForModal.id].result}
          notes={agentResults[selectedReqForModal.id].notes || []}
          flagged={agentResults[selectedReqForModal.id].flagged || false}
          flagReason={agentResults[selectedReqForModal.id].flag_reason}
          onClose={() => setSelectedReqForModal(null)}
        />
      )}
    </div>
  );
}
