import React, { useState } from 'react';
import { 
  FileText, 
  Shield, 
  Scale, 
  CheckCircle2, 
  ShoppingCart, 
  Package, 
  Receipt, 
  CreditCard,
  Bot,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle,
  Clock,
  CheckCheck,
  XCircle,
  Sparkles
} from 'lucide-react';

export type WorkflowStage = 
  | 'requisition'
  | 'fraud_check'
  | 'compliance'
  | 'approval'
  | 'po'
  | 'receipt'
  | 'invoice'
  | 'payment'
  | 'complete';

export interface StageStatus {
  stage: WorkflowStage;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error' | 'flagged';
  timestamp?: Date;
  notes?: string;
}

interface WorkflowTrackerEnhancedProps {
  stages: StageStatus[];
  currentStage?: WorkflowStage;
  procurementType?: 'goods' | 'services';  // For dynamic labels
}

// Agent details for each stage
const AGENT_DETAILS: Record<WorkflowStage, {
  agentName: string;
  description: string;
  actions: string[];
  icon: React.ReactNode;
  color: string;
  gradient: string;
}> = {
  requisition: {
    agentName: 'Requisition Agent',
    description: 'Validates and processes purchase requests',
    actions: [
      'Validates required fields and data format',
      'Matches products from catalog',
      'Suggests preferred vendors',
      'Assigns GL accounts automatically',
      'Checks for duplicate requests'
    ],
    icon: <FileText className="h-6 w-6" />,
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600'
  },
  fraud_check: {
    agentName: 'Fraud Detection Agent',
    description: 'AI-powered fraud analysis and risk scoring',
    actions: [
      'Analyzes vendor risk profile',
      'Detects unusual purchase patterns',
      'Validates pricing against market data',
      'Checks for split-order fraud',
      'Calculates composite risk score'
    ],
    icon: <Shield className="h-6 w-6" />,
    color: 'red',
    gradient: 'from-red-500 to-rose-600'
  },
  compliance: {
    agentName: 'Compliance Agent',
    description: 'Ensures regulatory and policy compliance',
    actions: [
      'Validates against company policies',
      'Checks budget availability',
      'Verifies approval authority levels',
      'Ensures SOX compliance',
      'Validates tax documentation'
    ],
    icon: <Scale className="h-6 w-6" />,
    color: 'purple',
    gradient: 'from-purple-500 to-violet-600'
  },
  approval: {
    agentName: 'Approval Routing Agent',
    description: 'Intelligent approval workflow management',
    actions: [
      'Determines approval hierarchy',
      'Routes to appropriate approvers',
      'Handles escalation rules',
      'Manages delegation chains',
      'Triggers HITL when needed'
    ],
    icon: <CheckCircle2 className="h-6 w-6" />,
    color: 'green',
    gradient: 'from-green-500 to-emerald-600'
  },
  po: {
    agentName: 'PO Generation Agent',
    description: 'Automated purchase order creation',
    actions: [
      'Generates PO from approved requisition',
      'Assigns PO number sequence',
      'Calculates taxes and totals',
      'Applies contract terms',
      'Sends to supplier electronically'
    ],
    icon: <ShoppingCart className="h-6 w-6" />,
    color: 'indigo',
    gradient: 'from-indigo-500 to-indigo-600'
  },
  receipt: {
    agentName: 'Goods Receipt Agent',
    description: 'Validates delivery and quality',
    actions: [
      'Matches receipt to PO line items',
      'Validates quantity received',
      'Triggers quality inspection',
      'Updates inventory records',
      'Flags discrepancies for review'
    ],
    icon: <Package className="h-6 w-6" />,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-600'
  },
  invoice: {
    agentName: 'Invoice Processing Agent',
    description: 'Automated invoice matching and verification',
    actions: [
      'Performs 3-way match (PO, Receipt, Invoice)',
      'Extracts data via OCR/AI',
      'Validates supplier details',
      'Calculates payment terms',
      'Flags pricing discrepancies'
    ],
    icon: <Receipt className="h-6 w-6" />,
    color: 'teal',
    gradient: 'from-teal-500 to-cyan-600'
  },
  payment: {
    agentName: 'Payment Agent',
    description: 'Executes secure payment processing',
    actions: [
      'Validates payment authorization',
      'Processes ACH/Wire transfers',
      'Applies early payment discounts',
      'Updates financial ledgers',
      'Generates payment confirmation'
    ],
    icon: <CreditCard className="h-6 w-6" />,
    color: 'emerald',
    gradient: 'from-emerald-500 to-green-600'
  },
  complete: {
    agentName: 'Complete',
    description: 'Workflow completed successfully',
    actions: ['All steps completed'],
    icon: <CheckCheck className="h-6 w-6" />,
    color: 'green',
    gradient: 'from-green-500 to-emerald-600'
  }
};

