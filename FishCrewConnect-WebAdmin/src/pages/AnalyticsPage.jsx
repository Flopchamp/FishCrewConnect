import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  DollarSign,
  Calendar,
  Download,
  Activity,
  CreditCard,
  MapPin,
  Clock,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30days');
  const [analytics, setAnalytics] = useState({});
  const [dashboardStats, setDashboardStats] = useState({});
  const [paymentAnalytics, setPaymentAnalytics] = useState({});
  const [commissionAnalytics, setCommissionAnalytics] = useState({});

  useEffect(() => {
    loadAllAnalytics();
  }, [timeRange]);

  const loadAllAnalytics = async () => {
    try {
      setLoading(true);
      
      // Load multiple analytics endpoints in parallel
      const [analyticsData, dashboardData, paymentData, commissionData] = await Promise.all([
        adminAPI.getAnalytics({ period: timeRange }),
        adminAPI.getDashboardStats(),
        adminAPI.getPaymentAnalytics({ months: timeRange === '30days' ? 1 : timeRange === '90days' ? 3 : 12 }),
        adminAPI.getCommissionAnalytics({ months: timeRange === '30days' ? 1 : timeRange === '90days' ? 3 : 12 })
      ]);

      setAnalytics(analyticsData);
      setDashboardStats(dashboardData);
      setPaymentAnalytics(paymentData);
      setCommissionAnalytics(commissionData);
      
    } catch (error) {
      toast.error('Failed to load analytics');
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `KES ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `KES ${(amount / 1000).toFixed(1)}K`;
    } else {
      return `KES ${parseInt(amount || 0).toLocaleString()}`;
    }
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const calculateGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  const formatLabel = (name) => {
    const labels = {
      boat_owner: 'Boat Owner', fisherman: 'Fisherman', admin: 'Admin',
      open: 'Open', in_progress: 'In Progress', closed: 'Closed',
      completed: 'Completed', filled: 'Filled', cancelled: 'Cancelled',
    };
    return labels[name] || name;
  };

  const StatCard = ({ title, value, change, changeType, icon: Icon, bg, iconColor, description }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-5"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl" style={{ background: bg }}>
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
        {change !== undefined && change !== null && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={changeType === 'positive'
              ? { background: '#dcfce7', color: '#16a34a' }
              : { background: '#fee2e2', color: '#dc2626' }}>
            {changeType === 'positive' ? '+' : ''}{change?.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
      <div className="text-sm text-gray-500">{title}</div>
      {description && <div className="text-xs text-gray-400 mt-0.5">{description}</div>}
    </div>
  );

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive insights into platform performance and user behavior
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <select
            className="input"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="year">Last Year</option>
          </select>
          <button className="btn btn-outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Revenue"
          value={formatCurrency(dashboardStats.payments?.total_payment_volume || 0)}
          change={paymentAnalytics.growth?.revenue}
          changeType={paymentAnalytics.growth?.revenue >= 0 ? 'positive' : 'negative'}
          icon={DollarSign} bg="#f0fdf4" iconColor="#16a34a" description="All completed payments" />
        <StatCard title="Active Users"
          value={dashboardStats.totals?.users || 0}
          change={analytics.users?.growth}
          changeType={analytics.users?.growth >= 0 ? 'positive' : 'negative'}
          icon={Users} bg="#eff6ff" iconColor="#2563eb" description="Registered platform users" />
        <StatCard title="Job Postings"
          value={dashboardStats.totals?.jobs || 0}
          change={analytics.jobs?.growth}
          changeType={analytics.jobs?.growth >= 0 ? 'positive' : 'negative'}
          icon={Briefcase} bg="#faf5ff" iconColor="#9333ea" description="Total jobs posted" />
        <StatCard title="Platform Commission"
          value={formatCurrency(dashboardStats.payments?.total_platform_commission || 0)}
          change={commissionAnalytics.growth?.commission}
          changeType={commissionAnalytics.growth?.commission >= 0 ? 'positive' : 'negative'}
          icon={TrendingUp} bg="#fefce8" iconColor="#ca8a04" description="Total commission earned" />
      </div>

      {/* Payment Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Statistics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <CreditCard className="h-4 w-4 mr-2" />
                Total Payments
              </span>
              <span className="font-semibold text-gray-900">
                {dashboardStats.payments?.total_payments || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <UserCheck className="h-4 w-4 mr-2" />
                Completed
              </span>
              <span className="font-semibold text-green-600">
                {dashboardStats.payments?.completed_payments || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Pending
              </span>
              <span className="font-semibold text-yellow-600">
                {dashboardStats.payments?.pending_payments || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Failed
              </span>
              <span className="font-semibold text-red-600">
                {dashboardStats.payments?.failed_payments || 0}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-gray-600">Average Payment</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(dashboardStats.payments?.average_payment_amount || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 className="text-base font-semibold text-gray-900 mb-4">User Type Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={dashboardStats.distributions?.userTypes?.map(item => ({
                  name: formatLabel(item.user_type),
                  value: item.count
                })) || []}
                cx="50%"
                cy="50%"
                outerRadius={65}
                dataKey="value"
              >
                {(dashboardStats.distributions?.userTypes || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
              <Legend formatter={(value) => value} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Job Status Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={dashboardStats.distributions?.jobStatuses?.map(item => ({
                  name: formatLabel(item.status),
                  value: item.count
                })) || []}
                cx="50%"
                cy="50%"
                outerRadius={65}
                dataKey="value"
              >
                {(dashboardStats.distributions?.jobStatuses || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
              <Legend formatter={(value) => value} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 1 - Revenue and User Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={paymentAnalytics.monthly || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [
                  name === 'revenue' ? formatCurrency(value) : formatCurrency(value),
                  name === 'revenue' ? 'Revenue' : 'Commission'
                ]}
                labelStyle={{ color: '#374151' }}
              />
              <Bar dataKey="revenue" fill="#10B981" name="revenue" />
              <Line type="monotone" dataKey="commission" stroke="#3B82F6" strokeWidth={2} name="commission" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* User Growth */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.users?.userGrowth || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                labelStyle={{ color: '#374151' }}
              />
              <Area 
                type="monotone" 
                dataKey="registrations" 
                stackId="1"
                stroke="#3B82F6" 
                fill="#3B82F6" 
                name="New Registrations"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 - Job Trends and Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Job Trends */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Posting Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.jobs?.jobTrends || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                labelStyle={{ color: '#374151' }}
              />
              <Bar dataKey="jobs_posted" fill="#8B5CF6" name="Jobs Posted" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Application Trends */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.performance?.applicationTrends || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                labelStyle={{ color: '#374151' }}
              />
              <Line 
                type="monotone" 
                dataKey="applications" 
                stroke="#F59E0B" 
                strokeWidth={2}
                dot={{ fill: '#F59E0B' }}
                name="Applications"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Section - Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Locations */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Job Locations</h3>
          <div className="space-y-3">
            {(analytics.jobs?.jobsByLocation || []).slice(0, 8).map((location, index) => (
              <div key={location.location} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                    {index + 1}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium text-gray-900">{location.location}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{location.job_count}</p>
                  <p className="text-sm text-gray-500">jobs</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Activity Summary */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Activity</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <Briefcase className="h-4 w-4 mr-2" />
                Jobs posted today
              </span>
              <span className="font-semibold text-gray-900">
                {dashboardStats.recent?.jobs || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                New users today
              </span>
              <span className="font-semibold text-gray-900">
                {dashboardStats.recent?.users || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Applications today
              </span>
              <span className="font-semibold text-gray-900">
                {dashboardStats.recent?.applications || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Messages today
              </span>
              <span className="font-semibold text-gray-900">
                {dashboardStats.recent?.messages || 0}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-gray-600 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Active conversations
              </span>
              <span className="font-semibold text-blue-600">
                {dashboardStats.active?.conversations || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
