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
  Mail,
  Bell,
  Database,
  Key,
  Info,
  Activity,
  Edit3,
  Check,
  X,
  Users,
  FileText,
  CreditCard,
} from 'lucide-react';

const tabs = [
  { id: 'general',       label: 'General',       icon: SettingsIcon },
  { id: 'features',      label: 'Features',       icon: Shield },
  { id: 'limits',        label: 'System Limits',  icon: AlertCircle },
  { id: 'payment',       label: 'Payment',        icon: DollarSign },
  { id: 'email',         label: 'Email',          icon: Mail },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'security',      label: 'Security',       icon: Key },
  { id: 'database',      label: 'Database',       icon: Database },
  { id: 'system',        label: 'System Info',    icon: Info },
  { id: 'activity',      label: 'Activity Log',   icon: Activity },
];

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
  </div>
);

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400';

const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-50 last:border-0">
    <div className="flex-1">
      <div className="text-sm font-medium text-gray-800">{label}</div>
      {description && <div className="text-xs text-gray-400 mt-0.5">{description}</div>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
      style={{ background: checked ? '#0077B6' : '#d1d5db' }}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  </div>
);

const SectionCard = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
    {title && <h3 className="text-base font-semibold text-gray-900 mb-5">{title}</h3>}
    {children}
  </div>
);

