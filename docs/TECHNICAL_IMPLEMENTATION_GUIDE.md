# 🔧 FishCrewConnect - Technical Implementation Guide

## 📋 Table of Contents

1. [Socket.IO Real-time Implementation](#socketio-real-time-implementation)
2. [M-Pesa Integration Details](#m-pesa-integration-details)
3. [Database Design Patterns](#database-design-patterns)
4. [Performance Optimization](#performance-optimization)
5. [Error Handling Strategies](#error-handling-strategies)
6. [Testing Implementation](#testing-implementation)
7. [Security Best Practices](#security-best-practices)
8. [Mobile App Optimization](#mobile-app-optimization)

---

## 🔌 Socket.IO Real-time Implementation

### Server-Side Setup

```javascript
// server.js
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 30000,
  pingInterval: 25000
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join user to their personal room
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their room`);
  });
  
  // Handle messaging
  socket.on('send_message', async (data) => {
    try {
      const { sender_id, recipient_id, message } = data;
      
      // Save message to database
      const [result] = await db.query(`
        INSERT INTO messages (sender_id, recipient_id, message_text, sent_at)
        VALUES (?, ?, ?, NOW())
      `, [sender_id, recipient_id, message]);
      
      const messageData = {
        message_id: result.insertId,
        sender_id,
        recipient_id,
        message_text: message,
        sent_at: new Date(),
        sender_name: data.sender_name
      };
      
      // Send to recipient
      socket.to(`user_${recipient_id}`).emit('new_message', messageData);
      
      // Confirm to sender
      socket.emit('message_sent', messageData);
      
    } catch (error) {
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });
  
  // Handle payment notifications
  socket.on('join_payment_room', (paymentId) => {
    socket.join(`payment_${paymentId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
```

### Client-Side Implementation

```javascript
// services/socketService.js
import io from 'socket.io-client';
import { API_BASE_URL } from '../config/api';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(userId) {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(API_BASE_URL, {
      transports: ['polling', 'websocket'],
      timeout: 20000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.isConnected = true;
      this.socket.emit('join_user_room', userId);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  sendMessage(messageData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('send_message', messageData);
    }
  }

  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  onPaymentUpdate(callback) {
    if (this.socket) {
      this.socket.on('payment_status_update', callback);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export default new SocketService();
```

---

## 💳 M-Pesa Integration Details

### Access Token Generation

```javascript
// services/mpesaService.js
const axios = require('axios');

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    
    this.baseUrl = this.environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';
  }

  async getAccessToken() {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.error('M-Pesa access token error:', error);
      throw new Error('Failed to get M-Pesa access token');
    }
  }

  async initiateSTKPush(paymentData) {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const password = Buffer.from(`${this.businessShortCode}${this.passkey}${timestamp}`).toString('base64');

      const stkPushData = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: paymentData.amount,
        PartyA: paymentData.phoneNumber,
        PartyB: this.businessShortCode,
        PhoneNumber: paymentData.phoneNumber,
        CallBackURL: `${process.env.APP_URL}/api/payments/mpesa-callback`,
        AccountReference: paymentData.accountReference,
        TransactionDesc: paymentData.transactionDesc
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        stkPushData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('STK Push error:', error);
      throw new Error('Failed to initiate STK Push');
    }
  }

  async queryTransactionStatus(checkoutRequestID) {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const password = Buffer.from(`${this.businessShortCode}${this.passkey}${timestamp}`).toString('base64');

      const queryData = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        queryData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Transaction query error:', error);
      throw new Error('Failed to query transaction status');
    }
  }
}

module.exports = new MpesaService();
```

### Payment Callback Handling

```javascript
// controllers/paymentController.js
exports.mpesaCallback = async (req, res) => {
  try {
    const { Body } = req.body;
    const { stkCallback } = Body;
    
    const checkoutRequestID = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    
    let transactionId = null;
    let phoneNumber = null;
    let amount = null;
    
    if (resultCode === 0 && stkCallback.CallbackMetadata) {
      // Payment successful
      const metadata = stkCallback.CallbackMetadata.Item;
      
      metadata.forEach(item => {
        switch (item.Name) {
          case 'MpesaReceiptNumber':
            transactionId = item.Value;
            break;
          case 'PhoneNumber':
            phoneNumber = item.Value;
            break;
          case 'Amount':
            amount = item.Value;
            break;
        }
      });
      
      // Update payment status
      await db.query(`
        UPDATE job_payments 
        SET status = 'completed', 
            mpesa_transaction_id = ?, 
            completed_at = NOW()
        WHERE mpesa_checkout_request_id = ?
      `, [transactionId, checkoutRequestID]);
      
      // Get payment details for notification
      const [payment] = await db.query(`
        SELECT jp.*, j.title, uf.name as fisherman_name, ub.name as boat_owner_name
        FROM job_payments jp
        JOIN jobs j ON jp.job_id = j.job_id
        JOIN users uf ON jp.fisherman_id = uf.user_id
        JOIN users ub ON jp.boat_owner_id = ub.user_id
        WHERE jp.mpesa_checkout_request_id = ?
      `, [checkoutRequestID]);
      
      if (payment.length > 0) {
        const paymentData = payment[0];
        
        // Send socket notification
        req.io.to(`user_${paymentData.fisherman_id}`).emit('payment_received', {
          payment_id: paymentData.id,
          amount: paymentData.fisherman_amount,
          job_title: paymentData.title,
          boat_owner: paymentData.boat_owner_name
        });
        
        req.io.to(`user_${paymentData.boat_owner_id}`).emit('payment_completed', {
          payment_id: paymentData.id,
          fisherman: paymentData.fisherman_name,
          job_title: paymentData.title
        });
      }
      
    } else {
      // Payment failed
      await db.query(`
        UPDATE job_payments 
        SET status = 'failed'
        WHERE mpesa_checkout_request_id = ?
      `, [checkoutRequestID]);
    }
    
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

---

## 🗄️ Database Design Patterns

### Connection Pool Configuration

```javascript
// config/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  charset: 'utf8mb4'
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
  })
  .catch(error => {
    console.error('❌ Database connection failed:', error);
  });

module.exports = pool;
```

### Database Indexing Strategy

```sql
-- Performance indexes for frequently queried tables

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type_status ON users(user_type, verification_status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Jobs table indexes
CREATE INDEX idx_jobs_owner_status ON jobs(boat_owner_id, status);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_experience ON jobs(experience_required);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_status_active ON jobs(status) WHERE status = 'active';

-- Job applications indexes
CREATE INDEX idx_applications_job_status ON job_applications(job_id, status);
CREATE INDEX idx_applications_fisherman ON job_applications(fisherman_id);
CREATE INDEX idx_applications_boat_owner ON job_applications(boat_owner_id);
CREATE INDEX idx_applications_applied_at ON job_applications(applied_at);

-- Payments table indexes  
CREATE INDEX idx_payments_status ON job_payments(status);
CREATE INDEX idx_payments_fisherman ON job_payments(fisherman_id);
CREATE INDEX idx_payments_boat_owner ON job_payments(boat_owner_id);
CREATE INDEX idx_payments_created_at ON job_payments(created_at);
CREATE INDEX idx_payments_checkout_request ON job_payments(mpesa_checkout_request_id);

-- Messages table indexes
CREATE INDEX idx_messages_conversation ON messages(sender_id, recipient_id, sent_at);
CREATE INDEX idx_messages_recipient ON messages(recipient_id, sent_at);
```

### Data Migration Scripts

```sql
-- scripts/migrations/001_create_payment_statistics_table.sql
CREATE TABLE payment_statistics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  total_payments INT DEFAULT 0,
  completed_payments INT DEFAULT 0,
  pending_payments INT DEFAULT 0,
  failed_payments INT DEFAULT 0,
  total_payment_volume DECIMAL(15,2) DEFAULT 0.00,
  total_platform_commission DECIMAL(15,2) DEFAULT 0.00,
  average_payment_amount DECIMAL(10,2) DEFAULT 0.00,
  first_payment_date TIMESTAMP NULL,
  last_payment_date TIMESTAMP NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Initialize with current data
INSERT INTO payment_statistics (
  total_payments,
  completed_payments,
  pending_payments,
  failed_payments,
  total_payment_volume,
  total_platform_commission,
  average_payment_amount,
  first_payment_date,
  last_payment_date
)
SELECT 
  COUNT(*) as total_payments,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
  COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount END), 0) as total_payment_volume,
  COALESCE(SUM(CASE WHEN status = 'completed' THEN platform_commission END), 0) as total_platform_commission,
  COALESCE(AVG(CASE WHEN status = 'completed' THEN total_amount END), 0) as average_payment_amount,
  MIN(created_at) as first_payment_date,
  MAX(created_at) as last_payment_date
FROM job_payments;
```

---

## ⚡ Performance Optimization

### API Response Caching

```javascript
// middleware/cacheMiddleware.js
const redis = require('redis');
const client = redis.createClient();

const cache = (duration) => {
  return async (req, res, next) => {
    const key = req.originalUrl;
    
    try {
      const cached = await client.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      
      // Store original json method
      const originalJson = res.json;
      
      res.json = function(data) {
        // Cache the response
        client.setex(key, duration, JSON.stringify(data));
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      next();
    }
  };
};

// Usage in routes
router.get('/jobs', cache(300), jobController.getJobs); // Cache for 5 minutes
```

### Database Query Optimization

```javascript
// Optimized job search with pagination
exports.getJobs = async (req, res) => {
  try {
    const { page = 1, limit = 10, location, experience, search } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE j.status = "active"';
    let params = [];
    
    if (location) {
      whereClause += ' AND j.location LIKE ?';
      params.push(`%${location}%`);
    }
    
    if (experience) {
      whereClause += ' AND j.experience_required = ?';
      params.push(experience);
    }
    
    if (search) {
      whereClause += ' AND (j.title LIKE ? OR j.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    // Use EXPLAIN to analyze query performance
    const query = `
      SELECT 
        j.*,
        u.name as boat_owner_name,
        u.profile_image as boat_owner_image,
        (SELECT AVG(rating) FROM reviews WHERE reviewed_user_id = j.boat_owner_id) as boat_owner_rating,
        (SELECT COUNT(*) FROM job_applications WHERE job_id = j.job_id) as application_count
      FROM jobs j
      JOIN users u ON j.boat_owner_id = u.user_id
      ${whereClause}
      ORDER BY j.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [jobs] = await db.query(query, [...params, parseInt(limit), offset]);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM jobs j
      ${whereClause}
    `;
    const [countResult] = await db.query(countQuery, params);
    
    res.json({
      jobs,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: countResult[0].total,
        total_pages: Math.ceil(countResult[0].total / limit)
      }
    });
    
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};
```

### Mobile App Performance

```javascript
// React Native performance optimizations

// 1. Memoized components
const JobCard = React.memo(({ job, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(job)}>
      {/* Job card content */}
    </TouchableOpacity>
  );
});

// 2. FlatList optimization
const JobsList = () => {
  const renderJob = useCallback(({ item }) => (
    <JobCard job={item} onPress={handleJobPress} />
  ), [handleJobPress]);

  const keyExtractor = useCallback((item) => item.job_id.toString(), []);

  return (
    <FlatList
      data={jobs}
      renderItem={renderJob}
      keyExtractor={keyExtractor}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
      getItemLayout={(data, index) => ({
        length: 120,
        offset: 120 * index,
        index,
      })}
    />
  );
};

// 3. Image optimization
const OptimizedImage = ({ uri, style }) => {
  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      defaultSource={require('../assets/default-avatar.png')}
      onError={() => console.log('Image load error')}
    />
  );
};
```

---

## 🛡️ Security Best Practices Implementation

### Input Validation Middleware

```javascript
// middleware/validationMiddleware.js
const { body, validationResult } = require('express-validator');

const validationRules = {
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('phone')
      .matches(/^[0-9]+$/)
      .withMessage('Phone number must contain only digits'),
    body('name')
      .isLength({ min: 2 })
      .trim()
      .escape()
      .withMessage('Name must be at least 2 characters')
  ],
  
  createJob: [
    body('title')
      .isLength({ min: 5, max: 255 })
      .trim()
      .escape(),
    body('description')
      .isLength({ min: 10 })
      .trim()
      .escape(),
    body('payment_amount')
      .isFloat({ min: 0 })
      .withMessage('Payment amount must be a positive number')
  ]
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

module.exports = { validationRules, validate };
```

### Rate Limiting Implementation

```javascript
// middleware/rateLimitMiddleware.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const redisClient = redis.createClient();

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:',
    }),
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different limits for different endpoints
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again later'
);

const apiLimiter = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  100, // 100 requests
  'Too many requests, please try again later'
);

const paymentLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  3, // 3 payment attempts
  'Too many payment attempts, please try again later'
);

module.exports = { authLimiter, apiLimiter, paymentLimiter };
```

### SQL Injection Prevention

```javascript
// Safe database query patterns
class DatabaseService {
  static async findUser(email) {
    // ✅ SAFE - Using parameterized query
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return users[0];
  }
  
  static async searchJobs(filters) {
    let query = 'SELECT * FROM jobs WHERE status = ?';
    let params = ['active'];
    
    if (filters.location) {
      query += ' AND location LIKE ?';
      params.push(`%${filters.location}%`);
    }
    
    if (filters.experience) {
      query += ' AND experience_required = ?';
      params.push(filters.experience);
    }
    
    // ✅ SAFE - All user input is parameterized
    const [jobs] = await db.query(query, params);
    return jobs;
  }
  
  // ❌ UNSAFE - Never do this
  static async unsafeSearch(searchTerm) {
    const query = `SELECT * FROM jobs WHERE title LIKE '%${searchTerm}%'`;
    // This is vulnerable to SQL injection!
  }
}
```

---

## 🧪 Testing Implementation

### Unit Testing with Jest

```javascript
// tests/controllers/authController.test.js
const request = require('supertest');
const app = require('../../server');
const db = require('../../config/db');

describe('Auth Controller', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM users WHERE email LIKE "%test%"');
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        password: 'password123',
        user_type: 'fisherman'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.token).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        phone: '1234567890',
        password: 'password123',
        user_type: 'fisherman'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: 'Valid email is required'
        })
      );
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        name: 'Test User',
        email: 'duplicate@example.com',
        phone: '1234567890',
        password: 'password123',
        user_type: 'fisherman'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });
});
```

### Integration Testing

```javascript
// tests/integration/jobWorkflow.test.js
describe('Job Workflow Integration', () => {
  let boatOwnerToken, fishermanToken;
  let boatOwnerId, fishermanId;
  let jobId;

  beforeAll(async () => {
    // Register test users
    const boatOwner = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Boat Owner',
        email: 'boatowner@test.com',
        phone: '1111111111',
        password: 'password123',
        user_type: 'boat_owner'
      });

    const fisherman = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Fisherman',
        email: 'fisherman@test.com',
        phone: '2222222222',
        password: 'password123',
        user_type: 'fisherman'
      });

    boatOwnerToken = boatOwner.body.token;
    fishermanToken = fisherman.body.token;
    boatOwnerId = boatOwner.body.user.user_id;
    fishermanId = fisherman.body.user.user_id;
  });

  it('should complete full job workflow', async () => {
    // 1. Boat owner creates job
    const jobResponse = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${boatOwnerToken}`)
      .send({
        title: 'Test Fishing Job',
        description: 'Test job description',
        location: 'Test Location',
        start_date: '2025-08-01',
        end_date: '2025-08-05',
        crew_needed: 2,
        experience_required: 'intermediate',
        payment_amount: 10000
      })
      .expect(201);

    jobId = jobResponse.body.job.job_id;

    // 2. Fisherman applies for job
    const applicationResponse = await request(app)
      .post('/api/job-applications')
      .set('Authorization', `Bearer ${fishermanToken}`)
      .send({
        job_id: jobId,
        application_message: 'I am interested in this job'
      })
      .expect(201);

    const applicationId = applicationResponse.body.application.application_id;

    // 3. Boat owner accepts application
    await request(app)
      .put(`/api/job-applications/${applicationId}/respond`)
      .set('Authorization', `Bearer ${boatOwnerToken}`)
      .send({
        status: 'accepted',
        response_message: 'Welcome aboard!'
      })
      .expect(200);

    // 4. Verify application status
    const updatedApplication = await request(app)
      .get(`/api/job-applications/${applicationId}`)
      .set('Authorization', `Bearer ${fishermanToken}`)
      .expect(200);

    expect(updatedApplication.body.application.status).toBe('accepted');
  });
});
```

### Performance Testing

```javascript
// tests/performance/loadTest.js
const { performance } = require('perf_hooks');

describe('Performance Tests', () => {
  it('should handle multiple concurrent job requests', async () => {
    const startTime = performance.now();
    const requests = [];

    // Create 50 concurrent requests
    for (let i = 0; i < 50; i++) {
      requests.push(
        request(app)
          .get('/api/jobs')
          .expect(200)
      );
    }

    await Promise.all(requests);
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should complete within 2 seconds
    expect(duration).toBeLessThan(2000);
  });

  it('should maintain response time under load', async () => {
    const responseTimes = [];

    for (let i = 0; i < 10; i++) {
      const startTime = performance.now();
      
      await request(app)
        .get('/api/jobs')
        .expect(200);
        
      const endTime = performance.now();
      responseTimes.push(endTime - startTime);
    }

    const averageResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
    
    // Average response time should be under 500ms
    expect(averageResponseTime).toBeLessThan(500);
  });
});
```

---

*This technical implementation guide provides detailed code examples and best practices for implementing the FishCrewConnect platform's core features.*
