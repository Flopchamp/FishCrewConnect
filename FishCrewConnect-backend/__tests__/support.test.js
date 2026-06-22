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
jest.mock('../services/emailService', () => ({
    sendSupportTicketNotification: jest.fn().mockResolvedValue(true),
    sendSupportTicketConfirmation: jest.fn().mockResolvedValue(true),
    sendSupportTicketResponse: jest.fn().mockResolvedValue(true),
}));

const app = require('../app');
const db = require('../config/db');

function makeToken() {
    return jwt.sign({ user: { id: 1, user_type: 'fisherman' } }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(() => jest.clearAllMocks());

describe('POST /api/support/ticket', () => {
    it('returns 400 when required fields are missing', async () => {
        const res = await request(app)
            .post('/api/support/ticket')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ category: 'bug' }); // missing subject and description
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/required/i);
    });

    it('returns 400 when category is not in the allowed list', async () => {
        const res = await request(app)
            .post('/api/support/ticket')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ category: 'hacking', subject: 'Help', description: 'Need help' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/invalid category/i);
    });

    it('returns 201 with ticketId on valid submission', async () => {
        db.query
            .mockResolvedValueOnce([[{ name: 'Test User', email: 'test@test.com', user_type: 'fisherman' }], []]) // SELECT user
            .mockResolvedValueOnce([{ insertId: 42 }, []]);  // INSERT ticket

        const res = await request(app)
            .post('/api/support/ticket')
            .set('Authorization', `Bearer ${makeToken()}`)
            .send({ category: 'payment', subject: 'Payment issue', description: 'I was not paid.' });

        expect(res.status).toBe(201);
        expect(res.body.ticketId).toBe(42);
        expect(res.body.status).toBe('open');
    });
});

describe('GET /api/support/tickets', () => {
    it('returns 200 with the user\'s tickets', async () => {
        const tickets = [{ id: 1, subject: 'Payment issue', status: 'open', category: 'payment' }];
        db.query
            .mockResolvedValueOnce([tickets, []])              // SELECT tickets
            .mockResolvedValueOnce([[{ total: 1 }], []]);      // COUNT total

        const res = await request(app)
            .get('/api/support/tickets')
            .set('Authorization', `Bearer ${makeToken()}`);

        expect(res.status).toBe(200);
        expect(res.body.tickets).toHaveLength(1);
        expect(res.body.tickets[0].subject).toBe('Payment issue');
        expect(res.body.pagination.totalTickets).toBe(1);
    });
});
