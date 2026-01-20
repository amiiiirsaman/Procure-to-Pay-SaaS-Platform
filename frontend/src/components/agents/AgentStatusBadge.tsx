import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Loader } from 'lucide-react';

export type AgentStatus = 'pending' | 'processing' | 'success' | 'completed' | 'flagged' | 'error' | 'failed' | 'healthy' | 'idle';

export interface AgentStatusBadgeProps {
  status: AgentStatus;
  flagged?: boolean;
  className?: string;
}

const statusConfig: Record<AgentStatus, { bg: string; text: string; icon: typeof Clock; label: string }> = {
  pending: {
    bg: 'bg-surface-100',
    text: 'text-surface-600',
    icon: Clock,
    label: 'Pending',
  },
  processing: {
    bg: 'bg-primary-100',
    text: 'text-primary-600',
    icon: Loader,
    label: 'Processing',
  },
  success: {
    bg: 'bg-success-100',
    text: 'text-success-600',
    icon: CheckCircle2,
    label: 'Success',
  },
  completed: {
    bg: 'bg-success-100',
    text: 'text-success-600',
    icon: CheckCircle2,
    label: 'Completed',
  },
  healthy: {
    bg: 'bg-success-100',
    text: 'text-success-600',
    icon: CheckCircle2,
    label: 'Healthy',
  },
  flagged: {
    bg: 'bg-danger-100',
    text: 'text-danger-600',
    icon: AlertTriangle,
    label: 'Flagged',
  },
  error: {
    bg: 'bg-danger-100',
    text: 'text-danger-600',
    icon: AlertTriangle,
    label: 'Error',
  },
  failed: {
    bg: 'bg-danger-100',
    text: 'text-danger-600',
    icon: AlertTriangle,
    label: 'Failed',
  },
  idle: {
    bg: 'bg-surface-100',
    text: 'text-surface-500',
    icon: Clock,
    label: 'Idle',
  },
};

/**
 * AgentStatusBadge: Displays agent processing status with icon
 */
export const AgentStatusBadge: React.FC<AgentStatusBadgeProps> = ({
  status,
  flagged = false,
  className = '',
}) => {
  const displayStatus: AgentStatus = flagged ? 'flagged' : status;
  const config = statusConfig[displayStatus] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      <Icon className={`w-3 h-3 ${displayStatus === 'processing' ? 'animate-spin' : ''}`} />
      <span>{config.label}</span>
    </span>
  );
};
