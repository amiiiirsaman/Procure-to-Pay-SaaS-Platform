import type { DocumentStatus, RiskLevel, ApprovalStatus, MatchStatus, Urgency } from '../types';

// ============================================================================
// Currency Formatting
// ============================================================================

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(amount: number, currency = 'USD'): string {
  if (amount >= 1000000) {
    return `${formatCurrency(amount / 1000000, currency).replace(/\.00$/, '')}M`;
  }
  if (amount >= 1000) {
    return `${formatCurrency(amount / 1000, currency).replace(/\.00$/, '')}K`;
  }
  return formatCurrency(amount, currency);
}

// ============================================================================
// Date Formatting
// ============================================================================

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function isOverdue(dueDate: string | Date): boolean {
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  return d < new Date();
}

export function getDaysUntil(date: string | Date): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// ============================================================================
// Status Labels & Colors
// ============================================================================

export function getStatusLabel(status: DocumentStatus): string {
  const labels: Record<DocumentStatus, string> = {
    DRAFT: 'Draft',
    PENDING_APPROVAL: 'Pending Approval',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    ORDERED: 'Ordered',
    RECEIVED: 'Received',
    INVOICED: 'Invoiced',
    PAID: 'Paid',
    CANCELLED: 'Cancelled',
  };
  return labels[status] || status;
}

export function getStatusClass(status: DocumentStatus): string {
  const classes: Record<DocumentStatus, string> = {
    DRAFT: 'status-draft',
    PENDING_APPROVAL: 'status-pending',
    APPROVED: 'status-approved',
    REJECTED: 'status-rejected',
    ORDERED: 'status-ordered',
    RECEIVED: 'status-received',
    INVOICED: 'status-pending',
    PAID: 'status-paid',
    CANCELLED: 'status-rejected',
  };
  return classes[status] || 'badge-neutral';
}

export function getRiskLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    LOW: 'Low Risk',
    MEDIUM: 'Medium Risk',
    HIGH: 'High Risk',
    CRITICAL: 'Critical Risk',
  };
  return labels[level] || level;
}

export function getRiskClass(level: RiskLevel): string {
  const classes: Record<RiskLevel, string> = {
    LOW: 'risk-low',
    MEDIUM: 'risk-medium',
    HIGH: 'risk-high',
    CRITICAL: 'risk-critical',
  };
  return classes[level] || 'badge-neutral';
}

export function getApprovalStatusLabel(status: ApprovalStatus): string {
  const labels: Record<ApprovalStatus, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    DELEGATED: 'Delegated',
    SKIPPED: 'Skipped',
  };
  return labels[status] || status;
}

export function getMatchStatusLabel(status: MatchStatus): string {
  const labels: Record<MatchStatus, string> = {
    PENDING: 'Pending Match',
    MATCHED: 'Matched',
    PARTIAL: 'Partial Match',
    EXCEPTION: 'Exception',
  };
  return labels[status] || status;
}

export function getUrgencyLabel(urgency: Urgency): string {
  const labels: Record<Urgency, string> = {
    STANDARD: 'Standard',
    URGENT: 'Urgent',
    EMERGENCY: 'Emergency',
  };
  return labels[urgency] || urgency;
}

export function getUrgencyClass(urgency: Urgency): string {
  const classes: Record<Urgency, string> = {
    STANDARD: 'badge-neutral',
    URGENT: 'badge-warning',
    EMERGENCY: 'badge-danger',
  };
  return classes[urgency] || 'badge-neutral';
}

// ============================================================================
// Number Formatting
// ============================================================================

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatPercentage(num: number, decimals = 1): string {
  return `${num.toFixed(decimals)}%`;
}

// ============================================================================
// String Utilities
// ============================================================================

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function toTitleCase(str: string): string {
  return str.replace(/_/g, ' ').split(' ').map(capitalize).join(' ');
}
