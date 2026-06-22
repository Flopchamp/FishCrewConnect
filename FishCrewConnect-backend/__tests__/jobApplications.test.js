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

const fishermanToken = () =>
    jwt.sign({ user: { id: 1, user_type: 'fisherman' } }, process.env.JWT_SECRET, { expiresIn: '1h' });

const boatOwnerToken = () =>
    jwt.sign({ user: { id: 2, user_type: 'boat_owner' } }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockReset();
    db.query.mockResolvedValue([[], []]); // safe fallback for any unmocked db.query call
});

describe('POST /api/applications/job/:jobId', () => {
    it('returns 403 when a non-fisherman tries to apply', async () => {
        const res = await request(app)
            .post('/api/applications/job/10')
            .set('Authorization', `Bearer ${boatOwnerToken()}`)
            .send({ cover_letter: 'Hello' });
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/only fishermen/i);
    });

    it('returns 404 when the job does not exist', async () => {
        db.query.mockResolvedValueOnce([[], []]); // job not found

        const res = await request(app)
            .post('/api/applications/job/99')
            .set('Authorization', `Bearer ${fishermanToken()}`)
            .send({});
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/job not found/i);
    });

    it('returns 400 when the job is not open', async () => {
        db.query.mockResolvedValueOnce([[{ status: 'filled' }], []]);

        const res = await request(app)
            .post('/api/applications/job/10')
            .set('Authorization', `Bearer ${fishermanToken()}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/no longer open/i);
    });

    it('returns 400 when the user has already applied', async () => {
        db.query
            .mockResolvedValueOnce([[{ status: 'open' }], []])   // job exists and open
            .mockResolvedValueOnce([[{ id: 5 }], []]);            // existing application found

        const res = await request(app)
            .post('/api/applications/job/10')
            .set('Authorization', `Bearer ${fishermanToken()}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/already applied/i);
    });

    it('returns 201 with the new application on success', async () => {
        const newApp = { id: 1, job_id: 10, user_id: 1, status: 'pending', cover_letter: '' };

        db.query
            .mockResolvedValueOnce([[{ status: 'open' }], []])                          // job open
            .mockResolvedValueOnce([[], []])                                             // no existing application
            .mockResolvedValueOnce([{ insertId: 1 }, []])                               // INSERT application
            .mockResolvedValueOnce([[newApp], []])                                       // SELECT new application
            .mockResolvedValueOnce([[{ user_id: 2, job_title: 'Tuna Trip' }], []])      // SELECT job owner for notification
            .mockResolvedValueOnce([{ insertId: 10 }, []]);                             // INSERT notification
            // Note: SELECT notification is skipped in tests — req.io is null so the socket emit branch is not entered

        const res = await request(app)
            .post('/api/applications/job/10')
            .set('Authorization', `Bearer ${fishermanToken()}`)
            .send({ cover_letter: 'I am experienced.' });

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('pending');
    });
});

describe('GET /api/applications/my', () => {
    it('returns 200 with the current user\'s applications', async () => {
        const apps = [
            { id: 1, job_id: 10, job_title: 'Tuna Trip', status: 'pending', job_status: 'open' },
        ];
        db.query.mockResolvedValueOnce([apps, []]);

        const res = await request(app)
            .get('/api/applications/my')
            .set('Authorization', `Bearer ${fishermanToken()}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0].job_title).toBe('Tuna Trip');
    });
});
