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
} from 'lucide-react';

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({});
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getSystemSettings();
      setSettings(data);
      setFormData(data);
    } catch (error) {
      toast.error('Failed to load settings');
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
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

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'payment', label: 'Payment', icon: DollarSign },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'system', label: 'System', icon: Database },
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
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="btn btn-primary mt-4 sm:mt-0"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </button>
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

            {/* System Settings */}
            {activeTab === 'system' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">System Settings</h3>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
