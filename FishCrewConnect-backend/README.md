# 🐟 FishCrewConnect Backend

A professional platform connecting fishermen with boat owners for job opportunities.

## 🌟 Features

### ✅ **Authentication & Security**
- User registration and login (fishermen, boat owners, admins)
- JWT-based authentication
- Password reset functionality
- Input validation and sanitization

### ✅ **Smart Messaging System**
- **Focused Contacts**: Fishermen only see boat owners they've applied to work for
- **Professional Environment**: Boat owners only see fishermen who applied to their jobs
- **Privacy Protection**: No random messaging between unrelated users

### ✅ **Robust Validation**
- **Email Validation**: Format validation on all auth endpoints
- **Contact Numbers**: Digits-only validation
- **Password Security**: Minimum length requirements
- **Backend + Frontend**: Validation on both sides

### ✅ **Job Management**
- Job posting by boat owners
- Job applications by fishermen
- Application tracking and management

## 🏗️ Project Structure

```
FishCrewConnect-backend/
├── config/          # Database configuration
├── controllers/     # Request handlers
├── middleware/      # Auth and validation middleware
├── routes/          # API route definitions
├── scripts/         # Database setup scripts
├── tests/           # Test files
├── docs/            # Documentation
└── server.js        # Main application entry
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MySQL database
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd FishCrewConnect-backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Create .env file with:
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=fishcrew
   JWT_SECRET=your_jwt_secret
   PORT=3001
   ```

3. **Set up the database:**
   ```bash
   # Run database setup scripts
   node scripts/create-password-resets-table.js
   ```

4. **Start the server:**
   ```bash
   npm start
   # Development mode:
   npm run dev
   ```

## 🧪 Testing

### Run Contact Filtering Tests
```bash
cd tests
node test-contacts-filtering.js
```

### Run Email Validation Tests
```bash
cd tests
node test-email-validation.js
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Users & Contacts
- `GET /api/users/contacts` - Get filtered contacts (🔒 Protected)
- `GET /api/users/profile` - Get user profile (🔒 Protected)
- `PUT /api/users/profile` - Update profile (🔒 Protected)

### Jobs & Applications
- `GET /api/jobs` - List jobs
- `POST /api/jobs` - Create job (🔒 Boat owners only)
- `POST /api/job-applications/:id/apply` - Apply to job (🔒 Fishermen only)

## 🔐 Security Features

### Contact Filtering Logic
```sql
-- Fishermen see only boat owners they applied to:
SELECT DISTINCT boat_owners 
FROM jobs j 
INNER JOIN job_applications ja ON j.job_id = ja.job_id 
WHERE ja.user_id = [FISHERMAN_ID]

-- Boat owners see only fishermen who applied:
SELECT DISTINCT fishermen 
FROM job_applications ja 
INNER JOIN jobs j ON ja.job_id = j.job_id 
WHERE j.user_id = [BOAT_OWNER_ID]
```

### Input Validation
- **Email**: RFC-compliant format validation
- **Contact Numbers**: Digits-only restriction
- **Passwords**: Minimum 6 characters
- **SQL Injection**: Parameterized queries protection

## Documentation

- [Messaging Feature Details](docs/MESSAGING_FEATURE.md)
- [Testing Summary](docs/TEST_SUMMARY.md)

## Development

### Code Structure
- **Controllers**: Handle business logic
- **Routes**: Define API endpoints
- **Middleware**: Authentication and validation
- **Config**: Database and environment setup

### Key Features Implementation
1. **Smart Contact Filtering**: Prevents spam and maintains professional environment
2. **Comprehensive Validation**: Multiple layers of input validation
3. **Secure Authentication**: JWT with proper token handling
4. **Password Recovery**: Complete forgot/reset password flow

## Production Ready Features

- ✅ Error handling and logging
- ✅ Input validation and sanitization
- ✅ SQL injection protection
- ✅ CORS configuration
- ✅ Environment-based configuration
- ✅ Comprehensive testing

## Support

For issues or questions, refer to the documentation in the `docs/` directory or check the test files for usage examples.

---

**FishCrewConnect** - Connecting the fishing industry, one crew at a time! 🎣
