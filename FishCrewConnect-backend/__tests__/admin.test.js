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

function makeAdminToken() {
    return jwt.sign(
        { user: { id: 1, user_type: 'admin', name: 'Admin' } },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

function makeUserToken() {
    return jwt.sign(
        { user: { id: 2, user_type: 'fisherman', name: 'Bob' } },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

beforeEach(() => jest.clearAllMocks());

// ── GET /api/admin/settings ──────────────────────────────────────────────────

describe('GET /api/admin/settings', () => {
    const settingsRows = [
        { setting_key: 'platform_name',             setting_value: '"FishCrewConnect"', category: 'general' },
        { setting_key: 'maintenance_mode',           setting_value: 'false',             category: 'general' },
        { setting_key: 'user_registration_enabled',  setting_value: 'true',              category: 'features' },
        { setting_key: 'commission_rate',            setting_value: '0.05',              category: 'payment' },
    ];

    beforeEach(() => {
        // No blacklist check — test tokens carry no JTI so authMiddleware skips it
        db.query
            .mockResolvedValueOnce([settingsRows, []]) // settings rows
            .mockResolvedValueOnce([[], []])           // admin_actions (empty)
            .mockResolvedValueOnce([[], []]);          // information_schema stats
    });

    it('returns 200 with categorized settings structure', async () => {
        const res = await request(app)
            .get('/api/admin/settings')
            .set('Authorization', `Bearer ${makeAdminToken()}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('general');
        expect(res.body).toHaveProperty('features');
        expect(res.body).toHaveProperty('payment');
        expect(res.body).toHaveProperty('database');
        expect(res.body).toHaveProperty('adminActions');
    });

    it('parses JSON values from the DB', async () => {
        const res = await request(app)
            .get('/api/admin/settings')
            .set('Authorization', `Bearer ${makeAdminToken()}`);
        expect(res.body.general.platform_name).toBe('FishCrewConnect'); // parsed from '"FishCrewConnect"'
        expect(res.body.general.maintenance_mode).toBe(false);           // parsed from 'false'
        expect(res.body.features.user_registration_enabled).toBe(true);  // parsed from 'true'
        expect(res.body.payment.commission_rate).toBe(0.05);             // parsed from '0.05'
    });

    it('returns 403 for non-admin users', async () => {
        db.query.mockReset();
        const res = await request(app)
            .get('/api/admin/settings')
            .set('Authorization', `Bearer ${makeUserToken()}`);
        expect(res.status).toBe(403);
    });
});

// ── PUT /api/admin/settings ──────────────────────────────────────────────────

describe('PUT /api/admin/settings', () => {
    it('accepts bulk settings object and updates valid keys', async () => {
        db.query
            .mockResolvedValueOnce([[{ setting_key: 'maintenance_mode', setting_type: 'boolean' }], []]) // validate keys
            .mockResolvedValueOnce([{ affectedRows: 1 }, []])  // UPDATE setting
            .mockResolvedValueOnce([{ insertId: 1 }, []]);     // INSERT admin_actions

        const res = await request(app)
            .put('/api/admin/settings')
            .set('Authorization', `Bearer ${makeAdminToken()}`)
            .send({ settings: { general: { maintenance_mode: true } } });
        expect(res.status).toBe(200);
        expect(res.body.updated).toContain('maintenance_mode');
    });

    it('returns 400 when none of the keys exist in the DB', async () => {
        db.query.mockResolvedValueOnce([[], []]); // validate keys → nothing matched

        const res = await request(app)
            .put('/api/admin/settings')
            .set('Authorization', `Bearer ${makeAdminToken()}`)
            .send({ settings: { nonexistent_key: 'value' } });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/none of the provided keys/i);
    });

    it('returns 400 when body has neither settings nor setting', async () => {
        const res = await request(app)
            .put('/api/admin/settings')
            .set('Authorization', `Bearer ${makeAdminToken()}`)
            .send({ unexpected: 'data' });
        expect(res.status).toBe(400);
    });
});

// ── Pagination clamping ──────────────────────────────────────────────────────

describe('Admin pagination limit clamping', () => {
    it('GET /api/admin/users clamps limit to 200 even when 99999 is requested', async () => {
        db.query
            .mockResolvedValueOnce([[], []])   // users SELECT
            .mockResolvedValueOnce([[{ total: 0 }], []])  // COUNT total
            .mockResolvedValueOnce([[{ all_users: 0, fisherman: 0, boat_owner: 0, admin: 0, pending: 0, verified: 0 }], []]); // type counts

        const res = await request(app)
            .get('/api/admin/users?limit=99999&page=1')
            .set('Authorization', `Bearer ${makeAdminToken()}`);

        // Should not crash (infinite loop / OOM) and should return 200
        expect(res.status).toBe(200);
        expect(res.body.pagination.limit).toBeLessThanOrEqual(200);
    });

    it('GET /api/admin/jobs clamps limit to 100 even when 99999 is requested', async () => {
        db.query
            .mockResolvedValueOnce([[{ total: 0 }], []])  // COUNT total (first query in getAllJobs)
            .mockResolvedValueOnce([[], []])               // status GROUP BY
            .mockResolvedValueOnce([[], []]);              // jobs SELECT

        const res = await request(app)
            .get('/api/admin/jobs?limit=99999&page=1')
            .set('Authorization', `Bearer ${makeAdminToken()}`);

        expect(res.status).toBe(200);
        // The LIMIT in the SQL should be ≤100; verify via response pagination
        expect(res.body.pagination.limit).toBeLessThanOrEqual(100);
    });
});
