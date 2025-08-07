import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total: 0,
  });
  const [stats, setStats] = useState({});
  const [dashboardData, setDashboardData] = useState({});

  useEffect(() => {
    loadPayments();
    loadPaymentDashboard();
  }, [searchTerm, statusFilter, typeFilter, dateRange, pagination.current_page]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current_page,
        limit: 20,
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (dateRange !== 'all') params.date_range = dateRange;

      const data = await adminAPI.getAllPayments(params);
      setPayments(data.payments || []);
      setPagination(data.pagination || {});
      setStats(data.stats || {});
    } catch (error) {
      toast.error('Failed to load payments');
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentDashboard = async () => {
    try {
      const data = await adminAPI.getPaymentDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading payment dashboard:', error);
    }
  };

  const handleRefundPayment = async (paymentId, amount, reason) => {
    try {
      await adminAPI.refundPayment(paymentId, { amount, reason });
      toast.success('Payment refunded successfully');
      loadPayments();
    } catch (error) {
      toast.error('Failed to refund payment');
      console.error('Error refunding payment:', error);
    }
  };

  const handleVerifyPayment = async (paymentId) => {
    try {
      await adminAPI.verifyPayment(paymentId);
      toast.success('Payment verified successfully');
      loadPayments();
    } catch (error) {
      toast.error('Failed to verify payment');
      console.error('Error verifying payment:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircle },
      refunded: { color: 'bg-purple-100 text-purple-800', icon: XCircle },
      processing: { color: 'bg-blue-100 text-blue-800', icon: Clock },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
      </span>
    );
  };

  const getPaymentTypeColor = (type) => {
    switch (type) {
      case 'job_payment':
        return 'bg-blue-100 text-blue-800';
      case 'commission':
        return 'bg-green-100 text-green-800';
      case 'refund':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Payment Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor and manage all payments and transactions
        </p>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-1">
              <div className="text-2xl font-semibold text-gray-900">
                {formatCurrency(dashboardData.total_revenue || 0)}
              </div>
              <div className="text-sm text-gray-500">Total Revenue</div>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-1">
              <div className="text-2xl font-semibold text-green-600">
                {formatCurrency(dashboardData.commission_earned || 0)}
              </div>
              <div className="text-sm text-gray-500">Commission Earned</div>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-1">
              <div className="text-2xl font-semibold text-blue-600">{stats.completed || 0}</div>
              <div className="text-sm text-gray-500">Completed Payments</div>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="flex-1">
              <div className="text-2xl font-semibold text-yellow-600">{stats.pending || 0}</div>
              <div className="text-sm text-gray-500">Pending Payments</div>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by transaction ID, user, or phone..."
                className="input pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="processing">Processing</option>
          </select>
          <select
            className="input"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="job_payment">Job Payment</option>
            <option value="commission">Commission</option>
            <option value="refund">Refund</option>
          </select>
          <select
            className="input"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
          <button className="btn btn-outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white shadow-sm rounded-lg border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading payments...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.payment_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payment.transaction_id || payment.checkout_request_id}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payment.phone_number}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payment.user_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payment.user_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </div>
                      {payment.commission_amount && (
                        <div className="text-sm text-gray-500">
                          Commission: {formatCurrency(payment.commission_amount)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentTypeColor(payment.payment_type)}`}>
                        {payment.payment_type === 'job_payment' ? 'Job Payment' :
                         payment.payment_type === 'commission' ? 'Commission' :
                         payment.payment_type.charAt(0).toUpperCase() + payment.payment_type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payment.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {payment.status === 'pending' && (
                          <button
                            onClick={() => handleVerifyPayment(payment.payment_id)}
                            className="text-green-600 hover:text-green-900"
                            title="Verify Payment"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {payment.status === 'completed' && payment.payment_type !== 'refund' && (
                          <button
                            onClick={() => handleRefundPayment(payment.payment_id, payment.amount, 'Admin refund')}
                            className="text-red-600 hover:text-red-900"
                            title="Refund Payment"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button className="text-gray-400 hover:text-gray-600" title="View Details">
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t">
            <div className="text-sm text-gray-500">
              Showing {((pagination.current_page - 1) * 20) + 1} to{' '}
              {Math.min(pagination.current_page * 20, pagination.total)} of{' '}
              {pagination.total} payments
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
                disabled={pagination.current_page === 1}
                className="btn btn-outline btn-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
                disabled={pagination.current_page === pagination.total_pages}
                className="btn btn-outline btn-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsPage;
