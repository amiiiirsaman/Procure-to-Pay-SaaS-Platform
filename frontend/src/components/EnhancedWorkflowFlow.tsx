/**
 * EnhancedWorkflowFlow.tsx
 * Horizontal workflow visualization for P2P pipeline
 * Version: 5.0.0 - Simple Flexbox Layout (2026-01-17)
 * 
 * Key Features:
 * - No absolute positioning - pure flexbox layout
 * - Centered max-w-6xl container with horizontal padding
 * - justify-between spreads nodes evenly
 * - Arrows are flex-1 items that fill gaps
 * - No horizontal scroll
 * - Agent checks in vertical stack below agent node
 */

import { useState, useRef, useLayoutEffect } from 'react';
import {
  FileText,
  CheckCircle,
  ShoppingCart,
  Truck,
  Receipt,
  CreditCard,
  FileCheck,
  Bot,
  User,
  MessageSquare,
  Zap,
  Shield,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Diamond,
  Sparkles,
  Users,
  Package,
  Calculator,
  BadgeCheck,
  Wallet,
  X,
  Info,
  ChevronDown,
} from 'lucide-react';

// ============================================================================
// Helper: Get center of a DOM element relative to a container
// ============================================================================

function getNodeCenter(el: HTMLElement | null, container: HTMLElement | null): { x: number; y: number } | null {
  if (!el || !container) return null;
  const elRect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    x: elRect.left - containerRect.left + elRect.width / 2,
    y: elRect.top - containerRect.top + elRect.height / 2,
  };
}

// ============================================================================
// Layout Constants
// ============================================================================

const NODE_HEIGHT = 40;
const NODE_WIDTH = 120;
const AGENT_WIDTH = 160;
const CHECKS_WIDTH = 200;

// ============================================================================
// Types
// ============================================================================

type DetailsType = 'agents' | 'actions' | 'hitl' | 'compliance' | null;

// ============================================================================
// Color Styles Helper
// ============================================================================

const getColorStyles = (color: string) => {
  const colorStyles: Record<string, { bg: string; glow: string; border: string; text: string; bgLight: string }> = {
    blue: { bg: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/30', border: 'border-blue-500/50', text: 'text-blue-400', bgLight: 'bg-blue-500/10' },
    purple: { bg: 'from-purple-500 to-purple-600', glow: 'shadow-purple-500/30', border: 'border-purple-500/50', text: 'text-purple-400', bgLight: 'bg-purple-500/10' },
    emerald: { bg: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/30', border: 'border-emerald-500/50', text: 'text-emerald-400', bgLight: 'bg-emerald-500/10' },
    amber: { bg: 'from-amber-500 to-amber-600', glow: 'shadow-amber-500/30', border: 'border-amber-500/50', text: 'text-amber-400', bgLight: 'bg-amber-500/10' },
    rose: { bg: 'from-rose-500 to-rose-600', glow: 'shadow-rose-500/30', border: 'border-rose-500/50', text: 'text-rose-400', bgLight: 'bg-rose-500/10' },
    teal: { bg: 'from-teal-500 to-teal-600', glow: 'shadow-teal-500/30', border: 'border-teal-500/50', text: 'text-teal-400', bgLight: 'bg-teal-500/10' },
    indigo: { bg: 'from-indigo-500 to-indigo-600', glow: 'shadow-indigo-500/30', border: 'border-indigo-500/50', text: 'text-indigo-400', bgLight: 'bg-indigo-500/10' },
    cyan: { bg: 'from-cyan-500 to-cyan-600', glow: 'shadow-cyan-500/30', border: 'border-cyan-500/50', text: 'text-cyan-400', bgLight: 'bg-cyan-500/10' },
  };
  return colorStyles[color] || colorStyles.blue;
};

// ============================================================================
// Flow Node Components - Simple Flexbox Items
// ============================================================================

function InputNode({ label, icon, color = 'blue' }: { label: string; icon?: React.ReactNode; color?: string }) {
  const styles = getColorStyles(color);
  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 bg-slate-800/80 border ${styles.border} rounded-xl shadow-md flex-shrink-0`}
      style={{ height: NODE_HEIGHT, minWidth: NODE_WIDTH }}
    >
      {icon || <FileText className="h-4 w-4 text-slate-400" />}
      <span className="text-xs font-medium text-slate-300 whitespace-nowrap">{label}</span>
    </div>
  );
}

function HumanNode({ label, icon, color = 'blue' }: { label: string; icon?: React.ReactNode; color?: string }) {
  const styles = getColorStyles(color);
  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 bg-slate-800 border-2 ${styles.border} rounded-xl shadow-lg flex-shrink-0`}
      style={{ height: NODE_HEIGHT, minWidth: NODE_WIDTH }}
    >
      {icon || <User className="h-4 w-4 text-slate-300" />}
      <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">{label}</span>
    </div>
  );
}

