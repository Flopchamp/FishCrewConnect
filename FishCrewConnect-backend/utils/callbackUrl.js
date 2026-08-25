/**
 * Every URL we hand to Safaricom carries the callback secret. Building them in
 * one place means a new callback endpoint cannot quietly ship without the guard
 * that middleware/mpesaCallbackAuth.js enforces on the way back in.
 */
const buildCallbackUrl = (endpoint) => {
    const secret = process.env.MPESA_CALLBACK_SECRET;
    if (!secret) {
        throw new Error('MPESA_CALLBACK_SECRET is not configured — refusing to register a callback URL');
    }
    return `${process.env.BACKEND_URL}/api/payments/daraja/${endpoint}/${secret}`;
};

module.exports = { buildCallbackUrl };
