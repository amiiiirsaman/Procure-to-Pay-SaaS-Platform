import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  MessageSquare,
  Send,
  Bot,
  User,
  ArrowRight,
  TrendingUp,
  Package,
  Building2,
  RotateCcw,
  Check,
  ArrowUpDown,
  Loader2,
  Calendar,
} from 'lucide-react';
import { getStepName } from '../constants/workflow';
import { getRequisitionsStatus, createRequisition as apiCreateRequisition, getWorkflowStatus } from '../utils/api';
import type { RequisitionStatusSummary } from '../utils/api';

// Types
interface Requisition {
  id: string;
  title: string;
  requestor: string;
  department: string;
  amount: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  supplier: string;
  category: string;
  currentStep: number;
  description?: string;
  justification?: string;
}

interface DashboardProps {
  onKickOffEngine: (requisition: Requisition) => void;
  onNavigateToAutomation?: (requisitionId: string) => void;
  isActive?: boolean; // Whether this tab is currently active
}

interface KPI {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Mock data - 30 requisitions: 60% Complete (18), 20% HITL Pending (6), 20% Rejected (6)
// Distribution: Finance (8), IT (8), Operations (4), Marketing (4), HR (3), Facilities (3)
const MOCK_REQUISITIONS: Requisition[] = [
  // === FINANCE DEPARTMENT (8 records) - Complete: 5, HITL: 2, Rejected: 1 ===
  {
    id: 'REQ-000001',
    title: 'Q1 Financial Audit',
    requestor: 'Jennifer Adams',
    department: 'Finance',
    amount: 75000,
    status: 'completed',
    priority: 'high',
    createdAt: '2026-01-05',
    supplier: 'Deloitte',
    category: 'Professional Services',
    currentStep: 9,
    description: 'Annual financial audit and SOX compliance review.',
    justification: 'Required annual audit for regulatory compliance and investor reporting.',
  },
  {
    id: 'REQ-000002',
    title: 'Accounting Software Renewal',
    requestor: 'Robert Martinez',
    department: 'Finance',
    amount: 45000,
    status: 'completed',
    priority: 'medium',
    createdAt: '2026-01-06',
    supplier: 'SAP',
    category: 'Software',
    currentStep: 9,
    description: 'SAP S/4HANA license renewal for finance team.',
    justification: 'Critical ERP system for all financial operations.',
  },
  {
    id: 'REQ-000003',
    title: 'Tax Consulting Services',
    requestor: 'Jennifer Adams',
    department: 'Finance',
    amount: 35000,
    status: 'completed',
    priority: 'high',
    createdAt: '2026-01-07',
    supplier: 'KPMG',
    category: 'Professional Services',
    currentStep: 9,
    description: 'Q1 tax planning and compliance consulting.',
    justification: 'Strategic tax optimization for fiscal year 2026.',
  },
  {
    id: 'REQ-000004',
    title: 'Financial Reporting Tools',
    requestor: 'Robert Martinez',
    department: 'Finance',
    amount: 28000,
    status: 'completed',
    priority: 'medium',
    createdAt: '2026-01-08',
    supplier: 'Workiva',
    category: 'Software',
    currentStep: 9,
    description: 'SEC reporting and compliance platform subscription.',
    justification: 'Streamlining quarterly and annual reporting process.',
  },
  {
    id: 'REQ-000005',
    title: 'Budget Planning Software',
    requestor: 'Jennifer Adams',
    department: 'Finance',
    amount: 22000,
    status: 'completed',
    priority: 'low',
    createdAt: '2026-01-09',
    supplier: 'Adaptive Insights',
    category: 'Software',
    currentStep: 9,
    description: 'FP&A planning and forecasting tool.',
    justification: 'Improving budget accuracy and financial forecasting.',
  },
  {
    id: 'REQ-000006',
    title: 'Investment Banking Advisory',
    requestor: 'Jennifer Adams',
    department: 'Finance',
    amount: 150000,
    status: 'pending',
    priority: 'urgent',
    createdAt: '2026-01-12',
    supplier: 'Goldman Sachs',
    category: 'Professional Services',
    currentStep: 3,
    description: 'M&A advisory services for potential acquisition.',
    justification: 'Strategic acquisition opportunity requiring expert guidance.',
  },
  {
    id: 'REQ-000007',
    title: 'Treasury Management System',
    requestor: 'Robert Martinez',
    department: 'Finance',
    amount: 85000,
    status: 'pending',
    priority: 'high',
    createdAt: '2026-01-13',
    supplier: 'Kyriba',
    category: 'Software',
    currentStep: 4,
    description: 'Cash management and liquidity planning platform.',
    justification: 'Optimizing cash flow management across global operations.',
  },
  {
    id: 'REQ-000008',
    title: 'Premium Analytics Platform',
    requestor: 'Robert Martinez',
    department: 'Finance',
    amount: 120000,
    status: 'rejected',
    priority: 'medium',
    createdAt: '2026-01-10',
    supplier: 'Bloomberg',
    category: 'Software',
    currentStep: 5,
    description: 'Bloomberg Terminal subscription for 10 users.',
    justification: 'Rejected - existing Refinitiv subscription provides adequate coverage.',
  },

  // === IT DEPARTMENT (8 records) - Complete: 5, HITL: 2, Rejected: 1 ===
  {
    id: 'REQ-000009',
    title: 'Server Infrastructure Upgrade',
    requestor: 'Michael Chen',
    department: 'IT',
    amount: 180000,
    status: 'completed',
    priority: 'urgent',
    createdAt: '2026-01-04',
    supplier: 'Dell Technologies',
    category: 'IT Equipment',
    currentStep: 9,
    description: 'Dell PowerEdge R750 servers for data center refresh.',
    justification: 'Replacing 5-year-old servers to improve performance and reliability.',
  },
  {
    id: 'REQ-000010',
    title: 'Network Security Suite',
    requestor: 'James Wilson',
    department: 'IT',
    amount: 95000,
    status: 'completed',
    priority: 'urgent',
    createdAt: '2026-01-05',
    supplier: 'Palo Alto Networks',
    category: 'Software',
    currentStep: 9,
    description: 'Next-gen firewall and endpoint protection suite.',
    justification: 'Critical security infrastructure for SOC 2 compliance.',
  },
  {
    id: 'REQ-000011',
    title: 'Cloud Migration Services',
    requestor: 'Michael Chen',
    department: 'IT',
    amount: 125000,
    status: 'completed',
    priority: 'high',
    createdAt: '2026-01-06',
    supplier: 'AWS',
    category: 'Cloud Services',
    currentStep: 9,
    description: 'AWS migration and managed services for Q1.',
    justification: 'Completing phase 2 of cloud-first strategy.',
  },
  {
    id: 'REQ-000012',
    title: 'Developer Tools License',
    requestor: 'James Wilson',
    department: 'IT',
    amount: 42000,
    status: 'completed',
    priority: 'medium',
    createdAt: '2026-01-07',
    supplier: 'JetBrains',
    category: 'Software',
    currentStep: 9,
    description: 'IntelliJ IDEA and team tools for 25 developers.',
    justification: 'Annual renewal of development toolchain.',
  },
  {
    id: 'REQ-000013',
    title: 'Monitoring Platform',
    requestor: 'Michael Chen',
    department: 'IT',
    amount: 38000,
    status: 'completed',
    priority: 'medium',
    createdAt: '2026-01-08',
    supplier: 'Datadog',
    category: 'Software',
    currentStep: 9,
    description: 'APM and infrastructure monitoring platform.',
    justification: 'Ensuring 99.9% uptime SLA compliance.',
  },
  {
    id: 'REQ-000014',
    title: 'AI/ML Platform Investment',
    requestor: 'Michael Chen',
    department: 'IT',
    amount: 250000,
    status: 'pending',
    priority: 'urgent',
    createdAt: '2026-01-14',
    supplier: 'NVIDIA',
    category: 'IT Equipment',
    currentStep: 2,
    description: 'GPU cluster for machine learning workloads.',
    justification: 'Supporting new AI-powered product features.',
  },
  {
    id: 'REQ-000015',
    title: 'Zero Trust Security',
    requestor: 'James Wilson',
    department: 'IT',
    amount: 78000,
    status: 'pending',
    priority: 'high',
    createdAt: '2026-01-13',
    supplier: 'Zscaler',
    category: 'Software',
    currentStep: 5,
    description: 'Zero trust network access implementation.',
    justification: 'Enhancing security posture for remote workforce.',
  },
  {
    id: 'REQ-000016',
    title: 'Legacy System Maintenance',
    requestor: 'James Wilson',
    department: 'IT',
    amount: 65000,
    status: 'rejected',
    priority: 'low',
    createdAt: '2026-01-09',
    supplier: 'IBM',
    category: 'Professional Services',
    currentStep: 3,
    description: 'Extended support for legacy mainframe system.',
    justification: 'Rejected - migrating to cloud-based solution instead.',
  },

  // === OPERATIONS DEPARTMENT (4 records) - Complete: 2, HITL: 1, Rejected: 1 ===
  {
    id: 'REQ-000017',
    title: 'Warehouse Equipment',
    requestor: 'Sarah Johnson',
    department: 'Operations',
    amount: 55000,
    status: 'completed',
    priority: 'medium',
    createdAt: '2026-01-06',
    supplier: 'Toyota Forklifts',
    category: 'Equipment',
    currentStep: 9,
    description: 'Electric forklifts for warehouse operations.',
    justification: 'Replacing aging equipment to improve efficiency.',
  },
  {
    id: 'REQ-000018',
    title: 'Supply Chain Software',
    requestor: 'Sarah Johnson',
    department: 'Operations',
    amount: 68000,
    status: 'completed',
    priority: 'high',
    createdAt: '2026-01-07',
    supplier: 'Oracle',
    category: 'Software',
    currentStep: 9,
    description: 'Oracle SCM Cloud implementation.',
    justification: 'Optimizing supply chain visibility and planning.',
  },
  {
    id: 'REQ-000019',
    title: 'Logistics Optimization',
    requestor: 'Sarah Johnson',
    department: 'Operations',
    amount: 92000,
    status: 'pending',
    priority: 'high',
    createdAt: '2026-01-14',
    supplier: 'FedEx',
    category: 'Services',
    currentStep: 4,
    description: 'Premium logistics and fulfillment contract.',
    justification: 'Improving delivery times for customer satisfaction.',
  },
  {
    id: 'REQ-000020',
    title: 'Overseas Warehouse Lease',
    requestor: 'Sarah Johnson',
    department: 'Operations',
    amount: 200000,
    status: 'rejected',
    priority: 'medium',
    createdAt: '2026-01-10',
    supplier: 'Prologis',
    category: 'Real Estate',
    currentStep: 6,
    description: 'New distribution center in Asia Pacific.',
    justification: 'Rejected - postponed until Q3 due to market conditions.',
  },

  // === MARKETING DEPARTMENT (4 records) - Complete: 3, HITL: 1, Rejected: 0 ===
  {
    id: 'REQ-000021',
    title: 'Digital Marketing Campaign',
    requestor: 'Emily Davis',
    department: 'Marketing',
    amount: 85000,
    status: 'completed',
    priority: 'high',
    createdAt: '2026-01-05',
    supplier: 'Google Ads',
    category: 'Marketing',
    currentStep: 9,
    description: 'Q1 digital advertising spend across Google and Meta.',
    justification: 'Supporting product launch with targeted campaigns.',
  },
  {
    id: 'REQ-000022',
    title: 'Marketing Automation',
    requestor: 'Emily Davis',
    department: 'Marketing',
    amount: 48000,
    status: 'completed',
    priority: 'medium',
    createdAt: '2026-01-06',
    supplier: 'HubSpot',
    category: 'Software',
    currentStep: 9,
    description: 'HubSpot Marketing Hub Enterprise subscription.',
    justification: 'Scaling marketing operations and lead nurturing.',
  },
  {
    id: 'REQ-000023',
    title: 'Brand Design Refresh',
    requestor: 'Emily Davis',
    department: 'Marketing',
    amount: 32000,
    status: 'completed',
    priority: 'medium',
    createdAt: '2026-01-08',
    supplier: 'Pentagram',
    category: 'Professional Services',
    currentStep: 9,
    description: 'Brand identity refresh and design assets.',
    justification: 'Modernizing brand for 2026 market positioning.',
  },
  {
    id: 'REQ-000024',
    title: 'Trade Show Sponsorship',
    requestor: 'Emily Davis',
    department: 'Marketing',
    amount: 125000,
    status: 'pending',
    priority: 'high',
    createdAt: '2026-01-13',
    supplier: 'CES',
    category: 'Events',
    currentStep: 3,
    description: 'Platinum sponsorship at CES 2026.',
    justification: 'Major visibility opportunity for new product launch.',
  },

  // === HR DEPARTMENT (3 records) - Complete: 2, HITL: 0, Rejected: 1 ===
  {
    id: 'REQ-000025',
    title: 'HR Management System',
    requestor: 'David Kim',
    department: 'HR',
    amount: 52000,
    status: 'completed',
    priority: 'high',
    createdAt: '2026-01-05',
    supplier: 'Workday',
    category: 'Software',
    currentStep: 9,
    description: 'Workday HCM platform annual subscription.',
    justification: 'Core HR system for employee management.',
  },
  {
    id: 'REQ-000026',
    title: 'Employee Training Program',
    requestor: 'David Kim',
    department: 'HR',
    amount: 28000,
    status: 'completed',
    priority: 'medium',
    createdAt: '2026-01-07',
    supplier: 'LinkedIn Learning',
    category: 'Training',
    currentStep: 9,
    description: 'Enterprise learning platform for all employees.',
    justification: 'Continuous professional development program.',
  },
  {
    id: 'REQ-000027',
    title: 'Executive Retreat',
    requestor: 'David Kim',
    department: 'HR',
    amount: 95000,
    status: 'rejected',
    priority: 'low',
    createdAt: '2026-01-11',
    supplier: 'Four Seasons',
    category: 'Events',
    currentStep: 2,
    description: 'Leadership team offsite retreat.',
    justification: 'Rejected - budget constraints, rescheduled to Q4.',
  },

  // === FACILITIES DEPARTMENT (3 records) - Complete: 2, HITL: 0, Rejected: 1 ===
  {
    id: 'REQ-000028',
    title: 'Office Renovation',
    requestor: 'Lisa Brown',
    department: 'Facilities',
    amount: 145000,
    status: 'completed',
    priority: 'medium',
    createdAt: '2026-01-04',
    supplier: 'Turner Construction',
    category: 'Construction',
    currentStep: 9,
    description: 'Floor 3 office space renovation and modernization.',
    justification: 'Creating collaborative workspace for growing team.',
  },
  {
    id: 'REQ-000029',
    title: 'HVAC System Upgrade',
    requestor: 'Lisa Brown',
    department: 'Facilities',
    amount: 78000,
    status: 'completed',
    priority: 'high',
    createdAt: '2026-01-06',
    supplier: 'Carrier',
    category: 'Equipment',
    currentStep: 9,
    description: 'Energy-efficient HVAC system replacement.',
    justification: 'Reducing energy costs by 30% and improving comfort.',
  },
  {
    id: 'REQ-000030',
    title: 'Rooftop Solar Installation',
    requestor: 'Lisa Brown',
    department: 'Facilities',
    amount: 320000,
    status: 'rejected',
    priority: 'medium',
    createdAt: '2026-01-12',
    supplier: 'SunPower',
    category: 'Equipment',
    currentStep: 4,
    description: 'Solar panel installation for HQ building.',
    justification: 'Rejected - ROI timeline exceeds budget cycle, revisit FY27.',
  },
];

const KPI_DATA: KPI[] = [
  {
    label: 'Total Requisitions',
    value: '156',
    change: '+12%',
    changeType: 'positive',
    icon: FileText,
  },
  {
    label: 'Pending Approvals',
    value: '23',
    change: '-8%',
    changeType: 'positive',
    icon: Clock,
  },
  {
    label: 'Total Spend (MTD)',
    value: '$1.2M',
    change: '+5%',
    changeType: 'neutral',
    icon: DollarSign,
  },
  {
    label: 'Compliance Rate',
    value: '98.5%',
    change: '+2.1%',
    changeType: 'positive',
    icon: CheckCircle,
  },
];

// Calculate dynamic KPIs from requisition data
const calculateKPIs = (requisitions: Requisition[]): KPI[] => {
  const totalCount = requisitions.length;
  const pendingCount = requisitions.filter(r => r.status === 'pending').length;
  // Total Spend is ONLY from completed requisitions (step 9)
  const completedReqs = requisitions.filter(r => r.currentStep === 9 && r.status !== 'rejected');
  const totalSpend = completedReqs.reduce((sum, r) => sum + r.amount, 0);
  // Rejected amount
  const rejectedReqs = requisitions.filter(r => r.status === 'rejected');
  const rejectedAmount = rejectedReqs.reduce((sum, r) => sum + r.amount, 0);
  // Pending tickets (not complete and not rejected)
  const pendingTickets = requisitions.filter(r => r.currentStep < 9 && r.status !== 'rejected');
  // Compliance rate fixed at 88%
  const complianceRate = 88.0;

  return [
    {
      label: 'Total Requisitions',
      value: totalCount.toString(),
      change: '+12%',
      changeType: 'positive',
      icon: FileText,
    },
    {
      label: 'Pending Tickets',
      value: pendingTickets.length.toString(),
      change: '+8%',
      changeType: 'positive',
      icon: Clock,
    },
    {
      label: 'Complete',
      value: completedReqs.length.toString(),
      change: 'Procured & Paid',
      changeType: 'positive',
      icon: CheckCircle,
    },
    {
      label: 'Rejected',
      value: rejectedReqs.length.toString(),
      change: `${totalCount > 0 ? Math.round((rejectedReqs.length / totalCount) * 100) : 0}%`,
      changeType: 'negative',
      icon: AlertTriangle,
    },
    {
      label: 'Total Spend (MTD)',
      value: formatCurrency(totalSpend),
      change: '+5%',
      changeType: 'positive',
      icon: DollarSign,
    },
    {
      label: 'Rejected Amount',
      value: formatCurrency(rejectedAmount),
      change: `${totalCount > 0 ? Math.round((rejectedReqs.length / totalCount) * 100) : 0}%`,
      changeType: 'negative',
      icon: AlertTriangle,
    },
    {
      label: 'Compliance Rate',
      value: `${complianceRate.toFixed(1)}%`,
      change: '+2.1%',
      changeType: 'positive',
      icon: CheckCircle,
    },
  ];
};

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusColor = (status: Requisition['status']): string => {
  const colors: Record<Requisition['status'], string> = {
    draft: 'bg-surface-100 text-surface-600',
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
  };
  return colors[status];
};

const getPriorityColor = (priority: Requisition['priority']): string => {
  const colors = {
    low: 'bg-surface-100 text-surface-600',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  };
  return colors[priority];
};

export function P2PDashboardView({ onKickOffEngine, onNavigateToAutomation, isActive = true }: DashboardProps) {
  // State for requisitions - start empty, load from API
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [isLoadingRequisitions, setIsLoadingRequisitions] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Ref for chat input textarea to reset height after sending
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [hitlFilter, setHitlFilter] = useState<'all' | 'hitl'>('all');
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailedView, setShowDetailedView] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState<'amount' | 'currentStep' | 'priority' | 'status' | 'createdAt' | 'requestor' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Helper function to map API data to frontend Requisition type
  const mapApiToRequisition = useCallback((apiData: RequisitionStatusSummary): Requisition => {
    // Map workflow_status to UI status
    const statusMap: Record<string, Requisition['status']> = {
      'draft': 'draft',
      'in_progress': 'processing',
      'hitl_pending': 'pending',
      'rejected': 'rejected',
      'completed': 'completed',
    };

    // Map urgency to valid priority values
    const getPriority = (urgency: string | undefined): Requisition['priority'] => {
      const u = (urgency || 'medium').toLowerCase();
      if (u === 'urgent' || u === 'critical') return 'urgent';
      if (u === 'high') return 'high';
      if (u === 'medium' || u === 'standard' || u === 'normal') return 'medium';
      if (u === 'low') return 'low';
      return 'medium';
    };

    // Format department - keep HR and IT uppercase, title case for others
    const formatDepartment = (dept: string): string => {
      const upper = dept.toUpperCase();
      if (upper === 'HR' || upper === 'IT') return upper;
      return dept.charAt(0).toUpperCase() + dept.slice(1).toLowerCase();
    };

    return {
      id: apiData.number, // Use REQ-XXXXXX format
      title: apiData.description || `Requisition ${apiData.number}`,
      requestor: apiData.requestor_name || 'James Wilson',
      department: formatDepartment(apiData.department),
      amount: apiData.total_amount,
      status: statusMap[apiData.workflow_status] || 'pending',
      priority: getPriority(apiData.urgency),
      createdAt: apiData.created_at ? apiData.created_at.split('T')[0] : new Date().toISOString().split('T')[0], // Convert ISO to date
      supplier: apiData.supplier_name || 'Not Assigned',
      category: apiData.category || 'General',
      currentStep: apiData.current_step,
      description: apiData.description,
      justification: apiData.justification || apiData.flag_reason || undefined,
      // Centene Enterprise Procurement Fields
      cost_center: apiData.cost_center,
      gl_account: apiData.gl_account,
      spend_type: apiData.spend_type,
      supplier_risk_score: apiData.supplier_risk_score,
      supplier_status: apiData.supplier_status,
      contract_on_file: apiData.contract_on_file,
      budget_available: apiData.budget_available,
      budget_impact: apiData.budget_impact,
    };
  }, []);

