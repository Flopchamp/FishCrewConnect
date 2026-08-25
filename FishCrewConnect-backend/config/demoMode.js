/**
 * Demo mode fabricates M-Pesa responses instead of calling Safaricom, so nothing
 * it produces represents real money: STK pushes are simulated, payments are
 * marked completed with invented receipt numbers, and B2C payouts return a stub.
 *
 * Read it ONLY through isDemoMode(). Two independent `process.env.DARAJA_DEMO_MODE`
 * checks in different modules are two things that can drift apart, and the one
 * that drifts decides whether a payout is real.
 */

/** True only outside production. Production can never be in demo mode. */
const isDemoMode = () => {
    if (process.env.NODE_ENV === 'production') return false;
    return process.env.DARAJA_DEMO_MODE === 'true';
};

/**
 * Boot guard. isDemoMode() already refuses in production, but a deploy carrying
 * DARAJA_DEMO_MODE=true is a misconfiguration worth failing loudly on rather
 * than silently ignoring — the next person to relax the check above should find
 * a dead server, not a live one quietly inventing receipts.
 */
const assertDemoModeAllowed = () => {
    if (process.env.NODE_ENV === 'production' && process.env.DARAJA_DEMO_MODE === 'true') {
        throw new Error(
            'DARAJA_DEMO_MODE=true is not permitted in production. ' +
            'Demo mode fabricates payment receipts and simulated payouts. Unset it and redeploy.'
        );
    }
};

module.exports = { isDemoMode, assertDemoModeAllowed };
