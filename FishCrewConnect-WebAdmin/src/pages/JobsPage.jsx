import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Search,
  Filter,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Eye,
  CheckCircle,
  XCircle,
  Calendar,
  Play,
  UserCheck,
  Ban,
  AlertCircle,
} from 'lucide-react';

const JobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total: 0,
  });
  const [stats, setStats] = useState({});
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);

  // Job status options matching mobile app
  const jobStatuses = [
    { label: 'All Jobs', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Filled', value: 'filled' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' }
  ];

  useEffect(() => {
    loadJobs();
  }, [searchTerm, statusFilter, sortBy, pagination.current_page]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current_page,
        limit: 20,
        sort: sortBy,
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await adminAPI.getAllJobs(params);
      setJobs(response.jobs || []);
      setPagination(response.pagination || {});
      setStats(response.stats || {});
    } catch (error) {
      toast.error('Failed to load jobs');
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJobStatusUpdate = async (jobId, status, jobTitle) => {
    const statusText = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    
    // Modern toast confirmation
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[300px]">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900">Confirm Status Update</p>
            <p className="text-sm text-gray-600 mt-1">
              Are you sure you want to mark <span className="font-medium">"{jobTitle}"</span> as <span className="font-medium">{statusText}</span>?
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                toast.loading('Updating job status...', { id: 'status-update' });
                await adminAPI.updateJobStatus(jobId, status, `Status updated to ${status} by admin`);
                toast.success(`Job status updated to ${statusText} successfully`, { id: 'status-update' });
                loadJobs();
                setShowJobModal(false);
              } catch (error) {
                toast.error('Failed to update job status', { id: 'status-update' });
                console.error('Error updating job status:', error);
              }
            }}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: 'top-center',
      className: 'bg-white border border-gray-200 shadow-lg rounded-lg',
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
      open: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      in_progress: { color: 'bg-blue-100 text-blue-800', icon: Play },
      filled: { color: 'bg-yellow-100 text-yellow-800', icon: UserCheck },
      completed: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: Ban },
      pending: { color: 'bg-gray-100 text-gray-800', icon: Clock },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {status ? status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ') : 'Unknown'}
      </span>
    );
  };

  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return 'Date TBD';
    const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  };

  const JobDetailModal = () => {
    if (!selectedJob) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Job Details</h3>
            <button
              onClick={() => setShowJobModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          {/* Job Information */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h4 className="text-xl font-semibold text-gray-900">{selectedJob.job_title}</h4>
              {getStatusBadge(selectedJob.status)}
            </div>

            <p className="text-gray-600 mb-6">{selectedJob.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-500">Posted by</label>
                <p className="text-gray-900">{selectedJob.posted_by || selectedJob.owner_name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Location</label>
                <p className="text-gray-900">{selectedJob.location}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Payment</label>
                <p className="text-gray-900">
                  {selectedJob.payment_details || formatCurrency(selectedJob.payment_amount)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Duration</label>
                <p className="text-gray-900">{selectedJob.job_duration || 'Not specified'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Application Deadline</label>
                <p className="text-gray-900">
                  {selectedJob.application_deadline ? formatDate(selectedJob.application_deadline) : 'Not specified'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Applications</label>
                <p className="text-gray-900">{selectedJob.application_count || selectedJob.applications_count || 0}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-500">Posted Date</label>
                <p className="text-gray-900">{formatDate(selectedJob.created_at)}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <h5 className="font-medium text-gray-900 mb-3">Update Job Status</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <button
                  onClick={() => handleJobStatusUpdate(selectedJob.job_id, 'open', selectedJob.job_title)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark Open
                </button>
                
                <button
                  onClick={() => handleJobStatusUpdate(selectedJob.job_id, 'in_progress', selectedJob.job_title)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Play className="h-4 w-4" />
                  In Progress
                </button>
                
                <button
                  onClick={() => handleJobStatusUpdate(selectedJob.job_id, 'filled', selectedJob.job_title)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                >
                  <UserCheck className="h-4 w-4" />
                  Mark Filled
                </button>
                
                <button
                  onClick={() => handleJobStatusUpdate(selectedJob.job_id, 'completed', selectedJob.job_title)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  Complete
                </button>
                
                <button
                  onClick={() => handleJobStatusUpdate(selectedJob.job_id, 'cancelled', selectedJob.job_title)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  <Ban className="h-4 w-4" />
                  Cancel Job
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Job Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor and manage all job postings on the platform
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-semibold text-gray-900">{stats.total || 0}</div>
          <div className="text-sm text-gray-500">Total Jobs</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-semibold text-green-600">{stats.open || 0}</div>
          <div className="text-sm text-gray-500">Open</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-semibold text-blue-600">{stats.in_progress || 0}</div>
          <div className="text-sm text-gray-500">In Progress</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-semibold text-yellow-600">{stats.filled || 0}</div>
          <div className="text-sm text-gray-500">Filled</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-semibold text-purple-600">{stats.completed || 0}</div>
          <div className="text-sm text-gray-500">Completed</div>
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
                placeholder="Search jobs by title, description, or poster..."
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
            {jobStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="created_at">Newest First</option>
            <option value="payment_amount">Highest Pay</option>
            <option value="start_date">Start Date</option>
            <option value="applications_count">Most Applications</option>
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white shadow-sm rounded-lg border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading jobs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posted By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applications
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.job_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {job.job_title}
                        </div>
                        <div className="text-sm text-gray-500 mb-2 line-clamp-2">
                          {job.description}
                        </div>
                        <div className="flex items-center text-xs text-gray-500 gap-4">
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {job.location}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(job.created_at)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {job.posted_by || job.owner_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {job.owner_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {job.payment_details || formatCurrency(job.payment_amount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {job.payment_frequency}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(job.status || job.job_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Users className="h-4 w-4 mr-1" />
                        {job.application_count || job.applications_count || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedJob(job);
                            setShowJobModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
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
              {pagination.total} jobs
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

      {/* Job Detail Modal */}
      {showJobModal && <JobDetailModal />}
    </div>
  );
};

export default JobsPage;
