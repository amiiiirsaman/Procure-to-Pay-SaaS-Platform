import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { Requisition } from '../types';
import { getRequisition, submitRequisition, triggerAgent } from '../utils/api';
import { AgentActivityFeed } from '../components/AgentActivityFeed';
import { WorkflowTrackerEnhanced, type WorkflowStage, type StageStatus } from '../components/WorkflowTrackerEnhanced';
import { LoadingSpinner, ErrorState } from '../components/common';

export const RequisitionDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [stageStatuses, setStageStatuses] = useState<StageStatus[]>([
    { stage: 'requisition', label: 'Requisition', status: 'pending' },
    { stage: 'fraud_check', label: 'Fraud Check', status: 'pending' },
    { stage: 'compliance', label: 'Compliance', status: 'pending' },
    { stage: 'approval', label: 'Approval', status: 'pending' },
    { stage: 'po', label: 'Purchase Order', status: 'pending' },
    { stage: 'receipt', label: 'Receipt/Acceptance', status: 'pending' },  // Dynamic based on type
    { stage: 'invoice', label: 'Invoice', status: 'pending' },
    { stage: 'payment', label: 'Payment', status: 'pending' },
  ]);

  useEffect(() => {
    const fetchRequisition = async () => {
      try {
        setLoading(true);
        setError(null);
        if (id) {
          const data = await getRequisition(parseInt(id));
          setRequisition(data);
          updateStageStatus(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load requisition');
      } finally {
        setLoading(false);
      }
    };

    fetchRequisition();
  }, [id]);

  const updateStageStatus = (req: Requisition) => {
    setStageStatuses(prev =>
      prev.map(stage => ({
        ...stage,
        status: mapRequisitionStatusToStage(req.status, stage.stage),
        timestamp: new Date(),
      }))
    );
  };

  const mapRequisitionStatusToStage = (
    reqStatus: string,
    stage: WorkflowStage
  ): 'pending' | 'in-progress' | 'completed' | 'error' | 'flagged' => {
    if (reqStatus === 'cancelled' || reqStatus === 'rejected') return 'error';
    if (reqStatus === 'flagged_for_review') return 'flagged';

    const statusMap: Record<string, WorkflowStage[]> = {
      'pending': ['requisition'],
      'submitted': ['requisition', 'fraud_check'],
      'approved': ['requisition', 'fraud_check', 'compliance', 'approval'],
      'awaiting_final_approval': [
        'requisition',
        'fraud_check',
        'compliance',
        'approval',
      ],
      'po_generated': [
        'requisition',
        'fraud_check',
        'compliance',
        'approval',
        'po',
      ],
      'completed': WORKFLOW_STAGES,
    };

    const completedStages = statusMap[reqStatus] || ['requisition'];
    return completedStages.includes(stage) ? 'completed' : 'pending';
  };

  const handleSubmit = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await submitRequisition(parseInt(id));
      const updated = await getRequisition(parseInt(id));
      setRequisition(updated);
      updateStageStatus(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerAgent = async (agentName: string) => {
    if (!id) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await triggerAgent(agentName, {
        document_type: 'requisition',
        document_id: parseInt(id),
      });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to trigger agent');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (error || !requisition) return <ErrorState message={error || 'Requisition not found'} />;

  const isEditable = ['pending', 'draft'].includes(requisition.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {requisition.number}
            </h1>
            <p className="text-gray-600 mt-1">
              Requested by: {requisition.requester_id}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              ${requisition.total_amount?.toFixed(2) || '0.00'}
            </div>
            <div
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                requisition.status === 'APPROVED'
                  ? 'bg-green-100 text-green-800'
                  : requisition.status === 'PENDING_APPROVAL'
                  ? 'bg-yellow-100 text-yellow-800'
                  : requisition.status === 'REJECTED'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {requisition.status.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Action Messages */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {actionError}
        </div>
      )}

      {/* Workflow Tracker - Enhanced AI Agent View */}
      <WorkflowTrackerEnhanced 
        stages={stageStatuses} 
        currentStage={mapRequisitionStatusToStageType(requisition.status)}
        procurementType={requisition.procurement_type || 'goods'}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Department</p>
                <p className="text-lg font-medium text-gray-900">{requisition.department}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Urgency</p>
                <p className="text-lg font-medium text-gray-900">{requisition.urgency}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Project Code</p>
                <p className="text-lg font-medium text-gray-900">{requisition.project_code || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cost Center</p>
                <p className="text-lg font-medium text-gray-900">{requisition.cost_center}</p>
              </div>
            </div>

            {requisition.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Description</p>
                <p className="text-gray-700">{requisition.description}</p>
              </div>
            )}

            {requisition.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Notes</p>
                <p className="text-gray-700">{requisition.notes}</p>
              </div>
            )}
          </div>

          {/* Line Items */}
          {requisition.line_items && requisition.line_items.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Line Items</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Product
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                        Qty
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                        Unit Price
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {requisition.line_items.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.description}
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-gray-900">
                          ${(item.estimated_unit_price || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                          ${(item.total || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Actions & Status */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-2">
              {isEditable && (
                <button
                  onClick={handleSubmit}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Requisition'}
                </button>
              )}

              {!isEditable && (
                <>
                  <button
                    onClick={() => handleTriggerAgent('requisition')}
                    disabled={actionLoading}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm"
                  >
                    Trigger Requisition Agent
                  </button>
                  <button
                    onClick={() => handleTriggerAgent('fraud')}
                    disabled={actionLoading}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 font-medium text-sm"
                  >
                    Trigger Fraud Check
                  </button>
                  <button
                    onClick={() => handleTriggerAgent('compliance')}
                    disabled={actionLoading}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 font-medium text-sm"
                  >
                    Trigger Compliance
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Meta Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Information</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Created</p>
                <p className="font-medium text-gray-900">
                  {requisition.created_at
                    ? new Date(requisition.created_at).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Last Updated</p>
                <p className="font-medium text-gray-900">
                  {requisition.updated_at
                    ? new Date(requisition.updated_at).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Activity Feed */}
      {id && (
        <AgentActivityFeed workflowId={`req-${id}`} maxItems={15} />
      )}
    </div>
  );
};

const WORKFLOW_STAGES = [
  'requisition',
  'fraud_check',
  'compliance',
  'approval',
  'po',
  'receipt',
  'invoice',
  'payment',
] as WorkflowStage[];

function mapRequisitionStatusToStageType(status: string): WorkflowStage {
  const map: Record<string, WorkflowStage> = {
    pending: 'requisition',
    submitted: 'fraud_check',
    approved: 'approval',
    po_generated: 'po',
    completed: 'payment',
  };
  return map[status] || 'requisition';
}
