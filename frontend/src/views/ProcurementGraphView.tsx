import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Building2,
  FileText,
  Package,
  X,
  CheckCircle,
  AlertCircle,
  Filter,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { getRequisitionsStatus } from '../utils/api';
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

interface GraphNode {
  id: string;
  name: string;
  type: 'company' | 'department' | 'requisition' | 'category' | 'supplier' | 'status';
  color: string;
  size: number;
  data: Record<string, unknown>;
  fx?: number;
  fy?: number;
  fz?: number;
  x?: number;
  y?: number;
  z?: number;
  // Anomaly highlighting hook
  isOutlier?: boolean;
  // For distinguishing department->req edges
  isHighValue?: boolean;
}

interface GraphLink {
  source: string;
  target: string;
  color: string;
  // Link type for visual emphasis
  linkType?: 'companyToDept' | 'deptToReq' | 'reqToCategory' | 'reqToSupplier' | 'reqToStatus';
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Map API response to Requisition interface
const mapApiToRequisition = (item: RequisitionStatusSummary): Requisition => {
  // Map workflow_status to status
  const statusMap: Record<string, Requisition['status']> = {
    'draft': 'draft',
    'in_progress': 'processing',
    'hitl_pending': 'pending',
    'rejected': 'rejected',
    'completed': 'completed',
  };
  
  // Determine priority based on amount
  const getPriority = (amount: number): Requisition['priority'] => {
    if (amount >= 100000) return 'urgent';
    if (amount >= 50000) return 'high';
    if (amount >= 20000) return 'medium';
    return 'low';
  };

  return {
    id: item.number,
    title: item.description,
    requestor: item.requestor_name,
    department: item.department,
    amount: item.total_amount,
    status: statusMap[item.workflow_status] || 'pending',
    priority: getPriority(item.total_amount),
    createdAt: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    supplier: item.supplier_name || 'Unknown Supplier',
    category: item.category || 'General',
    currentStep: item.current_step,
    description: item.description,
    justification: item.justification,
    // Centene Enterprise Procurement Fields
    cost_center: item.cost_center,
    gl_account: item.gl_account,
    spend_type: item.spend_type,
    supplier_risk_score: item.supplier_risk_score,
    supplier_status: item.supplier_status,
    contract_on_file: item.contract_on_file,
    budget_available: item.budget_available,
    budget_impact: item.budget_impact,
  };
};

// ==================== SINGLE SOURCE OF TRUTH: NODE COLORS ====================
const NODE_COLORS = {
  // Company (Root) - Only the Centene root node uses this color
  companyRoot: '#0b1624',     // dark blue
  
  // Requisition nodes - All requisitions use this blue (not department colors)
  requisition: '#3366ff',     // blue
  
  // Category nodes
  category: '#6b7280',        // gray - distinct from all departments
  
  // Supplier nodes
  supplier: '#06b6d4',        // cyan - distinct from facilities (teal)
  
  // Status nodes (per requisition) - Reserved only for status, not departments
  statusApproved: '#22c55e',  // green - Approved
  statusRejected: '#ef4444',  // red - Rejected
  statusHitl: '#eab308',      // yellow - HITL Pending
  
  // Department nodes - Each department has its own UNIQUE fixed color
  // These colors must not reuse blue, green, yellow, or red used by requisition/status
  deptFinance: '#a855f7',     // violet/purple
  deptOperations: '#f97316',  // orange
  deptHR: '#db2777',          // bright pink (distinct from marketing)
  deptIT: '#0ea5e9',          // sky blue (distinct from approved green)
  deptMarketing: '#ec4899',   // pink
  deptFacilities: '#14b8a6',  // teal (distinct from supplier cyan)
  deptLegal: '#84cc16',       // lime green
  deptEngineering: '#64748b', // slate gray
  deptSales: '#f59e0b',       // amber
  deptRD: '#10b981',          // emerald green
  deptProcurement: '#6366f1', // indigo
} as const;

// ==================== VISUAL HIERARCHY CONFIGURATION ====================
const VISUAL_CONFIG = {
  // Node size tiers
  nodeSizes: {
    company: 50,      // Root: largest
    department: 35,   // Medium
    requisition: 12,  // Small
    category: 10,     // Small
    supplier: 14,     // Small (shared, slightly larger)
    status: 10,       // Small
  },
  // High-value threshold for requisitions (budget above this gets emphasis)
  highValueThreshold: 100000,
  highValueSizeBoost: 6, // Extra size for high-value requisitions
  // Edge widths
  edgeWidths: {
    departmentToReq: 2.5,  // Thicker/brighter for dept->req
    default: 1.0,          // Other edges
  },
  // Edge opacity
  edgeOpacity: {
    departmentToReq: 0.85, // Brighter for dept->req
    default: 0.35,         // More transparent for other edges
  },
  // Hover/dim opacity
  dimmedOpacity: 0.25,  // More visible when dimmed
  highlightOpacity: 1.0,
  // Node base rendering
  nodeRelSize: 6,  // Base relative size for force-graph node spheres
} as const;

// Helper to get department color from NODE_COLORS
const getDepartmentColor = (dept: string): string => {
  // Normalize department name to handle both uppercase and title case
  const normalizedDept = dept.toUpperCase();
  const deptColorMap: Record<string, string> = {
    'FINANCE': NODE_COLORS.deptFinance,
    'OPERATIONS': NODE_COLORS.deptOperations,
    'HR': NODE_COLORS.deptHR,
    'IT': NODE_COLORS.deptIT,
    'MARKETING': NODE_COLORS.deptMarketing,
    'FACILITIES': NODE_COLORS.deptFacilities,
    'LEGAL': NODE_COLORS.deptLegal,
    'ENGINEERING': NODE_COLORS.deptEngineering,
    'SALES': NODE_COLORS.deptSales,
    'R&D': NODE_COLORS.deptRD,
    'RD': NODE_COLORS.deptRD,
    'PROCUREMENT': NODE_COLORS.deptProcurement,
  };
  return deptColorMap[normalizedDept] || '#6b7280'; // fallback gray
};

// Format department name for display - keep HR and IT uppercase
const formatDepartmentName = (dept: string): string => {
  const upper = dept.toUpperCase();
  if (upper === 'HR' || upper === 'IT') return upper;
  return dept.charAt(0).toUpperCase() + dept.slice(1).toLowerCase();
};

// Helper to get status color from NODE_COLORS
const getStatusColor = (status: 'approved' | 'rejected' | 'hitl'): string => {
  const statusColorMap: Record<string, string> = {
    approved: NODE_COLORS.statusApproved,
    rejected: NODE_COLORS.statusRejected,
    hitl: NODE_COLORS.statusHitl,
  };
  return statusColorMap[status];
};

// Get workflow status for a requisition
const getWorkflowStatus = (req: Requisition): 'approved' | 'rejected' | 'hitl' => {
  if (req.currentStep === 9 && req.status !== 'rejected') return 'approved';
  if (req.status === 'rejected') return 'rejected';
  return 'hitl';
};

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// All departments - hardcoded to ensure all options are always available
const ALL_DEPARTMENTS = ['IT', 'Finance', 'Operations', 'HR', 'Marketing', 'Facilities', 'Legal', 'Engineering', 'Sales', 'R&D', 'Procurement'];
const getAllDepartments = (_requisitions: Requisition[]) => ALL_DEPARTMENTS;
const getAllCategories = (requisitions: Requisition[]) => [...new Set(requisitions.map(r => r.category))];

// Multi-select dropdown component
interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  icon: React.ReactNode;
}

