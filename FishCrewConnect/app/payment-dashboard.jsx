import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import SafeScreenWrapper from '../components/SafeScreenWrapper';
import HeaderBox from '../components/HeaderBox';

const PaymentDashboard = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentStats, setPaymentStats] = useState({
    totalPayments: 0,
    completedPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
    totalAmount: 0,
    totalEarnings: 0,
    platformCommission: 0,
    recentPayments: []
  });

  const fetchPaymentDashboard = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const response = await apiService.payments.getPaymentHistory({ limit: 100 });
      const payments = response.payments || [];
      
      const stats = {
        totalPayments: payments.length,
        completedPayments: payments.filter(p => p.status === 'completed').length,
        pendingPayments: payments.filter(p => p.status === 'pending').length,
        failedPayments: payments.filter(p => p.status === 'failed').length,
        totalAmount: 0,
        totalEarnings: 0,
        platformCommission: 0,
        recentPayments: payments.slice(0, 5)
      };

      if (user?.user_type === 'fisherman') {
        stats.totalEarnings = payments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + parseFloat(p.fisherman_amount || 0), 0);
        stats.totalAmount = stats.totalEarnings;
      } else {
        stats.totalAmount = payments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);
        stats.platformCommission = payments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + parseFloat(p.platform_commission || 0), 0);
      }

      setPaymentStats(stats);
    } catch (error) {
      console.error('Error fetching payment dashboard:', error);
      Alert.alert('Error', 'Failed to load payment data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.user_type]);

  useEffect(() => {
    fetchPaymentDashboard();
  }, [fetchPaymentDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPaymentDashboard(false);
  };

  const formatCurrency = (amount) => {
    return `KSH ${parseFloat(amount).toLocaleString()}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'failed': return '#F44336';
      default: return '#666';
    }
  };

  const generatePaymentReport = async () => {
    try {
      Alert.alert(
        'Generate Payment Report',
        'Choose the time period for your payment report:',
        [
          {
            text: 'Last 7 Days',
            onPress: () => generatePDFReport('7')
          },
          {
            text: 'Last 30 Days',
            onPress: () => generatePDFReport('30')
          },
          {
            text: 'Last 90 Days',
            onPress: () => generatePDFReport('90')
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Error in generatePaymentReport:', error);
    }
  };

  const generatePDFReport = async (dateRange) => {
    try {
      console.log('🔄 Generating payment PDF report for', dateRange, 'days');
      
      // Show loading alert
      const loadingAlert = Alert.alert(
        'Generating Report',
        'Please wait while we generate your payment report...',
        [],
        { cancelable: false }
      );

      // Prepare payment data for PDF
      const reportData = {
        total_transactions: paymentStats.totalPayments,
        completed_transactions: paymentStats.completedPayments,
        pending_transactions: paymentStats.pendingPayments,
        failed_transactions: paymentStats.failedPayments,
        total_revenue: paymentStats.totalAmount,
        total_commission: paymentStats.platformCommission,
        user_type: user?.user_type,
        user_name: user?.name || 'User',
        recent_payments: paymentStats.recentPayments
      };

      // Generate PDF using the service
      const result = await pdfReportService.generateAndShareReport(
        'payments',
        reportData,
        {
          title: 'Payment Dashboard Report',
          period: `${dateRange} days`,
          dateRange: dateRange
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
      console.error('❌ Error generating payment PDF:', error);
      Alert.alert(
        'Error',
        'Failed to generate payment report. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const generateDetailedPDFReport = async () => {
    try {
      setLoading(true);
      
      // Fetch all payment data
      const response = await apiService.payments.getPaymentHistory({ limit: 1000 });
      const payments = response.payments || [];
      
      if (payments.length === 0) {
        Alert.alert('No Data', 'No payment data available to export.');
        return;
      }

      const reportDate = new Date().toLocaleDateString();
      const userType = user?.user_type === 'fisherman' ? 'Fisherman' : 'Boat Owner';
      
      // Generate payment rows for the table
      const paymentRows = payments.map(payment => {
        const date = new Date(payment.created_at).toLocaleDateString();
        const amount = user?.user_type === 'fisherman' 
          ? payment.fisherman_amount || '0'
          : payment.total_amount || '0';
        const otherParty = user?.user_type === 'fisherman' 
          ? payment.boat_owner_name || 'N/A'
          : payment.fisherman_name || 'N/A';
        
        const statusColor = getStatusColor(payment.status);
        const statusText = payment.status.charAt(0).toUpperCase() + payment.status.slice(1);
        
        return `<tr>
          <td>${date}</td>
          <td>${payment.job_title || 'N/A'}</td>
          <td>${otherParty}</td>
          <td>KSH ${parseFloat(amount).toLocaleString()}</td>
          <td>${payment.platform_commission ? 'KSH ' + parseFloat(payment.platform_commission).toLocaleString() : 'N/A'}</td>
          <td><span class="status-badge" style="background-color: ${statusColor};">${statusText}</span></td>
        </tr>`;
      }).join('');

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FishCrewConnect Payment Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.4; 
      color: #333; 
      padding: 20px;
      background-color: #fff;
    }
    .header { 
      text-align: center; 
      margin-bottom: 30px; 
      border-bottom: 2px solid #44DBE9;
      padding-bottom: 20px;
    }
    .logo { 
      color: #44DBE9; 
      font-size: 28px; 
      font-weight: bold; 
      margin-bottom: 10px;
    }
    .report-title { 
      color: #333; 
      font-size: 22px; 
      margin: 10px 0; 
      font-weight: bold;
    }
    .report-date {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    .user-info { 
      background-color: #f8f9fa; 
      padding: 20px; 
      border-radius: 8px; 
      margin-bottom: 30px;
      border-left: 4px solid #44DBE9;
    }
    .user-info h3 {
      color: #44DBE9;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .stats-section {
      margin-bottom: 30px;
    }
    .stats-title {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-bottom: 15px;
    }
    .stats-grid { 
      display: flex;
      flex-wrap: wrap;
      gap: 15px; 
      margin-bottom: 20px; 
    }
    .stat-card { 
      background-color: #f8f9fa; 
      padding: 20px; 
      border-radius: 8px; 
      text-align: center;
      flex: 1;
      min-width: 150px;
      border-left: 4px solid #44DBE9;
    }
    .stat-number { 
      font-size: 24px; 
      font-weight: bold; 
      color: #44DBE9; 
      display: block;
      margin-bottom: 5px;
    }
    .stat-label { 
      font-size: 14px; 
      color: #666; 
    }
    .table-section {
      margin-top: 30px;
    }
    .table-title {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-bottom: 15px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 10px;
      background-color: #fff;
    }
    th { 
      background-color: #44DBE9; 
      color: white; 
      padding: 12px 8px; 
      text-align: left;
      font-weight: bold;
      font-size: 14px;
    }
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #ddd;
      font-size: 12px;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      color: white;
      font-size: 11px;
      font-weight: bold;
    }
    .footer { 
      margin-top: 40px; 
      text-align: center; 
      font-size: 12px; 
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
    .footer p {
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">FishCrewConnect</div>
    <div class="report-title">Detailed Payment Report</div>
    <div class="report-date">Generated on ${reportDate}</div>
  </div>
  
  <div class="user-info">
    <h3>Report Information</h3>
    <p><strong>User:</strong> ${user?.name || 'N/A'} (${userType})</p>
    <p><strong>User ID:</strong> ${user?.id || 'N/A'}</p>
    <p><strong>Report Period:</strong> All Time</p>
    <p><strong>Total Records:</strong> ${payments.length} payments</p>
  </div>
  
  <div class="stats-section">
    <div class="stats-title">Payment Overview</div>
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-number">${paymentStats.totalPayments}</span>
        <span class="stat-label">Total Payments</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">${paymentStats.completedPayments}</span>
        <span class="stat-label">Completed</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">${paymentStats.pendingPayments}</span>
        <span class="stat-label">Pending</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">${paymentStats.failedPayments}</span>
        <span class="stat-label">Failed</span>
      </div>
    </div>
  </div>
  
  <div class="table-section">
    <div class="table-title">Complete Payment History</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Job Title</th>
          <th>${user?.user_type === 'fisherman' ? 'Boat Owner' : 'Fisherman'}</th>
          <th>${user?.user_type === 'fisherman' ? 'Amount Earned' : 'Total Amount'}</th>
          <th>Platform Fee</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${paymentRows}
      </tbody>
    </table>
  </div>
  
  <div class="footer">
    <p><strong>FishCrewConnect Payment System</strong></p>
    <p>This report was generated automatically on ${reportDate}</p>
    <p>For support and inquiries, contact: support@fishcrewconnect.com</p>
    <p>© 2025 FishCrewConnect. All rights reserved.</p>
  </div>
</body>
</html>`;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      // Share the PDF
      await Share.share({
        url: uri,
        title: 'Payment Report',
        message: `FishCrewConnect Detailed Payment Report - ${reportDate}`,
      });
      
    } catch (error) {
      console.error('Error generating detailed PDF report:', error);
      Alert.alert('Error', 'Failed to generate PDF report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateSummaryPDFReport = async () => {
    try {
      setLoading(true);
      
      const reportDate = new Date().toLocaleDateString();
      const userType = user?.user_type === 'fisherman' ? 'Fisherman' : 'Boat Owner';
      
      // Calculate success rate
      const successRate = paymentStats.totalPayments > 0 
        ? ((paymentStats.completedPayments / paymentStats.totalPayments) * 100).toFixed(1)
        : '0.0';

      // Generate recent payments section
      const recentPaymentsRows = paymentStats.recentPayments.length > 0 
        ? paymentStats.recentPayments.map(payment => {
            const statusColor = getStatusColor(payment.status);
            const statusText = payment.status.charAt(0).toUpperCase() + payment.status.slice(1);
            const amount = user?.user_type === 'fisherman' ? payment.fisherman_amount : payment.total_amount;
            
            return `<tr>
              <td>${payment.job_title || 'N/A'}</td>
              <td><span class="status-badge" style="background-color: ${statusColor};">${statusText}</span></td>
              <td>KSH ${parseFloat(amount).toLocaleString()}</td>
            </tr>`;
          }).join('')
        : '<tr><td colspan="3" style="padding: 20px; text-align: center; color: #666;">No recent payments</td></tr>';

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FishCrewConnect Payment Summary</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      line-height: 1.4; 
      color: #333; 
      padding: 20px;
      background-color: #fff;
    }
    .header { 
      text-align: center; 
      margin-bottom: 30px; 
      border-bottom: 2px solid #44DBE9;
      padding-bottom: 20px;
    }
    .logo { 
      color: #44DBE9; 
      font-size: 28px; 
      font-weight: bold; 
      margin-bottom: 10px;
    }
    .report-title { 
      color: #333; 
      font-size: 22px; 
      margin: 10px 0; 
      font-weight: bold;
    }
    .report-date {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    .user-info { 
      background-color: #f8f9fa; 
      padding: 20px; 
      border-radius: 8px; 
      margin-bottom: 30px;
      border-left: 4px solid #44DBE9;
    }
    .user-info h3 {
      color: #44DBE9;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .summary-section { 
      margin-bottom: 30px; 
    }
    .section-title { 
      font-size: 18px; 
      font-weight: bold; 
      color: #333; 
      margin-bottom: 15px; 
    }
    .stats-grid { 
      display: flex;
      flex-wrap: wrap;
      gap: 15px; 
      margin-bottom: 20px; 
    }
    .stat-card { 
      background-color: #f8f9fa; 
      padding: 20px; 
      border-radius: 8px; 
      text-align: center; 
      border-left: 4px solid #44DBE9;
      flex: 1;
      min-width: 200px;
    }
    .stat-number { 
      font-size: 24px; 
      font-weight: bold; 
      color: #44DBE9; 
      display: block;
      margin-bottom: 5px;
    }
    .stat-label { 
      font-size: 14px; 
      color: #666; 
    }
    .financial-highlight { 
      background-color: #e8f5f6; 
      padding: 30px; 
      border-radius: 8px; 
      text-align: center; 
      margin: 20px 0;
      border: 2px solid #44DBE9;
    }
    .financial-label { 
      font-size: 18px; 
      color: #666; 
      margin-bottom: 15px; 
      font-weight: bold;
    }
    .financial-amount { 
      font-size: 32px; 
      font-weight: bold; 
      color: #44DBE9; 
      margin-bottom: 10px;
    }
    .financial-subtext {
      font-size: 14px;
      color: #666;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 15px;
      background-color: #fff;
    }
    th { 
      background-color: #44DBE9; 
      color: white; 
      padding: 12px 10px; 
      text-align: left;
      font-weight: bold;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      color: white;
      font-size: 11px;
      font-weight: bold;
    }
    .success-rate { 
      background-color: #e8f5e8; 
      padding: 20px; 
      border-radius: 8px; 
      text-align: center;
      border-left: 4px solid #4CAF50;
      margin: 20px 0;
    }
    .success-rate strong {
      font-size: 18px;
      color: #2E7D32;
    }
    .footer { 
      margin-top: 40px; 
      text-align: center; 
      font-size: 12px; 
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
    .footer p {
      margin-bottom: 5px;
    }
    .notes {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #FF9800;
    }
    .notes strong {
      color: #333;
      display: block;
      margin-bottom: 10px;
    }
    .notes p {
      margin-bottom: 5px;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">FishCrewConnect</div>
    <div class="report-title">Payment Summary Report</div>
    <div class="report-date">Generated on ${reportDate}</div>
  </div>
  
  <div class="user-info">
    <h3>Report Information</h3>
    <p><strong>User:</strong> ${user?.name || 'N/A'} (${userType})</p>
    <p><strong>User ID:</strong> ${user?.id || 'N/A'}</p>
    <p><strong>Report Type:</strong> Summary Overview</p>
  </div>
  
  <div class="summary-section">
    <div class="section-title">Payment Statistics</div>
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-number">${paymentStats.totalPayments}</span>
        <span class="stat-label">Total Payments</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">${paymentStats.completedPayments}</span>
        <span class="stat-label">Completed Payments</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">${paymentStats.pendingPayments}</span>
        <span class="stat-label">Pending Payments</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">${paymentStats.failedPayments}</span>
        <span class="stat-label">Failed Payments</span>
      </div>
    </div>
  </div>
  
  <div class="financial-highlight">
    <div class="financial-label">${user?.user_type === 'fisherman' ? 'Total Earnings' : 'Total Payments'}</div>
    <div class="financial-amount">${formatCurrency(paymentStats.totalAmount)}</div>
    ${user?.user_type === 'boat_owner' && paymentStats.platformCommission > 0 
      ? `<div class="financial-subtext">Platform Commission: ${formatCurrency(paymentStats.platformCommission)}</div>`
      : ''
    }
  </div>
  
  <div class="summary-section">
    <div class="section-title">Recent Payments</div>
    <table>
      <thead>
        <tr>
          <th>Job Title</th>
          <th>Status</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${recentPaymentsRows}
      </tbody>
    </table>
  </div>
  
  <div class="success-rate">
    <strong>Payment Success Rate: ${successRate}%</strong>
  </div>
  
  <div class="notes">
    <strong>Important Notes:</strong>
    <p>• This summary includes all payment activities for your account</p>
    <p>• For detailed transaction history, generate a detailed report</p>
    <p>• Contact support for any payment-related issues</p>
  </div>
  
  <div class="footer">
    <p><strong>FishCrewConnect Payment System v1.0</strong></p>
    <p>This report was generated automatically on ${reportDate}</p>
    <p>For support and inquiries, contact: support@fishcrewconnect.com</p>
    <p>© 2025 FishCrewConnect. All rights reserved.</p>
  </div>
</body>
</html>`;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      // Share the PDF
      await Share.share({
        url: uri,
        title: 'Payment Summary',
        message: `FishCrewConnect Payment Summary Report - ${reportDate}`,
      });
      
    } catch (error) {
      console.error('Error generating summary PDF report:', error);
      Alert.alert('Error', 'Failed to generate PDF report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateSimpleTextReport = async () => {
    try {
      setLoading(true);
      
      // Fetch all payment data
      const response = await apiService.payments.getPaymentHistory({ limit: 1000 });
      const payments = response.payments || [];
      
      console.log('Payment data for report:', payments); // Debug log
      
      if (payments.length === 0) {
        Alert.alert('No Data', 'No payment data available to export.');
        return;
      }

      const reportDate = new Date().toLocaleDateString();
      const userType = user?.user_type === 'fisherman' ? 'Fisherman' : 'Boat Owner';
      
      // Create simple HTML with better visibility
      const paymentRows = payments.map((payment, index) => {
        const date = new Date(payment.created_at).toLocaleDateString();
        const amount = user?.user_type === 'fisherman' 
          ? payment.fisherman_amount || '0'
          : payment.total_amount || '0';
        const otherParty = user?.user_type === 'fisherman' 
          ? payment.boat_owner_name || 'N/A'
          : payment.fisherman_name || 'N/A';
        
        return `
<div style="border: 1px solid #ccc; padding: 15px; margin: 10px 0; background: #f9f9f9;">
  <h3 style="color: #44DBE9; margin-bottom: 10px;">Payment #${index + 1}</h3>
  <p><strong>Date:</strong> ${date}</p>
  <p><strong>Job:</strong> ${payment.job_title || 'N/A'}</p>
  <p><strong>${user?.user_type === 'fisherman' ? 'Boat Owner' : 'Fisherman'}:</strong> ${otherParty}</p>
  <p><strong>Amount:</strong> KSH ${parseFloat(amount).toLocaleString()}</p>
  <p><strong>Platform Fee:</strong> ${payment.platform_commission ? 'KSH ' + parseFloat(payment.platform_commission).toLocaleString() : 'N/A'}</p>
  <p><strong>Status:</strong> <span style="background: ${getStatusColor(payment.status)}; color: white; padding: 3px 8px; border-radius: 3px;">${payment.status.toUpperCase()}</span></p>
</div>`;
      }).join('');

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FishCrewConnect Payment Report</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 20px; 
      background: white;
      color: black;
    }
    .header { 
      text-align: center; 
      background: #44DBE9; 
      color: white; 
      padding: 20px; 
      margin-bottom: 20px;
    }
    .info-box {
      background: #e8f5f6;
      padding: 15px;
      border-left: 4px solid #44DBE9;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>FishCrewConnect</h1>
    <h2>Payment  Report</h2>
    <p>Generated on ${reportDate}</p>
  </div>
  
  <div class="info-box">
    <p><strong>User:</strong> ${user?.name || 'N/A'} (${userType})</p>
    <p><strong>User ID:</strong> ${user?.id || 'N/A'}</p>
    <p><strong>Total Payments Found:</strong> ${payments.length}</p>
  </div>
  
  <h2>Payment Details:</h2>
  ${paymentRows}
  
  <div style="margin-top: 30px; text-align: center; border-top: 1px solid #ccc; padding-top: 20px;">
    <p>© 2025 FishCrewConnect. All rights reserved.</p>
    <p>Support: support@fishcrewconnect.com</p>
  </div>
</body>
</html>`;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      // Share the PDF
      await Share.share({
        url: uri,
        title: 'Simple Payment Report',
        message: `FishCrewConnect Simple Payment Report - ${reportDate}`,
      });
      
    } catch (error) {
      console.error('Error generating simple text report:', error);
      Alert.alert('Error', 'Failed to generate simple report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStatCard = (title, value, icon, color = '#44DBE9', subtitle = null) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statCardContent}>
        <View style={styles.statCardLeft}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={[styles.statValue, { color }]}>{value}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
        <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
      </View>
    </View>
  );

  const renderQuickAction = (title, icon, onPress, color = '#44DBE9') => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const renderRecentPayment = (payment) => (
    <TouchableOpacity 
      key={payment.id} 
      style={styles.recentPaymentItem}
      onPress={() => router.push(`/payment-details/${payment.id}`)}
    >
      <View style={styles.recentPaymentLeft}>
        <Text style={styles.recentPaymentTitle} numberOfLines={1}>
          {payment.job_title}
        </Text>
        <Text style={styles.recentPaymentSubtitle}>
          {user?.user_type === 'fisherman' 
            ? `From: ${payment.boat_owner_name}` 
            : `To: ${payment.fisherman_name}`}
        </Text>
      </View>
      <View style={styles.recentPaymentRight}>
        <Text style={styles.recentPaymentAmount}>
          {formatCurrency(user?.user_type === 'fisherman' ? payment.fisherman_amount : payment.total_amount)}
        </Text>
        <View style={[styles.recentPaymentStatus, { backgroundColor: getStatusColor(payment.status) }]}>
          <Text style={styles.recentPaymentStatusText}>
            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeScreenWrapper>
        <HeaderBox title="Payment Dashboard" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#44DBE9" />
          <Text style={styles.loadingText}>Loading payment data...</Text>
        </View>
      </SafeScreenWrapper>
    );
  }

  return (
    <SafeScreenWrapper>
      <HeaderBox title="Payment Dashboard" showBackButton />
      
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Overview Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          
          <View style={styles.statsGrid}>
            {renderStatCard(
              'Total Payments',
              paymentStats.totalPayments.toString(),
              'card-outline',
              '#44DBE9'
            )}
            
            {renderStatCard(
              'Completed',
              paymentStats.completedPayments.toString(),
              'checkmark-circle-outline',
              '#4CAF50'
            )}
            
            {renderStatCard(
              'Pending',
              paymentStats.pendingPayments.toString(),
              'time-outline',
              '#FF9800'
            )}
            
            {renderStatCard(
              'Failed',
              paymentStats.failedPayments.toString(),
              'close-circle-outline',
              '#F44336'
            )}
          </View>

          {/* Financial Overview */}
          <View style={styles.financialCard}>
            <Text style={styles.financialTitle}>
              {user?.user_type === 'fisherman' ? 'Total Earnings' : 'Total Payments'}
            </Text>
            <Text style={styles.financialAmount}>
              {formatCurrency(paymentStats.totalAmount)}
            </Text>
            
            {user?.user_type === 'boat_owner' && paymentStats.platformCommission > 0 && (
              <Text style={styles.financialSubtext}>
                Platform fees: {formatCurrency(paymentStats.platformCommission)}
              </Text>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionsGrid}>
            {renderQuickAction(
              'View All Payments',
              'list-outline',
              () => router.push('/payment-history'),
              '#44DBE9'
            )}
            
            {user?.user_type === 'boat_owner' && renderQuickAction(
              'Pay Fisherman',
              'send-outline',
              () => router.push('/(tabs)/'),
              '#4CAF50'
            )}
          </View>
        </View>

        {/* Recent Payments */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Recent Payments</Text>
            <TouchableOpacity onPress={() => router.push('/payment-history')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {paymentStats.recentPayments.length > 0 ? (
            <View style={styles.recentPaymentsList}>
              {paymentStats.recentPayments.map(renderRecentPayment)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No payments yet</Text>
              <Text style={styles.emptySubtext}>
                Your payment history will appear here
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '48%',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCardLeft: {
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  financialCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  financialTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  financialAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#44DBE9',
  },
  financialSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  quickActionsSection: {
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  recentSection: {
    marginBottom: 24,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 16,
    color: '#44DBE9',
    fontWeight: '500',
  },
  recentPaymentsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentPaymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentPaymentLeft: {
    flex: 1,
    marginRight: 12,
  },
  recentPaymentTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  recentPaymentSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  recentPaymentRight: {
    alignItems: 'flex-end',
  },
  recentPaymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recentPaymentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  recentPaymentStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default PaymentDashboard;
