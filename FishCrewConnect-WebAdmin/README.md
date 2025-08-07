# FishCrewConnect Web Admin Dashboard

A modern, responsive web-based administration panel for the FishCrewConnect platform. This dashboard allows administrators to manage users, jobs, payments, and view analytics through a clean, intuitive interface.

## Features

- **Dashboard Overview**: Real-time platform statistics and key metrics
- **User Management**: View, verify, suspend/unsuspend users with advanced filtering
- **Job Management**: Monitor job postings, approve/reject jobs, view applications
- **Payment Management**: Track payments, process refunds, view commission earnings
- **Analytics**: Comprehensive charts and insights into platform performance
- **Settings**: Configure system settings, payment parameters, email, and security
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Data**: Live updates and notifications

## Technology Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS with custom components
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React for modern icons
- **HTTP Client**: Axios for API communication
- **Notifications**: React Hot Toast
- **Routing**: React Router DOM v6

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- FishCrewConnect Backend API running

## Installation

1. **Clone and navigate to the project:**
   ```bash
   cd FishCrewConnect-WebAdmin
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api
   VITE_APP_TITLE=FishCrewConnect Admin
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.jsx      # Main layout with sidebar
│   └── ProtectedRoute.jsx
├── context/            # React contexts
│   └── AuthContext.jsx # Authentication state management
├── pages/              # Main application pages
│   ├── DashboardPage.jsx
│   ├── UsersPage.jsx
│   ├── JobsPage.jsx
│   ├── PaymentsPage.jsx
│   ├── AnalyticsPage.jsx
│   ├── SettingsPage.jsx
│   └── LoginPage.jsx
├── services/           # API services
│   └── api.js          # HTTP client and API calls
├── App.jsx             # Main application component
├── main.jsx           # Application entry point
└── index.css          # Global styles
```

## API Integration

The dashboard connects to the existing FishCrewConnect backend API. Key endpoints used:

### Authentication
- `POST /api/admin/login` - Admin login
- `GET /api/admin/profile` - Get admin profile

### Dashboard
- `GET /api/admin/dashboard` - Dashboard statistics

### User Management
- `GET /api/admin/users` - Get all users with pagination
- `PUT /api/admin/users/:id/verify` - Verify user
- `PUT /api/admin/users/:id/suspend` - Suspend user
- `PUT /api/admin/users/:id/unsuspend` - Unsuspend user

### Job Management
- `GET /api/admin/jobs` - Get all jobs
- `PUT /api/admin/jobs/:id/approve` - Approve job
- `PUT /api/admin/jobs/:id/reject` - Reject job

### Payment Management
- `GET /api/admin/payments` - Get all payments
- `POST /api/admin/payments/:id/refund` - Process refund
- `PUT /api/admin/payments/:id/verify` - Verify payment

### Analytics
- `GET /api/admin/analytics` - Get analytics data

### Settings
- `GET /api/admin/settings` - Get system settings
- `PUT /api/admin/settings` - Update system settings

## Environment Configuration

### Development (.env)
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_TITLE=FishCrewConnect Admin
```

### Production (.env.production)
```env
VITE_API_BASE_URL=https://your-production-api.com/api
VITE_APP_TITLE=FishCrewConnect Admin
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Authentication

The admin dashboard uses JWT-based authentication. Admin users must log in with their credentials to access the dashboard. The authentication state is managed through React Context and persisted in localStorage.

### Admin Login Process
1. Enter email and password
2. API validates credentials
3. JWT token returned and stored
4. User redirected to dashboard
5. Token used for subsequent API requests

## Features Overview

### 🏠 Dashboard
- Platform overview with key metrics
- Recent activity feed
- Quick action buttons
- Real-time statistics

### 👥 User Management
- User listing with search and filtering
- User verification and status management
- Bulk actions for user operations
- Detailed user profiles

### 💼 Job Management
- Job listing with advanced filters
- Job approval/rejection workflow
- Application tracking
- Job performance metrics

### 💳 Payment Management
- Payment transaction history
- Refund processing capabilities
- Commission tracking
- Payment analytics

### 📊 Analytics
- Revenue and growth charts
- User engagement metrics
- Platform performance insights
- Customizable date ranges

### ⚙️ Settings
- System configuration
- Payment gateway settings
- Email and notification preferences
- Security settings

## Responsive Design

The dashboard is fully responsive and works seamlessly across:
- Desktop computers (1200px+)
- Tablets (768px - 1199px)
- Mobile devices (320px - 767px)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Security

- JWT token authentication
- Input validation and sanitization
- HTTPS enforcement in production
- Rate limiting on API endpoints
- Role-based access control

## Deployment

### Using Vite Build
```bash
npm run build
# Serve the dist/ folder with your web server
```

### Using Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview"]
```

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Contact the development team

## License

This project is part of the FishCrewConnect platform.