const MultiSelect = ({ label, options, selected, onChange, icon }: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white hover:bg-slate-600 transition-colors min-w-[180px]"
      >
        {icon}
        <span className="flex-1 text-left truncate">
          {selected.length === 0 ? `All ${label}` : 
           selected.length === options.length ? `All ${label}` :
           selected.length === 1 ? selected[0] : 
           `${selected.length} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-2 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          <div className="p-2 border-b border-slate-600">
            <button
              onClick={handleSelectAll}
              className="w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-slate-700 rounded"
            >
              {selected.length === options.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="p-2">
            {options.map(option => (
              <label
                key={option}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => handleToggle(option)}
                  className="w-4 h-4 rounded border-slate-500 text-blue-500 focus:ring-blue-500 bg-slate-700"
                />
                <span className="text-sm text-white truncate">{option}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 3D Spherical radial layout configuration - concentric spheres
const RADIAL_CONFIG = {
  centerRadius: 0,           // Center: Centene at origin
  departmentRadius: 200,     // Shell 1: Departments (increased for breathing room)
  requisitionRadius: 420,    // Shell 2: Requisitions (increased gap from dept)
  outerRadius: 600,          // Shell 3: Category, Supplier, Status (increased gap)
  // Stagger offsets for child nodes along the branch direction
  categoryRadiusOffset: -50, // Category slightly closer than base outer
  statusRadiusOffset: 100,   // Status pushed further out
  supplierRadiusOffset: 0,   // Supplier at base outer radius
};

// Convert spherical coordinates (radius, theta, phi) to Cartesian (x, y, z)
// theta: azimuthal angle (0 to 2*PI, around Y axis)
// phi: polar angle (0 to PI, from top to bottom)
const sphericalToCartesian = (radius: number, theta: number, phi: number): { x: number; y: number; z: number } => {
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
};

// Build graph data from requisitions with 3D SPHERICAL RADIAL LAYOUT
const buildGraphData = (
  requisitions: Requisition[],
  selectedDepartments: string[],
  selectedCategories: string[],
  selectedStatuses: string[],
  budgetMin: number,
  budgetMax: number,
  expandedDepartments: Set<string> // Track which departments are expanded
): GraphData => {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeMap = new Map<string, GraphNode>();

  // Filter requisitions
  let filteredReqs = requisitions;
  
  const allDepartments = getAllDepartments(requisitions);
  const allCategories = getAllCategories(requisitions);
  
  if (selectedDepartments.length > 0 && selectedDepartments.length < allDepartments.length) {
    filteredReqs = filteredReqs.filter(r => selectedDepartments.includes(r.department));
  }
  if (selectedCategories.length > 0 && selectedCategories.length < allCategories.length) {
    filteredReqs = filteredReqs.filter(r => selectedCategories.includes(r.category));
  }
  if (selectedStatuses.length > 0 && selectedStatuses.length < 3) {
    filteredReqs = filteredReqs.filter(r => selectedStatuses.includes(getWorkflowStatus(r)));
  }
  if (budgetMin > 0 || budgetMax < 350000) {
    filteredReqs = filteredReqs.filter(r => r.amount >= budgetMin && r.amount <= budgetMax);
  }

  if (filteredReqs.length === 0) {
    return { nodes: [], links: [] };
  }

  // ==================== SHELL 0: CENTER - CENTENE ====================
  const companyNode: GraphNode = {
    id: 'company-centene',
    name: 'Centene',
    type: 'company',
    color: NODE_COLORS.companyRoot,
    size: VISUAL_CONFIG.nodeSizes.company,
    data: {
      totalRequisitions: filteredReqs.length,
      totalBudget: filteredReqs.reduce((sum, r) => sum + r.amount, 0),
      departments: [...new Set(filteredReqs.map(r => r.department))].length,
    },
    fx: 0,
    fy: 0,
    fz: 0,
  };
  nodes.push(companyNode);
  nodeMap.set(companyNode.id, companyNode);

  // ==================== SHELL 1: DEPARTMENTS (on a sphere) ====================
  const departmentStats = new Map<string, { budget: number; count: number; reqs: Requisition[] }>();
  filteredReqs.forEach(req => {
    const stats = departmentStats.get(req.department) || { budget: 0, count: 0, reqs: [] };
    stats.budget += req.amount;
    stats.count++;
    stats.reqs.push(req);
    departmentStats.set(req.department, stats);
  });

  const departments = [...departmentStats.keys()];
  const deptCount = departments.length;
  
  // Store department positions for child node placement
  const deptPositions = new Map<string, { theta: number; phi: number }>();

  // Distribute departments evenly on a sphere using golden spiral
  departments.forEach((dept, index) => {
    const stats = departmentStats.get(dept)!;
    
    // Golden spiral distribution for even spacing on sphere
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const theta = 2 * Math.PI * index / goldenRatio; // Azimuthal angle
    const phi = Math.acos(1 - 2 * (index + 0.5) / deptCount); // Polar angle
    
    deptPositions.set(dept, { theta, phi });
    
    const pos = sphericalToCartesian(RADIAL_CONFIG.departmentRadius, theta, phi);
    const nodeId = `dept-${dept}`;
    
    const node: GraphNode = {
      id: nodeId,
      name: dept,
      type: 'department',
      color: getDepartmentColor(dept),
      size: VISUAL_CONFIG.nodeSizes.department,
      data: {
        budget: stats.budget,
        requisitionCount: stats.count,
      },
      fx: pos.x,
      fy: pos.y,
      fz: pos.z,
    };
    
    nodes.push(node);
    nodeMap.set(nodeId, node);
    
    // Link: Centene -> Department
    links.push({
      source: 'company-centene',
      target: nodeId,
      color: getDepartmentColor(dept),
      linkType: 'companyToDept',
    });
  });

  // ==================== SHELL 2: REQUISITIONS (on larger sphere) ====================
  // Position requisitions in a cone extending outward from their department
  // Only show requisitions for expanded departments
  const reqPositions = new Map<string, { theta: number; phi: number }>();
  
  departments.forEach(dept => {
    // Skip requisitions for collapsed departments
    if (!expandedDepartments.has(dept)) return;
    
    const stats = departmentStats.get(dept)!;
    const deptPos = deptPositions.get(dept)!;
    const reqCount = stats.reqs.length;
    
    // Spread requisitions in a wider cone around the department's direction
    // Increased cone angle for better spacing between requisitions
    const baseConeAngle = Math.PI / 5; // Wider base cone (was PI/8)
    const coneAngle = Math.min(baseConeAngle, Math.PI / Math.max(deptCount, 3)); // Adaptive cone
    
    stats.reqs.forEach((req, index) => {
      const reqId = `req-${req.id}`;
      
      // Calculate position within cone - spiral pattern with more spread
      let reqTheta: number, reqPhi: number;
      
      if (reqCount === 1) {
        // Single req - place directly outward with tiny offset to avoid dept overlap
        reqTheta = deptPos.theta + 0.02;
        reqPhi = deptPos.phi + 0.02;
      } else {
        // Multiple reqs - spread in a wider spiral cone with better spacing
        const t = (index + 0.5) / reqCount; // 0.x to 1.x, offset to avoid center
        const spiralAngle = t * 2.5 * Math.PI; // More spiral rotations for spread
        // Start further out from center of cone, expand gradually
        const coneOffset = coneAngle * (0.4 + 0.6 * Math.sqrt(t));
        
        // Perturb theta and phi based on spiral position with increased offsets
        reqTheta = deptPos.theta + coneOffset * Math.cos(spiralAngle) * 1.2;
        reqPhi = Math.max(0.1, Math.min(Math.PI - 0.1, deptPos.phi + coneOffset * Math.sin(spiralAngle) * 1.2));
      }
      
      reqPositions.set(reqId, { theta: reqTheta, phi: reqPhi });
      
      const pos = sphericalToCartesian(RADIAL_CONFIG.requisitionRadius, reqTheta, reqPhi);
      
      // Determine if this is a high-value requisition
      const isHighValue = req.amount >= VISUAL_CONFIG.highValueThreshold;
      // Calculate size: base size + boost for high-value
      const reqSize = VISUAL_CONFIG.nodeSizes.requisition + (isHighValue ? VISUAL_CONFIG.highValueSizeBoost : 0);
      
      // isOutlier hook - for now, can be set based on business logic later
      // Example: mark as outlier if amount is very high AND rejected/HITL
      const isOutlier = req.amount >= 200000 && getWorkflowStatus(req) !== 'approved';
      
      const reqNode: GraphNode = {
        id: reqId,
        name: req.id,
        type: 'requisition',
        color: NODE_COLORS.requisition,
        size: reqSize,
        isHighValue,
        isOutlier,
        data: {
          id: req.id,
          title: req.title,
          requestor: req.requestor,
          department: req.department,
          category: req.category,
          supplier: req.supplier,
          amount: req.amount,
          status: req.status,
          currentStep: req.currentStep,
          workflowStatus: getWorkflowStatus(req),
          createdAt: req.createdAt,
          priority: req.priority,
          isHighValue,
          isOutlier,
        },
        fx: pos.x,
        fy: pos.y,
        fz: pos.z,
      };
      nodes.push(reqNode);
      nodeMap.set(reqId, reqNode);

      // Link: Department -> Requisition (emphasized edge)
      links.push({
        source: `dept-${req.department}`,
        target: reqId,
        color: NODE_COLORS.requisition,
        linkType: 'deptToReq',
      });
    });
  });

  // ==================== SHELL 3: OUTER NODES (Category, Supplier, Status) ====================
  // All outer nodes (Category, Supplier, Status) are per-requisition (not shared)
  // Each requisition has its own dedicated leaf nodes for clean visualization

  // Store requisition positions for positioning outer nodes
  // (reqPositions is already populated above)

  // Create Category nodes - ONE PER REQUISITION (not shared)
  // Each requisition gets its own dedicated category leaf node
  // Only for expanded departments
  filteredReqs.forEach(req => {
    // Skip if department is collapsed
    if (!expandedDepartments.has(req.department)) return;
    
    const reqId = `req-${req.id}`;
    const reqPos = reqPositions.get(reqId);
    
    if (!reqPos) return;
    
    // Position category node outward from its requisition with staggered offset
    const categoryRadius = RADIAL_CONFIG.outerRadius + RADIAL_CONFIG.categoryRadiusOffset;
    // Angular offset to separate from other outer nodes (stagger along branch)
    const offsetTheta = reqPos.theta + 0.08;
    const offsetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, reqPos.phi + 0.06));
    const pos = sphericalToCartesian(categoryRadius, offsetTheta, offsetPhi);
    
    const catNodeId = `category-${req.id}`;
    
    const catNode: GraphNode = {
      id: catNodeId,
      name: req.category,
      type: 'category',
      color: NODE_COLORS.category,
      size: VISUAL_CONFIG.nodeSizes.category,
      data: {
        categoryName: req.category,
        requisitionId: req.id,
        requisitionCount: 1,
        totalBudget: req.amount,
      },
      fx: pos.x,
      fy: pos.y,
      fz: pos.z,
    };
    nodes.push(catNode);
    nodeMap.set(catNodeId, catNode);
  });

  // Create Supplier nodes - ONE PER REQUISITION (not shared)
  // Each requisition gets its own dedicated supplier leaf node
  // Only for expanded departments
  filteredReqs.forEach(req => {
    // Skip if department is collapsed
    if (!expandedDepartments.has(req.department)) return;
    
    const reqId = `req-${req.id}`;
    const reqPos = reqPositions.get(reqId);
    
    if (!reqPos) return;
    
    // Position supplier node outward from its requisition with staggered offset
    // Offset in opposite direction from categories
    const supplierRadius = RADIAL_CONFIG.outerRadius + RADIAL_CONFIG.supplierRadiusOffset;
    const offsetTheta = reqPos.theta - 0.08; // Opposite direction from category
    const offsetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, reqPos.phi - 0.06));
    const pos = sphericalToCartesian(supplierRadius, offsetTheta, offsetPhi);
    
    const suppNodeId = `supp-${req.id}`;
    
    const suppNode: GraphNode = {
      id: suppNodeId,
      name: req.supplier,
      type: 'supplier',
      color: NODE_COLORS.supplier,
      size: VISUAL_CONFIG.nodeSizes.supplier,
      data: {
        supplierName: req.supplier,
        requisitionId: req.id,
        requisitionCount: 1,
        totalValue: req.amount,
      },
      fx: pos.x,
      fy: pos.y,
      fz: pos.z,
    };
    nodes.push(suppNode);
    nodeMap.set(suppNodeId, suppNode);
  });

  // Create Status nodes - ONE PER REQUISITION (not shared)
  // Each requisition gets its own dedicated status leaf node
  // Only for expanded departments
  filteredReqs.forEach(req => {
    // Skip if department is collapsed
    if (!expandedDepartments.has(req.department)) return;
    
    const reqId = `req-${req.id}`;
    const statusKey = getWorkflowStatus(req);
    const reqPos = reqPositions.get(reqId);
    
    if (!reqPos) return;
    
    // Position status node directly outward from its requisition (furthest out)
    // Staggered along the branch direction for clear visual hierarchy
    const statusRadius = RADIAL_CONFIG.outerRadius + RADIAL_CONFIG.statusRadiusOffset;
    // Small offset to prevent exact overlap with requisition line
    const statusTheta = reqPos.theta - 0.04;
    const statusPhi = Math.max(0.1, Math.min(Math.PI - 0.1, reqPos.phi - 0.03));
    const pos = sphericalToCartesian(statusRadius, statusTheta, statusPhi);
    
    const statusNodeId = `status-${req.id}`;
    const statusName = statusKey === 'approved' ? 'Approved' 
                     : statusKey === 'rejected' ? 'Rejected' 
                     : 'HITL Pending';
    
    const statusNode: GraphNode = {
      id: statusNodeId,
      name: statusName,
      type: 'status',
      color: getStatusColor(statusKey),
      size: VISUAL_CONFIG.nodeSizes.status,
      data: {
        statusType: statusKey,
        requisitionId: req.id,
        requisitionCount: 1,
      },
      fx: pos.x,
      fy: pos.y,
      fz: pos.z,
    };
    nodes.push(statusNode);
    nodeMap.set(statusNodeId, statusNode);
  });

  // ==================== CREATE ALL LINKS ====================
  // Only create links for requisitions in expanded departments
  filteredReqs.forEach(req => {
    // Skip if department is collapsed
    if (!expandedDepartments.has(req.department)) return;
    
    const reqId = `req-${req.id}`;
    const catId = `category-${req.id}`; // Per-requisition category node
    const suppId = `supp-${req.id}`; // Per-requisition supplier node
    const statusId = `status-${req.id}`; // Per-requisition status node

    // Link: Requisition -> its own Category node
    links.push({
      source: reqId,
      target: catId,
      color: NODE_COLORS.category,
      linkType: 'reqToCategory',
    });

    // Link: Requisition -> its own Supplier node
    links.push({
      source: reqId,
      target: suppId,
      color: NODE_COLORS.supplier,
      linkType: 'reqToSupplier',
    });

    // Link: Requisition -> its own Status node
    links.push({
      source: reqId,
      target: statusId,
      color: getStatusColor(getWorkflowStatus(req)),
      linkType: 'reqToStatus',
    });
  });

  return { nodes, links };
};

// Main component
export default function ProcurementGraphView() {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // API data state
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states (initialized after data loads)
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['approved', 'rejected', 'hitl']);
  const [budgetMin, setBudgetMin] = useState(0);
  const [budgetMax, setBudgetMax] = useState(350000);
  
  // Track which departments are expanded (showing their requisitions)
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  
  // UI states
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  // Hover-only highlighting state (used for temporary dimming on hover)
  const [hoverHighlightNodes, setHoverHighlightNodes] = useState<Set<string>>(new Set());
  const [hoverHighlightLinks, setHoverHighlightLinks] = useState<Set<string>>(new Set());
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  // Flag to prevent background click from firing right after node click
  const nodeClickedRef = useRef(false);
  
  // Selected requisition ID for detail panel (always shows last clicked requisition)
  const [selectedRequisitionId, setSelectedRequisitionId] = useState<string | null>(null);
  
  // Load requisitions from API
  useEffect(() => {
    const fetchRequisitions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getRequisitionsStatus();
        const mappedData = data.map(mapApiToRequisition);
        setRequisitions(mappedData);
        
        // Initialize filters with all departments/categories selected
        setSelectedDepartments(getAllDepartments(mappedData));
        setSelectedCategories(getAllCategories(mappedData));
        
        // Set max budget based on actual data
        const maxAmount = Math.max(...mappedData.map(r => r.amount), 350000);
        setBudgetMax(Math.ceil(maxAmount / 10000) * 10000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load requisitions');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRequisitions();
  }, []);
  
  // Derive the selected requisition data from the ID
  const selectedReq = useMemo(() => {
    if (!selectedRequisitionId) return null;
    return requisitions.find(r => r.id === selectedRequisitionId) ?? null;
  }, [selectedRequisitionId, requisitions]);

  // Build graph data
  const graphData = useMemo(() => {
    const data = buildGraphData(
      requisitions,
      selectedDepartments,
      selectedCategories,
      selectedStatuses,
      budgetMin,
      budgetMax,
      expandedDepartments
    );
    console.log('Graph data built:', { 
      requisitionsCount: requisitions.length,
      nodesCount: data.nodes.length, 
      linksCount: data.links.length,
      nodeTypes: data.nodes.map(n => n.type),
      expandedDepts: [...expandedDepartments]
    });
    return data;
  }, [requisitions, selectedDepartments, selectedCategories, selectedStatuses, budgetMin, budgetMax, expandedDepartments]);

  // Build link index for neighbor detection
  const linkIndex = useMemo(() => {
    const index = new Map<string, Set<string>>();
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
      
      if (!index.has(sourceId)) index.set(sourceId, new Set());
      if (!index.has(targetId)) index.set(targetId, new Set());
      
      index.get(sourceId)!.add(targetId);
      index.get(targetId)!.add(sourceId);
    });
    return index;
  }, [graphData.links]);

  // Handle container resize with ResizeObserver for more accurate dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width || containerRef.current.clientWidth,
          height: rect.height || containerRef.current.clientHeight,
        });
      }
    };
    
    updateDimensions();
    
    // Use ResizeObserver for better accuracy
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    window.addEventListener('resize', updateDimensions);
    
    // Small delay to ensure container is fully rendered
    const timer = setTimeout(updateDimensions, 100);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // Handle node click - toggle department expansion or show requisition detail
  const handleNodeClick = useCallback((node: GraphNode) => {
    // Set flag to prevent background click from firing immediately after
    nodeClickedRef.current = true;
    setTimeout(() => { nodeClickedRef.current = false; }, 100);
    
    if (node.type === 'department') {
      // Toggle department expansion
      const deptName = node.name;
      setExpandedDepartments(prev => {
        const newSet = new Set(prev);
        if (newSet.has(deptName)) {
          newSet.delete(deptName); // Collapse
        } else {
          newSet.add(deptName); // Expand
        }
        return newSet;
      });
    } else if (node.type === 'requisition') {
      // Show requisition detail panel
      setSelectedRequisitionId(node.data.id as string);
    }
    // For company/category/supplier/status nodes, do nothing
  }, []);

  // Close requisition detail panel
  const closeDetailPanel = useCallback(() => {
    setSelectedRequisitionId(null);
  }, []);

  // Helper: Get all nodes in a department's branch (requisitions + their category/supplier/status)
  const getDepartmentBranch = useCallback((deptId: string): { nodes: Set<string>; links: Set<string> } => {
    const branchNodes = new Set<string>();
    const branchLinks = new Set<string>();
    
    // Add the department node
    branchNodes.add(deptId);
    
    // Add company node (parent of department)
    branchNodes.add('company-centene');
    
    // Find all requisitions connected to this department
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
      const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
      
      // Link from department to requisition
      if (sourceId === deptId && targetId.startsWith('req-')) {
        branchNodes.add(targetId);
        branchLinks.add(`${sourceId}-${targetId}`);
        
        // Now find all nodes connected to this requisition (category, supplier, status)
        graphData.links.forEach(reqLink => {
          const reqSourceId = typeof reqLink.source === 'object' ? (reqLink.source as any).id : reqLink.source;
          const reqTargetId = typeof reqLink.target === 'object' ? (reqLink.target as any).id : reqLink.target;
          
          if (reqSourceId === targetId) {
            branchNodes.add(reqTargetId);
            branchLinks.add(`${reqSourceId}-${reqTargetId}`);
          }
        });
      }
      
      // Link from company to this department
      if (sourceId === 'company-centene' && targetId === deptId) {
        branchLinks.add(`${sourceId}-${targetId}`);
      }
    });
    
    return { nodes: branchNodes, links: branchLinks };
  }, [graphData.links]);

  // Handle node hover with branch highlighting for departments (hover-only, clears on mouseout)
  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node);
    
    if (node) {
      const newHighlightNodes = new Set<string>();
      const newHighlightLinks = new Set<string>();
      
      if (node.type === 'department') {
        // Highlight entire department branch
        const branch = getDepartmentBranch(node.id);
        branch.nodes.forEach(id => newHighlightNodes.add(id));
        branch.links.forEach(id => newHighlightLinks.add(id));
      } else if (node.type === 'requisition') {
        // Highlight requisition and its immediate neighbors (dept, category, supplier, status)
        newHighlightNodes.add(node.id);
        
        graphData.links.forEach(link => {
          const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
          const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
          
          // Links where this requisition is source or target
          if (sourceId === node.id) {
            newHighlightNodes.add(targetId);
            newHighlightLinks.add(`${sourceId}-${targetId}`);
          } else if (targetId === node.id) {
            newHighlightNodes.add(sourceId);
            newHighlightLinks.add(`${sourceId}-${targetId}`);
          }
        });
      } else {
        // Default behavior: highlight node and immediate neighbors
        newHighlightNodes.add(node.id);
        (linkIndex.get(node.id) || new Set()).forEach(neighborId => {
          newHighlightNodes.add(neighborId);
        });
        
        graphData.links.forEach(link => {
          const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
          const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
          if (sourceId === node.id || targetId === node.id) {
            newHighlightLinks.add(`${sourceId}-${targetId}`);
          }
        });
      }
      
      setHoverHighlightNodes(newHighlightNodes);
      setHoverHighlightLinks(newHighlightLinks);
    } else {
      // Clear hover highlighting when mouse leaves
      setHoverHighlightNodes(new Set());
      setHoverHighlightLinks(new Set());
    }
  }, [linkIndex, graphData.links, getDepartmentBranch]);

  // Clear selection (only if not immediately after a node click)
  const clearSelection = useCallback(() => {
    // Skip if a node was just clicked (prevents background click from overriding node click)
    if (nodeClickedRef.current) return;
    
    // Only clear the selected requisition - hover highlighting clears on its own
    setSelectedRequisitionId(null);
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (fgRef.current) {
      const distance = fgRef.current.camera().position.length();
      fgRef.current.camera().position.setLength(distance * 0.7);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (fgRef.current) {
      const distance = fgRef.current.camera().position.length();
      fgRef.current.camera().position.setLength(distance * 1.3);
    }
  }, []);

  const handleResetView = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 1200 }, { x: 0, y: 0, z: 0 }, 1000);
    }
    clearSelection();
  }, [clearSelection]);

  // Get tooltip content based on node type
  const getTooltipContent = (node: GraphNode): string => {
    switch (node.type) {
      case 'company':
        return `${node.name}\nDepartments: ${node.data.departments}\nTotal Requisitions: ${node.data.totalRequisitions}\nTotal Budget: ${formatCurrency(node.data.totalBudget as number)}`;
      case 'department':
        return `${node.name} Department\nRequisitions: ${node.data.requisitionCount}\nTotal Budget: ${formatCurrency(node.data.budget as number)}`;
      case 'requisition':
        return `${node.data.id}\n${node.data.title}\nDept: ${node.data.department}\nCategory: ${node.data.category}\nSupplier: ${node.data.supplier}\nAmount: ${formatCurrency(node.data.amount as number)}\nStatus: ${(node.data.workflowStatus as string).toUpperCase()}`;
      case 'category':
        return `Category: ${node.name}\nRequisitions: ${node.data.requisitionCount}\nTotal Budget: ${formatCurrency(node.data.totalBudget as number)}`;
      case 'supplier':
        return `Supplier: ${node.name}\nRequisitions: ${node.data.requisitionCount}\nTotal Value: ${formatCurrency(node.data.totalValue as number)}`;
      case 'status':
        return `Status: ${node.name}\nRequisitions: ${node.data.requisitionCount}`;
      default:
        return node.name;
    }
  };

  // Calculate stats for display
  const stats = useMemo(() => {
    const allDepartments = getAllDepartments(requisitions);
    const allCategories = getAllCategories(requisitions);
    
    const filteredReqs = requisitions.filter(r => {
      if (selectedDepartments.length > 0 && selectedDepartments.length < allDepartments.length) {
        if (!selectedDepartments.includes(r.department)) return false;
      }
      if (selectedCategories.length > 0 && selectedCategories.length < allCategories.length) {
        if (!selectedCategories.includes(r.category)) return false;
      }
      if (selectedStatuses.length > 0 && selectedStatuses.length < 3) {
        if (!selectedStatuses.includes(getWorkflowStatus(r))) return false;
      }
      if (r.amount < budgetMin || r.amount > budgetMax) return false;
      return true;
    });

    return {
      totalReqs: filteredReqs.length,
      totalBudget: filteredReqs.reduce((sum, r) => sum + r.amount, 0),
      approved: filteredReqs.filter(r => getWorkflowStatus(r) === 'approved').length,
      rejected: filteredReqs.filter(r => getWorkflowStatus(r) === 'rejected').length,
      hitl: filteredReqs.filter(r => getWorkflowStatus(r) === 'hitl').length,
    };
  }, [requisitions, selectedDepartments, selectedCategories, selectedStatuses, budgetMin, budgetMax]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading procurement data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white text-lg mb-2">Failed to load procurement data</p>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Filters Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Graph Filters</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Department Filter */}
          <MultiSelect
            label="Departments"
            options={getAllDepartments(requisitions)}
            selected={selectedDepartments}
            onChange={setSelectedDepartments}
            icon={<Building2 className="w-4 h-4 text-purple-400" />}
          />

          {/* Category Filter */}
          <MultiSelect
            label="Categories"
            options={getAllCategories(requisitions)}
            selected={selectedCategories}
            onChange={setSelectedCategories}
            icon={<Package className="w-4 h-4 text-purple-400" />}
          />

          {/* Status Filter */}
          <MultiSelect
            label="Status"
            options={['approved', 'rejected', 'hitl']}
            selected={selectedStatuses}
            onChange={setSelectedStatuses}
            icon={<CheckCircle className="w-4 h-4 text-green-400" />}
          />

          {/* Budget Range */}
          <div className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-lg">
            <span className="text-slate-400 text-sm">Budget:</span>
            <input
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(Number(e.target.value))}
              className="w-24 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
              placeholder="Min"
            />
            <span className="text-slate-400">-</span>
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(Number(e.target.value))}
              className="w-24 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
              placeholder="Max"
            />
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => {
              setSelectedDepartments(getAllDepartments(requisitions));
              setSelectedCategories(getAllCategories(requisitions));
              setSelectedStatuses(['approved', 'rejected', 'hitl']);
              setBudgetMin(0);
              setBudgetMax(Math.ceil(Math.max(...requisitions.map(r => r.amount), 350000) / 10000) * 10000);
            }}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-6 mt-3 text-sm">
          <span className="text-slate-400">
            Showing: <span className="text-white font-medium">{stats.totalReqs}</span> requisitions
          </span>
          <span className="text-slate-400">
            Total: <span className="text-white font-medium">{formatCurrency(stats.totalBudget)}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-green-400">{stats.approved} Approved</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-red-400">{stats.rejected} Rejected</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="text-yellow-400">{stats.hitl} HITL</span>
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Graph Container - Full width */}
        <div ref={containerRef} className="flex-1 relative min-h-0">
          {graphData.nodes.length > 0 ? (
            <ForceGraph3D
              ref={fgRef}
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              backgroundColor="#0f172a"
              nodeLabel={(node) => getTooltipContent(node as GraphNode)}
              nodeRelSize={VISUAL_CONFIG.nodeRelSize}
              nodeColor={(node) => {
                const n = node as GraphNode;
                // Dimmed state only during hover (not click selection)
                if (hoverHighlightNodes.size > 0 && !hoverHighlightNodes.has(n.id)) {
                  return '#374151'; // Gray when dimmed (solid color, not transparent)
                }
                return n.color;
              }}
              nodeVal={(node) => {
                const n = node as GraphNode;
                // Ensure minimum visible size
                const baseSize = Math.max(n.size || 10, 8);
                // isOutlier nodes get larger radius
                if (n.isOutlier) {
                  return baseSize * 1.5;
                }
                return baseSize;
              }}
              nodeOpacity={0.95}
              linkColor={(link) => {
                const l = link as GraphLink;
                const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
                const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;
                const linkId = `${sourceId}-${targetId}`;
                
                // Dimmed state only during hover (not click selection)
                if (hoverHighlightLinks.size > 0 && !hoverHighlightLinks.has(linkId)) {
                  return `rgba(100, 100, 100, ${VISUAL_CONFIG.dimmedOpacity})`;
                }
                
                // Emphasize department->requisition edges
                if (l.linkType === 'deptToReq') {
                  return l.color; // Full color for emphasized edges
                }
                
                // Other edges get slightly dimmed base opacity
                const hex = l.color;
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${VISUAL_CONFIG.edgeOpacity.default})`;
              }}
              linkWidth={(link) => {
                const l = link as GraphLink;
                const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
                const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;
                const linkId = `${sourceId}-${targetId}`;
                
                // Highlighted links during hover are thicker
                if (hoverHighlightLinks.has(linkId)) {
                  return l.linkType === 'deptToReq' ? 3.5 : 2.5;
                }
                
                // Department->Requisition edges are thicker by default
                if (l.linkType === 'deptToReq') {
                  return VISUAL_CONFIG.edgeWidths.departmentToReq;
                }
                
                return VISUAL_CONFIG.edgeWidths.default;
              }}
              linkOpacity={(link) => {
                const l = link as GraphLink;
                const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
                const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;
                const linkId = `${sourceId}-${targetId}`;
                
                // Dimmed state only during hover (not click selection)
                if (hoverHighlightLinks.size > 0 && !hoverHighlightLinks.has(linkId)) {
                  return VISUAL_CONFIG.dimmedOpacity;
                }
                
                // Department->Requisition edges are more opaque
                if (l.linkType === 'deptToReq') {
                  return VISUAL_CONFIG.edgeOpacity.departmentToReq;
                }
                
                return VISUAL_CONFIG.edgeOpacity.default;
              }}
              onNodeClick={(node) => handleNodeClick(node as GraphNode)}
              onNodeHover={(node) => handleNodeHover(node as GraphNode | null)}
              onBackgroundClick={clearSelection}
              enableNodeDrag={false}
              cooldownTicks={0}
              d3AlphaDecay={1}
              d3VelocityDecay={1}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No data matches your filters</p>
                <p className="text-sm mt-2">Try adjusting the filter criteria</p>
              </div>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleResetView}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-3">Legend</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {/* Node Types */}
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: NODE_COLORS.companyRoot }}></div>
                <span className="text-slate-300">Company (Root)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.requisition }}></div>
                <span className="text-slate-300">Requisition</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.category }}></div>
                <span className="text-slate-300">Category</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.supplier }}></div>
                <span className="text-slate-300">Supplier</span>
              </div>

              {/* Department Colors */}
              <div className="col-span-2 mt-2 pt-2 border-t border-slate-600">
                <span className="text-slate-400 text-xs">Departments:</span>
              </div>
              {(['Finance', 'Operations', 'HR', 'IT', 'Marketing', 'Facilities', 'Legal', 'Engineering', 'Sales', 'R&D', 'Procurement'] as const).map(dept => (
                <div key={dept} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getDepartmentColor(dept) }}></div>
                  <span className="text-slate-300">{dept}</span>
                </div>
              ))}

              {/* Status Colors */}
              <div className="col-span-2 mt-2 pt-2 border-t border-slate-600">
                <span className="text-slate-400 text-xs">Status:</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.statusApproved }}></div>
                <span className="text-slate-300">Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.statusRejected }}></div>
                <span className="text-slate-300">Rejected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.statusHitl }}></div>
                <span className="text-slate-300">HITL Pending</span>
              </div>
            </div>
          </div>

          {/* Hover Tooltip - always shows when hovering (not affected by selection) */}
          {hoveredNode && (
            <div className="absolute top-4 left-4 bg-slate-800/95 backdrop-blur-sm rounded-lg p-4 border border-slate-600 max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: hoveredNode.color }}
                ></div>
                <span className="font-semibold text-white">{hoveredNode.name}</span>
              </div>
              <div className="text-sm text-slate-300 whitespace-pre-line">
                {getTooltipContent(hoveredNode).split('\n').slice(1).join('\n')}
              </div>
            </div>
          )}
          
          {/* Requisition Detail Panel - Bottom Right (shows last clicked requisition) */}
          {selectedReq && (
            <div className="absolute bottom-4 right-4 w-80 bg-slate-800/95 backdrop-blur-sm rounded-lg border border-slate-600 shadow-xl">
              <div className="p-3 border-b border-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: NODE_COLORS.requisition }}
                  ></div>
                  <span className="font-semibold text-white text-sm">{selectedReq.id}</span>
                  {selectedReq.amount >= VISUAL_CONFIG.highValueThreshold && (
                    <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">High Value</span>
                  )}
                </div>
                <button
                  onClick={closeDetailPanel}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              
              <div className="p-3 space-y-2">
                {/* Title */}
                <div>
                  <p className="text-white text-sm font-medium">{selectedReq.title}</p>
                </div>
                
                {/* Key Details Grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-400">Department</span>
                    <p className="text-white">{selectedReq.department}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Category</span>
                    <p className="text-white">{selectedReq.category}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Supplier</span>
                    <p className="text-white">{selectedReq.supplier}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Budget</span>
                    <p className="text-white font-medium">{formatCurrency(selectedReq.amount)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Status</span>
                    <p className={`font-medium ${
                      selectedReq.status === 'completed' || selectedReq.status === 'approved' ? 'text-green-400' :
                      selectedReq.status === 'rejected' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {selectedReq.status === 'completed' ? 'Approved (Step 7)' :
                       selectedReq.status === 'rejected' ? 'Rejected' : 'HITL Pending'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Priority</span>
                    <p className={`capitalize ${
                      selectedReq.priority === 'urgent' ? 'text-red-400' :
                      selectedReq.priority === 'high' ? 'text-orange-400' :
                      selectedReq.priority === 'medium' ? 'text-yellow-400' :
                      'text-slate-300'
                    }`}>
                      {selectedReq.priority}
                    </p>
                  </div>
                </div>
                
                {/* Dates */}
                <div className="pt-2 border-t border-slate-700">
                  <div className="grid grid-cols-2 gap-x-4 text-xs">
                    <div>
                      <span className="text-slate-400">Requested</span>
                      <p className="text-white">{selectedReq.createdAt}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Step</span>
                      <p className="text-white">{selectedReq.currentStep}/9</p>
                    </div>
                  </div>
                </div>
                
                {/* Requestor */}
                <div className="pt-2 border-t border-slate-700 text-xs">
                  <span className="text-slate-400">Requestor: </span>
                  <span className="text-white">{selectedReq.requestor}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
