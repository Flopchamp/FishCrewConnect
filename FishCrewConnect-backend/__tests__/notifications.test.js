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

beforeEach(() => jest.clearAllMocks());

describe('GET /api/notifications', () => {
    it('returns 200 with notifications array', async () => {
        const rows = [
            { id: 1, user_id: 1, type: 'new_application', message: 'Test', is_read: false, created_at: new Date() },
        ];
        db.query.mockResolvedValueOnce([rows, []]);

        const res = await request(app)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${makeToken()}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].type).toBe('new_application');
    });

    it('returns 401 without token', async () => {
        const res = await request(app).get('/api/notifications');
        expect(res.status).toBe(401);
    });
});

describe('PUT /api/notifications/:id/read', () => {
    it('returns 200 when notification exists and belongs to user', async () => {
        db.query
            .mockResolvedValueOnce([[{ id: 1, user_id: 1 }], []])  // SELECT notification
            .mockResolvedValueOnce([{ affectedRows: 1 }, []]);       // UPDATE

        const res = await request(app)
            .put('/api/notifications/1/read')
            .set('Authorization', `Bearer ${makeToken()}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/marked as read/i);
    });

    it('returns 404 when notification not found or belongs to another user', async () => {
        db.query.mockResolvedValueOnce([[], []]);

        const res = await request(app)
            .put('/api/notifications/999/read')
            .set('Authorization', `Bearer ${makeToken()}`);

        expect(res.status).toBe(404);
    });
});

describe('PUT /api/notifications/read-all', () => {
    it('returns 200 and marks all as read', async () => {
        db.query.mockResolvedValueOnce([{ affectedRows: 3 }, []]);

        const res = await request(app)
            .put('/api/notifications/read-all')
            .set('Authorization', `Bearer ${makeToken()}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/marked as read/i);
    });
});
