import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export interface FlagAlertProps {
  /** The reason/message for the flag - if provided, component renders */
  reason: string;
  /** Optional agent name that raised the flag */
  agentName?: string;
  /** Additional CSS classes */
  className?: string;
  /** Severity level affects styling */
  severity?: 'warning' | 'critical' | 'info';
  /** Compact inline mode vs full alert banner */
  inline?: boolean;
}

const severityConfig = {
  critical: {
    bg: 'bg-danger-50',
    border: 'border-danger-300',
    text: 'text-danger-600',
    inlineBg: 'bg-danger-100',
  },
  warning: {
    bg: 'bg-warning-50',
    border: 'border-warning-300',
    text: 'text-warning-600',
    inlineBg: 'bg-warning-100',
  },
  info: {
    bg: 'bg-primary-50',
    border: 'border-primary-300',
    text: 'text-primary-600',
    inlineBg: 'bg-primary-100',
  },
};

/**
 * FlagAlert: Displays alert when agent flags an issue
 * Can render inline (compact) or as a full banner
 */
export const FlagAlert: React.FC<FlagAlertProps> = ({
  reason,
  agentName,
  className = '',
  severity = 'warning',
  inline = true,
}) => {
  const config = severityConfig[severity];

  // Inline mode: compact badge-like display
  if (inline) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.inlineBg} ${config.text} ${className}`}
        title={reason}
      >
        <AlertTriangle className="w-3 h-3" />
        <span className="truncate max-w-[120px]">{reason}</span>
      </span>
    );
  }

  // Full banner mode
  return (
    <div
      className={`${config.bg} border-l-4 ${config.border} rounded-r-lg p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 ${config.text} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <h3 className={`font-semibold ${config.text}`}>
            {severity === 'critical' ? '🚨 Critical Alert' : '⚠️ Flagged for Review'}
          </h3>
          <p className={`${config.text} mt-1 text-sm`}>{reason}</p>
          {agentName && (
            <p className={`${config.text} text-xs mt-2 opacity-75`}>
              Flagged by {agentName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
