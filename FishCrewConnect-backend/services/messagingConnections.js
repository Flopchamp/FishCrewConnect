const db = require('../config/db');

// Who is allowed to talk to whom.
//
// Two users are connected by a job application: one of them applied to a job the
// other posted. It is symmetric — either side may open the conversation.
//
// Deliberate decision: ANY application status counts ('pending', 'accepted' and
// 'rejected' alike), not just 'accepted'.
//   - Requiring 'accepted' would break the main reason to message at all: a boat
//     owner screening an applicant, or an applicant asking about the job, before
//     anyone commits.
//   - Excluding 'rejected' would silently 403 conversations that are already
//     open — a thread would become unrepliable the moment the owner filled the
//     job. A rejection is an outcome, not a block; blocking is a separate
//     concern and needs a separate mechanism.
// This also matches what GET /api/users/contacts has always shown, so the list a
// user can see and the list they can write to are the same list.

// The application graph. `ja.user_id` is the applicant, `j.user_id` is the owner
// of the job they applied to. Both halves take the subject id first, so every
// caller below passes params in the same (subject, counterparty) order — the
// swapped-parameter bug has nowhere to hide.
const APPLICATION_JOIN =
    'FROM job_applications ja INNER JOIN jobs j ON j.job_id = ja.job_id';
const AS_APPLICANT = `${APPLICATION_JOIN} WHERE ja.user_id = ?`;  // subject applied
const AS_OWNER = `${APPLICATION_JOIN} WHERE j.user_id = ?`;       // subject posted

/**
 * Every user connected to `userId` by a job application, in either direction.
 * Admins are not special here — this is the raw graph, used to build a contact
 * list. For an authorization decision use canUsersMessage.
 * @returns {Promise<number[]>} distinct user ids
 */
const getConnectedUserIds = async (userId) => {
    const sql =
        `SELECT j.user_id AS user_id ${AS_APPLICANT}` +
        ' UNION ' +
        `SELECT ja.user_id AS user_id ${AS_OWNER}`;
    const [rows] = await db.query(sql, [userId, userId]);
    return rows.map(row => row.user_id);
};

/**
 * May these two users exchange messages? Symmetric in the pair.
 *
 * Reads both users' account types from the database rather than trusting the
 * caller's JWT: user_type in a token is whatever it was at login, and an
 * authorization gate should not run on a stale claim.
 */
const canUsersMessage = async (senderId, recipientId) => {
    const sql =
        // Either party being an admin is enough. Admins need to reach users for
        // support, and — the case this misses if you only check the sender —
        // users need to be able to reply.
        "SELECT 1 AS connected FROM users WHERE user_id IN (?, ?) AND user_type = 'admin'" +
        ' UNION ' +
        `SELECT 1 AS connected ${AS_APPLICANT} AND j.user_id = ?` +
        ' UNION ' +
        `SELECT 1 AS connected ${AS_OWNER} AND ja.user_id = ?` +
        ' LIMIT 1';
    const [rows] = await db.query(sql, [
        senderId, recipientId,   // admin check, either side
        senderId, recipientId,   // sender applied to recipient's job
        senderId, recipientId,   // recipient applied to sender's job
    ]);
    return rows.length > 0;
};

/** Admins see every user in their contact list, not just their application graph. */
const isUnrestrictedMessenger = (userType) => userType === 'admin';

module.exports = { getConnectedUserIds, canUsersMessage, isUnrestrictedMessenger };
