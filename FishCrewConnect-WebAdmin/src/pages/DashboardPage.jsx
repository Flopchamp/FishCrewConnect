import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Users,
  Briefcase,
  CreditCard,
  MessageCircle,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Clock,
  FileText,
  Anchor,
} from 'lucide-react';

const formatCurrency = (amount) => {
  if (amount >= 1000000) return `KSH ${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `KSH ${(amount / 1000).toFixed(1)}K`;
  return `KSH ${parseInt(amount).toLocaleString()}`;
};

const StatCard = ({ title, value, icon: Icon, accent, change, subtitle }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-3"
    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
    <div className="flex items-start justify-between">
      <div
        className="p-2.5 rounded-xl"
        style={{ background: accent.bg }}
      >
        <Icon className="h-5 w-5" style={{ color: accent.icon }} />
      </div>
      {change !== undefined && (
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={change >= 0
            ? { background: '#dcfce7', color: '#16a34a' }
            : { background: '#fee2e2', color: '#dc2626' }}
        >
          {change >= 0 ? '+' : ''}{change}%
        </span>
      )}
    </div>
    <div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{title}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
    </div>
  </div>
);

const SectionLabel = ({ children }) => (
  <div className="flex items-center gap-3 mb-4">
    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{children}</span>
    <div className="flex-1 h-px bg-gray-100" />
  </div>
);

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboardStats(); }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getDashboardStats();
      setStats(data);
    } catch (error) {
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 mb-1" />
        <div className="h-4 bg-gray-200 rounded w-72" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 h-28 border border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 mb-4">Failed to load dashboard data</p>
        <button onClick={loadDashboardStats}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ background: '#0077B6' }}>
          Retry
        </button>
      </div>
    );
  }

  const userTypes = stats.distributions?.userTypes || [];
  const fishermen = userTypes.find(u => u.user_type === 'fisherman')?.count || 0;
  const boatOwners = userTypes.find(u => u.user_type === 'boat_owner')?.count || 0;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's what's happening on your platform today.
        </p>
      </div>

      {/* Platform stats */}
      <div>
        <SectionLabel>Platform Activity</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={stats.totals?.users?.toLocaleString() || '0'}
            icon={Users} accent={{ bg: '#eff6ff', icon: '#2563eb' }} change={12} />
          <StatCard title="Total Jobs" value={stats.totals?.jobs?.toLocaleString() || '0'}
            icon={Briefcase} accent={{ bg: '#f0fdf4', icon: '#16a34a' }} change={8} />
          <StatCard title="Applications" value={stats.totals?.applications?.toLocaleString() || '0'}
            icon={FileText} accent={{ bg: '#faf5ff', icon: '#9333ea' }} change={15} />
          <StatCard title="Active Conversations" value={stats.active?.conversations?.toLocaleString() || '0'}
            icon={MessageCircle} accent={{ bg: '#fff7ed', icon: '#ea580c' }} />
        </div>
      </div>

      {/* Payment stats */}
      <div>
        <SectionLabel>Payments & Revenue</SectionLabel>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Payments" value={stats.payments?.total_payments?.toLocaleString() || '0'}
            icon={CreditCard} accent={{ bg: '#eef2ff', icon: '#4f46e5' }} />
          <StatCard title="Completed" value={stats.payments?.completed_payments?.toLocaleString() || '0'}
            icon={CheckCircle} accent={{ bg: '#f0fdf4', icon: '#16a34a' }} />
          <StatCard title="Pending" value={stats.payments?.pending_payments?.toLocaleString() || '0'}
            icon={Clock} accent={{ bg: '#fefce8', icon: '#ca8a04' }} />
          <StatCard title="Platform Revenue" value={formatCurrency(stats.payments?.total_payment_volume || 0)}
            icon={DollarSign} accent={{ bg: '#f0fdf4', icon: '#16a34a' }} subtitle="Total volume" />
        </div>
      </div>

      {/* Commission + Users breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Commission cards */}
        <StatCard title="Total Commission" value={formatCurrency(stats.payments?.total_platform_commission || 0)}
          icon={TrendingUp} accent={{ bg: '#fdf4ff', icon: '#a21caf' }} />
        <StatCard title="Average Transaction" value={formatCurrency(stats.payments?.average_payment_amount || 0)}
          icon={DollarSign} accent={{ bg: '#eff6ff', icon: '#2563eb' }} />

        {/* User breakdown card */}
        <div className="bg-white rounded-xl border border-gray-100 p-5"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">User Breakdown</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: '#2563eb' }} />
                <span className="text-sm text-gray-600">Fishermen</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{fishermen}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: '#0077B6' }} />
                <span className="text-sm text-gray-600">Boat Owners</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{boatOwners}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: '#44DBE9' }} />
                <span className="text-sm text-gray-600">Total</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{stats.totals?.users || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
