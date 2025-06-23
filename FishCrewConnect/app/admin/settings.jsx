import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import HeaderBox from '../../components/HeaderBox';
import apiService from '../../services/api';

const AdminSettings = () => {
    const [settings, setSettings] = useState(null);
    const [adminActions, setAdminActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [updating, setUpdating] = useState({});
    
    // New state for system limits editing
    const [editingLimits, setEditingLimits] = useState(false);
    const [limitValues, setLimitValues] = useState({});
    const [savingLimits, setSavingLimits] = useState(false);    // Fetch system settings
    const fetchSettings = async () => {        try {
            const response = await apiService.admin.getSystemSettings();
            setSettings(response.systemConfig);
            setAdminActions(response.adminActions || []);
            
            // Initialize limit values for editing
            if (response.systemConfig?.limits) {
                setLimitValues({ ...response.systemConfig.limits });
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            Alert.alert('Error', 'Failed to load system settings');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchSettings();
    };    // Update a setting
    const updateSetting = async (settingKey, newValue) => {
        setUpdating(prev => ({ ...prev, [settingKey]: true }));
          try {
            await apiService.admin.updateSystemSettings(settingKey, newValue);
            
            // Update local state
            setSettings(prev => ({
                ...prev,
                features: {
                    ...prev.features,
                    [settingKey]: newValue
                }
            }));

            Alert.alert('Success', `${settingKey.replace(/_/g, ' ')} has been ${newValue ? 'enabled' : 'disabled'}`);
            
            // Refresh to get latest admin actions
            fetchSettings();
        } catch (error) {
            console.error('Error updating setting:', error);
            Alert.alert('Error', 'Failed to update setting');
        } finally {
            setUpdating(prev => ({ ...prev, [settingKey]: false }));
        }
    };

    // Update system limits
    const updateSystemLimits = async () => {
        setSavingLimits(true);
        try {
            // Validate all limit values
            const errors = [];
            Object.entries(limitValues).forEach(([key, value]) => {
                const numValue = parseInt(value);
                if (isNaN(numValue) || numValue < 1) {
                    errors.push(`${key.replace(/_/g, ' ')} must be a positive number`);
                }
                if (key === 'max_jobs_per_user' && numValue > 100) {
                    errors.push('Max jobs per user cannot exceed 100');
                }
                if (key === 'max_applications_per_job' && numValue > 500) {
                    errors.push('Max applications per job cannot exceed 500');
                }
                if (key === 'max_file_size_mb' && numValue > 100) {
                    errors.push('Max file size cannot exceed 100 MB');
                }
                if (key === 'max_messages_per_day' && numValue > 1000) {
                    errors.push('Max messages per day cannot exceed 1000');
                }
            });

            if (errors.length > 0) {
                Alert.alert('Validation Error', errors.join('\n'));
                return;
            }

            // Update each limit setting
            for (const [key, value] of Object.entries(limitValues)) {
                await apiService.admin.updateSystemSettings(key, parseInt(value));
            }

            // Update local state
            setSettings(prev => ({
                ...prev,
                limits: { ...limitValues }
            }));

            Alert.alert('Success', 'System limits updated successfully');
            setEditingLimits(false);
            
            // Refresh to get latest admin actions
            fetchSettings();
        } catch (error) {
            console.error('Error updating limits:', error);
            Alert.alert('Error', 'Failed to update system limits');
        } finally {
            setSavingLimits(false);
        }
    };

    if (loading) {
        return (
            <SafeScreenWrapper>
                <HeaderBox title="System Settings" />
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading system settings...</Text>
                </View>
            </SafeScreenWrapper>
        );
    }

    const renderFeatureToggle = (key, value, title, description) => (
        <View key={key} style={styles.settingItem}>
            <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{title}</Text>
                <Text style={styles.settingDescription}>{description}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={(newValue) => updateSetting(key, newValue)}
                disabled={updating[key]}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor={value ? '#ffffff' : '#9ca3af'}
            />
        </View>
    );    const renderLimitItem = (key, value, title, description) => {
        if (editingLimits) {
            return (
                <View key={key} style={styles.editableLimitItem}>
                    <Text style={styles.limitTitle}>{title}</Text>
                    <Text style={styles.limitDescription}>{description}</Text>
                    <TextInput
                        style={styles.limitInput}
                        value={limitValues[key]?.toString() || value?.toString() || ''}
                        onChangeText={(text) => setLimitValues(prev => ({
                            ...prev,
                            [key]: text
                        }))}
                        keyboardType="numeric"
                        placeholder="Enter limit value"
                    />
                </View>
            );
        } else {
            return (
                <View key={key} style={styles.limitItem}>
                    <Text style={styles.limitTitle}>{title}</Text>
                    <Text style={styles.limitDescription}>{description}</Text>
                    <Text style={styles.limitValue}>{value}</Text>
                </View>
            );
        }
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <SafeScreenWrapper>
            <HeaderBox title="System Settings" />
            
            <ScrollView 
                style={styles.container}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Platform Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Platform Information</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Platform Name:</Text>
                            <Text style={styles.infoValue}>{settings?.platform?.name}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Version:</Text>
                            <Text style={styles.infoValue}>{settings?.platform?.version}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Environment:</Text>
                            <Text style={[styles.infoValue, { 
                                color: settings?.platform?.environment === 'production' ? '#059669' : '#d97706' 
                            }]}>
                                {settings?.platform?.environment?.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Feature Toggles */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Feature Controls</Text>
                    <View style={styles.card}>
                        {settings?.features && Object.entries(settings.features).map(([key, value]) => {
                            const titles = {
                                user_registration_enabled: 'User Registration',
                                job_posting_enabled: 'Job Posting',
                                messaging_enabled: 'User Messaging',
                                notifications_enabled: 'Notifications',
                                email_notifications_enabled: 'Email Notifications'
                            };
                            
                            const descriptions = {
                                user_registration_enabled: 'Allow new users to register on the platform',
                                job_posting_enabled: 'Allow users to post new job listings',
                                messaging_enabled: 'Enable messaging between users',
                                notifications_enabled: 'Enable in-app notifications',
                                email_notifications_enabled: 'Send email notifications to users'
                            };

                            return renderFeatureToggle(
                                key, 
                                value, 
                                titles[key] || key.replace(/_/g, ' '), 
                                descriptions[key] || 'System feature control'
                            );
                        })}
                    </View>
                </View>                {/* System Limits */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>System Limits</Text>
                        {!editingLimits ? (
                            <TouchableOpacity 
                                style={styles.editButton}
                                onPress={() => setEditingLimits(true)}
                            >
                                <Text style={styles.editButtonText}>Edit</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.editActions}>
                                <TouchableOpacity 
                                    style={styles.cancelButton}
                                    onPress={() => {
                                        setEditingLimits(false);
                                        setLimitValues({ ...settings.limits });
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.saveButton, savingLimits && styles.savingButton]}
                                    onPress={updateSystemLimits}
                                    disabled={savingLimits}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {savingLimits ? 'Saving...' : 'Save'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                    
                    <View style={styles.card}>
                        {settings?.limits && Object.entries(settings.limits).map(([key, value]) => {
                            const titles = {
                                max_jobs_per_user: 'Max Jobs Per User',
                                max_applications_per_job: 'Max Applications Per Job',
                                max_file_size_mb: 'Max File Size (MB)',
                                max_messages_per_day: 'Max Messages Per Day'
                            };
                            
                            const descriptions = {
                                max_jobs_per_user: 'Maximum active jobs a user can post',
                                max_applications_per_job: 'Maximum applications allowed per job',
                                max_file_size_mb: 'Maximum file upload size in megabytes',
                                max_messages_per_day: 'Maximum messages a user can send per day'
                            };

                            return renderLimitItem(
                                key,
                                value,
                                titles[key] || key.replace(/_/g, ' '),
                                descriptions[key] || 'System limit configuration'
                            );
                        })}
                    </View>
                    
                    {editingLimits && (
                        <View style={styles.editingNotice}>
                            <Text style={styles.editingNoticeText}>
                                ⚠️ Changes will affect all users immediately. Please review carefully.
                            </Text>
                        </View>
                    )}
                </View>                {/* Database Information */}
                <View style={styles.section}>                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Database Statistics</Text>
                        <TouchableOpacity 
                            style={styles.smallRefreshButton}
                            onPress={onRefresh}
                        >
                            <Text style={styles.smallRefreshButtonText}>↻</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {/* Overall Statistics */}
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Database Name:</Text>
                            <Text style={styles.infoValue}>{settings?.database?.name}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Total Tables:</Text>
                            <Text style={styles.infoValue}>{settings?.database?.totalTables}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Total Records:</Text>
                            <Text style={styles.infoValue}>{settings?.database?.totalRows}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Total Size:</Text>
                            <Text style={styles.infoValue}>{settings?.database?.totalSizeMB} MB</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Last Updated:</Text>
                            <Text style={styles.infoValue}>
                                {new Date().toLocaleString()}
                            </Text>
                        </View>
                    </View>

                    {/* Individual Table Statistics */}
                    {settings?.database?.tables && settings.database.tables.length > 0 && (
                        <View style={styles.card}>
                            <Text style={styles.subsectionTitle}>Table Details</Text>
                            {settings.database.tables.map((table, index) => (
                                <View key={index} style={styles.tableItem}>
                                    <View style={styles.tableHeader}>
                                        <Text style={styles.tableName}>{table.table_name}</Text>
                                        <Text style={styles.tableSize}>{table.table_size_mb} MB</Text>
                                    </View>
                                    <View style={styles.tableStats}>
                                        <Text style={styles.tableRows}>
                                            {parseInt(table.table_rows).toLocaleString()} records
                                        </Text>
                                        <View style={styles.tableSizeBar}>
                                            <View 
                                                style={[
                                                    styles.tableSizeProgress, 
                                                    { 
                                                        width: `${Math.min((parseFloat(table.table_size_mb) / parseFloat(settings.database.totalSizeMB)) * 100, 100)}%` 
                                                    }
                                                ]} 
                                            />
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Database Health Indicators */}
                    <View style={styles.card}>
                        <Text style={styles.subsectionTitle}>Database Health</Text>
                        <View style={styles.healthIndicators}>
                            <View style={styles.healthItem}>
                                <View style={[styles.healthDot, { backgroundColor: '#10b981' }]} />
                                <Text style={styles.healthLabel}>Connection Status</Text>
                                <Text style={styles.healthValue}>Active</Text>
                            </View>
                            <View style={styles.healthItem}>
                                <View style={[styles.healthDot, { 
                                    backgroundColor: parseFloat(settings?.database?.totalSizeMB || 0) > 100 ? '#f59e0b' : '#10b981' 
                                }]} />
                                <Text style={styles.healthLabel}>Storage Usage</Text>
                                <Text style={styles.healthValue}>
                                    {parseFloat(settings?.database?.totalSizeMB || 0) > 100 ? 'High' : 'Normal'}
                                </Text>
                            </View>
                            <View style={styles.healthItem}>
                                <View style={[styles.healthDot, { 
                                    backgroundColor: parseInt(settings?.database?.totalRows || 0) > 10000 ? '#f59e0b' : '#10b981' 
                                }]} />
                                <Text style={styles.healthLabel}>Record Count</Text>
                                <Text style={styles.healthValue}>
                                    {parseInt(settings?.database?.totalRows || 0) > 10000 ? 'High' : 'Normal'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Recent Admin Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Admin Actions</Text>
                    <View style={styles.card}>
                        {adminActions && adminActions.length > 0 ? (
                            adminActions.slice(0, 5).map((action, index) => (
                                <View key={index} style={styles.actionItem}>
                                    <Text style={styles.actionText}>{action.action}</Text>
                                    <Text style={styles.actionAdmin}>by {action.admin}</Text>
                                    <Text style={styles.actionTime}>{formatTimestamp(action.timestamp)}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noDataText}>No recent admin actions</Text>
                        )}
                    </View>
                </View>

                {/* Refresh Button */}
                <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                    <Text style={styles.refreshButtonText}>Refresh Settings</Text>
                </TouchableOpacity>

                <View style={styles.bottomPadding} />
            </ScrollView>
        </SafeScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#6b7280',
    },
    section: {
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    infoCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    settingInfo: {
        flex: 1,
        marginRight: 16,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 14,
        color: '#6b7280',
    },
    limitItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    limitTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 4,
    },
    limitDescription: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 8,
    },
    limitValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#059669',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    infoLabel: {
        fontSize: 14,
        color: '#6b7280',
        flex: 1,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
        flex: 1,
        textAlign: 'right',
    },
    actionItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    actionText: {
        fontSize: 14,
        color: '#111827',
        marginBottom: 4,
    },
    actionAdmin: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 2,
    },
    actionTime: {
        fontSize: 12,
        color: '#9ca3af',
    },
    noDataText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        paddingVertical: 16,
    },
    refreshButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        marginHorizontal: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    refreshButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '500',
    },    bottomPadding: {
        height: 32,
    },
    // New styles for system limits editing
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    editButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    editButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14,
    },
    editActions: {
        flexDirection: 'row',
        gap: 8,
    },
    cancelButton: {
        backgroundColor: '#6b7280',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    cancelButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14,
    },
    saveButton: {
        backgroundColor: '#10b981',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    savingButton: {
        backgroundColor: '#6b7280',
    },
    saveButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14,
    },
    editableLimitItem: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    limitInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        marginTop: 8,
        backgroundColor: '#ffffff',
    },
    editingNotice: {
        backgroundColor: '#fef3c7',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
    },    editingNoticeText: {
        color: '#92400e',
        fontSize: 14,
        textAlign: 'center',
    },
    // Enhanced database statistics styles
    subsectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    tableItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    tableHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    tableName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#111827',
        flex: 1,
    },
    tableSize: {
        fontSize: 14,
        fontWeight: '600',
        color: '#059669',
    },
    tableStats: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    tableRows: {
        fontSize: 13,
        color: '#6b7280',
        flex: 1,
    },
    tableSizeBar: {
        flex: 2,
        height: 4,
        backgroundColor: '#e5e7eb',
        borderRadius: 2,
        marginLeft: 12,
    },
    tableSizeProgress: {
        height: '100%',
        backgroundColor: '#3b82f6',
        borderRadius: 2,
    },
    healthIndicators: {
        gap: 12,
    },
    healthItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    healthDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    healthLabel: {
        fontSize: 14,
        color: '#374151',
        flex: 1,
    },
    healthValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
    },
    smallRefreshButton: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    smallRefreshButtonText: {
        color: '#374151',
        fontSize: 16,
        fontWeight: '600',
    },
});

// Add display name for debugging
AdminSettings.displayName = 'AdminSettings';

export default AdminSettings;
