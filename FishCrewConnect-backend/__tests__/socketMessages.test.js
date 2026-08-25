jest.mock('../config/db', () => ({ query: jest.fn(), execute: jest.fn() }));

const db = require('../config/db');
const { createSendMessageHandler } = require('../socketHandlers');

function fakeIo() {
    const emit = jest.fn();
    return { to: jest.fn(() => ({ emit })), emit };
}

beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockReset();
});

describe('socket send_message — authorization', () => {
    it('emits nothing when sender and recipient are not connected', async () => {
        db.query.mockResolvedValue([[], []]); // authorization query finds nothing
        const io = fakeIo();

        await createSendMessageHandler(io, { userId: '1' })({ recipientId: 2, text: 'hi' });

        expect(io.emit).not.toHaveBeenCalled();
        expect(io.to).not.toHaveBeenCalled();
    });

    it('emits to the recipient when they are connected', async () => {
        db.query.mockResolvedValue([[{ connected: 1 }], []]);
        const io = fakeIo();

        await createSendMessageHandler(io, { userId: '1' })({ recipientId: 2, text: 'hi' });

        expect(io.to).toHaveBeenCalledWith('2');
        expect(io.emit).toHaveBeenCalledWith('new_message', expect.objectContaining({ text: 'hi' }));
    });

    it('uses the same authorization query as the REST route', async () => {
        db.query.mockResolvedValue([[], []]);

        await createSendMessageHandler(fakeIo(), { userId: '1' })({ recipientId: 2, text: 'hi' });

        const [[sql]] = db.query.mock.calls;
        expect(sql).toMatch(/job_applications/i);
        expect(sql).not.toMatch(/accepted/i);
    });
});
