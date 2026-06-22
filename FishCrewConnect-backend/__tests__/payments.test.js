const request = require('supertest');
const jwt = require('jsonwebtoken');

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
    refreshPaymentStatistics: jest.fn(),
}));
jest.mock('../services/darajaService', () => ({
    initiateSTKPush: jest.fn(),
    sendMoney: jest.fn(),
}));

const app = require('../app');
const db = require('../config/db');

function makeBoatOwnerToken() {
    return jwt.sign({ user: { id: 1, user_type: 'boat_owner' } }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(() => jest.clearAllMocks());

describe('POST /api/payments/initiate-job-payment', () => {
    const token = makeBoatOwnerToken;

    it('returns 400 when required fields are missing', async () => {
        const res = await request(app)
            .post('/api/payments/initiate-job-payment')
            .set('Authorization', `Bearer ${token()}`)
            .send({ jobId: 1 }); // missing applicationId, amount, boatOwnerPhoneNumber
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/missing required fields/i);
    });

    it('returns 400 when amount is zero or negative', async () => {
        const res = await request(app)
            .post('/api/payments/initiate-job-payment')
            .set('Authorization', `Bearer ${token()}`)
            .send({ jobId: 1, applicationId: 1, amount: -500, boatOwnerPhoneNumber: '254700000000' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/invalid amount/i);
    });

    it('returns 400 when amount exceeds the maximum allowed', async () => {
        const res = await request(app)
            .post('/api/payments/initiate-job-payment')
            .set('Authorization', `Bearer ${token()}`)
            .send({ jobId: 1, applicationId: 1, amount: 9999999, boatOwnerPhoneNumber: '254700000000' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/invalid amount/i);
    });

    it('returns 404 when job not found or application not accepted', async () => {
        db.query.mockResolvedValueOnce([[], []]); // job/application query returns nothing

        const res = await request(app)
            .post('/api/payments/initiate-job-payment')
            .set('Authorization', `Bearer ${token()}`)
            .send({ jobId: 99, applicationId: 99, amount: 5000, boatOwnerPhoneNumber: '254700000000' });
        expect(res.status).toBe(404);
    });

    it('returns 400 when payment already exists for this application', async () => {
        db.query
            .mockResolvedValueOnce([[{ fisherman_id: 2, job_title: 'Tuna Trip', fisherman_phone: '254711111111' }], []]) // job+application
            .mockResolvedValueOnce([[{ id: 5, status: 'pending' }], []]);  // existing payment

        const res = await request(app)
            .post('/api/payments/initiate-job-payment')
            .set('Authorization', `Bearer ${token()}`)
            .send({ jobId: 1, applicationId: 1, amount: 5000, boatOwnerPhoneNumber: '254700000000' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/already initiated/i);
    });
});

describe('GET /api/payments/history', () => {
    it('returns 200 with paginated payment history', async () => {
        const payments = [{ id: 1, total_amount: 5000, status: 'completed', job_title: 'Tuna Trip' }];
        db.query
            .mockResolvedValueOnce([payments, []])             // SELECT payments
            .mockResolvedValueOnce([[{ total: 1 }], []]);      // COUNT

        const res = await request(app)
            .get('/api/payments/history')
            .set('Authorization', `Bearer ${makeBoatOwnerToken()}`);

        expect(res.status).toBe(200);
        expect(res.body.payments).toHaveLength(1);
        expect(res.body.pagination.totalPayments).toBe(1);
    });
});
