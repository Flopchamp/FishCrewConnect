const db = require('../config/db');
const darajaService = require('./darajaService');
const logger = require('../utils/logger');

/**
 * The one path that moves money to a fisherman.
 *
 * Both the demo completion in initiateJobPayment and the real M-Pesa callback in
 * handleMpesaCallback used to do this themselves, and they disagreed: one wrote
 * b2c_status = 'completed' immediately, the other 'pending'. Same action, two
 * different truths in the same column, so nothing downstream could read it.
 *
 * 'pending' is the honest value. B2C is asynchronous — the transfer is not
 * complete until handleB2CResult receives Safaricom's result callback, and that
 * is the only place allowed to write 'completed'.
 */

/** b2c_status values this module writes. handleB2CResult owns 'completed'. */
const CLAIMING = 'initiating';
const IN_FLIGHT = 'pending';
const FAILED = 'failed';

/**
 * Claim the payout before any money can move.
 *
 * Two jobs at once:
 *   1. Write-ahead intent. If the process dies between sendMoney() and the
 *      update that records the conversation id, the row still says 'initiating'
 *      — a reconciler can find it and ask Safaricom what happened. Without it,
 *      a crash in that window leaves money sent and nothing written down, and
 *      status='completed' means no retry ever revisits it.
 *   2. A lock. The UPDATE is conditional on the payout not already being in
 *      flight, so two concurrent triggers cannot both reach sendMoney().
 *
 * @returns {Promise<boolean>} true if this caller owns the payout
 */
const claimPayout = async (paymentId) => {
    const [claim] = await db.query(
        `UPDATE job_payments
            SET b2c_status = ?, updated_at = NOW()
          WHERE id = ?
            AND (b2c_status IS NULL OR b2c_status = ?)`,
        [CLAIMING, paymentId, FAILED]
    );
    return claim.affectedRows > 0;
};

/**
 * @param {object} payout
 * @param {number} payout.paymentId
 * @param {string} payout.phoneNumber   fisherman's M-Pesa number
 * @param {number} payout.amount        fisherman's share, commission already deducted
 * @param {number} payout.fishermanId
 * @param {number} payout.jobId
 * @param {string} payout.jobTitle
 * @returns {Promise<{status: string, conversationId?: string, error?: string}>}
 */
const payFisherman = async ({ paymentId, phoneNumber, amount, fishermanId, jobId, jobTitle }) => {
    if (!phoneNumber) {
        logger.error('Cannot pay fisherman — no phone number on record', { paymentId, fishermanId });
        await db.query(
            'UPDATE job_payments SET b2c_status = ?, b2c_result_desc = ? WHERE id = ?',
            [FAILED, 'No fisherman phone number on record', paymentId]
        );
        await notifyManualPayout({ fishermanId, jobId });
        return { status: 'skipped', error: 'no_phone_number' };
    }

    if (!(await claimPayout(paymentId))) {
        logger.info('Payout already in flight or settled — not sending again', { paymentId });
        return { status: 'already_claimed' };
    }

    try {
        const b2cResult = await darajaService.sendMoney(
            phoneNumber,
            amount,
            `Job payment for: ${jobTitle || `job ID ${jobId}`}`
        );

        await db.query(
            `UPDATE job_payments
                SET b2c_conversation_id = ?, b2c_originator_conversation_id = ?, b2c_status = ?
              WHERE id = ?`,
            [b2cResult.ConversationID, b2cResult.OriginatorConversationID, IN_FLIGHT, paymentId]
        );

        logger.info('B2C payout initiated', { paymentId, jobId, conversationId: b2cResult.ConversationID });
        return { status: IN_FLIGHT, conversationId: b2cResult.ConversationID };
    } catch (error) {
        // The claim stays visible as a failure rather than reverting to NULL, so
        // a reconciler can tell "never attempted" from "attempted and failed".
        logger.error('B2C payout failed', { paymentId, jobId, error: error.message });
        await db.query(
            'UPDATE job_payments SET b2c_status = ?, b2c_result_desc = ? WHERE id = ?',
            [FAILED, `B2C failed: ${error.message}`, paymentId]
        );
        await notifyManualPayout({ fishermanId, jobId });
        return { status: FAILED, error: error.message };
    }
};

const notifyManualPayout = async ({ fishermanId, jobId }) => {
    await db.query(
        'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
        [
            fishermanId,
            'payment_pending',
            `Your payout for job ID ${jobId} could not be sent automatically. Our team will process it manually within 24 hours.`,
            '/payment-history',
        ]
    );
};

module.exports = { payFisherman, claimPayout, CLAIMING, IN_FLIGHT, FAILED };
