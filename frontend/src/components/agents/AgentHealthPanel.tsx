import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { AgentStatusBadge } from './AgentStatusBadge';
import { checkAgentHealth } from '../../utils/api';

interface AgentInfo {
  name: string;
  status: string;
  lastActivity?: string;
  initialized?: boolean;
  error?: string;
}

export interface AgentHealthPanelProps {
  /** Overall system status */
  status?: 'healthy' | 'degraded' | 'unhealthy';
  /** List of agents with their status */
  agents?: AgentInfo[];
  /** Timestamp of last health check */
  lastChecked?: string;
  /** Callback for refresh button */
  onRefresh?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AgentHealthPanel: Shows real-time health status of all agents
 * Can be controlled externally via props or auto-fetch internally
 */
export const AgentHealthPanel: React.FC<AgentHealthPanelProps> = ({
  status: externalStatus,
  agents: externalAgents,
  lastChecked: externalLastChecked,
  onRefresh,
  className = '',
}) => {
  const [internalAgents, setInternalAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalLastChecked, setInternalLastChecked] = useState<Date | null>(null);

  // Use external data if provided, otherwise fetch internally
  const agents = Array.isArray(externalAgents) ? externalAgents : internalAgents;
  const lastChecked = externalLastChecked || internalLastChecked?.toISOString();
  const hasExternalData = externalAgents !== undefined;

  const fetchHealth = async () => {
    if (hasExternalData && onRefresh) {
      onRefresh();
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await checkAgentHealth();
      
      if (response.agents) {
        const agentList = Array.isArray(response.agents) 
          ? response.agents 
          : Object.entries(response.agents).map(([name, data]: [string, any]) => ({
              name: data.agent_name || name,
              status: data.status,
              initialized: data.initialized,
              error: data.error,
            }));
        setInternalAgents(agentList);
      }
      setInternalLastChecked(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check agent health';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasExternalData) {
      fetchHealth();
      const interval = setInterval(fetchHealth, 30000);
      return () => clearInterval(interval);
    }
  }, [hasExternalData]);

  const healthyCount = agents.filter(a => a.status === 'healthy' || a.status === 'completed').length;
  const totalCount = agents.length;
  
  const overallStatus = externalStatus || (
    totalCount === 0 ? 'healthy' :
    healthyCount === totalCount ? 'healthy' :
    healthyCount > 0 ? 'degraded' : 'unhealthy'
  );

  const statusConfig = {
    healthy: { bg: 'bg-success-50', border: 'border-success-200', text: 'text-success-700', label: 'All Systems Operational' },
    degraded: { bg: 'bg-warning-50', border: 'border-warning-200', text: 'text-warning-700', label: 'Some Issues Detected' },
    unhealthy: { bg: 'bg-danger-50', border: 'border-danger-200', text: 'text-danger-700', label: 'System Issues' },
  };

  const config = statusConfig[overallStatus];

  return (
    <div className={`card ${config.bg} ${config.border} ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-surface-900">Agent Health</h3>
        </div>
        <button
          onClick={fetchHealth}
          disabled={isLoading}
          className="btn-ghost btn-sm flex items-center gap-1"
          aria-label="Refresh agent health"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="text-xs">{isLoading ? 'Checking...' : 'Refresh'}</span>
        </button>
      </div>

      <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${config.bg}`}>
        {overallStatus === 'healthy' ? (
          <CheckCircle2 className="w-5 h-5 text-success-600" />
        ) : (
          <AlertCircle className={`w-5 h-5 ${config.text}`} />
        )}
        <span className={`font-medium ${config.text}`}>{config.label}</span>
        <span className="text-sm text-surface-500 ml-auto">
          {healthyCount}/{totalCount} agents healthy
        </span>
      </div>

      {error && (
        <div className="text-sm text-danger-600 bg-danger-50 rounded p-2 mb-4">
          {error}
        </div>
      )}

      {agents.length > 0 && (
        <div className="space-y-2">
          {agents.map((agent, idx) => (
            <div key={agent.name || idx} className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
              <span className="text-sm font-medium text-surface-700">{agent.name}</span>
              <AgentStatusBadge status={agent.status as any} />
            </div>
          ))}
        </div>
      )}

      {lastChecked && (
        <p className="text-xs text-surface-500 mt-3">
          Last checked: {new Date(lastChecked).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
};
