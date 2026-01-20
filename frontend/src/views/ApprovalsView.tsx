import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Users, Clock, FileText, ShoppingCart, Receipt } from 'lucide-react';
import { 
  StatusBadge,
  ApprovalBadge,
  LoadingSpinner, 
  ErrorState, 
  EmptyState,
  Modal,
} from '../components/common';
import { 
  AgentButton, 
  AgentResultModal, 
  RecommendationsList 
} from '../components/agents';
import { getPendingApprovals, processApproval, determineApprovalChain } from '../utils/api';
import { formatCurrency, formatDate, formatRelativeTime } from '../utils/formatters';
import type { ApprovalStep, ApprovalActionData } from '../types';

export function ApprovalsView() {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState<ApprovalStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalStep | null>(null);
  const [actionModal, setActionModal] = useState<'approve' | 'reject' | 'delegate' | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [delegateUserId, setDelegateUserId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [agentResults, setAgentResults] = useState<Record<number, any>>({});
  const [selectedApprovalForModal, setSelectedApprovalForModal] = useState<ApprovalStep | null>(null);
  const [agentLoading, setAgentLoading] = useState<number | null>(null);

  // Mock current user ID
  const currentUserId = 'current-user-id';

  useEffect(() => {
    loadApprovals();
  }, []);

  async function loadApprovals() {
    try {
      setLoading(true);
      setError(null);
      const data = await getPendingApprovals(currentUserId);
      setApprovals(data);
    } catch (err) {
      console.error('Failed to load approvals:', err);
      setError('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: 'approve' | 'reject' | 'delegate') {
    if (!selectedApproval) return;

    try {
      setProcessing(true);
      const actionData: ApprovalActionData = {
        action,
        comments: actionComment || undefined,
        delegate_to_id: action === 'delegate' ? delegateUserId : undefined,
      };
      await processApproval(selectedApproval.id, actionData);
      setActionModal(null);
      setSelectedApproval(null);
      setActionComment('');
      setDelegateUserId('');
      loadApprovals();
    } catch (err) {
      console.error('Failed to process approval:', err);
    } finally {
      setProcessing(false);
    }
  }

  function getEntityIcon(step: ApprovalStep) {
    if (step.requisition_id) return <FileText size={20} />;
    if (step.purchase_order_id) return <ShoppingCart size={20} />;
    if (step.invoice_id) return <Receipt size={20} />;
    return <FileText size={20} />;
  }

  function getEntityType(step: ApprovalStep): string {
    if (step.requisition_id) return 'Requisition';
    if (step.purchase_order_id) return 'Purchase Order';
    if (step.invoice_id) return 'Invoice';
    return 'Document';
  }

  function getEntityId(step: ApprovalStep): number {
    return step.requisition_id || step.purchase_order_id || step.invoice_id || 0;
  }

  function navigateToEntity(step: ApprovalStep) {
    if (step.requisition_id) navigate(`/requisitions/${step.requisition_id}`);
    else if (step.purchase_order_id) navigate(`/purchase-orders/${step.purchase_order_id}`);
    else if (step.invoice_id) navigate(`/invoices/${step.invoice_id}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Pending Approvals</h1>
        <p className="text-surface-500">Review and approve requisitions, POs, and invoices</p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" className="text-primary-500" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadApprovals} />
      ) : approvals.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="w-16 h-16 text-success-300" />}
          title="All caught up!"
          description="You have no pending approvals at this time."
        />
      ) : (
        <div className="space-y-4">
          {approvals.map((step) => (
            <div key={step.id} className="card-hover">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  {getEntityIcon(step)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-surface-900">
                      {getEntityType(step)} #{getEntityId(step)}
                    </h3>
                    <ApprovalBadge status={step.status} />
                  </div>
                  <p className="text-sm text-surface-500 mt-1">
                    Step {step.step_number} • {step.approver_role}
                    {step.required_for_amount && (
                      <span> • Required for amounts over {formatCurrency(step.required_for_amount)}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-surface-500">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatRelativeTime(step.created_at)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateToEntity(step)}
                    className="btn-secondary btn-sm"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => {
                      setSelectedApproval(step);
                      setActionModal('approve');
                    }}
                    className="btn-success btn-sm"
                  >
                    <CheckCircle size={16} />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setSelectedApproval(step);
                      setActionModal('reject');
                    }}
                    className="btn-danger btn-sm"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      setSelectedApproval(step);
                      setActionModal('delegate');
                    }}
                    className="btn-ghost btn-sm"
                  >
                    <Users size={16} />
                    Delegate
                  </button>
                  <AgentButton
                    label="Analyze"
                    variant="secondary"
                    size="sm"
                    loading={agentLoading === step.id}
                    onClick={async () => {
                      setAgentLoading(step.id);
                      try {
                        const result = await determineApprovalChain(step.id);
                        setAgentResults({ ...agentResults, [step.id]: result });
                        setSelectedApprovalForModal(step);
                      } finally {
                        setAgentLoading(null);
                      }
                    }}
                  />
                </div>

                {/* Agent Recommendations */}
                {agentResults[step.id]?.recommendations && agentResults[step.id].recommendations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-surface-200">
                    <RecommendationsList 
                      recommendations={agentResults[step.id].recommendations} 
                      title="Agent Recommendations"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      <Modal
        isOpen={actionModal === 'approve'}
        onClose={() => setActionModal(null)}
        title="Approve"
        footer={
          <>
            <button onClick={() => setActionModal(null)} className="btn-secondary">
              Cancel
            </button>
            <button 
              onClick={() => handleAction('approve')} 
              className="btn-success"
              disabled={processing}
            >
              {processing ? <LoadingSpinner size="sm" /> : 'Approve'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-surface-600">
            Are you sure you want to approve this {selectedApproval ? getEntityType(selectedApproval).toLowerCase() : ''}?
          </p>
          <div>
            <label className="label">Comments (optional)</label>
            <textarea
              className="textarea"
              placeholder="Add any comments..."
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={actionModal === 'reject'}
        onClose={() => setActionModal(null)}
        title="Reject"
        footer={
          <>
            <button onClick={() => setActionModal(null)} className="btn-secondary">
              Cancel
            </button>
            <button 
              onClick={() => handleAction('reject')} 
              className="btn-danger"
              disabled={processing || !actionComment}
            >
              {processing ? <LoadingSpinner size="sm" /> : 'Reject'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-surface-600">
            Are you sure you want to reject this {selectedApproval ? getEntityType(selectedApproval).toLowerCase() : ''}?
          </p>
          <div>
            <label className="label">Reason for rejection *</label>
            <textarea
              className="textarea"
              placeholder="Please provide a reason for rejection..."
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              rows={3}
              required
            />
          </div>
        </div>
      </Modal>

      {/* Delegate Modal */}
      <Modal
        isOpen={actionModal === 'delegate'}
        onClose={() => setActionModal(null)}
        title="Delegate Approval"
        footer={
          <>
            <button onClick={() => setActionModal(null)} className="btn-secondary">
              Cancel
            </button>
            <button 
              onClick={() => handleAction('delegate')} 
              className="btn-primary"
              disabled={processing || !delegateUserId}
            >
              {processing ? <LoadingSpinner size="sm" /> : 'Delegate'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-surface-600">
            Delegate this approval to another user.
          </p>
          <div>
            <label className="label">Delegate to *</label>
            <select
              className="select"
              value={delegateUserId}
              onChange={(e) => setDelegateUserId(e.target.value)}
              required
            >
              <option value="">Select a user...</option>
              <option value="user-1">Sarah Johnson</option>
              <option value="user-2">Mike Chen</option>
              <option value="user-3">Emily Davis</option>
            </select>
          </div>
          <div>
            <label className="label">Comments (optional)</label>
            <textarea
              className="textarea"
              placeholder="Add any comments..."
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </Modal>

      {/* Agent Result Modal */}
      {selectedApprovalForModal && agentResults[selectedApprovalForModal.id] && (
        <AgentResultModal
          isOpen={true}
          agentName="ApprovalChainAgent"
          agentLabel="Approval Analysis"
          status={agentResults[selectedApprovalForModal.id].status}
          result={agentResults[selectedApprovalForModal.id].result}
          notes={agentResults[selectedApprovalForModal.id].notes || []}
          flagged={agentResults[selectedApprovalForModal.id].flagged || false}
          flagReason={agentResults[selectedApprovalForModal.id].flag_reason}
          onClose={() => setSelectedApprovalForModal(null)}
        />
      )}
    </div>
  );
}