const STAGE_ORDER: WorkflowStage[] = [
  'requisition',
  'fraud_check',
  'compliance',
  'approval',
  'po',
  'receipt',
  'invoice',
  'payment',
];

// Get agent details with dynamic labels based on procurement type
const getAgentDetails = (stage: WorkflowStage, procurementType: 'goods' | 'services' = 'goods') => {
  const baseDetails = AGENT_DETAILS[stage];
  
  if (stage === 'receipt' && procurementType === 'services') {
    return {
      ...baseDetails,
      agentName: 'Service Acceptance Agent',
      description: 'Validates service delivery and completion',
      actions: [
        'Verifies service completion against SOW',
        'Validates deliverables received',
        'Confirms service quality metrics',
        'Captures acceptance sign-off',
        'Flags discrepancies for review'
      ]
    };
  }
  
  if (stage === 'invoice' && procurementType === 'services') {
    return {
      ...baseDetails,
      agentName: 'Invoice Processing Agent',
      description: 'Automated invoice matching (2-way match for services)',
      actions: [
        'Performs 2-way match (PO ↔ Invoice)',
        'Validates service completion certificate',
        'Extracts data via OCR/AI',
        'Validates supplier details',
        'Calculates payment terms'
      ]
    };
  }
  
  return baseDetails;
};

