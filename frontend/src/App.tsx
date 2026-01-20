import { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Workflow, 
  Network,
  User,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown
} from 'lucide-react';
import './App.css';

// Import views
import { P2PDashboardView } from './views/P2PDashboardView';
import { AutomationView } from './views/AutomationView';
import ProcurementGraphView from './views/ProcurementGraphView';

// Types
type TabId = 'dashboard' | 'automation' | 'graph';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface Requisition {
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

const TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'automation', label: 'Automation', icon: Workflow },
  { id: 'graph', label: 'Procurement Network', icon: Network },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Handle URL query parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reqIdParam = params.get('requisition');
    
    if (reqIdParam) {
      // Parse the requisition ID from URL and set it
      // The actual requisition data will be loaded by AutomationView
      setSelectedRequisition({
        id: reqIdParam,
        title: 'Loading...',
        requestor: '',
        department: '',
        amount: 0,
        status: 'pending',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        supplier: '',
        category: '',
        currentStep: 1,
      } as Requisition);
      setActiveTab('automation');
    }
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler for kicking off P2P engine from Dashboard
  const handleKickOffEngine = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setActiveTab('automation');
  };

  // Handler for navigating to automation view
  const handleNavigateToAutomation = (requisitionId: string) => {
    console.log('handleNavigateToAutomation called with ID:', requisitionId);
    setSelectedRequisition({
      id: requisitionId,
      title: 'Loading...',
      requestor: '',
      department: '',
      amount: 0,
      status: 'pending',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      supplier: '',
      category: '',
      currentStep: 1,
    } as Requisition);
    console.log('Setting activeTab to automation');
    setActiveTab('automation');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <P2PDashboardView onKickOffEngine={handleKickOffEngine} onNavigateToAutomation={handleNavigateToAutomation} isActive={activeTab === 'dashboard'} />;
      case 'automation':
        return <AutomationView selectedRequisition={selectedRequisition} onClearRequisition={() => setSelectedRequisition(null)} />;
      case 'graph':
        return <ProcurementGraphView />;
      default:
        return <P2PDashboardView onKickOffEngine={handleKickOffEngine} onNavigateToAutomation={handleNavigateToAutomation} isActive={activeTab === 'dashboard'} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface-100">
      {/* Header with AArete branding */}
      <header className="bg-white border-b border-surface-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-8">
          <div className="flex items-center justify-between h-20 py-3">
            {/* Logo and Brand */}
            <div className="flex items-center gap-4">
              <img 
                src="/aarete-logo.svg" 
                alt="AArete" 
                className="h-14 w-auto"
              />
              <div className="h-10 w-px bg-surface-200" />
              <span className="text-xl font-semibold text-surface-600">P2P Intelligence Platform</span>
            </div>

            {/* Tab Navigation - Larger and wider */}
            <nav className="flex items-center gap-3">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-3 px-8 py-3.5 rounded-xl text-base font-semibold
                      transition-all duration-200 min-w-[180px] justify-center
                      ${isActive 
                        ? 'bg-aarete-sunrise text-white shadow-lg shadow-aarete-sunrise/30' 
                        : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 border border-surface-200'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* Right side - User info with dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-4 px-4 py-2.5 rounded-xl hover:bg-surface-100 transition-colors"
              >
                {/* Professional Profile Picture - Man in Suit and Tie */}
                <img 
                  src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face" 
                  alt="James Wilson"
                  className="h-12 w-12 rounded-full object-cover shadow-md ring-2 ring-white"
                />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-semibold text-surface-900">James Wilson</span>
                  <span className="text-xs text-surface-500">Procurement Manager</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-surface-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-surface-200 py-2 z-50">
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-surface-700 hover:bg-surface-50 transition-colors">
                    <User className="h-4 w-4 text-surface-400" />
                    My Profile
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-surface-700 hover:bg-surface-50 transition-colors">
                    <Settings className="h-4 w-4 text-surface-400" />
                    Settings
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-surface-700 hover:bg-surface-50 transition-colors">
                    <HelpCircle className="h-4 w-4 text-surface-400" />
                    Help
                  </button>
                  <div className="border-t border-surface-200 my-2" />
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
