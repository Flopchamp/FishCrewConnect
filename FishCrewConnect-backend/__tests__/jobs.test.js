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

const boatOwnerToken = () =>
    jwt.sign({ user: { id: 1, user_type: 'boat_owner' } }, process.env.JWT_SECRET, { expiresIn: '1h' });

const fishermanToken = () =>
    jwt.sign({ user: { id: 2, user_type: 'fisherman' } }, process.env.JWT_SECRET, { expiresIn: '1h' });

beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockResolvedValue([[], []]);
});

describe('POST /api/jobs', () => {
    it('returns 403 when a fisherman tries to create a job', async () => {
        const res = await request(app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${fishermanToken()}`)
            .send({ job_title: 'Test Job' });
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/only boat owners/i);
    });

    it('returns 400 when job_title is missing', async () => {
        const res = await request(app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${boatOwnerToken()}`)
            .send({ description: 'No title here' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/job title is required/i);
    });

    it('returns 201 with the created job on success', async () => {
        const job = { job_id: 1, user_id: 1, job_title: 'Tuna Trip', status: 'open' };
        db.query
            .mockResolvedValueOnce([{ insertId: 1 }, []])    // INSERT job
            .mockResolvedValueOnce([[job], []])               // SELECT new job
            .mockResolvedValueOnce([[], []])                  // SELECT fishermen (none, so no notifications)

        const res = await request(app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${boatOwnerToken()}`)
            .send({ job_title: 'Tuna Trip', location: 'Mombasa' });

        expect(res.status).toBe(201);
        expect(res.body.job_title).toBe('Tuna Trip');
    });
});

describe('GET /api/jobs', () => {
    it('returns 200 with list of all jobs', async () => {
        const jobs = [
            { job_id: 1, job_title: 'Tuna Trip', status: 'open' },
            { job_id: 2, job_title: 'Sardine Run', status: 'open' },
        ];
        db.query.mockResolvedValueOnce([jobs, []]);

        const res = await request(app).get('/api/jobs');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(2);
    });
});

describe('GET /api/jobs/:jobId', () => {
    it('returns 404 when job does not exist', async () => {
        db.query.mockResolvedValueOnce([[], []]);

        const res = await request(app).get('/api/jobs/999');
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/job not found/i);
    });

    it('returns 200 with the job on success', async () => {
        const job = { job_id: 1, job_title: 'Tuna Trip', status: 'open' };
        db.query.mockResolvedValueOnce([[job], []]);

        const res = await request(app).get('/api/jobs/1');
        expect(res.status).toBe(200);
        expect(res.body.job_id).toBe(1);
    });
});

describe('PUT /api/jobs/:jobId', () => {
    it('returns 400 when no fields to update are provided', async () => {
        const job = { job_id: 1, user_id: 1, job_title: 'Old Title', status: 'open' };
        db.query.mockResolvedValueOnce([[job], []]);

        const res = await request(app)
            .put('/api/jobs/1')
            .set('Authorization', `Bearer ${boatOwnerToken()}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/no fields to update/i);
    });

    it('returns 403 when a different user tries to update the job', async () => {
        const job = { job_id: 1, user_id: 99, job_title: 'Someone Else Job', status: 'open' };
        db.query.mockResolvedValueOnce([[job], []]);

        const res = await request(app)
            .put('/api/jobs/1')
            .set('Authorization', `Bearer ${boatOwnerToken()}`) // user id = 1, owner is 99
            .send({ job_title: 'Hacked Title' });
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/not authorized/i);
    });

    it('returns 400 when status value is invalid', async () => {
        const res = await request(app)
            .put('/api/jobs/1')
            .set('Authorization', `Bearer ${boatOwnerToken()}`)
            .send({ status: 'bogus_status' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/invalid status/i);
    });

    it('returns 200 with the updated job on success', async () => {
        const job = { job_id: 1, user_id: 1, job_title: 'Old Title', status: 'open' };
        const updated = { ...job, job_title: 'New Title' };
        db.query
            .mockResolvedValueOnce([[job], []])    // SELECT existing job
            .mockResolvedValueOnce([{ affectedRows: 1 }, []])  // UPDATE
            .mockResolvedValueOnce([[updated], []]);            // SELECT updated job

        const res = await request(app)
            .put('/api/jobs/1')
            .set('Authorization', `Bearer ${boatOwnerToken()}`)
            .send({ job_title: 'New Title' });

        expect(res.status).toBe(200);
        expect(res.body.job_title).toBe('New Title');
    });
});

describe('DELETE /api/jobs/:jobId', () => {
    it('returns 404 when job does not exist', async () => {
        db.query.mockResolvedValueOnce([[], []]);

        const res = await request(app)
            .delete('/api/jobs/999')
            .set('Authorization', `Bearer ${boatOwnerToken()}`);
        expect(res.status).toBe(404);
    });

    it('returns 403 when a non-owner tries to delete', async () => {
        const job = { job_id: 1, user_id: 99, job_title: 'Not Mine', status: 'open' };
        db.query.mockResolvedValueOnce([[job], []]);

        const res = await request(app)
            .delete('/api/jobs/1')
            .set('Authorization', `Bearer ${boatOwnerToken()}`); // user id = 1, owner is 99
        expect(res.status).toBe(403);
    });

    it('returns 200 on successful deletion', async () => {
        const job = { job_id: 1, user_id: 1, job_title: 'My Job', status: 'open' };
        db.query
            .mockResolvedValueOnce([[job], []])               // SELECT job
            .mockResolvedValueOnce([{ affectedRows: 1 }, []]); // DELETE

        const res = await request(app)
            .delete('/api/jobs/1')
            .set('Authorization', `Bearer ${boatOwnerToken()}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/deleted successfully/i);
    });
});

describe('GET /api/jobs/my-jobs', () => {
    it('returns 403 when a fisherman requests their jobs', async () => {
        const res = await request(app)
            .get('/api/jobs/my-jobs')
            .set('Authorization', `Bearer ${fishermanToken()}`);
        expect(res.status).toBe(403);
    });

    it('returns 200 with the boat owner\'s jobs', async () => {
        const jobs = [{ job_id: 1, user_id: 1, job_title: 'Tuna Trip', status: 'open' }];
        db.query
            .mockResolvedValueOnce([jobs, []])                        // SELECT my jobs
            .mockResolvedValueOnce([[{ count: 3 }], []]);             // COUNT applications

        const res = await request(app)
            .get('/api/jobs/my-jobs')
            .set('Authorization', `Bearer ${boatOwnerToken()}`);

        expect(res.status).toBe(200);
        expect(res.body[0].application_count).toBe(3);
    });
});
