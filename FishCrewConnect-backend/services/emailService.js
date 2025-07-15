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

    // Send support ticket notification to admin team
    async sendSupportTicketNotification(ticketData) {
        if (!this.transporter) {
            console.error('Email service not configured');
            return false;
        }

        try {
            const { ticketId, userName, userEmail, userType, category, subject, description, priority } = ticketData;
            
            const priorityColors = {
                low: '#10b981',
                normal: '#f59e0b',
                high: '#ef4444',
                urgent: '#dc2626'
            };

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>New Support Ticket - FishCrewConnect</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
                        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                        .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e40af; }
                        .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; color: white; }
                        .user-info { background: #e5e7eb; padding: 15px; border-radius: 6px; margin: 15px 0; }
                        .description { background: white; padding: 15px; border-radius: 6px; border: 1px solid #d1d5db; margin: 15px 0; }
                        .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #6b7280; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">FishCrewConnect</div>
                        <p>New Support Ticket Received</p>
                    </div>
                    
                    <div class="content">
                        <div class="ticket-info">
                            <h2>Ticket #${ticketId}</h2>
                            <p><strong>Subject:</strong> ${subject}</p>
                            <p><strong>Category:</strong> ${category}</p>
                            <p><strong>Priority:</strong> 
                                <span class="priority-badge" style="background-color: ${priorityColors[priority] || '#6b7280'}">
                                    ${priority.toUpperCase()}
                                </span>
                            </p>
                        </div>

                        <div class="user-info">
                            <h3>User Information</h3>
                            <p><strong>Name:</strong> ${userName}</p>
                            <p><strong>Email:</strong> ${userEmail}</p>
                            <p><strong>User Type:</strong> ${userType.replace('_', ' ')}</p>
                        </div>

                        <div class="description">
                            <h3>Issue Description</h3>
                            <p>${description.replace(/\n/g, '<br>')}</p>
                        </div>

                        <p style="text-align: center; margin-top: 30px;">
                            <a href="${process.env.ADMIN_URL || process.env.FRONTEND_URL}/admin/support/tickets/${ticketId}" 
                               style="background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                                View & Respond to Ticket
                            </a>
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>FishCrewConnect Support System</p>
                        <p>© ${new Date().getFullYear()} FishCrewConnect. All rights reserved.</p>
                    </div>
                </body>
                </html>
            `;

            const mailOptions = {
                from: {
                    name: 'FishCrewConnect Support',
                    address: process.env.EMAIL_USER
                },
                to: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
                subject: `[Support] New ${priority.toUpperCase()} Priority Ticket #${ticketId}: ${subject}`,
                html: htmlContent
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Support ticket notification sent successfully:', info.messageId);
            return true;

        } catch (error) {
            console.error('Error sending support ticket notification:', error);
            return false;
        }
    }

    // Send support ticket confirmation to user
    async sendSupportTicketConfirmation(confirmationData) {
        if (!this.transporter) {
            console.error('Email service not configured');
            return false;
        }

        try {
            const { userEmail, userName, ticketId, subject } = confirmationData;

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Support Ticket Received - FishCrewConnect</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
                        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                        .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
                        .next-steps { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
                        .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #6b7280; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">🎣 FishCrewConnect</div>
                        <p>Support Ticket Confirmation</p>
                    </div>
                    
                    <div class="content">
                        <h2>Hello ${userName}!</h2>
                        
                        <p>Thank you for contacting FishCrewConnect support. We've received your support request and want to confirm the details.</p>
                        
                        <div class="ticket-info">
                            <h3>📋 Your Support Ticket</h3>
                            <p><strong>Ticket ID:</strong> #${ticketId}</p>
                            <p><strong>Subject:</strong> ${subject}</p>
                            <p><strong>Status:</strong> Open</p>
                            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
                        </div>

                        <div class="next-steps">
                            <h3>📞 What happens next?</h3>
                            <ul>
                                <li><strong>Response Time:</strong> We aim to respond within 24 hours</li>
                                <li><strong>Updates:</strong> You'll receive email updates on your ticket progress</li>
                                <li><strong>Reference:</strong> Please reference ticket #${ticketId} in any follow-up communications</li>
                                <li><strong>Additional Info:</strong> You can provide additional information by replying to this email</li>
                            </ul>
                        </div>
                        
                        <p>Our support team will review your request and get back to you as soon as possible. If this is an urgent matter, please contact us directly.</p>
                        
                        <p>Thank you for using FishCrewConnect!</p>
                        
                        <p>Best regards,<br>
                        The FishCrewConnect Support Team</p>
                    </div>
                    
                    <div class="footer">
                        <p>This email was sent to ${userEmail}</p>
                        <p>© ${new Date().getFullYear()} FishCrewConnect. All rights reserved.</p>
                    </div>
                </body>
                </html>
            `;

            const mailOptions = {
                from: {
                    name: 'FishCrewConnect Support',
                    address: process.env.EMAIL_USER
                },
                to: userEmail,
                subject: `Support Ticket #${ticketId} Received - ${subject}`,
                html: htmlContent
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Support ticket confirmation sent successfully:', info.messageId);
            return true;

        } catch (error) {
            console.error('Error sending support ticket confirmation:', error);
            return false;
        }
    }

    // Send support ticket response to user
    async sendSupportTicketResponse(responseData) {
        if (!this.transporter) {
            console.error('Email service not configured');
            return false;
        }

        try {
            const { userEmail, userName, ticketId, subject, response } = responseData;

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Support Ticket Response - FishCrewConnect</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
                        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                        .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e40af; }
                        .response { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
                        .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #6b7280; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">🎣 FishCrewConnect</div>
                        <p>Support Ticket Response</p>
                    </div>
                    
                    <div class="content">
                        <h2>Hello ${userName}!</h2>
                        
                        <p>We've responded to your support ticket. Here are the details:</p>
                        
                        <div class="ticket-info">
                            <h3>📋 Ticket Information</h3>
                            <p><strong>Ticket ID:</strong> #${ticketId}</p>
                            <p><strong>Subject:</strong> ${subject}</p>
                            <p><strong>Response Date:</strong> ${new Date().toLocaleString()}</p>
                        </div>

                        <div class="response">
                            <h3>💬 Our Response</h3>
                            <p>${response.replace(/\n/g, '<br>')}</p>
                        </div>
                        
                        <p>If you need further assistance or have additional questions, please reply to this email or submit a new support ticket through the app.</p>
                        
                        <p>Thank you for using FishCrewConnect!</p>
                        
                        <p>Best regards,<br>
                        The FishCrewConnect Support Team</p>
                    </div>
                    
                    <div class="footer">
                        <p>This email was sent to ${userEmail}</p>
                        <p>© ${new Date().getFullYear()} FishCrewConnect. All rights reserved.</p>
                    </div>
                </body>
                </html>
            `;

            const mailOptions = {
                from: {
                    name: 'FishCrewConnect Support',
                    address: process.env.EMAIL_USER
                },
                to: userEmail,
                subject: `Support Ticket #${ticketId} Response - ${subject}`,
                html: htmlContent
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Support ticket response sent successfully:', info.messageId);
            return true;

        } catch (error) {
            console.error('Error sending support ticket response:', error);
            return false;
        }
    }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
