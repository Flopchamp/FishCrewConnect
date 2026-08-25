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
    refreshPaymentStatistics: jest.fn().mockResolvedValue({ success: true, statistics: null }),
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

describe('POST /api/messages — authorization', () => {
    // Query order inside sendMessage:
    //   1. SELECT user_id FROM users        (recipient exists)
    //   2. connection check                 (shared job application, either direction)
    //   3. INSERT INTO messages             (only if 2 returned a row)
    const recipientExists = [[{ user_id: 2 }], []];
    const noConnection = [[], []];
    const connected = [[{ user_id: 2 }], []];

    beforeEach(() => {
        // clearAllMocks() does not drain queued mockResolvedValueOnce values —
        // reset so an early-returning test cannot leak them into the next one.
        db.query.mockReset();
        db.query.mockResolvedValue([{ affectedRows: 0 }, []]);
    });

    function mockSuccessfulSend() {
        db.query
            .mockResolvedValueOnce([[{ id: 99, senderId: 1, recipientId: 2, text: 'hi' }], []]) // SELECT message
            .mockResolvedValueOnce([[{ name: 'Alice' }], []])                                   // SELECT sender name
            .mockResolvedValueOnce([{ insertId: 5 }, []])                                       // INSERT notification
            .mockResolvedValueOnce([[{ id: 5 }], []]);                                          // SELECT notification
    }

    // Find calls by what they say, not where they landed. Adding a query above
    // must not silently repoint an assertion at the wrong statement.
    function callsMatching(pattern) {
        return db.query.mock.calls.filter(([sql]) => pattern.test(sql));
    }
    const insertCalls = () => callsMatching(/INSERT INTO messages/i);
    const authCalls = () => callsMatching(/job_applications/i);

    it('returns 403 when sender and recipient share no job application', async () => {
        db.query
            .mockResolvedValueOnce(recipientExists)
            .mockResolvedValueOnce(noConnection);

        const res = await request(app)
            .post('/api/messages')
            .set('Authorization', `Bearer ${makeToken({ id: 1, user_type: 'fisherman' })}`)
            .send({ recipientId: 2, text: 'hi' });

        expect(res.status).toBe(403);
        expect(insertCalls()).toHaveLength(0);
    });

    it('allows a fisherman to message the owner of a job they applied to', async () => {
        db.query
            .mockResolvedValueOnce(recipientExists)
            .mockResolvedValueOnce(connected)
            .mockResolvedValueOnce([{ insertId: 99 }, []]); // INSERT messages
        mockSuccessfulSend();

        const res = await request(app)
            .post('/api/messages')
            .set('Authorization', `Bearer ${makeToken({ id: 1, user_type: 'fisherman' })}`)
            .send({ recipientId: 2, text: 'hi' });

        expect(res.status).toBe(201);
        expect(insertCalls()).toHaveLength(1);
    });

    it('allows a boat owner to message a fisherman who applied to their job (reverse direction)', async () => {
        db.query
            .mockResolvedValueOnce(recipientExists)
            .mockResolvedValueOnce(connected)
            .mockResolvedValueOnce([{ insertId: 99 }, []]);
        mockSuccessfulSend();

        const res = await request(app)
            .post('/api/messages')
            .set('Authorization', `Bearer ${makeToken({ id: 1, user_type: 'boat_owner' })}`)
            .send({ recipientId: 2, text: 'hi' });

        expect(res.status).toBe(201);
        expect(insertCalls()).toHaveLength(1);
    });

    it('does not filter on application status — a pending application is enough to talk', async () => {
        db.query
            .mockResolvedValueOnce(recipientExists)
            .mockResolvedValueOnce(connected)
            .mockResolvedValueOnce([{ insertId: 99 }, []]);
        mockSuccessfulSend();

        await request(app)
            .post('/api/messages')
            .set('Authorization', `Bearer ${makeToken({ id: 1, user_type: 'boat_owner' })}`)
            .send({ recipientId: 2, text: 'hi' });

        expect(authCalls()).toHaveLength(1);
        const [[connectionSql]] = authCalls();
        expect(connectionSql).not.toMatch(/accepted/i);
    });

    // A plain mock cannot express "the recipient is an admin" — it answers the
    // same rows whatever is asked. This fake answers by SQL shape, for a fixture
    // where NO job applications exist at all and user 2 is an admin. So a 201
    // here can only come from the admin rule.
    function fakeDbWhereOnlyAdminConnects() {
        db.query.mockImplementation(async (sql) => {
            if (/SELECT user_id FROM users WHERE user_id = \?/.test(sql)) return [[{ user_id: 2 }], []];
            if (/INSERT INTO messages/i.test(sql)) return [{ insertId: 99 }, []];
            if (/FROM messages WHERE id = \?/.test(sql)) return [[{ id: 99, senderId: 1, recipientId: 2, text: 'hi' }], []];
            if (/SELECT name FROM users/i.test(sql)) return [[{ name: 'Alice' }], []];
            if (/INSERT INTO notifications/i.test(sql)) return [{ insertId: 5 }, []];
            if (/FROM notifications/i.test(sql)) return [[{ id: 5 }], []];
            // The authorization query. Fixture: zero applications; user 2 is admin.
            if (/job_applications/i.test(sql)) {
                return /user_type = 'admin'/.test(sql) ? [[{ connected: 1 }], []] : [[], []];
            }
            return [{ affectedRows: 0 }, []];
        });
    }

    it('lets an admin message a user they share no application with', async () => {
        fakeDbWhereOnlyAdminConnects();

        const res = await request(app)
            .post('/api/messages')
            .set('Authorization', `Bearer ${makeToken({ id: 1, user_type: 'admin' })}`)
            .send({ recipientId: 2, text: 'hi' });

        expect(res.status).toBe(201);
    });

    it('lets a user reply to an admin they share no application with', async () => {
        fakeDbWhereOnlyAdminConnects();

        const res = await request(app)
            .post('/api/messages')
            .set('Authorization', `Bearer ${makeToken({ id: 1, user_type: 'fisherman' })}`)
            .send({ recipientId: 2, text: 'hi' });

        expect(res.status).toBe(201);
        expect(insertCalls()).toHaveLength(1);
    });

    it('asks about both parties, not just the sender', async () => {
        fakeDbWhereOnlyAdminConnects();

        await request(app)
            .post('/api/messages')
            .set('Authorization', `Bearer ${makeToken({ id: 1, user_type: 'fisherman' })}`)
            .send({ recipientId: 2, text: 'hi' });

        const [[sql, params]] = authCalls();
        expect(sql).toMatch(/user_type = 'admin'/);
        expect(params).toContain(2); // the recipient, in the admin check
    });

    it('still returns 404 for a recipient that does not exist', async () => {
        db.query.mockResolvedValueOnce([[], []]);

        const res = await request(app)
            .post('/api/messages')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ recipientId: 999, text: 'hi' });

        expect(res.status).toBe(404);
    });
});
