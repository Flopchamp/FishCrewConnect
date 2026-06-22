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

const userToken = (id = 1, user_type = 'fisherman') =>
    jwt.sign({ user: { id, user_type } }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockResolvedValue([[], []]);
});

describe('GET /api/users/me', () => {
    it('returns 401 without a token', async () => {
        const res = await request(app).get('/api/users/me');
        expect(res.status).toBe(401);
    });

    it('returns 404 when user is not found in the database', async () => {
        db.query.mockResolvedValueOnce([[], []]); // users query returns nothing

        const res = await request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${userToken()}`);
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/user not found/i);
    });

    it('returns 200 with user profile when profile exists', async () => {
        const user = { user_id: 1, user_type: 'fisherman', email: 'fish@sea.com', name: 'Bob' };
        const profile = {
            profile_image: null, location: 'Mombasa', years_experience: 5,
            bio: 'Experienced', specialties: '["tuna"]', skills: '["nets"]', available: true, rating: null,
        };
        db.query
            .mockResolvedValueOnce([[user], []])      // SELECT users
            .mockResolvedValueOnce([[profile], []])   // SELECT user_profiles
            .mockResolvedValueOnce([[{ average_rating: '4.5', review_count: 3 }], []]); // AVG rating

        const res = await request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${userToken()}`);

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Bob');
        expect(res.body.rating).toBe('4.5');
        expect(Array.isArray(res.body.specialties)).toBe(true);
    });

    it('returns 200 with default profile values when no profile row exists', async () => {
        const user = { user_id: 1, user_type: 'fisherman', email: 'fish@sea.com', name: 'Bob' };
        db.query
            .mockResolvedValueOnce([[user], []])    // SELECT users
            .mockResolvedValueOnce([[], []])        // SELECT user_profiles (none)
            .mockResolvedValueOnce([[], []])        // INSERT default user_profiles
            .mockResolvedValueOnce([[{ average_rating: null, review_count: 0 }], []]); // AVG rating

        const res = await request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${userToken()}`);

        expect(res.status).toBe(200);
        expect(res.body.location).toBe('');
        expect(res.body.years_experience).toBe(0);
        expect(Array.isArray(res.body.specialties)).toBe(true);
    });
});

describe('PUT /api/users/me', () => {
    it('returns 404 when the user record does not exist', async () => {
        db.query.mockResolvedValueOnce([[], []]); // user_type query returns nothing

        const res = await request(app)
            .put('/api/users/me')
            .set('Authorization', `Bearer ${userToken()}`)
            .send({ name: 'New Name' });
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/user not found/i);
    });

    it('returns 400 when name is empty', async () => {
        db.query.mockResolvedValueOnce([[{ user_type: 'fisherman' }], []]);

        const res = await request(app)
            .put('/api/users/me')
            .set('Authorization', `Bearer ${userToken()}`)
            .send({ name: '' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/name is required/i);
    });

    it('returns 400 when boat owner does not provide organization name', async () => {
        db.query.mockResolvedValueOnce([[{ user_type: 'boat_owner' }], []]);

        const res = await request(app)
            .put('/api/users/me')
            .set('Authorization', `Bearer ${userToken(1, 'boat_owner')}`)
            .send({ name: 'Captain' }); // no organization_name
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/organization name is required/i);
    });
});

describe('GET /api/users/:id', () => {
    it('returns 404 when the user does not exist', async () => {
        db.query.mockResolvedValueOnce([[], []]);

        const res = await request(app).get('/api/users/999');
        expect(res.status).toBe(404);
    });

    it('returns 200 with public user profile', async () => {
        const user = { user_id: 2, user_type: 'fisherman', name: 'Alice', email: 'alice@sea.com' };
        db.query
            .mockResolvedValueOnce([[user], []])   // SELECT user
            .mockResolvedValueOnce([[], []])       // SELECT user_profiles (none)
            .mockResolvedValueOnce([[{ average_rating: null }], []]); // AVG rating

        const res = await request(app).get('/api/users/2');
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Alice');
    });
});