function AgentNodeWithChecks({ 
  label, 
  icon, 
  color = 'blue', 
  checks 
}: { 
  label: string; 
  icon?: React.ReactNode; 
  color?: string; 
  checks?: string[];
}) {
  const styles = getColorStyles(color);
  
  return (
    <div className="flex flex-col items-center flex-shrink-0">
      {/* Agent Box */}
      <div
        className={`flex items-center justify-center gap-2 px-5 bg-gradient-to-br ${styles.bg} rounded-xl shadow-lg ${styles.glow}`}
        style={{ height: NODE_HEIGHT, minWidth: AGENT_WIDTH }}
      >
        {icon || <Bot className="h-5 w-5 text-white" />}
        <span className="text-xs font-bold text-white whitespace-nowrap">{label}</span>
      </div>
      
      {/* Checks Panel - drops below agent */}
      {checks && checks.length > 0 && (
        <div
          className={`mt-2 p-2 bg-slate-800/90 border ${styles.border} rounded-lg shadow-lg`}
          style={{ width: CHECKS_WIDTH }}
        >
          <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-slate-700">
            <Zap className="h-3 w-3 text-amber-400" />
            <span className="text-[9px] font-semibold text-slate-400">Agent Checks</span>
          </div>
          <ul className="space-y-0.5">
            {checks.map((check, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-[9px] text-slate-400">
                <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="leading-tight">{check}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DecisionNode({ color = 'blue' }: { color?: string }) {
  const styles = getColorStyles(color);
  return (
    <div className="flex items-center justify-center flex-shrink-0" style={{ width: 48, height: NODE_HEIGHT }}>
      <div className={`w-10 h-10 transform rotate-45 bg-gradient-to-br ${styles.bg} rounded-lg shadow-lg ${styles.glow} flex items-center justify-center`}>
        <Diamond className="h-4 w-4 text-white -rotate-45" />
      </div>
    </div>
  );
}

function OutcomeNode({ label, variant }: { label: string; variant: 'success' | 'flag' | 'reject' | 'final' }) {
  const configs: Record<string, { bg: string; glow: string; icon: typeof CheckCircle2 }> = {
    success: { bg: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/30', icon: CheckCircle2 },
    flag: { bg: 'from-amber-500 to-orange-500', glow: 'shadow-amber-500/30', icon: AlertTriangle },
    reject: { bg: 'from-red-500 to-red-600', glow: 'shadow-red-500/30', icon: X },
    final: { bg: 'from-emerald-500 via-emerald-400 to-teal-500', glow: 'shadow-emerald-500/30', icon: CheckCircle2 },
  };
  const config = configs[variant];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 bg-gradient-to-r ${config.bg} rounded-xl shadow-lg ${config.glow} flex-shrink-0`}
      style={{ height: NODE_HEIGHT, minWidth: variant === 'final' ? 160 : NODE_WIDTH }}
    >
      <Icon className="h-4 w-4 text-white flex-shrink-0" />
      <span className="text-xs font-bold text-white whitespace-nowrap">{label}</span>
    </div>
  );
}

// ============================================================================
// Arrow Component - Flex item that fills gap between nodes
// ============================================================================

function Arrow({ label, color = 'slate' }: { label?: string; color?: string }) {
  const colorMap: Record<string, { line: string; arrow: string; text: string }> = {
    slate: { line: 'bg-slate-500', arrow: 'border-slate-500', text: 'text-slate-400' },
    emerald: { line: 'bg-emerald-500', arrow: 'border-emerald-500', text: 'text-emerald-400' },
    amber: { line: 'bg-amber-500', arrow: 'border-amber-500', text: 'text-amber-400' },
    red: { line: 'bg-red-500', arrow: 'border-red-500', text: 'text-red-400' },
  };
  const style = colorMap[color] || colorMap.slate;

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-w-[40px]">
      {label && (
        <span className={`text-[8px] font-semibold ${style.text} mb-1 whitespace-nowrap`}>
          {label}
        </span>
      )}
      <div className={`h-[2px] w-full ${style.line} relative`}>
        <span className={`absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] ${style.line.replace('bg-', 'border-l-')}`} />
      </div>
    </div>
  );
}

// ============================================================================
// Step Flow Components - Simple Flex Rows
// ============================================================================

function Step1Flow() {
  return (
    <div className="flex items-center justify-between gap-6">
      <HumanNode label="Human User" icon={<User className="h-4 w-4 text-blue-400" />} color="blue" />
      <Arrow />
      <InputNode label="Choose Method" icon={<FileText className="h-4 w-4 text-slate-400" />} color="blue" />
      <Arrow />
      <AgentNodeWithChecks
        label="AI Chatbot"
        icon={<MessageSquare className="h-4 w-4 text-white" />}
        color="purple"
        checks={['Parse natural language', 'Extract item details', 'Identify supplier', 'Auto-fill form']}
      />
      <Arrow color="emerald" />
      <OutcomeNode label="Requisition Created" variant="success" />
    </div>
  );
}

function AgentDecisionStepFlow({ 
  agentName, 
  agentIcon,
  agentColor,
  checks,
  successLabel,
}: {
  agentName: string;
  agentIcon: React.ReactNode;
  agentColor: string;
  checks: string[];
  successLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const decisionRef = useRef<HTMLDivElement>(null);
  const flagRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; color: string; label: string }[]>([]);

  useLayoutEffect(() => {
    const updateLines = () => {
      const decisionCenter = getNodeCenter(decisionRef.current, containerRef.current);
      const flagCenter = getNodeCenter(flagRef.current, containerRef.current);
      const successCenter = getNodeCenter(successRef.current, containerRef.current);
      
      if (decisionCenter && flagCenter && successCenter) {
        setLines([
          { x1: decisionCenter.x, y1: decisionCenter.y, x2: flagCenter.x, y2: flagCenter.y, color: '#f59e0b', label: 'If Issues' },
          { x1: decisionCenter.x, y1: decisionCenter.y, x2: successCenter.x, y2: successCenter.y, color: '#10b981', label: 'If Clean' },
        ]);
      }
    };
    updateLines();
    window.addEventListener('resize', updateLines);
    return () => window.removeEventListener('resize', updateLines);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* SVG layer for diagonal arrows */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        <defs>
          <marker id="arrowhead-amber" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
          </marker>
          <marker id="arrowhead-emerald" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
          </marker>
        </defs>
        {lines.map((line, idx) => {
          // Position label at 40% along the arrow (away from both diamond and buttons)
          const t = 0.40;
          const anchorX = line.x1 + (line.x2 - line.x1) * t;
          const anchorY = line.y1 + (line.y2 - line.y1) * t;
          
          // Upper arrow (amber) label above, lower arrow (emerald) label below
          const isUpperArrow = line.y2 < line.y1; // arrow goes up
          const labelX = anchorX;
          const labelY = isUpperArrow ? anchorY - 14 : anchorY + 20;
          
          const markerId = line.color === '#f59e0b' ? 'arrowhead-amber' : 'arrowhead-emerald';
          return (
            <g key={idx}>
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.color}
                strokeWidth="2"
                markerEnd={`url(#${markerId})`}
              />
              <text
                x={labelX}
                y={labelY}
                fill={line.color}
                fontSize="10"
                fontWeight="500"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
              >
                {line.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Main row: Input → Agent → Decision */}
      <div className="flex items-center gap-6" style={{ position: 'relative', zIndex: 2 }}>
        <InputNode label="Input Data" icon={<FileText className="h-4 w-4 text-slate-400" />} color={agentColor} />
        <Arrow />
        <AgentNodeWithChecks
          label={agentName}
          icon={agentIcon}
          color={agentColor}
          checks={checks}
        />
        <Arrow />
        <div ref={decisionRef}>
          <DecisionNode color={agentColor} />
        </div>
        
        {/* Branch outcomes in a column - no horizontal arrows */}
        <div className="flex flex-col gap-6 ml-16">
          <div ref={flagRef}>
            <OutcomeNode label="FLAG → HITL" variant="flag" />
          </div>
          <div ref={successRef}>
            <OutcomeNode label={successLabel} variant="success" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Step8Flow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const decisionRef = useRef<HTMLDivElement>(null);
  const rejectRef = useRef<HTMLDivElement>(null);
  const approveRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; color: string; label: string }[]>([]);

  useLayoutEffect(() => {
    const updateLines = () => {
      const decisionCenter = getNodeCenter(decisionRef.current, containerRef.current);
      const rejectCenter = getNodeCenter(rejectRef.current, containerRef.current);
      const approveCenter = getNodeCenter(approveRef.current, containerRef.current);
      
      if (decisionCenter && rejectCenter && approveCenter) {
        setLines([
          { x1: decisionCenter.x, y1: decisionCenter.y, x2: rejectCenter.x, y2: rejectCenter.y, color: '#ef4444', label: 'Reject' },
          { x1: decisionCenter.x, y1: decisionCenter.y, x2: approveCenter.x, y2: approveCenter.y, color: '#10b981', label: 'Approve' },
        ]);
      }
    };
    updateLines();
    window.addEventListener('resize', updateLines);
    return () => window.removeEventListener('resize', updateLines);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* SVG layer for diagonal arrows */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        <defs>
          <marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
          </marker>
          <marker id="arrowhead-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
          </marker>
        </defs>
        {lines.map((line, idx) => {
          // Position label at 40% along the arrow (away from both diamond and buttons)
          const t = 0.40;
          const anchorX = line.x1 + (line.x2 - line.x1) * t;
          const anchorY = line.y1 + (line.y2 - line.y1) * t;
          
          // Upper arrow (red) label above, lower arrow (green) label below
          const isUpperArrow = line.y2 < line.y1; // arrow goes up
          const labelX = anchorX;
          const labelY = isUpperArrow ? anchorY - 14 : anchorY + 20;
          
          const markerId = line.color === '#ef4444' ? 'arrowhead-red' : 'arrowhead-green';
          return (
            <g key={idx}>
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={line.color}
                strokeWidth="2"
                markerEnd={`url(#${markerId})`}
              />
              <text
                x={labelX}
                y={labelY}
                fill={line.color}
                fontSize="10"
                fontWeight="500"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
              >
                {line.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Main row */}
      <div className="flex items-center gap-6" style={{ position: 'relative', zIndex: 2 }}>
        <InputNode label="All Data" icon={<FileText className="h-4 w-4 text-slate-400" />} color="cyan" />
        <Arrow />
        <AgentNodeWithChecks
          label="Final Approval Agent"
          icon={<Bot className="h-4 w-4 text-white" />}
          color="cyan"
          checks={['Compile approval notes', 'Generate summary report', 'Calculate risk scores', 'Prepare recommendations']}
        />
        <Arrow />
        <HumanNode label="Human Reviewer" icon={<Users className="h-4 w-4 text-cyan-400" />} color="cyan" />
        <Arrow />
        <div ref={decisionRef}>
          <DecisionNode color="cyan" />
        </div>
        
        {/* Branch outcomes - no horizontal arrows */}
        <div className="flex flex-col gap-6 ml-16">
          <div ref={rejectRef}>
            <OutcomeNode label="REJECTED" variant="reject" />
          </div>
          <div ref={approveRef}>
            <OutcomeNode label="APPROVED" variant="success" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Step9Flow() {
  return (
    <div className="flex items-center justify-between gap-6">
      <InputNode label="Approved Invoice" icon={<BadgeCheck className="h-4 w-4 text-emerald-400" />} color="rose" />
      <Arrow />
      <AgentNodeWithChecks
        label="Payment Agent"
        icon={<Wallet className="h-4 w-4 text-white" />}
        color="rose"
        checks={['Schedule per terms', 'Apply early-pay discounts', 'Execute transaction', 'Update ledger']}
      />
      <Arrow color="emerald" />
      <OutcomeNode label="PAYMENT COMPLETE" variant="final" />
    </div>
  );
}

// ============================================================================
// Stats Card with Hover Preview + Click Modal
// ============================================================================

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  tooltipTitle: string;
  tooltipItems: string[];
  onOpenPanel: () => void;
}

function StatsCard({ icon, label, value, color, tooltipTitle, tooltipItems, onOpenPanel }: StatsCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const previewCount = 3;
  const hasMore = tooltipItems.length > previewCount;
  
  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div 
        onClick={onOpenPanel}
        className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 cursor-pointer transition-all hover:border-slate-500 hover:bg-slate-800/70 group"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-xs text-slate-400">{label}</span>
          </div>
          <Info className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
      
      {/* Hover Preview Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-30 w-64 p-3 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700">
            {icon}
            <span className="text-xs font-semibold text-white">{tooltipTitle}</span>
          </div>
          <ul className="space-y-1.5">
            {tooltipItems.slice(0, previewCount).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-[10px] text-slate-300">
                <CheckCircle2 className={`h-3 w-3 ${color} mt-0.5 flex-shrink-0`} />
                <span className="line-clamp-1">{item}</span>
              </li>
            ))}
          </ul>
          {hasMore && (
            <div className="mt-2 pt-2 border-t border-slate-700 text-center">
              <span className="text-[10px] text-slate-400">
                + {tooltipItems.length - previewCount} more • <span className="text-blue-400">Click to view all</span>
              </span>
            </div>
          )}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 border-r border-b border-slate-600 transform rotate-45" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Details Modal
// ============================================================================

function DetailsPanel({ title, icon, items, onClose, color }: { title: string; icon: React.ReactNode; items: string[]; onClose: () => void; color: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md max-h-[80vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            {icon}
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <ul className="space-y-2">
            {items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                <CheckCircle2 className={`h-4 w-4 ${color} mt-0.5 flex-shrink-0`} />
                <span className="text-sm text-slate-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-3 border-t border-slate-700 bg-slate-800/30 text-center">
          <span className="text-xs text-slate-500">{items.length} items total</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface EnhancedWorkflowFlowProps {
  selectedStep: number;
  onStepSelect: (step: number) => void;
  procurementType?: 'goods' | 'services';
}

// Helper function to get receipt step label
function getReceiptStepLabel(procurementType: 'goods' | 'services' = 'goods'): string {
  return procurementType === 'services' ? 'Service Acceptance' : 'Goods Receipt';
}

export function EnhancedWorkflowFlow({ selectedStep, onStepSelect, procurementType = 'goods' }: EnhancedWorkflowFlowProps) {
  const [openDetails, setOpenDetails] = useState<DetailsType>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Define receiptLabel first since it's used in multiple places
  const receiptLabel = getReceiptStepLabel(procurementType);

  const receiptAgentLabel = procurementType === 'services' 
    ? 'Service Acceptance Agent - Validates service delivery'
    : 'Goods Receipt Agent - Validates deliveries';
  const invoiceMatchLabel = procurementType === 'services'
    ? 'Invoice Agent - 2-way matching for services'
    : 'Invoice Agent - 3-way matching validation';

  const statsData = [
    {
      key: 'agents' as const,
      icon: <Bot className="h-4 w-4 text-blue-400" />,
      label: 'Total Agents',
      value: 9,
      color: 'text-blue-400',
      tooltipTitle: '9 AI Agents',
      tooltipItems: [
        'Requisition Agent - Validates & processes new requests',
        'Approval Agent - Checks policies & thresholds',
        'PO Generation Agent - Creates purchase orders',
        receiptAgentLabel,
        invoiceMatchLabel,
        'Fraud Agent - Analyzes transactions for fraud indicators',
        'Compliance Agent - Ensures SOX & regulatory compliance',
        'Final Approval Agent - Compiles summary & recommendations',
        'Payment Agent - Processes & executes payments',
      ],
    },
    {
      key: 'actions' as const,
      icon: <Zap className="h-4 w-4 text-amber-400" />,
      label: 'Auto-Actions',
      value: '35+',
      color: 'text-amber-400',
      tooltipTitle: 'Automated Actions',
      tooltipItems: [
        'Parse natural language requisitions',
        'Extract item details & quantities',
        'Auto-fill requisition forms',
        'Check amount thresholds',
        'Detect duplicate requests',
        'Assess vendor risk scores',
        'Validate policy compliance',
        'Generate PO line items',
        'Extract supplier details',
        'Validate contract terms',
        'Match received quantities',
        'Verify quality specs',
        'Check delivery timelines',
        'Identify shipping damage',
        'Requisition ↔ PO matching',
        'PO ↔ Invoice matching',
        'Invoice ↔ GR matching',
        'Apply tolerance checks',
        'Detect unusual patterns',
        'Flag high-risk transactions',
        'Analyze vendor behavior',
        'Check for split invoicing',
        'SOX compliance validation',
        'Regulatory requirement checks',
        'Audit trail generation',
        'Policy exception detection',
        'Calculate risk scores',
        'Generate summary reports',
        'Schedule payments',
        'Apply early-pay discounts',
        'Execute transactions',
        'Update ledger entries',
        'Send notifications',
      ],
    },
    {
      key: 'hitl' as const,
      icon: <Shield className="h-4 w-4 text-emerald-400" />,
      label: 'HITL Checkpoints',
      value: 7,
      color: 'text-emerald-400',
      tooltipTitle: 'Human-in-the-Loop Checkpoints',
      tooltipItems: [
        'Step 2: Approval - High amount / policy violations trigger review',
        'Step 3: PO Generation - Missing supplier data requires review',
        `Step 4: ${receiptLabel} - ${procurementType === 'services' ? 'Service completion issues' : 'Quantity discrepancy'} flags review`,
        `Step 5: Invoice - ${procurementType === 'services' ? '2-way' : '3-way'} match failures need approval`,
        'Step 6: Fraud Analysis - Fraud risk indicators trigger review',
        'Step 7: Compliance - Compliance violations flag review',
        'Step 8: Final Approval - All transactions require human sign-off',
      ],
    },
    {
      key: 'compliance' as const,
      icon: <Scale className="h-4 w-4 text-purple-400" />,
      label: 'Compliance Checks',
      value: 15,
      color: 'text-purple-400',
      tooltipTitle: 'Compliance Validations',
      tooltipItems: [
        'Amount threshold verification',
        'Budget allocation check',
        'Vendor certification validation',
        'Contract term compliance',
        'Procurement policy adherence',
        'Segregation of duties',
        'Approval hierarchy validation',
        'Tax compliance verification',
        'Audit trail completeness',
        'Document retention compliance',
        'Anti-fraud screening',
        'SOX 404 control validation',
        'FCPA anti-bribery checks',
        'Data privacy compliance',
        'Regulatory reporting compliance',
      ],
    },
  ];
  
  const steps = [
    { id: 1, name: 'Requisition', icon: FileText, color: 'blue' as const },
    { id: 2, name: 'Approval', icon: CheckCircle, color: 'emerald' as const },
    { id: 3, name: 'PO Generation', icon: ShoppingCart, color: 'indigo' as const },
    { id: 4, name: receiptLabel, icon: Truck, color: 'amber' as const },
    { id: 5, name: 'Invoicing', icon: Receipt, color: 'teal' as const },
    { id: 6, name: 'Fraud Analysis', icon: AlertTriangle, color: 'amber' as const },
    { id: 7, name: 'Compliance', icon: FileCheck, color: 'purple' as const },
    { id: 8, name: 'Final Approval', icon: CheckCircle2, color: 'cyan' as const },
    { id: 9, name: 'Payment', icon: CreditCard, color: 'rose' as const },
  ];

  const colorBgMap: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    indigo: 'bg-indigo-500/20 text-indigo-400',
    amber: 'bg-amber-500/20 text-amber-400',
    teal: 'bg-teal-500/20 text-teal-400',
    purple: 'bg-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    rose: 'bg-rose-500/20 text-rose-400',
  };

  const getStepLabel = () => {
    const labels: Record<number, string> = {
      1: 'Step 1: Requisition Validation',
      2: 'Step 2: Approval Check',
      3: 'Step 3: PO Generation',
      4: `Step 4: ${receiptLabel}`,
      5: 'Step 5: Invoice Validation',
      6: 'Step 6: Fraud Analysis',
      7: 'Step 7: Compliance Check',
      8: 'Step 8: Final Approval',
      9: 'Step 9: Payment Execution',
    };
    return labels[selectedStep] || '';
  };

  const getStepColor = () => {
    const step = steps.find(s => s.id === selectedStep);
    return step?.color || 'blue';
  };

  const renderStepFlow = () => {
    switch (selectedStep) {
      case 1:
        return <Step1Flow />;
      case 2:
        return (
          <AgentDecisionStepFlow
            agentName="Approval Agent"
            agentIcon={<CheckCircle className="h-4 w-4 text-white" />}
            agentColor="emerald"
            checks={['Check amount thresholds', 'Detect duplicate requests', 'Assess vendor risk score', 'Validate policy compliance', 'Verify budget allocation']}
            successLabel="AUTO-APPROVE ✓"
          />
        );
      case 3:
        return (
          <AgentDecisionStepFlow
            agentName="PO Agent"
            agentIcon={<ShoppingCart className="h-4 w-4 text-white" />}
            agentColor="indigo"
            checks={['Extract line items', 'Validate supplier data', 'Check payment terms', 'Verify contract compliance', 'Generate PO document']}
            successLabel="AUTO-GENERATE ✓"
          />
        );
      case 4:
        return (
          <AgentDecisionStepFlow
            agentName="Receiving Agent"
            agentIcon={<Package className="h-4 w-4 text-white" />}
            agentColor="amber"
            checks={['Match received quantity', 'Verify quality specs', 'Check delivery timeline', 'Assess damage/issues', 'Update inventory']}
            successLabel="AUTO-CONFIRM ✓"
          />
        );
      case 5:
        return (
          <AgentDecisionStepFlow
            agentName="Invoice Agent"
            agentIcon={<Calculator className="h-4 w-4 text-white" />}
            agentColor="teal"
            checks={['Requisition ↔ PO match', 'PO ↔ Invoice match', 'Invoice ↔ GR match', 'Apply tolerance checks', 'Validate amounts']}
            successLabel="3-WAY MATCH ✓"
          />
        );
      case 6:
        return (
          <AgentDecisionStepFlow
            agentName="Fraud Agent"
            agentIcon={<AlertTriangle className="h-4 w-4 text-white" />}
            agentColor="amber"
            checks={['Detect unusual patterns', 'Analyze vendor behavior', 'Check for split invoicing', 'Flag high-risk transactions', 'Calculate fraud risk score']}
            successLabel="FRAUD CHECK ✓"
          />
        );
      case 7:
        return (
          <AgentDecisionStepFlow
            agentName="Compliance Agent"
            agentIcon={<FileCheck className="h-4 w-4 text-white" />}
            agentColor="purple"
            checks={['SOX 404 validation', 'Regulatory compliance', 'Policy exception check', 'Audit trail verification', 'Document completeness']}
            successLabel="COMPLIANT ✓"
          />
        );
      case 8:
        return <Step8Flow />;
      case 9:
        return <Step9Flow />;
      default:
        return <Step1Flow />;
    }
  };

  const getDetailsForPanel = (type: DetailsType) => {
    const data = statsData.find(s => s.key === type);
    if (!data) return null;
    return { title: data.tooltipTitle, icon: data.icon, items: data.tooltipItems, color: data.color };
  };

  const panelData = openDetails ? getDetailsForPanel(openDetails) : null;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700">
      {/* Accordion Header - Clickable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-8 pb-6 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors rounded-t-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-xl font-bold text-white">AI Agent Workflow Pipeline</h3>
            <p className="text-sm text-slate-400">
              {isOpen ? 'Click any step to see the decision flow' : 'Click to expand workflow details'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-600">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-slate-300">Powered by Bedrock Nova Pro</span>
          </div>
          <ChevronDown 
            className={`h-6 w-6 text-slate-400 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </div>
      </button>

      {/* Accordion Content - Workflow Details */}
      <div
        className={`transition-all duration-500 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="px-8 pb-8 pt-2">
          {/* Step Selector Timeline */}
          <div className="relative mb-8 pt-4">
            <div className="absolute top-14 left-10 right-10 h-1 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 rounded-full" />
            <div 
              className="absolute top-14 left-10 h-1 bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(0, ((selectedStep - 1) / (steps.length - 1)) * 100)}%`, maxWidth: 'calc(100% - 80px)' }}
            />

            <div className="grid grid-cols-9 gap-2">
              {steps.map((step) => {
                const Icon = step.icon;
            const isSelected = selectedStep === step.id;
            const isPast = step.id < selectedStep;
            
            const colorStyles: Record<string, { gradient: string; glow: string }> = {
              blue: { gradient: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/40' },
              emerald: { gradient: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/40' },
              indigo: { gradient: 'from-indigo-500 to-indigo-600', glow: 'shadow-indigo-500/40' },
              amber: { gradient: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/40' },
              teal: { gradient: 'from-teal-500 to-cyan-600', glow: 'shadow-teal-500/40' },
              purple: { gradient: 'from-purple-500 to-violet-600', glow: 'shadow-purple-500/40' },
              cyan: { gradient: 'from-cyan-500 to-cyan-600', glow: 'shadow-cyan-500/40' },
              rose: { gradient: 'from-rose-500 to-pink-600', glow: 'shadow-rose-500/40' },
            };
            
            const style = colorStyles[step.color];

            return (
              <div key={step.id} className="flex flex-col items-center">
                <button
                  onClick={() => onStepSelect(step.id)}
                  className={`
                    relative z-10 h-20 w-20 rounded-2xl flex flex-col items-center justify-center gap-1
                    transform transition-all duration-300 hover:scale-110 cursor-pointer
                    ${isSelected 
                      ? `bg-gradient-to-br ${style.gradient} shadow-xl ${style.glow} ring-2 ring-white/30` 
                      : isPast
                        ? 'bg-gradient-to-br from-slate-600 to-slate-700 shadow-lg'
                        : 'bg-slate-800 border-2 border-slate-600 hover:border-slate-500'
                    }
                  `}
                >
                  <div className={`
                    absolute -top-2 -right-2 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${isSelected ? 'bg-white text-slate-900' : isPast ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'}
                  `}>
                    {isPast ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.id}
                  </div>
                  <Icon className={`h-7 w-7 ${isSelected ? 'text-white' : isPast ? 'text-slate-300' : 'text-slate-400'}`} />
                  {isSelected && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                      <Bot className="h-4 w-4 text-white animate-pulse" />
                    </div>
                  )}
                </button>
                <div className="mt-4 text-center">
                  <p className={`text-xs font-semibold ${isSelected ? 'text-white' : isPast ? 'text-slate-400' : 'text-slate-500'}`}>
                    {step.name}
                  </p>
                  {isSelected && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-[10px] font-medium">
                      SELECTED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Flow Diagram - Centered, Fixed Width, No Scroll */}
      <div className="w-full flex justify-center">
        <div className="w-full max-w-6xl px-8 py-6 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700">
          {/* Step Label */}
          <div className="text-center mb-6">
            <span className={`px-3 py-1 ${colorBgMap[getStepColor()]} rounded-full text-xs font-semibold`}>
              {getStepLabel()}
            </span>
          </div>
          
          {/* Flow Content - Pure Flexbox */}
          {renderStepFlow()}
        </div>
      </div>
        </div>
      </div>

      {/* Stats Cards - Always visible outside accordion */}
      <div className="px-8 pb-8">
        <div className="grid grid-cols-4 gap-4">
          {statsData.map((stat) => (
            <StatsCard 
              key={stat.key}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              color={stat.color}
              tooltipTitle={stat.tooltipTitle}
              tooltipItems={stat.tooltipItems}
              onOpenPanel={() => setOpenDetails(stat.key)}
            />
          ))}
        </div>
      </div>

      {/* Details Modal */}
      {openDetails && panelData && (
        <DetailsPanel
          title={panelData.title}
          icon={panelData.icon}
          items={panelData.items}
          color={panelData.color}
          onClose={() => setOpenDetails(null)}
        />
      )}
    </div>
  );
}
