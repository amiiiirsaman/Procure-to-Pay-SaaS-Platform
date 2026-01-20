import React, { useState } from 'react';
import { Loader, AlertCircle, CheckCircle2, Bot } from 'lucide-react';

export interface AgentButtonProps {
  /** Display label for the button */
  label: string;
  /** Click handler - can be sync or async */
  onClick: () => void | Promise<void>;
  /** Optional: Agent identifier for logging */
  agentName?: string;
  /** Button visual variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'warning' | 'danger';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** External loading state control */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const variantClasses = {
  primary: 'bg-primary-500 hover:bg-primary-600 text-white',
  secondary: 'bg-white border border-surface-300 hover:bg-surface-50 text-surface-700',
  ghost: 'text-primary-600 hover:bg-primary-50',
  success: 'bg-success-500 hover:bg-success-600 text-white',
  warning: 'bg-warning-500 hover:bg-warning-600 text-white',
  danger: 'bg-danger-500 hover:bg-danger-600 text-white',
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs gap-1',
  md: 'px-3 py-1.5 text-sm gap-1.5',
  lg: 'px-4 py-2 text-base gap-2',
};

/**
 * AgentButton: A button component for triggering AI agent actions
 */
export const AgentButton: React.FC<AgentButtonProps> = ({
  label,
  onClick,
  agentName,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  
  const isLoading = loading || internalLoading;

  const handleClick = async () => {
    if (isLoading || disabled) return;
    
    try {
      setInternalLoading(true);
      await onClick();
    } catch (err) {
      console.error(`AgentButton error${agentName ? ` (${agentName})` : ''}:`, err);
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center
        rounded-lg font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      title={agentName ? `Trigger ${agentName}` : undefined}
    >
      {isLoading ? (
        <>
          <Loader className="w-3 h-3 animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          <Bot className="w-3 h-3" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};
