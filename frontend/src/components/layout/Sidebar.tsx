import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Package,
  Receipt,
  CheckSquare,
  Users,
  TruckIcon,
  CreditCard,
  Shield,
  Settings,
  HelpCircle,
  Bot,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
  { label: 'Requisitions', path: '/requisitions', icon: <FileText size={20} /> },
  { label: 'Purchase Orders', path: '/purchase-orders', icon: <ShoppingCart size={20} /> },
  { label: 'Goods Receipt', path: '/goods-receipts', icon: <TruckIcon size={20} /> },
  { label: 'Invoices', path: '/invoices', icon: <Receipt size={20} /> },
  { label: 'Approvals', path: '/approvals', icon: <CheckSquare size={20} /> },
];

const secondaryNavItems: NavItem[] = [
  { label: 'Suppliers', path: '/suppliers', icon: <Users size={20} /> },
  { label: 'Payments', path: '/payments', icon: <CreditCard size={20} /> },
  { label: 'Compliance', path: '/compliance', icon: <Shield size={20} /> },
];

const testingNavItems: NavItem[] = [
  { label: 'Agent Testing', path: '/testing-sandbox', icon: <Bot size={20} /> },
];

const bottomNavItems: NavItem[] = [
  { label: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  { label: 'Help', path: '/help', icon: <HelpCircle size={20} /> },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
          <Package className="text-white" size={24} />
        </div>
        <div>
          <h1 className="font-bold text-lg text-surface-900">P2P Platform</h1>
          <p className="text-xs text-surface-500">Procure to Pay</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav scrollbar-thin">
        <div className="space-y-1">
          <p className="px-4 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider">
            Main
          </p>
          {mainNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? 'nav-item-active' : 'nav-item'
              }
              end={item.path === '/'}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="ml-auto badge-primary">{item.badge}</span>
              )}
            </NavLink>
          ))}
        </div>

        <div className="mt-6 space-y-1">
          <p className="px-4 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider">
            Management
          </p>
          {secondaryNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? 'nav-item-active' : 'nav-item'
              }
            >
              {item.icon}

        <div className="mt-6 space-y-1">
          <p className="px-4 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider">
            Testing
          </p>
          {testingNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? 'nav-item-active' : 'nav-item'
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="sidebar-footer space-y-1">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? 'nav-item-active' : 'nav-item'
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
