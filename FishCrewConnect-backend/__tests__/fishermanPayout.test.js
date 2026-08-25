jest.mock('../config/db', () => ({ query: jest.fn(), execute: jest.fn() }));
jest.mock('../services/darajaService', () => ({ sendMoney: jest.fn() }));

const db = require('../config/db');
const darajaService = require('../services/darajaService');
const { payFisherman, CLAIMING, IN_FLIGHT, FAILED } = require('../services/fishermanPayout');

const payout = {
    paymentId: 42, phoneNumber: '254700000000', amount: 4750,
    fishermanId: 3, jobId: 7, jobTitle: 'Deep sea trip',
};

const claimSucceeds = () => db.query.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
const claimFails = () => db.query.mockResolvedValueOnce([{ affectedRows: 0 }, []]);
const callsMatching = (re) => db.query.mock.calls.filter(([sql]) => re.test(sql));

beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockReset();
    db.query.mockResolvedValue([{ affectedRows: 1 }, []]);
    darajaService.sendMoney.mockResolvedValue({
        ConversationID: 'AG_1', OriginatorConversationID: 'ORIG_1',
    });
});

describe('payFisherman', () => {
    it('writes the intent BEFORE the money can move', async () => {
        claimSucceeds();
        await payFisherman(payout);

        const claimIndex = db.query.mock.calls.findIndex(([sql]) => sql.includes('SET b2c_status = ?, updated_at'));
        const sendOrder = darajaService.sendMoney.mock.invocationCallOrder[0];
        const claimOrder = db.query.mock.invocationCallOrder[claimIndex];

        expect(claimIndex).toBe(0);
        expect(claimOrder).toBeLessThan(sendOrder);
    });

    it('records b2c_status as pending, not completed — B2C is asynchronous', async () => {
        claimSucceeds();
        const result = await payFisherman(payout);

        expect(result.status).toBe(IN_FLIGHT);
        expect(IN_FLIGHT).toBe('pending');
        const wrote = db.query.mock.calls.find(([sql]) => sql.includes('b2c_conversation_id = ?'));
        expect(wrote[1]).toContain('pending');
        expect(wrote[1]).not.toContain('completed');
    });

    it('does not send twice when the payout is already claimed', async () => {
        claimFails();
        const result = await payFisherman(payout);

        expect(result.status).toBe('already_claimed');
        expect(darajaService.sendMoney).not.toHaveBeenCalled();
    });

    it('claims only rows that are unpaid or previously failed', async () => {
        claimSucceeds();
        await payFisherman(payout);

        const [sql, params] = db.query.mock.calls[0];
        expect(sql).toMatch(/b2c_status IS NULL OR b2c_status = \?/);
        expect(params).toEqual([CLAIMING, payout.paymentId, FAILED]);
    });

    it('marks the row failed and notifies the fisherman when sendMoney throws', async () => {
        claimSucceeds();
        darajaService.sendMoney.mockRejectedValue(new Error('Safaricom down'));

        const result = await payFisherman(payout);

        expect(result.status).toBe(FAILED);
        const failed = db.query.mock.calls.find(([sql]) => sql.includes('b2c_result_desc = ?'));
        expect(failed[1][0]).toBe('failed');
        expect(callsMatching(/INSERT INTO notifications/)).toHaveLength(1);
    });

    it('never leaves a failed payout claimed as in-flight', async () => {
        claimSucceeds();
        darajaService.sendMoney.mockRejectedValue(new Error('Safaricom down'));
        await payFisherman(payout);

        const statuses = db.query.mock.calls.flatMap(([, params]) => params || []);
        expect(statuses).not.toContain(IN_FLIGHT);
    });

    it('skips and escalates when the fisherman has no phone number', async () => {
        const result = await payFisherman({ ...payout, phoneNumber: undefined });

        expect(result.status).toBe('skipped');
        expect(darajaService.sendMoney).not.toHaveBeenCalled();
        expect(callsMatching(/INSERT INTO notifications/)).toHaveLength(1);
    });
});
