import type { ReactNode } from 'react';
import { FileX, AlertCircle, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon || <FileX className="empty-state-icon" />}
      <h3 className="text-lg font-semibold text-surface-900">{title}</h3>
      {description && (
        <p className="mt-1 text-surface-500 max-w-sm">{description}</p>
      )}
      {action && (
        <button 
          onClick={action.onClick}
          className="btn-primary mt-4"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = 'Something went wrong', 
  message = 'An error occurred while loading the data.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="empty-state">
      <div className="w-16 h-16 bg-danger-100 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-danger-500" />
      </div>
      <h3 className="text-lg font-semibold text-surface-900">{title}</h3>
      <p className="mt-1 text-surface-500 max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary mt-4">
          <RefreshCw size={16} />
          Try again
        </button>
      )}
    </div>
  );
}
