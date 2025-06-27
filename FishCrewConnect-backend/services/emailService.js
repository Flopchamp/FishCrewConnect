const nodemailer = require('nodemailer');
require('dotenv').config();

// Email service configuration
class EmailService {
    constructor() {
        this.transporter = null;
        this.init();
    }

    async init() {
        try {
            // Create transporter based on environment configuration
            this.transporter = nodemailer.createTransport({
                // For Gmail (most common for development)
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_APP_PASSWORD // App-specific password for Gmail
                }
                
            });

            // Verify connection in production
            if (process.env.NODE_ENV === 'production') {
                await this.transporter.verify();
                console.log('Email service connected successfully');
            }
        } catch (error) {
            console.error('Email service configuration error:', error.message);
        }
    }

    async sendPasswordResetEmail(userEmail, userName, resetToken) {
        if (!this.transporter) {
            console.error('Email service not configured');
            return false;
        }

        try {
            // Frontend URL where the reset form is located
            const frontendURL = process.env.FRONTEND_URL || 'http://localhost:8081';
            const resetLink = `${frontendURL}/(auth)/reset-password?token=${resetToken}&email=${encodeURIComponent(userEmail)}`;

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Password Reset - FishCrewConnect</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
                        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                        .reset-button { display: inline-block; background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                        .reset-button:hover { background: #1d4ed8; }
                        .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #6b7280; }
                        .warning { background: #fef3cd; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo"> FishCrewConnect</div>
                        <p>Password Reset Request</p>
                    </div>
                    
                    <div class="content">
                        <h2>Hello ${userName}!</h2>
                        
                        <p>We received a request to reset your password for your FishCrewConnect account.</p>
                        
                        <p>Click the button below to reset your password:</p>
                        
                        <div style="text-align: center;">
                            <a href="${resetLink}" class="reset-button">Reset My Password</a>
                        </div>
                        
                        <div class="warning">
                            <strong> Important:</strong>
                            <ul>
                                <li>This link will expire in <strong>1 hour</strong></li>
                                <li>If you didn't request this reset, please ignore this email</li>
                                <li>For security, this link can only be used once</li>
                            </ul>
                        </div>
                        
                        <p>If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace;">
                            ${resetLink}
                        </p>
                        
                        <p>Need help? Contact our support team or visit our help center.</p>
                        
                        <p>Best regards,<br>
                        The FishCrewConnect Team</p>
                    </div>
                    
                    <div class="footer">
                        <p>This email was sent to ${userEmail}</p>
                        <p>© ${new Date().getFullYear()} FishCrewConnect. All rights reserved.</p>
                    </div>
                </body>
                </html>
            `;

            const textContent = `
FishCrewConnect - Password Reset Request

Hello ${userName}!

We received a request to reset your password for your FishCrewConnect account.

To reset your password, visit this link:
${resetLink}

Important:
- This link will expire in 1 hour
- If you didn't request this reset, please ignore this email
- For security, this link can only be used once

Need help? Contact our support team.

Best regards,
The FishCrewConnect Team

This email was sent to ${userEmail}
© ${new Date().getFullYear()} FishCrewConnect. All rights reserved.
            `;

            const mailOptions = {
                from: {
                    name: 'FishCrewConnect',
                    address: process.env.EMAIL_USER
                },
                to: userEmail,
                subject: 'Reset Your FishCrewConnect Password',
                text: textContent,
                html: htmlContent
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(' Password reset email sent successfully:', info.messageId);
            return true;

        } catch (error) {
            console.error(' Error sending password reset email:', error);
            return false;
        }
    }

    // Send OTP email functionality
    async sendOTPEmail(userEmail, userName, otpCode) {
        if (!this.transporter) {
            console.error('Email service not configured');
            return false;
        }

        try {
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Password Reset OTP - FishCrewConnect</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
                        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                        .otp-code { font-size: 32px; font-weight: bold; color: #1e40af; background: #e6f3ff; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; letter-spacing: 8px; }
                        .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #6b7280; }
                        .warning { background: #fef3cd; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">FishCrewConnect</div>
                        <p>Password Reset Verification</p>
                    </div>
                    
                    <div class="content">
                        <h2>Hello ${userName}!</h2>
                        
                        <p>We received a request to reset your password for your FishCrewConnect account.</p>
                        
                        <p>Please use the following 6-digit verification code:</p>
                        
                        <div class="otp-code">${otpCode}</div>
                        
                        <div class="warning">
                            <strong>Important:</strong>
                            <ul>
                                <li>This code will expire in <strong>5 minutes</strong></li>
                                <li>If you didn't request this reset, please ignore this email</li>
                                <li>For security, this code can only be used once</li>
                                <li>Do not share this code with anyone</li>
                            </ul>
                        </div>
                        
                        <p>Enter this code in the FishCrewConnect app to continue with your password reset.</p>
                        
                        <p>Need help? Contact our support team.</p>
                        
                        <p>Best regards,<br>
                        The FishCrewConnect Team</p>
                    </div>
                    
                    <div class="footer">
                        <p>This email was sent to ${userEmail}</p>
                        <p>© ${new Date().getFullYear()} FishCrewConnect. All rights reserved.</p>
                    </div>
                </body>
                </html>
            `;

            const textContent = `
FishCrewConnect - Password Reset Verification

Hello ${userName}!

We received a request to reset your password for your FishCrewConnect account.

Your 6-digit verification code is: ${otpCode}

Important:
This code will expire in 5 minutes
If you didn't request this reset, please ignore this email
For security, this code can only be used once
 Do not share this code with anyone

Enter this code in the FishCrewConnect app to continue with your password reset.

Need help? Contact our support team.

Best regards,
The FishCrewConnect Team

This email was sent to ${userEmail}
© ${new Date().getFullYear()} FishCrewConnect. All rights reserved.
            `;

            const mailOptions = {
                from: {
                    name: 'FishCrewConnect',
                    address: process.env.EMAIL_USER
                },
                to: userEmail,
                subject: 'Your FishCrewConnect Password Reset Code',
                text: textContent,
                html: htmlContent
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('OTP email sent successfully:', info.messageId);
            return true;

        } catch (error) {
            console.error(' Error sending OTP email:', error);
            return false;
        }
    }

    // Test email functionality
    async sendTestEmail(toEmail) {
        if (!this.transporter) {
            throw new Error('Email service not configured');
        }

        const mailOptions = {
            from: {
                name: 'FishCrewConnect',
                address: process.env.EMAIL_USER
            },
            to: toEmail,
            subject: 'FishCrewConnect Email Test',
            text: 'This is a test email from FishCrewConnect. If you receive this, email service is working correctly!',
            html: `
                <h2> FishCrewConnect Email Test</h2>
                <p>This is a test email from FishCrewConnect.</p>
                <p>If you receive this, email service is working correctly! </p>
                <p>Sent at: ${new Date().toLocaleString()}</p>
            `
        };

        const info = await this.transporter.sendMail(mailOptions);
        return info;
    }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
