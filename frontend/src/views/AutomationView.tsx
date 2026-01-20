import { useState, useCallback, useEffect } from 'react';
import React from 'react';
import {
  FileText,
  Play,
  RotateCcw,
  Bot,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  User,
  Building2,
  DollarSign,
  Tag,
  Calendar,
  FileText as FileIcon,
  Zap,
  ThumbsUp,
  ThumbsDown,
  Pause,
  FastForward,
  SkipForward,
  CheckCircle,
  ShoppingCart,
  Truck,
  Receipt,
  FileCheck,
  CreditCard,
  Info,
  ChevronRight,
} from 'lucide-react';
import { EnhancedWorkflowFlow } from '../components/EnhancedWorkflowFlow';
import type { Requisition } from '../App';
import {
  runP2PWorkflow,
  getWorkflowStatus,
  approveWorkflowStep,
  getRequisition,
  type P2PWorkflowResponse,
  type P2PWorkflowStatusResponse,
} from '../utils/api';

// ============================================================================
// Agent Reasoning Display Component
// ============================================================================

type ReasoningVariant = 'info' | 'success' | 'warning' | 'danger';

interface AgentReasoningBoxProps {
  title: string;
  explanation?: string;
  bulletPoints?: string[];
  variant?: ReasoningVariant;
  verdict?: { label: string; value: string };
}

