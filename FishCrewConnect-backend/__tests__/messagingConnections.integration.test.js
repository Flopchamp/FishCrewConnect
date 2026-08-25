// The rule itself, against a real MySQL. Every other test in this repo mocks
// db.query, which proves the controllers react correctly to what the query
// returns — it cannot prove the query is right. Swap the parameters in
// canUsersMessage and every mocked test still passes while authorization is
// broken in production. This is the test that catches that.
//
// Requires a local MySQL and `node scripts/setup-test-db.js`. Skips (loudly)
// rather than fails when there is no database to talk to.

const db = require('../config/db');

const OWNER = 9001;      // posts a job
const APPLICANT = 9002;  // applies to it
const STRANGER = 9003;   // no relationship to anyone
const ADMIN = 9004;
const IDS = [OWNER, APPLICANT, STRANGER, ADMIN];
const JOB_ID = 9101;

let available = false;

async function seed() {
    await db.query('DELETE FROM job_applications WHERE job_id = ?', [JOB_ID]);
    await db.query('DELETE FROM jobs WHERE job_id = ?', [JOB_ID]);
    await db.query('DELETE FROM users WHERE user_id IN (?)', [IDS]);

    const users = [
        [OWNER, 'Owner', 'owner@test.local', 'boat_owner'],
        [APPLICANT, 'Applicant', 'applicant@test.local', 'fisherman'],
        [STRANGER, 'Stranger', 'stranger@test.local', 'fisherman'],
        [ADMIN, 'Admin', 'admin@test.local', 'admin'],
    ];
    for (const [id, name, email, type] of users) {
        await db.query(
            'INSERT INTO users (user_id, name, email, password_hash, user_type) VALUES (?, ?, ?, ?, ?)',
            [id, name, email, 'x', type]
        );
    }
    await db.query(
        'INSERT INTO jobs (job_id, user_id, job_title) VALUES (?, ?, ?)',
        [JOB_ID, OWNER, 'Test job']
    );
    // Deliberately 'pending', not 'accepted' — the rule must not require acceptance.
    await db.query(
        "INSERT INTO job_applications (job_id, user_id, status) VALUES (?, ?, 'pending')",
        [JOB_ID, APPLICANT]
    );
}

beforeAll(async () => {
    if (!/test/i.test(process.env.MYSQL_DATABASE || '')) {
        throw new Error(`Refusing to run against "${process.env.MYSQL_DATABASE}" — not a test database.`);
    }
    try {
        await seed();
        available = true;
    } catch (err) {
        console.warn(`\nSKIPPING integration tests — no test database (${err.code || err.message}).` +
                     `\nRun: node scripts/setup-test-db.js\n`);
    }
});

afterAll(async () => {
    if (available) {
        await db.query('DELETE FROM job_applications WHERE job_id = ?', [JOB_ID]);
        await db.query('DELETE FROM jobs WHERE job_id = ?', [JOB_ID]);
        await db.query('DELETE FROM users WHERE user_id IN (?)', [IDS]);
    }
    await db.end();
});

// Loaded after the skip check so a missing DB is reported once, clearly.
const { getConnectedUserIds, canUsersMessage } = require('../services/messagingConnections');

const itDb = (name, fn) => it(name, async () => {
    if (!available) return;
    await fn();
});

describe('canUsersMessage (real SQL)', () => {
    itDb('is true in both directions for a shared application', async () => {
        expect(await canUsersMessage(APPLICANT, OWNER)).toBe(true);
        expect(await canUsersMessage(OWNER, APPLICANT)).toBe(true);
    });

    itDb('is false for a user with no shared application', async () => {
        expect(await canUsersMessage(STRANGER, OWNER)).toBe(false);
        expect(await canUsersMessage(OWNER, STRANGER)).toBe(false);
        expect(await canUsersMessage(STRANGER, APPLICANT)).toBe(false);
    });

    itDb('is true when either party is an admin, in both directions', async () => {
        expect(await canUsersMessage(ADMIN, STRANGER)).toBe(true);
        expect(await canUsersMessage(STRANGER, ADMIN)).toBe(true);
    });

    itDb('accepts a pending application — acceptance is not required', async () => {
        const [rows] = await db.query(
            'SELECT status FROM job_applications WHERE job_id = ? AND user_id = ?',
            [JOB_ID, APPLICANT]
        );
        expect(rows[0].status).toBe('pending');
        expect(await canUsersMessage(APPLICANT, OWNER)).toBe(true);
    });

    itDb('still connects the pair after the application is rejected', async () => {
        await db.query(
            "UPDATE job_applications SET status = 'rejected' WHERE job_id = ? AND user_id = ?",
            [JOB_ID, APPLICANT]
        );
        try {
            expect(await canUsersMessage(APPLICANT, OWNER)).toBe(true);
        } finally {
            await db.query(
                "UPDATE job_applications SET status = 'pending' WHERE job_id = ? AND user_id = ?",
                [JOB_ID, APPLICANT]
            );
        }
    });
});

describe('getConnectedUserIds (real SQL)', () => {
    itDb('returns the owner for the applicant, and the applicant for the owner', async () => {
        expect(await getConnectedUserIds(APPLICANT)).toEqual([OWNER]);
        expect(await getConnectedUserIds(OWNER)).toEqual([APPLICANT]);
    });

    itDb('returns nothing for an unrelated user', async () => {
        expect(await getConnectedUserIds(STRANGER)).toEqual([]);
    });

    itDb('agrees with canUsersMessage — the list and the gate cannot drift', async () => {
        const ids = await getConnectedUserIds(APPLICANT);
        for (const id of ids) {
            expect(await canUsersMessage(APPLICANT, id)).toBe(true);
        }
        expect(ids).not.toContain(STRANGER);
        expect(await canUsersMessage(APPLICANT, STRANGER)).toBe(false);
    });
});
