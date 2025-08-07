import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Settings as SettingsIcon,
  Save,
  RefreshCw,
  AlertCircle,
  Shield,
  DollarSign,
  Globe,
  Mail,
  Bell,
  Database,
  Key,
  Info,
  Activity,
  ToggleLeft,
  ToggleRight,
  Edit3,
  Check,
  X,
  Server,
  HardDrive,
  Users,
  Clock,
  FileText,
  Zap,
} from 'lucide-react';

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({});
  const [formData, setFormData] = useState({});
  const [systemInfo, setSystemInfo] = useState({});
  const [adminActions, setAdminActions] = useState([]);
  const [editingLimits, setEditingLimits] = useState(false);
  const [limitValues, setLimitValues] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      
      // Load settings and system information in parallel
      const [settingsData, dashboardData] = await Promise.all([
        adminAPI.getSystemSettings(),
        adminAPI.getDashboardStats()
      ]);

      setSettings(settingsData);
      setFormData(settingsData);
      setSystemInfo(dashboardData);
      
      // Set limit values for editing
      if (settingsData.limits) {
        setLimitValues({ ...settingsData.limits });
      }

      // Mock admin actions - you can replace with actual API call
      setAdminActions([
        { action: 'Updated payment settings', admin: 'Admin User', timestamp: new Date().toISOString() },
        { action: 'Enabled email notifications', admin: 'Admin User', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { action: 'Modified system limits', admin: 'Admin User', timestamp: new Date(Date.now() - 7200000).toISOString() },
      ]);

    } catch (error) {
      toast.error('Failed to load settings');
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await adminAPI.updateSystemSettings(formData);
      toast.success('Settings saved successfully');
      setSettings(formData);
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (category, key, value) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const handleFeatureToggle = async (feature, value) => {
    try {
      await adminAPI.updateSystemSettings('features', {
        ...formData.features,
        [feature]: value
      });
      
      setFormData(prev => ({
        ...prev,
        features: {
          ...prev.features,
          [feature]: value
        }
      }));
      
      toast.success(`${feature.replace(/_/g, ' ')} has been ${value ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update feature setting');
      console.error('Error updating feature:', error);
    }
  };

  const handleSaveLimits = async () => {
    try {
      setSaving(true);
      
      // Validate limit values
      const errors = [];
      Object.entries(limitValues).forEach(([key, value]) => {
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 1) {
          errors.push(`${key.replace(/_/g, ' ')} must be a positive number`);
        }
      });

      if (errors.length > 0) {
        toast.error(errors.join(', '));
        return;
      }

      await adminAPI.updateSystemSettings('limits', limitValues);
      
      setFormData(prev => ({
        ...prev,
        limits: { ...limitValues }
      }));
      
      setEditingLimits(false);
      toast.success('System limits updated successfully');
      
    } catch (error) {
      toast.error('Failed to update system limits');
      console.error('Error updating limits:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'features', label: 'Features', icon: ToggleRight },
    { id: 'limits', label: 'System Limits', icon: Shield },
    { id: 'payment', label: 'Payment', icon: DollarSign },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Key },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'system', label: 'System Info', icon: Info },
    { id: 'activity', label: 'Activity Log', icon: Activity },
  ];

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">System Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure platform settings and preferences
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <button
            onClick={loadSettings}
            disabled={refreshing}
            className="btn btn-outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-3" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-sm border">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">General Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Platform Name
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      value={formData.general?.platform_name || ''}
                      onChange={(e) => handleInputChange('general', 'platform_name', e.target.value)}
                      placeholder="FishCrewConnect"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Platform Description
                    </label>
                    <textarea
                      rows={3}
                      className="input w-full"
                      value={formData.general?.platform_description || ''}
                      onChange={(e) => handleInputChange('general', 'platform_description', e.target.value)}
                      placeholder="Connecting boat owners with skilled fishermen"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Support Email
                    </label>
                    <input
                      type="email"
                      className="input w-full"
                      value={formData.general?.support_email || ''}
                      onChange={(e) => handleInputChange('general', 'support_email', e.target.value)}
                      placeholder="support@fishcrewconnect.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      className="input w-full"
                      value={formData.general?.contact_phone || ''}
                      onChange={(e) => handleInputChange('general', 'contact_phone', e.target.value)}
                      placeholder="+254 700 000 000"
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.general?.maintenance_mode || false}
                        onChange={(e) => handleInputChange('general', 'maintenance_mode', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">Maintenance Mode</span>
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      Enable to temporarily disable access to the platform
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Feature Controls */}
            {activeTab === 'features' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Feature Controls</h3>
                <div className="space-y-4">
                  {Object.entries({
                    user_registration_enabled: 'User Registration',
                    job_posting_enabled: 'Job Posting',
                    messaging_enabled: 'User Messaging',
                    notifications_enabled: 'Notifications',
                    email_notifications_enabled: 'Email Notifications',
                    payment_processing_enabled: 'Payment Processing',
                    file_uploads_enabled: 'File Uploads',
                  }).map(([key, title]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{title}</h4>
                        <p className="text-sm text-gray-500">
                          {key === 'user_registration_enabled' && 'Allow new users to register on the platform'}
                          {key === 'job_posting_enabled' && 'Allow users to post new job listings'}
                          {key === 'messaging_enabled' && 'Enable messaging between users'}
                          {key === 'notifications_enabled' && 'Enable in-app notifications'}
                          {key === 'email_notifications_enabled' && 'Send email notifications to users'}
                          {key === 'payment_processing_enabled' && 'Enable payment processing functionality'}
                          {key === 'file_uploads_enabled' && 'Allow users to upload files and documents'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleFeatureToggle(key, !formData.features?.[key])}
                        className={`flex items-center ${
                          formData.features?.[key] ? 'text-green-600' : 'text-gray-400'
                        }`}
                      >
                        {formData.features?.[key] ? (
                          <ToggleRight className="h-6 w-6" />
                        ) : (
                          <ToggleLeft className="h-6 w-6" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Limits */}
            {activeTab === 'limits' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">System Limits</h3>
                  {!editingLimits ? (
                    <button
                      onClick={() => setEditingLimits(true)}
                      className="btn btn-outline btn-sm"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingLimits(false);
                          setLimitValues({ ...settings.limits });
                        }}
                        className="btn btn-outline btn-sm"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveLimits}
                        disabled={saving}
                        className="btn btn-primary btn-sm"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Save
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {Object.entries({
                    max_jobs_per_user: 'Max Jobs Per User',
                    max_applications_per_job: 'Max Applications Per Job',
                    max_file_size_mb: 'Max File Size (MB)',
                    max_messages_per_day: 'Max Messages Per Day',
                    max_login_attempts: 'Max Login Attempts',
                  }).map(([key, title]) => (
                    <div key={key} className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">{title}</h4>
                      <p className="text-sm text-gray-500 mb-3">
                        {key === 'max_jobs_per_user' && 'Maximum active jobs a user can post'}
                        {key === 'max_applications_per_job' && 'Maximum applications allowed per job'}
                        {key === 'max_file_size_mb' && 'Maximum file upload size in megabytes'}
                        {key === 'max_messages_per_day' && 'Maximum messages a user can send per day'}
                        {key === 'max_login_attempts' && 'Maximum failed login attempts before lockout'}
                      </p>
                      {editingLimits ? (
                        <input
                          type="number"
                          className="input w-32"
                          value={limitValues[key] || ''}
                          onChange={(e) => setLimitValues(prev => ({
                            ...prev,
                            [key]: e.target.value
                          }))}
                          placeholder="Enter value"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-green-600">
                          {formData.limits?.[key] || 'Not set'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                
                {editingLimits && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800">Warning</h4>
                        <p className="text-sm text-yellow-700">
                          Changes will affect all users immediately. Please review carefully.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment Settings */}
            {activeTab === 'payment' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commission Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="input w-full"
                      value={formData.payment?.commission_rate || ''}
                      onChange={(e) => handleInputChange('payment', 'commission_rate', parseFloat(e.target.value))}
                      placeholder="5.0"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Percentage commission charged on each payment
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Payment Amount (KES)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="input w-full"
                      value={formData.payment?.minimum_amount || ''}
                      onChange={(e) => handleInputChange('payment', 'minimum_amount', parseInt(e.target.value))}
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Payment Amount (KES)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="input w-full"
                      value={formData.payment?.maximum_amount || ''}
                      onChange={(e) => handleInputChange('payment', 'maximum_amount', parseInt(e.target.value))}
                      placeholder="1000000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      M-Pesa Consumer Key
                    </label>
                    <input
                      type="password"
                      className="input w-full"
                      value={formData.payment?.mpesa_consumer_key || ''}
                      onChange={(e) => handleInputChange('payment', 'mpesa_consumer_key', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      M-Pesa Consumer Secret
                    </label>
                    <input
                      type="password"
                      className="input w-full"
                      value={formData.payment?.mpesa_consumer_secret || ''}
                      onChange={(e) => handleInputChange('payment', 'mpesa_consumer_secret', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.payment?.auto_approve_payments || false}
                        onChange={(e) => handleInputChange('payment', 'auto_approve_payments', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">Auto-approve Payments</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Email Settings */}
            {activeTab === 'email' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Email Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      value={formData.email?.smtp_host || ''}
                      onChange={(e) => handleInputChange('email', 'smtp_host', e.target.value)}
                      placeholder="smtp.gmail.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      className="input w-full"
                      value={formData.email?.smtp_port || ''}
                      onChange={(e) => handleInputChange('email', 'smtp_port', parseInt(e.target.value))}
                      placeholder="587"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Username
                    </label>
                    <input
                      type="email"
                      className="input w-full"
                      value={formData.email?.smtp_username || ''}
                      onChange={(e) => handleInputChange('email', 'smtp_username', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Password
                    </label>
                    <input
                      type="password"
                      className="input w-full"
                      value={formData.email?.smtp_password || ''}
                      onChange={(e) => handleInputChange('email', 'smtp_password', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.email?.enable_notifications || false}
                        onChange={(e) => handleInputChange('email', 'enable_notifications', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">Enable Email Notifications</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.notifications?.new_user_signup || false}
                        onChange={(e) => handleInputChange('notifications', 'new_user_signup', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">New User Signup</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.notifications?.new_job_posted || false}
                        onChange={(e) => handleInputChange('notifications', 'new_job_posted', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">New Job Posted</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.notifications?.payment_received || false}
                        onChange={(e) => handleInputChange('notifications', 'payment_received', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">Payment Received</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.notifications?.system_alerts || false}
                        onChange={(e) => handleInputChange('notifications', 'system_alerts', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">System Alerts</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Email for Notifications
                    </label>
                    <input
                      type="email"
                      className="input w-full"
                      value={formData.notifications?.admin_email || ''}
                      onChange={(e) => handleInputChange('notifications', 'admin_email', e.target.value)}
                      placeholder="admin@fishcrewconnect.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      JWT Secret Key
                    </label>
                    <input
                      type="password"
                      className="input w-full"
                      value={formData.security?.jwt_secret || ''}
                      onChange={(e) => handleInputChange('security', 'jwt_secret', e.target.value)}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Strong secret key for JWT token generation
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token Expiration (hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      className="input w-full"
                      value={formData.security?.token_expiration || ''}
                      onChange={(e) => handleInputChange('security', 'token_expiration', parseInt(e.target.value))}
                      placeholder="24"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Login Attempts
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="input w-full"
                      value={formData.security?.max_login_attempts || ''}
                      onChange={(e) => handleInputChange('security', 'max_login_attempts', parseInt(e.target.value))}
                      placeholder="5"
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.security?.require_email_verification || false}
                        onChange={(e) => handleInputChange('security', 'require_email_verification', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">Require Email Verification</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.security?.enable_two_factor || false}
                        onChange={(e) => handleInputChange('security', 'enable_two_factor', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">Enable Two-Factor Authentication</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Database Statistics */}
            {activeTab === 'database' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Database Statistics</h3>
                  <button
                    onClick={loadSettings}
                    disabled={refreshing}
                    className="btn btn-outline btn-sm"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {/* Overall Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="flex items-center">
                      <Users className="h-8 w-8 text-blue-600 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Total Users</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {systemInfo.totals?.users || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-green-600 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Total Jobs</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {systemInfo.totals?.jobs || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="flex items-center">
                      <Activity className="h-8 w-8 text-purple-600 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Total Messages</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {systemInfo.totals?.messages || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-8 w-8 text-yellow-600 mr-3" />
                      <div>
                        <p className="text-sm text-gray-500">Total Payments</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {systemInfo.payments?.total_payments || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Database Health */}
                <div className="bg-white border rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Database Health</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Connection Status</p>
                        <p className="text-sm text-gray-500">Active</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        (systemInfo.totals?.users || 0) > 1000 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Record Count</p>
                        <p className="text-sm text-gray-500">
                          {(systemInfo.totals?.users || 0) > 1000 ? 'High' : 'Normal'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Performance</p>
                        <p className="text-sm text-gray-500">Optimal</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Information */}
            {activeTab === 'system' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">System Information</h3>
                
                {/* Platform Information */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Platform Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Platform Name:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {settings.general?.platform_name || 'FishCrewConnect'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Version:</span>
                      <span className="text-sm font-medium text-gray-900">v1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Environment:</span>
                      <span className="text-sm font-medium text-green-600">PRODUCTION</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Last Updated:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* System Settings */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Database Backup Frequency
                    </label>
                    <select
                      className="input w-full"
                      value={formData.system?.backup_frequency || ''}
                      onChange={(e) => handleInputChange('system', 'backup_frequency', e.target.value)}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Log Level
                    </label>
                    <select
                      className="input w-full"
                      value={formData.system?.log_level || ''}
                      onChange={(e) => handleInputChange('system', 'log_level', e.target.value)}
                    >
                      <option value="error">Error</option>
                      <option value="warn">Warning</option>
                      <option value="info">Info</option>
                      <option value="debug">Debug</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      className="input w-full"
                      value={formData.system?.session_timeout || ''}
                      onChange={(e) => handleInputChange('system', 'session_timeout', parseInt(e.target.value))}
                      placeholder="30"
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.system?.enable_analytics || false}
                        onChange={(e) => handleInputChange('system', 'enable_analytics', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">Enable Analytics Tracking</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.system?.auto_cleanup_logs || false}
                        onChange={(e) => handleInputChange('system', 'auto_cleanup_logs', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">Auto Cleanup Old Logs</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Log */}
            {activeTab === 'activity' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Admin Actions</h3>
                  <button
                    onClick={loadSettings}
                    disabled={refreshing}
                    className="btn btn-outline btn-sm"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                
                <div className="space-y-4">
                  {adminActions && adminActions.length > 0 ? (
                    adminActions.map((action, index) => (
                      <div key={index} className="flex items-start p-4 bg-gray-50 rounded-lg">
                        <Activity className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{action.action}</p>
                          <p className="text-sm text-gray-500">by {action.admin}</p>
                          <p className="text-xs text-gray-400">{formatTimestamp(action.timestamp)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-500">No recent admin actions</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Settings */}
            {activeTab === 'payment' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commission Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="input w-full"
                      value={formData.payment?.commission_rate || ''}
                      onChange={(e) => handleInputChange('payment', 'commission_rate', parseFloat(e.target.value))}
                      placeholder="5.0"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Percentage commission charged on each payment
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Payment Amount (KES)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="input w-full"
                      value={formData.payment?.minimum_amount || ''}
                      onChange={(e) => handleInputChange('payment', 'minimum_amount', parseInt(e.target.value))}
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Payment Amount (KES)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="input w-full"
                      value={formData.payment?.maximum_amount || ''}
                      onChange={(e) => handleInputChange('payment', 'maximum_amount', parseInt(e.target.value))}
                      placeholder="1000000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      M-Pesa Consumer Key
                    </label>
                    <input
                      type="password"
                      className="input w-full"
                      value={formData.payment?.mpesa_consumer_key || ''}
                      onChange={(e) => handleInputChange('payment', 'mpesa_consumer_key', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      M-Pesa Consumer Secret
                    </label>
                    <input
                      type="password"
                      className="input w-full"
                      value={formData.payment?.mpesa_consumer_secret || ''}
                      onChange={(e) => handleInputChange('payment', 'mpesa_consumer_secret', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.payment?.auto_approve_payments || false}
                        onChange={(e) => handleInputChange('payment', 'auto_approve_payments', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">Auto-approve Payments</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Email Settings */}
            {activeTab === 'email' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Email Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      value={formData.email?.smtp_host || ''}
                      onChange={(e) => handleInputChange('email', 'smtp_host', e.target.value)}
                      placeholder="smtp.gmail.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      className="input w-full"
                      value={formData.email?.smtp_port || ''}
                      onChange={(e) => handleInputChange('email', 'smtp_port', parseInt(e.target.value))}
                      placeholder="587"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Username
                    </label>
                    <input
                      type="email"
                      className="input w-full"
                      value={formData.email?.smtp_username || ''}
                      onChange={(e) => handleInputChange('email', 'smtp_username', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Password
                    </label>
                    <input
                      type="password"
                      className="input w-full"
                      value={formData.email?.smtp_password || ''}
                      onChange={(e) => handleInputChange('email', 'smtp_password', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.email?.enable_notifications || false}
                        onChange={(e) => handleInputChange('email', 'enable_notifications', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">Enable Email Notifications</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.notifications?.new_user_signup || false}
                        onChange={(e) => handleInputChange('notifications', 'new_user_signup', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">New User Signup</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.notifications?.new_job_posted || false}
                        onChange={(e) => handleInputChange('notifications', 'new_job_posted', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">New Job Posted</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.notifications?.payment_received || false}
                        onChange={(e) => handleInputChange('notifications', 'payment_received', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">Payment Received</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.notifications?.system_alerts || false}
                        onChange={(e) => handleInputChange('notifications', 'system_alerts', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">System Alerts</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Email for Notifications
                    </label>
                    <input
                      type="email"
                      className="input w-full"
                      value={formData.notifications?.admin_email || ''}
                      onChange={(e) => handleInputChange('notifications', 'admin_email', e.target.value)}
                      placeholder="admin@fishcrewconnect.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      JWT Secret Key
                    </label>
                    <input
                      type="password"
                      className="input w-full"
                      value={formData.security?.jwt_secret || ''}
                      onChange={(e) => handleInputChange('security', 'jwt_secret', e.target.value)}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Strong secret key for JWT token generation
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token Expiration (hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      className="input w-full"
                      value={formData.security?.token_expiration || ''}
                      onChange={(e) => handleInputChange('security', 'token_expiration', parseInt(e.target.value))}
                      placeholder="24"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Login Attempts
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="input w-full"
                      value={formData.security?.max_login_attempts || ''}
                      onChange={(e) => handleInputChange('security', 'max_login_attempts', parseInt(e.target.value))}
                      placeholder="5"
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.security?.require_email_verification || false}
                        onChange={(e) => handleInputChange('security', 'require_email_verification', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">Require Email Verification</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.security?.enable_two_factor || false}
                        onChange={(e) => handleInputChange('security', 'enable_two_factor', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-gray-700">Enable Two-Factor Authentication</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
