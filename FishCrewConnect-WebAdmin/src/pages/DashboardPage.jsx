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
} from 'lucide-react';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getDashboardStats();
      setStats(data);
    } catch (error) {
      toast.error('Failed to load dashboard statistics');
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `KSH ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `KSH ${(amount / 1000).toFixed(1)}K`;
    } else {
      return `KSH ${parseInt(amount).toLocaleString()}`;
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, change }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
        {change && (
          <div className="mt-3">
            <div className="flex items-center text-sm">
              <span className={`font-medium ${change.positive ? 'text-green-600' : 'text-red-600'}`}>
                {change.positive ? '+' : ''}{change.value}%
              </span>
              <span className="text-gray-500 ml-1">from last month</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-8">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow">
              <div className="h-12 bg-gray-300 rounded mb-4"></div>
              <div className="h-6 bg-gray-300 rounded mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load dashboard data</p>
        <button
          onClick={loadDashboardStats}
          className="mt-4 btn btn-primary btn-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Here's what's happening on your platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats.totals?.users?.toLocaleString() || '0'}
          icon={Users}
          color="text-blue-600"
          change={{ value: 12, positive: true }}
        />
        <StatCard
          title="Total Jobs"
          value={stats.totals?.jobs?.toLocaleString() || '0'}
          icon={Briefcase}
          color="text-green-600"
          change={{ value: 8, positive: true }}
        />
        <StatCard
          title="Applications"
          value={stats.totals?.applications?.toLocaleString() || '0'}
          icon={MessageCircle}
          color="text-purple-600"
          change={{ value: 15, positive: true }}
        />
        <StatCard
          title="Active Conversations"
          value={stats.active?.conversations?.toLocaleString() || '0'}
          icon={MessageCircle}
          color="text-orange-600"
        />
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Payments"
          value={stats.payments?.total_payments?.toLocaleString() || '0'}
          icon={CreditCard}
          color="text-indigo-600"
        />
        <StatCard
          title="Completed Payments"
          value={stats.payments?.completed_payments?.toLocaleString() || '0'}
          icon={CheckCircle}
          color="text-green-600"
        />
        <StatCard
          title="Pending Payments"
          value={stats.payments?.pending_payments?.toLocaleString() || '0'}
          icon={Clock}
          color="text-yellow-600"
        />
        <StatCard
          title="Platform Revenue"
          value={formatCurrency(stats.payments?.total_payment_volume || 0)}
          icon={DollarSign}
          color="text-green-600"
        />
      </div>

      {/* Commission Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatCard
          title="Total Commission"
          value={formatCurrency(stats.payments?.total_platform_commission || 0)}
          icon={TrendingUp}
          color="text-purple-600"
        />
        <StatCard
          title="Average Transaction"
          value={formatCurrency(stats.payments?.average_payment_amount || 0)}
          icon={DollarSign}
          color="text-blue-600"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Platform Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.distributions?.userTypes?.map((userType, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-semibold text-gray-900">
                  {userType.count}
                </div>
                <div className="text-sm text-gray-500 capitalize">
                  {userType.user_type?.replace('_', ' ')}s
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
