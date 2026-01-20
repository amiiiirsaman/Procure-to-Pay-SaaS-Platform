import type { DocumentStatus, RiskLevel, ApprovalStatus, Urgency, MatchStatus } from '../../types';
import { 
  getStatusLabel, 
  getStatusClass, 
  getRiskLabel, 
  getRiskClass,
  getUrgencyLabel,
  getUrgencyClass,
  getApprovalStatusLabel,
  getMatchStatusLabel,
} from '../../utils/formatters';

interface StatusBadgeProps {
  status: DocumentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={getStatusClass(status)}>
      {getStatusLabel(status)}
    </span>
  );
}

interface RiskBadgeProps {
  level: RiskLevel;
}

export function RiskBadge({ level }: RiskBadgeProps) {
  return (
    <span className={getRiskClass(level)}>
      {getRiskLabel(level)}
    </span>
  );
}

interface UrgencyBadgeProps {
  urgency: Urgency;
}

export function UrgencyBadge({ urgency }: UrgencyBadgeProps) {
  return (
    <span className={getUrgencyClass(urgency)}>
      {getUrgencyLabel(urgency)}
    </span>
  );
}

interface ApprovalBadgeProps {
  status: ApprovalStatus;
}

export function ApprovalBadge({ status }: ApprovalBadgeProps) {
  const classMap: Record<ApprovalStatus, string> = {
    PENDING: 'status-pending',
    APPROVED: 'status-approved',
    REJECTED: 'status-rejected',
    DELEGATED: 'badge-primary',
    SKIPPED: 'badge-neutral',
  };
  
  return (
    <span className={classMap[status]}>
      {getApprovalStatusLabel(status)}
    </span>
  );
}

interface MatchBadgeProps {
  status: MatchStatus;
}

export function MatchBadge({ status }: MatchBadgeProps) {
  const classMap: Record<MatchStatus, string> = {
    PENDING: 'badge-neutral',
    MATCHED: 'status-approved',
    PARTIAL: 'status-pending',
    EXCEPTION: 'status-rejected',
  };
  
  return (
    <span className={classMap[status]}>
      {getMatchStatusLabel(status)}
    </span>
  );
}
