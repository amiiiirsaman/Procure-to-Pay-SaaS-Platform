import React, { useState, useCallback } from 'react';
import { useAgentUpdates } from '../hooks/useWebSocket';

interface AgentActivity {
  id: string;
  agent: string;
  action: string;
  timestamp: Date;
  details?: Record<string, any>;
  status: 'pending' | 'completed' | 'error';
}

interface AgentActivityFeedProps {
  workflowId: string;
  maxItems?: number;
}

export const AgentActivityFeed: React.FC<AgentActivityFeedProps> = ({
  workflowId,
  maxItems = 10,
}) => {
  const [activities, setActivities] = useState<AgentActivity[]>([]);

  const handleUpdate = useCallback((update: any) => {
    const activity: AgentActivity = {
      id: `${Date.now()}-${Math.random()}`,
      agent: update.agent || 'Unknown',
      action: update.action || 'unknown',
      timestamp: new Date(),
      details: update.details,
      status: update.details?.status || 'pending',
    };

    setActivities(prev => [activity, ...prev.slice(0, maxItems - 1)]);
  }, [maxItems]);

  const { isConnected, error } = useAgentUpdates(workflowId, undefined, handleUpdate);

  const getAgentColor = (agent: string): string => {
    const colors: Record<string, string> = {
      RequisitionAgent: 'blue',
      ApprovalAgent: 'purple',
      POAgent: 'green',
      ReceivingAgent: 'indigo',
      InvoiceAgent: 'orange',
      FraudAgent: 'red',
      ComplianceAgent: 'yellow',
    };
    return colors[agent] || 'gray';
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: 'yellow',
      completed: 'green',
      error: 'red',
    };
    return colors[status] || 'gray';
  };

  const getStatusIcon = (status: string): string => {
    const icons: Record<string, string> = {
      pending: '⏳',
      completed: '✅',
      error: '❌',
    };
    return icons[status] || '•';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Agent Activity</h3>
          <p className="text-sm text-gray-600">Real-time workflow processing updates</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200 text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Activity Feed */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            <p className="text-sm">Waiting for agent activity...</p>
          </div>
        ) : (
          activities.map(activity => (
            <div
              key={activity.id}
              className="px-6 py-4 hover:bg-gray-50 transition"
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-1">
                  <span className="text-lg">{getStatusIcon(activity.status)}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium text-white bg-${getAgentColor(
                        activity.agent
                      )}-600`}
                    >
                      {activity.agent}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {activity.action}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium bg-${getStatusColor(
                        activity.status
                      )}-100 text-${getStatusColor(activity.status)}-800`}
                    >
                      {activity.status.charAt(0).toUpperCase() +
                        activity.status.slice(1)}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <p className="text-xs text-gray-500">
                    {activity.timestamp.toLocaleTimeString()}
                  </p>

                  {/* Details */}
                  {activity.details && Object.keys(activity.details).length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 space-y-1">
                      {Object.entries(activity.details).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium">{key}:</span>
                          <span className="text-gray-700">
                            {typeof value === 'object'
                              ? JSON.stringify(value, null, 2)
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 text-center text-xs text-gray-600 border-t border-gray-200">
        {activities.length === 0
          ? 'Workflow ID: ' + workflowId
          : `Showing ${activities.length} recent activities`}
      </div>
    </div>
  );
};
