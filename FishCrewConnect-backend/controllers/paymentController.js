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
    const { jobId, applicationId, amount, fishermanPhoneNumber } = req.body;
    const boatOwnerId = req.user.id;

    try {
        // Validate boat owner owns the job
        const [jobs] = await db.query(
            'SELECT j.*, ja.user_id as fisherman_id, ja.status, u.name as fisherman_name FROM jobs j ' +
            'JOIN job_applications ja ON j.job_id = ja.job_id ' +
            'JOIN users u ON ja.user_id = u.user_id ' +
            'WHERE j.job_id = ? AND j.user_id = ? AND ja.id = ? AND ja.status = "accepted"',
            [jobId, boatOwnerId, applicationId]
        );

        if (jobs.length === 0) {
            return res.status(404).json({ message: 'Job not found or not authorized' });
        }

        const job = jobs[0];
        
        // Check if payment already exists for this job application
        const [existingPayments] = await db.query(
            'SELECT * FROM job_payments WHERE job_id = ? AND application_id = ? AND status != "failed"',
            [jobId, applicationId]
        );

        if (existingPayments.length > 0) {
            return res.status(400).json({ message: 'Payment already initiated for this job' });
        }

        // Calculate platform commission
        const commissionRate = await getPlatformCommissionRate();
        const platformCommission = amount * commissionRate;
        const fishermanAmount = amount - platformCommission;

        // Create payment record
        const [paymentResult] = await db.query(
            `INSERT INTO job_payments (
                job_id, application_id, boat_owner_id, fisherman_id, 
                total_amount, fisherman_amount, platform_commission, 
                status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [jobId, applicationId, boatOwnerId, job.fisherman_id, amount, fishermanAmount, platformCommission]
        );

        const paymentId = paymentResult.insertId;

        // Initiate STK Push
        const callbackURL = `${process.env.BACKEND_URL}/api/payments/daraja/callback`;
        const accountReference = `JOB${jobId}PAY${paymentId}`;
        const transactionDesc = `Payment for job: ${job.job_title}`;

        let stkResponse;
        try {
            stkResponse = await darajaService.initiateSTKPush(
                fishermanPhoneNumber,
                amount,
                accountReference,
                transactionDesc,
                callbackURL
            );
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
                `Payment of KSH ${amount} initiated for job "${job.job_title}". Please complete the M-Pesa payment on your phone.`,
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
            commissionRate: (commissionRate * 100).toFixed(1) + '%'
        });

    } catch (error) {
        console.error('Error initiating job payment:', error);
        
        // More detailed error logging
        if (error.name === 'DatabaseError') {
            console.error('Database error details:', error);
        }
        
        res.status(500).json({ 
            message: 'Failed to initiate payment',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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
                        'UPDATE job_payments SET b2c_conversation_id = ?, b2c_originator_conversation_id = ? WHERE id = ?',
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
