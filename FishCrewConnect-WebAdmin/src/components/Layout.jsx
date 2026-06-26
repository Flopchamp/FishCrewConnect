import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Fish,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const SidebarContent = ({ onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isCurrentRoute = (href) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0d1f3c 100%)' }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded-lg" style={{ background: 'rgba(68,219,233,0.15)' }}>
            <Fish className="h-6 w-6" style={{ color: '#44DBE9' }} />
          </div>
          <div>
            <span className="text-white font-bold text-base tracking-tight">FishCrew</span>
            <span className="block text-xs font-medium" style={{ color: '#44DBE9' }}>Admin Panel</span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav label */}
      <div className="px-6 pt-6 pb-2">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Main Menu
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 pb-4 space-y-0.5">
        {navigation.map((item) => {
          const Icon = item.icon;
          const current = isCurrentRoute(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onClose}
              className="flex items-center gap-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
              style={
                current
                  ? { background: 'rgba(68,219,233,0.12)', color: '#44DBE9', borderLeft: '3px solid #44DBE9', paddingLeft: '9px' }
                  : { color: 'rgba(255,255,255,0.6)', borderLeft: '3px solid transparent', paddingLeft: '9px' }
              }
              onMouseEnter={e => {
                if (!current) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                }
              }}
              onMouseLeave={e => {
                if (!current) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                }
              }}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User info at bottom */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-x-3 px-2 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0077B6, #44DBE9)' }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.name || 'Admin'}</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Administrator</div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/users')) return 'User Management';
    if (path.startsWith('/jobs')) return 'Job Management';
    if (path.startsWith('/payments')) return 'Payment Management';
    if (path.startsWith('/analytics')) return 'Analytics';
    if (path.startsWith('/settings')) return 'Settings';
    return 'FishCrew Admin';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ background: 'rgba(0,0,0,0.5)' }}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 lg:hidden transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col shadow-xl">
        <SidebarContent />
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 bg-white px-4 sm:px-6 lg:px-8"
          style={{ borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {/* User info in sidebar footer — nothing needed here on desktop */}
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
