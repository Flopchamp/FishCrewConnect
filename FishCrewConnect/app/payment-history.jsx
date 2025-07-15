import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiService from '../services/api';
import SafeScreenWrapper from '../components/SafeScreenWrapper';
import HeaderBox from '../components/HeaderBox';

const PaymentHistoryScreen = () => {
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPayments: 0,
    limit: 10
  });

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async (page = 1, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const response = await apiService.payments.getPaymentHistory({ page, limit: 10 });
      
      if (page === 1) {
        setPayments(response.payments || []);
      } else {
        setPayments(prev => [...prev, ...(response.payments || [])]);
      }
      
      setPagination(response.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalPayments: 0,
        limit: 10
      });
    } catch (error) {
      console.error('Error fetching payment history:', error);
      Alert.alert('Error', 'Failed to load payment history. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPaymentHistory(1, false);
  };

  const loadMore = () => {
    if (pagination.currentPage < pagination.totalPages && !loading) {
      fetchPaymentHistory(pagination.currentPage + 1, false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `KSH ${parseFloat(amount).toLocaleString()}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'failed':
        return '#F44336';
      case 'cancelled':
        return '#9E9E9E';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'failed':
        return 'close-circle';
      case 'cancelled':
        return 'ban';
      default:
        return 'help-circle';
    }
  };

  const renderPaymentItem = ({ item }) => {
    const isOwner = item.boat_owner_id === item.current_user_id; // This would need to be set from context
    
    return (
      <View style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle} numberOfLines={1}>
              {item.job_title}
            </Text>
            <Text style={styles.participantInfo}>
              {isOwner ? `Paid to: ${item.fisherman_name}` : `Payment from: ${item.boat_owner_name}`}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Ionicons 
              name={getStatusIcon(item.status)} 
              size={16} 
              color="#fff" 
              style={styles.statusIcon}
            />
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.paymentDetails}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total Amount:</Text>
            <Text style={styles.totalAmount}>{formatCurrency(item.total_amount)}</Text>
          </View>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Fisherman Amount:</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(item.fisherman_amount)}</Text>
          </View>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Platform Commission:</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(item.platform_commission)}</Text>
          </View>
        </View>

        <View style={styles.paymentFooter}>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar" size={14} color="#666" />
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
          
          {item.mpesa_receipt_number && (
            <View style={styles.receiptInfo}>
              <Text style={styles.receiptLabel}>Receipt:</Text>
              <Text style={styles.receiptNumber}>{item.mpesa_receipt_number}</Text>
            </View>
          )}
        </View>

        {item.failure_reason && (
          <View style={styles.errorInfo}>
            <Ionicons name="warning" size={16} color="#F44336" />
            <Text style={styles.errorText}>{item.failure_reason}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="card" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No Payments Yet</Text>
      <Text style={styles.emptyText}>
        Your payment history will appear here once you complete job transactions.
      </Text>
    </View>
  );

  const renderLoadMoreButton = () => {
    if (pagination.currentPage >= pagination.totalPages) return null;
    
    return (
      <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
        <Text style={styles.loadMoreText}>Load More</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeScreenWrapper>
      <HeaderBox 
        title="Payment History" 
        showBackButton
        onBackPress={() => router.back()}
        rightComponent={
          <TouchableOpacity 
            style={styles.dashboardButton}
            onPress={() => router.push('/payment-dashboard')}
          >
            <Ionicons name="analytics-outline" size={24} color="#44DBE9" />
          </TouchableOpacity>
        }
      />
      
      <View style={styles.container}>
        {payments.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <Text style={styles.summaryText}>
              {pagination.totalPayments} total payment{pagination.totalPayments !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        <FlatList
          data={payments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPaymentItem}
          ListEmptyComponent={!loading ? renderEmptyState : null}
          ListFooterComponent={renderLoadMoreButton}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={payments.length === 0 ? styles.emptyContainer : styles.listContainer}
        />
      </View>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  participantInfo: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  paymentDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#44DBE9',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  receiptInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  receiptNumber: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  errorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ffebee',
    borderRadius: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginLeft: 6,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 40,
  },
  loadMoreButton: {
    backgroundColor: '#44DBE9',
    marginTop: 16,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  dashboardButton: {
    padding: 8,
    borderRadius: 6,
  },
});

export default PaymentHistoryScreen;
