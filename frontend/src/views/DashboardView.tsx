import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckSquare, 
  ShoppingCart, 
  Receipt, 
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowRight,
  Bot,
  Zap,
  Timer,
  Shield,
  DollarSign,
  Filter,
  X,
  ChevronRight,
  FileText,
} from 'lucide-react';
import {
  WORKFLOW_STEP_NAMES,
  getStatusColor,
  getStatusDisplayText,
  getStepName,
  TOTAL_STEPS,
} from '../constants/workflow';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { StatCard, StatusBadge, LoadingSpinner, ErrorState } from '../components/common';
import { AgentHealthPanel, AgentStatusBadge } from '../components/agents';
import { getDashboardMetrics, checkAgentHealth, getPipelineStats, getRequisitionsStatus } from '../utils/api';
import type { PipelineStats, RequisitionStatusSummary } from '../utils/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { formatCurrency, formatDate, formatRelativeTime } from '../utils/formatters';
import type { DashboardMetrics } from '../types';

// Mock data for charts (in production, this would come from API)
const spendByCategory = [
  { name: 'IT Equipment', value: 125000, color: '#4169E1' },
  { name: 'Office Supplies', value: 45000, color: '#228B22' },
  { name: 'Professional Services', value: 89000, color: '#f59e0b' },
  { name: 'Travel', value: 32000, color: '#DC143C' },
  { name: 'Marketing', value: 67000, color: '#8b5cf6' },
];

const spendTrend = [
  { month: 'Jul', spend: 180000, invoices: 45 },
  { month: 'Aug', spend: 220000, invoices: 52 },
  { month: 'Sep', spend: 195000, invoices: 48 },
  { month: 'Oct', spend: 250000, invoices: 61 },
  { month: 'Nov', spend: 280000, invoices: 68 },
  { month: 'Dec', spend: 310000, invoices: 75 },
];

// Mock recent activity
const recentActivity = [
  { id: 1, type: 'requisition', action: 'approved', ref: 'REQ-000042', by: 'Sarah Johnson', time: new Date(Date.now() - 1000 * 60 * 15) },
  { id: 2, type: 'invoice', action: 'matched', ref: 'INV-000123', by: 'System', time: new Date(Date.now() - 1000 * 60 * 45) },
  { id: 3, type: 'po', action: 'created', ref: 'PO-000089', by: 'Mike Chen', time: new Date(Date.now() - 1000 * 60 * 120) },
  { id: 4, type: 'payment', action: 'processed', ref: 'PAY-000056', by: 'System', time: new Date(Date.now() - 1000 * 60 * 180) },
  { id: 5, type: 'requisition', action: 'submitted', ref: 'REQ-000043', by: 'Emily Davis', time: new Date(Date.now() - 1000 * 60 * 240) },
];

interface AgentActivity {
  id: number;
  agent: string;
  action: string;
  document: string;
  status: 'completed' | 'processing' | 'failed';
  timestamp: Date;
}

// Workflow step names and status helpers are imported from '../constants/workflow'

