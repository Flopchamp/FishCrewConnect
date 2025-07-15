import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import HeaderBox from '../../components/HeaderBox';
import api from '../../services/api';
import pdfReportService from '../../services/pdfReportService';
import { SimpleBarChart, SimpleLineChart, SimplePieChart } from '../../components/Charts';

const Reports = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedType, setSelectedType] = useState('overview');
  const [analyticsData, setAnalyticsData] = useState({});
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const screenWidth = Dimensions.get('window').width;

  const periods = [
    { label: '7 Days', value: '7' },
    { label: '30 Days', value: '30' },
    { label: '90 Days', value: '90' },
    { label: '1 Year', value: '365' }
  ];

  const reportTypes = [
    { label: 'Overview', value: 'overview', icon: 'analytics' },
    { label: 'Users', value: 'users', icon: 'people' },
    { label: 'Jobs', value: 'jobs', icon: 'briefcase' },
    { label: 'Performance', value: 'performance', icon: 'trending-up' }
  ];
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);      const data = await api.admin.getAnalytics({
        period: selectedPeriod,
        type: selectedType
      });
      console.log('Analytics data received:', JSON.stringify(data, null, 2));
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedType]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const renderPeriodSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>Time Period:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.value}
            style={[
              styles.selectorChip,
              selectedPeriod === period.value && styles.selectorChipActive
            ]}
            onPress={() => setSelectedPeriod(period.value)}
          >
            <Text style={[
              styles.selectorChipText,
              selectedPeriod === period.value && styles.selectorChipTextActive
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTypeSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>Report Type:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {reportTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeChip,
              selectedType === type.value && styles.typeChipActive
            ]}
            onPress={() => setSelectedType(type.value)}
          >
            <Ionicons 
              name={type.icon} 
              size={16} 
              color={selectedType === type.value ? '#fff' : '#666'} 
            />
            <Text style={[
              styles.typeChipText,
              selectedType === type.value && styles.typeChipTextActive
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );  const renderOverviewReport = () => {
    if (!analyticsData.overview) return null;

    const { userGrowth, jobTrends, applicationTrends } = analyticsData.overview;

    // Prepare data for user growth chart
    const prepareUserGrowthData = () => {
      if (!userGrowth || userGrowth.length === 0) {
        return {
          labels: ['No Data'],
          datasets: [{ data: [0] }]
        };
      }      // Group by date and sum users
      const dataByDate = {};
      userGrowth.forEach(item => {
        const date = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dataByDate[date] = (dataByDate[date] || 0) + item.users;
      });

      const labels = Object.keys(dataByDate).slice(-7); // Last 7 data points
      const data = Object.values(dataByDate).slice(-7);

      return {
        labels,
        datasets: [
          {
            data,
            color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
            strokeWidth: 2
          }
        ]
      };
    };    // Prepare data for job trends pie chart
    const prepareJobTrendsData = () => {
      if (!jobTrends || !Array.isArray(jobTrends) || jobTrends.length === 0) {
        return [];
      }

      const statusCounts = {};
      jobTrends.forEach((item, index) => {
        if (!item || typeof item !== 'object') {
          return;
        }
        
        // Ensure count is a valid number
        let count;
        if (typeof item.count === 'number' && !isNaN(item.count)) {
          count = item.count;
        } else if (typeof item.count === 'string') {
          count = parseInt(item.count, 10);
          if (isNaN(count)) count = 0;
        } else {
          count = 0;
        }
        
        if (item.status && typeof item.status === 'string') {
          statusCounts[item.status] = (statusCounts[item.status] || 0) + count;
        }
      });

      const colors = {
        'open': '#4CAF50',
        'in_progress': '#2196F3',
        'filled': '#FF9800',
        'completed': '#9C27B0',
        'cancelled': '#F44336'
      };

      const pieData = Object.entries(statusCounts).map(([status, count]) => {
        // Ensure count is a valid number for the pie chart
        const finalCount = typeof count === 'number' && !isNaN(count) ? count : 0;
        
        return {
          name: status.replace('_', ' ').toUpperCase(),
          population: finalCount,
          color: colors[status] || '#666',
          legendFontColor: '#333',
          legendFontSize: 12
        };
      });
      
      // Final validation
      const validPieData = pieData.filter(item => 
        item.population != null && 
        typeof item.population === 'number' && 
        !isNaN(item.population) && 
        item.population >= 0
      );
      
      return validPieData;
    };

    const chartConfig = {
      backgroundGradientFrom: '#fff',
      backgroundGradientTo: '#fff',
      color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
      strokeWidth: 2,
      barPercentage: 0.5,
      useShadowColorFromDataset: false,
      decimalPlaces: 0
    };

    return (
      <View style={styles.reportSection}>
        <Text style={styles.sectionTitle}>Overview Analytics</Text>
        
        {/* User Growth Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>User Growth Trend</Text>          {userGrowth && userGrowth.length > 0 ? (
            <SimpleLineChart
              data={prepareUserGrowthData()}
              width={screenWidth - 64}
              height={220}
              config={chartConfig}
            />
          ) : (
            <View style={styles.chartPlaceholder}>
              <Ionicons name="people" size={40} color="#007AFF" />
              <Text style={styles.chartData}>No user growth data available</Text>
            </View>
          )}
        </View>

        {/* Job Trends Pie Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Job Status Distribution</Text>          {jobTrends && jobTrends.length > 0 ? (
            <SimplePieChart
              data={prepareJobTrendsData()}
              width={screenWidth - 64}
              height={220}
            />
          ) : (
            <View style={styles.chartPlaceholder}>
              <Ionicons name="briefcase" size={40} color="#4CAF50" />
              <Text style={styles.chartData}>No job trend data available</Text>
            </View>
          )}
        </View>        {/* Application Trends Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Application Activity</Text>          {applicationTrends && applicationTrends.length > 0 ? (
            <SimpleBarChart
              data={{
                labels: applicationTrends.slice(-6).map(item => 
                  new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                ),
                datasets: [{
                  data: applicationTrends.slice(-6).map(item => item.applications || 0),
                  color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`
                }]
              }}
              width={screenWidth - 64}
              height={220}
              config={{
                color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
                strokeWidth: 2,
              }}
            />
          ) : (
            <View style={styles.chartPlaceholder}>
              <Ionicons name="document" size={40} color="#FF9800" />
              <Text style={styles.chartData}>No application data available</Text>
            </View>
          )}
        </View>
      </View>
    );
  };  const renderUsersReport = () => {
    if (!analyticsData.users) return null;

    const { usersByType, usersByMonth } = analyticsData.users;    // Prepare data for user type bar chart
    const prepareUserTypeData = () => {
      if (!usersByType || !Array.isArray(usersByType) || usersByType.length === 0) {
        return {
          labels: ['No Data'],
          datasets: [{ data: [0] }]
        };
      }

      // Filter and validate data with enhanced error handling
      const validUsers = usersByType.filter(item => {
        return item && 
               typeof item === 'object' && 
               item.user_type && 
               typeof item.user_type === 'string' &&
               item.total !== null && 
               item.total !== undefined;
      });
      
      if (validUsers.length === 0) {
        return {
          labels: ['No Data'],
          datasets: [{ data: [0] }]
        };
      }

      // Process labels with validation
      const labels = validUsers.map(item => {
        const userType = String(item.user_type || 'Unknown');
        return userType.replace(/_/g, ' ').toUpperCase();
      });
      
      // Process data with enhanced validation
      const data = validUsers.map((item, index) => {
        let total = 0;
        
        if (typeof item.total === 'number') {
          if (!isNaN(item.total) && isFinite(item.total)) {
            total = item.total;
          }
        } else if (typeof item.total === 'string') {
          const trimmed = item.total.trim();
          if (trimmed !== '') {
            const parsed = parseInt(trimmed, 10);
            if (!isNaN(parsed) && isFinite(parsed)) {
              total = parsed;
            }
          }
        }
        
        // Ensure non-negative integer
        return Math.max(0, Math.floor(total));
      });

      // Ensure we have valid data
      const hasValidData = data.some(val => val > 0);
      if (!hasValidData) {
        return {
          labels: ['No Data'],
          datasets: [{ data: [0] }]
        };
      }

      // Final validation - ensure arrays are same length
      const minLength = Math.min(labels.length, data.length);
      const finalLabels = labels.slice(0, minLength);
      const finalData = data.slice(0, minLength);

      return {
        labels: finalLabels,
        datasets: [
          {
            data: finalData,
            color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`
          }
        ]
      };
    };

    const chartConfig = {
      backgroundGradientFrom: '#fff',
      backgroundGradientTo: '#fff',
      color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
      strokeWidth: 2,
      barPercentage: 0.7,
      useShadowColorFromDataset: false,
      decimalPlaces: 0
    };

    return (
      <View style={styles.reportSection}>
        <Text style={styles.sectionTitle}>User Analytics</Text>
          <View style={styles.statsGrid}>
          {usersByType?.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={styles.statNumber}>{stat.total || 0}</Text>
              <Text style={styles.statLabel}>{stat.user_type}</Text>
              <Text style={styles.statSubtext}>
                Total users
              </Text>
            </View>
          ))}
        </View>

        {/* User Type Distribution Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>User Distribution by Type</Text>          {usersByType && usersByType.length > 0 ? (
            <SimpleBarChart
              data={prepareUserTypeData()}
              width={screenWidth - 64}
              height={220}
              config={chartConfig}
            />
          ) : (
            <View style={styles.chartPlaceholder}>
              <Ionicons name="people" size={40} color="#2E7D32" />
              <Text style={styles.chartData}>No user type data available</Text>
            </View>
          )}
        </View>        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Monthly User Growth (Last 6 Months)</Text>          {usersByMonth && usersByMonth.length > 0 ? (            <SimpleLineChart              data={(() => {
                // Group by month and sum counts with robust validation
                const monthData = {};
                
                usersByMonth.forEach(item => {
                  if (item && item.month) {
                    try {                      // Create a proper date object for sorting and better label formatting
                      const fullDate = new Date(item.month + '-01');
                      const monthLabel = fullDate.toLocaleDateString('en-US', { month: 'short' });
                      const sortKey = item.month; // Keep original YYYY-MM for sorting
                      
                      let userCount = 0;
                      
                      if (typeof item.users === 'number' && !isNaN(item.users) && isFinite(item.users)) {
                        userCount = item.users;
                      } else if (typeof item.users === 'string' && item.users.trim() !== '') {
                        const parsed = parseInt(item.users, 10);
                        userCount = !isNaN(parsed) && isFinite(parsed) ? parsed : 0;
                      }
                      
                      monthData[sortKey] = {
                        label: monthLabel,
                        value: (monthData[sortKey]?.value || 0) + userCount
                      };
                    } catch (e) {
                      console.warn('Error processing month data:', item, e);
                    }
                  }
                });
                  // Sort months chronologically
                const sortedMonths = Object.keys(monthData).sort();
                
                // For line charts, we want at least 2 points for a meaningful trend
                // If we have only 1 month, create a minimal 2-point chart
                if (sortedMonths.length === 1) {
                  const singleMonth = sortedMonths[0];
                  const currentValue = monthData[singleMonth].value;
                  
                  // Create a previous month with 0 users to show growth from baseline
                  const prevDate = new Date(singleMonth + '-01');
                  prevDate.setMonth(prevDate.getMonth() - 1);
                  const prevMonthLabel = prevDate.toLocaleDateString('en-US', { month: 'short' });
                  
                  return {
                    labels: [prevMonthLabel, monthData[singleMonth].label],
                    datasets: [{
                      data: [0, currentValue],
                      color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                      strokeWidth: 3
                    }]
                  };
                }
                
                // Use all available months (up to 6 for readability)
                const displayMonths = sortedMonths.slice(-6);
                const validLabels = displayMonths.map(key => monthData[key].label);
                const validValues = displayMonths.map(key => monthData[key].value)
                  .map(val => typeof val === 'number' && !isNaN(val) && isFinite(val) ? Math.max(0, val) : 0);
                
                // Ensure we have at least one data point
                if (validLabels.length === 0 || validValues.length === 0) {
                  return {
                    labels: ['No Data'],
                    datasets: [{ data: [0] }]
                  };
                }
                
                return {
                  labels: validLabels,
                  datasets: [{
                    data: validValues,
                    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                    strokeWidth: 3
                  }]
                };
              })()}
              width={screenWidth - 64}
              height={220}
              config={{
                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                strokeWidth: 2,
              }}
            />
          ) : (
            <View style={styles.chartPlaceholder}>
              <Ionicons name="trending-up" size={40} color="#2196F3" />
              <Text style={styles.chartData}>No monthly growth data available</Text>
            </View>
          )}
        </View>
      </View>
    );
  };
  const renderJobsReport = () => {
    if (!analyticsData.jobs) return null;

    const { jobsByStatus, jobsByLocation, jobCreationTrends, jobMetrics } = analyticsData.jobs;

    // Prepare job creation trends data for line chart
    const prepareJobTrendsData = () => {
      if (!jobCreationTrends || jobCreationTrends.length === 0) {
        return {
          labels: ['No Data'],
          datasets: [{ data: [0] }]
        };
      }

      // Group by date and sum total jobs created
      const dataByDate = {};
      jobCreationTrends.forEach(item => {
        const date = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dataByDate[date] = (dataByDate[date] || 0) + (item.jobs_created || 0);
      });

      const labels = Object.keys(dataByDate).slice(-7); // Last 7 data points
      const data = Object.values(dataByDate).slice(-7);

      // Ensure we have at least 2 data points for line chart
      if (labels.length === 1) {
        labels.unshift('Previous');
        data.unshift(0);
      }

      return {
        labels,
        datasets: [{
          data,
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          strokeWidth: 2
        }]
      };
    };

    return (
      <View style={styles.reportSection}>
        <Text style={styles.sectionTitle}>Job Analytics</Text>
        
        {/* Job Metrics Overview */}
        {jobMetrics && (
          <View style={styles.metricsOverview}>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>{jobMetrics.total_jobs || 0}</Text>
              <Text style={styles.metricLabel}>Total Jobs</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>{jobMetrics.open_jobs || 0}</Text>
              <Text style={styles.metricLabel}>Open Jobs</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>{jobMetrics.completed_jobs || 0}</Text>
              <Text style={styles.metricLabel}>Completed</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>
                {jobMetrics.avg_days_to_complete ? Math.round(jobMetrics.avg_days_to_complete) : 'N/A'}
              </Text>
              <Text style={styles.metricLabel}>Avg Days</Text>
            </View>
          </View>
        )}

        {/* Job Status Cards */}
        <View style={styles.statsGrid}>
          {jobsByStatus?.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={styles.statNumber}>{stat.total}</Text>
              <Text style={styles.statLabel}>{stat.status.replace('_', ' ').toUpperCase()}</Text>
              <Text style={styles.statSubtext}>
                Avg: {Math.round(parseFloat(stat.avg_duration_days) || 0)} days
              </Text>
            </View>
          ))}
        </View>

        {/* Job Creation Trends Line Chart */}
        {jobCreationTrends && jobCreationTrends.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Job Creation Trends</Text>
            <SimpleLineChart
              data={prepareJobTrendsData()}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                strokeWidth: 2,
                style: {
                  borderRadius: 16,
                },
              }}
            />
          </View>
        )}

        {/* Job Status Distribution Pie Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Job Status Distribution</Text>
          {jobsByStatus && jobsByStatus.length > 0 ? (
            <SimplePieChart
              data={jobsByStatus.map((item, index) => ({
                name: item.status.replace('_', ' ').toUpperCase(),
                population: item.total || 0,
                color: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336'][index % 5],
                legendFontColor: '#333',
                legendFontSize: 12
              }))}
              width={screenWidth - 64}
              height={220}
            />
          ) : (
            <View style={styles.chartPlaceholder}>
              <Ionicons name="pie-chart" size={40} color="#4CAF50" />
              <Text style={styles.chartData}>No job status data available</Text>
            </View>
          )}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Top Job Locations</Text>
          {jobsByLocation && jobsByLocation.length > 0 ? (
            <View>
              <SimpleBarChart
                data={{
                  labels: jobsByLocation.slice(0, 5).map(item => 
                    item.location.length > 12 ? item.location.substring(0, 12) + '...' : item.location
                  ),
                  datasets: [{
                    data: jobsByLocation.slice(0, 5).map(item => item.job_count || 0),
                    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`
                  }]
                }}
                width={screenWidth - 64}
                height={220}
                config={{
                  color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                  strokeWidth: 2,
                }}
              />
              <View style={styles.locationList}>
                {jobsByLocation?.slice(0, 5).map((location, index) => (
                  <View key={index} style={styles.locationItem}>
                    <Text style={styles.locationName}>{location.location}</Text>
                    <Text style={styles.locationCount}>
                      {location.job_count} jobs ({location.filled_count} filled, {location.open_count} open)
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.chartPlaceholder}>
              <Ionicons name="location" size={40} color="#4CAF50" />
              <Text style={styles.chartData}>No location data available</Text>
            </View>
          )}
        </View>
      </View>
    );
  };
  const renderPerformanceReport = () => {
    if (!analyticsData.performance) return null;

    const { conversionRates, messageActivity, messageStats, performanceMetrics, engagementMetrics, applicationTrends } = analyticsData.performance;

    // Prepare application trends data for line chart
    const prepareApplicationTrendsData = () => {
      if (!applicationTrends || applicationTrends.length === 0) {
        return {
          labels: ['No Data'],
          datasets: [{ data: [0] }]
        };
      }

      const labels = applicationTrends.map(item => 
        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      );
      const data = applicationTrends.map(item => item.applications || 0);

      // Ensure we have at least 2 data points for line chart
      if (labels.length === 1) {
        labels.unshift('Previous');
        data.unshift(0);
      }

      return {
        labels,
        datasets: [{
          data,
          color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
          strokeWidth: 2
        }]
      };
    };

    // Prepare message activity data for line chart
    const prepareMessageActivityData = () => {
      if (!messageActivity || messageActivity.length === 0) {
        return {
          labels: ['No Data'],
          datasets: [{ data: [0] }]
        };
      }

      const labels = messageActivity.map(item => 
        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      );
      const data = messageActivity.map(item => item.message_count || 0);

      // Ensure we have at least 2 data points for line chart
      if (labels.length === 1) {
        labels.unshift('Previous');
        data.unshift(0);
      }

      return {
        labels,
        datasets: [{
          data,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
          strokeWidth: 2
        }]
      };
    };

    return (
      <View style={styles.reportSection}>
        <Text style={styles.sectionTitle}>Performance Analytics</Text>
        
        {/* Performance Metrics Overview */}
        {performanceMetrics && (
          <View style={styles.metricsOverview}>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>{performanceMetrics.total_jobs_posted || 0}</Text>
              <Text style={styles.metricLabel}>Jobs Posted</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>{performanceMetrics.total_applications_received || 0}</Text>
              <Text style={styles.metricLabel}>Applications</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>{performanceMetrics.applications_accepted || 0}</Text>
              <Text style={styles.metricLabel}>Accepted</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricNumber}>
                {performanceMetrics.avg_job_completion_days ? Math.round(parseFloat(performanceMetrics.avg_job_completion_days)) : 'N/A'}
              </Text>
              <Text style={styles.metricLabel}>Avg Days</Text>
            </View>
          </View>
        )}

        {/* Engagement Metrics */}
        {engagementMetrics && (
          <View style={styles.performanceGrid}>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceStatus}>Active Users</Text>
              <Text style={styles.performanceNumber}>
                {(engagementMetrics.active_fishermen || 0) + (engagementMetrics.active_boat_owners || 0)}
              </Text>
              <Text style={styles.performanceLabel}>Total Active</Text>
              <Text style={styles.performanceSubtext}>
                {engagementMetrics.active_fishermen || 0} fishermen, {engagementMetrics.active_boat_owners || 0} boat owners
              </Text>
            </View>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceStatus}>Engagement</Text>
              <Text style={styles.performanceNumber}>
                {Math.round(((engagementMetrics.users_applied || 0) / Math.max(engagementMetrics.active_fishermen || 1, 1)) * 100)}%
              </Text>
              <Text style={styles.performanceLabel}>Application Rate</Text>
              <Text style={styles.performanceSubtext}>
                {engagementMetrics.users_applied || 0} users applied
              </Text>
            </View>
            <View style={styles.performanceCard}>
              <Text style={styles.performanceStatus}>Messaging</Text>
              <Text style={styles.performanceNumber}>{messageStats?.total_messages || 0}</Text>
              <Text style={styles.performanceLabel}>Messages Sent</Text>
              <Text style={styles.performanceSubtext}>
                Avg: {messageStats?.avg_message_length ? Math.round(parseFloat(messageStats.avg_message_length)) : 0} chars
              </Text>
            </View>
          </View>
        )}

        {/* Conversion Rates Cards */}
        <View style={styles.performanceGrid}>
          {conversionRates?.map((rate, index) => (
            <View key={index} style={styles.performanceCard}>
              <Text style={styles.performanceStatus}>{rate.status.replace('_', ' ').toUpperCase()}</Text>
              <Text style={styles.performanceNumber}>
                {Math.round(((rate.jobs_with_applications || 0) / (rate.total_jobs || 1)) * 100)}%
              </Text>
              <Text style={styles.performanceLabel}>Application Rate</Text>
              <Text style={styles.performanceSubtext}>
                {rate.total_applications || 0} apps on {rate.total_jobs || 0} jobs
              </Text>
            </View>
          ))}
        </View>

        {/* Application Trends Line Chart */}
        {applicationTrends && applicationTrends.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Application Trends</Text>
            <SimpleLineChart
              data={prepareApplicationTrendsData()}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
                strokeWidth: 2,
                style: {
                  borderRadius: 16,
                },
              }}
            />
          </View>
        )}

        {/* Conversion Rates Bar Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Application Conversion Rates by Status</Text>
          {conversionRates && conversionRates.length > 0 ? (
            <SimpleBarChart
              data={{
                labels: conversionRates.map(item => {
                  // Better label formatting for status names
                  let status = item.status.replace(/_/g, ' ');
                  // Capitalize first letter of each word
                  status = status.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                  // Shorten common long words
                  status = status
                    .replace('Application', 'App')
                    .replace('Interview', 'Int')
                    .replace('Completed', 'Done')
                    .replace('Pending', 'Pend');
                  return status;
                }),
                datasets: [{
                  data: conversionRates.map(item => {
                    const totalJobs = item.total_jobs || 1;
                    const jobsWithApplications = item.jobs_with_applications || 0;
                    return Math.round((jobsWithApplications / totalJobs) * 100);
                  }),
                  color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`
                }]
              }}
              width={screenWidth - 64}
              height={220}
              config={{
                color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
                strokeWidth: 2,
              }}
            />
          ) : (
            <View style={styles.chartPlaceholder}>
              <Ionicons name="bar-chart" size={40} color="#9C27B0" />
              <Text style={styles.chartData}>No conversion data available</Text>
            </View>
          )}
        </View>

        {/* Message Activity Line Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Message Activity</Text>
          {messageActivity && messageActivity.length > 0 ? (
            <SimpleLineChart
              data={prepareMessageActivityData()}
              width={screenWidth - 64}
              height={220}
              config={{
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                strokeWidth: 2,
              }}
            />
          ) : (
            <View style={styles.chartPlaceholder}>
              <Ionicons name="chatbubbles" size={40} color="#4CAF50" />
              <Text style={styles.chartData}>No message activity data available</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderReport = () => {
    switch (selectedType) {
      case 'overview':
        return renderOverviewReport();
      case 'users':
        return renderUsersReport();
      case 'jobs':
        return renderJobsReport();
      case 'performance':
        return renderPerformanceReport();
      default:
        return null;
    }
  };

  const handleShareReport = async () => {
    setGeneratingPDF(true);
    try {
      console.log('🔄 Starting PDF report generation...', selectedType);
      
      // Generate PDF report using the new service
      const result = await pdfReportService.generateAndShareReport(
        selectedType, 
        analyticsData, 
        {
          title: `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Analytics Report`,
          period: `${selectedPeriod} days`,
          dateRange: selectedPeriod
        }
      );
      
      if (result.success) {
        Alert.alert(
          'Success',
          result.message,
          [{ text: 'OK', style: 'default' }]
        );
      }
      
    } catch (error) {
      console.error('❌ Error generating PDF report:', error);
      Alert.alert(
        'Error', 
        'Failed to generate PDF report. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <SafeScreenWrapper>
      <HeaderBox 
        title="Reports & Analytics" 
        leftComponent={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        }
      />
      
      <View style={styles.container}>
        {renderPeriodSelector()}
        {renderTypeSelector()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {renderReport()}
          </ScrollView>
        )}

        {/* Share Report Button */}
        <View style={styles.shareButtonContainer}>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={handleShareReport}
            disabled={generatingPDF}
          >
            <Ionicons name="share-social" size={16} color="#fff" />
            <Text style={styles.shareButtonText}>
              {generatingPDF ? 'Generating PDF...' : 'Share Report'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  selectorContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  selectorChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectorChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  selectorChipText: {
    fontSize: 14,
    color: '#666',
  },
  selectorChipTextActive: {
    color: '#fff',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 6,
  },
  typeChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeChipText: {
    fontSize: 14,
    color: '#666',
  },
  typeChipTextActive: {
    color: '#fff',
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
  content: {
    flex: 1,
  },
  reportSection: {
    padding: 16,
  },  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  metricsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  metricCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  metricLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  chartPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  chartData: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  statSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  locationList: {
    gap: 8,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  locationCount: {
    fontSize: 12,
    color: '#666',
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  performanceCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    flex: 1,
    minWidth: 140,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  performanceStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  performanceNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
  },
  performanceSubtext: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  shareButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    elevation: 2,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
});

export default Reports;
