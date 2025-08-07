const db = require('../config/db');
const darajaService = require('../services/darajaService');
const { refreshPaymentStatistics } = require('../scripts/update-payment-statistics');

// Platform commission percentage (configurable via admin settings)
const PLATFORM_COMMISSION_RATE = 0.05; // 5% default

// Get platform commission rate from settings
async function getPlatformCommissionRate() {
    try {
        const [settings] = await db.query(
            'SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1',
            ['platform_commission_rate']
        );
        
        if (settings.length > 0) {
            return parseFloat(settings[0].setting_value) || PLATFORM_COMMISSION_RATE;
        }
        return PLATFORM_COMMISSION_RATE;
    } catch (error) {
        console.error('Error getting commission rate:', error);
        return PLATFORM_COMMISSION_RATE;
    }
}

exports.initiateJobPayment = async (req, res) => {
    const { jobId, applicationId, amount, boatOwnerPhoneNumber } = req.body;
    const boatOwnerId = req.user?.id;

    console.log('Payment initiation request:', {
        jobId,
        applicationId,
        amount,
        boatOwnerPhoneNumber,
        boatOwnerId,
        userObject: req.user
    });

    try {
        // Validate required fields
        if (!jobId || !applicationId || !amount || !boatOwnerPhoneNumber) {
            return res.status(400).json({ 
                message: 'Missing required fields: jobId, applicationId, amount, boatOwnerPhoneNumber' 
            });
        }

        // Validate user authentication
        if (!boatOwnerId) {
            return res.status(401).json({ 
                message: 'Authentication required. Please log in again.' 
            });
        }

        // Validate amount
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ 
                message: 'Invalid amount. Amount must be a positive number.' 
            });
        }
        // Validate boat owner owns the job
        console.log('Querying for job and application...');
        const [jobs] = await db.query(
            'SELECT j.*, ja.user_id as fisherman_id, ja.status, u.name as fisherman_name, u.contact_number as fisherman_phone FROM jobs j ' +
            'JOIN job_applications ja ON j.job_id = ja.job_id ' +
            'JOIN users u ON ja.user_id = u.user_id ' +
            'WHERE j.job_id = ? AND j.user_id = ? AND ja.id = ? AND ja.status = "accepted"',
            [jobId, boatOwnerId, applicationId]
        );

        console.log('Query result:', jobs);

        if (jobs.length === 0) {
            console.log('No job found or not authorized');
            return res.status(404).json({ 
                message: 'Job not found, not authorized, or application not accepted',
                details: process.env.NODE_ENV === 'development' ? {
                    jobId,
                    boatOwnerId,
                    applicationId
                } : undefined
            });
        }

        const job = jobs[0];
        console.log('Found job:', job);
        
        // Check if payment already exists for this job application
        console.log('Checking for existing payments...');
        const [existingPayments] = await db.query(
            'SELECT * FROM job_payments WHERE job_id = ? AND application_id = ? AND status != "failed"',
            [jobId, applicationId]
        );

        console.log('Existing payments:', existingPayments);

        if (existingPayments.length > 0) {
            console.log('Payment already exists');
            return res.status(400).json({ message: 'Payment already initiated for this job' });
        }

        // Calculate platform commission
        console.log('Calculating commission...');
        const commissionRate = await getPlatformCommissionRate();
        const platformCommission = amount * commissionRate;
        const fishermanAmount = amount - platformCommission;

        console.log('Payment breakdown:', {
            amount,
            commissionRate,
            platformCommission,
            fishermanAmount
        });

        // Create payment record
        console.log('Creating payment record...');
        const [paymentResult] = await db.query(
            `INSERT INTO job_payments (
                job_id, application_id, boat_owner_id, fisherman_id, 
                total_amount, fisherman_amount, platform_commission, 
                status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [jobId, applicationId, boatOwnerId, job.fisherman_id, amount, fishermanAmount, platformCommission]
        );

        const paymentId = paymentResult.insertId;
        console.log('Payment record created with ID:', paymentId);

        // Initiate STK Push
        const callbackURL = `${process.env.BACKEND_URL}/api/payments/daraja/callback`;
        const accountReference = `JOB${jobId}PAY${paymentId}`;
        const transactionDesc = `Payment for job: ${job.job_title}`;

        let stkResponse;
        try {
            stkResponse = await darajaService.initiateSTKPush(
                boatOwnerPhoneNumber,  // ✅ FIXED: Boat owner pays, not fisherman
                amount,
                accountReference,
                transactionDesc,
                callbackURL
            );

            // Check for explicit demo mode setting only
            const isDemoMode = process.env.DARAJA_DEMO_MODE === 'true';
            
            if (isDemoMode) {
                console.log('DEMO MODE: Simulating successful payment after 3 seconds...');
                
                // Simulate successful payment callback after a short delay
                setTimeout(async () => {
                    try {
                        await db.query(
                            'UPDATE job_payments SET status = "completed", completed_at = NOW(), mpesa_receipt_number = ? WHERE id = ?',
                            [`DEMO${Date.now()}`, paymentId]
                        );
                        
                        console.log(`DEMO: Payment ${paymentId} marked as completed`);
                        
                        // AUTO-SEND MONEY TO FISHERMAN (B2C Payment)
                        if (job.fisherman_phone) {
                            console.log(`DEMO MODE: Simulating B2C payment of KSH ${fishermanAmount} to fisherman phone: ${job.fisherman_phone}`);
                            
                            try {
                                const b2cResult = await darajaService.sendMoney(
                                    job.fisherman_phone,
                                    fishermanAmount,
                                    `Job payment for: ${job.job_title}`
                                );
                                
                                console.log('DEMO B2C payment result:', b2cResult);
                                
                                // Update payment record with B2C details
                                await db.query(
                                    'UPDATE job_payments SET b2c_conversation_id = ?, b2c_originator_conversation_id = ?, b2c_status = "completed" WHERE id = ?',
                                    [b2cResult.ConversationID || `DEMO_B2C_${Date.now()}`, b2cResult.OriginatorConversationID || `DEMO_ORIG_${Date.now()}`, paymentId]
                                );
                                
                            } catch (b2cError) {
                                console.error('Error sending money to fisherman:', b2cError);
                                // Don't fail the main payment, just log the error
                                await db.query(
                                    'UPDATE job_payments SET b2c_status = "failed", b2c_result_desc = ? WHERE id = ?',
                                    [`B2C payment failed: ${b2cError.message}`, paymentId]
                                );
                            }
                        } else {
                            console.log('Warning: Fisherman phone number not found, cannot send B2C payment');
                        }
                        
                        // Create success notification for fisherman
                        await db.query(
                            'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
                            [
                                job.fisherman_id,
                                'payment_completed',
                                `Payment of KSH ${fishermanAmount} received successfully for job "${job.job_title}". Money sent to your M-Pesa ${job.fisherman_phone}.`,
                                `/payment-history`
                            ]
                        );

                        // Create confirmation notification for boat owner
                        await db.query(
                            'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
                            [
                                boatOwnerId,
                                'payment_completed',
                                `Payment of KSH ${amount} completed successfully for job "${job.job_title}". Fisherman received KSH ${fishermanAmount}.`,
                                `/payment-history`
                            ]
                        );

                        // Refresh payment statistics
                        await refreshPaymentStatistics();
                    } catch (error) {
                        console.error('Error in demo payment completion:', error);
                    }
                }, 3000);
            }
        } catch (darajaError) {
            console.error('Daraja service error:', darajaError);
            
            // Update payment status to failed
            await db.query(
                'UPDATE job_payments SET status = "failed", failure_reason = ? WHERE id = ?',
                [darajaError.message || 'M-Pesa service unavailable', paymentId]
            );
            
            return res.status(503).json({ 
                message: 'Payment service temporarily unavailable. Please try again later.',
                error: 'M-Pesa service error'
            });
        }

        // Update payment record with M-Pesa details
        await db.query(
            'UPDATE job_payments SET mpesa_checkout_request_id = ?, mpesa_merchant_request_id = ? WHERE id = ?',
            [stkResponse.CheckoutRequestID, stkResponse.MerchantRequestID, paymentId]
        );

        // Create notification for fisherman
        await db.query(
            'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
            [
                job.fisherman_id,
                'payment_initiated',
                `Payment of KSH ${amount} is being processed for job "${job.job_title}". The boat owner is paying you via M-Pesa.`,
                `/job-details/${jobId}`
            ]
        );

        // Create notification for boat owner
        await db.query(
            'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
            [
                boatOwnerId,
                'payment_initiated',
                `M-Pesa payment request sent to your phone for KSH ${amount} for job "${job.job_title}". Complete the payment to pay your fisherman.`,
                `/job-details/${jobId}`
            ]
        );

        res.json({
            message: 'Payment initiated successfully',
            paymentId,
            checkoutRequestID: stkResponse.CheckoutRequestID,
            amount,
            fishermanAmount,
            platformCommission,
            commissionRate: (commissionRate * 100).toFixed(1) + '%',
            isDemoMode: process.env.DARAJA_DEMO_MODE === 'true',
            demoMessage: (process.env.DARAJA_DEMO_MODE === 'true') 
                ? 'This is a demo payment using test credentials. Payment will be automatically completed in 3 seconds.' 
                : undefined
        });

    } catch (error) {
        console.error('Error initiating job payment:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
        
        // Handle specific database errors
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({ 
                message: 'Database table not found. Please run database migrations.',
                error: 'job_payments table missing'
            });
        }
        
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(500).json({ 
                message: 'Database schema error. Please check table structure.',
                error: 'Column missing in database'
            });
        }
        
        // Handle authentication errors
        if (error.message && error.message.includes('Authentication')) {
            return res.status(401).json({ 
                message: 'Authentication required',
                error: 'Please log in again'
            });
        }
        
        res.status(500).json({ 
            message: 'Failed to initiate payment',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? {
                code: error.code,
                errno: error.errno
            } : undefined
        });
    }
};
// @desc    Handle M-Pesa STK Push callback
exports.handleMpesaCallback = async (req, res) => {
    try {
        const { stkCallback } = req.body;
        const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

        console.log('M-Pesa Callback received:', req.body);

        // Find payment record
        const [payments] = await db.query(
            'SELECT * FROM job_payments WHERE mpesa_checkout_request_id = ?',
            [CheckoutRequestID]
        );

        if (payments.length === 0) {
            console.error('Payment not found for CheckoutRequestID:', CheckoutRequestID);
            return res.status(404).json({ message: 'Payment not found' });
        }

        const payment = payments[0];

        if (ResultCode === 0) {
            // Payment successful
            const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
            const mpesaReceiptNumber = callbackMetadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            const phoneNumber = callbackMetadata.find(item => item.Name === 'PhoneNumber')?.Value;

            // Update payment status
            await db.query(
                `UPDATE job_payments SET 
                    status = 'completed', 
                    mpesa_receipt_number = ?, 
                    payer_phone_number = ?,
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ?`,
                [mpesaReceiptNumber, phoneNumber, payment.id]
            );

            // Refresh payment statistics after successful payment
            refreshPaymentStatistics().catch(err => 
                console.error('Failed to refresh payment statistics:', err)
            );

            // Update job status to completed
            await db.query(
                'UPDATE jobs SET status = "completed", updated_at = NOW() WHERE job_id = ?',
                [payment.job_id]
            );

            // Now initiate B2C payment to fisherman (minus platform commission)
            try {
                const [fisherman] = await db.query(
                    'SELECT u.*, up.location FROM users u LEFT JOIN user_profiles up ON u.user_id = up.user_id WHERE u.user_id = ?',
                    [payment.fisherman_id]
                );

                if (fisherman.length > 0 && fisherman[0].contact_number) {
                    const b2cResult = await darajaService.sendMoney(
                        fisherman[0].contact_number,
                        payment.fisherman_amount,
                        `Job payment for job ID ${payment.job_id}`
                    );

                    // Update payment with B2C details
                    await db.query(
                        'UPDATE job_payments SET b2c_conversation_id = ?, b2c_originator_conversation_id = ?, b2c_status = "pending" WHERE id = ?',
                        [b2cResult.ConversationID, b2cResult.OriginatorConversationID, payment.id]
                    );

                    console.log('B2C payment initiated for fisherman:', fisherman[0].name);
                }
            } catch (b2cError) {
                console.error('B2C payment failed:', b2cError);
                // Payment to platform is complete, but fisherman payment failed
                // This should be handled separately - maybe queue for retry
            }

            // Create notifications
            const [jobDetails] = await db.query('SELECT job_title FROM jobs WHERE job_id = ?', [payment.job_id]);
            const jobTitle = jobDetails[0]?.job_title || 'job';

            // Notify boat owner
            await db.query(
                'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
                [
                    payment.boat_owner_id,
                    'payment_completed',
                    `Payment of KSH ${payment.total_amount} completed for "${jobTitle}". Fisherman has been paid KSH ${payment.fisherman_amount}.`,
                    `/job-details/${payment.job_id}`
                ]
            );

            // Notify fisherman
            await db.query(
                'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
                [
                    payment.fisherman_id,
                    'payment_received',
                    `You received KSH ${payment.fisherman_amount} for completing "${jobTitle}". Check your M-Pesa balance.`,
                    `/job-details/${payment.job_id}`
                ]
            );

        } else {
            // Payment failed
            await db.query(
                'UPDATE job_payments SET status = "failed", failure_reason = ?, updated_at = NOW() WHERE id = ?',
                [ResultDesc, payment.id]
            );

            // Refresh payment statistics after failed payment
            refreshPaymentStatistics().catch(err => 
                console.error('Failed to refresh payment statistics:', err)
            );

            // Notify boat owner
            const [jobDetails] = await db.query('SELECT job_title FROM jobs WHERE job_id = ?', [payment.job_id]);
            const jobTitle = jobDetails[0]?.job_title || 'job';

            await db.query(
                'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
                [
                    payment.boat_owner_id,
                    'payment_failed',
                    `Payment failed for "${jobTitle}": ${ResultDesc}. You can try again.`,
                    `/job-details/${payment.job_id}`
                ]
            );
        }

        res.status(200).json({ message: 'Callback processed' });

    } catch (error) {
        console.error('Error processing M-Pesa callback:', error);
        res.status(500).json({ message: 'Error processing callback' });
    }
};

// @desc    Get payment status
// @route   GET /api/payments/status/:paymentId
// @access  Private
exports.getPaymentStatus = async (req, res) => {
    const { paymentId } = req.params;
    const userId = req.user.id;

    try {
        const [payments] = await db.query(
            `SELECT jp.*, j.job_title, u1.name as boat_owner_name, u2.name as fisherman_name
            FROM job_payments jp
            JOIN jobs j ON jp.job_id = j.job_id
            JOIN users u1 ON jp.boat_owner_id = u1.user_id
            JOIN users u2 ON jp.fisherman_id = u2.user_id
            WHERE jp.id = ? AND (jp.boat_owner_id = ? OR jp.fisherman_id = ?)`,
            [paymentId, userId, userId]
        );

        if (payments.length === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        res.json(payments[0]);
    } catch (error) {
        console.error('Error getting payment status:', error);
        res.status(500).json({ message: 'Failed to get payment status' });
    }
};

// @desc    Get job payments history
// @route   GET /api/payments/history
// @access  Private
exports.getPaymentHistory = async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
        const [payments] = await db.query(
            `SELECT jp.*, j.job_title, u1.name as boat_owner_name, u2.name as fisherman_name
            FROM job_payments jp
            JOIN jobs j ON jp.job_id = j.job_id
            JOIN users u1 ON jp.boat_owner_id = u1.user_id
            JOIN users u2 ON jp.fisherman_id = u2.user_id
            WHERE jp.boat_owner_id = ? OR jp.fisherman_id = ?
            ORDER BY jp.created_at DESC
            LIMIT ? OFFSET ?`,
            [userId, userId, parseInt(limit), parseInt(offset)]
        );

        const [totalCount] = await db.query(
            'SELECT COUNT(*) as total FROM job_payments WHERE boat_owner_id = ? OR fisherman_id = ?',
            [userId, userId]
        );

        res.json({
            payments,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount[0].total / limit),
                totalPayments: totalCount[0].total,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error getting payment history:', error);
        res.status(500).json({ message: 'Failed to get payment history' });
    }
};

// @desc    Handle B2C result callback
// @route   POST /api/payments/daraja/result
// @access  Public (M-Pesa callback)
exports.handleB2CResult = async (req, res) => {
    try {
        console.log('B2C Result callback:', req.body);
        
        const { Result } = req.body;
        const { ConversationID, ResultCode, ResultDesc } = Result;

        // Find payment by B2C conversation ID
        const [payments] = await db.query(
            'SELECT * FROM job_payments WHERE b2c_conversation_id = ?',
            [ConversationID]
        );

        if (payments.length > 0) {
            const payment = payments[0];
            
            if (ResultCode === 0) {
                // B2C payment successful
                await db.query(
                    'UPDATE job_payments SET b2c_status = "completed", b2c_result_desc = ? WHERE id = ?',
                    [ResultDesc, payment.id]
                );
                console.log('B2C payment completed successfully for payment ID:', payment.id);
            } else {
                // B2C payment failed
                await db.query(
                    'UPDATE job_payments SET b2c_status = "failed", b2c_result_desc = ? WHERE id = ?',
                    [ResultDesc, payment.id]
                );
                console.error('B2C payment failed for payment ID:', payment.id, ResultDesc);
            }
        }

        res.status(200).json({ message: 'B2C result processed' });
    } catch (error) {
        console.error('Error processing B2C result:', error);
        res.status(500).json({ message: 'Error processing B2C result' });
    }
};

// @desc    Handle timeout callback
// @route   POST /api/payments/daraja/timeout
// @access  Public (M-Pesa callback)
exports.handleTimeout = async (req, res) => {
    try {
        console.log('M-Pesa timeout callback:', req.body);
        res.status(200).json({ message: 'Timeout processed' });
    } catch (error) {
        console.error('Error processing timeout:', error);
        res.status(500).json({ message: 'Error processing timeout' });
    }
};
