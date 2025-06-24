const db = require('../config/db');

// Cache for system settings to avoid database hits on every request
let settingsCache = {};
let cacheLastUpdated = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get system settings with caching
 */
const getSystemSettings = async () => {
  const now = Date.now();
  
  // Return cached settings if still valid
  if (now - cacheLastUpdated < CACHE_DURATION && Object.keys(settingsCache).length > 0) {
    return settingsCache;
  }
  
  try {
    const [settings] = await db.query('SELECT setting_key, setting_value FROM system_settings');
    
    // Parse settings into a usable object
    const parsedSettings = {};
    settings.forEach(setting => {
      try {
        parsedSettings[setting.setting_key] = JSON.parse(setting.setting_value);
      } catch (e) {
        parsedSettings[setting.setting_key] = setting.setting_value;
      }
    });
    
    settingsCache = parsedSettings;
    cacheLastUpdated = now;
    
    return parsedSettings;
  } catch (error) {
    console.error('Error fetching system settings:', error);
    // Return default settings if database fails
    return {
      user_registration_enabled: true,
      job_posting_enabled: true,
      messaging_enabled: true,
      notifications_enabled: true,
      maintenance_mode: false,
      admin_access_override: true
    };
  }
};

/**
 * Clear settings cache (call after settings update)
 */
const clearSettingsCache = () => {
  settingsCache = {};
  cacheLastUpdated = 0;
};

/**
 * Middleware to check if user registration is enabled
 * ADMINS ARE ALWAYS ALLOWED regardless of settings
 */
const checkUserRegistrationEnabled = async (req, res, next) => {
  try {
    // Always allow admins to register/create users
    if (req.user && req.user.user_type === 'admin') {
      return next();
    }
    
    const settings = await getSystemSettings();
    
    // Always allow if user registration is enabled
    if (settings.user_registration_enabled) {
      return next();
    }
    
    // If disabled, only allow admin registration (for emergency access)
    return res.status(403).json({ 
      message: 'User registration is currently disabled by system administrator',
      code: 'REGISTRATION_DISABLED'
    });
  } catch (error) {
    console.error('Error checking registration setting:', error);
    // If we can't check settings, allow registration (fail open for safety)
    next();
  }
};

/**
 * Middleware to check if job posting is enabled
 * ADMINS ARE ALWAYS ALLOWED
 */
const checkJobPostingEnabled = async (req, res, next) => {
  try {
    // Always allow admins
    if (req.user && req.user.user_type === 'admin') {
      return next();
    }
    
    const settings = await getSystemSettings();
    
    if (settings.job_posting_enabled) {
      return next();
    }
    
    return res.status(403).json({ 
      message: 'Job posting is currently disabled by system administrator',
      code: 'JOB_POSTING_DISABLED'
    });
  } catch (error) {
    console.error('Error checking job posting setting:', error);
    // If we can't check settings, allow for regular users (fail open)
    next();
  }
};

/**
 * Middleware to check if messaging is enabled
 * ADMINS ARE ALWAYS ALLOWED
 */
const checkMessagingEnabled = async (req, res, next) => {
  try {
    // Always allow admins
    if (req.user && req.user.user_type === 'admin') {
      return next();
    }
    
    const settings = await getSystemSettings();
    
    if (settings.messaging_enabled) {
      return next();
    }
    
    return res.status(403).json({ 
      message: 'Messaging is currently disabled by system administrator',
      code: 'MESSAGING_DISABLED'
    });
  } catch (error) {
    console.error('Error checking messaging setting:', error);
    next();
  }
};

/**
 * Middleware to check if system is in maintenance mode
 * ADMINS ARE ALWAYS ALLOWED to access during maintenance
 * Emergency access code can also bypass maintenance mode
 */
const checkMaintenanceMode = async (req, res, next) => {
  try {
    // Always allow admins during maintenance
    if (req.user && req.user.user_type === 'admin') {
      return next();
    }
    
    // Always allow authentication endpoints
    if (req.path.includes('/auth/')) {
      return next();
    }
    
    // Check for emergency access code in headers
    const emergencyCode = req.headers['x-emergency-access'];
    if (emergencyCode) {
      const settings = await getSystemSettings();
      if (emergencyCode === settings.emergency_access_code) {
        console.log('Emergency access code used:', req.ip);
        return next();
      }
    }
    
    const settings = await getSystemSettings();
    
    if (settings.maintenance_mode) {
      return res.status(503).json({ 
        message: 'System is currently under maintenance. Please try again later.',
        code: 'MAINTENANCE_MODE',
        emergencyAccess: 'Contact administrator for emergency access'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    // If we can't check settings, allow access (fail open)
    next();
  }
};

/**
 * Get a specific setting value
 */
const getSetting = async (key, defaultValue = null) => {
  try {
    const settings = await getSystemSettings();
    return settings[key] !== undefined ? settings[key] : defaultValue;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return defaultValue;
  }
};

module.exports = {
  getSystemSettings,
  clearSettingsCache,
  checkUserRegistrationEnabled,
  checkJobPostingEnabled,
  checkMessagingEnabled,
  checkMaintenanceMode,
  getSetting
};
