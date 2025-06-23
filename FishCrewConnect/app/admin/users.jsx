import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Alert, ActivityIndicator, TextInput, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import HeaderBox from '../../components/HeaderBox';
import { adminAPI } from '../../services/api';

const UserManagement = () => {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserType, setSelectedUserType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetailModal, setUserDetailModal] = useState(false);
  const [suspendModal, setSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendingUserId, setSuspendingUserId] = useState(null);
  const [suspendingUserName, setSuspendingUserName] = useState('');
  const [isUnsuspending, setIsUnsuspending] = useState(false);

  const userTypes = [
    { label: 'All Users', value: 'all' },
    { label: 'Fishermen', value: 'fisherman' },
    { label: 'Boat Owners', value: 'boat_owner' },
    { label: 'Admins', value: 'admin' }
  ];  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage.toString(),
        limit: '20',
        userType: selectedUserType,
        search: searchQuery
      };

      const response = await adminAPI.getAllUsers(params);
      setUsers(response.users);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, selectedUserType, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchUsers();
  };  const handleUserPress = async (user) => {
    try {
      console.log('Selected user status:', user.status); // Debug log
      const response = await adminAPI.getUserById(user.user_id);
      console.log('User details response:', response.status); // Debug log
      setSelectedUser(response);
      setUserDetailModal(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      Alert.alert('Error', 'Failed to fetch user details');
    }
  };
  const handleUserAction = (action, userId, userName) => {
    if (action === 'suspend') {
      // Show suspend dialog with reason input
      setSuspendingUserId(userId);
      setSuspendingUserName(userName);
      setIsUnsuspending(false);
      setSuspendReason('');
      setSuspendModal(true);
    } else if (action === 'unsuspend') {
      // Show unsuspend dialog with reason input
      setSuspendingUserId(userId);
      setSuspendingUserName(userName);
      setIsUnsuspending(true);
      setSuspendReason('');
      setSuspendModal(true);
    } else {
      // Handle other actions with simple confirmation
      const actionText = action === 'activate' ? 'activate' : 'delete';
      
      Alert.alert(
        `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} User`,
        `Are you sure you want to ${actionText} ${userName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: actionText.charAt(0).toUpperCase() + actionText.slice(1),
            style: action === 'delete' ? 'destructive' : 'default',
            onPress: () => performUserAction(action, userId)
          }
        ]
      );
    }
  };  const performUserAction = async (action, userId) => {
    try {
      if (action === 'suspend') {
        await adminAPI.suspendUser(userId, suspendReason || 'No reason provided');
        Alert.alert('Success', 'User suspended successfully');
      } else if (action === 'unsuspend') {
        await adminAPI.unsuspendUser(userId, suspendReason || 'No reason provided');
        Alert.alert('Success', 'User unsuspended successfully');
      } else {
        await adminAPI.updateUserStatus(userId, action, `${action.charAt(0).toUpperCase() + action.slice(1)} performed by admin`);
        Alert.alert('Success', `User ${action}d successfully`);
      }
      
      fetchUsers(); // Refresh the list
      setUserDetailModal(false);
      setSuspendModal(false);
      setSuspendReason('');
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      Alert.alert('Error', error.message || `Failed to ${action} user`);
    }
  };

  const handleSuspendConfirm = () => {
    if (isUnsuspending) {
      performUserAction('unsuspend', suspendingUserId);
    } else {
      performUserAction('suspend', suspendingUserId);
    }
  };
  const renderUserItem = ({ item }) => (    <TouchableOpacity style={[styles.userCard, item.status === 'suspended' && styles.suspendedUserCard]} onPress={() => handleUserPress(item)}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{item.name}</Text>
          <View style={styles.userBadges}>
            <View style={[styles.userTypeBadge, { backgroundColor: getUserTypeColor(item.user_type) }]}>
              <Text style={styles.userTypeBadgeText}>{item.user_type}</Text>
            </View>
            {item.status === 'suspended' && (
              <View style={styles.suspendedBadge}>
                <Text style={styles.suspendedBadgeText}>SUSPENDED</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userLocation}>{item.organization_name || 'Organization not specified'}</Text>
        <Text style={styles.userJoinDate}>
          Joined: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const getUserTypeColor = (userType) => {
    switch (userType) {
      case 'admin':
        return '#ff4444';
      case 'boat_owner':
        return '#4CAF50';
      case 'fisherman':
        return '#2196F3';
      default:
        return '#666';
    }
  };

  const renderFilterChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
      {userTypes.map((type) => (
        <TouchableOpacity
          key={type.value}
          style={[
            styles.filterChip,
            selectedUserType === type.value && styles.filterChipActive
          ]}
          onPress={() => {
            setSelectedUserType(type.value);
            setCurrentPage(1);
          }}
        >
          <Text style={[
            styles.filterChipText,
            selectedUserType === type.value && styles.filterChipTextActive
          ]}>
            {type.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      <TouchableOpacity
        style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
        onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
        disabled={currentPage === 1}
      >
        <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? '#ccc' : '#007AFF'} />
      </TouchableOpacity>
      
      <Text style={styles.paginationText}>
        Page {currentPage} of {totalPages}
      </Text>
      
      <TouchableOpacity
        style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
        onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
        disabled={currentPage === totalPages}
      >
        <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? '#ccc' : '#007AFF'} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeScreenWrapper>
      <HeaderBox 
        title="User Management" 
        leftComponent={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        }
      />
      
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>

        {/* Filter Chips */}
        {renderFilterChips()}

        {/* Users List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={users}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.user_id.toString()}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
            
            {/* Pagination */}
            {totalPages > 1 && renderPagination()}
          </>
        )}
      </View>

      {/* User Detail Modal */}
      <Modal
        visible={userDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeScreenWrapper>          <HeaderBox
            title="User Details"
            leftComponent={
              <TouchableOpacity onPress={() => setUserDetailModal(false)}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            }
            rightComponent={
              <TouchableOpacity onPress={() => {
                setUserDetailModal(false);
                router.push('/admin');
              }}>
                <View style={styles.dashboardButton}>
                  <Ionicons name="grid" size={20} color="#fff" />
                  <Text style={styles.dashboardButtonText}>Dashboard</Text>
                </View>
              </TouchableOpacity>
            }
          />
          
          {selectedUser && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.userDetailCard}>
                <View style={styles.userDetailHeader}>                  <Text style={styles.userDetailName}>{selectedUser.name}</Text>
                  <View style={[styles.userTypeBadge, { backgroundColor: getUserTypeColor(selectedUser.user_type) }]}>
                    <Text style={styles.userTypeBadgeText}>{selectedUser.user_type}</Text>
                  </View>
                </View>
                
                <View style={styles.userDetailInfo}>
                  <Text style={styles.userDetailLabel}>Email:</Text>
                  <Text style={styles.userDetailValue}>{selectedUser.email}</Text>
                </View>
                  <View style={styles.userDetailInfo}>
                  <Text style={styles.userDetailLabel}>Contact:</Text>
                  <Text style={styles.userDetailValue}>{selectedUser.contact_number || 'Not provided'}</Text>
                </View>
                
                <View style={styles.userDetailInfo}>
                  <Text style={styles.userDetailLabel}>Organization:</Text>
                  <Text style={styles.userDetailValue}>{selectedUser.organization_name || 'Not specified'}</Text>
                </View>
                  <View style={styles.userDetailInfo}>
                  <Text style={styles.userDetailLabel}>Joined:</Text>
                  <Text style={styles.userDetailValue}>
                    {new Date(selectedUser.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>              {/* User Stats */}
              {selectedUser.user_type === 'admin' ? (
                <View style={styles.statsCard}>
                  <Text style={styles.statsTitle}>Admin User</Text>
                  <Text style={styles.adminMessage}>
                    This is an administrator account with system management privileges. 
                    Admin accounts do not participate in job applications or job postings.
                  </Text>
                </View>
              ) : (
                <View style={styles.statsCard}>
                  <Text style={styles.statsTitle}>Activity Stats</Text>                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{selectedUser.applicationCount}</Text>
                      <Text style={styles.statLabel}>Applications</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{selectedUser.jobCount}</Text>
                      <Text style={styles.statLabel}>Jobs Posted</Text>
                    </View>
                  </View>
                </View>
              )}              {/* Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                {selectedUser.user_type === 'admin' ? (
                  <View style={styles.adminMessageContainer}>
                    <Ionicons name="shield-checkmark" size={24} color="#007AFF" />
                    <Text style={styles.adminMessageText}>
                      Admin users cannot be suspended or have their status changed.
                    </Text>
                  </View>                ) : selectedUser.status === 'suspended' ? (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.activateButton]}
                    onPress={() => handleUserAction('unsuspend', selectedUser.user_id, selectedUser.name)}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Unsuspend User</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.suspendButton]}                      onPress={() => handleUserAction('suspend', selectedUser.user_id, selectedUser.name)}
                    >
                      <Ionicons name="ban" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Suspend User</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.activateButton]}
                      onPress={() => handleUserAction('activate', selectedUser.user_id, selectedUser.name)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Activate User</Text>
                    </TouchableOpacity>
                  </>                )}
              </View>

              {/* Back to Dashboard Button */}
              <View style={styles.dashboardActionContainer}>
                <TouchableOpacity
                  style={styles.dashboardActionButton}
                  onPress={() => {
                    setUserDetailModal(false);
                    router.push('/admin');
                  }}
                >
                  <Ionicons name="grid" size={20} color="#007AFF" />
                  <Text style={styles.dashboardActionText}>Back to Dashboard</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}</SafeScreenWrapper>
      </Modal>

      {/* Suspend/Unsuspend Modal */}
      <Modal
        visible={suspendModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.suspendModalContent}>
            <Text style={styles.suspendModalTitle}>
              {isUnsuspending ? 'Unsuspend User' : 'Suspend User'}
            </Text>
            <Text style={styles.suspendModalSubtitle}>
              {isUnsuspending 
                ? `Are you sure you want to unsuspend ${suspendingUserName}?`
                : `Are you sure you want to suspend ${suspendingUserName}?`
              }
            </Text>
            
            <Text style={styles.reasonLabel}>
              Reason for {isUnsuspending ? 'unsuspension' : 'suspension'} (optional):
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder={isUnsuspending 
                ? "e.g., User appeal was reviewed and approved"
                : "e.g., User violated community guidelines by posting inappropriate content"
              }
              value={suspendReason}
              onChangeText={setSuspendReason}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
            />
            
            <View style={styles.suspendModalButtons}>
              <TouchableOpacity
                style={[styles.suspendModalButton, styles.cancelButton]}
                onPress={() => {
                  setSuspendModal(false);
                  setSuspendReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.suspendModalButton, isUnsuspending ? styles.confirmUnsuspendButton : styles.confirmSuspendButton]}
                onPress={handleSuspendConfirm}
              >
                <Text style={styles.confirmButtonText}>
                  {isUnsuspending ? 'Confirm Unsuspend' : 'Confirm Suspend'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 16,
  },  userCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  suspendedUserCard: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  userInfo: {
    flex: 1,
  },  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    justifyContent: 'space-between',
  },
  userBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  userTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },  userTypeBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  suspendedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#dc2626',
  },
  suspendedBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userJoinDate: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paginationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    marginHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  userDetailCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  userDetailName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  userDetailInfo: {
    marginBottom: 16,
  },
  userDetailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  userDetailValue: {
    fontSize: 16,
    color: '#333',
  },
  statsCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  adminStatsContainer: {
    gap: 12,
  },
  adminStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminStatText: {
    fontSize: 14,
    color: '#666',
  },actionButtonsContainer: {
    margin: 16,
    gap: 12,
  },
  adminMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 12,
  },  adminMessageText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    fontStyle: 'italic',
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },  dashboardButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dashboardActionContainer: {
    margin: 16,
    marginTop: 8,
  },
  dashboardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 8,
  },
  dashboardActionText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  suspendButton: {
    backgroundColor: '#ff6b6b',
  },
  activateButton: {
    backgroundColor: '#51cf66',
  },  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  suspendModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  suspendModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  suspendModalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
    minHeight: 80,
    marginBottom: 20,
  },
  suspendModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  suspendModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmSuspendButton: {
    backgroundColor: '#dc3545',
  },
  confirmUnsuspendButton: {
    backgroundColor: '#28a745',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UserManagement;
