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

function makeToken(user = { id: 1, user_type: 'boat_owner' }) {
    return jwt.sign({ user }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(() => jest.clearAllMocks());

describe('POST /api/reviews', () => {
    const token = () => makeToken({ id: 1, user_type: 'boat_owner' });

    it('returns 400 when required fields are missing', async () => {
        const res = await request(app)
            .post('/api/reviews')
            .set('Authorization', `Bearer ${token()}`)
            .send({ job_id: 1 }); // missing reviewed_user_id and rating
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/required/i);
    });

    it('returns 400 when rating is out of range', async () => {
        const res = await request(app)
            .post('/api/reviews')
            .set('Authorization', `Bearer ${token()}`)
            .send({ job_id: 1, reviewed_user_id: 2, rating: 6 });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/between 1 and 5/i);
    });

    it('returns 400 when user reviews themselves', async () => {
        const res = await request(app)
            .post('/api/reviews')
            .set('Authorization', `Bearer ${token()}`)
            .send({ job_id: 1, reviewed_user_id: 1, rating: 4 }); // same as token user id
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/cannot review themselves/i);
    });

    it('returns 403 when user types cannot review each other (fisherman→fisherman)', async () => {
        // Both users are fishermen — invalid interaction
        db.query.mockResolvedValueOnce([[
            { user_id: 1, user_type: 'fisherman' },
            { user_id: 2, user_type: 'fisherman' },
        ], []]);

        const fishermanToken = makeToken({ id: 1, user_type: 'fisherman' });
        const res = await request(app)
            .post('/api/reviews')
            .set('Authorization', `Bearer ${fishermanToken}`)
            .send({ job_id: 1, reviewed_user_id: 2, rating: 4 });
        expect(res.status).toBe(403);
    });

    it('returns 409 on duplicate review', async () => {
        // Users exist with valid types
        db.query.mockResolvedValueOnce([[
            { user_id: 1, user_type: 'boat_owner' },
            { user_id: 2, user_type: 'fisherman' },
        ], []]);
        // Job is completed and owned by reviewer
        db.query.mockResolvedValueOnce([[{ user_id: 1, status: 'completed' }], []]);
        // Fisherman has accepted application
        db.query.mockResolvedValueOnce([[{ id: 5 }], []]);
        // Duplicate entry error on INSERT
        const dupError = new Error('Duplicate entry');
        dupError.code = 'ER_DUP_ENTRY';
        db.query.mockRejectedValueOnce(dupError);

        const res = await request(app)
            .post('/api/reviews')
            .set('Authorization', `Bearer ${token()}`)
            .send({ job_id: 1, reviewed_user_id: 2, rating: 5, comment: 'Great work' });
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/already submitted/i);
    });

    it('returns 201 with the created review on valid submission', async () => {
        const review = { id: 1, job_id: 1, reviewer_id: 1, reviewed_user_id: 2, rating: 5, comment: 'Excellent' };

        db.query
            .mockResolvedValueOnce([[{ user_id: 1, user_type: 'boat_owner' }, { user_id: 2, user_type: 'fisherman' }], []]) // user types
            .mockResolvedValueOnce([[{ user_id: 1, status: 'completed' }], []])   // job details
            .mockResolvedValueOnce([[{ id: 5 }], []])                             // accepted application
            .mockResolvedValueOnce([{ insertId: 1 }, []])                         // INSERT review
            .mockResolvedValueOnce([[review], []])                                 // SELECT inserted review
            .mockResolvedValueOnce([[{ job_title: 'Tuna Fishing Trip' }], []])    // SELECT job title
            .mockResolvedValueOnce([[{ name: 'Captain Jack' }], []])              // SELECT reviewer name
            .mockResolvedValueOnce([{ insertId: 10 }, []]);                       // INSERT notification

        const res = await request(app)
            .post('/api/reviews')
            .set('Authorization', `Bearer ${token()}`)
            .send({ job_id: 1, reviewed_user_id: 2, rating: 5, comment: 'Excellent' });

        expect(res.status).toBe(201);
        expect(res.body.rating).toBe(5);
    });
});

describe('GET /api/reviews/user/:userId', () => {
    it('returns 200 with reviews for the given user', async () => {
        const rows = [{ id: 1, rating: 4, reviewer_name: 'Captain Jack', comment: 'Good work' }];
        db.query.mockResolvedValueOnce([rows, []]);

        const res = await request(app).get('/api/reviews/user/2');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].reviewer_name).toBe('Captain Jack');
    });
});