  // Fetch requisitions from API
  const fetchRequisitions = useCallback(async () => {
    setIsLoadingRequisitions(true);
    setLoadError(null);
    try {
      const data = await getRequisitionsStatus(false);
      const mapped = data.map(mapApiToRequisition);
      setRequisitions(mapped);
    } catch (error) {
      console.error('Failed to load requisitions:', error);
      setLoadError('Failed to load requisitions. Please check if backend is running.');
      // Fall back to mock data for development
      setRequisitions(MOCK_REQUISITIONS);
    } finally {
      setIsLoadingRequisitions(false);
    }
  }, [mapApiToRequisition]);

  // Load requisitions on mount
  useEffect(() => {
    fetchRequisitions();
  }, [fetchRequisitions]);

  // Refresh requisitions when tab becomes active again
  useEffect(() => {
    if (isActive) {
      fetchRequisitions();
    }
  }, [isActive, fetchRequisitions]);

  // Refresh requisitions when tab/window becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        fetchRequisitions();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchRequisitions, isActive]);

  // Sync workflow status when a requisition is selected
  useEffect(() => {
    if (!selectedRequisition) return;
    
    // Extract numeric ID from REQ-XXXXXX format
    const match = selectedRequisition.id.match(/(\d+)$/);
    if (!match) return;
    const numericId = parseInt(match[1], 10);
    
    // Fetch latest workflow status and sync currentStep
    getWorkflowStatus(numericId)
      .then(status => {
        // Update selectedRequisition with latest step from workflow API
        if (status.current_step !== selectedRequisition.currentStep) {
          setSelectedRequisition(prev => prev ? {
            ...prev,
            currentStep: status.current_step,
            status: status.workflow_status === 'completed' ? 'completed' :
                    status.workflow_status === 'rejected' ? 'rejected' :
                    status.step_status === 'pending_approval' ? 'pending' : prev.status,
          } : null);
          
          // Also update in the main list
          setRequisitions(prevList => prevList.map(req => 
            req.id === selectedRequisition.id 
              ? { ...req, currentStep: status.current_step }
              : req
          ));
        }
      })
      .catch(err => {
        console.log('Could not fetch workflow status:', err);
      });
  }, [selectedRequisition?.id]);
  
