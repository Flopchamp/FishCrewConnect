# 💳 M-Pesa Demo Payment Setup Guide

This guide explains how to test the M-Pesa payment integration using the provided test credentials.

## 🔧 Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the `FishCrewConnect-backend` directory:

```bash
# Copy the example file
cp .env.example .env
```

### 2. Enable Demo Mode

In your `.env` file, ensure demo mode is enabled:

```env
DARAJA_DEMO_MODE=true
NODE_ENV=development
```

### 3. Test Credentials Used

When demo mode is enabled, the following M-Pesa test credentials are automatically used:

```json
{
    "BusinessShortCode": "174379",
    "Password": "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMTYwMjE2MTY1NjI3",
    "Timestamp": "20160216165627",
    "TransactionType": "CustomerPayBillOnline",
    "Amount": "1",
    "PartyA": "254708374149",
    "PartyB": "174379",
    "PhoneNumber": "254708374149",
    "CallBackURL": "https://mydomain.com/pat",
    "AccountReference": "Test",
    "TransactionDesc": "Test"
}
```

## 🧪 Testing the Payment Flow

### Option 1: Using the Mobile App

1. **Start the backend server:**
   ```bash
   cd FishCrewConnect-backend
   npm start
   ```

2. **Start the mobile app:**
   ```bash
   cd FishCrewConnect
   npm start
   ```

3. **Test Payment Flow:**
   - Login as a boat owner
   - Navigate to a job with accepted applications
   - Click "Pay Fisherman" button
   - Fill in the payment form
   - Click "Initiate Payment"
   - Observe the demo payment process

### Option 2: Using the Test Script

Run the automated test script:

```bash
cd FishCrewConnect-backend
npm run test-demo-payment
```

### Option 3: Direct API Testing

Use a tool like Postman or curl:

```bash
curl -X POST http://localhost:3001/api/payments/initiate-job-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "jobId": 1,
    "applicationId": 1,
    "amount": 1000,
    "fishermanPhoneNumber": "254708374149"
  }'
```

## 🎯 Expected Demo Behavior

When a boat owner initiates payment in demo mode:

1. **Payment Form Shows:**
   - Demo mode indicator with orange warning
   - "Using test M-Pesa credentials for demonstration"

2. **Payment Initiation:**
   - Uses the provided test credentials automatically
   - Returns mock STK Push response
   - Shows demo-specific success message

3. **Auto-Completion:**
   - Payment automatically completes after 3 seconds
   - Notifications sent to both parties
   - Payment status updated to "completed"
   - Demo receipt number generated

4. **Payment History:**
   - Transaction appears in payment history
   - Shows as completed with demo receipt number
   - Commission properly calculated and displayed

## 🔍 Verification Points

### Frontend Indicators:
- ✅ Orange demo mode banner in payment modal
- ✅ Demo-specific alert messages
- ✅ Auto-completion notification

### Backend Logs:
- ✅ "DEMO MODE: Using test M-Pesa credentials..."
- ✅ "DEMO MODE: Simulating successful STK Push response..."
- ✅ "DEMO: Payment {id} marked as completed"

### Database Changes:
- ✅ Payment record created with status "pending"
- ✅ Status updated to "completed" after 3 seconds
- ✅ Demo receipt number generated
- ✅ Notifications created for both users

## 🚀 Production Configuration

To switch to production M-Pesa integration:

1. **Disable Demo Mode:**
   ```env
   DARAJA_DEMO_MODE=false
   NODE_ENV=production
   ```

2. **Add Real Credentials:**
   ```env
   DARAJA_CONSUMER_KEY=your_real_consumer_key
   DARAJA_CONSUMER_SECRET=your_real_consumer_secret
   DARAJA_BUSINESS_SHORTCODE=your_real_shortcode
   DARAJA_PASSKEY=your_real_passkey
   ```

3. **Configure Callback URL:**
   ```env
   BACKEND_URL=https://your-production-domain.com
   ```

## 🛠️ Troubleshooting

### Demo Mode Not Working?
- Check `.env` file has `DARAJA_DEMO_MODE=true`
- Verify server restart after environment changes
- Check console logs for demo mode indicators

### Payment Not Auto-Completing?
- Check if setTimeout is working (3-second delay)
- Verify database connection is working
- Check for any error logs in console

### Frontend Not Showing Demo Indicator?
- Verify API response includes `isDemoMode: true`
- Check component state updates
- Ensure proper styling is applied

## 📱 Mobile App Demo Flow

1. **Job Creation** → Boat owner posts job
2. **Application** → Fisherman applies
3. **Acceptance** → Boat owner accepts application
4. **Job Completion** → Mark job as completed
5. **Payment** → Boat owner initiates payment
6. **Demo Payment** → Uses test credentials automatically
7. **Completion** → Payment auto-completes in 3 seconds
8. **Verification** → Check payment history and notifications

## 🎉 Success Indicators

You'll know the demo is working when:
- Orange demo banner appears in payment modal
- Payment initiates without real M-Pesa API calls
- Payment auto-completes after 3 seconds
- Both users receive notifications
- Payment history shows completed transaction
- Console shows demo-specific log messages

---

**Note:** This demo setup allows you to test the complete payment flow without requiring real M-Pesa API access or actual phone numbers. Perfect for development, testing, and demonstrations!
