# 📍 FishCrewConnect User Manuals - Location Guide

## Where to Find User Manuals

The comprehensive user manuals for FishCrewConnect are now fully integrated into the app and accessible through multiple locations:

---

## 🔍 **Primary Access Points**

### 1. **Help Center Screen** (Main Access)
- **Location**: Directly accessible via `/help-center` route
- **Navigation**: 
  - Profile Tab → "Help Center" button in the "Need Help?" section
  - Jobs Screen → Help icon (?) in the top-right header
- **Features**:
  - Role-based content (shows manual relevant to your user type)
  - Search functionality across all help topics
  - Interactive navigation between sections
  - Quick access to support form

### 2. **Profile Screen Integration**
- **Location**: Profile Tab → "Need Help?" section
- **Options**:
  - **"Help Center"** button → Opens the full in-app manual system
  - **"Email Support"** button → Opens email client for direct support

### 3. **Jobs Screen Quick Access**
- **Location**: Jobs Tab → Help icon (?) in header
- **Purpose**: Quick access to help while browsing or managing jobs

---

## 📚 **Available Manuals by User Type**

### **Boat Owners**
When logged in as a boat owner, the Help Center displays:
- **Getting Started** - Account setup and first-time use
- **Account Setup** - Registration and profile completion
- **Job Management** - Creating, editing, and managing job postings
- **Crew Management** - Handling applications and crew communication
- **Payment System** - Understanding payment processes and M-Pesa integration
- **Communication** - Using messaging and notification features
- **Safety & Compliance** - Important safety guidelines and regulations
- **Troubleshooting** - Common issues and solutions

### **Fishermen/Crew**
When logged in as a fisherman, the Help Center displays:
- **Getting Started** - Account setup and profile creation
- **Finding Jobs** - How to search and filter job opportunities
- **Application Process** - Applying for jobs and tracking applications
- **Communication** - Messaging with boat owners
- **Payment System** - Understanding how payments work
- **Safety Guidelines** - Important safety information
- **Profile Management** - Maintaining and updating your profile
- **Troubleshooting** - Common issues and solutions

### **Admins**
When logged in as an admin, the Help Center displays:
- **Dashboard Overview** - Understanding the admin interface
- **User Management** - Managing users and accounts
- **Job Oversight** - Monitoring and managing job postings
- **Payment Administration** - Handling payment issues and disputes
- **Communication Monitoring** - Overseeing platform communications
- **Analytics & Reporting** - Using reporting tools
- **System Maintenance** - Platform maintenance tasks
- **Troubleshooting** - Advanced troubleshooting procedures

---

## 🔧 **Technical Implementation**

### **Frontend Structure**
```
FishCrewConnect/
├── app/
│   ├── help-center.jsx          # Main Help Center screen
│   ├── support-form.jsx         # Support ticket submission
│   └── (tabs)/
│       ├── index.jsx           # Jobs screen with help icon
│       └── profile.jsx         # Profile with help access
├── services/
│   └── helpContent.js          # Structured help content
└── components/
    └── HeaderBox.jsx           # Header component with help support
```

### **Backend Support**
```
FishCrewConnect-backend/
├── controllers/
│   └── supportController.js    # Support ticket handling
├── routes/
│   └── supportRoutes.js        # Support API routes
└── services/
    └── emailService.js         # Email notifications for support
```

---

## 💡 **How Users Discover the Manuals**

### **New Users**
1. **Welcome Flow**: After registration, users are guided to complete their profile
2. **Profile Section**: The "Need Help?" section is prominently displayed
3. **First Job Interaction**: Help icon is visible when they start using job features

### **Existing Users**
1. **Profile Tab**: Always accessible through the main navigation
2. **Contextual Help**: Help icon on job screen provides immediate assistance
3. **Search Functionality**: Users can search for specific topics within the Help Center

### **Support Integration**
1. **Help-First Approach**: Users see comprehensive help before contacting support
2. **Escalation Path**: If help content doesn't solve their issue, they can submit a support ticket
3. **Email Backup**: Traditional email support remains available

---

## 📋 **Content Management**

### **Static Documentation**
The following files serve as the source documentation:
- `docs/BOATOWNER_USER_MANUAL.md` - Complete boat owner guide
- `docs/FISHERMAN_USER_MANUAL.md` - Complete fisherman guide  
- `docs/ADMIN_USER_MANUAL.md` - Complete admin guide
- `docs/QUICK_REFERENCE_GUIDE.md` - Quick reference for all users

### **Dynamic In-App Content**
- `services/helpContent.js` - Structured content served to the Help Center
- Content is role-based and automatically filtered by user type
- Search and navigation features enhance discoverability

---

## ✅ **Summary**

**The user manuals are now fully accessible within the FishCrewConnect app through:**

1. **Profile Tab** → Help Center button
2. **Jobs Screen** → Help icon in header  
3. **Direct URL** → `/help-center` route
4. **Support Flow** → Help-first approach before contacting support

**Users see role-appropriate content automatically based on their account type (boat owner, fisherman, or admin), with full search and navigation capabilities.**
