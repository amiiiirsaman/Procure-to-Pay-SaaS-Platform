import { useState, useEffect } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  ShieldCheck, 
  TrendingUp, 
  FileSearch,
  Filter,
} from 'lucide-react';
import { 
  RiskBadge,
  LoadingSpinner, 
  ErrorState, 
} from '../components/common';
import { 
  AgentButton, 
  AgentResultModal, 
  AgentHealthPanel 
} from '../components/agents';
import { getAuditLogs, getComplianceMetrics, checkCompliance, checkAgentHealth } from '../utils/api';
import { formatRelativeTime } from '../utils/formatters';
import type { AuditLog, AuditLogFilters, ComplianceMetrics } from '../types';

export function ComplianceView() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'audit'>('overview');
  const [agentResult, setAgentResult] = useState<any>(null);
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [complianceCheckLoading, setComplianceCheckLoading] = useState(false);
  const [agentHealth, setAgentHealth] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [page, filters]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [logsResponse, metricsData] = await Promise.all([
        getAuditLogs({ ...filters, skip: (page - 1) * 50, limit: 50 }),
        getComplianceMetrics(),
      ]);
      setAuditLogs(logsResponse.items);
      setTotalCount(logsResponse.total);
      setMetrics(metricsData);
    } catch (err) {
      console.error('Failed to load compliance data:', err);
      setError('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadAgentHealth() {
      try {
        const health = await checkAgentHealth();
        setAgentHealth(health);
      } catch (err) {
        console.error('Failed to load agent health:', err);
      }
    }
    loadAgentHealth();
  }, []);

  async function handleComplianceCheck() {
    setComplianceCheckLoading(true);
    try {
      const result = await checkCompliance();
      setAgentResult(result);
      setAgentModalOpen(true);
    } catch (err) {
      console.error('Failed to run compliance check:', err);
    } finally {
      setComplianceCheckLoading(false);
    }
  }

  function getActionIcon(action: string) {
    if (action.includes('CREATE')) return <CheckCircle className="text-success-500" size={16} />;
    if (action.includes('UPDATE')) return <TrendingUp className="text-primary-500" size={16} />;
    if (action.includes('DELETE')) return <AlertTriangle className="text-danger-500" size={16} />;
    if (action.includes('APPROVE') || action.includes('REJECT')) return <ShieldCheck className="text-warning-500" size={16} />;
    return <FileSearch className="text-surface-500" size={16} />;
  }

  const actionOptions = [
    'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'SUBMIT', 'VIEW', 'LOGIN', 'LOGOUT'
  ];

  const entityOptions = [
    'USER', 'SUPPLIER', 'REQUISITION', 'PURCHASE_ORDER', 'GOODS_RECEIPT', 'INVOICE', 'PAYMENT'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Compliance & Audit</h1>
          <p className="text-surface-500">Monitor compliance status and audit trails</p>
        </div>
        <AgentButton
          label="Run Compliance Check"
          variant="primary"
          size="md"
          loading={complianceCheckLoading}
          onClick={handleComplianceCheck}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-surface-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'audit'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}
          >
            Audit Log
          </button>
        </nav>
      </div>

      {loading && !metrics ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" className="text-primary-500" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : activeTab === 'overview' ? (
        /* Overview Tab */
        <div className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success-100 text-success-600 rounded-lg flex items-center justify-center">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-surface-900">{metrics?.compliant_transactions || 0}</p>
                  <p className="text-sm text-surface-500">Compliant Transactions</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning-100 text-warning-600 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-surface-900">{metrics?.policy_violations || 0}</p>
                  <p className="text-sm text-surface-500">Policy Violations</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-danger-100 text-danger-600 rounded-lg flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-surface-900">{metrics?.high_risk_suppliers || 0}</p>
                  <p className="text-sm text-surface-500">High Risk Suppliers</p>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-surface-900">{metrics?.compliance_rate || 0}%</p>
                  <p className="text-sm text-surface-500">Compliance Rate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Agent Health Panel */}
          {agentHealth && (
            <AgentHealthPanel
              status={agentHealth.status}
              agents={agentHealth.agents || []}
              lastChecked={agentHealth.timestamp}
              onRefresh={async () => {
                const health = await checkAgentHealth();
                setAgentHealth(health);
              }}
            />
          )}

          {/* Recent Violations */}
          <div className="card">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Recent Policy Violations</h3>
            {metrics?.recent_violations && metrics.recent_violations.length > 0 ? (
              <div className="space-y-3">
                {metrics.recent_violations.map((violation, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-danger-50 rounded-lg">
                    <AlertTriangle className="text-danger-500 flex-shrink-0 mt-0.5" size={16} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-surface-900">{violation.description}</p>
                      <p className="text-xs text-surface-500 mt-1">
                        {violation.entity_type} • {formatRelativeTime(violation.created_at)}
                      </p>
                    </div>
                    <RiskBadge level={violation.severity} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-surface-500 text-center py-8">No recent violations</p>
            )}
          </div>
        </div>
      ) : (
        /* Audit Log Tab */
        <div className="space-y-4">
          {/* Filters */}
          <div className="card">
            <div className="flex items-center gap-4">
              <Filter size={18} className="text-surface-400" />
              <select 
                className="select w-40"
                value={filters.action || ''}
                onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined })}
              >
                <option value="">All Actions</option>
                {actionOptions.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
              <select 
                className="select w-48"
                value={filters.entity_type || ''}
                onChange={(e) => setFilters({ ...filters, entity_type: e.target.value || undefined })}
              >
                <option value="">All Entities</option>
                {entityOptions.map((entity) => (
                  <option key={entity} value={entity}>{entity.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <input
                type="date"
                className="input w-40"
                value={filters.date_from || ''}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined })}
              />
            </div>
          </div>

          {/* Log Entries */}
          <div className="card p-0">
            <div className="divide-y divide-surface-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-4 hover:bg-surface-50">
                  <div className="w-8 h-8 bg-surface-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-surface-900">{log.user?.name || 'System'}</span>
                      <span className="badge-surface text-xs">{log.action}</span>
                    </div>
                    <p className="text-sm text-surface-600 mt-0.5">
                      {log.entity_type} #{log.entity_id}
                      {log.description && ` - ${log.description}`}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-surface-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatRelativeTime(log.created_at)}
                      </span>
                      {log.ip_address && <span>IP: {log.ip_address}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-500">
              Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, totalCount)} of {totalCount} entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-secondary btn-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(totalCount / 50)}
                className="btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Result Modal */}
      {agentModalOpen && agentResult && (
        <AgentResultModal
          isOpen={true}
          agentName="ComplianceAgent"
          agentLabel="Compliance Check"
          status={agentResult.status}
          result={agentResult.result}
          notes={agentResult.notes || []}
          flagged={agentResult.flagged || false}
          flagReason={agentResult.flag_reason}
          onClose={() => setAgentModalOpen(false)}
        />
      )}
    </div>
  );
}