export function DashboardView() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentHealth, setAgentHealth] = useState<any>(null);
  
  // New state for pipeline stats and requisitions
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null);
  const [requisitions, setRequisitions] = useState<RequisitionStatusSummary[]>([]);
  const [hitlFilter, setHitlFilter] = useState<'all' | 'hitl'>('all');
  const [selectedRequisition, setSelectedRequisition] = useState<RequisitionStatusSummary | null>(null);
  
  const [agentActivities, setAgentActivities] = useState<AgentActivity[]>([
    { id: 1, agent: 'FraudAnalysisAgent', action: 'Analyzed invoice', document: 'INV-000123', status: 'completed', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
    { id: 2, agent: 'ComplianceAgent', action: 'Compliance check', document: 'PO-000089', status: 'completed', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
    { id: 3, agent: 'RequisitionAgent', action: 'Validated requisition', document: 'REQ-000042', status: 'completed', timestamp: new Date(Date.now() - 1000 * 60 * 60) },
  ]);

  // WebSocket for real-time agent updates
  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'agent_update') {
      setAgentActivities(prev => [{
        id: Date.now(),
        agent: message.agent || 'Agent',
        action: message.action || 'Processing',
        document: message.details?.document || 'Unknown',
        status: message.details?.status || 'processing',
        timestamp: new Date(),
      }, ...prev.slice(0, 9)]);
    }
  }, []);

  const { isConnected } = useWebSocket('dashboard', handleWebSocketMessage);

  useEffect(() => {
    loadMetrics();
    loadAgentHealth();
    loadPipelineStats();
    loadRequisitions();
  }, []);

  // Reload requisitions when filter changes
  useEffect(() => {
    loadRequisitions();
  }, [hitlFilter]);

  async function loadPipelineStats() {
    try {
      const stats = await getPipelineStats();
      setPipelineStats(stats);
    } catch (err) {
      console.error('Failed to load pipeline stats:', err);
    }
  }

  async function loadRequisitions() {
    try {
      const data = await getRequisitionsStatus(hitlFilter === 'hitl');
      setRequisitions(data);
    } catch (err) {
      console.error('Failed to load requisitions:', err);
    }
  }

  async function loadAgentHealth() {
    try {
      const health = await checkAgentHealth();
      setAgentHealth(health);
    } catch (err) {
      console.error('Failed to load agent health:', err);
      // Set a default structure when API fails
      setAgentHealth({
        status: 'unhealthy',
        agents: [],
        timestamp: new Date().toISOString()
      });
    }
  }

  async function loadMetrics() {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
      setError('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" className="text-primary-500" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadMetrics} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
        <p className="text-surface-500">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Pending Approvals"
          value={metrics?.pending_approvals ?? 0}
          subtitle="Awaiting your action"
          icon={<CheckSquare size={24} />}
          iconColor="warning"
          onClick={() => navigate('/approvals')}
        />
        <StatCard
          title="Open POs"
          value={metrics?.open_pos ?? 0}
          subtitle="In progress"
          icon={<ShoppingCart size={24} />}
          iconColor="primary"
          onClick={() => navigate('/purchase-orders')}
        />
        <StatCard
          title="Pending Invoices"
          value={metrics?.pending_invoices ?? 0}
          subtitle="Awaiting processing"
          icon={<Receipt size={24} />}
          iconColor="success"
          onClick={() => navigate('/invoices')}
        />
        <StatCard
          title="Overdue Invoices"
          value={metrics?.overdue_invoices ?? 0}
          subtitle="Require attention"
          icon={<AlertTriangle size={24} />}
          iconColor="danger"
          onClick={() => navigate('/invoices?overdue=true')}
        />
      </div>

      {/* Pipeline Stats Panel */}
      {pipelineStats && (
        <div className="card bg-gradient-to-r from-primary-50 to-surface-50 border-primary-100">
          <h3 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
            <Zap className="text-primary-500" size={20} />
            Pipeline Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-surface-100">
              <div className="flex items-center gap-2 text-primary-600 mb-1">
                <Zap size={16} />
                <span className="text-xs font-medium uppercase">Automation Rate</span>
              </div>
              <p className="text-2xl font-bold text-surface-900">{pipelineStats.automation_rate.toFixed(1)}%</p>
              <p className="text-xs text-surface-500">{pipelineStats.requisitions_completed}/{pipelineStats.total_requisitions} completed</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-surface-100">
              <div className="flex items-center gap-2 text-success-600 mb-1">
                <Timer size={16} />
                <span className="text-xs font-medium uppercase">Time Savings</span>
              </div>
              <p className="text-2xl font-bold text-surface-900">{pipelineStats.time_savings_percent.toFixed(0)}%</p>
              <p className="text-xs text-surface-500">{pipelineStats.roi_minutes_saved} min saved</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-surface-100">
              <div className="flex items-center gap-2 text-warning-600 mb-1">
                <Shield size={16} />
                <span className="text-xs font-medium uppercase">Compliance Score</span>
              </div>
              <p className="text-2xl font-bold text-surface-900">{pipelineStats.compliance_score.toFixed(1)}%</p>
              <p className="text-xs text-surface-500">{pipelineStats.flagged_for_review_count} flagged</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-surface-100">
              <div className="flex items-center gap-2 text-danger-600 mb-1">
                <AlertTriangle size={16} />
                <span className="text-xs font-medium uppercase">HITL Pending</span>
              </div>
              <p className="text-2xl font-bold text-surface-900">{pipelineStats.requisitions_hitl_pending}</p>
              <p className="text-xs text-surface-500">{pipelineStats.requisitions_rejected} rejected</p>
            </div>
          </div>
        </div>
      )}

      {/* Requisitions Table with HITL Filter */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-surface-900 flex items-center gap-2">
            <FileText className="text-primary-500" size={20} />
            Requisitions Status
          </h3>
          <div className="flex items-center gap-4">
            {/* Radio Button Filter */}
            <div className="flex items-center gap-4 bg-surface-100 rounded-lg p-1">
              <label className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer transition-colors ${
                hitlFilter === 'all' ? 'bg-white shadow-sm text-primary-600' : 'text-surface-600 hover:text-surface-900'
              }`}>
                <input
                  type="radio"
                  name="hitlFilter"
                  value="all"
                  checked={hitlFilter === 'all'}
                  onChange={() => setHitlFilter('all')}
                  className="sr-only"
                />
                <span className="text-sm font-medium">All</span>
              </label>
              <label className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer transition-colors ${
                hitlFilter === 'hitl' ? 'bg-warning-100 shadow-sm text-warning-700' : 'text-surface-600 hover:text-surface-900'
              }`}>
                <input
                  type="radio"
                  name="hitlFilter"
                  value="hitl"
                  checked={hitlFilter === 'hitl'}
                  onChange={() => setHitlFilter('hitl')}
                  className="sr-only"
                />
                <Filter size={14} />
                <span className="text-sm font-medium">HITL Pending</span>
                {pipelineStats && pipelineStats.requisitions_hitl_pending > 0 && (
                  <span className="bg-warning-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {pipelineStats.requisitions_hitl_pending}
                  </span>
                )}
              </label>
            </div>
          </div>
        </div>
        
        {/* Requisitions Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Requisition</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Department</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Amount</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Step</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Status</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-surface-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-surface-500">
                    {hitlFilter === 'hitl' ? 'No HITL pending items' : 'No requisitions found'}
                  </td>
                </tr>
              ) : (
                requisitions.map((req) => (
                  <tr 
                    key={req.id} 
                    className="border-b border-surface-100 hover:bg-surface-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedRequisition(req)}
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-surface-900">{req.number}</p>
                        <p className="text-sm text-surface-500 truncate max-w-xs">{req.description}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-surface-700">{req.department}</td>
                    <td className="py-3 px-4 font-medium text-surface-900">{formatCurrency(req.total_amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                          req.workflow_status === 'completed' ? 'bg-green-100 text-green-700' :
                          req.workflow_status === 'rejected' ? 'bg-red-100 text-red-700' :
                          req.workflow_status === 'hitl_pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {req.current_step}
                        </span>
                        <span className="text-xs text-surface-500 mt-1">{getStepName(req.current_step)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(req.workflow_status)}`}>
                        {getStatusDisplayText(req.workflow_status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        className="text-primary-500 hover:text-primary-700 p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequisition(req);
                        }}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* HITL Detail Sidebar */}
      {selectedRequisition && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedRequisition(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-surface-200">
                <h3 className="text-lg font-semibold text-surface-900">Requisition Details</h3>
                <button 
                  onClick={() => setSelectedRequisition(null)}
                  className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="bg-surface-50 rounded-lg p-4">
                  <p className="text-sm text-surface-500">Requisition Number</p>
                  <p className="text-lg font-semibold text-surface-900">{selectedRequisition.number}</p>
                </div>
                <div className="bg-surface-50 rounded-lg p-4">
                  <p className="text-sm text-surface-500">Requestor</p>
                  <p className="font-medium text-surface-900">{selectedRequisition.requestor_name}</p>
                  {selectedRequisition.requestor_id && (
                    <p className="text-xs text-surface-500 mt-1">{selectedRequisition.requestor_id}</p>
                  )}
                </div>
                <div className="bg-surface-50 rounded-lg p-4">
                  <p className="text-sm text-surface-500">Description</p>
                  <p className="text-surface-900">{selectedRequisition.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-50 rounded-lg p-4">
                    <p className="text-sm text-surface-500">Department</p>
                    <p className="font-medium text-surface-900">{selectedRequisition.department}</p>
                  </div>
                  <div className="bg-surface-50 rounded-lg p-4">
                    <p className="text-sm text-surface-500">Amount</p>
                    <p className="font-medium text-surface-900">{formatCurrency(selectedRequisition.total_amount)}</p>
                  </div>
                </div>

                {/* Centene Enterprise Procurement Section */}
                {(selectedRequisition.supplier_name || selectedRequisition.category) && (
                  <div className="border border-primary-200 bg-primary-25 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-primary-700 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                      </svg>
                      Enterprise Procurement Details
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedRequisition.category && (
                        <div>
                          <p className="text-xs text-surface-500">Category</p>
                          <p className="text-sm font-medium text-surface-900">{selectedRequisition.category}</p>
                        </div>
                      )}
                      {selectedRequisition.supplier_name && (
                        <div>
                          <p className="text-xs text-surface-500">Supplier</p>
                          <p className="text-sm font-medium text-surface-900">{selectedRequisition.supplier_name}</p>
                        </div>
                      )}
                      {selectedRequisition.supplier_status && (
                        <div>
                          <p className="text-xs text-surface-500">Supplier Status</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            selectedRequisition.supplier_status === 'preferred' ? 'bg-green-100 text-green-800' :
                            selectedRequisition.supplier_status === 'known' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedRequisition.supplier_status}
                          </span>
                        </div>
                      )}
                      {selectedRequisition.supplier_risk_score !== undefined && selectedRequisition.supplier_risk_score !== null && (
                        <div>
                          <p className="text-xs text-surface-500">Risk Score</p>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              selectedRequisition.supplier_risk_score < 40 ? 'bg-green-100 text-green-800' :
                              selectedRequisition.supplier_risk_score < 70 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {selectedRequisition.supplier_risk_score}
                            </span>
                            <span className="text-xs text-surface-500">/100</span>
                          </div>
                        </div>
                      )}
                      {selectedRequisition.cost_center && (
                        <div>
                          <p className="text-xs text-surface-500">Cost Center</p>
                          <p className="text-sm font-medium text-surface-900">{selectedRequisition.cost_center}</p>
                        </div>
                      )}
                      {selectedRequisition.gl_account && (
                        <div>
                          <p className="text-xs text-surface-500">GL Account</p>
                          <p className="text-sm font-medium text-surface-900">{selectedRequisition.gl_account}</p>
                        </div>
                      )}
                      {selectedRequisition.spend_type && (
                        <div>
                          <p className="text-xs text-surface-500">Spend Type</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            selectedRequisition.spend_type === 'OPEX' ? 'bg-purple-100 text-purple-800' :
                            selectedRequisition.spend_type === 'CAPEX' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {selectedRequisition.spend_type}
                          </span>
                        </div>
                      )}
                      {selectedRequisition.contract_on_file !== undefined && (
                        <div>
                          <p className="text-xs text-surface-500">Contract on File</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            selectedRequisition.contract_on_file ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedRequisition.contract_on_file ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                      {selectedRequisition.budget_impact && (
                        <div className="col-span-2">
                          <p className="text-xs text-surface-500">Budget Impact</p>
                          <p className="text-sm font-medium text-surface-900">{selectedRequisition.budget_impact}</p>
                        </div>
                      )}
                      {selectedRequisition.budget_available !== undefined && selectedRequisition.budget_available !== null && (
                        <div className="col-span-2">
                          <p className="text-xs text-surface-500">Budget Available</p>
                          <p className="text-sm font-medium text-surface-900">{formatCurrency(selectedRequisition.budget_available)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-primary-50 rounded-lg p-4 border border-primary-100">
                  <p className="text-sm text-primary-600 mb-2">Current Workflow Step</p>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                      selectedRequisition.workflow_status === 'completed' ? 'bg-green-100 text-green-700' :
                      selectedRequisition.workflow_status === 'rejected' ? 'bg-red-100 text-red-700' :
                      selectedRequisition.workflow_status === 'hitl_pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedRequisition.current_step}
                    </span>
                    <div>
                      <p className="font-semibold text-surface-900">{getStepName(selectedRequisition.current_step)}</p>
                      <p className="text-sm text-surface-500">of {TOTAL_STEPS} steps</p>
                    </div>
                  </div>
                </div>
                <div className={`rounded-lg p-4 border ${getStatusColor(selectedRequisition.workflow_status)}`}>
                  <p className="text-sm mb-1">Status</p>
                  <p className="font-semibold">{getStatusDisplayText(selectedRequisition.workflow_status)}</p>
                </div>
                {selectedRequisition.flagged_by && (
                  <div className="bg-warning-50 rounded-lg p-4 border border-warning-200">
                    <p className="text-sm text-warning-600 mb-2">Flagged for Human Review</p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-surface-500">Flagged By</p>
                        <p className="font-medium text-surface-900">{selectedRequisition.flagged_by}</p>
                      </div>
                      {selectedRequisition.flag_reason && (
                        <div>
                          <p className="text-xs text-surface-500">Reason</p>
                          <p className="text-surface-900">{selectedRequisition.flag_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-surface-500">Created</p>
                    <p className="text-surface-900">{formatDate(selectedRequisition.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-surface-500">Updated</p>
                    <p className="text-surface-900">{formatDate(selectedRequisition.updated_at)}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-surface-200">
                <button 
                  className="btn-primary w-full"
                  onClick={() => navigate(`/automation?requisition=${selectedRequisition.id}`)}
                >
                  View in Automation Pipeline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spend Trend Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-surface-900">Spend Trend</h3>
            <select className="select w-32">
              <option>6 months</option>
              <option>12 months</option>
              <option>YTD</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={spendTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis 
                stroke="#64748b" 
                fontSize={12}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelStyle={{ color: '#1e293b' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="spend" 
                stroke="#4169E1" 
                strokeWidth={2}
                dot={{ fill: '#4169E1', strokeWidth: 2 }}
                name="Total Spend"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Spend by Category Pie Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Spend by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={spendByCategory}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {spendByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {spendByCategory.map((category) => (
              <div key={category.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-surface-600">{category.name}</span>
                </div>
                <span className="font-medium text-surface-900">
                  {formatCurrency(category.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Payments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-surface-900">Upcoming Payments</h3>
            <button 
              onClick={() => navigate('/payments')}
              className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {metrics?.upcoming_payments && metrics.upcoming_payments.length > 0 ? (
              metrics.upcoming_payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                  <div>
                    <p className="font-medium text-surface-900">{payment.supplier_name}</p>
                    <p className="text-sm text-surface-500">{payment.number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-surface-900">{formatCurrency(payment.total_amount)}</p>
                    <p className="text-sm text-surface-500">Due {formatDate(payment.due_date)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-surface-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No upcoming payments</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-surface-900">Recent Activity</h3>
            <button className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1">
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  activity.action === 'approved' ? 'bg-success-100 text-success-600' :
                  activity.action === 'rejected' ? 'bg-danger-100 text-danger-600' :
                  'bg-primary-100 text-primary-600'
                }`}>
                  <TrendingUp size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-900">
                    <span className="font-medium">{activity.ref}</span> was {activity.action}
                  </p>
                  <p className="text-xs text-surface-500">
                    by {activity.by} • {formatRelativeTime(activity.time)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Health Panel */}
        {agentHealth && (
          <AgentHealthPanel
            status={agentHealth.status}
            agents={agentHealth.agents || []}
            lastChecked={agentHealth.timestamp}
            onRefresh={loadAgentHealth}
          />
        )}

        {/* Agent Activity Feed */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bot className="text-primary-500" size={20} />
              <h3 className="text-lg font-semibold text-surface-900">Agent Activity</h3>
              {isConnected && (
                <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse" title="Real-time connected" />
              )}
            </div>
          </div>
          <div className="space-y-3">
            {agentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-2 hover:bg-surface-50 rounded-lg transition-colors">
                <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-surface-900">{activity.agent}</p>
                    <AgentStatusBadge status={activity.status} />
                  </div>
                  <p className="text-sm text-surface-600">
                    {activity.action} - <span className="font-mono text-primary-600">{activity.document}</span>
                  </p>
                  <p className="text-xs text-surface-500">{formatRelativeTime(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* High Risk Invoices Alert */}
      {metrics?.high_risk_invoices && metrics.high_risk_invoices > 0 && (
        <div className="card bg-danger-50 border-danger-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-danger-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-danger-600" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-danger-900">
                {metrics.high_risk_invoices} High Risk Invoices Detected
              </h3>
              <p className="text-sm text-danger-700">
                These invoices have been flagged for potential fraud or compliance issues.
              </p>
            </div>
            <button 
              onClick={() => navigate('/invoices?risk=high')}
              className="btn-danger"
            >
              Review Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
