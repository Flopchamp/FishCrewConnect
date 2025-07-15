# 🐟 FishCrewConnect Mobile App

A React Native mobile application connecting fishermen with boat owners for job opportunities.

## 🌟 Features

### ✅ **Authentication & Security**
- User registration and login (fishermen, boat owners)
- Password reset functionality
- Real-time input validation
- Secure JWT token handling

### ✅ **Smart Messaging System**
- **Focused Contacts**: Only see relevant users based on job applications
- **Professional Environment**: Business-focused messaging relationships
- **Empty State Guidance**: Clear instructions for users

### ✅ **Form Validation**
- **Email Validation**: Real-time format checking
- **Contact Numbers**: Digits-only input restriction
- **Password Security**: Length and strength validation

### ✅ **User Experience**
- Clean, modern UI with Tailwind CSS
- Context-aware messaging
- Responsive design
- Professional profile management

## 🏗️ Project Structure

```
FishCrewConnect/
├── app/             # Screen components (Expo Router)
│   ├── (auth)/      # Authentication screens
│   ├── (tabs)/      # Main tab navigation
│   └── ...          # Other screens
├── components/      # Reusable UI components
├── services/        # API service layer
├── context/         # React context providers
├── assets/          # Images and fonts
└── config/          # Configuration files
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Expo CLI
- iOS Simulator or Android Emulator (or physical device)
- **FishCrewConnect Backend running**

### Installation

1. **Start the backend server first:**
   ```bash
   cd ../FishCrewConnect-backend
   npm install
   npm start
   ```

2. **Install frontend dependencies:**
   ```bash
   cd FishCrewConnect
   npm install
   ```

3. **Configure API connection (if needed):**
   Edit `config/api.js` to set the correct server address:
   ```javascript
   const API_BASE_URL = 'http://localhost:3001'; // Update if needed
   ```

4. **Start the app:**
   ```bash
   npm start
   # or for specific platforms:
   npm run ios
   npm run android
   npm run web
   ```

## 📱 Key Screens

### Authentication Flow
- **Sign Up**: User registration with validation
- **Sign In**: Secure login
- **Forgot Password**: Password reset functionality

### Main Application
- **Profile**: User profile management with contact validation
- **Contacts**: Smart-filtered messaging contacts
- **Conversations**: Professional messaging interface
- **Jobs**: Job browsing and application management

## 🔐 Security Features

### Input Validation
- **Email Format**: Real-time validation with proper error messages
- **Contact Numbers**: Automatic digits-only filtering
- **Password Strength**: Minimum length requirements
- **Form Security**: Client-side validation with backend verification

### Authentication
- **JWT Tokens**: Secure token-based authentication
- **Auto-logout**: Session management
- **Protected Routes**: Authentication-required screens

## 🎨 UI/UX Features

### Professional Design
- **Tailwind CSS**: Modern, responsive styling
- **NativeWind**: React Native optimized Tailwind
- **Custom Components**: Reusable UI elements
- **Context-Aware**: User type specific interfaces

### User Guidance
- **Empty States**: Clear messaging when no data
- **Validation Feedback**: Real-time form validation
- **Error Handling**: User-friendly error messages
- **Loading States**: Smooth user experience

## 🧪 Testing the App

### Authentication Testing
1. Register as different user types (fisherman/boat owner)
2. Test email validation with invalid formats
3. Test contact number validation with non-numeric input
4. Verify password reset functionality

### Contacts Filtering Testing
1. Create new users
2. Verify empty contacts list (expected)
3. Apply to jobs (when enabled)
4. Verify contacts appear after job applications

## 🔧 Configuration

### API Configuration
```javascript
// config/api.js
export const API_BASE_URL = 'http://localhost:3001';
export const API_ENDPOINTS = {
  AUTH: {
    SIGNUP: '/api/auth/signup',
    SIGNIN: '/api/auth/signin',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password'
  },
  USERS: {
    CONTACTS: '/api/users/contacts',
    PROFILE: '/api/users/profile'
  }
};
```

## 📚 Key Components

### Authentication Context
- Manages user authentication state
- Handles token storage and retrieval
- Provides login/logout functionality

### Form Validation
- Real-time input validation
- Custom validation hooks
- Error message management

### API Services
- Centralized API communication
- Request/response handling
- Error management

## 🛠️ Development Notes

### Dependencies
- **Expo**: React Native framework
- **React Navigation**: Tab and stack navigation
- **Axios**: HTTP client for API calls
- **AsyncStorage**: Local data persistence
- **Tailwind CSS**: Styling framework

### Code Quality
- Clean component structure
- Proper error handling
- Consistent styling patterns
- Reusable components

## 🎯 Production Ready Features

- ✅ Real backend integration (no mock data)
- ✅ Comprehensive form validation
- ✅ Professional UI/UX design
- ✅ Secure authentication flow
- ✅ Smart contacts filtering
- ✅ Error handling and user feedback

---

**FishCrewConnect Mobile** - Professional fishing industry connections in your pocket! 🎣📱

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code toconst socketOptions = {
  reconnectionAttempts: 15,
  reconnectionDelay: 2000,
  timeout: 20000,
  transports: ['polling', 'websocket'],
  autoConnect: false,
  forceNew: true
}; the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
