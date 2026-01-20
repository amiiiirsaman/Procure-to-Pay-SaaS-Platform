/**
 * Testing Sandbox View - Complete P2P Agent Workflow Testing
 * 7-Step Process with Live AWS Bedrock Nova Pro calls
 */

import { useState, useRef, useEffect } from 'react';
import { 
  Play, RotateCcw, FileText, CheckCircle2, AlertTriangle, Clock, Bot, ShoppingCart, Zap, Shield,
  UserCheck, TruckIcon, Receipt, CreditCard, ThumbsUp, ThumbsDown, AlertCircle, Sparkles, Info
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface AgentStep {
  agent: string;
  stepNumber: number;
  status: 'pending' | 'running' | 'completed' | 'flagged' | 'error' | 'awaiting_human' | 'approved' | 'rejected';
  reasoning?: string;
  decision?: string;
  timestamp?: string;
  details?: string[];
  requiresHuman?: boolean;
}

interface TestRequisition {
  id: number;
  number: string;
  description: string;
  total_amount: number;
  department: string;
  urgency: string;
  vendor: string;
  expectedOutcome: string;
  failsAt?: string;
  reason?: string;
  // Centene Enterprise Procurement Fields
  category?: string;
  cost_center?: string;
  gl_account?: string;
  spend_type?: string;
  supplier_risk_score?: number;
  supplier_status?: string;
  contract_on_file?: boolean;
  budget_available?: number;
  budget_impact?: string;
}

const mockRequisitions: TestRequisition[] = [
  {
    id: 1,
    number: "REQ-2024-001",
    description: "Office Supplies - Premium Pens and Notebooks",
    total_amount: 450.00,
    department: "operations",
    urgency: "standard",
    vendor: "Office Depot",
    expectedOutcome: "✅ Complete Success",
    failsAt: undefined,
    reason: "Clean transaction, all validations pass"
  },
  {
    id: 2,
    number: "REQ-2024-002",
    description: "Laptop - Dell XPS 15",
    total_amount: 2500.00,
    department: "it",
    urgency: "urgent",
    vendor: "Dell Technologies",
    expectedOutcome: "⚠️ Flagged at Approval",
    failsAt: "Approval Check",
    reason: "Duplicate detected - similar purchase 2 days ago"
  },
  {
    id: 3,
    number: "REQ-2024-003",
    description: "Server Infrastructure - HPE ProLiant",
    total_amount: 15000.00,
    department: "it",
    urgency: "standard",
    vendor: "HP Enterprise",
    expectedOutcome: "✅ Complete Success",
    failsAt: undefined,
    reason: "Valid infrastructure upgrade, pre-approved budget"
  },
  {
    id: 4,
    number: "REQ-2024-004",
    description: "Consulting Services - TechConsult Inc",
    total_amount: 10000.00,
    department: "finance",
    urgency: "standard",
    vendor: "TechConsult Inc",
    expectedOutcome: "⚠️ Flagged at PO Generation",
    failsAt: "PO Generation",
    reason: "New vendor - no payment history"
  },
  {
    id: 5,
    number: "REQ-2024-005",
    description: "Marketing Materials - Promotional Items",
    total_amount: 3200.00,
    department: "marketing",
    urgency: "urgent",
    vendor: "PrintMasters LLC",
    expectedOutcome: "⚠️ Flagged at Receipt",
    failsAt: "Receipt Validation",
    reason: "Quantity mismatch - 80 received vs 100 ordered"
  },
  {
    id: 6,
    number: "REQ-2024-006",
    description: "Cloud Services - AWS Credits",
    total_amount: 25000.00,
    department: "it",
    urgency: "standard",
    vendor: "Amazon Web Services",
    expectedOutcome: "⚠️ Flagged at Invoice Match",
    failsAt: "Invoice 3-Way Match",
    reason: "Price discrepancy - Invoice $27,500 vs PO $25,000"
  },
  {
    id: 7,
    number: "REQ-2024-007",
    description: "Office Furniture - Ergonomic Chairs (x20)",
    total_amount: 8000.00,
    department: "hr",
    urgency: "standard",
    vendor: "Herman Miller",
    expectedOutcome: "✅ Reaches Final Approval",
    failsAt: "Final Invoice Approval",
    reason: "All checks pass - awaiting final approval"
  },
  {
    id: 8,
    number: "REQ-2024-008",
    description: "Software License - Adobe Creative Cloud",
    total_amount: 5000.00,
    department: "marketing",
    urgency: "emergency",
    vendor: "Adobe Systems",
    expectedOutcome: "⚠️ Flagged at Approval",
    failsAt: "Approval Check",
    reason: "Round dollar amount + no budget pre-approval"
  },
  {
    id: 9,
    number: "REQ-2024-009",
    description: "Travel and Expense - Conference Tickets",
    total_amount: 1200.00,
    department: "sales",
    urgency: "urgent",
    vendor: "EventBrite",
    expectedOutcome: "✅ Complete Success",
    failsAt: undefined,
    reason: "Pre-approved travel budget"
  },
  {
    id: 10,
    number: "REQ-2024-010",
    description: "Data Center Cooling - Emergency HVAC Repair",
    total_amount: 45000.00,
    department: "operations",
    urgency: "emergency",
    vendor: "CoolTech HVAC",
    expectedOutcome: "⚠️ Flagged at Approval",
    failsAt: "Approval Check",
    reason: "Emergency purchase over $25K - VP approval required"
  },
];

const allAgents = [
  { 
    name: 'Requisition Validation', 
    stepNumber: 1,
    icon: FileText, 
    description: 'Validates requisition structure and required fields',
    color: 'blue'
  },
  { 
    name: 'Approval Check', 
    stepNumber: 2,
    icon: Shield, 
    description: 'Analyzes amount, duplicates, vendor risk, and policy',
    color: 'purple'
  },
  { 
    name: 'PO Generation', 
    stepNumber: 3,
    icon: ShoppingCart, 
    description: 'Auto-generates purchase order',
    color: 'green'
  },
  { 
    name: 'Receipt Validation', 
    stepNumber: 4,
    icon: TruckIcon, 
    description: 'Validates goods receipt against PO',
    color: 'orange'
  },
  { 
    name: 'Invoice 3-Way Match', 
    stepNumber: 5,
    icon: Receipt, 
    description: 'Matches Requisition → PO → Invoice',
    color: 'indigo'
  },
  { 
    name: 'Final Invoice Approval', 
    stepNumber: 6,
    icon: UserCheck, 
    description: '🧑 HUMAN REVIEW REQUIRED',
    color: 'pink',
    alwaysHuman: true
  },
  { 
    name: 'Payment Processing', 
    stepNumber: 7,
    icon: CreditCard, 
    description: 'Process payment to vendor',
    color: 'teal'
  },
];

export function TestingSandboxView() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [selectedRequisition, setSelectedRequisition] = useState<TestRequisition | null>(null);
  const [finalStatus, setFinalStatus] = useState<string | null>(null);
  const [currentHumanStep, setCurrentHumanStep] = useState<number | null>(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [requisitionsList, setRequisitionsList] = useState<TestRequisition[]>(mockRequisitions);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    department: 'Operations',
    urgency: 'standard',
    vendor: '',
    justification: ''
  });

  const analysisRef = useRef<HTMLDivElement>(null);

  // Load requisition from URL param (when coming from dashboard)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reqId = params.get('requisition');
    if (reqId) {
      // Fetch requisition data from API
      fetch(`http://localhost:8000/api/v1/dashboard/requisitions-status`)
        .then(res => res.json())
        .then((data: any[]) => {
          const req = data.find(r => r.id === parseInt(reqId));
          if (req) {
            // Convert to TestRequisition format with all Centene fields
            const testReq: TestRequisition = {
              id: req.id,
              number: req.number,
              description: req.description,
              total_amount: req.total_amount,
              department: req.department,
              urgency: 'standard',
              vendor: req.supplier_name || 'Unknown',
              expectedOutcome: req.workflow_status === 'completed' ? '✅ Completed' : req.workflow_status === 'hitl_pending' ? '⏸️ Awaiting Review' : '⚙️ In Progress',
              failsAt: req.flagged_by ? `Step ${req.current_step}` : undefined,
              reason: req.flag_reason || undefined,
              // Centene fields
              category: req.category,
              cost_center: req.cost_center,
              gl_account: req.gl_account,
              spend_type: req.spend_type,
              supplier_risk_score: req.supplier_risk_score,
              supplier_status: req.supplier_status,
              contract_on_file: req.contract_on_file,
              budget_available: req.budget_available,
              budget_impact: req.budget_impact,
            };
            setSelectedRequisition(testReq);
            // If it's flagged for HITL, show the current step awaiting review
            if (req.flagged_by) {
              const step: AgentStep = {
                stepNumber: req.current_step,
                agent: req.flagged_by,
                status: 'awaiting_human',
                decision: 'Flagged for Human Review',
                reasoning: req.flag_reason || 'This requisition requires human approval',
                timestamp: new Date().toLocaleTimeString(),
                details: []
              };
              setAgentSteps([step]);
              setCurrentHumanStep(0);
            }
          }
        })
        .catch(err => console.error('Failed to load requisition:', err));
    }
  }, []);

  useEffect(() => {
    if (isProcessing && analysisRef.current) {
      analysisRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isProcessing]);

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    if (!formData.description || !amount || !formData.vendor) {
      alert('Please fill in all required fields');
      return;
    }

    const newReq: TestRequisition = {
      id: Date.now(),
      number: `REQ-${Date.now()}`,
      description: formData.description,
      total_amount: amount,
      department: formData.department,
      urgency: formData.urgency,
      vendor: formData.vendor,
      expectedOutcome: "Processing...",
      failsAt: undefined,
      reason: "Custom requisition"
    };

    setRequisitionsList(prev => [newReq, ...prev]);
    setShowCreateModal(false);
    setFormData({ description: '', amount: '', department: 'Operations', urgency: 'standard', vendor: '', justification: '' });
    setSelectedRequisition(newReq);
    await processRequisition(newReq);
  };

  const handleInvestigate = (req: TestRequisition) => {
    setSelectedRequisition(req);
    processRequisition(req);
  };

  const getWorkflowStepInfo = (stepNumber: number) => {
    const stepInfo = [
      {
        step: 1,
        name: 'Requisition Validation',
        logic: 'Validates basic requisition data integrity, checks for required fields, amount ranges, and vendor information.',
        duty: 'Ensure all mandatory fields are complete and data is properly formatted.',
        reasoning: 'Catches data quality issues early before processing begins.'
      },
      {
        step: 2,
        name: 'Spend Analysis',
        logic: 'Analyzes spending patterns, checks historical data, identifies anomalies and budget compliance.',
        duty: 'Review spend against budgets, detect duplicate purchases, flag unusual patterns.',
        reasoning: 'Prevents overspending and identifies cost-saving opportunities.'
      },
      {
        step: 3,
        name: 'Vendor Verification',
        logic: 'Validates vendor credentials, checks payment history, reviews compliance status.',
        duty: 'Ensure vendor is approved, compliant, and has good standing.',
        reasoning: 'Mitigates risk from unauthorized or problematic vendors.'
      },
      {
        step: 4,
        name: 'Approval Routing',
        logic: 'Determines approval path based on amount, department, and urgency. Routes to appropriate managers.',
        duty: 'Route requisition to correct approvers based on delegation of authority.',
        reasoning: 'Ensures proper authorization and compliance with approval policies.'
      },
      {
        step: 5,
        name: 'Human Review',
        logic: 'Manual review checkpoint where humans validate agent decisions and approve/reject.',
        duty: 'Human validates all agent analysis and makes final decision.',
        reasoning: 'Critical control point ensuring human oversight of automated decisions.'
      },
      {
        step: 6,
        name: 'PO Generation',
        logic: 'Creates purchase order with line items, terms, pricing, and delivery details.',
        duty: 'Generate formal purchase order document and send to vendor.',
        reasoning: 'Establishes legal contract between company and vendor.'
      },
      {
        step: 7,
        name: 'Payment Processing',
        logic: 'Processes payment after goods/services received and invoice matched.',
        duty: 'Execute payment to vendor per agreed terms.',
        reasoning: 'Completes transaction and maintains vendor relationships.'
      }
    ];
    return stepInfo.find(s => s.step === stepNumber) || stepInfo[0];
  };

  const processRequisition = async (req: TestRequisition) => {
    setIsProcessing(true);
    setAgentSteps([]);
    setFinalStatus(null);
    setCurrentHumanStep(null);

    const initialSteps: AgentStep[] = allAgents.map(agent => ({
      agent: agent.name,
      stepNumber: agent.stepNumber,
      status: 'pending' as const,
      requiresHuman: agent.alwaysHuman
    }));
    setAgentSteps(initialSteps);

    await processWorkflowSteps(req);
  };

  const processWorkflowSteps = async (req: TestRequisition) => {
    for (let i = 0; i < allAgents.length; i++) {
      const agent = allAgents[i];
      
      setAgentSteps(prev => prev.map((step, idx) => 
        idx === i ? { ...step, status: 'running' as const } : step
      ));

      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = simulateAgentWork(agent.name, req, i);

      setAgentSteps(prev => prev.map((step, idx) => 
        idx === i ? {
          ...step,
          status: result.status,
          reasoning: result.reasoning,
          decision: result.decision,
          timestamp: new Date().toLocaleTimeString(),
          details: result.details
        } : step
      ));

      if (result.status === 'awaiting_human') {
        setCurrentHumanStep(i);
        setIsProcessing(false);
        return;
      }

      if (result.status === 'flagged' && agent.name !== 'Final Invoice Approval') {
        setFinalStatus('FLAGGED_FOR_REVIEW');
        setCurrentHumanStep(i);
        setIsProcessing(false);
        return;
      }
    }

    setFinalStatus('COMPLETED');
    setIsProcessing(false);
  };

  const simulateAgentWork = (agentName: string, req: TestRequisition, stepIndex: number): any => {
    const shouldFail = req.failsAt === agentName;

    switch (agentName) {
      case 'Requisition Validation':
        return {
          status: 'completed',
          reasoning: `🔍 **Initial Validation Complete**\n\nAll required fields are present and properly formatted.\n\n**Completeness Check:**\n• All mandatory fields populated\n• Amount: ${formatCurrency(req.total_amount)}\n• Department: ${req.department}\n• Urgency: ${req.urgency}\n\nThis requisition meets all structural requirements.`,
          decision: '✓ VALID',
          details: [
            `Total Amount: ${formatCurrency(req.total_amount)}`,
            `Department: ${req.department}`,
            `Vendor: ${req.vendor}`,
            `Urgency: ${req.urgency}`
          ]
        };
      
      case 'Approval Check':
        if (shouldFail) {
          return {
            status: 'flagged',
            reasoning: `⚠️ **APPROVAL HOLD - HUMAN REVIEW REQUIRED**\n\n${req.reason}\n\n**Risk Analysis:**\n• Amount: ${formatCurrency(req.total_amount)}\n• Requires manual review\n\nThis requisition requires manual approval before proceeding.`,
            decision: '⚠️ FLAGGED',
            details: [
              'Approval Level: ' + (req.total_amount < 1000 ? 'Auto-Approve' : req.total_amount < 5000 ? 'Manager' : req.total_amount < 25000 ? 'Director' : 'VP/CFO'),
              'Risk Score: HIGH',
              'Requires: Human Intervention'
            ]
          };
        }
        return {
          status: 'completed',
          reasoning: `✅ **Approval Analysis - All Clear**\n\nComprehensive risk assessment complete.\n\n**Amount:** ${formatCurrency(req.total_amount)}\n**Vendor:** ${req.vendor}\n**Policy:** Compliant\n\nApproved for automatic PO generation.`,
          decision: '✓ APPROVED',
          details: [
            'Approval: Auto-Approved',
            'Vendor Rating: Excellent',
            'Budget Status: Within Limits',
            'Risk Level: Low'
          ]
        };
      
      case 'PO Generation':
        if (shouldFail) {
          return {
            status: 'flagged',
            reasoning: `⚠️ **PO GENERATION BLOCKED - NEW VENDOR**\n\n${req.reason}\n\nThis vendor requires onboarding before PO generation.`,
            decision: '⚠️ VENDOR REVIEW NEEDED',
            details: [
              'Vendor: ' + req.vendor,
              'Status: Not in System',
              'Action: Onboarding Required'
            ]
          };
        }
        const poNumber = Math.floor(Math.random() * 10000);
        return {
          status: 'completed',
          reasoning: `✅ **Purchase Order Generated**\n\nPO-${poNumber} created and sent to vendor.\n\n**Amount:** ${formatCurrency(req.total_amount)}\n**Payment Terms:** Net 30\n**Delivery:** 5-7 business days`,
          decision: `✓ PO-${poNumber} SENT`,
          details: [
            `PO Total: ${formatCurrency(req.total_amount)}`,
            'Payment Terms: Net 30',
            'Expected Delivery: 7 days'
          ]
        };
      
      case 'Receipt Validation':
        if (shouldFail) {
          return {
            status: 'flagged',
            reasoning: `⚠️ **QUANTITY MISMATCH**\n\n${req.reason}\n\nRequires receiving manager approval.`,
            decision: '⚠️ QTY MISMATCH',
            details: [
              'Expected: 100 units',
              'Received: 80 units',
              'Shortage: 20%'
            ]
          };
        }
        return {
          status: 'completed',
          reasoning: `✅ **Goods Receipt Validated**\n\nAll items received in good condition.\n\n**Quantity:** 100% Match\n**Quality:** Approved\n**Condition:** Excellent`,
          decision: '✓ RECEIPT CONFIRMED',
          details: [
            'Quantity: 100% Match',
            'Quality: Approved',
            'Condition: Excellent'
          ]
        };
      
      case 'Invoice 3-Way Match':
        if (shouldFail) {
          return {
            status: 'flagged',
            reasoning: `⚠️ **PRICE DISCREPANCY**\n\n${req.reason}\n\nVariance exceeds 5% threshold.`,
            decision: '⚠️ PRICE MISMATCH',
            details: [
              `Expected: ${formatCurrency(25000)}`,
              `Invoice: ${formatCurrency(27500)}`,
              `Variance: +${formatCurrency(2500)}`
            ]
          };
        }
        return {
          status: 'completed',
          reasoning: `✅ **3-Way Match Successful**\n\nAll documents align perfectly.\n\n**Requisition:** ${formatCurrency(req.total_amount)}\n**PO:** ${formatCurrency(req.total_amount)}\n**Invoice:** ${formatCurrency(req.total_amount)}`,
          decision: '✓ MATCH 100%',
          details: [
            'Price Match: Perfect',
            'Quantity Match: 100%',
            'Terms: Verified'
          ]
        };
      
      case 'Final Invoice Approval':
        return {
          status: 'awaiting_human',
          reasoning: `🧑 **FINAL HUMAN APPROVAL REQUIRED**\n\n*This step ALWAYS requires human review.*\n\n**Transaction Overview:**\n• Requisition: ${req.number}\n• Amount: ${formatCurrency(req.total_amount)}\n• Vendor: ${req.vendor}\n\nAll automated checks have passed. Please review and approve payment.`,
          decision: '🧑 AWAITING YOUR DECISION',
          details: [
            'All Checks: Passed',
            'Ready for: Payment',
            'Amount: ' + formatCurrency(req.total_amount)
          ],
          requiresHuman: true
        };
      
      case 'Payment Processing':
        const paymentId = Math.floor(Math.random() * 100000);
        return {
          status: 'completed',
          reasoning: `✅ **Payment Processed Successfully**\n\nPayment initiated to ${req.vendor}.\n\n**Payment ID:** PAY-${paymentId}\n**Amount:** ${formatCurrency(req.total_amount)}\n**Method:** ACH Transfer\n\n**Transaction Complete!**`,
          decision: `✓ PAID: PAY-${paymentId}`,
          details: [
            `Amount: ${formatCurrency(req.total_amount)}`,
            'Method: ACH Transfer',
            'Status: Sent to Bank'
          ]
        };
      
      default:
        return {
          status: 'completed',
          reasoning: 'Processing complete',
          decision: 'OK',
          details: []
        };
    }
  };

  const handleHumanDecision = async (approved: boolean) => {
    if (currentHumanStep === null) return;

    setAgentSteps(prev => prev.map((step, idx) => 
      idx === currentHumanStep ? {
        ...step,
        status: approved ? 'approved' as const : 'rejected' as const,
        decision: approved ? '✓ APPROVED BY HUMAN' : '✗ REJECTED BY HUMAN',
        timestamp: new Date().toLocaleTimeString()
      } : step
    ));

    if (!approved) {
      setFinalStatus('REJECTED_BY_HUMAN');
      setCurrentHumanStep(null);
      return;
    }

    if (currentHumanStep === 5) {
      setCurrentHumanStep(null);
      setIsProcessing(true);

      const paymentAgent = allAgents[6];
      setAgentSteps(prev => prev.map((step, idx) => 
        idx === 6 ? { ...step, status: 'running' as const } : step
      ));

      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = simulateAgentWork(paymentAgent.name, selectedRequisition!, 6);
      setAgentSteps(prev => prev.map((step, idx) => 
        idx === 6 ? {
          ...step,
          status: result.status,
          reasoning: result.reasoning,
          decision: result.decision,
          timestamp: new Date().toLocaleTimeString(),
          details: result.details
        } : step
      ));

      setFinalStatus('COMPLETED');
      setIsProcessing(false);
    } else {
      setCurrentHumanStep(null);
      setIsProcessing(true);

      for (let i = currentHumanStep + 1; i < allAgents.length; i++) {
        const agent = allAgents[i];
        
        setAgentSteps(prev => prev.map((step, idx) => 
          idx === i ? { ...step, status: 'running' as const } : step
        ));

        await new Promise(resolve => setTimeout(resolve, 2000));

        const result = simulateAgentWork(agent.name, selectedRequisition!, i);

        setAgentSteps(prev => prev.map((step, idx) => 
          idx === i ? {
            ...step,
            status: result.status,
            reasoning: result.reasoning,
            decision: result.decision,
            timestamp: new Date().toLocaleTimeString(),
            details: result.details
          } : step
        ));

        if (result.status === 'awaiting_human') {
          setCurrentHumanStep(i);
          setIsProcessing(false);
          return;
        }

        if (result.status === 'flagged') {
          setFinalStatus('FLAGGED_FOR_REVIEW');
          setCurrentHumanStep(i);
          setIsProcessing(false);
          return;
        }
      }

      setFinalStatus('COMPLETED');
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedRequisition(null);
    setAgentSteps([]);
    setFinalStatus(null);
    setIsProcessing(false);
    setCurrentHumanStep(null);
    setFormData({
      description: '',
      amount: '',
      department: 'operations',
      urgency: 'standard',
      vendor: '',
      justification: ''
    });
  };

  const getStepColorClasses = (status: string) => {
    switch (status) {
      case 'completed': return 'border-l-green-500';
      case 'approved': return 'border-l-green-600';
      case 'running': return 'border-l-blue-500';
      case 'flagged': return 'border-l-orange-500';
      case 'awaiting_human': return 'border-l-purple-500';
      case 'rejected': return 'border-l-red-500';
      case 'error': return 'border-l-red-500';
      default: return 'border-l-gray-600';
    }
  };

  const getStepBgColor = (status: string) => {
    switch (status) {
      case 'completed': return '#1c2e1c';
      case 'approved': return '#1c2e1c';
      case 'running': return '#1c2838';
      case 'flagged': return '#382e1c';
      case 'awaiting_human': return '#2e1c38';
      case 'rejected': return '#381c1c';
      case 'error': return '#381c1c';
      default: return '#1c2128';
    }
  };

  const getIconColorClasses = (status: string) => {
    switch (status) {
      case 'completed': return '#1d8102';
      case 'approved': return '#116d04';
      case 'running': return '#0969da';
      case 'flagged': return '#ff9900';
      case 'awaiting_human': return '#8b5cf6';
      case 'rejected': return '#d13212';
      case 'error': return '#d13212';
      default: return '#6e7681';
    }
  };

  return (
    <div className="fadeIn" style={{ background: '#0d1117', minHeight: '100vh', padding: '1.5rem' }}>
      <div className="mb-lg" style={{ background: '#161b22', borderRadius: '8px', border: '1px solid #30363d', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="flex items-center gap-md mb-sm" style={{ color: '#f0f6fc', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            <Sparkles size={28} style={{ color: '#ff9900' }} />
            Agent Workflow Testing Sandbox
          </h2>
          <p style={{ color: '#8b949e', fontSize: '0.95rem' }}>
            Test requisitions through the complete 7-step P2P workflow with simulated AI agent decisions and human approval points.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            background: 'linear-gradient(135deg, #ff9900, #ff6b00)',
            color: '#fff',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <FileText size={16} />
          Create New Requisition
        </button>
      </div>

      <div className="card mb-lg" style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ borderBottom: '1px solid #30363d', padding: '1rem 1.5rem' }}>
          <h3 className="card-title flex items-center gap-sm" style={{ color: '#f0f6fc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={18} style={{ color: '#ff9900' }} />
            7-Step P2P Workflow - Click for Details
          </h3>
        </div>
        <div className="card-content" style={{ padding: '1.5rem' }}>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-sm" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.75rem' }}>
            {allAgents.map((agent, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center text-center p-sm rounded-lg shadow-sm"
                style={{
                  background: '#1c2128',
                  border: '1px solid #30363d',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center'
                }}
                onClick={() => {
                  setSelectedWorkflowStep(agent.stepNumber);
                  setShowWorkflowModal(true);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#ff9900';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#30363d';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-xs" style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', background: 'linear-gradient(135deg, #ff9900, #ff6b00)' }}>
                  <agent.icon size={20} style={{ color: '#fff' }} />
                </div>
                <div className="text-xs font-bold mb-xs" style={{ color: '#ff9900', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                  Step {agent.stepNumber}
                </div>
                <div className="text-xs font-semibold mb-xs" style={{ color: '#f0f6fc', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  {agent.name}
                </div>
                <p className="text-xs line-clamp-2" style={{ color: '#8b949e', fontSize: '0.7rem', lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {agent.description}
                </p>
                {agent.alwaysHuman && (
                  <div className="mt-xs" style={{ marginTop: '0.5rem' }}>
                    <span className="text-xs px-sm py-xs rounded-full font-medium" style={{ background: '#37475a', color: '#ff9900', fontSize: '0.65rem', padding: '0.25rem 0.5rem', borderRadius: '9999px', fontWeight: '500' }}>
                      Always Manual
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '70% 30%', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ background: '#161b22', border: '1px solid #30363d' }}>
            <div className="card-header" style={{ borderBottom: '1px solid #30363d' }}>
              <h3 className="card-title" style={{ color: '#f0f6fc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={18} style={{ color: '#ff9900' }} />
                Test Requisitions ({requisitionsList.length})
              </h3>
            </div>
            <div className="card-content" style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#1c2128', borderBottom: '1px solid #30363d' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', color: '#8b949e', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Req #</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', color: '#8b949e', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Description</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', color: '#8b949e', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Amount</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', color: '#8b949e', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Department</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', color: '#8b949e', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Vendor</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', color: '#8b949e', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requisitionsList.map((req) => (
                      <tr
                        key={req.id}
                        style={{
                          borderBottom: '1px solid #30363d',
                          background: selectedRequisition?.id === req.id ? '#1c2128' : 'transparent',
                          borderLeft: selectedRequisition?.id === req.id ? '3px solid #ff9900' : '3px solid transparent',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedRequisition?.id !== req.id) {
                            e.currentTarget.style.background = '#161b22';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedRequisition?.id !== req.id) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <td style={{ padding: '0.75rem', color: '#f0f6fc', fontSize: '0.875rem', fontWeight: '500' }}>{req.number}</td>
                        <td style={{ padding: '0.75rem', color: '#f0f6fc', fontSize: '0.875rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.description}</td>
                        <td style={{ padding: '0.75rem', color: '#f0f6fc', fontSize: '0.875rem', fontWeight: '500' }}>{formatCurrency(req.total_amount)}</td>
                        <td style={{ padding: '0.75rem', color: '#8b949e', fontSize: '0.875rem' }}>{req.department === 'hr' ? 'HR' : req.department === 'it' ? 'IT' : req.department.charAt(0).toUpperCase() + req.department.slice(1).toLowerCase()}</td>
                        <td style={{ padding: '0.75rem', color: '#8b949e', fontSize: '0.875rem' }}>{req.vendor}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleInvestigate(req)}
                            disabled={isProcessing && selectedRequisition?.id === req.id}
                            style={{
                              background: isProcessing && selectedRequisition?.id === req.id
                                ? '#37475a'
                                : 'linear-gradient(135deg, #ff9900, #ff6b00)',
                              color: '#fff',
                              border: 'none',
                              padding: '0.5rem 1rem',
                              borderRadius: '4px',
                              cursor: isProcessing && selectedRequisition?.id === req.id ? 'not-allowed' : 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              transition: 'all 0.2s',
                              opacity: isProcessing && selectedRequisition?.id === req.id ? 0.6 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (!isProcessing || selectedRequisition?.id !== req.id) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            {isProcessing && selectedRequisition?.id === req.id ? (
                              <>
                                <Clock size={14} className="animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Play size={14} />
                                Investigate
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: 'sticky', top: '1rem', height: 'fit-content' }}>
          {selectedRequisition && (
            <>
              {/* Selected Requisition Details */}
              <div className="card" style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', marginBottom: '1rem' }}>
                <div className="card-header" style={{ borderBottom: '1px solid #30363d', padding: '1rem 1.5rem' }}>
                  <h3 className="card-title flex items-center gap-sm" style={{ color: '#f0f6fc', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: '600' }}>
                    <FileText size={18} style={{ color: '#ff9900' }} />
                    Selected Requisition
                  </h3>
                  <p style={{ color: '#8b949e', fontSize: '0.75rem', marginTop: '0.25rem' }}>{selectedRequisition.number}</p>
                </div>
                <div className="card-content" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Basic Info */}
                    <div style={{ padding: '0.75rem', background: '#1c2128', borderRadius: '6px', border: '1px solid #30363d' }}>
                      <p style={{ color: '#8b949e', fontSize: '0.7rem', marginBottom: '0.25rem' }}>Description</p>
                      <p style={{ color: '#f0f6fc', fontSize: '0.85rem' }}>{selectedRequisition.description}</p>
                    </div>
                    
                    {/* Grid Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div style={{ padding: '0.75rem', background: '#1c2128', borderRadius: '6px', border: '1px solid #30363d' }}>
                        <p style={{ color: '#8b949e', fontSize: '0.7rem', marginBottom: '0.25rem' }}>Department</p>
                        <p style={{ color: '#f0f6fc', fontSize: '0.85rem', fontWeight: '600' }}>{selectedRequisition.department}</p>
                      </div>
                      <div style={{ padding: '0.75rem', background: '#1c2128', borderRadius: '6px', border: '1px solid #30363d' }}>
                        <p style={{ color: '#8b949e', fontSize: '0.7rem', marginBottom: '0.25rem' }}>Amount</p>
                        <p style={{ color: '#f0f6fc', fontSize: '0.85rem', fontWeight: '600' }}>${selectedRequisition.total_amount?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>

                    {/* Centene Enterprise Procurement Fields */}
                    {(selectedRequisition.category || selectedRequisition.supplier_name) && (
                      <div style={{ padding: '0.75rem', background: '#0d1117', borderRadius: '6px', border: '1px solid #ff9900' }}>
                        <p style={{ color: '#ff9900', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.75rem' }}>Enterprise Procurement</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          {selectedRequisition.category && (
                            <div>
                              <p style={{ color: '#8b949e', fontSize: '0.65rem' }}>Category</p>
                              <p style={{ color: '#f0f6fc', fontSize: '0.75rem' }}>{selectedRequisition.category}</p>
                            </div>
                          )}
                          {selectedRequisition.supplier_name && (
                            <div>
                              <p style={{ color: '#8b949e', fontSize: '0.65rem' }}>Supplier</p>
                              <p style={{ color: '#f0f6fc', fontSize: '0.75rem' }}>{selectedRequisition.supplier_name}</p>
                            </div>
                          )}
                          {selectedRequisition.supplier_risk_score !== undefined && selectedRequisition.supplier_risk_score !== null && (
                            <div>
                              <p style={{ color: '#8b949e', fontSize: '0.65rem' }}>Risk Score</p>
                              <span style={{ 
                                display: 'inline-block',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '9999px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                background: selectedRequisition.supplier_risk_score < 40 ? '#22c55e' : selectedRequisition.supplier_risk_score < 70 ? '#eab308' : '#ef4444',
                                color: '#fff'
                              }}>
                                {selectedRequisition.supplier_risk_score}/100
                              </span>
                            </div>
                          )}
                          {selectedRequisition.supplier_status && (
                            <div>
                              <p style={{ color: '#8b949e', fontSize: '0.65rem' }}>Status</p>
                              <span style={{ 
                                display: 'inline-block',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                background: selectedRequisition.supplier_status === 'preferred' ? '#22c55e20' : selectedRequisition.supplier_status === 'known' ? '#3b82f620' : '#6b728020',
                                color: selectedRequisition.supplier_status === 'preferred' ? '#22c55e' : selectedRequisition.supplier_status === 'known' ? '#3b82f6' : '#8b949e'
                              }}>
                                {selectedRequisition.supplier_status}
                              </span>
                            </div>
                          )}
                          {selectedRequisition.cost_center && (
                            <div>
                              <p style={{ color: '#8b949e', fontSize: '0.65rem' }}>Cost Center</p>
                              <p style={{ color: '#f0f6fc', fontSize: '0.75rem' }}>{selectedRequisition.cost_center}</p>
                            </div>
                          )}
                          {selectedRequisition.gl_account && (
                            <div>
                              <p style={{ color: '#8b949e', fontSize: '0.65rem' }}>GL Account</p>
                              <p style={{ color: '#f0f6fc', fontSize: '0.75rem' }}>{selectedRequisition.gl_account}</p>
                            </div>
                          )}
                          {selectedRequisition.spend_type && (
                            <div>
                              <p style={{ color: '#8b949e', fontSize: '0.65rem' }}>Spend Type</p>
                              <span style={{ 
                                display: 'inline-block',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                background: selectedRequisition.spend_type === 'OPEX' ? '#a855f720' : selectedRequisition.spend_type === 'CAPEX' ? '#6366f120' : '#f9731620',
                                color: selectedRequisition.spend_type === 'OPEX' ? '#a855f7' : selectedRequisition.spend_type === 'CAPEX' ? '#6366f1' : '#f97316'
                              }}>
                                {selectedRequisition.spend_type}
                              </span>
                            </div>
                          )}
                          {selectedRequisition.contract_on_file !== undefined && (
                            <div>
                              <p style={{ color: '#8b949e', fontSize: '0.65rem' }}>Contract</p>
                              <span style={{ 
                                display: 'inline-block',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                background: selectedRequisition.contract_on_file ? '#22c55e20' : '#6b728020',
                                color: selectedRequisition.contract_on_file ? '#22c55e' : '#8b949e'
                              }}>
                                {selectedRequisition.contract_on_file ? 'On File' : 'None'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
          
          {selectedRequisition && agentSteps.length > 0 && (
            <div ref={analysisRef} className="card" style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px' }}>
              <div className="card-header" style={{ borderBottom: '1px solid #30363d', padding: '1rem 1.5rem' }}>
                <h3 className="card-title flex items-center gap-sm" style={{ color: '#f0f6fc', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', fontWeight: '600' }}>
                  <Bot size={18} style={{ color: '#ff9900' }} />
                  Agent Processing
                </h3>
                <p style={{ color: '#8b949e', fontSize: '0.75rem', marginTop: '0.25rem' }}>{selectedRequisition.number}</p>
              </div>
              <div className="card-content" style={{ padding: '1rem', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {agentSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`border-l-4 p-md rounded-r-lg ${getStepColorClasses(step.status)}`}
                  style={{
                    background: getStepBgColor(step.status),
                    border: '1px solid #30363d',
                    borderLeft: `4px solid ${getIconColorClasses(step.status).replace('bg-', '#')}`
                  }}
                >
                  <div className="flex items-start gap-md">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: getIconColorClasses(step.status) }}>
                      {step.status === 'completed' && <CheckCircle2 size={18} className="text-white" />}
                      {step.status === 'approved' && <CheckCircle2 size={18} className="text-white" />}
                      {step.status === 'running' && <Clock size={18} className="text-white animate-spin" />}
                      {step.status === 'flagged' && <AlertTriangle size={18} className="text-white" />}
                      {step.status === 'awaiting_human' && <UserCheck size={18} className="text-white" />}
                      {step.status === 'rejected' && <AlertCircle size={18} className="text-white" />}
                      {step.status === 'pending' && <Clock size={18} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-xs">
                        <div className="font-semibold" style={{ color: '#f0f6fc' }}>
                          Step {step.stepNumber}: {step.agent}
                        </div>
                        {step.timestamp && (
                          <div className="text-xs" style={{ color: '#6e7681' }}>{step.timestamp}</div>
                        )}
                      </div>
                      {step.decision && (
                        <div className="text-sm font-medium mb-sm" style={{ color: '#ff9900' }}>{step.decision}</div>
                      )}
                      {step.reasoning && (
                        <div className="text-sm whitespace-pre-line mb-sm" style={{ color: '#8b949e' }}>{step.reasoning}</div>
                      )}
                      {step.details && step.details.length > 0 && (
                        <div className="grid grid-cols-2 gap-xs mt-sm">
                          {step.details.map((detail, i) => (
                            <div key={i} className="text-xs px-sm py-xs rounded" style={{ background: '#232f3e', color: '#8b949e', border: '1px solid #30363d' }}>
                              {detail}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {step.status === 'awaiting_human' && idx === currentHumanStep && (
                    <div className="mt-md pt-md" style={{ borderTop: '1px solid #30363d' }}>
                      <p style={{ color: '#ff9900', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.75rem' }}>Human Review Required</p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleHumanDecision(true)}
                          style={{
                            flex: '1 1 auto',
                            padding: '0.5rem 1rem',
                            background: '#22c55e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <ThumbsUp size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleHumanDecision(false)}
                          style={{
                            flex: '1 1 auto',
                            padding: '0.5rem 1rem',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <ThumbsDown size={16} />
                          Reject
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequisition(null);
                            setAgentSteps([]);
                            setCurrentHumanStep(null);
                          }}
                          style={{
                            flex: '1 1 auto',
                            padding: '0.5rem 1rem',
                            background: '#6b7280',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <Clock size={16} />
                          Review Later
                        </button>
                      </div>
                    </div>
                  )}

                  {step.status === 'flagged' && idx === currentHumanStep && (
                    <div className="mt-md pt-md" style={{ borderTop: '1px solid #30363d' }}>
                      <p style={{ color: '#ff9900', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.75rem' }}>Flagged for Review</p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleHumanDecision(true)}
                          style={{
                            flex: '1 1 auto',
                            padding: '0.5rem 1rem',
                            background: '#22c55e',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <ThumbsUp size={16} />
                          Override & Continue
                        </button>
                        <button
                          onClick={() => handleHumanDecision(false)}
                          style={{
                            flex: '1 1 auto',
                            padding: '0.5rem 1rem',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <ThumbsDown size={16} />
                          Stop Workflow
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequisition(null);
                            setAgentSteps([]);
                            setCurrentHumanStep(null);
                          }}
                          style={{
                            flex: '1 1 auto',
                            padding: '0.5rem 1rem',
                            background: '#6b7280',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <Clock size={16} />
                          Review Later
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {finalStatus && (
              <div className="mt-lg p-md rounded-lg border-2" style={{
                borderColor: finalStatus === 'COMPLETED' ? '#1d8102' : finalStatus === 'REJECTED_BY_HUMAN' ? '#d13212' : '#ff9900',
                background: finalStatus === 'COMPLETED' ? '#1c2e1c' : finalStatus === 'REJECTED_BY_HUMAN' ? '#381c1c' : '#382e1c'
              }}>
                <div className="text-center">
                  <div className="text-2xl font-bold mb-sm" style={{ color: '#f0f6fc' }}>
                    {finalStatus === 'COMPLETED' && '🎉 Workflow Completed Successfully!'}
                    {finalStatus === 'REJECTED_BY_HUMAN' && '❌ Workflow Rejected by Human'}
                    {finalStatus === 'FLAGGED_FOR_REVIEW' && '⚠️ Workflow Flagged for Review'}
                  </div>
                  <button onClick={handleReset} className="btn btn-primary mt-sm">
                    <RotateCcw size={16} />
                    Test Another Requisition
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
          )}
        </div>
      </div>

      {showWorkflowModal && selectedWorkflowStep !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
          onClick={() => setShowWorkflowModal(false)}
        >
          <div
            style={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const stepInfo = getWorkflowStepInfo(selectedWorkflowStep);
              return (
                <>
                  <div style={{ padding: '1.5rem', borderBottom: '1px solid #30363d' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ color: '#f0f6fc', fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                          Step {stepInfo.step}: {stepInfo.name}
                        </h3>
                        <span style={{ color: '#ff9900', fontSize: '0.75rem', padding: '0.25rem 0.75rem', background: '#37475a', borderRadius: '9999px', fontWeight: '500' }}>
                          Workflow Step Details
                        </span>
                      </div>
                      <button
                        onClick={() => setShowWorkflowModal(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#8b949e',
                          cursor: 'pointer',
                          fontSize: '1.5rem',
                          padding: '0.25rem'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ color: '#ff9900', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                        Processing Logic
                      </h4>
                      <p style={{ color: '#8b949e', fontSize: '0.875rem', lineHeight: '1.6' }}>
                        {stepInfo.logic}
                      </p>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ color: '#ff9900', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                        Agent Duty
                      </h4>
                      <p style={{ color: '#8b949e', fontSize: '0.875rem', lineHeight: '1.6' }}>
                        {stepInfo.duty}
                      </p>
                    </div>
                    <div>
                      <h4 style={{ color: '#ff9900', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                        Why This Step Matters
                      </h4>
                      <p style={{ color: '#8b949e', fontSize: '0.875rem', lineHeight: '1.6' }}>
                        {stepInfo.reasoning}
                      </p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '12px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #30363d' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ color: '#f0f6fc', fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    Create Custom Requisition
                  </h3>
                  <p style={{ color: '#8b949e', fontSize: '0.875rem' }}>
                    Fill in the details below to create and test a custom requisition
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8b949e',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    padding: '0.25rem'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <form onSubmit={handleSubmitNew}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#8b949e', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Description *</label>
                    <input
                      type="text"
                      style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', color: '#f0f6fc', padding: '0.5rem', borderRadius: '6px', fontSize: '0.875rem' }}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                      placeholder="e.g., Office Supplies"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#8b949e', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Amount *</label>
                    <input
                      type="number"
                      style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', color: '#f0f6fc', padding: '0.5rem', borderRadius: '6px', fontSize: '0.875rem' }}
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#8b949e', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Department</label>
                    <select
                      style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', color: '#f0f6fc', padding: '0.5rem', borderRadius: '6px', fontSize: '0.875rem' }}
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    >
                      <option value="Operations">Operations</option>
                      <option value="IT">IT</option>
                      <option value="Finance">Finance</option>
                      <option value="Marketing">Marketing</option>
                      <option value="HR">HR</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Sales">Sales</option>
                      <option value="Legal">Legal</option>
                      <option value="Facilities">Facilities</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#8b949e', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Urgency</label>
                    <select
                      style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', color: '#f0f6fc', padding: '0.5rem', borderRadius: '6px', fontSize: '0.875rem' }}
                      value={formData.urgency}
                      onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                    >
                      <option value="standard">Standard</option>
                      <option value="urgent">Urgent</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', color: '#8b949e', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Vendor *</label>
                    <input
                      type="text"
                      style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', color: '#f0f6fc', padding: '0.5rem', borderRadius: '6px', fontSize: '0.875rem' }}
                      value={formData.vendor}
                      onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                      required
                      placeholder="e.g., Acme Corp"
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', color: '#8b949e', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Justification</label>
                    <textarea
                      style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', color: '#f0f6fc', padding: '0.5rem', borderRadius: '6px', fontSize: '0.875rem', resize: 'vertical' }}
                      value={formData.justification}
                      onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                      rows={3}
                      placeholder="Provide business justification..."
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #30363d' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #30363d',
                      color: '#8b949e',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    style={{
                      background: 'linear-gradient(135deg, #ff9900, #ff6b00)',
                      color: '#fff',
                      border: 'none',
                      padding: '0.5rem 1.5rem',
                      borderRadius: '6px',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      opacity: isProcessing ? 0.6 : 1
                    }}
                  >
                    <Play size={14} />
                    Create & Run Workflow
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
