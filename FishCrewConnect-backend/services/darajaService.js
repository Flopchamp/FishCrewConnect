const axios = require('axios');
require('dotenv').config();

class DarajaService {
    constructor() {
        this.consumerKey = process.env.DARAJA_CONSUMER_KEY;
        this.consumerSecret = process.env.DARAJA_CONSUMER_SECRET;
        this.businessShortCode = process.env.DARAJA_BUSINESS_SHORTCODE;
        this.passkey = process.env.DARAJA_PASSKEY;
        // Use correct URLs for sandbox and production
        this.baseURL = process.env.NODE_ENV === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';

        this.accessToken = null;
        this.tokenExpiry = null;
    }



    // Generate access token
    async getAccessToken() {
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            // Validate required credentials
            if (!this.consumerKey || !this.consumerSecret) {
                throw new Error('Missing Daraja credentials: Consumer Key or Consumer Secret not found');
            }

            const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
            
            console.log('Requesting Daraja access token from:', `${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`);
            console.log('Using credentials:', {
                consumerKey: this.consumerKey ? `${this.consumerKey.substring(0, 10)}...` : 'MISSING',
                consumerSecret: this.consumerSecret ? `${this.consumerSecret.substring(0, 10)}...` : 'MISSING',
                baseURL: this.baseURL
            });
            
            const response = await axios.get(`${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            });

            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
            
            console.log('Successfully obtained Daraja access token');
            return this.accessToken;
        } catch (error) {
            console.error('Error getting Daraja access token:', error.response?.data || error.message);
            console.error('Full error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                baseURL: this.baseURL
            });
            throw new Error('Failed to get Daraja access token');
        }
    }

    // Generate password for STK Push
    generatePassword() {
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
        const password = Buffer.from(this.businessShortCode + this.passkey + timestamp).toString('base64');
        return { password, timestamp };
    }

    // Initiate STK Push (Lipa Na M-Pesa Online)
    async initiateSTKPush(phoneNumber, amount, accountReference, transactionDesc, callbackURL) {
        try {
            // Check for explicit demo mode setting only
            const isDemoMode = process.env.DARAJA_DEMO_MODE === 'true';
            
            let requestData;
            
            if (isDemoMode) {
                // Use provided test credentials for demonstration
                console.log('Using DEMO M-Pesa credentials for testing...');
                requestData = {
                    BusinessShortCode: "174379",
                    Password: "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMTYwMjE2MTY1NjI3",
                    Timestamp: "20160216165627",
                    TransactionType: "CustomerPayBillOnline",
                    Amount: Math.round(amount).toString(),
                    PartyA: phoneNumber.replace(/^\+/, '').replace(/^0/, '254'), // Use actual phone number
                    PartyB: "174379",
                    PhoneNumber: phoneNumber.replace(/^\+/, '').replace(/^0/, '254'), // Use actual phone number
                    CallBackURL: callbackURL || "https://mydomain.com/pat",
                    AccountReference: accountReference || "Test",
                    TransactionDesc: transactionDesc || "Test Payment"
                };
            } else {
                // Production mode - use real credentials
                const accessToken = await this.getAccessToken();
                const { password, timestamp } = this.generatePassword();

                // Format phone number (remove + and ensure it starts with 254)
                const formattedPhone = phoneNumber.replace(/^\+/, '').replace(/^0/, '254');

                requestData = {
                    BusinessShortCode: this.businessShortCode,
                    Password: password,
                    Timestamp: timestamp,
                    TransactionType: 'CustomerPayBillOnline',
                    Amount: Math.round(amount), // Ensure amount is integer
                    PartyA: formattedPhone,
                    PartyB: this.businessShortCode,
                    PhoneNumber: formattedPhone,
                    CallBackURL: callbackURL,
                    AccountReference: accountReference,
                    TransactionDesc: transactionDesc
                };
            }

            console.log('Initiating STK Push with data:', {
                ...requestData,
                Password: '[HIDDEN]'
            });

            if (isDemoMode) {
                // In demo mode, simulate a successful response
                console.log('DEMO MODE: Simulating successful STK Push response...');
                return {
                    MerchantRequestID: `DEMO_MERCHANT_${Date.now()}`,
                    CheckoutRequestID: `ws_CO_${Date.now()}`,
                    ResponseCode: "0",
                    ResponseDescription: "Success. Request accepted for processing",
                    CustomerMessage: "Success. Request accepted for processing"
                };
            }

            // Only make actual API call in production mode
            const accessToken = await this.getAccessToken();
            const response = await axios.post(
                `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
                requestData,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000 // 60 second timeout
                }
            );

            console.log('STK Push response:', response.data);
            return response.data;
        } catch (error) {
            console.error('STK Push error:', error.response?.data || error.message);
            console.error('STK Push error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            throw new Error('Failed to initiate M-Pesa payment');
        }
    }



    // Send money to user (B2C)
    async sendMoney(phoneNumber, amount, remarks = 'Payment') {
        try {
            // Check for explicit demo mode setting only
            const isDemoMode = process.env.DARAJA_DEMO_MODE === 'true';
            
            if (isDemoMode) {
                console.log('DEMO MODE: Simulating B2C payment...');
                return {
                    ConversationID: `AG_${Date.now()}_DEMO`,
                    OriginatorConversationID: `DEMO_${Date.now()}`,
                    ResponseCode: "0",
                    ResponseDescription: "Accept the service request successfully."
                };
            }

            const accessToken = await this.getAccessToken();
            const formattedPhone = phoneNumber.replace(/^\+/, '').replace(/^0/, '254');

            const requestData = {
                InitiatorName: process.env.DARAJA_INITIATOR_NAME,
                SecurityCredential: process.env.DARAJA_SECURITY_CREDENTIAL,
                CommandID: 'BusinessPayment',
                Amount: Math.round(amount),
                PartyA: this.businessShortCode,
                PartyB: formattedPhone,
                Remarks: remarks,
                QueueTimeOutURL: `${process.env.BACKEND_URL}/api/payments/daraja/timeout`,
                ResultURL: `${process.env.BACKEND_URL}/api/payments/daraja/result`,
                Occasion: 'Job Payment'
            };

            const response = await axios.post(
                `${this.baseURL}/mpesa/b2c/v1/paymentrequest`,
                requestData,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('B2C Payment error:', error.response?.data || error.message);
            throw new Error('Failed to send M-Pesa payment');
        }
    }

    // Query transaction status
    async queryTransactionStatus(checkoutRequestID) {
        try {
            // Check for explicit demo mode setting only
            const isDemoMode = process.env.DARAJA_DEMO_MODE === 'true';
            
            if (isDemoMode) {
                console.log('DEMO MODE: Simulating transaction status query...');
                return {
                    ResponseCode: "0",
                    ResponseDescription: "The service request has been accepted successfully",
                    MerchantRequestID: `DEMO_MERCHANT_${Date.now()}`,
                    CheckoutRequestID: checkoutRequestID,
                    ResultCode: "0",
                    ResultDesc: "The service request is processed successfully."
                };
            }

            const accessToken = await this.getAccessToken();
            const { password, timestamp } = this.generatePassword();

            const requestData = {
                BusinessShortCode: this.businessShortCode,
                Password: password,
                Timestamp: timestamp,
                CheckoutRequestID: checkoutRequestID
            };

            const response = await axios.post(
                `${this.baseURL}/mpesa/stkpushquery/v1/query`,
                requestData,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('Query transaction error:', error.response?.data || error.message);
            throw new Error('Failed to query transaction status');
        }
    }
}

module.exports = new DarajaService();
