const helpContent = {
  // User manuals organized by user type and sections
  boatOwner: {
    title: "Boat Owner Guide",
    icon: "boat",
    sections: [
      {
        id: "getting-started",
        title: "Getting Started",
        icon: "rocket-outline",
        content: [
          {
            title: "System Requirements",
            content: `
Mobile Device: iOS 12+ or Android 6.0+
Internet Connection: Required for all features
M-Pesa Account: Required for payments (Kenya)
            `
          },
          {
            title: "First Time Setup",
            content: `
1. Download the App: Get FishCrewConnect from your app store
2. Create Account: Register as a "Boat Owner"
3. Verify Email: Check your email for verification link
4. Complete Profile: Add your boat and business details
            `
          }
        ]
      },
      {
        id: "account-setup",
        title: "Account Setup",
        icon: "person-outline",
        content: [
          {
            title: "Registration Process",
            content: `
1. Open the App and tap "Sign Up"
2. Select User Type: Choose "Boat Owner"
3. Fill in Details:
   - Full Name
   - Email Address (will be verified)
   - Phone Number (digits only)
   - Password (minimum 6 characters)
4. Complete Profile: Add additional information about you
            `
          },
          {
            title: "Profile Information to Complete",
            content: `
Personal Information
- Full name and contact details
- Location/port of operation
- Years of experience
- Profile photo (optional but recommended)

            `
          }
        ]
      },
      {
        id: "job-postings",
        title: "Creating Job Postings",
        icon: "add-circle-outline",
        content: [
          {
            title: "Step-by-Step Job Creation",
            content: `
1. Navigate to Jobs: Tap the "Jobs" tab in the main navigation
2. Create New Job: Tap the "+" button or "Create Job"
3. Fill Job Details:

Basic Information
- Job Title: Be specific (e.g., "Deep Sea Tuna Fishing - 3 Days")
- Description: Detailed job requirements and expectations
- Duration: Start date, end date, or number of days
- Location: Specific fishing areas 

Requirements
- Number of Crew: How many fishermen needed
- Experience Level: Beginner, Intermediate, or Expert
- Skills Required: Specific fishing techniques or equipment knowledge
- Physical Requirements: Any physical demands

Payment Information
- Payment Amount: Total compensation offered
            `
          },
          {
            title: "Job Posting Best Practices",
            content: `
Write Compelling Titles
 Good: "3-Day Deep Sea Tuna Fishing - Experienced Crew Needed"
 Poor: "Fishing Job"

Detailed Descriptions
- Clearly explain the fishing operation
- Mention specific techniques or equipment
- Include weather contingency plans
- Specify departure and return times

Fair Compensation
- Clarify if payment is per day or total job
            `
          }
        ]
      },
      {
        id: "managing-applications",
        title: "Managing Applications",
        icon: "list-outline",
        content: [
          {
            title: "Viewing Applications",
            content: `
1. Access Applications: Tap on any job posting to view applications
2. Review Applicants: See fishermen who have applied
3. Check Profiles: Review each applicant's:
   - Experience level
   - Previous reviews
   
            `
          },
          {
            title: "Application Management Process",
            content: `
Review Applications
- Read Reviews: See what other boat owners have said

Communicate with Applicants
- Send Messages: Use the built-in messaging system
- Ask Questions: Clarify experience or availability
- Discuss Details: Confirm job requirements and expectations

Accept or Decline
- Accept Applications: Confirm crew members for your job
- Send Notifications: Accepted applicants receive automatic notifications
- Decline Politely: Provide brief feedback when declining
- Keep Records: Track your hiring decisions
            `
          }
        ]
      },
      {
        id: "payment-system",
        title: "Payment System",
        icon: "card-outline",
        content: [
          {
            title: "How Payments Work",
            content: `
FishCrewConnect uses M-Pesa integration to ensure secure, reliable payments:

1. Job Completion: Mark job as completed when work is done
2. Initiate Payment: Use the payment system to pay crew members
3. M-Pesa Transaction: Payment is processed through M-Pesa
4. Automatic Distribution: System automatically:
   - Deducts platform commission (5%)
   - Sends payment to fisherman's M-Pesa account
   - Provides transaction confirmations
            `
          },
          {
            title: "Step-by-Step Payment Process",
            content: `
Initiating Payment
1. Navigate to Job: Go to completed job details
2. Select Crew Member: Choose who to pay
3. Enter Amount: Specify payment amount
4. Confirm Phone Number: Verify fisherman's M-Pesa number
5. Review Details: Check all payment information
6. Initiate Payment: Tap "Pay Now"

M-Pesa Payment
1. STK Push: You'll receive M-Pesa prompt on your phone
2. Enter PIN: Complete the M-Pesa transaction
3. Confirmation: Both parties receive confirmation messages
4. Automatic Transfer: Fisherman receives payment automatically
            `
          }
        ]
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        icon: "build-outline",
        content: [
          {
            title: "Common App Issues",
            content: `
Problem: App won't open or crashes
- Solution: Force close app and restart
- If persists: Update app to latest version
- Still having issues: Restart your device

Problem: Can't log in
- Check: Email and password are correct
- Try: Reset password if needed
- Verify: Internet connection is stable
- Contact: Support if account is locked
            `
          },
          {
            title: "Payment Issues",
            content: `
Problem: Payment failed
- Check: M-Pesa account has sufficient funds
- Verify: Phone number is correct
- Try: Initiate payment again
- Contact: Support if problem persists

Problem: Payment shows as pending
- Wait: Allow up to 30 minutes for processing
- Check: M-Pesa messages for status
- Verify: Network connection is stable
- Monitor: Payment dashboard for updates
            `
          }
        ]
      }
    ]
  },
  
  fisherman: {
    title: "Fisherman Guide",
    icon: "fish",
    sections: [
      {
        id: "getting-started",
        title: "Getting Started",
        icon: "rocket-outline",
        content: [
          {
            title: "System Requirements",
            content: `
Mobile Device: iOS 12+ or Android 6.0+
Internet Connection: Required for all features
M-Pesa Account: Required to receive payments (Kenya)
            `
          },
          {
            title: "First Time Setup",
            content: `
1. Download the App: Get FishCrewConnect from your app store
2. Create Accoun: Register as a "Fisherman"
3. Verify Email: Check your email for verification link
4. Complete Profile: Add your experience and skills
5. Browse Jobs: Start looking for fishing opportunities
            `
          }
        ]
      },
      {
        id: "finding-jobs",
        title: "Finding & Applying for Jobs",
        icon: "search-outline",
        content: [
          {
            title: "Browsing Available Jobs",
            content: `
1. Navigate to Jobs: Tap the "Jobs" tab in the main navigation
2. Browse Listings: Scroll through available opportunities
3. Filter Results: Use filters to find relevant jobs:
   - Location
   - Duration
   - Experience level required
   - Payment range
   - Job type
            `
          },
          {
            title: "Application Process",
            content: `
Step-by-Step Application
1. Read Job Details: Thoroughly review all job information
2. Check Requirements: Ensure you meet all criteria
3. Prepare Application: Think about why you're a good fit
4. Submit Application: Tap "Apply" and follow prompts
5. Upload your document: Explain your interest and qualifications
6. Submit: Send your application

            `
          }
        ]
      },
      {
        id: "receiving-payments",
        title: "Receiving Payments",
        icon: "wallet-outline",
        content: [
          {
            title: "How Payments Work",
            content: `
FishCrewConnect uses M-Pesa integration for secure, reliable payments:

1. Job Completion: Complete your fishing work successfully
2. Payment Initiation: Boat owner initiates payment through the app
3. Automatic Processing: System processes payment automatically
4.M-Pesa Receipt: You receive payment directly to your M-Pesa account
5. Confirmation: Both parties receive confirmation messages
            `
          },
          {
            title: "M-Pesa Account Setup",
            content: `
- Ensure Active Account: Your M-Pesa account must be active
- Correct Phone Number: Use the same number in your FishCrewConnect profile
- Sufficient Space: Ensure your M-Pesa account can receive the payment
- Transaction Limits: Be aware of daily M-Pesa receiving limits
            `
          }
        ]
      },
      {
        id: "building-reputation",
        title: "Building Your Reputation",
        icon: "star-outline",
        content: [
          {
            title: "Review System",
            content: `
- After Each Job: Boat owners can leave reviews of your work
- 5-Star Rating: Jobs are rated from 1 to 5 stars
- Written Feedback: Detailed comments about your performance
- Public Display: Reviews are visible to other boat owners
            `
          },
          {
            title: "Improving Your Ratings",
            content: `
- Professional Attitude: Always maintain a positive, professional demeanor
- Punctuality: Arrive on time for all commitments
- Skill Development: Continuously improve your fishing skills
- Communication: Keep clear, professional communication
- Reliability: Be dependable and follow through on commitments
            `
          }
        ]
      }
    ]
  },

  admin: {
    title: "Admin Guide",
    icon: "settings",
    sections: [
      {
        id: "dashboard",
        title: "Admin Dashboard",
        icon: "analytics-outline",
        content: [
          {
            title: "Dashboard Overview",
            content: `
Platform Statistics
- Total Users: Active boat owners and fishermen
- Active Jobs: Current job postings and applications
- Payment Metrics: Total transactions and revenue
- User Activity: Daily, weekly, and monthly activity trends

Recent Activity
- New User Registrations: Latest user sign-ups
- Job Postings: Recent job creation activity
- Payment Transactions: Latest payment activities
- System Alerts: Important system notifications
            `
          }
        ]
      },
      {
        id: "user-management",
        title: "User Management",
        icon: "people-outline",
        content: [
          {
            title: "User Administration",
            content: `
User Verification
1. Review New Registrations: Check new user profiles for completeness
2. Approve Profiles: Activate verified user accounts
3. Flag Suspicious Accounts: Identify and investigate questionable registrations

Account Management
- Suspend Accounts: Temporarily restrict access for policy violations

            `
          }
        ]
      }
    ]
  },

  common: {
    title: "General Help",
    icon: "help-circle",
    sections: [
      {
        id: "contact-support",
        title: "Contact Support",
        icon: "call-outline",
        content: [
          {
            title: "Support Channels",
            content: `
- In-App Support: Use the help section in the app
- Email: support@fishcrewconnect.com
- Phone: Available during business hours

Before Contacting Support
- Note the exact error message
- Try basic troubleshooting steps
- Have your account information ready
- Note when the problem started
            `
          }
        ]
      },
     
    ]
  }
};

export default helpContent;
