# EMAIL SERVICE SETUP GUIDE FOR FISHCREWCONNECT

This guide will help you set up email functionality for password reset emails in FishCrewConnect.

## 📧 Email Service Configuration

### For Gmail (Recommended for Development)

1. **Create/Use Gmail Account**
   - Use your existing Gmail account or create a new one
   - We recommend creating a dedicated account for app emails

2. **Enable 2-Factor Authentication**
   - Go to your Google Account settings
   - Security > 2-Step Verification
   - Enable 2-factor authentication

3. **Generate App Password**
   - Go to Google Account > Security
   - Under "2-Step Verification", click on "App passwords"
   - Select "Mail" and "Other (custom name)"
   - Enter "FishCrewConnect" as the app name
   - Copy the generated 16-character password

4. **Add to Environment Variables**
   Create a `.env` file in the `FishCrewConnect-backend` directory with:
   ```
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_APP_PASSWORD=your-16-character-app-password
   FRONTEND_URL=http://localhost:8081
   ```

### For Other Email Services

If you prefer to use other email services, update the `emailService.js` configuration:

#### For Outlook/Hotmail:
```javascript
service: 'hotmail',
auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
}
```

#### For Custom SMTP:
```javascript
host: process.env.SMTP_HOST,
port: process.env.SMTP_PORT || 587,
secure: false,
auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
}
```

Then add these to your `.env`:
```
SMTP_HOST=your-smtp-host.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-password
```

## 🧪 Testing Email Setup

1. **Start the backend server**
   ```bash
   cd FishCrewConnect-backend
   npm start
   ```

2. **Test email functionality**
   Create a test file or use the API endpoint:
   ```bash
   node -e "
   const emailService = require('./services/emailService');
   emailService.sendTestEmail('your-test-email@example.com')
     .then(() => console.log('Test email sent!'))
     .catch(console.error);
   "
   ```

## 🔧 Troubleshooting

### Common Issues:

1. **"Invalid login" error**
   - Make sure you're using an App Password, not your regular Gmail password
   - Verify 2-factor authentication is enabled

2. **"Authentication failed" error**
   - Double-check the EMAIL_USER and EMAIL_APP_PASSWORD in .env
   - Ensure no extra spaces in the .env file

3. **"Connection timeout" error**
   - Check your internet connection
   - Verify firewall settings

4. **Gmail security issues**
   - Enable "Less secure app access" (not recommended)
   - OR use App Passwords (recommended)

## 📱 Frontend Integration

The password reset flow works as follows:

1. User enters email in forgot password screen
2. Backend sends reset email with a secure link
3. User clicks the link in their email
4. Link opens the reset password screen in the app
5. User enters new password and submits

The reset link format is:
```
http://localhost:8081/(auth)/reset-password?token=RESET_TOKEN&email=USER_EMAIL
```

## 🚀 Production Deployment

For production deployment:

1. **Use environment variables** for email credentials
2. **Update FRONTEND_URL** to your production domain
3. **Remove development-only features** like returning resetToken in API responses
4. **Set up proper email monitoring** and error handling
5. **Consider using email services** like SendGrid, AWS SES, or Mailgun for better deliverability

## 📧 Email Template Customization

The email template is defined in `services/emailService.js`. You can customize:
- Colors and styling
- Company branding
- Email content
- Footer information

## Security Notes

- Reset tokens expire after 1 hour
- Tokens are single-use only
- Email validation is performed before sending
- No sensitive information is exposed in API responses