export const WorkflowTrackerEnhanced: React.FC<WorkflowTrackerEnhancedProps> = ({ 
  stages, 
  currentStage,
  procurementType = 'goods'
}) => {
  const [expandedStage, setExpandedStage] = useState<WorkflowStage | null>(null);
  
  const stageMap = new Map(stages.map(s => [s.stage, s]));

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-gradient-to-br from-green-400 to-emerald-500',
          border: 'border-green-400',
          text: 'text-green-600',
          glow: 'shadow-green-400/50',
          badge: 'bg-green-100 text-green-700'
        };
      case 'in-progress':
        return {
          bg: 'bg-gradient-to-br from-blue-400 to-blue-500 animate-pulse',
          border: 'border-blue-400',
          text: 'text-blue-600',
          glow: 'shadow-blue-400/50',
          badge: 'bg-blue-100 text-blue-700'
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-br from-red-400 to-red-500',
          border: 'border-red-400',
          text: 'text-red-600',
          glow: 'shadow-red-400/50',
          badge: 'bg-red-100 text-red-700'
        };
      case 'flagged':
        return {
          bg: 'bg-gradient-to-br from-amber-400 to-orange-500',
          border: 'border-amber-400',
          text: 'text-amber-600',
          glow: 'shadow-amber-400/50',
          badge: 'bg-amber-100 text-amber-700'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-slate-200 to-slate-300',
          border: 'border-slate-300',
          text: 'text-slate-400',
          glow: '',
          badge: 'bg-slate-100 text-slate-500'
        };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCheck className="h-5 w-5 text-white" />;
      case 'in-progress':
        return <Zap className="h-5 w-5 text-white animate-bounce" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-white" />;
      case 'flagged':
        return <AlertTriangle className="h-5 w-5 text-white" />;
      default:
        return <Clock className="h-5 w-5 text-slate-500" />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">AI Agent Workflow</h3>
            <p className="text-sm text-slate-400">Automated P2P Processing Pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-600">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-slate-300">Powered by Bedrock Nova</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Background Line */}
        <div className="absolute top-8 left-8 right-8 h-0.5 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700" />
        
        {/* Progress Line */}
        <div 
          className="absolute top-8 left-8 h-0.5 bg-gradient-to-r from-green-400 via-emerald-400 to-blue-400 transition-all duration-700"
          style={{
            width: `${(stages.filter(s => s.status === 'completed').length / STAGE_ORDER.length) * 100}%`,
            maxWidth: 'calc(100% - 64px)'
          }}
        />

        {/* Stages */}
        <div className="grid grid-cols-8 gap-2">
          {STAGE_ORDER.map((stage, index) => {
            const stageData = stageMap.get(stage);
            const status = stageData?.status || 'pending';
            const styles = getStatusStyles(status);
            const agentInfo = getAgentDetails(stage, procurementType);
            const isExpanded = expandedStage === stage;
            const isCurrent = currentStage === stage;

            return (
              <div key={stage} className="flex flex-col items-center">
                {/* Node */}
                <button
                  onClick={() => setExpandedStage(isExpanded ? null : stage)}
                  className={`
                    relative z-10 h-16 w-16 rounded-2xl flex items-center justify-center
                    ${styles.bg} ${styles.glow} shadow-lg
                    transform transition-all duration-300 hover:scale-110
                    ${isCurrent ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900' : ''}
                  `}
                >
                  <div className="text-white">
                    {agentInfo.icon}
                  </div>
                  
                  {/* Status indicator */}
                  <div className={`
                    absolute -bottom-1 -right-1 h-6 w-6 rounded-full 
                    flex items-center justify-center
                    ${styles.bg} border-2 border-slate-900
                  `}>
                    {getStatusIcon(status)}
                  </div>
                </button>

                {/* Label */}
                <div className="mt-4 text-center">
                  <p className={`text-xs font-semibold ${status === 'pending' ? 'text-slate-500' : 'text-slate-200'}`}>
                    {agentInfo.agentName.replace(' Agent', '')}
                  </p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${styles.badge}`}>
                    {status.replace('-', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Expand/Collapse indicator */}
                <button
                  onClick={() => setExpandedStage(isExpanded ? null : stage)}
                  className="mt-2 p-1 rounded-full hover:bg-slate-700 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded Detail Panel */}
      {expandedStage && (() => {
        const expandedAgentInfo = getAgentDetails(expandedStage, procurementType);
        return (
        <div className="mt-8 animate-in slide-in-from-top duration-300">
          <div className={`
            relative overflow-hidden rounded-xl 
            bg-gradient-to-br ${expandedAgentInfo.gradient}
            p-0.5
          `}>
            <div className="bg-slate-900 rounded-xl p-6">
              <div className="flex items-start gap-4">
                {/* Agent Icon */}
                <div className={`p-4 rounded-xl bg-gradient-to-br ${expandedAgentInfo.gradient}`}>
                  <div className="text-white h-8 w-8">
                    {expandedAgentInfo.icon}
                  </div>
                </div>

                {/* Agent Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="h-4 w-4 text-slate-400" />
                    <h4 className="text-lg font-bold text-white">
                      {expandedAgentInfo.agentName}
                    </h4>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">
                    {expandedAgentInfo.description}
                  </p>

                  {/* Actions List */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Agent Actions
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {expandedAgentInfo.actions.map((action, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700"
                        >
                          <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${expandedAgentInfo.gradient}`} />
                          <span className="text-sm text-slate-300">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timestamp if available */}
                  {stageMap.get(expandedStage)?.timestamp && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        Processed: {stageMap.get(expandedStage)?.timestamp?.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
      })()}

      {/* Stats Summary */}
      <div className="mt-8 grid grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-1">
            <CheckCheck className="h-4 w-4 text-green-400" />
            <span className="text-xs text-slate-400">Completed</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stages.filter(s => s.status === 'completed').length}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-slate-400">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stages.filter(s => s.status === 'in-progress').length}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-400">Pending</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stages.filter(s => s.status === 'pending').length}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-slate-400">Flagged</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stages.filter(s => s.status === 'flagged' || s.status === 'error').length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkflowTrackerEnhanced;
