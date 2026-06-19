import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Search,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  Eye,
  X,
  Clock,
  Mail,
  Phone,
  Building2,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total: 0,
  });
  const [counts, setCounts] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [searchTerm, statusFilter, userTypeFilter, pagination.current_page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current_page,
        limit: 20,
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (userTypeFilter !== 'all') params.user_type = userTypeFilter;

      const data = await adminAPI.getAllUsers(params);
      setUsers(data.users || []);
      setPagination(data.pagination || {});
      setCounts(data.counts || {});
    } catch (error) {
      toast.error('Failed to load users');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUser = async (userId) => {
    try {
      await adminAPI.verifyUser(userId, 'Verified by admin');
      toast.success('User verified successfully');
      loadUsers();
    } catch (error) {
      toast.error('Failed to verify user');
      console.error('Error verifying user:', error);
    }
  };

  const handleSuspendUser = async (userId, reason = 'Suspended by admin') => {
    try {
      await adminAPI.suspendUser(userId, reason);
      toast.success('User suspended successfully');
      loadUsers();
    } catch (error) {
      toast.error('Failed to suspend user');
      console.error('Error suspending user:', error);
    }
  };

  const handleUnsuspendUser = async (userId, reason = 'Unsuspended by admin') => {
    try {
      await adminAPI.unsuspendUser(userId, reason);
      toast.success('User unsuspended successfully');
      loadUsers();
    } catch (error) {
      toast.error('Failed to unsuspend user');
      console.error('Error unsuspending user:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status, verification_status) => {
    if (verification_status === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </span>
      );
    }

    if (verification_status === 'verified') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <XCircle className="h-3 w-3 mr-1" />
        {status || 'Unknown'}
      </span>
    );
  };

  const getUserTypeColor = (userType) => {
    switch (userType) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'boat_owner':
        return 'bg-blue-100 text-blue-800';
      case 'fisherman':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage all users on the FishCrewConnect platform
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-semibold text-gray-900">{counts.all || 0}</div>
          <div className="text-sm text-gray-500">Total Users</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-semibold text-green-600">{counts.verified || 0}</div>
          <div className="text-sm text-gray-500">Verified</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-semibold text-yellow-600">{counts.pending || 0}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-semibold text-blue-600">{counts.boat_owner || 0}</div>
          <div className="text-sm text-gray-500">Boat Owners</div>
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
                placeholder="Search users..."
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
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
          </select>
          <select
            className="input"
            value={userTypeFilter}
            onChange={(e) => setUserTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="admin">Admins</option>
            <option value="boat_owner">Boat Owners</option>
            <option value="fisherman">Fishermen</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow-sm rounded-lg border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUserTypeColor(user.user_type)}`}>
                        {user.user_type === 'boat_owner' ? 'Boat Owner' : 
                         user.user_type === 'fisherman' ? 'Fisherman' : 
                         user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.status, user.verification_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.contact_number || 'Not provided'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {user.verification_status === 'pending' && (
                          <button
                            onClick={() => handleVerifyUser(user.user_id)}
                            className="text-green-600 hover:text-green-900"
                            title="Verify User"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                        {user.status !== 'suspended' && user.user_type !== 'admin' && (
                          <button
                            onClick={() => handleSuspendUser(user.user_id)}
                            className="text-red-600 hover:text-red-900"
                            title="Suspend User"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        )}
                        {user.status === 'suspended' && (
                          <button
                            onClick={() => handleUnsuspendUser(user.user_id)}
                            className="text-green-600 hover:text-green-900"
                            title="Unsuspend User"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-gray-400 hover:text-gray-600"
                          title="View Details"
                        >
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
              {pagination.total} users
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

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">User Details</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Avatar + name */}
            <div className="flex items-center gap-4 px-6 py-5 bg-gray-50 border-b">
              <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center text-xl font-bold text-primary-700">
                {selectedUser.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-base font-semibold text-gray-900">{selectedUser.name}</div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getUserTypeColor(selectedUser.user_type)}`}>
                  {selectedUser.user_type === 'boat_owner' ? 'Boat Owner' :
                   selectedUser.user_type === 'fisherman' ? 'Fisherman' :
                   selectedUser.user_type.charAt(0).toUpperCase() + selectedUser.user_type.slice(1)}
                </span>
              </div>
            </div>

            {/* Detail rows */}
            <div className="divide-y px-6">
              <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={selectedUser.email} />
              <DetailRow icon={<Phone className="h-4 w-4" />} label="Contact" value={selectedUser.contact_number || 'Not provided'} />
              {selectedUser.organization_name && (
                <DetailRow icon={<Building2 className="h-4 w-4" />} label="Organisation" value={selectedUser.organization_name} />
              )}
              <DetailRow
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Verification"
                value={
                  <span className="inline-flex items-center gap-1">
                    {getStatusBadge(selectedUser.status, selectedUser.verification_status)}
                  </span>
                }
              />
              <DetailRow
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Account status"
                value={
                  selectedUser.status === 'suspended' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Suspended</span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                  )
                }
              />
              <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="Joined" value={formatDate(selectedUser.created_at)} />
              {selectedUser.verified_at && (
                <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="Verified on" value={formatDate(selectedUser.verified_at)} />
              )}
              {selectedUser.verified_by_name && (
                <DetailRow icon={<ShieldCheck className="h-4 w-4" />} label="Verified by" value={selectedUser.verified_by_name} />
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              {selectedUser.verification_status === 'pending' && (
                <button
                  onClick={() => { handleVerifyUser(selectedUser.user_id); setSelectedUser(null); }}
                  className="btn btn-primary btn-sm"
                >
                  Verify User
                </button>
              )}
              {selectedUser.status !== 'suspended' && selectedUser.user_type !== 'admin' && (
                <button
                  onClick={() => { handleSuspendUser(selectedUser.user_id); setSelectedUser(null); }}
                  className="btn btn-sm bg-red-600 text-white hover:bg-red-700"
                >
                  Suspend
                </button>
              )}
              {selectedUser.status === 'suspended' && (
                <button
                  onClick={() => { handleUnsuspendUser(selectedUser.user_id); setSelectedUser(null); }}
                  className="btn btn-sm bg-green-600 text-white hover:bg-green-700"
                >
                  Unsuspend
                </button>
              )}
              <button onClick={() => setSelectedUser(null)} className="btn btn-outline btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-3">
    <span className="text-gray-400 mt-0.5">{icon}</span>
    <span className="w-32 text-sm text-gray-500 shrink-0">{label}</span>
    <span className="text-sm text-gray-900">{value}</span>
  </div>
);

export default UsersPage;
