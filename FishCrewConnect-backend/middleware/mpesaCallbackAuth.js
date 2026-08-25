const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * M-Pesa callbacks arrive unauthenticated: Safaricom signs nothing and posts
 * from a range we cannot pin down reliably. Without a check, anyone who finds
 * the URL can POST {ResultCode: 0, CheckoutRequestID: <a real one>} and trigger
 * a genuine payout — and idempotency does not help, because a forged callback is
 * the FIRST delivery and legitimately wins the conditional update.
 *
 * So the URL itself is the credential: a secret path segment that only we and
 * Safaricom know, because we are the ones who told Safaricom the callback URL.
 * Rotate it by changing MPESA_CALLBACK_SECRET; in-flight payments registered
 * with the old URL will fail their callback, so rotate between settlements.
 */
const timingSafeEquals = (a, b) => {
    const bufA = Buffer.from(String(a), 'utf8');
    const bufB = Buffer.from(String(b), 'utf8');
    // timingSafeEqual throws on length mismatch, so compare lengths first. That
    // leaks the secret's length, which is not worth defending.
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
};

module.exports = (req, res, next) => {
    const expected = process.env.MPESA_CALLBACK_SECRET;

    if (!expected) {
        // Fail closed. An unset secret must not mean "let everyone through".
        logger.error('MPESA_CALLBACK_SECRET is not configured — rejecting callback');
        return res.status(503).json({ message: 'Callback handling unavailable' });
    }

    if (!timingSafeEquals(req.params.secret || '', expected)) {
        logger.warn('Rejected M-Pesa callback with bad secret', {
            path: req.path,
            ip: req.ip,
        });
        // 404, not 403: do not confirm to a prober that the endpoint is there.
        return res.status(404).json({ message: 'Not found' });
    }

    next();
};

module.exports.timingSafeEquals = timingSafeEquals;
