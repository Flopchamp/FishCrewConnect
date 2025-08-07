# 🚨 Payment Error 500 - Debugging Guide

This guide helps you troubleshoot the 500 error when initiating payments.

## 🔍 Error Analysis

The error you're seeing:
```
LOG  API Error: Request failed with status code 500
ERROR  Error initiating payment: [AxiosError: Request failed with status code 500]
```

This indicates a server-side error in the payment initiation process.

## 🛠️ Debugging Steps

### Step 1: Check Database Setup

First, ensure all required database tables exist:

```bash
cd FishCrewConnect-backend
npm run setup-payments-db
```

### Step 2: Test Basic Routes

Test if the payment routes are working at all:

```bash
# Test basic route (should work)
curl http://localhost:3001/api/payments/test

# Test auth route (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/payments/test-auth
```

### Step 3: Check Backend Logs

Start the backend with detailed logging:

```bash
cd FishCrewConnect-backend
npm start
```

Look for these specific log messages when you try to make a payment:

1. ✅ `Payment initiation request:` - Request received
2. ✅ `Querying for job and application...` - Database query started
3. ✅ `Query result:` - Job found
4. ✅ `Calculating commission...` - Commission calculation
5. ✅ `Creating payment record...` - Payment insertion
6. ✅ `Payment record created with ID:` - Payment created successfully

### Step 4: Check Authentication

The error might be authentication-related. Verify:

1. **User is logged in** in the mobile app
2. **Token is valid** and not expired
3. **User has the right permissions** (boat owner)

### Step 5: Database Connection

Check if the database connection is working:

```sql
-- Test these queries in your MySQL console
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM jobs;
SELECT COUNT(*) FROM job_applications;
SELECT COUNT(*) FROM job_payments;
```

## 🔧 Common Fixes

### Fix 1: Missing Database Tables

If `job_payments` table doesn't exist:

```bash
npm run setup-payments-db
```

### Fix 2: Environment Variables

Ensure your `.env` file has:

```env
DARAJA_DEMO_MODE=true
NODE_ENV=development
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=fishcrewconnect
JWT_SECRET=your_jwt_secret
```

### Fix 3: Authentication Issues

If authentication is failing, check:

1. JWT token is being sent correctly from frontend
2. JWT secret matches between frontend and backend
3. Token hasn't expired

### Fix 4: Database Connection Issues

If database connection is failing:

1. Check MySQL is running
2. Verify database credentials in `.env`
3. Ensure database `fishcrewconnect` exists

## 🧪 Test Specific Scenarios

### Test 1: Manual Payment Request

Use Postman or curl to test the payment endpoint directly:

```bash
curl -X POST http://localhost:3001/api/payments/initiate-job-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "jobId": 20,
    "applicationId": 18,
    "amount": 10,
    "fishermanPhoneNumber": "0769719322"
  }'
```

### Test 2: Check Specific Records

Verify the data exists in your database:

```sql
-- Check if the job exists
SELECT * FROM jobs WHERE job_id = 20;

-- Check if the application exists and is accepted
SELECT * FROM job_applications WHERE id = 18 AND status = 'accepted';

-- Check if the boat owner owns this job
SELECT j.*, ja.* FROM jobs j 
JOIN job_applications ja ON j.job_id = ja.job_id 
WHERE j.job_id = 20 AND ja.id = 18;
```

## 📋 Debugging Checklist

- [ ] Backend server is running (`npm start`)
- [ ] Database is connected and accessible
- [ ] `job_payments` table exists (run `npm run setup-payments-db`)
- [ ] User is authenticated (check JWT token)
- [ ] Job with ID 20 exists in database
- [ ] Application with ID 18 exists and is accepted
- [ ] User owns the job (boat owner)
- [ ] Environment variables are set correctly
- [ ] Demo mode is enabled (`DARAJA_DEMO_MODE=true`)

## 🎯 Expected Behavior in Demo Mode

When everything works correctly, you should see:

1. **Frontend**: Orange demo mode banner
2. **Backend logs**: 
   ```
   Payment initiation request: {...}
   Querying for job and application...
   Query result: [job data]
   Calculating commission...
   Creating payment record...
   Payment record created with ID: X
   Using DEMO M-Pesa credentials for testing...
   DEMO MODE: Simulating successful STK Push response...
   ```
3. **Response**: Payment initiated successfully with demo message
4. **Auto-completion**: Payment completes in 3 seconds

## 🆘 If Still Not Working

If you're still getting 500 errors after following these steps:

1. **Check the exact error message** in backend console
2. **Look for database errors** (table missing, foreign key issues)
3. **Verify the JWT token** is valid and properly formatted
4. **Ensure all required data exists** (job, application, users)
5. **Check for any missing environment variables**

## 📞 Quick Fix Commands

Run these commands in order:

```bash
# 1. Setup database
cd FishCrewConnect-backend
npm run setup-payments-db

# 2. Test basic connectivity
curl http://localhost:3001/api/payments/test

# 3. Restart backend with fresh logs
npm start

# 4. Try the payment from mobile app again
```

## 💡 Debug Tips

1. **Always check backend console** for detailed error messages
2. **Use the test endpoints** to isolate the issue
3. **Verify database state** before making payment requests
4. **Check authentication** is working with test-auth endpoint
5. **Use demo mode** for testing without real M-Pesa integration

Remember: The demo mode should work even without real M-Pesa credentials, so if you're getting 500 errors, it's likely a database or authentication issue, not an M-Pesa API problem.
