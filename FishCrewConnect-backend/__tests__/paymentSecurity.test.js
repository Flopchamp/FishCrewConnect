const request = require('supertest');

jest.mock('../config/db', () => ({ query: jest.fn(), execute: jest.fn() }));
jest.mock('../middleware/rateLimitMiddleware', () => ({
    authLimiter: (req, res, next) => next(),
    generalAuthLimiter: (req, res, next) => next(),
}));
jest.mock('../middleware/settingsMiddleware', () => ({
    checkUserRegistrationEnabled: (req, res, next) => next(),
    checkMessagingEnabled: (req, res, next) => next(),
    checkJobPostingEnabled: (req, res, next) => next(),
    clearSettingsCache: jest.fn(),
    getSettings: jest.fn().mockResolvedValue({}),
}));
jest.mock('../middleware/uploadMiddleware', () => ({
    uploadCV: (req, res, next) => next(),
    uploadProfileImage: (req, res, next) => next(),
    handleUploadError: (req, res, next) => next(),
}));
jest.mock('../scripts/update-payment-statistics', () => ({
    refreshPaymentStatistics: jest.fn().mockResolvedValue({ success: true, statistics: null }),
}));
jest.mock('../services/darajaService', () => ({
    initiateSTKPush: jest.fn(),
    sendMoney: jest.fn(),
}));

const app = require('../app');
const db = require('../config/db');
const darajaService = require('../services/darajaService');

const SECRET = process.env.MPESA_CALLBACK_SECRET;

const successCallback = (amount = 5000) => ({
    stkCallback: {
        MerchantRequestID: '12345',
        CheckoutRequestID: '67890',
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
            Item: [
                { Name: 'Amount', Value: amount },
                { Name: 'MpesaReceiptNumber', Value: 'ABC123XYZ' },
                { Name: 'PhoneNumber', Value: 254700000000 },
            ],
        },
    },
});

const pendingPayment = {
    id: 42, job_id: 7, boat_owner_id: 1, fisherman_id: 3,
    total_amount: '5000.00', fisherman_amount: '4750.00', status: 'pending',
};

beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockReset();
    db.query.mockResolvedValue([{ affectedRows: 1 }, []]);
});

describe('M-Pesa callback authentication', () => {
    it('rejects a callback posted without the secret', async () => {
        const res = await request(app)
            .post('/api/payments/daraja/callback')
            .send(successCallback());

        expect(res.status).toBe(404);
        expect(db.query).not.toHaveBeenCalled();
        expect(darajaService.sendMoney).not.toHaveBeenCalled();
    });

    it('rejects a forged callback with a wrong secret — before any DB work', async () => {
        const res = await request(app)
            .post('/api/payments/daraja/callback/not-the-secret')
            .send(successCallback());

        expect(res.status).toBe(404);
        expect(db.query).not.toHaveBeenCalled();
        expect(darajaService.sendMoney).not.toHaveBeenCalled();
    });

    it('guards the B2C result and timeout callbacks too', async () => {
        for (const endpoint of ['result', 'timeout']) {
            const res = await request(app)
                .post(`/api/payments/daraja/${endpoint}/wrong`)
                .send({ Result: { ConversationID: 'x', ResultCode: 0 } });
            expect(res.status).toBe(404);
        }
        expect(db.query).not.toHaveBeenCalled();
    });

    it('accepts a callback carrying the right secret', async () => {
        db.query.mockResolvedValueOnce([[pendingPayment], []]);   // find payment
        db.query.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // mark completed

        const res = await request(app)
            .post(`/api/payments/daraja/callback/${SECRET}`)
            .send(successCallback());

        expect(res.status).toBe(200);
        expect(db.query).toHaveBeenCalled();
    });
});

describe('M-Pesa callback amount validation', () => {
    it('refuses to pay out when the callback amount is less than billed', async () => {
        db.query.mockResolvedValueOnce([[pendingPayment], []]);

        const res = await request(app)
            .post(`/api/payments/daraja/callback/${SECRET}`)
            .send(successCallback(1)); // paid 1 KSH against a 5000 KSH bill

        expect(res.status).toBe(200); // acknowledged, so Safaricom stops retrying
        expect(darajaService.sendMoney).not.toHaveBeenCalled();
        const disputed = db.query.mock.calls.filter(([sql]) => /status = 'disputed'/.test(sql));
        expect(disputed).toHaveLength(1);
    });

    it('refuses to pay out when the callback carries no amount at all', async () => {
        db.query.mockResolvedValueOnce([[pendingPayment], []]);
        const callback = successCallback();
        callback.stkCallback.CallbackMetadata.Item =
            callback.stkCallback.CallbackMetadata.Item.filter(i => i.Name !== 'Amount');

        const res = await request(app)
            .post(`/api/payments/daraja/callback/${SECRET}`)
            .send(callback);

        expect(res.status).toBe(200);
        expect(darajaService.sendMoney).not.toHaveBeenCalled();
    });

    it('proceeds when the amount matches, including as a decimal string', async () => {
        db.query.mockResolvedValueOnce([[pendingPayment], []]);
        db.query.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

        const res = await request(app)
            .post(`/api/payments/daraja/callback/${SECRET}`)
            .send(successCallback(5000));

        expect(res.status).toBe(200);
        const disputed = db.query.mock.calls.filter(([sql]) => /status = 'disputed'/.test(sql));
        expect(disputed).toHaveLength(0);
    });
});
