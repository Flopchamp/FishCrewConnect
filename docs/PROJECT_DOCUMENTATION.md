# 🐟 FishCrewConnect - Complete Project Documentation

## 📖 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [Installation & Setup](#installation--setup)
4. [API Documentation](#api-documentation)
5. [Database Schema](#database-schema)
6. [Frontend Structure](#frontend-structure)
7. [Backend Structure](#backend-structure)
8. [Security Implementation](#security-implementation)
9. [Testing Guide](#testing-guide)
10. [Deployment Guide](#deployment-guide)
11. [User Manuals](#user-manuals)
12. [Troubleshooting](#troubleshooting)

---

## 🌟 Project Overview

FishCrewConnect is a comprehensive mobile platform that connects boat owners with qualified fishermen in the maritime industry. The platform facilitates job postings, crew hiring, secure payments through M-Pesa integration, and professional communication between maritime professionals.

### Key Features
- **Multi-Role System**: Fishermen, Boat Owners, and Administrators
- **Job Marketplace**: Complete job posting and application system
- **Integrated Payments**: M-Pesa Daraja API with commission system
- **Real-time Messaging**: Socket.IO powered communication
- **Admin Dashboard**: Comprehensive platform management
- **Mobile-First Design**: React Native with Expo framework

### Business Value
- Streamlines crew hiring in the fishing industry
- Provides secure payment processing for maritime jobs
- Enables professional networking in the fishing community
- Offers transparent job matching and application tracking
- Reduces hiring friction through integrated communication

---

## 🏗️ Architecture & Technology Stack

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │────│   Backend API   │────│   MySQL DB      │
│  (React Native) │    │   (Node.js)     │    │   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────│  Socket.IO      │──────────────┘
                        │  (Real-time)    │
                        └─────────────────┘
                                │
                        ┌─────────────────┐
                        │   M-Pesa API    │
                        │   (Payments)    │
                        └─────────────────┘
```

### Frontend Stack
- **Framework**: React Native with Expo SDK 53
- **Navigation**: React Navigation 7
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: React Context API + AsyncStorage
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client
- **UI Components**: Custom components with Expo Vector Icons

### Backend Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL with mysql2 driver
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.IO
- **Password Security**: bcryptjs
- **Email Service**: Nodemailer
- **File Uploads**: Multer
- **Environment**: dotenv for configuration

### Database
- **Primary Database**: MySQL
- **Connection Pool**: MySQL2 with connection pooling
- **Migrations**: Custom SQL scripts
- **Backup Strategy**: Automated database backups

### External Integrations
- **Payment Gateway**: M-Pesa Daraja API
- **Email Service**: SMTP (configurable providers)
- **Push Notifications**: Expo Notifications (ready for implementation)

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- MySQL 8.0+
- Expo CLI (`npm install -g @expo/cli`)
- M-Pesa Developer Account (for payments)
- SMTP Email Service

### Backend Setup

1. **Clone and Navigate**
   ```bash
   cd FishCrewConnect-backend
   npm install
   ```

2. **Environment Configuration**
   Create `.env` file:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=fishcrewconnect

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=7d

   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password

   # M-Pesa Configuration
   MPESA_CONSUMER_KEY=your_consumer_key
   MPESA_CONSUMER_SECRET=your_consumer_secret
   MPESA_BUSINESS_SHORT_CODE=your_short_code
   MPESA_PASSKEY=your_passkey
   MPESA_ENVIRONMENT=sandbox

   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

3. **Database Setup**
   ```bash
   # Create database
   mysql -u root -p
   CREATE DATABASE fishcrewconnect;

   # Run migrations (execute SQL files in scripts/ directory)
   ```

4. **Start Backend Server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

### Frontend Setup

1. **Navigate and Install**
   ```bash
   cd FishCrewConnect
   npm install
   ```

2. **Configure API Endpoint**
   Update `config/api.js`:
   ```javascript
   const API_BASE_URL = 'http://your-backend-url:3000';
   ```

3. **Start Development Server**
   ```bash
   npm start
   # Choose platform: iOS, Android, or Web
   ```

### Production Deployment

#### Backend Deployment
- Deploy to cloud service (AWS, Heroku, DigitalOcean)
- Configure production database
- Set up SSL certificates
- Configure environment variables
- Set up monitoring and logging

#### Frontend Deployment
- Build for app stores: `expo build:android` / `expo build:ios`
- Configure production API endpoints
- Submit to Google Play Store / Apple App Store
- Set up over-the-air updates with Expo

---

## 🔌 API Documentation

### Base Configuration
- **Base URL**: `http://localhost:3000/api` (development)
- **Authentication**: JWT Bearer token required for protected routes
- **Content-Type**: `application/json`
- **Response Format**: JSON

### Authentication Endpoints

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "securepassword",
  "user_type": "fisherman" // or "boat_owner"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "user_type": "fisherman",
    "verification_status": "pending"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "user_type": "fisherman"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /auth/reset-password
Request password reset email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

### Job Management Endpoints

#### GET /jobs
Get all active job postings with optional filtering.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `location`: Filter by location
- `experience`: Filter by experience level
- `user_type`: Filter by user type

**Response (200):**
```json
{
  "jobs": [
    {
      "job_id": 1,
      "title": "Deep Sea Fishing Crew",
      "description": "Experienced crew needed for 5-day deep sea fishing trip",
      "location": "Mombasa Port",
      "start_date": "2025-07-15",
      "duration_days": 5,
      "crew_needed": 3,
      "experience_required": "intermediate",
      "payment_amount": 15000.00,
      "status": "active",
      "boat_owner": {
        "name": "Captain Smith",
        "rating": 4.8
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_jobs": 47
  }
}
```

#### POST /jobs
Create a new job posting (boat owners only).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "title": "Deep Sea Fishing Crew",
  "description": "Experienced crew needed for deep sea fishing",
  "location": "Mombasa Port",
  "start_date": "2025-07-15",
  "end_date": "2025-07-20",
  "crew_needed": 3,
  "experience_required": "intermediate",
  "payment_amount": 15000.00
}
```

#### PUT /jobs/:id
Update job posting (boat owner only).

### Job Application Endpoints

#### POST /job-applications
Apply for a job (fishermen only).

**Request Body:**
```json
{
  "job_id": 1,
  "application_message": "I have 5 years of deep sea fishing experience..."
}
```

#### GET /job-applications/my-applications
Get user's job applications.

#### PUT /job-applications/:id/respond
Respond to job application (boat owner only).

**Request Body:**
```json
{
  "status": "accepted", // or "rejected"
  "response_message": "Welcome aboard! Please contact me for details."
}
```

### Payment Endpoints

#### POST /payments/initiate-job-payment
Initiate M-Pesa payment for completed job.

**Request Body:**
```json
{
  "job_id": 1,
  "application_id": 5,
  "phone_number": "254712345678",
  "amount": 15000.00
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "checkout_request_id": "ws_CO_DMZ_123456789_01072025_174856",
  "merchant_request_id": "29115-34620561-1"
}
```

#### GET /payments/history
Get user's payment history.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by payment status

#### POST /payments/query-status
Query M-Pesa transaction status.

**Request Body:**
```json
{
  "checkoutRequestID": "ws_CO_DMZ_123456789_01072025_174856"
}
```

### Messaging Endpoints

#### GET /messages/conversations
Get user's conversations.

#### GET /messages/conversation/:userId
Get messages with specific user.

#### POST /messages/send
Send a message.

**Request Body:**
```json
{
  "recipient_id": 2,
  "message": "Hello, I'm interested in your job posting."
}
```

### Admin Endpoints

#### GET /admin/users
Get all users (admin only).

#### GET /admin/payments
Get all platform payments (admin only).

#### GET /admin/payments/statistics
Get payment statistics (admin only).

#### POST /admin/payments/:id/refund
Process payment refund (admin only).

### Error Responses

All endpoints may return these error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Invalid request data",
  "errors": ["Email is required", "Password must be at least 6 characters"]
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Access denied. Please login."
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Access denied. Insufficient privileges."
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 📂 Frontend Structure

### Directory Organization

```
FishCrewConnect/
├── app/                          # Screen components (Expo Router)
│   ├── (auth)/                   # Authentication screens
│   │   ├── login.jsx
│   │   ├── register.jsx
│   │   └── forgot-password.jsx
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── index.jsx             # Home/Jobs screen
│   │   ├── applications.jsx      # Job applications
│   │   ├── messages.jsx          # Messaging
│   │   └── profile.jsx           # User profile
│   ├── admin/                    # Admin screens
│   │   ├── index.jsx             # Admin dashboard
│   │   ├── users.jsx             # User management
│   │   └── payments.jsx          # Payment management
│   ├── job-details/              # Job detail screens
│   ├── create-job.jsx            # Job creation
│   ├── payment-dashboard.jsx     # Payment overview
│   ├── payment-history.jsx       # Payment history
│   ├── messaging.jsx             # Individual conversations
│   └── _layout.jsx               # Root layout
├── components/                   # Reusable UI components
│   ├── CustomButton.jsx          # Custom button component
│   ├── HeaderBox.jsx             # Header component
│   ├── JobCard.jsx               # Job listing card
│   ├── PaymentModal.jsx          # Payment modal
│   ├── ApplicationItem.jsx       # Application list item
│   ├── Charts.jsx                # Chart components
│   └── FormInput.jsx             # Form input component
├── services/                     # API and business logic
│   ├── api.js                    # API service layer
│   ├── messageService.js         # Messaging service
│   ├── socketService.js          # Socket.IO service
│   └── helpContent.js            # Help content data
├── context/                      # React Context providers
│   ├── AuthContext.js            # Authentication context
│   └── NotificationContext.js    # Notification context
├── config/                       # Configuration files
│   └── api.js                    # API configuration
└── assets/                       # Static assets
    ├── images/                   # Image files
    ├── fonts/                    # Custom fonts
    └── logo.png                  # App logo
```

### Key Components

#### CustomButton Component
Standardized button component with loading states and variants.

```jsx
export default function CustomButton({ 
  title, 
  onPress, 
  isLoading = false, 
  variant = 'primary',
  disabled = false 
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      className={`rounded-lg p-3 ${getVariantStyles(variant)}`}
    >
      {isLoading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className="text-center font-medium text-white">
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
```

#### JobCard Component
Displays job information in a card format.

```jsx
export default function JobCard({ job, onPress, showApplicationButton = true }) {
  return (
    <TouchableOpacity
      onPress={() => onPress(job)}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3"
    >
      <Text className="text-lg font-semibold text-gray-900 mb-2">
        {job.title}
      </Text>
      <Text className="text-gray-600 mb-3" numberOfLines={2}>
        {job.description}
      </Text>
      
      <View className="flex-row justify-between items-center">
        <Text className="text-blue-600 font-medium">
          KSH {job.payment_amount?.toLocaleString()}
        </Text>
        <Text className="text-gray-500 text-sm">
          {job.crew_needed} crew needed
        </Text>
      </View>
    </TouchableOpacity>
  );
}
```

### State Management

#### AuthContext
Manages user authentication state across the app.

```jsx
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData, token) => {
    await AsyncStorage.setItem('userToken', token);
    await AsyncStorage.setItem('userData', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['userToken', 'userData']);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 🖥️ Backend Structure

### Directory Organization

```
FishCrewConnect-backend/
├── controllers/                  # Business logic handlers
│   ├── authController.js         # Authentication logic
│   ├── jobController.js          # Job management
│   ├── jobApplicationController.js # Application handling
│   ├── paymentController.js      # Payment processing
│   ├── messageController.js      # Messaging logic
│   ├── adminController.js        # Admin functionality
│   ├── userController.js         # User management
│   └── supportController.js      # Support tickets
├── routes/                       # API route definitions
│   ├── authRoutes.js            # Authentication routes
│   ├── jobRoutes.js             # Job routes
│   ├── jobApplicationRoutes.js   # Application routes
│   ├── paymentRoutes.js         # Payment routes
│   ├── messageRoutes.js         # Message routes
│   ├── adminRoutes.js           # Admin routes
│   └── supportRoutes.js         # Support routes
├── middleware/                   # Express middleware
│   ├── authMiddleware.js        # JWT authentication
│   ├── validationMiddleware.js   # Input validation
│   └── adminMiddleware.js       # Admin authorization
├── config/                      # Configuration files
│   └── db.js                    # Database connection
├── services/                    # External service integrations
│   ├── emailService.js          # Email sending
│   ├── mpesaService.js          # M-Pesa integration
│   └── socketService.js         # Socket.IO setup
├── scripts/                     # Database scripts
│   ├── create_tables.sql        # Table creation
│   ├── seed_data.sql           # Sample data
│   └── migrations/             # Database migrations
├── uploads/                     # File upload directory
├── tests/                       # Test files
└── server.js                    # Main server file
```

### Key Controllers

#### AuthController
Handles user authentication operations.

```javascript
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, user_type } = req.body;
    
    // Check if user exists
    const [existingUser] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Insert user
    const [result] = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, user_type) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, phone, hashedPassword, user_type]
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: result.insertId, 
        email, 
        user_type 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        user_id: result.insertId,
        name,
        email,
        user_type,
        verification_status: 'pending'
      },
      token
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};
```

#### PaymentController
Handles M-Pesa payment integration.

```javascript
const axios = require('axios');
const db = require('../config/db');

exports.initiateJobPayment = async (req, res) => {
  try {
    const { job_id, application_id, phone_number, amount } = req.body;
    const boat_owner_id = req.user.user_id;
    
    // Validate job and application
    const [application] = await db.query(`
      SELECT ja.*, j.boat_owner_id, j.title, u.name as fisherman_name
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.job_id
      JOIN users u ON ja.fisherman_id = u.user_id
      WHERE ja.application_id = ? AND j.job_id = ?
    `, [application_id, job_id]);
    
    if (application.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Calculate commission (15%)
    const totalAmount = parseFloat(amount);
    const commissionRate = 0.15;
    const platformCommission = totalAmount * commissionRate;
    const fishermanAmount = totalAmount - platformCommission;
    
    // Generate M-Pesa access token
    const accessToken = await getMpesaAccessToken();
    
    // Initiate STK Push
    const stkPushResponse = await initiateSTKPush({
      accessToken,
      phoneNumber: phone_number,
      amount: totalAmount,
      accountReference: `JOB${job_id}`,
      transactionDesc: `Payment for ${application[0].title}`
    });
    
    // Save payment record
    await db.query(`
      INSERT INTO job_payments (
        job_id, fisherman_id, boat_owner_id, total_amount,
        fisherman_amount, platform_commission, mpesa_checkout_request_id,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      job_id,
      application[0].fisherman_id,
      boat_owner_id,
      totalAmount,
      fishermanAmount,
      platformCommission,
      stkPushResponse.CheckoutRequestID
    ]);
    
    res.json({
      success: true,
      message: 'Payment initiated successfully',
      checkout_request_id: stkPushResponse.CheckoutRequestID,
      merchant_request_id: stkPushResponse.MerchantRequestID
    });
    
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment'
    });
  }
};
```

### Middleware

#### Authentication Middleware
Verifies JWT tokens and user permissions.

```javascript
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data
    const [user] = await db.query(
      'SELECT user_id, name, email, user_type, verification_status FROM users WHERE user_id = ?',
      [decoded.user_id]
    );

    if (user.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    req.user = user[0];
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

exports.requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.user_type)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient privileges.'
      });
    }
    next();
  };
};
```
