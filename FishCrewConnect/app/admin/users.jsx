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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
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
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [verifyingUserId, setVerifyingUserId] = useState(null);
  const [totalCounts, setTotalCounts] = useState({
    all: 0,
    fisherman: 0,
    boat_owner: 0,
    admin: 0,
    pending: 0,
    verified: 0
  });

  const userTypes = [
    { label: 'All Users', value: 'all' },
    { label: 'Fishermen', value: 'fisherman' },
    { label: 'Boat Owners', value: 'boat_owner' },
    { label: 'Admins', value: 'admin' }
  ];

  const verificationFilters = [
    { label: 'All Users', value: 'all' },
    { label: 'Pending Verification', value: 'pending' },
    { label: 'Verified Users', value: 'verified' }
  ];  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage.toString(),
        limit: '20',
        user_type: selectedUserType === 'all' ? undefined : selectedUserType,
        status: verificationFilter === 'all' ? undefined : verificationFilter,
        search: debouncedSearchQuery
      };

      console.log('Fetching users with params:', params);
      const response = await adminAPI.getAllUsers(params);
      console.log('API response:', {
        usersCount: response.users?.length,
        currentPage: response.pagination?.current_page,
        totalPages: response.pagination?.total_pages,
        totalUsers: response.pagination?.total_users
      });
      
      setUsers(response.users);
      setTotalPages(response.pagination.total_pages);
      
      // Make sure current page is in sync with API response
      if (response.pagination?.current_page && response.pagination.current_page !== currentPage) {
        console.log('Syncing current page from API:', response.pagination.current_page);
        setCurrentPage(response.pagination.current_page);
      }
      
      // Update total counts if available in response
      if (response.counts) {
        setTotalCounts(response.counts);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, selectedUserType, debouncedSearchQuery, verificationFilter]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
    }
  };  const performUserAction = async (action, userId) => {
    try {
      if (action === 'suspend') {
        await adminAPI.suspendUser(userId, suspendReason || 'No reason provided');
        Alert.alert('Success', 'User suspended successfully');
      } else if (action === 'unsuspend') {
        await adminAPI.unsuspendUser(userId, suspendReason || 'No reason provided');
        Alert.alert('Success', 'User unsuspended successfully');
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
  const renderUserItem = ({ item }) => (
    <TouchableOpacity style={[styles.userCard, item.status === 'suspended' && styles.suspendedUserCard]} onPress={() => handleUserPress(item)}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{item.name}</Text>
          <View style={styles.userBadges}>
            <View style={[styles.userTypeBadge, { backgroundColor: getUserTypeColor(item.user_type) }]}>
              <Text style={styles.userTypeBadgeText}>{item.user_type}</Text>
            </View>
            {item.verification_status === 'pending' && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>PENDING</Text>
              </View>
            )}
            {item.verification_status === 'verified' && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
              </View>
            )}
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
        
        {/* Verification Actions */}
        {item.verification_status === 'pending' && (
          <View style={styles.verificationActions}>
            <TouchableOpacity 
              style={[styles.verifyButton, verifyingUserId === item.user_id && styles.verifyButtonDisabled]}
              onPress={() => handleVerifyUser(item.user_id, item.name)}
              disabled={verifyingUserId === item.user_id}
            >
              {verifyingUserId === item.user_id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={styles.verifyButtonText}>Verify User</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
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
    <View style={styles.userTypeFilterContainer}>
      <Text style={styles.filterSectionTitle}>User Type:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.userTypeFilterScroll}>
        {userTypes.map((type) => {
          // Use total counts from backend instead of current page
          const typeCount = totalCounts[type.value] || 0;
          
          return (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.userTypeFilterChip,
                selectedUserType === type.value && styles.userTypeFilterChipActive
              ]}
              onPress={() => {
                setSelectedUserType(type.value);
                setCurrentPage(1);
              }}
            >
              <Text style={[
                styles.userTypeFilterText,
                selectedUserType === type.value && styles.userTypeFilterTextActive
              ]}>
                {type.label}
              </Text>
              {typeCount > 0 && (
                <View style={[
                  styles.userTypeFilterBadge,
                  selectedUserType === type.value && styles.userTypeFilterBadgeActive
                ]}>
                  <Text style={[
                    styles.userTypeFilterBadgeText,
                    selectedUserType === type.value && styles.userTypeFilterBadgeTextActive
                  ]}>
                    {typeCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const handlePageChange = async (newPage) => {
    if (newPage === currentPage || newPage < 1 || newPage > totalPages) {
      return;
    }
    
    console.log('Changing page from', currentPage, 'to', newPage);
    setCurrentPage(newPage);
    
    try {
      setLoading(true);
      const params = {
        page: newPage.toString(),
        limit: '20',
        user_type: selectedUserType === 'all' ? undefined : selectedUserType,
        status: verificationFilter === 'all' ? undefined : verificationFilter,
        search: debouncedSearchQuery
      };

      console.log('Fetching users with params:', params);
      const response = await adminAPI.getAllUsers(params);
      console.log('API response:', {
        usersCount: response.users?.length,
        currentPage: response.pagination?.current_page,
        totalPages: response.pagination?.total_pages,
        totalUsers: response.pagination?.total_users
      });
      
      setUsers(response.users || []);
      setTotalPages(response.pagination?.total_pages || 1);
      
      // Update total counts if available in response
      if (response.counts) {
        setTotalCounts(response.counts);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
      // Reset to previous page on error
      setCurrentPage(currentPage);
    } finally {
      setLoading(false);
    }
  };

  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      <TouchableOpacity
        style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
        onPress={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={24} color={currentPage === 1 ? '#ccc' : '#007AFF'} />
      </TouchableOpacity>
      
      <Text style={styles.paginationText}>
        Page {currentPage} of {totalPages}
      </Text>
      
      <TouchableOpacity
        style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
        onPress={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-forward" size={24} color={currentPage === totalPages ? '#ccc' : '#007AFF'} />
      </TouchableOpacity>
    </View>
  );

  const handleVerifyUser = async (userId, userName) => {
    Alert.alert(
      'Verify User',
      `Are you sure you want to verify ${userName}? This will grant them full access to the app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          style: 'default',
          onPress: async () => {
            try {
              setVerifyingUserId(userId);
              await adminAPI.verifyUser(userId, 'Verified by admin');
              Alert.alert('Success', `${userName} has been successfully verified and can now access the app.`);
              fetchUsers(); // Refresh the list
            } catch (error) {
              console.error('Error verifying user:', error);
              Alert.alert('Error', error.message || 'Failed to verify user');
            } finally {
              setVerifyingUserId(null);
            }
          }
        }
      ]
    );
  };



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
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results Indicator */}
        {debouncedSearchQuery.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <Text style={styles.searchResultsText}>
              {users.length > 0 
                ? `Found ${users.length} user${users.length === 1 ? '' : 's'} matching "${debouncedSearchQuery}"`
                : `No users found matching "${debouncedSearchQuery}"`
              }
            </Text>
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
              <Text style={styles.clearSearchText}>Clear search</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Filter Chips */}
        {renderFilterChips()}

        {/* Verification Status Filter */}
        <View style={styles.verificationFilterContainer}>
          <Text style={styles.filterSectionTitle}>Verification Status:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.verificationFilterScroll}>
            {verificationFilters.map((filter) => {
              // Use total counts from backend instead of current page
              const filterCount = filter.value === 'all' 
                ? totalCounts.all || 0
                : totalCounts[filter.value] || 0;
              
              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.verificationFilterChip,
                    verificationFilter === filter.value && styles.verificationFilterChipActive
                  ]}
                  onPress={() => {
                    setVerificationFilter(filter.value);
                    setCurrentPage(1);
                  }}
                >
                  <Text style={[
                    styles.verificationFilterText,
                    verificationFilter === filter.value && styles.verificationFilterTextActive
                  ]}>
                    {filter.label}
                  </Text>
                  {filterCount > 0 && (
                    <View style={[
                      styles.verificationFilterBadge,
                      verificationFilter === filter.value && styles.verificationFilterBadgeActive
                    ]}>
                      <Text style={[
                        styles.verificationFilterBadgeText,
                        verificationFilter === filter.value && styles.verificationFilterBadgeTextActive
                      ]}>
                        {filterCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Users List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : (
          <View style={styles.usersContainer}>
            <FlatList
              data={users}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.user_id.toString()}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              style={styles.usersList}
            />
            
            {/* Pagination */}
            {totalPages > 1 && renderPagination()}
          </View>
        )}
      </View>

      {/* User Detail Modal */}
      <Modal
        visible={userDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeScreenWrapper>
          <HeaderBox
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
                <View style={styles.userDetailHeader}>
                  <Text style={styles.userDetailName}>{selectedUser.name}</Text>
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
                  <Text style={styles.statsTitle}>Activity Stats</Text>
                  <View style={styles.statsRow}>
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
                  <TouchableOpacity
                    style={[styles.actionButton, styles.suspendButton]}
                    onPress={() => handleUserAction('suspend', selectedUser.user_id, selectedUser.name)}
                  >
                    <Ionicons name="ban" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Suspend User</Text>
                  </TouchableOpacity>
                )}
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
    backgroundColor: '#f8f9fa',
  },
  // Search Bar Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  // Search Results Indicator
  searchResultsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  searchResultsText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  clearSearchButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChipBadge: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 6,
  },
  filterChipBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterChipBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  filterChipBadgeTextActive: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  usersContainer: {
    flex: 1,
  },
  usersList: {
    flex: 1,
  },
  userCard: {
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
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paginationButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#f8f8f8',
    borderColor: '#ddd',
  },
  paginationText: {
    marginHorizontal: 20,
    fontSize: 16,
    fontWeight: '600',
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
  // Verification status badges
  pendingBadge: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  verifiedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Verification actions
  verificationActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  verifyButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  verifyButtonDisabled: {
    backgroundColor: '#ccc',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // User type filter section
  userTypeFilterContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  userTypeFilterScroll: {
    flexDirection: 'row',
  },
  userTypeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  userTypeFilterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  userTypeFilterText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  userTypeFilterTextActive: {
    color: '#fff',
  },
  userTypeFilterBadge: {
    backgroundColor: '#6c757d',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  userTypeFilterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  userTypeFilterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userTypeFilterBadgeTextActive: {
    color: '#fff',
  },
  // Verification filter section
  verificationFilterContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  verificationFilterScroll: {
    flexDirection: 'row',
  },
  verificationFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  verificationFilterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  verificationFilterText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  verificationFilterTextActive: {
    color: '#fff',
  },
  verificationFilterBadge: {
    backgroundColor: '#6c757d',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  verificationFilterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  verificationFilterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  verificationFilterBadgeTextActive: {
    color: '#fff',
  },
});

export default UserManagement;
