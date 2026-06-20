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

const app = require('../app');
const db = require('../config/db');

function makeToken(user = { id: 1, user_type: 'fisherman' }) {
    return jwt.sign({ user }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(() => {
    jest.clearAllMocks();
    // Default: no DB calls expected unless overridden per-test.
    // Note: test tokens carry no JTI so authMiddleware skips the blacklist db.query.
    db.query.mockResolvedValue([{ affectedRows: 0 }, []]);
});

describe('PUT /api/messages/read', () => {
    it('regression: empty messageIds array returns 200 with count 0 (not a SQL error)', async () => {
        const res = await request(app)
            .put('/api/messages/read')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ messageIds: [] });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, count: 0 });
        // Controller returns before reaching DB — no query should have been made
        expect(db.query).not.toHaveBeenCalled();
    });

    it('returns 400 when messageIds is missing', async () => {
        const res = await request(app)
            .put('/api/messages/read')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/required/i);
    });

    it('returns 400 when messageIds is not an array', async () => {
        const res = await request(app)
            .put('/api/messages/read')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ messageIds: 'not-an-array' });
        expect(res.status).toBe(400);
    });

    it('returns 200 and calls UPDATE for a non-empty messageIds array', async () => {
        db.query.mockResolvedValueOnce([{ affectedRows: 2 }, []]); // UPDATE messages

        const res = await request(app)
            .put('/api/messages/read')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ messageIds: [10, 11] });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, count: 2 });
    });

    it('returns 401 with no auth token', async () => {
        const res = await request(app)
            .put('/api/messages/read')
            .send({ messageIds: [] });
        expect(res.status).toBe(401);
    });
});
