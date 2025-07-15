# 📚 FishCrewConnect - API Reference Guide

## 📋 Table of Contents

1. [Authentication API](#authentication-api)
2. [User Management API](#user-management-api)
3. [Job Management API](#job-management-api)
4. [Application Management API](#application-management-api)
5. [Payment API](#payment-api)
6. [Messaging API](#messaging-api)
7. [Admin API](#admin-api)
8. [Support API](#support-api)
9. [Error Codes Reference](#error-codes-reference)

---

## 🔐 Authentication API

### Base URL
```
Production: https://api.fishcrewconnect.com/api
Development: http://localhost:3000/api
```

### Authentication Header
```
Authorization: Bearer <jwt_token>
```

---

## 🔑 Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "securepassword123",
  "user_type": "fisherman"
}
```

**Validation Rules:**
- `name`: Required, 2-100 characters
- `email`: Required, valid email format
- `phone`: Required, digits only, 10-15 characters
- `password`: Required, minimum 6 characters
- `user_type`: Required, enum: ["fisherman", "boat_owner"]

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "user_type": "fisherman",
    "verification_status": "pending",
    "created_at": "2025-07-01T10:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400`: Validation errors or user already exists
- `500`: Server error

### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "user_type": "fisherman",
    "verification_status": "verified"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400`: Invalid credentials
- `401`: Account not verified
- `500`: Server error

### POST /auth/forgot-password
Request password reset email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent successfully"
}
```

### POST /auth/reset-password
Reset password using reset token.

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "new_password": "newpassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### POST /auth/verify-email
Verify email address using verification token.

**Request Body:**
```json
{
  "token": "verification_token_from_email"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

## 👤 User Management API

### GET /users/profile
Get current user profile.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "user_id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "user_type": "fisherman",
    "verification_status": "verified",
    "profile_image": "https://example.com/profile.jpg",
    "location": "Mombasa",
    "experience_years": 5,
    "bio": "Experienced fisherman with deep sea expertise",
    "skills": ["Deep Sea Fishing", "Net Handling"],
    "rating": 4.8,
    "total_reviews": 25,
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

### PUT /users/profile
Update user profile.

**Request Body:**
```json
{
  "name": "John Updated",
  "phone": "0987654321",
  "location": "Kilifi",
  "experience_years": 6,
  "bio": "Updated bio",
  "skills": ["Deep Sea Fishing", "Trawling", "Navigation"]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    // Updated user object
  }
}
```

### POST /users/upload-profile-image
Upload profile image.

**Request (multipart/form-data):**
```
profile_image: <image_file>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "image_url": "https://example.com/uploads/profile_123456.jpg"
}
```

### POST /users/upload-cv
Upload CV document (fishermen only).

**Request (multipart/form-data):**
```
cv_document: <pdf_file>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "CV uploaded successfully",
  "cv_url": "https://example.com/uploads/cv_123456.pdf"
}
```

### GET /users/download-cv/:userId
Download user's CV (boat owners only).

**Parameters:**
- `userId`: Target user's ID

**Success Response (200):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="john_doe_cv.pdf"
```

---

## 💼 Job Management API

### GET /jobs
Get all active job postings with optional filtering.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)
- `location`: Filter by location
- `experience`: Filter by experience level ["beginner", "intermediate", "expert"]
- `min_payment`: Minimum payment amount
- `max_payment`: Maximum payment amount
- `search`: Search in title and description
- `sort`: Sort by ["created_at", "payment_amount", "deadline"] (default: created_at)
- `order`: Sort order ["asc", "desc"] (default: desc)

**Success Response (200):**
```json
{
  "success": true,
  "jobs": [
    {
      "job_id": 1,
      "title": "Deep Sea Fishing Crew - 5 Days",
      "description": "Looking for experienced crew for deep sea fishing expedition...",
      "location": "Mombasa Port",
      "start_date": "2025-07-15",
      "end_date": "2025-07-20",
      "duration_days": 5,
      "crew_needed": 3,
      "experience_required": "intermediate",
      "payment_amount": 15000.00,
      "status": "active",
      "created_at": "2025-07-01T10:00:00.000Z",
      "boat_owner": {
        "user_id": 2,
        "name": "Captain Smith",
        "profile_image": "https://example.com/captain.jpg",
        "rating": 4.9,
        "total_reviews": 45
      },
      "application_count": 12,
      "applications_deadline": "2025-07-10T23:59:59.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total": 47,
    "total_pages": 5
  },
  "filters_applied": {
    "location": "Mombasa",
    "experience": "intermediate"
  }
}
```

### GET /jobs/:id
Get specific job details.

**Parameters:**
- `id`: Job ID

**Success Response (200):**
```json
{
  "success": true,
  "job": {
    "job_id": 1,
    "title": "Deep Sea Fishing Crew - 5 Days",
    "description": "Detailed job description...",
    "requirements": [
      "5+ years experience",
      "Deep sea fishing certification",
      "Physical fitness"
    ],
    "benefits": [
      "Meals included",
      "Safety equipment provided",
      "Performance bonus available"
    ],
    "location": "Mombasa Port",
    "start_date": "2025-07-15",
    "end_date": "2025-07-20",
    "duration_days": 5,
    "crew_needed": 3,
    "experience_required": "intermediate",
    "payment_amount": 15000.00,
    "status": "active",
    "boat_owner": {
      "user_id": 2,
      "name": "Captain Smith",
      "profile_image": "https://example.com/captain.jpg",
      "rating": 4.9,
      "total_reviews": 45,
      "location": "Mombasa",
      "experience_years": 15
    },
    "application_count": 12,
    "user_has_applied": false,
    "applications_deadline": "2025-07-10T23:59:59.000Z",
    "created_at": "2025-07-01T10:00:00.000Z"
  }
}
```

### POST /jobs
Create a new job posting (boat owners only).

**Request Body:**
```json
{
  "title": "Deep Sea Fishing Crew - 5 Days",
  "description": "Looking for experienced crew members for a 5-day deep sea fishing expedition...",
  "requirements": [
    "5+ years experience",
    "Deep sea fishing certification"
  ],
  "benefits": [
    "Meals included",
    "Safety equipment provided"
  ],
  "location": "Mombasa Port",
  "start_date": "2025-07-15",
  "end_date": "2025-07-20",
  "crew_needed": 3,
  "experience_required": "intermediate",
  "payment_amount": 15000.00,
  "applications_deadline": "2025-07-10T23:59:59.000Z"
}
```

**Validation Rules:**
- `title`: Required, 5-255 characters
- `description`: Required, 10+ characters
- `location`: Required, 2-255 characters
- `start_date`: Required, future date
- `end_date`: Required, after start_date
- `crew_needed`: Required, 1-50
- `experience_required`: Required, enum
- `payment_amount`: Required, positive number

**Success Response (201):**
```json
{
  "success": true,
  "message": "Job created successfully",
  "job": {
    "job_id": 1,
    "title": "Deep Sea Fishing Crew - 5 Days",
    // ... full job object
  }
}
```

### PUT /jobs/:id
Update job posting (boat owner only).

**Request Body:** Same as POST /jobs

**Success Response (200):**
```json
{
  "success": true,
  "message": "Job updated successfully",
  "job": {
    // Updated job object
  }
}
```

### DELETE /jobs/:id
Delete job posting (boat owner only).

**Success Response (200):**
```json
{
  "success": true,
  "message": "Job deleted successfully"
}
```

### GET /jobs/my-jobs
Get current user's job postings (boat owners) or applications (fishermen).

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status

**Success Response (200):**
```json
{
  "success": true,
  "jobs": [
    // Array of user's jobs or applied jobs
  ],
  "pagination": {
    // Pagination info
  }
}
```

---

## 📋 Application Management API

### POST /job-applications
Apply for a job (fishermen only).

**Request Body:**
```json
{
  "job_id": 1,
  "application_message": "I am very interested in this position. I have 5 years of deep sea fishing experience and hold relevant certifications..."
}
```

**Validation Rules:**
- `job_id`: Required, valid job ID
- `application_message`: Required, 10+ characters

**Success Response (201):**
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "application": {
    "application_id": 1,
    "job_id": 1,
    "fisherman_id": 1,
    "boat_owner_id": 2,
    "application_message": "I am very interested in this position...",
    "status": "pending",
    "applied_at": "2025-07-01T12:00:00.000Z",
    "job": {
      "title": "Deep Sea Fishing Crew - 5 Days",
      "payment_amount": 15000.00
    }
  }
}
```

### GET /job-applications
Get user's job applications.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status ["pending", "accepted", "rejected", "withdrawn"]
- `job_id`: Filter by specific job

**Success Response (200):**
```json
{
  "success": true,
  "applications": [
    {
      "application_id": 1,
      "job_id": 1,
      "application_message": "I am very interested...",
      "status": "pending",
      "applied_at": "2025-07-01T12:00:00.000Z",
      "response_at": null,
      "response_message": null,
      "job": {
        "title": "Deep Sea Fishing Crew - 5 Days",
        "location": "Mombasa Port",
        "start_date": "2025-07-15",
        "payment_amount": 15000.00,
        "boat_owner_name": "Captain Smith"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total": 5,
    "total_pages": 1
  }
}
```

### GET /job-applications/:id
Get specific application details.

**Success Response (200):**
```json
{
  "success": true,
  "application": {
    "application_id": 1,
    "job_id": 1,
    "application_message": "I am very interested in this position...",
    "status": "accepted",
    "applied_at": "2025-07-01T12:00:00.000Z",
    "response_at": "2025-07-02T14:30:00.000Z",
    "response_message": "Welcome aboard! Please contact me for further details.",
    "fisherman": {
      "user_id": 1,
      "name": "John Doe",
      "profile_image": "https://example.com/john.jpg",
      "experience_years": 5,
      "rating": 4.7,
      "cv_url": "https://example.com/cv_john.pdf"
    },
    "job": {
      "title": "Deep Sea Fishing Crew - 5 Days",
      "description": "Looking for experienced crew...",
      "location": "Mombasa Port",
      "start_date": "2025-07-15",
      "payment_amount": 15000.00,
      "boat_owner": {
        "name": "Captain Smith",
        "contact_email": "captain@example.com"
      }
    }
  }
}
```

### PUT /job-applications/:id/respond
Respond to job application (boat owner only).

**Request Body:**
```json
{
  "status": "accepted",
  "response_message": "Welcome aboard! Please contact me at captain@example.com for further details."
}
```

**Validation Rules:**
- `status`: Required, enum: ["accepted", "rejected"]
- `response_message`: Required, 10+ characters

**Success Response (200):**
```json
{
  "success": true,
  "message": "Application response sent successfully",
  "application": {
    // Updated application object
  }
}
```

### PUT /job-applications/:id/withdraw
Withdraw job application (fisherman only).

**Success Response (200):**
```json
{
  "success": true,
  "message": "Application withdrawn successfully"
}
```

---

## 💳 Payment API

### POST /payments/initiate-job-payment
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

**Validation Rules:**
- `job_id`: Required, valid job ID
- `application_id`: Required, valid application ID
- `phone_number`: Required, M-Pesa format (254XXXXXXXXX)
- `amount`: Required, positive number

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "payment": {
    "payment_id": 1,
    "checkout_request_id": "ws_CO_DMZ_123456789_01072025174856",
    "merchant_request_id": "29115-34620561-1",
    "total_amount": 15000.00,
    "fisherman_amount": 12750.00,
    "platform_commission": 2250.00,
    "status": "pending"
  }
}
```

### GET /payments/status/:paymentId
Get payment status.

**Success Response (200):**
```json
{
  "success": true,
  "payment": {
    "payment_id": 1,
    "status": "completed",
    "total_amount": 15000.00,
    "fisherman_amount": 12750.00,
    "platform_commission": 2250.00,
    "mpesa_transaction_id": "OEI2AK4Q16",
    "created_at": "2025-07-01T15:30:00.000Z",
    "completed_at": "2025-07-01T15:32:15.000Z",
    "job": {
      "title": "Deep Sea Fishing Crew - 5 Days",
      "boat_owner_name": "Captain Smith"
    }
  }
}
```

### GET /payments/history
Get user's payment history.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status
- `date_from`: Filter from date (YYYY-MM-DD)
- `date_to`: Filter to date (YYYY-MM-DD)

**Success Response (200):**
```json
{
  "success": true,
  "payments": [
    {
      "payment_id": 1,
      "job_id": 1,
      "total_amount": 15000.00,
      "fisherman_amount": 12750.00,
      "platform_commission": 2250.00,
      "status": "completed",
      "created_at": "2025-07-01T15:30:00.000Z",
      "completed_at": "2025-07-01T15:32:15.000Z",
      "job_title": "Deep Sea Fishing Crew - 5 Days",
      "other_party_name": "Captain Smith",
      "payment_direction": "received"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total": 15,
    "total_pages": 2
  },
  "summary": {
    "total_received": 45000.00,
    "total_sent": 0.00,
    "total_commission_paid": 6750.00,
    "completed_payments": 3,
    "pending_payments": 1
  }
}
```

### POST /payments/query-status
Query M-Pesa transaction status.

**Request Body:**
```json
{
  "checkoutRequestID": "ws_CO_DMZ_123456789_01072025174856"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "transaction_status": {
    "ResultCode": "0",
    "ResultDesc": "The service request is processed successfully.",
    "MpesaReceiptNumber": "OEI2AK4Q16",
    "TransactionDate": "20250701153215",
    "PhoneNumber": "254712345678"
  }
}
```

---

## 💬 Messaging API

### GET /messages/conversations
Get user's conversations.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page

**Success Response (200):**
```json
{
  "success": true,
  "conversations": [
    {
      "conversation_id": "1_2",
      "other_user": {
        "user_id": 2,
        "name": "Captain Smith",
        "profile_image": "https://example.com/captain.jpg",
        "user_type": "boat_owner"
      },
      "last_message": {
        "message_id": 15,
        "message_text": "Thank you for your interest in the job",
        "sent_at": "2025-07-01T16:45:00.000Z",
        "sender_id": 2
      },
      "unread_count": 2,
      "related_job": {
        "job_id": 1,
        "title": "Deep Sea Fishing Crew - 5 Days"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total": 5,
    "total_pages": 1
  }
}
```

### GET /messages/conversation/:userId
Get messages with specific user.

**Parameters:**
- `userId`: Other user's ID

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page (max: 100)

**Success Response (200):**
```json
{
  "success": true,
  "messages": [
    {
      "message_id": 1,
      "sender_id": 1,
      "recipient_id": 2,
      "message_text": "Hello, I'm interested in your fishing job",
      "sent_at": "2025-07-01T14:30:00.000Z",
      "read_at": "2025-07-01T14:35:00.000Z"
    },
    {
      "message_id": 2,
      "sender_id": 2,
      "recipient_id": 1,
      "message_text": "Thank you for your interest. Can you tell me about your experience?",
      "sent_at": "2025-07-01T14:40:00.000Z",
      "read_at": null
    }
  ],
  "other_user": {
    "user_id": 2,
    "name": "Captain Smith",
    "profile_image": "https://example.com/captain.jpg",
    "user_type": "boat_owner"
  },
  "pagination": {
    "current_page": 1,
    "per_page": 50,
    "total": 25,
    "total_pages": 1
  }
}
```

### POST /messages/send
Send a message.

**Request Body:**
```json
{
  "recipient_id": 2,
  "message": "Hello, I'm interested in your fishing job posting. I have 5 years of experience and would like to discuss the opportunity."
}
```

**Validation Rules:**
- `recipient_id`: Required, valid user ID
- `message`: Required, 1-1000 characters

**Success Response (201):**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "message_data": {
    "message_id": 16,
    "sender_id": 1,
    "recipient_id": 2,
    "message_text": "Hello, I'm interested in your fishing job posting...",
    "sent_at": "2025-07-01T17:00:00.000Z"
  }
}
```

### PUT /messages/:messageId/read
Mark message as read.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Message marked as read"
}
```

---

## 🛡️ Admin API

### GET /admin/dashboard
Get admin dashboard statistics.

**Success Response (200):**
```json
{
  "success": true,
  "statistics": {
    "totals": {
      "users": 1250,
      "jobs": 450,
      "applications": 2340,
      "payments": 890
    },
    "recent": {
      "users": 45,
      "jobs": 12,
      "applications": 67,
      "payments": 23
    },
    "payments": {
      "total_volume": 4500000.00,
      "total_commission": 675000.00,
      "average_amount": 5056.18,
      "success_rate": 94.5
    },
    "user_distribution": {
      "fishermen": 856,
      "boat_owners": 394
    }
  }
}
```

### GET /admin/users
Get all users (admin only).

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `user_type`: Filter by user type
- `verification_status`: Filter by verification status
- `search`: Search in name and email

**Success Response (200):**
```json
{
  "success": true,
  "users": [
    {
      "user_id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "user_type": "fisherman",
      "verification_status": "verified",
      "location": "Mombasa",
      "experience_years": 5,
      "rating": 4.7,
      "total_jobs": 15,
      "created_at": "2025-01-01T00:00:00.000Z",
      "last_login": "2025-07-01T14:30:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 50,
    "total": 1250,
    "total_pages": 25
  },
  "counts": {
    "all_users": 1250,
    "fishermen": 856,
    "boat_owners": 394,
    "pending_verification": 23,
    "verified": 1227
  }
}
```

### PUT /admin/users/:userId/verify
Verify user account (admin only).

**Request Body:**
```json
{
  "verification_status": "verified",
  "notes": "Documents verified successfully"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User verification status updated successfully"
}
```

### GET /admin/payments
Get all platform payments (admin only).

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by payment status
- `user_type`: Filter by user type
- `date_range`: Filter by date range (7, 30, 90 days)
- `search`: Search in payment ID, job title, user names

**Success Response (200):**
```json
{
  "success": true,
  "payments": [
    {
      "payment_id": 1,
      "job_id": 1,
      "job_title": "Deep Sea Fishing Crew - 5 Days",
      "fisherman_name": "John Doe",
      "boat_owner_name": "Captain Smith",
      "total_amount": 15000.00,
      "fisherman_amount": 12750.00,
      "platform_commission": 2250.00,
      "status": "completed",
      "mpesa_transaction_id": "OEI2AK4Q16",
      "created_at": "2025-07-01T15:30:00.000Z",
      "completed_at": "2025-07-01T15:32:15.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 50,
    "total": 890,
    "total_pages": 18
  }
}
```

### GET /admin/payments/statistics
Get payment statistics (admin only).

**Query Parameters:**
- `date_range`: Statistics period in days (default: 30)

**Success Response (200):**
```json
{
  "success": true,
  "statistics": {
    "total_payments": 890,
    "completed_payments": 841,
    "pending_payments": 23,
    "failed_payments": 26,
    "total_volume": 4500000.00,
    "total_commission": 675000.00,
    "average_payment": 5056.18,
    "success_rate": 94.5,
    "commission_rate": 0.15,
    "growth": {
      "payments_growth": 12.5,
      "volume_growth": 18.3,
      "commission_growth": 18.3
    },
    "period_days": 30
  }
}
```

---

## 🆘 Support API

### POST /support/ticket
Submit support ticket.

**Request Body:**
```json
{
  "category": "payment_issue",
  "subject": "Payment not received",
  "description": "I completed a job but haven't received payment yet. Job ID: 123",
  "priority": "high"
}
```

**Validation Rules:**
- `category`: Required, enum: ["account", "payment_issue", "job_posting", "technical", "other"]
- `subject`: Required, 5-200 characters
- `description`: Required, 10+ characters
- `priority`: Optional, enum: ["low", "medium", "high"]

**Success Response (201):**
```json
{
  "success": true,
  "message": "Support ticket submitted successfully",
  "ticket": {
    "ticket_id": "TICKET-20250701-001",
    "category": "payment_issue",
    "subject": "Payment not received",
    "status": "open",
    "priority": "high",
    "created_at": "2025-07-01T18:00:00.000Z"
  }
}
```

### GET /support/tickets
Get user's support tickets.

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `status`: Filter by status
- `category`: Filter by category

**Success Response (200):**
```json
{
  "success": true,
  "tickets": [
    {
      "ticket_id": "TICKET-20250701-001",
      "category": "payment_issue",
      "subject": "Payment not received",
      "status": "in_progress",
      "priority": "high",
      "created_at": "2025-07-01T18:00:00.000Z",
      "last_response_at": "2025-07-02T09:15:00.000Z",
      "response_count": 2
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total": 3,
    "total_pages": 1
  }
}
```

### GET /support/tickets/:ticketId
Get specific support ticket details.

**Success Response (200):**
```json
{
  "success": true,
  "ticket": {
    "ticket_id": "TICKET-20250701-001",
    "category": "payment_issue",
    "subject": "Payment not received",
    "description": "I completed a job but haven't received payment yet...",
    "status": "resolved",
    "priority": "high",
    "created_at": "2025-07-01T18:00:00.000Z",
    "resolved_at": "2025-07-02T14:30:00.000Z",
    "responses": [
      {
        "response_id": 1,
        "message": "Thank you for contacting support. We're investigating your payment issue.",
        "is_admin_response": true,
        "created_at": "2025-07-02T09:15:00.000Z"
      },
      {
        "response_id": 2,
        "message": "Your payment has been processed. Please check your M-Pesa messages.",
        "is_admin_response": true,
        "created_at": "2025-07-02T14:30:00.000Z"
      }
    ]
  }
}
```

---

## ❌ Error Codes Reference

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

### Application Error Codes

**Authentication Errors (AUTH_xxx)**
- `AUTH_001`: Invalid credentials
- `AUTH_002`: Account not verified
- `AUTH_003`: Token expired
- `AUTH_004`: Invalid token
- `AUTH_005`: Account suspended

**Validation Errors (VALID_xxx)**
- `VALID_001`: Required field missing
- `VALID_002`: Invalid email format
- `VALID_003`: Password too weak
- `VALID_004`: Invalid phone number format
- `VALID_005`: Invalid date format

**Job Errors (JOB_xxx)**
- `JOB_001`: Job not found
- `JOB_002`: Job already filled
- `JOB_003`: Application deadline passed
- `JOB_004`: Cannot apply to own job
- `JOB_005`: Already applied to this job

**Payment Errors (PAY_xxx)**
- `PAY_001`: Payment already initiated
- `PAY_002`: Invalid payment amount
- `PAY_003`: M-Pesa service unavailable
- `PAY_004`: Insufficient permissions for payment
- `PAY_005`: Payment not found

**Permission Errors (PERM_xxx)**
- `PERM_001`: Admin privileges required
- `PERM_002`: Boat owner only action
- `PERM_003`: Fisherman only action
- `PERM_004`: Resource owner only
- `PERM_005`: Account verification required

### Error Response Format

```json
{
  "success": false,
  "error_code": "AUTH_001",
  "message": "Invalid email or password",
  "details": {
    "field": "credentials",
    "provided": "user@example.com",
    "expected": "valid_credentials"
  },
  "timestamp": "2025-07-01T18:00:00.000Z",
  "request_id": "req_123456789"
}
```

---

*This API reference guide provides comprehensive documentation for all endpoints available in the FishCrewConnect platform. For technical support or questions, please contact the development team.*
