import { useState } from 'react';
import { Bell, Search, ChevronDown, User, LogOut, Settings } from 'lucide-react';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Mock user data
  const user = {
    name: 'John Smith',
    email: 'john.smith@company.com',
    role: 'AP Manager',
    avatar: null,
  };

  // Mock notifications
  const notifications = [
    { id: 1, message: 'REQ-000042 requires your approval', time: '5 min ago', unread: true },
    { id: 2, message: 'Invoice INV-000123 has been matched', time: '1 hour ago', unread: true },
    { id: 3, message: 'PO-000089 has been received', time: '3 hours ago', unread: false },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="header">
      {/* Left side - Title & Search */}
      <div className="flex items-center gap-6">
        {title && <h2 className="text-xl font-semibold text-surface-900">{title}</h2>}
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={18} />
          <input
            type="text"
            placeholder="Search requisitions, POs, invoices..."
            className="input pl-10 w-80"
          />
        </div>
      </div>

      {/* Right side - Notifications & User */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="btn-icon btn-ghost relative"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="dropdown right-0 w-80">
                <div className="px-4 py-3 border-b border-surface-200">
                  <h3 className="font-semibold text-surface-900">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`dropdown-item ${notification.unread ? 'bg-primary-50' : ''}`}
                    >
                      <div className="flex-1">
                        <p className="text-sm text-surface-900">{notification.message}</p>
                        <p className="text-xs text-surface-500 mt-1">{notification.time}</p>
                      </div>
                      {notification.unread && (
                        <div className="w-2 h-2 bg-primary-500 rounded-full" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-surface-200">
                  <button className="text-sm text-primary-500 hover:text-primary-600">
                    View all notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 hover:bg-surface-50 rounded-lg px-3 py-2 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
              <User size={18} />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-surface-900">{user.name}</p>
              <p className="text-xs text-surface-500">{user.role}</p>
            </div>
            <ChevronDown size={16} className="text-surface-400" />
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="dropdown right-0">
                <div className="px-4 py-3 border-b border-surface-200">
                  <p className="font-semibold text-surface-900">{user.name}</p>
                  <p className="text-sm text-surface-500">{user.email}</p>
                </div>
                <div className="py-1">
                  <button className="dropdown-item w-full">
                    <User size={16} />
                    <span>Profile</span>
                  </button>
                  <button className="dropdown-item w-full">
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                </div>
                <div className="border-t border-surface-200 py-1">
                  <button className="dropdown-item w-full text-danger-600 hover:bg-danger-50">
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
