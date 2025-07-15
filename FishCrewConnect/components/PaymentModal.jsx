import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/api';

const PaymentModal = ({ 
  visible, 
  onClose, 
  jobData, 
  applicationData,
  onPaymentSuccess 
}) => {
  const [amount, setAmount] = useState('');
  const [fishermanPhone, setFishermanPhone] = useState(applicationData?.applicant_phone || '');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form'); // 'form', 'processing', 'success'
  const [paymentData, setPaymentData] = useState(null);

  const formatCurrency = (value) => {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleAmountChange = (text) => {
    // Remove non-numeric characters
    const numericValue = text.replace(/[^0-9]/g, '');
    setAmount(numericValue);
  };

  const handlePhoneChange = (text) => {
    // Remove non-numeric characters and format
    const numericValue = text.replace(/[^0-9]/g, '');
    setFishermanPhone(numericValue);
  };

  const validateForm = () => {
    if (!amount || parseInt(amount) < 1) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return false;
    }

    if (!fishermanPhone || fishermanPhone.length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number.');
      return false;
    }

    return true;
  };

  const initiatePayment = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setStep('processing');

    try {
      const paymentRequest = {
        jobId: jobData.job_id,
        applicationId: applicationData.id,
        amount: parseInt(amount),
        fishermanPhoneNumber: fishermanPhone
      };

      const result = await apiService.payments.initiateJobPayment(paymentRequest);
      
      setPaymentData(result);
      
      Alert.alert(
        'Payment Initiated',
        `Payment of KSH ${formatCurrency(amount)} has been initiated. The fisherman will receive KSH ${formatCurrency(result.fishermanAmount.toString())} after platform commission (${result.commissionRate}).`,
        [
          {
            text: 'OK',
            onPress: () => {
              setStep('success');
              if (onPaymentSuccess) {
                onPaymentSuccess(result);
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('Payment initiation failed:', error);
      Alert.alert(
        'Payment Failed',
        error.message || 'Failed to initiate payment. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => setStep('form')
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setAmount('');
    setFishermanPhone(applicationData?.applicant_phone || '');
    setStep('form');
    setPaymentData(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const renderFormStep = () => (
    <View style={styles.modalContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Pay Fisherman</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.jobInfo}>
        <Text style={styles.jobTitle}>{jobData?.job_title}</Text>
        <Text style={styles.fishermanName}>
          Paying: {applicationData?.applicant_name}
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Payment Amount (KSH)</Text>
          <TextInput
            style={styles.input}
            value={formatCurrency(amount)}
            onChangeText={handleAmountChange}
            placeholder="Enter amount"
            keyboardType="numeric"
            autoFocus
          />
          <Text style={styles.hint}>
            Platform commission (5%) will be deducted automatically
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Fisherman&apos;s Phone Number</Text>
          <TextInput
            style={styles.input}
            value={fishermanPhone}
            onChangeText={handlePhoneChange}
            placeholder="254XXXXXXXXX"
            keyboardType="numeric"
          />
          <Text style={styles.hint}>
            M-Pesa payment request will be sent to this number
          </Text>
        </View>

        {amount && (
          <View style={styles.breakdown}>
            <Text style={styles.breakdownTitle}>Payment Breakdown</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Total Amount:</Text>
              <Text style={styles.breakdownValue}>KSH {formatCurrency(amount)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Platform Commission (5%):</Text>
              <Text style={styles.breakdownValue}>
                KSH {formatCurrency((parseInt(amount) * 0.05).toFixed(0))}
              </Text>
            </View>
            <View style={[styles.breakdownRow, styles.finalAmount]}>
              <Text style={styles.breakdownLabel}>Fisherman Receives:</Text>
              <Text style={styles.breakdownValue}>
                KSH {formatCurrency((parseInt(amount) * 0.95).toFixed(0))}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.payButton, loading && styles.payButtonDisabled]} 
          onPress={initiatePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.payButtonText}>Initiate Payment</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProcessingStep = () => (
    <View style={styles.modalContent}>
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color="#44DBE9" />
        <Text style={styles.processingTitle}>Processing Payment...</Text>
        <Text style={styles.processingText}>
          Please wait while we initiate the M-Pesa payment.
        </Text>
      </View>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.modalContent}>
      <View style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
        <Text style={styles.successTitle}>Payment Initiated!</Text>
        <Text style={styles.successText}>
          M-Pesa payment request has been sent. The fisherman will receive the payment once they complete the transaction.
        </Text>
        
        {paymentData && (
          <View style={styles.paymentDetails}>
            <Text style={styles.detailLabel}>Payment ID: {paymentData.paymentId}</Text>
            <Text style={styles.detailLabel}>
              Amount: KSH {formatCurrency(paymentData.amount.toString())}
            </Text>
            <Text style={styles.detailLabel}>
              Fisherman Gets: KSH {formatCurrency(paymentData.fishermanAmount.toString())}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (step) {
      case 'processing':
        return renderProcessingStep();
      case 'success':
        return renderSuccessStep();
      default:
        return renderFormStep();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {renderContent()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  jobInfo: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  fishermanName: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  breakdown: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  finalAmount: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 15,
    paddingTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  payButton: {
    flex: 1,
    backgroundColor: '#44DBE9',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#ccc',
  },
  payButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  processingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 20,
    marginBottom: 15,
  },
  successText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  paymentDetails: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  doneButton: {
    backgroundColor: '#44DBE9',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default PaymentModal;