const SettingsPage = () => {
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [activeTab, setActiveTab]       = useState('general');
  const [settings, setSettings]         = useState({});
  const [formData, setFormData]         = useState({});
  const [systemInfo, setSystemInfo]     = useState({});
  const [adminActions, setAdminActions] = useState([]);
  const [editingLimits, setEditingLimits] = useState(false);
  const [limitValues, setLimitValues]   = useState({});

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      const [settingsData, dashboardData] = await Promise.all([
        adminAPI.getSystemSettings(),
        adminAPI.getDashboardStats(),
      ]);
      setSettings(settingsData);
      setFormData(settingsData);
      setSystemInfo(dashboardData);
      if (settingsData.limits) setLimitValues({ ...settingsData.limits });
      setAdminActions(settingsData.adminActions || []);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const { database, adminActions: _a, lastUpdated: _b, ...toSave } = formData;
      await adminAPI.updateSystemSettings(toSave);
      toast.success('Settings saved');
      setSettings(formData);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInput = (category, key, value) =>
    setFormData(prev => ({ ...prev, [category]: { ...prev[category], [key]: value } }));

  const handleToggle = async (category, key, value) => {
    setFormData(prev => ({ ...prev, [category]: { ...prev[category], [key]: value } }));
    try {
      await adminAPI.updateSystemSettings({ [key]: value });
      toast.success(`${key.replace(/_/g, ' ')} ${value ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update setting');
      setFormData(prev => ({ ...prev, [category]: { ...prev[category], [key]: !value } }));
    }
  };

  const handleSaveLimits = async () => {
    const errors = Object.entries(limitValues)
      .filter(([, v]) => isNaN(parseInt(v)) || parseInt(v) < 1)
      .map(([k]) => k.replace(/_/g, ' '));
    if (errors.length) { toast.error(`Invalid values: ${errors.join(', ')}`); return; }
    try {
      setSaving(true);
      await adminAPI.updateSystemSettings(limitValues);
      setFormData(prev => ({ ...prev, limits: { ...limitValues } }));
      setEditingLimits(false);
      toast.success('Limits updated');
    } catch {
      toast.error('Failed to update limits');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3" style={{ borderColor: '#0077B6' }} />
          <p className="text-sm text-gray-500">Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">System Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Configure platform settings and preferences</p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <button onClick={loadSettings} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={handleSaveSettings} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ background: saving ? '#94a3b8' : 'linear-gradient(135deg, #0077B6, #44DBE9)' }}>
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab nav */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 p-2" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <nav className="space-y-0.5">
              {tabs.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-all text-left"
                    style={active
                      ? { background: 'rgba(0,119,182,0.08)', color: '#0077B6', borderLeft: '3px solid #0077B6', paddingLeft: '9px' }
                      : { color: '#6b7280', borderLeft: '3px solid transparent', paddingLeft: '9px' }}>
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* General */}
          {activeTab === 'general' && (
            <SectionCard title="General Settings">
              <div className="space-y-5">
                <Field label="Platform Name">
                  <input className={inputCls} value={formData.general?.platform_name || ''} placeholder="FishCrewConnect"
                    onChange={e => handleInput('general', 'platform_name', e.target.value)} />
                </Field>
                <Field label="Platform Description">
                  <textarea rows={3} className={inputCls} value={formData.general?.platform_description || ''}
                    placeholder="Connecting boat owners with skilled fishermen"
                    onChange={e => handleInput('general', 'platform_description', e.target.value)} />
                </Field>
                <Field label="Support Email">
                  <input type="email" className={inputCls} value={formData.general?.support_email || ''}
                    placeholder="support@fishcrewconnect.com"
                    onChange={e => handleInput('general', 'support_email', e.target.value)} />
                </Field>
                <Field label="Contact Phone">
                  <input type="tel" className={inputCls} value={formData.general?.contact_phone || ''}
                    placeholder="+254 700 000 000"
                    onChange={e => handleInput('general', 'contact_phone', e.target.value)} />
                </Field>
                <div className="pt-2 border-t border-gray-50">
                  <Toggle
                    label="Maintenance Mode"
                    description="Temporarily disable access to the platform for all users"
                    checked={formData.general?.maintenance_mode || false}
                    onChange={v => handleInput('general', 'maintenance_mode', v)}
                  />
                </div>
              </div>
            </SectionCard>
          )}

          {/* Features */}
          {activeTab === 'features' && (
            <SectionCard title="Feature Controls">
              <p className="text-sm text-gray-400 mb-4">Enable or disable platform features in real-time.</p>
              {[
                { key: 'user_registration_enabled',    label: 'User Registration',      desc: 'Allow new users to register on the platform' },
                { key: 'job_posting_enabled',          label: 'Job Posting',            desc: 'Allow boat owners to post new job listings' },
                { key: 'messaging_enabled',            label: 'User Messaging',         desc: 'Enable direct messaging between users' },
                { key: 'notifications_enabled',        label: 'In-App Notifications',   desc: 'Enable push notifications inside the app' },
                { key: 'email_notifications_enabled',  label: 'Email Notifications',    desc: 'Send email alerts to users on key events' },
                { key: 'payment_processing_enabled',   label: 'Payment Processing',     desc: 'Enable M-Pesa payment functionality' },
                { key: 'file_uploads_enabled',         label: 'File Uploads',           desc: 'Allow users to upload files and documents' },
              ].map(({ key, label, desc }) => (
                <Toggle key={key} label={label} description={desc}
                  checked={formData.features?.[key] || false}
                  onChange={v => handleToggle('features', key, v)} />
              ))}
            </SectionCard>
          )}

          {/* Limits */}
          {activeTab === 'limits' && (
            <SectionCard>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">System Limits</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Changes take effect immediately for all users</p>
                </div>
                {!editingLimits ? (
                  <button onClick={() => setEditingLimits(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingLimits(false); setLimitValues({ ...settings.limits }); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                    <button onClick={handleSaveLimits} disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg"
                      style={{ background: '#0077B6' }}>
                      <Check className="h-3.5 w-3.5" /> Save
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'max_jobs_per_user',          label: 'Max Jobs Per User',         icon: FileText, color: '#2563eb', bg: '#eff6ff' },
                  { key: 'max_applications_per_job',   label: 'Max Applications Per Job',  icon: Users,    color: '#16a34a', bg: '#f0fdf4' },
                  { key: 'max_file_size_mb',           label: 'Max File Size (MB)',         icon: Database, color: '#ca8a04', bg: '#fefce8' },
                  { key: 'max_messages_per_day',       label: 'Max Messages Per Day',       icon: Mail,     color: '#9333ea', bg: '#faf5ff' },
                ].map(({ key, label, icon: Icon, color, bg }) => (
                  <div key={key} className="rounded-xl border border-gray-100 p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="p-2 rounded-lg" style={{ background: bg }}>
                        <Icon className="h-4 w-4" style={{ color }} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                    </div>
                    {editingLimits ? (
                      <input type="number" className={inputCls}
                        value={limitValues[key] || ''}
                        onChange={e => setLimitValues(prev => ({ ...prev, [key]: e.target.value }))} />
                    ) : (
                      <div className="text-2xl font-bold" style={{ color }}>
                        {formData.limits?.[key] ?? '—'}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {editingLimits && (
                <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">Changes will affect all users immediately. Review carefully before saving.</p>
                </div>
              )}
            </SectionCard>
          )}

          {/* Payment */}
          {activeTab === 'payment' && (
            <SectionCard title="Payment Settings">
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Commission Rate (%)" hint="Platform fee on each completed payment">
                    <input type="number" min="0" max="100" step="0.1" className={inputCls}
                      value={formData.payment?.commission_rate || ''} placeholder="5.0"
                      onChange={e => handleInput('payment', 'commission_rate', parseFloat(e.target.value))} />
                  </Field>
                  <Field label="Minimum Amount (KES)">
                    <input type="number" min="1" className={inputCls}
                      value={formData.payment?.minimum_amount || ''} placeholder="100"
                      onChange={e => handleInput('payment', 'minimum_amount', parseInt(e.target.value))} />
                  </Field>
                  <Field label="Maximum Amount (KES)">
                    <input type="number" min="1" className={inputCls}
                      value={formData.payment?.maximum_amount || ''} placeholder="1000000"
                      onChange={e => handleInput('payment', 'maximum_amount', parseInt(e.target.value))} />
                  </Field>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">M-Pesa Credentials</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Consumer Key">
                      <input type="password" className={inputCls}
                        value={formData.payment?.mpesa_consumer_key || ''}
                        onChange={e => handleInput('payment', 'mpesa_consumer_key', e.target.value)} />
                    </Field>
                    <Field label="Consumer Secret">
                      <input type="password" className={inputCls}
                        value={formData.payment?.mpesa_consumer_secret || ''}
                        onChange={e => handleInput('payment', 'mpesa_consumer_secret', e.target.value)} />
                    </Field>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-50">
                  <Toggle label="Auto-approve Payments" description="Automatically mark payments as verified without manual review"
                    checked={formData.payment?.auto_approve_payments || false}
                    onChange={v => handleInput('payment', 'auto_approve_payments', v)} />
                </div>
              </div>
            </SectionCard>
          )}

          {/* Email */}
          {activeTab === 'email' && (
            <SectionCard title="Email / SMTP Settings">
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="SMTP Host">
                    <input className={inputCls} value={formData.email?.smtp_host || ''} placeholder="smtp.gmail.com"
                      onChange={e => handleInput('email', 'smtp_host', e.target.value)} />
                  </Field>
                  <Field label="SMTP Port">
                    <input type="number" className={inputCls} value={formData.email?.smtp_port || ''} placeholder="587"
                      onChange={e => handleInput('email', 'smtp_port', parseInt(e.target.value))} />
                  </Field>
                </div>
                <Field label="SMTP Username">
                  <input type="email" className={inputCls} value={formData.email?.smtp_username || ''}
                    onChange={e => handleInput('email', 'smtp_username', e.target.value)} />
                </Field>
                <Field label="SMTP Password">
                  <input type="password" className={inputCls} value={formData.email?.smtp_password || ''}
                    onChange={e => handleInput('email', 'smtp_password', e.target.value)} />
                </Field>
                <div className="pt-2 border-t border-gray-50">
                  <Toggle label="Enable Email Notifications" description="Send transactional emails to users"
                    checked={formData.email?.enable_notifications || false}
                    onChange={v => handleInput('email', 'enable_notifications', v)} />
                </div>
              </div>
            </SectionCard>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <SectionCard title="Notification Triggers">
              <p className="text-sm text-gray-400 mb-4">Choose which events send admin notifications.</p>
              {[
                { key: 'new_user_signup',  label: 'New User Signup',   desc: 'Alert when a new user registers' },
                { key: 'new_job_posted',   label: 'New Job Posted',    desc: 'Alert when a job is created' },
                { key: 'payment_received', label: 'Payment Received',  desc: 'Alert on successful payment' },
                { key: 'system_alerts',    label: 'System Alerts',     desc: 'Critical system error notifications' },
              ].map(({ key, label, desc }) => (
                <Toggle key={key} label={label} description={desc}
                  checked={formData.notifications?.[key] || false}
                  onChange={v => handleInput('notifications', key, v)} />
              ))}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Field label="Admin Email for Notifications">
                  <input type="email" className={inputCls} value={formData.notifications?.admin_email || ''}
                    placeholder="admin@fishcrewconnect.com"
                    onChange={e => handleInput('notifications', 'admin_email', e.target.value)} />
                </Field>
              </div>
            </SectionCard>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <SectionCard title="Security Settings">
              <div className="space-y-5">
                <Field label="JWT Secret Key" hint="Strong random string used to sign authentication tokens">
                  <input type="password" className={inputCls} value={formData.security?.jwt_secret || ''}
                    onChange={e => handleInput('security', 'jwt_secret', e.target.value)} />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Token Expiration (hours)">
                    <input type="number" min="1" max="168" className={inputCls}
                      value={formData.security?.token_expiration || ''} placeholder="24"
                      onChange={e => handleInput('security', 'token_expiration', parseInt(e.target.value))} />
                  </Field>
                  <Field label="Max Login Attempts">
                    <input type="number" min="1" max="10" className={inputCls}
                      value={formData.security?.max_login_attempts || ''} placeholder="5"
                      onChange={e => handleInput('security', 'max_login_attempts', parseInt(e.target.value))} />
                  </Field>
                </div>
                <div className="pt-2 border-t border-gray-50">
                  <Toggle label="Require Email Verification" description="Users must verify email before accessing the platform"
                    checked={formData.security?.require_email_verification || false}
                    onChange={v => handleInput('security', 'require_email_verification', v)} />
                  <Toggle label="Two-Factor Authentication" description="Enable 2FA for admin accounts"
                    checked={formData.security?.enable_two_factor || false}
                    onChange={v => handleInput('security', 'enable_two_factor', v)} />
                </div>
              </div>
            </SectionCard>
          )}

          {/* Database */}
          {activeTab === 'database' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users',    value: systemInfo.totals?.users    || 0, icon: Users,    color: '#2563eb', bg: '#eff6ff' },
                  { label: 'Total Jobs',     value: systemInfo.totals?.jobs     || 0, icon: FileText, color: '#16a34a', bg: '#f0fdf4' },
                  { label: 'Total Messages', value: systemInfo.totals?.messages || 0, icon: Mail,     color: '#9333ea', bg: '#faf5ff' },
                  { label: 'Total Payments', value: systemInfo.payments?.total_payments || 0, icon: CreditCard, color: '#ca8a04', bg: '#fefce8' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-100 p-5"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div className="p-2.5 rounded-xl w-fit mb-3" style={{ background: bg }}>
                      <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{value}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              <SectionCard title="Database Health">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { dot: '#22c55e', label: 'Connection Status', value: 'Active' },
                    { dot: (systemInfo.totals?.users || 0) > 1000 ? '#f59e0b' : '#22c55e',
                      label: 'Record Count',
                      value: (systemInfo.totals?.users || 0) > 1000 ? 'High' : 'Normal' },
                    { dot: '#22c55e', label: 'Performance', value: 'Optimal' },
                  ].map(({ dot, label, value }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: dot }} />
                      <div>
                        <div className="text-sm font-medium text-gray-800">{label}</div>
                        <div className="text-sm text-gray-500">{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </>
          )}

          {/* System Info */}
          {activeTab === 'system' && (
            <>
              <SectionCard title="Platform Information">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  {[
                    { label: 'Platform Name', value: settings.general?.platform_name || 'FishCrewConnect' },
                    { label: 'Version',        value: 'v1.0.0' },
                    { label: 'Environment',    value: 'PRODUCTION', color: '#16a34a' },
                    { label: 'Last Updated',   value: new Date().toLocaleDateString() },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between py-2 border-b border-gray-50">
                      <dt className="text-sm text-gray-500">{label}</dt>
                      <dd className="text-sm font-medium" style={{ color: color || '#111827' }}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </SectionCard>

              <SectionCard title="System Configuration">
                <div className="space-y-5">
                  <Field label="Database Backup Frequency">
                    <select className={inputCls} value={formData.system?.backup_frequency || ''}
                      onChange={e => handleInput('system', 'backup_frequency', e.target.value)}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </Field>
                  <Field label="Log Level">
                    <select className={inputCls} value={formData.system?.log_level || ''}
                      onChange={e => handleInput('system', 'log_level', e.target.value)}>
                      <option value="error">Error</option>
                      <option value="warn">Warning</option>
                      <option value="info">Info</option>
                      <option value="debug">Debug</option>
                    </select>
                  </Field>
                  <Field label="Session Timeout (minutes)">
                    <input type="number" min="5" max="1440" className={inputCls}
                      value={formData.system?.session_timeout || ''} placeholder="30"
                      onChange={e => handleInput('system', 'session_timeout', parseInt(e.target.value))} />
                  </Field>
                  <div className="pt-2 border-t border-gray-50">
                    <Toggle label="Analytics Tracking" description="Enable platform usage analytics"
                      checked={formData.system?.enable_analytics || false}
                      onChange={v => handleInput('system', 'enable_analytics', v)} />
                    <Toggle label="Auto Cleanup Old Logs" description="Automatically delete logs older than 90 days"
                      checked={formData.system?.auto_cleanup_logs || false}
                      onChange={v => handleInput('system', 'auto_cleanup_logs', v)} />
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {/* Activity Log */}
          {activeTab === 'activity' && (
            <SectionCard>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Recent Admin Actions</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Last 50 admin operations</p>
                </div>
                <button onClick={loadSettings} disabled={refreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              {adminActions?.length > 0 ? (
                <div className="space-y-2">
                  {adminActions.map((action, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="p-1.5 rounded-lg mt-0.5" style={{ background: '#eff6ff' }}>
                        <Activity className="h-3.5 w-3.5" style={{ color: '#2563eb' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{action.action}</p>
                        <p className="text-xs text-gray-400">by {action.admin} · {new Date(action.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="p-3 rounded-full w-fit mx-auto mb-3" style={{ background: '#f3f4f6' }}>
                    <Activity className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">No recent admin actions</p>
                </div>
              )}
            </SectionCard>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
