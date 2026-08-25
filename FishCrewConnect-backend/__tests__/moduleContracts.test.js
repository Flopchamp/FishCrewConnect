// Every other suite mocks ../scripts/update-payment-statistics, and the mock
// invents a `refreshPaymentStatistics` export. For a long time the real module
// exported the function directly (module.exports = updatePaymentStatistics), so
// the destructured import in both controllers was `undefined` in production —
// and no test noticed, because the mock supplied what the module did not.
//
// These tests deliberately do NOT mock that module. db is mocked only to keep a
// real connection pool from opening.
jest.mock('../config/db', () => ({ query: jest.fn(), execute: jest.fn() }));

const paymentStats = require('../scripts/update-payment-statistics');

describe('update-payment-statistics exports', () => {
    it('exports refreshPaymentStatistics, which both controllers import by name', () => {
        expect(typeof paymentStats.refreshPaymentStatistics).toBe('function');
    });

    it('still exports the CLI entry point used by npm scripts', () => {
        expect(typeof paymentStats.updatePaymentStatistics).toBe('function');
    });

    it('returns a promise, so callers can attach .catch()', () => {
        const db = require('../config/db');
        db.execute.mockResolvedValue([[], []]);
        const returned = paymentStats.refreshPaymentStatistics();
        expect(typeof returned?.then).toBe('function');
        return returned;
    });

    it('resolves rather than throwing when the query fails', async () => {
        const db = require('../config/db');
        db.execute.mockRejectedValue(new Error('table missing'));
        await expect(paymentStats.refreshPaymentStatistics())
            .resolves.toEqual({ success: false, error: 'table missing' });
    });
});