  const itemsPerPage = 10;
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI procurement assistant. I can help you create a new requisition. Just describe what you need to purchase, and I'll help fill out the form for you.",
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Form state for new requisition
  const [newRequisition, setNewRequisition] = useState({
    title: '',
    description: '',
    department: '',
    category: '',
    amount: '',
    supplier: '',
    priority: 'medium',
    justification: '',
    // Enterprise procurement fields (Tab 2)
    cost_center: '',
    gl_account: '',
    spend_type: 'OPEX',
    supplier_risk_score: null as number | null,
    supplier_status: '',
    contract_on_file: false,
    budget_available: null as number | null,
    budget_impact: '',
  });
  const [createFormTab, setCreateFormTab] = useState<'basic' | 'additional'>('basic');
  const [aiWizardLoading, setAiWizardLoading] = useState(false);

  // Calculate HITL pending items (all items not completed and not rejected)
  const hitlPendingItems = useMemo(() => {
    return requisitions.filter((req) => 
      req.status !== 'completed' && req.status !== 'rejected'
    );
  }, [requisitions]);

  // Filter requisitions
  const filteredRequisitions = useMemo(() => {
    let filtered = requisitions.filter((req) => {
      const matchesSearch =
        req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.requestor.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDepartment = departmentFilter === 'all' || req.department === departmentFilter;
      
      // When HITL filter is active, only show HITL pending items (not completed, not rejected)
      if (hitlFilter === 'hitl') {
        const isHitlPending = req.status !== 'completed' && req.status !== 'rejected';
        return matchesSearch && matchesDepartment && isHitlPending;
      }
      
      // When status filter is 'hitl', show HITL pending items
      if (statusFilter === 'hitl') {
        const isHitlPending = req.status !== 'completed' && req.status !== 'rejected';
        return matchesSearch && matchesDepartment && isHitlPending;
      }
      
      // Normal filtering when HITL filter is 'all'
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      return matchesSearch && matchesStatus && matchesDepartment;
    });

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any, bVal: any;
        
        switch (sortField) {
          case 'amount':
            aVal = a.amount;
            bVal = b.amount;
            break;
          case 'currentStep':
            aVal = a.currentStep;
            bVal = b.currentStep;
            break;
          case 'priority':
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            aVal = priorityOrder[a.priority];
            bVal = priorityOrder[b.priority];
            break;
          case 'status':
            // Sort by workflow status: Complete > Processing > HITL Pending > Rejected
            const getWorkflowOrder = (req: Requisition) => {
              if (req.currentStep === 9) return 4; // Complete
              if (req.status === 'rejected') return 1; // Rejected
              if (req.status === 'processing') return 3; // Ready for P2P
              return 2; // HITL Pending
            };
            aVal = getWorkflowOrder(a);
            bVal = getWorkflowOrder(b);
            break;
          case 'createdAt':
            aVal = new Date(a.createdAt).getTime();
            bVal = new Date(b.createdAt).getTime();
            break;
          case 'requestor':
            aVal = a.requestor.toLowerCase();
            bVal = b.requestor.toLowerCase();
            break;
          default:
            return 0;
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [requisitions, searchQuery, statusFilter, departmentFilter, hitlFilter, sortField, sortDirection]);

  // Handle sort toggle
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      // Toggle direction or clear sort
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort icon component
  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3 ml-1 text-aarete-sunrise" />
      : <ChevronDown className="h-3 w-3 ml-1 text-aarete-sunrise" />;
  };

  // Paginate requisitions
  const totalPages = Math.ceil(filteredRequisitions.length / itemsPerPage);
  const paginatedRequisitions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRequisitions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRequisitions, currentPage]);

  // Calculate dynamic KPIs from requisitions state
  const kpiData = useMemo(() => calculateKPIs(requisitions), [requisitions]);

  // All departments - hardcoded to ensure all options are always available
  const departments = ['IT', 'Finance', 'Operations', 'HR', 'Marketing', 'Facilities', 'Legal', 'Engineering', 'Sales', 'R&D', 'Procurement'];

  // Handle chat message
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    const inputText = chatInput;
    setChatInput('');
    
    // Reset textarea height back to default
    if (chatInputRef.current) {
      chatInputRef.current.style.height = 'auto';
    }
    
    setIsProcessing(true);

    try {
      // Import the API function
      const { parseRequisitionInput } = await import('../utils/api');
      
      console.log('[CHATBOT] Calling parseRequisitionInput with:', inputText);
      
      // Call Bedrock LLM via backend API
      const parsedData = await parseRequisitionInput(inputText);
      
      console.log('[CHATBOT] API returned parsedData:', JSON.stringify(parsedData, null, 2));
      
      // Generate confirmation message
      const confirmationMessage = generateConfirmationMessage({
        title: parsedData.title,
        description: parsedData.description,
        department: parsedData.department,
        category: parsedData.category,
        amount: parsedData.amount,
        priority: parsedData.priority,
        supplier: parsedData.supplier,
        justification: parsedData.justification,
      });
      
      console.log('[CHATBOT] Generated message:', confirmationMessage);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: confirmationMessage,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
      
      // Auto-fill form with parsed data
      autoFillFormWithParsedData({
        title: parsedData.title,
        description: parsedData.description,
        department: parsedData.department,
        category: parsedData.category,
        amount: parsedData.amount,
        supplier: parsedData.supplier,
        priority: parsedData.priority,
        justification: parsedData.justification,
      });
    } catch (error) {
      console.error('[CHATBOT] Error parsing input with LLM:', error);
      console.error('[CHATBOT] Error details:', error instanceof Error ? error.message : String(error));
      
      // Fallback to local regex parsing if API fails
      const parsedData = parseUserInput(inputText);
      console.log('[CHATBOT] Fallback regex parsed:', JSON.stringify(parsedData, null, 2));
      const confirmationMessage = generateConfirmationMessage(parsedData);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: confirmationMessage + '\n\n⚠️ (Using offline parsing - LLM unavailable)',
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
      
      if (parsedData) {
        autoFillFormWithParsedData(parsedData);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Parse user input to extract key information
  const parseUserInput = (input: string): any => {
    const loweredInput = input.toLowerCase();
    let parsedData: any = {};

    // Store original input as description
    parsedData.originalInput = input;

    // Extract dollar amounts
    const amountMatches = input.match(/\$\s*\d+[,\d]*\.?\d*/g);
    if (amountMatches && amountMatches.length > 0) {
      const amount = amountMatches[0].replace(/[$,\s]/g, '');
      parsedData.amount = amount;
    }

    // Extract department explicitly mentioned
    const departmentPatterns = ['IT department', 'IT dept', 'marketing department', 'operations', 'finance', 'HR', 'legal'];
    for (const pattern of departmentPatterns) {
      if (loweredInput.includes(pattern.toLowerCase())) {
        if (pattern.toLowerCase().includes('it')) parsedData.department = 'IT';
        else if (pattern.toLowerCase().includes('marketing')) parsedData.department = 'Marketing';
        else if (pattern.toLowerCase().includes('operations')) parsedData.department = 'Operations';
        else if (pattern.toLowerCase().includes('finance')) parsedData.department = 'Finance';
        else if (pattern.toLowerCase().includes('hr')) parsedData.department = 'HR';
        else if (pattern.toLowerCase().includes('legal')) parsedData.department = 'Legal';
        break;
      }
    }

    // Extract category keywords
    const categories = {
      'IT Equipment': ['laptop', 'computer', 'monitor', 'keyboard', 'mouse', 'hardware', 'desktop', 'tablet'],
      'Software': ['software', 'license', 'subscription', 'saas', 'app', 'program'],
      'Office Supplies': ['office supplies', 'paper', 'pen', 'desk', 'chair', 'furniture', 'stationery'],
      'Cloud Services': ['cloud', 'aws', 'azure', 'gcp', 'hosting', 'storage'],
      'Marketing': ['marketing', 'advertising', 'campaign', 'promotional', 'branding'],
      'Training': ['training', 'course', 'workshop', 'certification', 'education'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => loweredInput.includes(keyword))) {
        parsedData.category = category;
        break;
      }
    }

    // Extract items mentioned for title generation
    const itemsMatch = input.match(/laptops?|computers?|monitors?|keyboards?|mouse|mice|equipment|supplies|software|licenses?/gi);
    if (itemsMatch) {
      parsedData.items = [...new Set(itemsMatch.map((i: string) => i.toLowerCase()))].slice(0, 3);
    }

    // Generate title from category and items
    if (parsedData.category && parsedData.items && parsedData.items.length > 0) {
      parsedData.title = `${parsedData.category} - ${parsedData.items.join(', ')}`;
    } else if (parsedData.category) {
      parsedData.title = parsedData.category;
    }

    // Auto-set department based on category if not explicitly mentioned
    if (!parsedData.department && parsedData.category) {
      if (parsedData.category === 'IT Equipment' || parsedData.category === 'Software' || parsedData.category === 'Cloud Services') {
        parsedData.department = 'IT';
      } else if (parsedData.category === 'Marketing') {
        parsedData.department = 'Marketing';
      } else if (parsedData.category === 'Office Supplies') {
        parsedData.department = 'Operations';
      }
    }

    // Extract supplier names (common patterns)
    const supplierKeywords = ['from', 'through', 'vendor', 'supplier'];
    supplierKeywords.forEach(keyword => {
      const regex = new RegExp(`${keyword}\\s+([A-Z][a-zA-Z\\s&.]+?)(?:\\s|$|,|\\.)`);
      const match = input.match(regex);
      if (match && match[1]) {
        parsedData.supplier = match[1].trim();
      }
    });

    // Detect common suppliers by name
    const commonSuppliers = ['Dell', 'HP', 'Lenovo', 'Microsoft', 'Adobe', 'Amazon', 'AWS', 'Google', 'Salesforce', 'Oracle', 'IBM', 'Cisco', 'Apple', 'Staples', 'Office Depot'];
    commonSuppliers.forEach(supplier => {
      if (input.includes(supplier)) {
        parsedData.supplier = supplier;
      }
    });

    // Extract priority
    if (loweredInput.includes('urgent') || loweredInput.includes('asap') || loweredInput.includes('immediately')) {
      parsedData.priority = 'urgent';
    } else if (loweredInput.includes('high priority') || loweredInput.includes('high-priority') || loweredInput.match(/high\s*-?\s*priority/)) {
      parsedData.priority = 'high';
    }

    // Extract justification (look for reason/need phrases)
    const justificationMatch = input.match(/(?:need(?:ed)?\s+(?:for|these|this|to)\s+)([^.,$-]+)|(?:for\s+)(new hires?|team|project|expansion|upgrade[^.,$]*)/i);
    if (justificationMatch) {
      const reason = (justificationMatch[1] || justificationMatch[2])?.trim();
      if (reason) {
        parsedData.justification = `Required ${reason}`;
      }
    }

    // Generate description from input
    parsedData.description = input;

    return Object.keys(parsedData).length > 0 ? parsedData : null;
  };

  // Generate confirmation message with parsed data
  const generateConfirmationMessage = (parsedData: any): string => {
    if (!parsedData) {
      return "I've captured your request. Please review the form below and fill in the required details.";
    }

    let message = "I've analyzed your request and extracted the following information:\n\n";
    
    // Title
    message += `• Title: ${parsedData.title || 'Not determined'}\n`;
    
    // Description
    message += `• Description: ${parsedData.description || 'Not provided'}\n`;
    
    // Department
    message += `• Department: ${parsedData.department || 'Not mentioned'}\n`;
    
    // Category
    message += `• Category: ${parsedData.category || 'Not determined'}\n`;
    
    // Amount
    message += `• Estimated Amount: ${parsedData.amount ? '$' + parsedData.amount : 'Not mentioned'}\n`;
    
    // Priority
    message += `• Priority: ${parsedData.priority ? parsedData.priority.charAt(0).toUpperCase() + parsedData.priority.slice(1) : 'Medium (default)'}\n`;
    
    // Supplier
    message += `• Preferred Supplier: ${parsedData.supplier || 'Not mentioned'}\n`;
    
    // Business Justification
    message += `• Business Justification: ${parsedData.justification || 'Not mentioned'}\n`;

    message += "\nI've pre-filled the form with this information. Please review and confirm or revise if needed.";

    if (parsedData.priority === 'urgent') {
      message += "\n\n⚠️ Note: Urgent requests may require additional approval levels.";
    }

    return message;
  };

  // Auto-fill form with parsed data
  const autoFillFormWithParsedData = (parsedData: any) => {
    setNewRequisition((prev) => {
      const updated: any = { ...prev };

      // Use pre-generated title from parseUserInput
      if (parsedData.title) {
        updated.title = parsedData.title;
      }
      
      // Set department
      if (parsedData.department) {
        updated.department = parsedData.department;
      }
      
      // Set category
      if (parsedData.category) {
        updated.category = parsedData.category;
      }
      
      // Set amount
      if (parsedData.amount) {
        updated.amount = parsedData.amount;
      }
      
      // Set supplier
      if (parsedData.supplier) {
        updated.supplier = parsedData.supplier;
      }
      
      // Set priority - convert to lowercase to match dropdown values
      if (parsedData.priority) {
        updated.priority = parsedData.priority.toLowerCase();
      }
      
      // Set description
      if (parsedData.description) {
        updated.description = parsedData.description;
      }
      
      // Set justification
      if (parsedData.justification) {
        updated.justification = parsedData.justification;
      }

      return updated;
    });
  };

  // Simplified auto-fill for basic patterns (legacy support)
  const autoFillForm = (input: string) => {
    const loweredInput = input.toLowerCase();
    
    if (loweredInput.includes('laptop') || loweredInput.includes('computer')) {
      setNewRequisition((prev) => ({
        ...prev,
        title: 'IT Equipment - Laptops',
        category: 'IT Equipment',
        department: 'IT',
        supplier: 'Dell Technologies',
        priority: 'high',
      }));
    } else if (loweredInput.includes('office') || loweredInput.includes('supplies')) {
      setNewRequisition((prev) => ({
        ...prev,
        title: 'Office Supplies Order',
        category: 'Office Supplies',
        department: 'Operations',
        supplier: 'Staples Inc.',
        priority: 'medium',
      }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Date Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">P2P Dashboard</h1>
        <div className="flex items-center gap-2 text-sm font-medium text-surface-600 bg-surface-50 px-4 py-2 rounded-lg border border-surface-200">
          <Calendar className="h-4 w-4 text-surface-400" />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-3 shadow-sm border border-surface-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-surface-500 mb-1">{kpi.label}</p>
                  <p className="text-xl font-bold text-surface-900">{kpi.value}</p>
                </div>
                <div className="p-1.5 bg-aarete-sunrise/10 rounded-lg">
                  <Icon className="h-4 w-4 text-aarete-sunrise" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <TrendingUp
                  className={`h-3 w-3 ${
                    kpi.changeType === 'positive'
                      ? 'text-green-500'
                      : kpi.changeType === 'negative'
                      ? 'text-red-500'
                      : 'text-surface-500'
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    kpi.changeType === 'positive'
                      ? 'text-green-600'
                      : kpi.changeType === 'negative'
                      ? 'text-red-600'
                      : 'text-surface-600'
                  }`}
                >
                  {kpi.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Requisitions Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-surface-200">
        {/* Table Header */}
        <div className="p-4 border-b border-surface-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <h2 className="text-lg font-semibold text-surface-900">Requisitions</h2>
              
              {/* HITL Filter Radio Buttons */}
              <div className="flex items-center gap-4 border-l border-surface-300 pl-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hitlFilter"
                    value="all"
                    checked={hitlFilter === 'all'}
                    onChange={() => { setHitlFilter('all'); setCurrentPage(1); }}
                    className="w-4 h-4 text-aarete-sunrise border-surface-300 focus:ring-aarete-sunrise"
                  />
                  <span className="text-sm text-surface-700">All</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hitlFilter"
                    value="hitl"
                    checked={hitlFilter === 'hitl'}
                    onChange={() => { setHitlFilter('hitl'); setCurrentPage(1); }}
                    className="w-4 h-4 text-aarete-sunrise border-surface-300 focus:ring-aarete-sunrise"
                  />
                  <span className="text-sm text-surface-700">
                    HITL Pending ({hitlPendingItems.length})
                  </span>
                </label>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                <input
                  type="text"
                  placeholder="Search requisitions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aarete-sunrise focus:border-transparent w-64"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aarete-sunrise focus:border-transparent bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Complete</option>
                  <option value="rejected">Rejected</option>
                  <option value="hitl">HITL Pending</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
              </div>

              {/* Department Filter */}
              <div className="relative">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aarete-sunrise focus:border-transparent bg-white"
                >
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
              </div>

              {/* Create Button */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-aarete-sunrise text-white rounded-lg hover:bg-aarete-sunrise/90 transition-colors font-medium text-sm shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Create Requisition
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingRequisitions && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-aarete-navy" />
            <span className="ml-3 text-surface-600">Loading requisitions...</span>
          </div>
        )}

        {/* Error State */}
        {loadError && !isLoadingRequisitions && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
              <span className="text-amber-700">{loadError}</span>
              <button
                onClick={fetchRequisitions}
                className="ml-4 px-3 py-1 text-sm bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Table with scrollable body and fixed pagination */}
        {!isLoadingRequisitions && (
        <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 480px)', minHeight: '400px' }}>
          <div className="overflow-auto flex-1">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider">
                    Req Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider">
                    Category
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider cursor-pointer hover:bg-surface-100 transition-colors select-none"
                    onClick={() => handleSort('amount')}
                  >
                    <span className="flex items-center">
                      Amount
                      <SortIcon field="amount" />
                    </span>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-semibold text-surface-600 uppercase tracking-wider cursor-pointer hover:bg-surface-100 transition-colors select-none"
                    onClick={() => handleSort('currentStep')}
                  >
                    <span className="flex items-center justify-center">
                      Step
                      <SortIcon field="currentStep" />
                    </span>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-semibold text-surface-600 uppercase tracking-wider cursor-pointer hover:bg-surface-100 transition-colors select-none"
                    onClick={() => handleSort('status')}
                  >
                    <span className="flex items-center justify-center">
                      Workflow Status
                      <SortIcon field="status" />
                    </span>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider cursor-pointer hover:bg-surface-100 transition-colors select-none"
                    onClick={() => handleSort('priority')}
                  >
                    <span className="flex items-center">
                      Priority
                      <SortIcon field="priority" />
                    </span>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider cursor-pointer hover:bg-surface-100 transition-colors select-none"
                    onClick={() => handleSort('createdAt')}
                  >
                    <span className="flex items-center">
                      Created
                      <SortIcon field="createdAt" />
                    </span>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider cursor-pointer hover:bg-surface-100 transition-colors select-none"
                    onClick={() => handleSort('requestor')}
                  >
                    <span className="flex items-center">
                      Requestor
                      <SortIcon field="requestor" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 bg-white">
              {paginatedRequisitions.map((req) => (
                <tr
                  key={req.id}
                  onClick={() => setSelectedRequisition(req)}
                  className="hover:bg-surface-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm font-medium">
                    <span className="text-aarete-sunrise font-semibold">
                      {req.id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-600">{req.department}</td>
                  <td className="px-4 py-3 text-sm text-surface-600">{req.category}</td>
                  <td className="px-4 py-3 text-sm font-medium text-surface-900">
                    {formatCurrency(req.amount)}
                  </td>
                  {/* Step Column */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        req.currentStep === 9 ? 'bg-green-100 text-green-700' :
                        req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {req.currentStep}
                      </span>
                      <span className="text-xs text-surface-500 mt-1">{getStepName(req.currentStep)}</span>
                    </div>
                  </td>
                  {/* Workflow Status Column */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                      req.currentStep === 9 ? 'bg-green-100 text-green-700 border-green-300' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-300' :
                      'bg-yellow-100 text-yellow-700 border-yellow-300'
                    }`}>
                      {req.currentStep === 9 ? 'Complete' : 
                       req.status === 'rejected' ? 'Rejected' : 
                       'HITL Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                        req.priority
                      )}`}
                    >
                      {req.priority.charAt(0).toUpperCase() + req.priority.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-500">{req.createdAt}</td>
                  <td className="px-4 py-3 text-sm text-surface-600">{req.requestor}</td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>

          {/* Fixed Pagination */}
          {filteredRequisitions.length > 0 && (
            <div className="px-4 py-3 border-t border-surface-200 flex items-center justify-between bg-white flex-shrink-0">
              <div className="text-sm text-surface-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRequisitions.length)} of {filteredRequisitions.length} requisitions
              </div>
              {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-surface-300 rounded-lg hover:bg-surface-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-aarete-sunrise text-white'
                        : 'border border-surface-300 hover:bg-surface-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-surface-300 rounded-lg hover:bg-surface-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Empty State */}
        {!isLoadingRequisitions && filteredRequisitions.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-surface-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-surface-900 mb-2">No requisitions found</h3>
            <p className="text-sm text-surface-500">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>

      {/* Requisition Detail Drawer */}
      {selectedRequisition && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSelectedRequisition(null)}
          />
          <div className="fixed right-0 top-0 h-full w-[580px] bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-surface-200 p-4 flex items-center justify-between z-10">
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-xs text-surface-500 mb-1">{selectedRequisition.id}</p>
                <h3 className="text-lg font-semibold text-surface-900 truncate">
                  {selectedRequisition.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequisition(null)}
                className="p-2 hover:bg-surface-100 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="h-5 w-5 text-surface-500" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="sticky top-[73px] bg-white border-b border-surface-200 px-6 z-10">
              <div className="flex gap-6">
                <button
                  onClick={() => setShowDetailedView(false)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    !showDetailedView
                      ? 'border-aarete-sunrise text-aarete-sunrise'
                      : 'border-transparent text-surface-500 hover:text-surface-700'
                  }`}
                >
                  Basic Information
                </button>
                <button
                  onClick={() => setShowDetailedView(true)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    showDetailedView
                      ? 'border-aarete-sunrise text-aarete-sunrise'
                      : 'border-transparent text-surface-500 hover:text-surface-700'
                  }`}
                >
                  Additional Information
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-180px)]">
              {/* TAB 1: Basic Information */}
              {!showDetailedView && (
                <>
                  {/* Priority Badge */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                          selectedRequisition.priority
                        )}`}
                      >
                        {selectedRequisition.priority.charAt(0).toUpperCase() +
                          selectedRequisition.priority.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Basic Details Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-surface-500 uppercase tracking-wider">Department</p>
                      <p className="text-sm font-medium text-surface-900">
                        {selectedRequisition.department}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-surface-500 uppercase tracking-wider">Category</p>
                      <p className="text-sm font-medium text-surface-900">
                        {selectedRequisition.category}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-surface-500 uppercase tracking-wider">Requestor</p>
                      <p className="text-sm font-medium text-surface-900">
                        {selectedRequisition.requestor}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-surface-500 uppercase tracking-wider">Amount</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(selectedRequisition.amount)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-surface-500 uppercase tracking-wider">Created</p>
                      <p className="text-sm font-medium text-surface-900">
                        {selectedRequisition.createdAt}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-surface-500 uppercase tracking-wider">Urgency</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                        selectedRequisition.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        selectedRequisition.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {selectedRequisition.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedRequisition.description && (
                    <div className="pt-4 border-t border-surface-200">
                      <p className="text-xs text-surface-500 uppercase tracking-wider mb-2">Description</p>
                      <p className="text-sm text-surface-700 leading-relaxed whitespace-pre-wrap">
                        {selectedRequisition.description}
                      </p>
                    </div>
                  )}

                  {/* Justification */}
                  {selectedRequisition.justification && (
                    <div className="pt-4 border-t border-surface-200">
                      <p className="text-xs text-surface-500 uppercase tracking-wider mb-2">Business Justification</p>
                      <p className="text-sm text-surface-700 leading-relaxed whitespace-pre-wrap">
                        {selectedRequisition.justification}
                      </p>
                    </div>
                  )}

                  {/* Workflow Progress */}
                  <div className="space-y-3 pt-4 border-t border-surface-200">
                    <p className="text-xs text-surface-500 uppercase tracking-wider">
                      Workflow Progress
                    </p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((step) => (
                        <div
                          key={step}
                          className={`flex-1 h-2 rounded-full ${
                            step <= selectedRequisition.currentStep
                              ? selectedRequisition.status === 'rejected' 
                                ? 'bg-red-500' 
                                : 'bg-aarete-sunrise'
                              : 'bg-surface-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-surface-600">
                      Step {selectedRequisition.currentStep} of 9 - {getStepName(selectedRequisition.currentStep)}
                    </p>
                    {/* Workflow Status Badge */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                        selectedRequisition.currentStep === 9 
                          ? 'bg-green-100 text-green-700 border border-green-300' 
                          : selectedRequisition.status === 'rejected' 
                            ? 'bg-red-100 text-red-700 border border-red-300' 
                            : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                      }`}>
                        {selectedRequisition.currentStep === 9 
                          ? '✓ Complete' 
                          : selectedRequisition.status === 'rejected' 
                            ? '✕ Rejected' 
                            : '⏳ HITL Pending'}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: Additional Information */}
              {showDetailedView && (
                <>
                  {/* Supplier Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-surface-900 uppercase tracking-wider">Enterprise Procurement</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-surface-500 uppercase tracking-wider">Supplier</p>
                        <p className="text-sm font-medium text-surface-900">
                          {selectedRequisition.supplier}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-surface-500 uppercase tracking-wider">Spend Type</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                          (selectedRequisition as any).spend_type === 'CAPEX' ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {(selectedRequisition as any).spend_type || 'OPEX'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-surface-500 uppercase tracking-wider">Cost Center</p>
                        <p className="text-sm font-mono text-surface-900">
                          {(selectedRequisition as any).cost_center || 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-surface-500 uppercase tracking-wider">GL Account</p>
                        <p className="text-sm font-mono text-surface-900">
                          {(selectedRequisition as any).gl_account || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Supplier Risk Badges */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-surface-200">
                      <div className="space-y-2">
                        <p className="text-xs text-surface-500 uppercase tracking-wider">Risk Score</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                          ((selectedRequisition as any).supplier_risk_score || 50) > 70 ? 'bg-red-100 text-red-700' :
                          ((selectedRequisition as any).supplier_risk_score || 50) > 40 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {(selectedRequisition as any).supplier_risk_score || 'N/A'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-surface-500 uppercase tracking-wider">Supplier Status</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                          (selectedRequisition as any).supplier_status === 'preferred' ? 'bg-green-100 text-green-700' :
                          (selectedRequisition as any).supplier_status === 'known' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {((selectedRequisition as any).supplier_status || 'unknown').toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-surface-500 uppercase tracking-wider">Contract</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                          (selectedRequisition as any).contract_on_file ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {(selectedRequisition as any).contract_on_file ? 'YES' : 'NO'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Budget Impact */}
                  {(selectedRequisition as any).budget_impact && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Budget Impact:</strong> {(selectedRequisition as any).budget_impact}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  {(selectedRequisition as any).notes && (
                    <div className="pt-4 border-t border-surface-200">
                      <p className="text-xs text-surface-500 uppercase tracking-wider mb-2">Notes</p>
                      <p className="text-sm text-surface-700 leading-relaxed whitespace-pre-wrap">
                        {(selectedRequisition as any).notes}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Payment Complete Summary - Only show for step 9 completed tickets */}
              {selectedRequisition.currentStep === 9 && (
                <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800">Payment Complete</span>
                  </div>
                  <div className="text-sm text-green-700 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-green-600">Amount Paid:</span>
                      <span className="font-semibold">{formatCurrency(selectedRequisition.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Supplier:</span>
                      <span className="font-semibold">{selectedRequisition.supplier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Department:</span>
                      <span className="font-semibold">{selectedRequisition.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Requestor:</span>
                      <span className="font-semibold">{selectedRequisition.requestor}</span>
                    </div>
                    <div className="pt-2 border-t border-green-200">
                      <p className="text-xs text-green-600">✓ Fully processed through all 9 P2P workflow steps</p>
                      <p className="text-xs text-green-600 mt-1">✓ Payment authorized and executed</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions - Moved to bottom */}
              <div className="space-y-3 pt-4 border-t border-surface-200">
                {/* Edit button - only for step 1 and not rejected/completed */}
                {selectedRequisition.currentStep === 1 && 
                 selectedRequisition.status !== 'rejected' && 
                 selectedRequisition.status !== 'completed' && (
                  <button className="w-full px-4 py-2.5 border border-surface-300 text-surface-700 rounded-lg hover:bg-surface-50 transition-colors font-medium text-sm">
                    Edit Requisition
                  </button>
                )}

                {/* Go to Automation button - HIDE for step 9 completed tickets */}
                {selectedRequisition.currentStep < 9 && (
                  <button 
                    onClick={() => {
                      console.log('Go to Automation clicked, requisition ID:', selectedRequisition.id);
                      onNavigateToAutomation?.(selectedRequisition.id);
                    }}
                    disabled={selectedRequisition.status === 'rejected'}
                    className={`w-full px-4 py-2.5 rounded-lg transition-colors font-semibold text-sm flex items-center justify-center gap-2 ${
                      selectedRequisition.status === 'rejected'
                        ? 'bg-surface-300 text-surface-500 cursor-not-allowed'
                        : 'bg-aarete-sunrise text-white hover:bg-aarete-sunrise/90 shadow-lg shadow-aarete-sunrise/30'
                    }`}
                  >
                    <ArrowRight className="h-5 w-5" />
                    {selectedRequisition.status === 'rejected' 
                      ? 'Rejected - Cannot Continue' 
                      : 'Go to Automation'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create Requisition Modal with AI Chat */}
      {isCreateModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsCreateModalOpen(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] max-h-[85vh] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between bg-surface-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-aarete-sunrise/10 rounded-lg">
                  <Plus className="h-5 w-5 text-aarete-sunrise" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-surface-900">
                    Create New Requisition
                  </h3>
                  <p className="text-sm text-surface-500">
                    Use AI assistant or fill manually
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 hover:bg-surface-200 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-surface-500" />
              </button>
            </div>

            {/* Modal Body - Two Column Layout */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left - AI Chat */}
              <div className="w-[500px] border-r border-surface-200 flex flex-col bg-surface-100">
                <div className="p-4 border-b border-surface-300 bg-surface-200">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-aarete-sunrise" />
                    <span className="font-medium text-surface-900">AI Assistant</span>
                    <span className="px-2 py-0.5 bg-aarete-sunrise/10 text-aarete-sunrise text-xs rounded-full">
                      Nova Pro
                    </span>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-100">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2 ${
                        msg.role === 'user' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <div
                        className={`p-2 rounded-full flex-shrink-0 ${
                          msg.role === 'user'
                            ? 'bg-aarete-sunrise text-white'
                            : 'bg-surface-200 text-surface-600'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      <div
                        className={`max-w-[90%] p-3 rounded-lg text-sm whitespace-pre-line break-words ${
                          msg.role === 'user'
                            ? 'bg-aarete-sunrise text-white'
                            : 'bg-white border border-surface-200'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex items-start gap-2">
                      <div className="p-2 rounded-full bg-surface-200 text-surface-600">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-white border border-surface-200 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-surface-500">
                          <div className="animate-pulse">Thinking...</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-surface-200 bg-white">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={chatInputRef}
                      value={chatInput}
                      onChange={(e) => {
                        setChatInput(e.target.value);
                        // Auto-resize textarea
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Describe what you need... (Shift+Enter for new line)"
                      rows={1}
                      className="flex-1 px-4 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aarete-sunrise focus:border-transparent resize-none overflow-hidden min-h-[40px] max-h-[150px]"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || isProcessing}
                      className="p-2 bg-aarete-sunrise text-white rounded-lg hover:bg-aarete-sunrise/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setChatMessages([{
                          id: Date.now().toString(),
                          role: 'assistant',
                          content: "Hello! I'm your AI procurement assistant. I can help you create a new requisition. Just describe what you need to purchase, and I'll help fill out the form for you.",
                          timestamp: new Date(),
                        }]);
                        setChatInput('');
                        // Reset textarea height
                        if (chatInputRef.current) {
                          chatInputRef.current.style.height = 'auto';
                        }
                        setNewRequisition({
                          title: '',
                          description: '',
                          department: '',
                          category: '',
                          amount: '',
                          supplier: '',
                          priority: 'medium',
                          justification: '',
                          cost_center: '',
                          gl_account: '',
                          spend_type: 'OPEX',
                          supplier_risk_score: null,
                          supplier_status: '',
                          contract_on_file: false,
                          budget_available: null,
                          budget_impact: '',
                        });
                        setCreateFormTab('basic');
                      }}
                      disabled={isProcessing}
                      className="p-2 bg-surface-300 text-surface-700 rounded-lg hover:bg-surface-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Reset chat and form"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right - Form */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Tab Navigation */}
                <div className="border-b border-surface-200 mb-6">
                  <nav className="flex gap-6" aria-label="Form Tabs">
                    <button
                      type="button"
                      onClick={() => setCreateFormTab('basic')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                        createFormTab === 'basic'
                          ? 'border-aarete-sunrise text-aarete-sunrise'
                          : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
                      }`}
                    >
                      Basic Information
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateFormTab('additional')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                        createFormTab === 'additional'
                          ? 'border-aarete-sunrise text-aarete-sunrise'
                          : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
                      }`}
                    >
                      Additional Info (Optional)
                    </button>
                  </nav>
                </div>

                {/* Tab 1: Basic Information */}
                {createFormTab === 'basic' && (
                <form className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={newRequisition.title}
                      onChange={(e) =>
                        setNewRequisition((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aarete-sunrise focus:border-transparent"
                      placeholder="Enter requisition title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newRequisition.description}
                      onChange={(e) =>
                        setNewRequisition((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aarete-sunrise focus:border-transparent resize-none"
                      placeholder="Describe the procurement need"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">
                        Department *
                      </label>
                      <select
                        value={newRequisition.department}
                        onChange={(e) =>
                          setNewRequisition((prev) => ({ ...prev, department: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aarete-sunrise focus:border-transparent bg-white"
                      >
                        <option value="">Select department</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">
                        Category *
                      </label>
                      <select
                        value={newRequisition.category}
                        onChange={(e) =>
                          setNewRequisition((prev) => ({ ...prev, category: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aarete-sunrise focus:border-transparent bg-white"
                      >
                        <option value="">Select category</option>
                        <option value="IT Equipment">IT Equipment</option>
                        <option value="Office Supplies">Office Supplies</option>
                        <option value="Software">Software</option>
                        <option value="Cloud Services">Cloud Services</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Facilities">Facilities</option>
                        <option value="Training">Training</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">
                        Estimated Amount *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                        <input
                          type="text"
                          value={newRequisition.amount}
                          onChange={(e) =>
                            setNewRequisition((prev) => ({ ...prev, amount: e.target.value }))
                          }
                          className="w-full pl-9 pr-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aarete-sunrise focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={newRequisition.priority}
                        onChange={(e) =>
                          setNewRequisition((prev) => ({ ...prev, priority: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aarete-sunrise focus:border-transparent bg-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">
                      Preferred Supplier
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                      <input
                        type="text"
                        value={newRequisition.supplier}
                        onChange={(e) =>
                          setNewRequisition((prev) => ({ ...prev, supplier: e.target.value }))
                        }
                        className="w-full pl-9 pr-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aarete-sunrise focus:border-transparent"
                        placeholder="Enter supplier name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1">
                      Business Justification
                    </label>
                    <textarea
                      value={newRequisition.justification}
                      onChange={(e) =>
                        setNewRequisition((prev) => ({ ...prev, justification: e.target.value }))
                      }
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aarete-sunrise focus:border-transparent resize-none"
                      placeholder="Explain the business need for this purchase"
                    />
                  </div>
                </form>
                )}

                {/* Tab 2: Additional Information with AI Wizard */}
                {createFormTab === 'additional' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-surface-900">Enterprise Procurement</h3>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newRequisition.department || !newRequisition.category) {
                          alert('Please select Department and Category on the Basic Information tab first.');
                          return;
                        }
                        setAiWizardLoading(true);
                        try {
                          const response = await fetch('/api/v1/requisitions/ai-wizard', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              department: newRequisition.department,
                              category: newRequisition.category,
                              supplier_name: newRequisition.supplier,
                              amount: parseFloat(newRequisition.amount) || 0,
                            }),
                          });
                          if (!response.ok) throw new Error('AI Wizard failed');
                          const data = await response.json();
                          setNewRequisition(prev => ({
                            ...prev,
                            cost_center: data.cost_center || prev.cost_center,
                            gl_account: data.gl_account || prev.gl_account,
                            spend_type: data.spend_type || prev.spend_type,
                            supplier_risk_score: data.supplier_risk_score,
                            supplier_status: data.supplier_status,
                            contract_on_file: data.contract_on_file,
                            budget_available: data.budget_available,
                            budget_impact: data.budget_impact,
                          }));
                        } catch (err) {
                          console.error('AI Wizard error:', err);
                          alert('Failed to run AI Wizard. Please try again.');
                        } finally {
                          setAiWizardLoading(false);
                        }
                      }}
                      disabled={aiWizardLoading || !newRequisition.department || !newRequisition.category}
                      className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                    >
                      <span>✨</span>
                      {aiWizardLoading ? 'Auto-Filling...' : 'AI Wizard Auto-Fill'}
                    </button>
                  </div>

                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800">
                      💡 Click "AI Wizard Auto-Fill" to automatically populate enterprise procurement fields based on your department and category selection from Tab 1.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">
                        Spend Type
                      </label>
                      <select
                        value={newRequisition.spend_type}
                        onChange={(e) => setNewRequisition(prev => ({ ...prev, spend_type: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aarete-sunrise focus:border-transparent bg-white"
                      >
                        <option value="OPEX">OPEX</option>
                        <option value="CAPEX">CAPEX</option>
                        <option value="INVENTORY">INVENTORY</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">
                        Cost Center
                      </label>
                      <input
                        type="text"
                        value={newRequisition.cost_center}
                        onChange={(e) => setNewRequisition(prev => ({ ...prev, cost_center: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aarete-sunrise focus:border-transparent bg-surface-50"
                        placeholder="Auto-filled by AI Wizard"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">
                        GL Account
                      </label>
                      <input
                        type="text"
                        value={newRequisition.gl_account}
                        onChange={(e) => setNewRequisition(prev => ({ ...prev, gl_account: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aarete-sunrise focus:border-transparent bg-surface-50"
                        placeholder="Auto-filled by AI Wizard"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">
                        Supplier Status
                      </label>
                      <input
                        type="text"
                        value={newRequisition.supplier_status}
                        onChange={(e) => setNewRequisition(prev => ({ ...prev, supplier_status: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-aarete-sunrise focus:border-transparent bg-surface-50"
                        placeholder="Auto-filled by AI Wizard"
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">
                        Supplier Risk Score
                      </label>
                      <input
                        type="text"
                        value={newRequisition.supplier_risk_score ?? ''}
                        className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg bg-surface-50"
                        placeholder="Auto-filled"
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">
                        Budget Available
                      </label>
                      <input
                        type="text"
                        value={newRequisition.budget_available ? `$${newRequisition.budget_available.toLocaleString()}` : ''}
                        className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg bg-surface-50"
                        placeholder="Auto-filled"
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-1">
                        Contract on File
                      </label>
                      <input
                        type="text"
                        value={newRequisition.contract_on_file ? 'Yes' : (newRequisition.contract_on_file === false && newRequisition.supplier_status ? 'No' : '')}
                        className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg bg-surface-50"
                        placeholder="Auto-filled"
                        readOnly
                      />
                    </div>
                  </div>

                  {newRequisition.budget_impact && (
                    <div className={`p-4 rounded-lg border ${
                      newRequisition.budget_impact === 'WITHIN_BUDGET' 
                        ? 'bg-green-50 border-green-200 text-green-800' 
                        : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    }`}>
                      <p className="text-sm font-medium">
                        Budget Impact: {newRequisition.budget_impact === 'WITHIN_BUDGET' ? '✅ Within Budget' : '⚠️ ' + newRequisition.budget_impact}
                      </p>
                    </div>
                  )}
                </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-surface-200 flex items-center justify-end gap-3 bg-surface-50">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save as draft doesn't require validation
                  const draftReq = {
                    ...newRequisition,
                    requestor: 'James Wilson',
                  };
                  console.log('Saved as draft:', draftReq);
                  setIsCreateModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium text-surface-700 border border-surface-300 rounded-lg hover:bg-surface-100 transition-colors"
              >
                Save as Draft
              </button>
              <button
                onClick={async () => {
                  // Validate required fields
                  if (!newRequisition.title || !newRequisition.department || !newRequisition.category || !newRequisition.amount) {
                    alert('Please fill in all required fields (*) before submitting.');
                    return;
                  }
                  
                  try {
                    // Import the API function
                    const { createRequisition } = await import('../utils/api');
                    
                    // Map department string to enum value (backend expects Title case)
                    // Use case-insensitive lookup
                    const departmentMap: Record<string, string> = {
                      'it': 'IT',
                      'information technology': 'IT',
                      'marketing': 'Marketing',
                      'operations': 'Operations',
                      'finance': 'Finance',
                      'hr': 'HR',
                      'human resources': 'HR',
                      'sales': 'Sales',
                      'legal': 'Legal',
                      'facilities': 'Facilities',
                      'r&d': 'R&D',
                      'engineering': 'Engineering',
                    };
                    const deptLower = newRequisition.department.toLowerCase();
                    const deptValue = departmentMap[deptLower] || newRequisition.department;
                    console.log('Department mapping:', { original: newRequisition.department, lowercase: deptLower, mapped: deptValue });
                    
                    // Map priority to urgency enum
                    const urgencyMap: Record<string, string> = {
                      'low': 'standard',
                      'medium': 'standard',
                      'high': 'urgent',
                      'urgent': 'emergency',
                    };
                    const urgencyValue = urgencyMap[newRequisition.priority] || 'standard';
                    
                    // Build API request payload with all enterprise fields
                    const apiPayload = {
                      requestor_id: 'test-user-1', // Use existing test user from database
                      department: deptValue,
                      description: newRequisition.description || newRequisition.title,
                      justification: newRequisition.justification || 'Business need',
                      urgency: urgencyValue,
                      needed_by_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                      // Enterprise procurement fields
                      supplier_name: newRequisition.supplier || null,
                      category: newRequisition.category || null,
                      cost_center: newRequisition.cost_center || null,
                      gl_account: newRequisition.gl_account || null,
                      spend_type: newRequisition.spend_type || null,
                      supplier_risk_score: newRequisition.supplier_risk_score || null,
                      supplier_status: newRequisition.supplier_status || null,
                      contract_on_file: newRequisition.contract_on_file || false,
                      budget_available: newRequisition.budget_available || null,
                      budget_impact: newRequisition.budget_impact || null,
                      line_items: [
                        {
                          description: newRequisition.title,
                          category: newRequisition.category,
                          quantity: 1,
                          unit_price: parseFloat(newRequisition.amount) || 0,
                          gl_account: newRequisition.gl_account || '6000',
                        }
                      ],
                    };
                    
                    console.log('Submitting requisition with payload:', apiPayload);
                    
                    // Call backend API to create requisition
                    const createdReq = await createRequisition(apiPayload);
                    console.log('Requisition created via API:', createdReq);
                    
                    // Refresh requisitions list from API to get real data
                    await fetchRequisitions();
                    
                    // Reset form
                    setNewRequisition({
                      title: '',
                      description: '',
                      department: '',
                      category: '',
                      amount: '',
                      supplier: '',
                      priority: 'medium',
                      justification: '',
                      cost_center: '',
                      gl_account: '',
                      spend_type: 'OPEX',
                      supplier_risk_score: null,
                      supplier_status: '',
                      contract_on_file: false,
                      budget_available: null,
                      budget_impact: '',
                    });
                    setCreateFormTab('basic');
                    
                    // Reset chat
                    setChatMessages([{
                      id: '1',
                      role: 'assistant',
                      content: "Hello! I'm your AI procurement assistant. I can help you create a new requisition. Just describe what you need to purchase, and I'll help fill out the form for you.",
                      timestamp: new Date(),
                    }]);
                    
                    // Reset to page 1 to see new requisition
                    setCurrentPage(1);
                    
                    setIsCreateModalOpen(false);
                    
                    alert(`✅ Requisition created successfully!\n\nID: ${createdReq.id}\nNumber: ${createdReq.number}\n\nYou can now go to Automation to process it.`);
                  } catch (error: any) {
                    console.error('Failed to create requisition via API:', error);
                    // Extract error message from various error formats
                    let errorMsg = 'Unknown error';
                    if (error instanceof Error) {
                      errorMsg = error.message;
                    } else if (error?.detail) {
                      errorMsg = typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail);
                    } else if (error?.message) {
                      errorMsg = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
                    } else if (typeof error === 'object') {
                      errorMsg = JSON.stringify(error);
                    }
                    alert(`❌ Failed to create requisition: ${errorMsg}\n\nMake sure the backend server is running.`);
                  }
                }}
                disabled={!newRequisition.title || !newRequisition.department || !newRequisition.category || !newRequisition.amount}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-aarete-sunrise text-white rounded-lg hover:bg-aarete-sunrise/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit for Approval
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
