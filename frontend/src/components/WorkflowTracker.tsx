import React from 'react';

export type WorkflowStage = 
  | 'requisition'
  | 'fraud_check'
  | 'compliance'
  | 'approval'
  | 'po'
  | 'receipt'
  | 'invoice'
  | 'payment'
  | 'complete';

export interface StageStatus {
  stage: WorkflowStage;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error' | 'flagged';
  timestamp?: Date;
  notes?: string;
}

interface WorkflowTrackerProps {
  stages: StageStatus[];
  currentStage?: WorkflowStage;
  procurementType?: 'goods' | 'services';  // For dynamic label
}

const STAGE_ORDER: WorkflowStage[] = [
  'requisition',
  'fraud_check',
  'compliance',
  'approval',
  'po',
  'receipt',
  'invoice',
  'payment',
  'complete',
];

// Dynamic stage labels based on procurement type
const getStageLabels = (procurementType: 'goods' | 'services' = 'goods'): Record<WorkflowStage, string> => ({
  requisition: 'Requisition',
  fraud_check: 'Fraud Check',
  compliance: 'Compliance',
  approval: 'Approval',
  po: 'Purchase Order',
  receipt: procurementType === 'services' ? 'Service Acceptance' : 'Goods Receipt',
  invoice: procurementType === 'services' ? 'Invoice (2-Way Match)' : 'Invoice (3-Way Match)',
  payment: 'Payment',
  complete: 'Complete',
});

// Keep static for backward compatibility
const STAGE_LABELS: Record<WorkflowStage, string> = getStageLabels('goods');

export const WorkflowTracker: React.FC<WorkflowTrackerProps> = ({ stages, currentStage, procurementType = 'goods' }) => {
  const stageLabels = getStageLabels(procurementType);
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: 'gray',
      'in-progress': 'blue',
      completed: 'green',
      error: 'red',
      flagged: 'yellow',
    };
    return colors[status] || 'gray';
  };

  const getStatusIcon = (status: string): string => {
    const icons: Record<string, string> = {
      pending: '○',
      'in-progress': '◐',
      completed: '✓',
      error: '✕',
      flagged: '⚠',
    };
    return icons[status] || '•';
  };

  const stageMap = new Map(stages.map(s => [s.stage, s]));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Workflow Progress</h3>

      {/* Desktop View - Horizontal */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {STAGE_ORDER.map((stage, index) => {
            const stageData = stageMap.get(stage);
            const status = stageData?.status || 'pending';
            const color = getStatusColor(status);

            return (
              <React.Fragment key={stage}>
                {/* Stage */}
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      h-12 w-12 rounded-full flex items-center justify-center 
                      text-white font-semibold text-lg
                      bg-${color}-600 border-2 border-${color}-600
                      transition-all
                    `}
                  >
                    {getStatusIcon(status)}
                  </div>
                  <p className="mt-3 text-sm font-medium text-gray-900 text-center max-w-[100px]">
                    {stageLabels[stage]}
                  </p>
                  {stageData?.timestamp && (
                    <p className="text-xs text-gray-500 mt-1">
                      {stageData.timestamp.toLocaleTimeString()}
                    </p>
                  )}
                  {stageData?.notes && (
                    <p className="text-xs text-gray-600 mt-1 max-w-[100px]">
                      {stageData.notes}
                    </p>
                  )}
                </div>

                {/* Connector Line */}
                {index < STAGE_ORDER.length - 1 && (
                  <div
                    className={`
                      flex-1 h-1 mx-2 mb-6
                      bg-${getStatusColor(stageMap.get(STAGE_ORDER[index + 1])?.status || 'pending')}-300
                    `}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobile View - Vertical */}
      <div className="md:hidden space-y-4">
        {STAGE_ORDER.map(stage => {
          const stageData = stageMap.get(stage);
          const status = stageData?.status || 'pending';
          const color = getStatusColor(status);

          return (
            <div key={stage} className="flex gap-4">
              {/* Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    h-10 w-10 rounded-full flex items-center justify-center 
                    text-white font-semibold
                    bg-${color}-600 flex-shrink-0
                  `}
                >
                  {getStatusIcon(status)}
                </div>
                {stage !== STAGE_ORDER[STAGE_ORDER.length - 1] && (
                  <div className={`w-1 h-8 bg-${color}-300 mt-2`} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <p className="font-medium text-gray-900">{stageLabels[stage]}</p>
                <p className={`text-xs font-medium text-${color}-600`}>
                  {status.toUpperCase()}
                </p>
                {stageData?.timestamp && (
                  <p className="text-xs text-gray-500 mt-1">
                    {stageData.timestamp.toLocaleString()}
                  </p>
                )}
                {stageData?.notes && (
                  <p className="text-xs text-gray-600 mt-1">{stageData.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-900 mb-3">Status Legend</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-gray-600" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-blue-600" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-green-600" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-red-600" />
            <span>Error</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-yellow-600" />
            <span>Flagged</span>
          </div>
        </div>
      </div>
    </div>
  );
};
