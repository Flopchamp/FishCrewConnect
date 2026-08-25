const { isDemoMode, assertDemoModeAllowed } = require('../config/demoMode');

const withEnv = (env, fn) => {
    const saved = { NODE_ENV: process.env.NODE_ENV, DARAJA_DEMO_MODE: process.env.DARAJA_DEMO_MODE };
    Object.assign(process.env, env);
    try { return fn(); } finally { Object.assign(process.env, saved); }
};

describe('demo mode', () => {
    it('is off in production even when the env var says otherwise', () => {
        withEnv({ NODE_ENV: 'production', DARAJA_DEMO_MODE: 'true' }, () => {
            expect(isDemoMode()).toBe(false);
        });
    });

    it('is on outside production when explicitly enabled', () => {
        withEnv({ NODE_ENV: 'development', DARAJA_DEMO_MODE: 'true' }, () => {
            expect(isDemoMode()).toBe(true);
        });
    });

    it('is off outside production unless explicitly enabled', () => {
        withEnv({ NODE_ENV: 'development', DARAJA_DEMO_MODE: 'false' }, () => {
            expect(isDemoMode()).toBe(false);
        });
        withEnv({ NODE_ENV: 'development', DARAJA_DEMO_MODE: undefined }, () => {
            expect(isDemoMode()).toBe(false);
        });
    });

    it('refuses to boot production with demo mode enabled', () => {
        withEnv({ NODE_ENV: 'production', DARAJA_DEMO_MODE: 'true' }, () => {
            expect(() => assertDemoModeAllowed()).toThrow(/not permitted in production/i);
        });
    });

    it('boots fine in production with demo mode off', () => {
        withEnv({ NODE_ENV: 'production', DARAJA_DEMO_MODE: 'false' }, () => {
            expect(() => assertDemoModeAllowed()).not.toThrow();
        });
    });
});

describe('callback URL construction', () => {
    const { buildCallbackUrl } = require('../utils/callbackUrl');

    it('embeds the secret in every callback URL', () => {
        expect(buildCallbackUrl('callback')).toContain(process.env.MPESA_CALLBACK_SECRET);
        expect(buildCallbackUrl('result')).toContain(process.env.MPESA_CALLBACK_SECRET);
        expect(buildCallbackUrl('timeout')).toContain(process.env.MPESA_CALLBACK_SECRET);
    });

    it('refuses to build a URL when no secret is configured', () => {
        const saved = process.env.MPESA_CALLBACK_SECRET;
        delete process.env.MPESA_CALLBACK_SECRET;
        try {
            expect(() => buildCallbackUrl('callback')).toThrow(/not configured/i);
        } finally {
            process.env.MPESA_CALLBACK_SECRET = saved;
        }
    });
});
