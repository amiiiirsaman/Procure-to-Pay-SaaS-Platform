import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconColor?: 'primary' | 'success' | 'warning' | 'danger';
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  iconColor = 'primary',
  trend,
  onClick,
}: StatCardProps) {
  const iconColorClasses = {
    primary: 'stat-icon-primary',
    success: 'stat-icon-success',
    warning: 'stat-icon-warning',
    danger: 'stat-icon-danger',
  };

  return (
    <div 
      className={`stat-card ${onClick ? 'cursor-pointer hover:shadow-card-hover transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div>
        <p className="text-sm font-medium text-surface-500">{title}</p>
        <p className="mt-1 text-3xl font-bold text-surface-900">{value}</p>
        {subtitle && (
          <p className="mt-1 text-sm text-surface-500">{subtitle}</p>
        )}
        {trend && (
          <div className="mt-2 flex items-center gap-1">
            <span className={`text-sm font-medium ${trend.isPositive ? 'text-success-600' : 'text-danger-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </span>
            <span className="text-sm text-surface-500">{trend.label}</span>
          </div>
        )}
      </div>
      <div className={iconColorClasses[iconColor]}>
        {icon}
      </div>
    </div>
  );
}
