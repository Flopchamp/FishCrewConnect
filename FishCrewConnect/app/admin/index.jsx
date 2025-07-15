import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import HeaderBox from '../../components/HeaderBox';
import apiService from '../../services/api';

const AdminDashboard = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();  const [stats, setStats] = useState({
    totalUsers: 0,
    totalJobs: 0,
    totalApplications: 0,
    activeConversations: 0,
    // Add payment statistics
    totalPayments: 0,
    completedPayments: 0,
    pendingPayments: 0,
    totalRevenue: 0,
    totalCommission: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    // Load admin stats
    loadDashboardStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading admin dashboard statistics...');
      
      const data = await apiService.admin.getDashboardStats();
      console.log('Received admin stats:', data);      // Update stats with real data from API
      setStats({
        totalUsers: data.totals.users,
        totalJobs: data.totals.jobs,
        totalApplications: data.totals.applications,
        activeConversations: data.active?.conversations || data.totals?.conversations || 0,
        // Add payment statistics
        totalPayments: data.payments?.total_payments || 0,
        completedPayments: data.payments?.completed_payments || 0,
        pendingPayments: data.payments?.pending_payments || 0,
        totalRevenue: data.payments?.total_payment_volume || 0,
        totalCommission: data.payments?.total_platform_commission || 0
      });
      
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      setError(error.message);
      
      // Show user-friendly error
      Alert.alert(
        'Error Loading Statistics',
        error.message || 'Failed to load dashboard statistics. Please try again.',
        [
          {
            text: 'Retry',
            onPress: loadDashboardStats
          },
          {
            text: 'Continue',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => signOut()
        }
      ]
    );
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

  const navigateToUserManagement = () => {
    router.push('/admin/users');
  };

  const navigateToJobManagement = () => {
    router.push('/admin/jobs');
  };

  const navigateToReports = () => {
    router.push('/admin/reports');
  };

  const navigateToPayments = () => {
    router.push('/admin/payments');
  };

  const navigateToSettings = () => {
    router.push('/admin/settings');
  };
  return (
    <SafeScreenWrapper>
      <HeaderBox 
        title="Admin Dashboard" 
        rightComponent={
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Ionicons name="log-out-outline" size={24} color="#44DBE9" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.container}>        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back, {user?.name}!</Text>
          <Text style={styles.roleText}>System Administrator</Text>
        </View>        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCard1]}>
              <Ionicons name="people-outline" size={32} color="#fff" />
              {loading ? (
                <ActivityIndicator size="small" color="#fff" style={styles.statNumber} />
              ) : (
                <Text style={styles.statNumber}>{stats.totalUsers}</Text>
              )}
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={[styles.statCard, styles.statCard2]}>
              <Ionicons name="briefcase-outline" size={32} color="#fff" />
              {loading ? (
                <ActivityIndicator size="small" color="#fff" style={styles.statNumber} />
              ) : (
                <Text style={styles.statNumber}>{stats.totalJobs}</Text>
              )}
              <Text style={styles.statLabel}>Total Jobs</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCard3]}>
              <Ionicons name="document-text-outline" size={32} color="#fff" />
              {loading ? (
                <ActivityIndicator size="small" color="#fff" style={styles.statNumber} />
              ) : (
                <Text style={styles.statNumber}>{stats.totalApplications}</Text>
              )}
              <Text style={styles.statLabel}>Applications</Text>
            </View>
            <View style={[styles.statCard, styles.statCard4]}>
              <Ionicons name="chatbubbles-outline" size={32} color="#fff" />
              {loading ? (
                <ActivityIndicator size="small" color="#fff" style={styles.statNumber} />
              ) : (
                <Text style={styles.statNumber}>{stats.activeConversations}</Text>
              )}
              <Text style={styles.statLabel}>Conversations</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCard5]}>
              <Ionicons name="cash-outline" size={32} color="#fff" />
              {loading ? (
                <ActivityIndicator size="small" color="#fff" style={styles.statNumber} />
              ) : (
                <Text style={styles.statNumber}>{stats.totalPayments}</Text>
              )}
              <Text style={styles.statLabel}>Total Payments</Text>
            </View>
            <View style={[styles.statCard, styles.statCard6]}>
              <Ionicons name="checkmark-circle-outline" size={32} color="#fff" />
              {loading ? (
                <ActivityIndicator size="small" color="#fff" style={styles.statNumber} />
              ) : (
                <Text style={styles.statNumber}>{stats.completedPayments}</Text>
              )}
              <Text style={styles.statLabel}>Completed Payments</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCard7]}>
              <Ionicons name="time-outline" size={32} color="#fff" />
              {loading ? (
                <ActivityIndicator size="small" color="#fff" style={styles.statNumber} />
              ) : (
                <Text style={styles.statNumber}>{stats.pendingPayments}</Text>
              )}
              <Text style={styles.statLabel}>Pending Payments</Text>
            </View>
            <View style={[styles.statCard, styles.statCard8]}>
              <Ionicons name="trending-up-outline" size={32} color="#fff" />
              {loading ? (
                <ActivityIndicator size="small" color="#fff" style={styles.statNumber} />
              ) : (
                <Text style={styles.statNumber}>{formatCurrency(stats.totalRevenue)}</Text>
              )}
              <Text style={styles.statLabel}>Total Revenue</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCard9]}>
              <Ionicons name="cash" size={32} color="#fff" />
              {loading ? (
                <ActivityIndicator size="small" color="#fff" style={styles.statNumber} />
              ) : (
                <Text style={styles.statNumber}>{formatCurrency(stats.totalCommission)}</Text>
              )}
              <Text style={styles.statLabel}>Total Commission</Text>
            </View>
          </View>
        </View>
        
        {/* Management Options */}
        <View style={styles.managementSection}>
          <Text style={styles.sectionTitle}>Management</Text>
          
          <TouchableOpacity style={styles.managementCard} onPress={navigateToUserManagement}>
            <View style={styles.managementCardContent}>
              <Ionicons name="people" size={24} color="#44DBE9" />
              <View style={styles.managementCardText}>
                <Text style={styles.managementCardTitle}>User Management</Text>
                <Text style={styles.managementCardSubtitle}>Manage fishermen, boat owners, and admin accounts</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.managementCard} onPress={navigateToJobManagement}>
            <View style={styles.managementCardContent}>
              <Ionicons name="briefcase" size={24} color="#44DBE9" />
              <View style={styles.managementCardText}>
                <Text style={styles.managementCardTitle}>Job Management</Text>
                <Text style={styles.managementCardSubtitle}>Monitor and manage fishing job postings</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.managementCard} onPress={navigateToReports}>
            <View style={styles.managementCardContent}>
              <Ionicons name="analytics" size={24} color="#44DBE9" />
              <View style={styles.managementCardText}>
                <Text style={styles.managementCardTitle}>Reports & Analytics</Text>
                <Text style={styles.managementCardSubtitle}>View platform usage and performance metrics</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.managementCard} onPress={navigateToPayments}>
            <View style={styles.managementCardContent}>
              <Ionicons name="card" size={24} color="#4CAF50" />
              <View style={styles.managementCardText}>
                <Text style={styles.managementCardTitle}>Payment Management</Text>
                <Text style={styles.managementCardSubtitle}>Monitor transactions, commissions, and payment history</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>          {/* System Settings - Consistent styling with other management cards */}
          <TouchableOpacity style={styles.managementCard} onPress={navigateToSettings}>
            <View style={styles.managementCardContent}>
              <Ionicons name="settings" size={24} color="#FF6B35" />
              <View style={styles.managementCardText}>
                <Text style={styles.managementCardTitle}>System Settings</Text>
                <Text style={styles.managementCardSubtitle}>Configure platform settings and preferences</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f9ff',
  },
  signOutText: {
    color: '#44DBE9',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },  welcomeSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  roleText: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    paddingHorizontal: 15,
    marginBottom: 30,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statCard1: {
    backgroundColor: '#44DBE9',
  },
  statCard2: {
    backgroundColor: '#4CAF50',
  },
  statCard3: {
    backgroundColor: '#FF9800',
  },
  statCard4: {
    backgroundColor: '#9C27B0',
  },
  statCard5: {
    backgroundColor: '#2196F3',
  },
  statCard6: {
    backgroundColor: '#4CAF50',
  },
  statCard7: {
    backgroundColor: '#FF9800',
  },
  statCard8: {
    backgroundColor: '#9C27B0',
  },
  statCard9: {
    backgroundColor: '#673AB7',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    marginTop: 4,
  },  managementSection: {
    paddingHorizontal: 15,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  managementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  managementCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  managementCardText: {
    flex: 1,
    marginLeft: 15,
  },
  managementCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },  managementCardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});

export default AdminDashboard;
