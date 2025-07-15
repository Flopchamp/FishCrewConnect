import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import HeaderBox from '../../components/HeaderBox';

const AdminPaymentManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Payment Statistics
  const [platformStats, setPlatformStats] = useState({
    totalRevenue: 0,
    totalCommissions: 0,
    totalPayments: 0,
    pendingPayments: 0,
    completedPayments: 0,
    failedPayments: 0,
    disputedPayments: 0,
    averagePaymentValue: 0,
    monthlyGrowth: 0,
    conversionRate: 0,
    refundRate: 0,
    processingTime: 0
  });

  // Platform Configuration
  const [configModal, setConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null); // Track which config is being edited
  const [editValue, setEditValue] = useState(''); // Current edit value
  const [platformConfig, setPlatformConfig] = useState({
    commissionRate: 0.05,
    minimumPayment: 100,
    maximumPayment: 100000,
    autoApproveLimit: 10000,
    disputeTimeLimit: 30,
    refundTimeLimit: 7
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'analytics' },
    { id: 'config', label: 'Settings', icon: 'settings' }
  ];

  // Fetch all admin payment data
  const fetchAdminPaymentData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all admin payment data
      const [paymentsResponse, configResponse, analyticsResponse] = await Promise.all([
        fetchAllPlatformPayments(),
        fetchPlatformConfiguration(),
        fetchPaymentAnalytics()
      ]);

      // Process platform statistics
      const stats = calculatePlatformStatistics(paymentsResponse, analyticsResponse.paymentStats);
      setPlatformStats(stats);
      
      // Set configuration
      setPlatformConfig(configResponse);
      
    } catch (error) {
      console.error('Error fetching admin payment data:', error);
      Alert.alert('Error', 'Failed to load payment data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // API functions for admin payment management
  const fetchAllPlatformPayments = useCallback(async () => {
    try {
      const params = {
        page: 1,
        limit: 1000 // Get all payments for comprehensive analysis
      };
      
      console.log('Fetching platform payments with params:', params);
      const response = await adminAPI.payments.getAllPlatformPayments(params);
      return response.payments || response || [];
    } catch (error) {
      console.error('Error fetching platform payments:', error);
      Alert.alert('Error', 'Failed to load payment data. Please check your connection and try again.');
      return [];
    }
  }, []);

  const fetchPlatformConfiguration = useCallback(async () => {
    try {
      console.log('Fetching platform configuration');
      const response = await adminAPI.payments.getPlatformConfig();
      return response || {
        commissionRate: 0.05,
        minimumPayment: 100,
        maximumPayment: 100000,
        autoApproveLimit: 10000,
        disputeTimeLimit: 30,
        refundTimeLimit: 7
      };
    } catch (error) {
      console.error('Error fetching platform config:', error);
      // Return default config for first-time setup
      return {
        commissionRate: 0.05,
        minimumPayment: 100,
        maximumPayment: 100000,
        autoApproveLimit: 10000,
        disputeTimeLimit: 30,
        refundTimeLimit: 7
      };
    }
  }, []);

  const fetchPaymentAnalytics = useCallback(async () => {
    try {
      console.log('Fetching payment analytics');
      const [analytics, commissionData, dashboardStats] = await Promise.all([
        adminAPI.payments.getPaymentAnalytics({ months: 12 }),
        adminAPI.payments.getCommissionAnalytics({ months: 12 }),
        adminAPI.getDashboardStats()
      ]);
      
      return { 
        analytics, 
        commissionData, 
        paymentStats: dashboardStats?.payments || null 
      };
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
      return { analytics: null, commissionData: null, paymentStats: null };
    }
  }, []);

  const calculatePlatformStatistics = (payments, paymentStats = null) => {
    // If we have payment statistics from the backend, use them
    if (paymentStats) {
      return {
        totalRevenue: paymentStats.total_revenue || 0,
        totalCommissions: paymentStats.total_commissions || 0,
        totalPayments: paymentStats.total_payments || 0,
        pendingPayments: paymentStats.pending_payments || 0,
        completedPayments: paymentStats.completed_payments || 0,
        failedPayments: paymentStats.failed_payments || 0,
        disputedPayments: paymentStats.disputed_payments || 0,
        averagePaymentValue: paymentStats.average_payment_value || 0,
        monthlyGrowth: paymentStats.monthly_growth || 0,
        conversionRate: paymentStats.conversion_rate || 0,
        refundRate: paymentStats.refund_rate || 0,
        processingTime: paymentStats.processing_time || 0
      };
    }

    // Fallback calculation from payments array if stats not available
    const totalRevenue = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    const totalCommissions = payments.reduce((sum, payment) => sum + (parseFloat(payment.commission_amount) || 0), 0);
    const totalPayments = payments.length;
    const pendingPayments = payments.filter(p => p.status === 'pending').length;
    const completedPayments = payments.filter(p => p.status === 'completed').length;
    const failedPayments = payments.filter(p => p.status === 'failed').length;
    const disputedPayments = payments.filter(p => p.status === 'disputed').length;
    const averagePaymentValue = totalPayments > 0 ? totalRevenue / totalPayments : 0;

    return {
      totalRevenue,
      totalCommissions,
      totalPayments,
      pendingPayments,
      completedPayments,
      failedPayments,
      disputedPayments,
      averagePaymentValue,
      monthlyGrowth: 0,
      conversionRate: totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0,
      refundRate: 0,
      processingTime: 0
    };
  };

  // Handle opening individual config edit
  const handleEditConfig = (configKey) => {
    setEditingConfig(configKey);
    
    // Set the current value based on the config key
    let currentValue = platformConfig[configKey];
    if (configKey === 'commissionRate') {
      currentValue = (currentValue * 100).toString(); // Convert to percentage
    } else {
      currentValue = currentValue.toString();
    }
    
    setEditValue(currentValue);
    setConfigModal(true);
  };

  // Handle updating individual config
  const handleUpdateIndividualConfig = async () => {
    try {
      if (!editingConfig || !editValue.trim()) {
        Alert.alert('Error', 'Please enter a valid value');
        return;
      }

      let parsedValue = parseFloat(editValue);
      if (isNaN(parsedValue) || parsedValue < 0) {
        Alert.alert('Error', 'Please enter a valid positive number');
        return;
      }

      // Convert percentage back to decimal for commission rate
      if (editingConfig === 'commissionRate') {
        if (parsedValue > 100) {
          Alert.alert('Error', 'Commission rate cannot exceed 100%');
          return;
        }
        parsedValue = parsedValue / 100;
      }

      // Call admin API to update configuration
      await adminAPI.payments.updatePlatformConfig({ [editingConfig]: parsedValue });

      // Update local state
      const updatedConfig = {
        ...platformConfig,
        [editingConfig]: parsedValue
      };
      setPlatformConfig(updatedConfig);

      Alert.alert('Success', `${getConfigDisplayName(editingConfig)} updated successfully`);
      setConfigModal(false);
      setEditingConfig(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating configuration:', error);
      Alert.alert('Error', error.message || 'Failed to update configuration');
    }
  };

  // Get display name for config keys
  const getConfigDisplayName = (configKey) => {
    const displayNames = {
      commissionRate: 'Commission Rate',
      minimumPayment: 'Minimum Payment',
      maximumPayment: 'Maximum Payment',
      autoApproveLimit: 'Auto-Approve Limit',
      disputeTimeLimit: 'Dispute Time Limit',
      refundTimeLimit: 'Refund Time Limit'
    };
    return displayNames[configKey] || configKey;
  };

  // Get input placeholder for config keys
  const getConfigPlaceholder = (configKey) => {
    const placeholders = {
      commissionRate: 'Enter commission rate (e.g., 5.0)',
      minimumPayment: 'Enter minimum payment amount',
      maximumPayment: 'Enter maximum payment amount',
      autoApproveLimit: 'Enter auto-approve limit',
      disputeTimeLimit: 'Enter dispute time limit (days)',
      refundTimeLimit: 'Enter refund time limit (days)'
    };
    return placeholders[configKey] || 'Enter value';
  };

  // Get input unit for config keys
  const getConfigUnit = (configKey) => {
    const units = {
      commissionRate: '%',
      minimumPayment: 'KES',
      maximumPayment: 'KES',
      autoApproveLimit: 'KES',
      disputeTimeLimit: 'days',
      refundTimeLimit: 'days'
    };
    return units[configKey] || '';
  };

  // Load data on component mount
  useEffect(() => {
    fetchAdminPaymentData();
  }, [fetchAdminPaymentData]);

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <SafeScreenWrapper>
        <HeaderBox title="Payment Management" subtitle="Admin Portal" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading payment data...</Text>
        </View>
      </SafeScreenWrapper>
    );
  }

  return (
    <SafeScreenWrapper>
      <HeaderBox title="Payment Management" subtitle="Admin Portal" />
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedTab === tab.id && styles.activeTab
            ]}
            onPress={() => setSelectedTab(tab.id)}
          >
            <Ionicons 
              name={tab.icon} 
              size={20} 
              color={selectedTab === tab.id ? '#FFFFFF' : '#6B7280'} 
            />
            <Text style={[
              styles.tabText,
              selectedTab === tab.id && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <ScrollView 
          style={styles.tabContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchAdminPaymentData();
              }}
              colors={['#44DBE9']}
              tintColor="#44DBE9"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Platform Revenue Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Platform Revenue Overview</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{formatCurrency(platformStats.totalRevenue)}</Text>
                <Text style={styles.summaryLabel}>Total Revenue</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{formatCurrency(platformStats.totalCommissions)}</Text>
                <Text style={styles.summaryLabel}>Total Commissions</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{platformStats.totalPayments}</Text>
                <Text style={styles.summaryLabel}>Total Payments</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{platformStats.averagePaymentValue.toFixed(0)}</Text>
                <Text style={styles.summaryLabel}>Avg Payment</Text>
              </View>
            </View>
          </View>

          {/* Payment Status Overview */}
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Payment Status Overview</Text>
            <View style={styles.statusGrid}>
              <View style={[styles.statusItem, { backgroundColor: '#F0FDF4' }]}>
                <Text style={[styles.statusValue, { color: '#15803D' }]}>{platformStats.completedPayments}</Text>
                <Text style={styles.statusLabel}>Completed</Text>
              </View>
              <View style={[styles.statusItem, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.statusValue, { color: '#D97706' }]}>{platformStats.pendingPayments}</Text>
                <Text style={styles.statusLabel}>Pending</Text>
              </View>
              <View style={[styles.statusItem, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.statusValue, { color: '#DC2626' }]}>{platformStats.failedPayments}</Text>
                <Text style={styles.statusLabel}>Failed</Text>
              </View>
              <View style={[styles.statusItem, { backgroundColor: '#EDE9FE' }]}>
                <Text style={[styles.statusValue, { color: '#7C3AED' }]}>{platformStats.disputedPayments}</Text>
                <Text style={styles.statusLabel}>Disputed</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {selectedTab === 'config' && (
        <ScrollView style={styles.tabContent}>
          <View style={styles.configCard}>
            <Text style={styles.configTitle}>Payment Settings</Text>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Commission Rate</Text>
              <View style={styles.configValueContainer}>
                <Text style={styles.configValue}>{(platformConfig.commissionRate * 100).toFixed(1)}%</Text>
                <TouchableOpacity 
                  style={styles.editIcon}
                  onPress={() => handleEditConfig('commissionRate')}
                >
                  <Ionicons name="create" size={16} color="#44DBE9" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Minimum Payment</Text>
              <View style={styles.configValueContainer}>
                <Text style={styles.configValue}>{formatCurrency(platformConfig.minimumPayment)}</Text>
                <TouchableOpacity 
                  style={styles.editIcon}
                  onPress={() => handleEditConfig('minimumPayment')}
                >
                  <Ionicons name="create" size={16} color="#44DBE9" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Maximum Payment</Text>
              <View style={styles.configValueContainer}>
                <Text style={styles.configValue}>{formatCurrency(platformConfig.maximumPayment)}</Text>
                <TouchableOpacity 
                  style={styles.editIcon}
                  onPress={() => handleEditConfig('maximumPayment')}
                >
                  <Ionicons name="create" size={16} color="#44DBE9" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Auto-Approve Limit</Text>
              <View style={styles.configValueContainer}>
                <Text style={styles.configValue}>{formatCurrency(platformConfig.autoApproveLimit)}</Text>
                <TouchableOpacity 
                  style={styles.editIcon}
                  onPress={() => handleEditConfig('autoApproveLimit')}
                >
                  <Ionicons name="create" size={16} color="#44DBE9" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Individual Config Edit Modal */}
      <Modal
        visible={configModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setConfigModal(false);
          setEditingConfig(null);
          setEditValue('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Edit {getConfigDisplayName(editingConfig)}
            </Text>
            <Text style={styles.modalSubtitle}>
              Enter the new value for {getConfigDisplayName(editingConfig)}
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={getConfigPlaceholder(editingConfig)}
              keyboardType="numeric"
              autoFocus={true}
            />
            
            <Text style={styles.unitText}>Unit: {getConfigUnit(editingConfig)}</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setConfigModal(false);
                  setEditingConfig(null);
                  setEditValue('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleUpdateIndividualConfig}
              >
                <Text style={styles.confirmButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#44DBE9',
    elevation: 3,
    shadowColor: '#44DBE9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  configCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  configTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  configLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  configValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  configValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    marginRight: 8,
  },
  editIcon: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: '90%',
    maxHeight: '70%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  unitText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#44DBE9',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default AdminPaymentManagement;