function AgentReasoningBox({ 
  title, 
  explanation, 
  bulletPoints, 
  variant = 'info',
  verdict 
}: AgentReasoningBoxProps) {
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  
  const variantStyles: Record<ReasoningVariant, { 
    bg: string; 
    border: string; 
    icon: string; 
    text: string;
    gradient: string;
    checkGradient: string;
    crossGradient: string;
  }> = {
    info: { 
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-50', 
      border: 'border-blue-400', 
      icon: 'text-blue-600', 
      text: 'text-blue-900',
      gradient: 'from-blue-500 to-indigo-600',
      checkGradient: 'from-blue-400 to-blue-600',
      crossGradient: 'from-blue-400 to-blue-600'
    },
    success: { 
      bg: 'bg-gradient-to-br from-emerald-50 to-teal-50', 
      border: 'border-emerald-400', 
      icon: 'text-emerald-600', 
      text: 'text-emerald-900',
      gradient: 'from-emerald-500 to-teal-600',
      checkGradient: 'from-emerald-400 to-emerald-600',
      crossGradient: 'from-red-400 to-red-600'
    },
    warning: { 
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50', 
      border: 'border-amber-400', 
      icon: 'text-amber-600', 
      text: 'text-amber-900',
      gradient: 'from-amber-500 to-orange-600',
      checkGradient: 'from-amber-400 to-amber-600',
      crossGradient: 'from-red-400 to-red-600'
    },
    danger: { 
      bg: 'bg-gradient-to-br from-red-50 to-rose-50', 
      border: 'border-red-400', 
      icon: 'text-red-600', 
      text: 'text-red-900',
      gradient: 'from-red-500 to-rose-600',
      checkGradient: 'from-emerald-400 to-emerald-600',
      crossGradient: 'from-red-400 to-red-600'
    },
  };
  
  const style = variantStyles[variant];
  
  // Categorize bullets by type
  const categorizedBullets = React.useMemo(() => {
    if (!bulletPoints || bulletPoints.length === 0) return { priority: [], details: [] };
    
    const priority: Array<{ text: string; type: 'check' | 'cross' | 'info' | 'warn' }> = [];
    const details: string[] = [];
    
    bulletPoints.forEach((bullet, idx) => {
      const isCheck = bullet.includes('[CHECK]') || bullet.includes('✓') || bullet.includes('PASSED');
      const isCross = bullet.includes('[ALERT]') || bullet.includes('❌') || bullet.includes('FAILED');
      const isWarn = bullet.includes('[WARN]') || bullet.includes('⚠');
      const isInfo = bullet.includes('[INFO]');
      
      // Extract clean text
      const cleanText = bullet
        .replace(/\[(CHECK|ALERT|INFO|WARN)\]\s*/gi, '')
        .replace(/[✓❌⚠️]\s*/g, '')
        .trim();
      
      // Top 8 priority items: CHECK, ALERT, WARN
      if (idx < 8 || isCheck || isCross || isWarn) {
        if (priority.length < 8) {
          priority.push({
            text: cleanText,
            type: isCheck ? 'check' : isCross ? 'cross' : isWarn ? 'warn' : 'info'
          });
        } else {
          details.push(cleanText);
        }
      } else {
        details.push(cleanText);
      }
    });
    
    return { priority, details };
  }, [bulletPoints]);
  
  // Extract verdict info
  const verdictInfo = React.useMemo(() => {
    if (!verdict) return null;
    
    const isApproved = verdict.value.includes('AUTO_APPROVE');
    const isHITL = verdict.value.includes('HITL_FLAG');
    const isValidated = verdict.value.includes('VALIDATED') || verdict.value.includes('VALID');
    
    return {
      isApproved,
      isHITL,
      icon: isApproved || isValidated ? '✓' : isHITL ? '⚠' : '✓',
      label: verdict.label || 'Verdict',
      value: verdict.value
    };
  }, [verdict]);
  
  return (
    <div className={`${style.bg} p-5 rounded-xl border ${style.border} shadow-lg mt-4 transition-all duration-300 hover:shadow-xl`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200/50">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-md`}>
          <Info size={20} className="text-white" />
        </div>
        <div>
          <h3 className={`text-sm font-bold uppercase tracking-wider ${style.text}`}>{title}</h3>
          {explanation && (
            <p className="text-xs text-slate-600 mt-0.5">{explanation}</p>
          )}
        </div>
      </div>
      
      {/* Top 8 Priority Items */}
      {categorizedBullets.priority.length > 0 && (
        <div className="grid grid-cols-1 gap-2 mb-4">
          {categorizedBullets.priority.map((item, idx) => (
            <div 
              key={idx} 
              className="flex items-start gap-3 p-2.5 bg-white/60 rounded-lg hover:bg-white/80 transition-all duration-200 group"
            >
              {/* Icon */}
              {item.type === 'check' && (
                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${style.checkGradient} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              )}
              {item.type === 'cross' && (
                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${style.crossGradient} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                  <span className="text-white text-xs font-bold">✗</span>
                </div>
              )}
              {item.type === 'warn' && (
                <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              )}
              {item.type === 'info' && (
                <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                  <span className="text-white text-xs font-bold">i</span>
                </div>
              )}
              
              {/* Text */}
              <span className="text-sm text-slate-700 leading-snug">{item.text}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* More Details (Collapsible) */}
      {categorizedBullets.details.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors group"
          >
            <ChevronRight 
              size={16} 
              className={`transition-transform duration-200 ${showMoreDetails ? 'rotate-90' : ''} group-hover:text-slate-800`}
            />
            <span>{showMoreDetails ? 'Hide' : 'Show'} More Details ({categorizedBullets.details.length})</span>
          </button>
          
          {showMoreDetails && (
            <div className="mt-3 pl-6 space-y-1.5 animate-fadeIn">
              {categorizedBullets.details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-slate-400 mt-1">•</span>
                  <span className="text-sm text-slate-600 leading-relaxed">{detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Verdict Box */}
      {verdictInfo && (
        <div className={`mt-5 p-4 rounded-lg border-2 ${verdictInfo.isApproved ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300' : verdictInfo.isHITL ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300'} shadow-md`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${verdictInfo.isApproved ? 'bg-gradient-to-br from-emerald-400 to-green-500' : verdictInfo.isHITL ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-blue-400 to-indigo-500'}`}>
                <span className="text-white text-lg font-bold">{verdictInfo.icon}</span>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{verdictInfo.label}</div>
                <div className={`text-sm font-bold ${verdictInfo.isApproved ? 'text-emerald-700' : verdictInfo.isHITL ? 'text-amber-700' : 'text-blue-700'}`}>
                  {verdictInfo.value}
                </div>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${verdictInfo.isApproved ? 'bg-emerald-100 text-emerald-700' : verdictInfo.isHITL ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'} shadow-sm`}>
              {verdictInfo.isApproved ? 'APPROVED' : verdictInfo.isHITL ? 'REVIEW REQUIRED' : 'INFO'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Key Checks Display Component (for Step 2 Approval Agent)
// ============================================================================

import type { KeyCheck, ChecksSummary } from '../utils/api';

interface KeyChecksDisplayProps {
  keyChecks: KeyCheck[];
  checksSummary: ChecksSummary;
  verdict?: { label: string; value: string };
}

function KeyChecksDisplay({ keyChecks, checksSummary, verdict }: KeyChecksDisplayProps) {
  // Determine overall status color based on summary
  const getStatusColor = (status: 'pass' | 'fail' | 'attention') => {
    switch (status) {
      case 'pass': return 'emerald';
      case 'fail': return 'red';
      case 'attention': return 'amber';
      default: return 'slate';
    }
  };

  const getStatusIcon = (status: 'pass' | 'fail' | 'attention') => {
    switch (status) {
      case 'pass': return '✓';
      case 'fail': return '✗';
      case 'attention': return '!';
      default: return '?';
    }
  };

  const overallColor = checksSummary.failed > 0 ? 'red' : 
                       checksSummary.attention > 0 ? 'amber' : 'emerald';

  return (
    <div className={`bg-gradient-to-br from-slate-50 to-${overallColor}-50/30 p-5 rounded-xl border border-${overallColor}-200 shadow-lg mt-4`}>
      {/* Header with Summary */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md`}>
            <CheckCircle2 size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Approval Checks Summary
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {checksSummary.passed}/{checksSummary.total} checks passed
              {checksSummary.attention > 0 && ` • ${checksSummary.attention} need attention`}
              {checksSummary.failed > 0 && ` • ${checksSummary.failed} failed`}
            </p>
          </div>
        </div>
        
        {/* Quick Status Badges */}
        <div className="flex gap-2">
          <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
            {checksSummary.passed} ✓
          </span>
          {checksSummary.attention > 0 && (
            <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
              {checksSummary.attention} !
            </span>
          )}
          {checksSummary.failed > 0 && (
            <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
              {checksSummary.failed} ✗
            </span>
          )}
        </div>
      </div>
      
      {/* 6 Key Checks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {keyChecks.map((check) => {
          const color = getStatusColor(check.status);
          const icon = getStatusIcon(check.status);
          
          return (
            <div 
              key={check.id} 
              className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                check.status === 'pass' 
                  ? 'bg-emerald-50/80 border-emerald-200 hover:bg-emerald-50' 
                  : check.status === 'fail'
                    ? 'bg-red-50/80 border-red-200 hover:bg-red-50'
                    : 'bg-amber-50/80 border-amber-200 hover:bg-amber-50'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                  check.status === 'pass' 
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' 
                    : check.status === 'fail'
                      ? 'bg-gradient-to-br from-red-400 to-red-600'
                      : 'bg-gradient-to-br from-amber-400 to-orange-500'
                }`}>
                  <span className="text-white text-sm font-bold">{icon}</span>
                </div>
                
                {/* Check Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wide ${
                      check.status === 'pass' ? 'text-emerald-700' :
                      check.status === 'fail' ? 'text-red-700' : 'text-amber-700'
                    }`}>
                      {check.name}
                    </span>
                  </div>
                  <p className={`text-sm leading-snug ${
                    check.status === 'pass' ? 'text-emerald-800' :
                    check.status === 'fail' ? 'text-red-800' : 'text-amber-800'
                  }`}>
                    {check.detail}
                  </p>
                  
                  {/* Sub-items (optional) */}
                  {check.items && check.items.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {check.items.map((item, idx) => (
                        <span 
                          key={idx}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                            item.passed 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : item.required === false
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          <span className="font-medium">{item.passed ? '✓' : item.required === false ? '–' : '✗'}</span>
                          {item.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Verdict Box */}
      {verdict && (
        <div className={`mt-4 p-4 rounded-lg border-2 shadow-md ${
          verdict.value.includes('AUTO_APPROVE') 
            ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300' 
            : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${
                verdict.value.includes('AUTO_APPROVE')
                  ? 'bg-gradient-to-br from-emerald-400 to-green-500'
                  : 'bg-gradient-to-br from-amber-400 to-orange-500'
              }`}>
                <span className="text-white text-lg font-bold">
                  {verdict.value.includes('AUTO_APPROVE') ? '✓' : '⚠'}
                </span>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {verdict.label}
                </div>
                <div className={`text-sm font-bold ${
                  verdict.value.includes('AUTO_APPROVE') ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {verdict.value}
                </div>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
              verdict.value.includes('AUTO_APPROVE')
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {verdict.value.includes('AUTO_APPROVE') ? 'APPROVED' : 'REVIEW REQUIRED'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to determine variant from status/result
function getVariantFromResult(flagged?: boolean, status?: ExecutionStatus): ReasoningVariant {
  if (flagged) return 'warning';
  if (status === 'error') return 'danger';
  if (status === 'completed') return 'success';
  return 'info';
}

// ============================================================================
// Types
// ============================================================================

interface StepInfo {
  id: number;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  details: StepDetail[];
}

interface StepDetail {
  type: 'option' | 'action' | 'outcome';
  text: string;
  isLast?: boolean;
  subItems?: string[];
}

type ExecutionStatus = 'not-started' | 'in-progress' | 'completed' | 'error' | 'waiting-approval';

interface ExecutionStep {
  id: number;
  name: string;
  status: ExecutionStatus;
  message?: string;
  agentNotes?: string[];
  resultData?: Record<string, any>; // Real agent findings from Bedrock
  flagged?: boolean;
  flagReason?: string;
}

// ============================================================================
// Step Information Data (Informative - Not Status)
// ============================================================================

// Helper function to get dynamic step labels based on procurement type
function getReceiptStepLabel(procurementType: 'goods' | 'services' = 'goods'): string {
  return procurementType === 'services' ? 'Service Acceptance' : 'Goods Receipt';
}

// Function to generate step info with dynamic labels
function getStepInfo(procurementType: 'goods' | 'services' = 'goods'): StepInfo[] {
  const receiptLabel = getReceiptStepLabel(procurementType);
  const isServices = procurementType === 'services';
  
  return [
  {
    id: 1,
    name: 'Requisition',
    icon: FileText,
    description: 'The procurement process begins with creating a purchase requisition. Users have multiple options to initiate this request.',
    details: [
      { type: 'option', text: 'Option A: Human creates requisition manually by filling out the form' },
      { type: 'option', text: 'Option B: Human leverages AI assistant chatbot and AI fills the form automatically based on natural language input' },
      { type: 'option', text: 'Option C: Human selects an existing requisition from the dashboard to process', isLast: true },
    ],
  },
  {
    id: 2,
    name: 'Approval Check',
    icon: CheckCircle,
    description: 'The Approval Agent analyzes the requisition to determine if it meets company policies and thresholds.',
    details: [
      { 
        type: 'action', 
        text: 'Agent analyzes requisition for:',
        subItems: [
          'Amount thresholds - checks if amount requires manager/director/VP approval',
          'Duplicate detection - scans recent requisitions for similar requests',
          'Vendor risk assessment - evaluates supplier reliability and compliance',
          'Policy compliance - validates against procurement policies and budget limits',
        ]
      },
      { type: 'outcome', text: 'IF issues detected → FLAG for Human-in-the-Loop (HITL) review' },
      { type: 'outcome', text: 'IF clean → AUTO-APPROVE ✓ and proceed to PO generation', isLast: true },
    ],
  },
  {
    id: 3,
    name: 'PO Generation',
    icon: ShoppingCart,
    description: 'The PO Agent automatically generates a Purchase Order from the approved requisition.',
    details: [
      { type: 'action', text: 'Agent generates Purchase Order with:',
        subItems: [
          'Line items extracted from requisition',
          'Supplier details and contact information',
          'Payment terms and delivery requirements',
          'Compliance validation against contract terms',
        ]
      },
      { type: 'outcome', text: 'IF issues (missing supplier data, invalid terms, contract violations) → FLAG for HITL review' },
      { type: 'outcome', text: 'IF clean → AUTO-GENERATE PO & send to supplier ✓', isLast: true },
    ],
  },
  {
    id: 4,
    name: receiptLabel,
    icon: Truck,
    description: isServices
      ? 'The Service Acceptance Agent validates service delivery and completion.'
      : 'The Receiving Agent validates incoming goods against the Purchase Order.',
    details: isServices
      ? [
          { type: 'action', text: 'Agent validates service acceptance:',
            subItems: [
              'Service completion - verifies deliverables against SOW',
              'Quality verification - meets acceptance criteria',
              'Timeline review - delivery against milestones',
              'Documentation check - completion certificates',
            ]
          },
          { type: 'outcome', text: 'IF discrepancies (incomplete service, quality issues) → FLAG for HITL review' },
          { type: 'outcome', text: 'IF completed → AUTO-CONFIRM acceptance ✓', isLast: true },
        ]
      : [
          { type: 'action', text: 'Agent validates goods receipt:',
            subItems: [
              'Quantity matching - received qty vs ordered qty',
              'Quality verification - condition and specifications',
              'Delivery timeline - actual vs expected dates',
              'Damage assessment - identifies any shipping issues',
            ]
          },
          { type: 'outcome', text: 'IF discrepancies (wrong qty, damaged goods, late delivery) → FLAG for HITL review' },
          { type: 'outcome', text: 'IF matched → AUTO-CONFIRM receipt ✓', isLast: true },
        ],
  },
  {
    id: 5,
    name: 'Invoice Validation',
    icon: Receipt,
    description: isServices
      ? 'The Invoice Agent performs 2-Way Matching (PO ↔ Invoice) for services.'
      : 'The Invoice Agent performs 3-Way Matching to validate the invoice against requisition and PO.',
    details: isServices
      ? [
          { type: 'action', text: '2-WAY MATCH validation (services):',
            subItems: [
              'PO ↔ Invoice: Confirms billed amounts match PO terms',
              'Service Acceptance: Validates completion certificate',
              'Timesheet verification (if applicable)',
              'Tolerance checks: Applies configurable variance thresholds',
            ]
          },
          { type: 'outcome', text: 'IF mismatch detected (price variance, missing acceptance) → FLAG for HITL review' },
          { type: 'outcome', text: 'IF fully matched → AUTO-VALIDATE invoice ✓', isLast: true },
        ]
      : [
          { type: 'action', text: '3-WAY MATCH validation:',
            subItems: [
              'Requisition ↔ PO: Validates items, quantities, and prices match',
              'PO ↔ Invoice: Confirms billed amounts match PO terms',
              'Invoice ↔ Goods Receipt: Ensures billed items were actually received',
              'Tolerance checks: Applies configurable variance thresholds',
            ]
          },
      { type: 'outcome', text: 'IF mismatch detected (price variance, qty discrepancy, missing items) → FLAG for HITL review' },
      { type: 'outcome', text: 'IF fully matched → AUTO-VALIDATE invoice ✓', isLast: true },
    ],
  },
  {
    id: 6,
    name: 'Fraud Analysis',
    icon: AlertTriangle,
    description: 'The Fraud Agent analyzes the transaction for potential fraud indicators using AI pattern recognition.',
    details: [
      { type: 'action', text: 'AI Fraud Detection analyzes:',
        subItems: [
          'Duplicate invoice detection across vendor history',
          'Price anomaly detection vs market rates',
          'Vendor risk scoring based on historical patterns',
          'Unusual timing or frequency of transactions',
          'Shell company indicators and address verification',
        ]
      },
      { type: 'outcome', text: 'IF fraud indicators detected (score > threshold) → FLAG for HITL review' },
      { type: 'outcome', text: 'IF clean → PASS fraud check ✓', isLast: true },
    ],
  },
  {
    id: 7,
    name: 'Compliance Check',
    icon: FileCheck,
    description: 'The Compliance Agent verifies SOX compliance, audit trail, and regulatory requirements.',
    details: [
      { type: 'action', text: 'Compliance validation includes:',
        subItems: [
          'Segregation of duties verification',
          'Approval authority validation',
          'Contract compliance review',
          'Regulatory requirement checks (SOX, FCPA)',
          'Audit trail completeness verification',
        ]
      },
      { type: 'outcome', text: 'IF compliance violations found → FLAG for HITL review' },
      { type: 'outcome', text: 'IF compliant → PASS compliance ✓', isLast: true },
    ],
  },
  {
    id: 8,
    name: 'Final Approval',
    icon: CheckCircle2,
    description: 'ALWAYS PAUSES HERE - Human reviewer sees comprehensive summary and must approve or reject.',
    details: [
      { type: 'action', text: 'Summary Report includes:',
        subItems: isServices
          ? [
              '• Requisition details & approval chain',
              '• PO generation status',
              '• Service acceptance confirmation',
              '• 2-way match results (PO ↔ Invoice)',
              '• Fraud risk score: LOW/MEDIUM/HIGH',
              '• Compliance check status',
              '• All previous agent recommendations',
            ]
          : [
              '• Requisition details & approval chain',
              '• PO generation status',
              '• Goods receipt confirmation',
              '• 3-way match results',
              '• Fraud risk score: LOW/MEDIUM/HIGH',
              '• Compliance check status',
              '• All previous agent recommendations',
            ],
      },
      { type: 'outcome', text: '⏸ WORKFLOW PAUSES - User must APPROVE, REJECT, or REVIEW LATER', isLast: true },
    ],
  },
  {
    id: 9,
    name: 'Payment',
    icon: CreditCard,
    description: 'After Final Approval, Payment Agent connects to bank via secure token and executes payment.',
    details: [
      { type: 'action', text: 'Payment execution:',
        subItems: [
          'Connect to bank API via secure token',
          'Validate supplier banking details',
          'Execute ACH/Wire transfer',
          'Generate transaction confirmation ID',
          'Update ledger and send confirmation',
        ]
      },
      { type: 'outcome', text: '💳 Payment processed and confirmed ✓', isLast: true },
    ],
  },
  ];
}

// ============================================================================
// Props
// ============================================================================

// Helper function to get initial execution steps
function getInitialExecutionSteps(procurementType: 'goods' | 'services' = 'goods'): ExecutionStep[] {
  const receiptLabel = getReceiptStepLabel(procurementType);
  return [
    { id: 1, name: 'Requisition', status: 'not-started' },
    { id: 2, name: 'Approval Check', status: 'not-started' },
    { id: 3, name: 'PO Generation', status: 'not-started' },
    { id: 4, name: receiptLabel, status: 'not-started' },
    { id: 5, name: 'Invoice Validation', status: 'not-started' },
    { id: 6, name: 'Fraud Analysis', status: 'not-started' },
    { id: 7, name: 'Compliance Check', status: 'not-started' },
    { id: 8, name: 'Final Approval', status: 'not-started' },
    { id: 9, name: 'Payment', status: 'not-started' },
  ];
}

interface AutomationViewProps {
  selectedRequisition?: Requisition | null;
  onClearRequisition?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function AutomationView({ selectedRequisition, onClearRequisition }: AutomationViewProps) {
  // Selected informative step (for detail panel)
  const [selectedInfoStep, setSelectedInfoStep] = useState<number>(1);
  
  // Local state for full requisition data (when loaded from URL)
  const [loadedRequisition, setLoadedRequisition] = useState<Requisition | null>(null);
  
  // Use either the passed prop or the locally loaded one
  const effectiveRequisition = loadedRequisition || selectedRequisition;
  
  // Derive procurement type from requisition
  const procurementType = (effectiveRequisition?.procurement_type || 'goods') as 'goods' | 'services';
  
  // Get dynamic step info based on procurement type
  const STEP_INFO = getStepInfo(procurementType);
  
  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [expandedStepId, setExpandedStepId] = useState<number | null>(null); // Track which step accordion is open
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>(getInitialExecutionSteps());
  const [currentExecutionStep, setCurrentExecutionStep] = useState<number>(0);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [overallProgress, setOverallProgress] = useState<number>(0); // 0-100 overall progress
  const [stepProgress, setStepProgress] = useState<number>(0); // 0-100 for current step
  
  // Step-by-step workflow state
  const [runMode, setRunMode] = useState<'all' | 'step'>('all'); // 'all' = run all (default), 'step' = step-by-step
  const [workflowStatus, setWorkflowStatus] = useState<P2PWorkflowStatusResponse | null>(null);
  const [pendingApprovalStep, setPendingApprovalStep] = useState<number | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Add log entry - defined early so it can be used in useEffect
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setExecutionLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);
  
  // Update step names when procurement type changes
  useEffect(() => {
    setExecutionSteps(prev => prev.map(step => 
      step.id === 4 
        ? { ...step, name: getReceiptStepLabel(procurementType) }
        : step
    ));
  }, [procurementType]);

  // Load workflow status when requisition changes
  useEffect(() => {
    if (!selectedRequisition) {
      setWorkflowStatus(null);
      setPendingApprovalStep(null);
      return;
    }
    
    // Extract numeric ID
    let reqId: number;
    if (typeof selectedRequisition.id === 'string') {
      const match = selectedRequisition.id.match(/(\d+)$/);
      reqId = match ? parseInt(match[1], 10) : 1;
    } else {
      reqId = selectedRequisition.id;
    }
    
    // Helper function to mark step 1 as complete (requisition is always valid when coming here)
    const markStep1Complete = () => {
      setExecutionSteps(prev => prev.map(step => 
        step.id === 1 
          ? { 
              ...step, 
              status: 'completed' as ExecutionStatus,
              agentNotes: ['Requisition validated and ready for P2P workflow'],
              resultData: {
                requisition_id: selectedRequisition.id,
                title: selectedRequisition.title,
                amount: selectedRequisition.amount,
              }
            } 
          : step
      ));
      setCurrentExecutionStep(2); // Always start from step 2
      setOverallProgress(11); // 1/9 = ~11%
      addLog('✓ Step 1: Requisition Validation - Completed (requisition loaded from dashboard)');
      addLog('📋 Ready to start Step 2: Approval Check');
    };

    // Fetch current workflow status
    getWorkflowStatus(reqId)
      .then(status => {
        setWorkflowStatus(status);
        
        // If workflow exists and is past step 1, use its state
        if (status.current_step > 1) {
          setCurrentExecutionStep(status.current_step);
          
          // Update execution steps based on status
          setExecutionSteps(prev => prev.map(step => {
            if (step.id < status.current_step) {
              return { ...step, status: 'completed' as ExecutionStatus };
            } else if (step.id === status.current_step) {
              if (status.step_status === 'pending_approval') {
                setPendingApprovalStep(step.id);
                return { ...step, status: 'waiting-approval' as ExecutionStatus };
              }
              return { ...step, status: 'in-progress' as ExecutionStatus };
            }
            return step;
          }));
          
          // Calculate overall progress
          const totalSteps = 9;
          const completedSteps = status.current_step - 1;
          const progressPercent = Math.round((completedSteps / totalSteps) * 100);
          setOverallProgress(progressPercent);
          
          addLog(`📊 Loaded workflow state: Step ${status.current_step} (${status.step_name}) - ${status.step_status}`);
          if (status.step_status === 'pending_approval') {
            addLog('⏸ Workflow paused - awaiting your approval to continue');
          }
        } else {
          // Workflow is at step 1 or not started - mark step 1 complete
          markStep1Complete();
        }
      })
      .catch(() => {
        // No existing workflow state - check if requisition needs HITL approval based on its currentStep
        setWorkflowStatus(null);
        
        // If requisition has a currentStep > 1 and is not completed/rejected, show HITL approval at that step
        const reqStatus = selectedRequisition.status;
        const reqStep = selectedRequisition.currentStep || 1;
        
        if (reqStep > 1 && reqStep < 9 && reqStatus !== 'rejected' && reqStatus !== 'completed') {
          // Mark previous steps as completed
          setExecutionSteps(prev => prev.map(step => {
            if (step.id < reqStep) {
              return { ...step, status: 'completed' as ExecutionStatus };
            } else if (step.id === reqStep) {
              setPendingApprovalStep(step.id);
              return { ...step, status: 'waiting-approval' as ExecutionStatus };
            }
            return step;
          }));
          setCurrentExecutionStep(reqStep);
          const progressPercent = Math.round(((reqStep - 1) / 9) * 100);
          setOverallProgress(progressPercent);
          addLog(`📊 Requisition at Step ${reqStep} - HITL Approval Required`);
          addLog('⏸ Awaiting your approval to continue the workflow');
        } else {
          // No workflow state and no pending approval - mark step 1 as complete
          markStep1Complete();
        }
      });
  }, [selectedRequisition, addLog]);

  // Load full requisition data if only ID was provided (from URL)
  useEffect(() => {
    if (!selectedRequisition) return;
    
    // If title is still "Loading..." it means we got the ID from URL but not full data
    if (selectedRequisition.title !== 'Loading...') return;
    
    let reqId: number;
    if (typeof selectedRequisition.id === 'string') {
      const match = selectedRequisition.id.match(/(\d+)$/);
      reqId = match ? parseInt(match[1], 10) : 1;
    } else {
      reqId = selectedRequisition.id as number;
    }
    
    getRequisition(reqId)
      .then(fullReq => {
        // Convert API response to component type
        // Map urgency to valid priority values
        const urgencyToPriority = (urgency: string | undefined): 'low' | 'medium' | 'high' | 'urgent' => {
          const u = (urgency || 'medium').toLowerCase();
          if (u === 'urgent' || u === 'critical') return 'urgent';
          if (u === 'high') return 'high';
          if (u === 'medium' || u === 'standard' || u === 'normal') return 'medium';
          if (u === 'low') return 'low';
          return 'medium';
        };
        const converted: any = {
          id: fullReq.number || selectedRequisition.id,  // Use formatted number (e.g., "REQ-000031")
          title: fullReq.title || fullReq.description?.substring(0, 50) || 'Requisition',
          requestor: fullReq.requestor_name || 'James Wilson',
          department: fullReq.department || 'Operations',
          amount: typeof fullReq.total_amount === 'string' ? parseFloat(fullReq.total_amount) : (fullReq.total_amount || 0),
          status: (fullReq.status || 'pending').toLowerCase() as any,
          priority: urgencyToPriority(fullReq.urgency),
          createdAt: fullReq.created_at || new Date().toISOString(),
          supplier: fullReq.supplier_name || 'Not Assigned',
          category: fullReq.category || 'General',
          currentStep: fullReq.current_stage ? parseInt(fullReq.current_stage.split('_')[1] || '1') : 1,
          description: fullReq.description || '',
          justification: fullReq.justification || '',
          // Procurement type (goods or services)
          procurement_type: fullReq.procurement_type || 'goods',
          // Centene Enterprise Procurement Fields
          cost_center: fullReq.cost_center,
          gl_account: fullReq.gl_account,
          spend_type: fullReq.spend_type,
          supplier_risk_score: fullReq.supplier_risk_score,
          supplier_status: fullReq.supplier_status,
          contract_on_file: fullReq.contract_on_file,
          budget_available: fullReq.budget_available,
          budget_impact: fullReq.budget_impact,
        };
        
        setLoadedRequisition(converted);
        addLog(`✓ Loaded full requisition data for ${fullReq.number}`);
      })
      .catch(err => {
        console.error('Failed to load requisition:', err);
        addLog(`❌ Failed to load requisition ${reqId}`);
      });
  }, [selectedRequisition?.id, addLog]);

  // Reset execution state
  const resetExecution = useCallback(() => {
    setIsRunning(false);
    setCurrentExecutionStep(0);
    setPendingApprovalStep(null);
    setWorkflowStatus(null);
    setStepProgress(0);
    setExecutionSteps(getInitialExecutionSteps(procurementType));
    setExecutionLogs([]);
  }, [procurementType]);

  // Update step status helper
  const updateStepStatus = useCallback((
    stepId: number, 
    status: ExecutionStatus, 
    message?: string, 
    agentNotes?: string[],
    resultData?: Record<string, any>,
    flagged?: boolean,
    flagReason?: string,
  ) => {
    setExecutionSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, message, agentNotes, resultData, flagged, flagReason } 
        : step
    ));
  }, []);

  // Run the P2P Engine using real AWS Bedrock agents
  const runP2PEngine = useCallback(async (startFromStep: number = 1) => {
    if (!selectedRequisition) return;
    
    // HITL Enforcement: Check if any previous step is flagged and waiting approval
    const flaggedStep = executionSteps.find(
      step => step.id < startFromStep && 
              (step.status === 'waiting-approval' || step.flagged)
    );
    
    if (flaggedStep) {
      alert(`⚠️ HITL Approval Required\n\nStep ${flaggedStep.id} (${flaggedStep.name}) requires your approval before continuing.\n\nPlease approve or reject the flagged step first.`);
      setPendingApprovalStep(flaggedStep.id);
      return;
    }
    
    // Extract numeric ID from requisition (e.g., "REQ-000006" -> 6)
    let reqId: number;
    if (typeof selectedRequisition.id === 'string') {
      // Match the last number segment in the ID (after the last hyphen)
      const match = selectedRequisition.id.match(/(\d+)$/);
      reqId = match ? parseInt(match[1], 10) : 1;
    } else {
      reqId = selectedRequisition.id;
    }
    
    setIsRunning(true);
    setPendingApprovalStep(null);
    
    const isStepMode = runMode === 'step';
    
    addLog('═══════════════════════════════════════════');
    addLog(`🚀 Starting P2P Engine for: ${selectedRequisition.title}`);
    addLog(`📋 Requisition ID: ${selectedRequisition.id}`);
    addLog(`🔄 Mode: ${isStepMode ? 'Step-by-Step (pauses for approval)' : 'Run All Steps'}`);
    addLog(`📍 Starting from Step: ${startFromStep}`);
    addLog('🤖 Connecting to AWS Bedrock Nova Pro LLM...');
    addLog('═══════════════════════════════════════════');
    
    // If starting from step 1, reset all steps; otherwise keep completed steps
    if (startFromStep === 1) {
      setExecutionSteps(prev => prev.map(s => ({ ...s, status: 'not-started' as ExecutionStatus, agentNotes: undefined })));
    }
    
    try {
      // Show current step as in-progress
      setCurrentExecutionStep(startFromStep);
      const receiptLabel = getReceiptStepLabel(procurementType);
      const stepNames = ['', 'Requisition Validation', 'Approval Check', 'PO Generation', receiptLabel, 'Invoice Validation', 'Fraud Analysis', 'Compliance Check', 'Final Approval', 'Payment'];
      updateStepStatus(startFromStep, 'in-progress');
      addLog(`⏳ Step ${startFromStep}: ${stepNames[startFromStep]} - Processing with Bedrock Agent...`);
      
      // Start progress animation - smooth progress with faster updates
      setStepProgress(0);
      const progressInterval = setInterval(() => {
        setStepProgress(prev => {
          if (prev >= 92) return prev; // Cap at 92% until API responds
          return prev + Math.random() * 1.5 + 0.5; // Smaller, smoother increments (0.5-2%)
        });
      }, 200); // 200ms intervals for smoother animation
      
      // Call the API with step-by-step mode parameters
      addLog('📡 Calling P2P Workflow API...');
      const response: P2PWorkflowResponse = await runP2PWorkflow(reqId, startFromStep, isStepMode);
      
      // Stop progress animation and set to 100%
      clearInterval(progressInterval);
      setStepProgress(100);
      
      // Update all steps based on API response with visual delays (5-11 seconds per step)
      addLog('');
      addLog('═══════════════════════════════════════════');
      addLog('📊 REAL LLM AGENT RESULTS:');
      addLog('═══════════════════════════════════════════');
      
      // Process steps with visual delay to show progression
      for (let i = 0; i < response.steps.length; i++) {
        const step = response.steps[i];
        const status: ExecutionStatus = step.status === 'completed' ? 'completed' 
          : step.status === 'error' ? 'error' 
          : step.flagged ? 'waiting-approval' 
          : 'completed';
        
        // Show step as in-progress first
        setCurrentExecutionStep(step.step_id);
        updateStepStatus(step.step_id, 'in-progress');
        setStepProgress(0);
        
        // Animate progress for 5-11 seconds randomly
        const stepDuration = 5000 + Math.random() * 6000; // 5-11 seconds
        const progressSteps = 20;
        const progressInterval = stepDuration / progressSteps;
        
        for (let p = 0; p < progressSteps; p++) {
          await new Promise(resolve => setTimeout(resolve, progressInterval));
          setStepProgress(((p + 1) / progressSteps) * 100);
        }
        
        // Mark step as complete with full data
        // Convert snake_case result_data to camelCase resultData for TypeScript
        updateStepStatus(
          step.step_id, 
          status, 
          step.flag_reason, 
          step.agent_notes,
          step.result_data || step.resultData, // Support both snake_case and camelCase
          step.flagged,
          step.flag_reason,
        );
        
        // If step is flagged, set pending approval and stop processing
        if (step.flagged || step.status === 'error') {
          setPendingApprovalStep(step.step_id);
        }
        
        // Log each step's results
        addLog(`${step.status === 'completed' && !step.flagged ? '✓' : step.flagged ? '⚠' : '❌'} Step ${step.step_id}: ${step.step_name} (${step.agent_name})`);
        step.agent_notes.forEach(note => {
          addLog(`   ${note}`);
        });
        if (step.flagged && step.flag_reason) {
          addLog(`   ⚠️ FLAG: ${step.flag_reason}`);
        }
        addLog(`   ⏱️ Execution time: ${step.execution_time_ms}ms`);
      }
      
      // Calculate and update overall progress
      const completedCount = response.steps.filter(s => s.status === 'completed' && !s.flagged).length;
      const progressPercent = Math.round((completedCount / 9) * 100);
      setOverallProgress(Math.max(progressPercent, (response.current_step / 9) * 100));
      
      addLog('');
      addLog('═══════════════════════════════════════════');
      
      // Log overall results
      response.overall_notes.forEach(note => addLog(note));
      
      if (response.flagged_issues.length > 0) {
        addLog('');
        addLog('⚠️ FLAGGED ISSUES:');
        response.flagged_issues.forEach(issue => addLog(`   • ${issue}`));
      }
      
      addLog('');
      addLog(`📈 Workflow Status: ${response.status.toUpperCase()}`);
      addLog(`📍 Current Step: ${response.current_step} of ${response.total_steps}`);
      addLog(`⏱️ Total Execution Time: ${response.execution_time_ms}ms`);
      addLog(`🔑 Workflow ID: ${response.workflow_id}`);
      addLog('═══════════════════════════════════════════');
      
      if (response.status === 'completed') {
        // Check if payment was processed (step 9 completed)
        const paymentStep = response.steps.find(s => s.step_id === 9);
        if (paymentStep?.result_data?.confirmation_message) {
          addLog('');
          addLog('💳 ══════════════════════════════════════════════');
          addLog(paymentStep.result_data.confirmation_message);
          addLog('💳 ══════════════════════════════════════════════');
        }
        addLog('');
        addLog('🎉 P2P Process completed successfully with REAL LLM agents!');
        setPendingApprovalStep(null);
      } else if (response.status === 'awaiting_final_approval') {
        // Special handling for Final Approval step
        setPendingApprovalStep(8);
        addLog('');
        addLog('═══════════════════════════════════════════');
        addLog('⏸ FINAL APPROVAL REQUIRED');
        addLog('═══════════════════════════════════════════');
        addLog('All agent checks have passed. Please review and:');
        addLog('   ✓ APPROVE to proceed with payment');
        addLog('   ✗ REJECT to cancel the transaction');
        addLog('   ⏸ REVIEW LATER to save for later review');
        addLog('═══════════════════════════════════════════');
      } else if (response.status === 'needs_approval') {
        addLog('');
        addLog('⏸ WORKFLOW PAUSED - AWAITING YOUR DECISION');
        addLog('   Use the Approve/Reject buttons to continue or stop the workflow.');
      } else if (response.status === 'in_progress') {
        addLog('');
        addLog('✓ Step completed. Click "Continue" to proceed to next step.');
      } else {
        addLog('❌ P2P Process stopped due to errors');
      }
      
    } catch (error) {
      // Extract detailed error message from API response
      const apiErr = error as { rawBody?: string; message?: string; status?: number; data?: unknown };
      const detail = apiErr.rawBody || apiErr.message || 'Unknown error';
      
      addLog(`❌ API Error: ${detail}`);
      addLog('');
      addLog('💡 Tip: Make sure the backend server is running on port 8000');
      addLog('   Run: cd backend && uvicorn app.main:app --reload');
      
      // Mark current step as error
      updateStepStatus(startFromStep, 'error', detail);
    }
    
    setIsRunning(false);
  }, [selectedRequisition, addLog, updateStepStatus, runMode]);

  // Handle step approval/rejection
  const handleStepAction = useCallback(async (action: 'approve' | 'reject' | 'hold') => {
    if (!selectedRequisition || !pendingApprovalStep) return;
    
    let reqId: number;
    if (typeof selectedRequisition.id === 'string') {
      const match = selectedRequisition.id.match(/(\d+)$/);
      reqId = match ? parseInt(match[1], 10) : 1;
    } else {
      reqId = selectedRequisition.id;
    }
    
    setIsApproving(true);
    addLog('');
    addLog(`🔄 Processing ${action} action for Step ${pendingApprovalStep}...`);
    
    try {
      const response = await approveWorkflowStep(reqId, pendingApprovalStep, action);
      
      addLog(`✓ ${response.message}`);
      
      if (action === 'approve') {
        updateStepStatus(pendingApprovalStep, 'completed');
        
        if (response.next_step) {
          addLog(`→ Ready to proceed to Step ${response.next_step}`);
          setPendingApprovalStep(null);
          
          // Automatically start next step
          addLog('');
          addLog('🚀 Automatically proceeding to next step...');
          setIsApproving(false);
          await runP2PEngine(response.next_step);
          return;
        } else {
          addLog('🎉 All steps completed! Workflow finished successfully.');
          setPendingApprovalStep(null);
        }
      } else if (action === 'reject') {
        updateStepStatus(pendingApprovalStep, 'error', 'Rejected by approver');
        addLog('❌ Workflow stopped due to rejection.');
        setPendingApprovalStep(null);
      } else {
        addLog('⏸ Step placed on hold. You can resume later.');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Failed to ${action} step: ${errorMessage}`);
    }
    
    setIsApproving(false);
  }, [selectedRequisition, pendingApprovalStep, addLog, updateStepStatus, runP2PEngine]);

  // Get status icon for execution step
  const getStatusIcon = (status: ExecutionStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'in-progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'waiting-approval':
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-surface-300" />;
    }
  };

  // Get status color for execution step
  const getStatusColor = (status: ExecutionStatus) => {
    switch (status) {
      case 'completed':
        return 'border-emerald-500 bg-emerald-50';
      case 'in-progress':
        return 'border-blue-500 bg-blue-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'waiting-approval':
        return 'border-amber-500 bg-amber-50';
      default:
        return 'border-surface-200 bg-white';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-surface-50 min-h-screen">
      {/* ═══════════════════════════════════════════════════════════════════════
          ROW 1: Enhanced AI Agent Workflow Visualization
          ═══════════════════════════════════════════════════════════════════════ */}
      <EnhancedWorkflowFlow 
        selectedStep={selectedInfoStep} 
        onStepSelect={setSelectedInfoStep}
        procurementType={procurementType}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          ROW 2: Execution Section (Two Columns)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-6">
        {/* ─────────────────────────────────────────────────────────────────────
            Left Column: Selected Requisition Details
            ───────────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <h3 className="font-semibold">Selected Requisition</h3>
            </div>
          </div>
          
          <div className="p-4">
            {effectiveRequisition ? (
              <div className="space-y-4">
                {/* Requisition Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-mono rounded">
                        {effectiveRequisition.id}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        effectiveRequisition.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        effectiveRequisition.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        effectiveRequisition.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {effectiveRequisition.priority.toUpperCase()}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900">{effectiveRequisition.title}</h4>
                    <p className="text-xl font-bold text-blue-600 mt-1">
                      ${effectiveRequisition.amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Tab Navigation - Basic/Additional Info */}
                <div className="border-b border-slate-200">
                  <div className="flex gap-4">
                    <button
                      onClick={() => setExpandedStepId(null)}
                      className={`py-2 px-1 text-xs font-medium border-b-2 transition-colors ${
                        expandedStepId === null
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Basic Info
                    </button>
                    <button
                      onClick={() => setExpandedStepId(-1)}
                      className={`py-2 px-1 text-xs font-medium border-b-2 transition-colors ${
                        expandedStepId === -1
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      More Details
                    </button>
                  </div>
                </div>

                {/* TAB: Basic Info */}
                {expandedStepId !== -1 && (
                  <div className="space-y-4">
                    {/* Basic Details Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Department</p>
                        <p className="text-sm font-medium text-slate-900">{effectiveRequisition.department}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Category</p>
                        <p className="text-sm font-medium text-slate-900">{effectiveRequisition.category}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Requestor</p>
                        <p className="text-sm font-medium text-slate-900">{effectiveRequisition.requestor}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Created</p>
                        <p className="text-sm font-medium text-slate-900">{effectiveRequisition.createdAt}</p>
                      </div>
                    </div>

                    {/* Description */}
                    {effectiveRequisition.description && (
                      <div className="pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Description</p>
                        <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">{effectiveRequisition.description}</p>
                      </div>
                    )}

                    {/* Justification */}
                    {effectiveRequisition.justification && (
                      <div className="pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Justification</p>
                        <p className="text-sm text-slate-700 leading-relaxed line-clamp-2">{effectiveRequisition.justification}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: More Details (Additional Info) */}
                {expandedStepId === -1 && (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    <h5 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Enterprise Procurement</h5>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Supplier</p>
                        <p className="text-sm font-medium text-slate-900">{effectiveRequisition.supplier || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Spend Type</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          (effectiveRequisition as any).spend_type === 'CAPEX' ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {(effectiveRequisition as any).spend_type || 'OPEX'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Cost Center</p>
                        <p className="text-sm font-mono text-slate-900">{(effectiveRequisition as any).cost_center || 'N/A'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">GL Account</p>
                        <p className="text-sm font-mono text-slate-900">{(effectiveRequisition as any).gl_account || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Supplier Risk Badges */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Risk</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          ((effectiveRequisition as any).supplier_risk_score || 50) > 70 ? 'bg-red-100 text-red-700' :
                          ((effectiveRequisition as any).supplier_risk_score || 50) > 40 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {(effectiveRequisition as any).supplier_risk_score || 'N/A'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Status</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          (effectiveRequisition as any).supplier_status === 'preferred' ? 'bg-green-100 text-green-700' :
                          (effectiveRequisition as any).supplier_status === 'known' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {((effectiveRequisition as any).supplier_status || 'unknown').toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Contract</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          (effectiveRequisition as any).contract_on_file ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {(effectiveRequisition as any).contract_on_file ? 'YES' : 'NO'}
                        </span>
                      </div>
                    </div>

                    {/* Budget Impact */}
                    {(effectiveRequisition as any).budget_impact && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                          <strong>Budget:</strong> {(effectiveRequisition as any).budget_impact}
                        </p>
                      </div>
                    )}

                    {/* Notes */}
                    {(effectiveRequisition as any).notes && (
                      <div className="pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{(effectiveRequisition as any).notes}</p>
                      </div>
                    )}

                    {/* Full Description and Justification in More Details */}
                    {effectiveRequisition.description && (
                      <div className="pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Full Description</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{effectiveRequisition.description}</p>
                      </div>
                    )}

                    {effectiveRequisition.justification && (
                      <div className="pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Business Justification</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{effectiveRequisition.justification}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No requisition selected</p>
                <p className="text-sm text-slate-400 mt-1">
                  Go to Dashboard and select a requisition to process
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
            Right Column: Execution Progress & Controls
            ───────────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                <h3 className="font-semibold">P2P Engine Execution</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetExecution}
                  disabled={isRunning}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                  title="Reset"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {/* Run Mode Toggle */}
            <div className="mb-4 p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Execution Mode:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRunMode('step')}
                    disabled={isRunning}
                    className={`
                      px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                      ${runMode === 'step' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}
                    `}
                  >
                    <div className="flex items-center gap-1.5">
                      <Pause className="h-3.5 w-3.5" />
                      Step-by-Step
                    </div>
                  </button>
                  <button
                    onClick={() => setRunMode('all')}
                    disabled={isRunning}
                    className={`
                      px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                      ${runMode === 'all' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}
                    `}
                  >
                    <div className="flex items-center gap-1.5">
                      <FastForward className="h-3.5 w-3.5" />
                      Run All
                    </div>
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {runMode === 'step' 
                  ? '⏸ Pauses after each step for your approval before continuing'
                  : '⚡ Runs all steps continuously without pausing'}
              </p>
            </div>

            {/* Run Button */}
            <button
              onClick={() => {
                // Determine which step to run
                // currentExecutionStep tracks the NEXT step to run (e.g., 2 means we should run step 2)
                const stepToRun = currentExecutionStep >= 2 ? currentExecutionStep : 2;
                runP2PEngine(stepToRun);
              }}
              disabled={!selectedRequisition || isRunning || pendingApprovalStep !== null || executionSteps[8]?.status === 'completed'}
              className={`
                w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200
                flex items-center justify-center gap-3
                ${!selectedRequisition || isRunning || pendingApprovalStep !== null || executionSteps[8]?.status === 'completed'
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-xl'
                }
              `}
              title={pendingApprovalStep !== null ? 'Please approve or reject the current step before continuing' : ''}
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Running P2P Engine...
                </>
              ) : executionSteps[8]?.status === 'completed' ? (
                <>
                  <CheckCircle2 className="h-6 w-6" />
                  Process Completed
                </>
              ) : currentExecutionStep >= 2 && currentExecutionStep <= 9 ? (
                <>
                  <SkipForward className="h-6 w-6" />
                  {executionSteps[currentExecutionStep - 1]?.status === 'completed' 
                    ? `Continue to Step ${currentExecutionStep + 1}: ${executionSteps[currentExecutionStep]?.name || ''}`
                    : `Run Step ${currentExecutionStep}: ${executionSteps[currentExecutionStep - 1]?.name || ''}`
                  }
                </>
              ) : (
                <>
                  <Play className="h-6 w-6" />
                  Start Step 2: Approval Check
                </>
              )}
            </button>

            {/* Overall Progress Bar */}
            {isRunning && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                    <span className="text-sm font-semibold text-blue-900">Workflow Progress</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{overallProgress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-blue-700">
                  Processing Step {currentExecutionStep} of 9 · Estimated completion: {Math.ceil((9 - currentExecutionStep) * 2)} seconds
                </p>
              </div>
            )}

            {/* Vertical Step Progress */}
            <div className="mt-6 space-y-3">
              {executionSteps.map((step, index) => {
                const stepInfo = STEP_INFO.find(s => s.id === step.id);
                const isExpanded = expandedStepId === step.id;
                const isCompleted = step.status === 'completed';
                
                return (
                  <div 
                    key={step.id}
                    className={`
                      relative rounded-xl border-2 transition-all duration-300
                      ${getStatusColor(step.status)}
                    `}
                  >
                    {/* Step Header - Always Visible */}
                    <div 
                      className="flex items-start gap-4 p-4 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => isCompleted && stepInfo ? setExpandedStepId(isExpanded ? null : step.id) : null}
                    >
                      {/* Status Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(step.status)}
                      </div>
                      
                      {/* Step Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`
                              text-xs font-bold px-2 py-0.5 rounded
                              ${step.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                step.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-500'}
                            `}>
                              Step {step.id}
                            </span>
                            <span className={`font-semibold ${
                              step.status === 'completed' ? 'text-emerald-700' :
                              step.status === 'in-progress' ? 'text-blue-700' :
                              'text-slate-700'
                            }`}>
                              {step.name}
                            </span>
                          </div>
                          
                          {/* Expand Icon for Completed or Waiting-Approval Steps */}
                          {(isCompleted || step.status === 'waiting-approval') && stepInfo && (
                            <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                              <Zap className="h-4 w-4 text-slate-500" />
                            </div>
                          )}
                        </div>
                        
                        {/* Flagged indicator in header */}
                        {step.flagged && !isExpanded && (
                          <div className="mt-1 flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="text-xs font-medium">Flagged for review</span>
                          </div>
                        )}
                        
                        {/* Status Message with Progress */}
                        {step.status === 'in-progress' && (
                          <div className="mt-2 flex items-center gap-3">
                            {/* Circular Progress Indicator */}
                            <div className="relative w-12 h-12">
                              <svg className="w-12 h-12 transform -rotate-90">
                                <circle cx="24" cy="24" r="20" strokeWidth="4" fill="none" className="stroke-slate-200" />
                                <circle
                                  cx="24" cy="24" r="20" strokeWidth="4" fill="none" strokeLinecap="round"
                                  className="stroke-blue-500 transition-all duration-300"
                                  style={{
                                    strokeDasharray: `${2 * Math.PI * 20}`,
                                    strokeDashoffset: `${2 * Math.PI * 20 * (1 - stepProgress / 100)}`,
                                  }}
                                />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-600">
                                {Math.round(stepProgress)}%
                              </span>
                            </div>
                            <span className="text-xs text-blue-500">
                              Analyzing with Bedrock Nova Pro...
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Accordion Details - Shows when clicked (for completed OR waiting-approval steps) */}
                    {(isCompleted || step.status === 'waiting-approval') && isExpanded && (
                      <div className="border-t border-slate-200 bg-gradient-to-b from-slate-100 to-slate-50 px-8 py-8 space-y-6">
                        {/* Special Payment Confirmation Card for Step 9 */}
                        {step.id === 9 && (
                          <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-2xl border-2 border-emerald-200 shadow-lg overflow-hidden">
                            {/* Header Banner */}
                            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-full">
                                  <CheckCircle className="h-6 w-6" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold">Payment Confirmed</h3>
                                  <p className="text-emerald-100 text-sm">Transaction completed successfully</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Payment Details */}
                            <div className="p-6 space-y-5">
                              {/* Amount - Large Display */}
                              <div className="text-center py-4 bg-white rounded-xl border border-emerald-100 shadow-sm">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                  <DollarSign className="h-5 w-5 text-emerald-600" />
                                  <span className="text-sm text-slate-500 font-medium">Amount Paid</span>
                                </div>
                                <p className="text-4xl font-bold text-emerald-700">
                                  ${effectiveRequisition?.amount?.toLocaleString() || '0.00'}
                                </p>
                              </div>
                              
                              {/* Details Grid */}
                              <div className="grid grid-cols-2 gap-4">
                                {/* Supplier */}
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Building2 className="h-4 w-4 text-slate-400" />
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Supplier</span>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-800 truncate">
                                    {effectiveRequisition?.supplier || 'Not Assigned'}
                                  </p>
                                </div>
                                
                                {/* Invoice Reference */}
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Receipt className="h-4 w-4 text-slate-400" />
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Invoice #</span>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    INV-{String(effectiveRequisition?.id || '0').match(/(\d+)$/)?.[1]?.padStart(6, '0') || '000000'}
                                  </p>
                                </div>
                                
                                {/* PO Number */}
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileCheck className="h-4 w-4 text-slate-400" />
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">PO #</span>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    PO-{String(effectiveRequisition?.id || '0').match(/(\d+)$/)?.[1]?.padStart(6, '0') || '000000'}
                                  </p>
                                </div>
                                
                                {/* Payment Date */}
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-slate-400" />
                                    <span className="text-xs text-slate-500 uppercase tracking-wider">Payment Date</span>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {new Date().toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Transaction Confirmation */}
                              <div className="bg-emerald-100 p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-emerald-600 rounded-full">
                                    <CreditCard className="h-5 w-5 text-white" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-emerald-800">ACH Transfer Complete</p>
                                    <p className="text-xs text-emerald-600">Transaction ID: TXN-{Date.now().toString(36).toUpperCase()}</p>
                                  </div>
                                </div>
                                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Agent Reasoning Summary Box (for non-payment steps) */}
                        {/* Step 2: Use KeyChecksDisplay for structured 6 checks */}
                        {step.id === 2 && step.resultData?.key_checks && step.resultData?.checks_summary && (
                          <KeyChecksDisplay
                            keyChecks={step.resultData.key_checks}
                            checksSummary={step.resultData.checks_summary}
                            verdict={
                              step.resultData?.verdict
                                ? { 
                                    label: 'Verdict', 
                                    value: step.resultData.verdict === 'AUTO_APPROVE' 
                                      ? `✓ ${step.resultData.verdict} - ${step.resultData.verdict_reason || 'Passed'}`
                                      : `⚠️ ${step.resultData.verdict} - ${step.resultData.verdict_reason || 'Requires review'}`
                                  }
                                : undefined
                            }
                          />
                        )}
                        
                        {/* Fallback for Step 2 without key_checks - show agent notes */}
                        {step.id === 2 && (!step.resultData?.key_checks || !step.resultData?.checks_summary) && step.agentNotes && step.agentNotes.length > 0 && (
                          <AgentReasoningBox
                            notes={step.agentNotes}
                            title={`${step.agentName} Analysis`}
                            verdict={
                              step.resultData?.verdict
                                ? { 
                                    label: 'Verdict', 
                                    value: step.resultData.verdict === 'AUTO_APPROVE' 
                                      ? `✓ ${step.resultData.verdict} - ${step.resultData.verdict_reason || 'Approved'}`
                                      : `⚠️ ${step.resultData.verdict} - ${step.resultData.verdict_reason || 'Flagged'}`
                                  }
                                : undefined
                            }
                          />
                        )}
                        
                        {/* Step 3: Use KeyChecksDisplay for PO Generation checks */}
                        {step.id === 3 && step.resultData?.key_checks && step.resultData?.checks_summary && (
                          <KeyChecksDisplay
                            keyChecks={step.resultData.key_checks}
                            checksSummary={step.resultData.checks_summary}
                            verdict={
                              step.resultData?.verdict
                                ? { 
                                    label: 'PO Status', 
                                    value: step.resultData.verdict === 'AUTO_APPROVE' 
                                      ? `✓ ${step.resultData.verdict} - ${step.resultData.verdict_reason || 'PO Generated'}`
                                      : `⚠️ ${step.resultData.verdict} - ${step.resultData.verdict_reason || 'Requires review'}`
                                  }
                                : undefined
                            }
                          />
                        )}
                        
                        {/* Steps 4-8: Use KeyChecksDisplay for 6-check structure */}
                        {[4, 5, 6, 7, 8].includes(step.id) && step.resultData?.key_checks && step.resultData?.checks_summary && (
                          <KeyChecksDisplay
                            keyChecks={step.resultData.key_checks}
                            checksSummary={step.resultData.checks_summary}
                            verdict={
                              step.resultData?.verdict
                                ? { 
                                    label: 'Verdict', 
                                    value: step.resultData.verdict === 'AUTO_APPROVE' 
                                      ? `✓ ${step.resultData.verdict} - ${step.resultData.verdict_reason || 'Passed'}`
                                      : `⚠️ ${step.resultData.verdict} - ${step.resultData.verdict_reason || 'Requires review'}`
                                  }
                                : undefined
                            }
                          />
                        )}
                        
                        {/* Other steps: Use AgentReasoningBox */}
                        {step.id !== 9 && step.id !== 2 && step.id !== 3 && ![4, 5, 6, 7, 8].includes(step.id) && step.agentNotes && step.agentNotes.length > 0 && (
                          <AgentReasoningBox
                            title={`Step ${step.id} Agent Reasoning`}
                            bulletPoints={step.agentNotes}
                            variant={getVariantFromResult(step.flagged, step.status)}
                            verdict={
                              step.id === 8
                                ? undefined  // Step 8 (Final Approval) has no verdict - always manual
                                : step.resultData?.verdict
                                  ? { 
                                      label: 'Verdict', 
                                      value: step.resultData.verdict === 'AUTO_APPROVE' 
                                        ? `✓ ${step.resultData.verdict} - ${step.resultData.verdict_reason || 'Passed'}`
                                        : `⚠️ ${step.resultData.verdict} - ${step.resultData.verdict_reason || 'Requires review'}`
                                    }
                                  : step.flagged 
                                    ? { label: 'Status', value: `⚠️ Flagged: ${step.flagReason || 'Requires review'}` }
                                    : { label: 'Verdict', value: '✓ Passed - No issues detected' }
                            }
                          />
                        )}
                        
                        {/* Fallback for Step 2 without key_checks (backward compat) */}
                        {step.id === 2 && !step.resultData?.key_checks && step.agentNotes && step.agentNotes.length > 0 && (
                          <AgentReasoningBox
                            title={`Step ${step.id} Agent Reasoning`}
                            bulletPoints={step.agentNotes}
                            variant={getVariantFromResult(step.flagged, step.status)}
                            verdict={
                              step.resultData?.verdict
                                ? { 
                                    label: 'Verdict', 
                                    value: step.resultData.verdict === 'AUTO_APPROVE' 
                                      ? `✓ ${step.resultData.verdict} - ${step.resultData.verdict_reason || 'Passed'}`
                                      : `⚠️ ${step.resultData.verdict} - ${step.resultData.verdict_reason || 'Requires review'}`
                                  }
                                : step.flagged 
                                  ? { label: 'Status', value: `⚠️ Flagged: ${step.flagReason || 'Requires review'}` }
                                  : { label: 'Verdict', value: '✓ Passed - No issues detected' }
                            }
                          />
                        )}
                        
                        {/* Fallback for Step 3 without key_checks (backward compat) */}
                        {step.id === 3 && !step.resultData?.key_checks && step.agentNotes && step.agentNotes.length > 0 && (
                          <AgentReasoningBox
                            title={`Step ${step.id} Agent Reasoning`}
                            bulletPoints={step.agentNotes}
                            variant={getVariantFromResult(step.flagged, step.status)}
                            verdict={
                              step.resultData?.verdict
                                ? { 
                                    label: 'PO Status', 
                                    value: step.resultData.verdict === 'AUTO_APPROVE' 
                                      ? `✓ ${step.resultData.verdict} - ${step.resultData.verdict_reason || 'PO Generated'}`
                                      : `⚠️ ${step.resultData.verdict} - ${step.resultData.verdict_reason || 'Requires review'}`
                                  }
                                : step.flagged 
                                  ? { label: 'Status', value: `⚠️ Flagged: ${step.flagReason || 'Requires review'}` }
                                  : { label: 'PO Status', value: '✓ PO Generated Successfully' }
                            }
                          />
                        )}
                        
                        {/* Fallback for Steps 4-8 without key_checks (backward compat) */}
                        {[4, 5, 6, 7, 8].includes(step.id) && !step.resultData?.key_checks && step.agentNotes && step.agentNotes.length > 0 && (
                          <AgentReasoningBox
                            title={`Step ${step.id} Agent Reasoning`}
                            bulletPoints={step.agentNotes}
                            variant={getVariantFromResult(step.flagged, step.status)}
                            verdict={
                              step.resultData?.verdict
                                ? { 
                                    label: 'Verdict', 
                                    value: step.resultData.verdict === 'AUTO_APPROVE' 
                                      ? `✓ ${step.resultData.verdict} - ${step.resultData.verdict_reason || 'Passed'}`
                                      : `⚠️ ${step.resultData.verdict} - ${step.resultData.verdict_reason || 'Requires review'}`
                                  }
                                : step.flagged 
                                  ? { label: 'Status', value: `⚠️ Flagged: ${step.flagReason || 'Requires review'}` }
                                  : { label: 'Verdict', value: '✓ Passed - No issues detected' }
                            }
                          />
                        )}
                        
                        {/* Summary Data (only show key metrics, not raw JSON) */}
                        {step.id !== 9 && step.resultData && (step.resultData.tier || step.resultData.risk_score !== undefined || step.resultData.match_result) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {step.resultData.tier && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                Tier {step.resultData.tier}: {step.resultData.tier_description}
                              </span>
                            )}
                            {step.resultData.risk_score !== undefined && (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                step.resultData.risk_score < 30 ? 'bg-emerald-100 text-emerald-700' :
                                step.resultData.risk_score < 60 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                Risk: {step.resultData.risk_score}/100 ({step.resultData.risk_level?.toUpperCase() || 'N/A'})
                              </span>
                            )}
                            {step.resultData.match_result?.overall_status && (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                step.resultData.match_result.overall_status === 'matched' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                3-Way Match: {step.resultData.match_result.overall_status.toUpperCase()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Inline Approval Prompt - Show when this specific step needs approval */}
                    {pendingApprovalStep === step.id && (
                      <div className={`mx-4 mb-4 p-5 rounded-2xl shadow-sm ${
                        step.id === 8 
                          ? 'bg-gradient-to-br from-slate-50 to-indigo-50/50 border border-indigo-200/60'
                          : 'bg-gradient-to-br from-slate-50 to-amber-50/50 border border-amber-200/60'
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <span className={`text-sm font-semibold tracking-wide ${
                            step.id === 8 ? 'text-indigo-700' : 'text-amber-700'
                          }`}>
                            {step.id === 8 
                              ? 'Final Authorization Required'
                              : `Step ${step.id} Requires Approval`
                            }
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            step.id === 8 
                              ? 'bg-indigo-100 text-indigo-600' 
                              : 'bg-amber-100 text-amber-600'
                          }`}>
                            Pending
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-5">
                          {step.id === 8 
                            ? 'All agent checks passed. Approve to authorize payment or reject to cancel the transaction.'
                            : 'Review the findings above and decide how to proceed with this workflow.'
                          }
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStepAction('approve')}
                            disabled={isApproving}
                            className="flex-1 py-2.5 px-4 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm hover:shadow"
                          >
                            {isApproving ? 'Processing...' : (step.id === 8 ? 'Approve & Pay' : 'Approve')}
                          </button>
                          <button
                            onClick={() => handleStepAction('reject')}
                            disabled={isApproving}
                            className="flex-1 py-2.5 px-4 bg-white text-red-600 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-all disabled:opacity-50"
                          >
                            {isApproving ? 'Processing...' : 'Reject'}
                          </button>
                          {step.id === 8 && (
                            <button
                              onClick={() => handleStepAction('hold')}
                              disabled={isApproving}
                              className="flex-1 py-2.5 px-4 bg-white text-slate-600 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50"
                            >
                              {isApproving ? 'Processing...' : 'Review Later'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Execution Logs */}
            {executionLogs.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">Agent Activity Log</span>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="space-y-1 font-mono text-xs">
                    {executionLogs.map((log, idx) => (
                      <p key={idx} className={
                        log.includes('✓') || log.includes('completed') ? 'text-emerald-400' :
                        log.includes('❌') || log.includes('error') ? 'text-red-400' :
                        log.includes('Starting') ? 'text-blue-400' :
                        log.includes('═') || log.includes('🎉') ? 'text-amber-400' :
                        'text-slate-300'
                      }>
                        {log}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
