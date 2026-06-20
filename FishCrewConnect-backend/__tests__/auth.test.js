const request = require('supertest');
const bcrypt = require('bcryptjs');

// Mocks must be declared before requiring app
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

beforeEach(() => jest.clearAllMocks());

describe('POST /api/auth/signin', () => {
    it('returns 400 when email and password are missing', async () => {
        const res = await request(app).post('/api/auth/signin').send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/required/i);
    });

    it('returns 400 for invalid email format', async () => {
        const res = await request(app)
            .post('/api/auth/signin')
            .send({ email: 'not-an-email', password: 'password123' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/valid email/i);
    });

    it('returns 404 when user does not exist', async () => {
        db.query.mockResolvedValueOnce([[], []]);
        const res = await request(app)
            .post('/api/auth/signin')
            .send({ email: 'nobody@test.com', password: 'password123' });
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/not found/i);
    });

    it('returns 401 when password is wrong', async () => {
        const hash = await bcrypt.hash('correct-password', 10);
        db.query.mockResolvedValueOnce([[{
            user_id: 1, email: 'user@test.com', password_hash: hash,
            user_type: 'fisherman', verification_status: 'verified', name: 'Test User',
        }], []]);

        const res = await request(app)
            .post('/api/auth/signin')
            .send({ email: 'user@test.com', password: 'wrong-password' });
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/invalid credentials/i);
    });

    it('returns 200 with token on valid credentials', async () => {
        const hash = await bcrypt.hash('correct-password', 10);
        db.query.mockResolvedValueOnce([[{
            user_id: 1, email: 'user@test.com', password_hash: hash,
            user_type: 'fisherman', verification_status: 'verified', name: 'Test User',
        }], []]);

        const res = await request(app)
            .post('/api/auth/signin')
            .send({ email: 'user@test.com', password: 'correct-password' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user.email).toBe('user@test.com');
    });

    it('returns 403 when account is pending verification', async () => {
        const hash = await bcrypt.hash('password123', 10);
        db.query.mockResolvedValueOnce([[{
            user_id: 2, email: 'pending@test.com', password_hash: hash,
            user_type: 'fisherman', verification_status: 'pending', name: 'Pending User',
        }], []]);

        const res = await request(app)
            .post('/api/auth/signin')
            .send({ email: 'pending@test.com', password: 'password123' });
        expect(res.status).toBe(403);
        expect(res.body.verification_status).toBe('pending');
    });
});
