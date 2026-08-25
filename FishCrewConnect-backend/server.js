const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = require('./app');
const logger = require('./utils/logger');
const { createSendMessageHandler } = require('./socketHandlers');

// Fail fast if critical env vars are absent
const REQUIRED_ENV = ['JWT_SECRET', 'MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE', 'MPESA_CALLBACK_SECRET'];

// Refuse to boot a production server that would fabricate payment receipts.
assertDemoModeAllowed();
if (process.env.NODE_ENV === 'production') {
    REQUIRED_ENV.push('BACKEND_URL');
}
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
}

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8081'];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

const server = http.createServer(app);

const io = new Server(server, {
    cors: corsOptions,
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    pingTimeout: 30000,
    pingInterval: 25000,
});

// Inject io so app-level middleware can attach it to req.io
app._io = io;

// Socket.IO JWT authentication middleware
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Socket authentication required'));
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.user.id.toString();
        next();
    } catch (err) {
        next(new Error('Socket authentication failed'));
    }
});

io.on('connection', (socket) => {
    socket.join(socket.userId);

    socket.on('join_room', (userId) => {
        if (userId && userId.toString() === socket.userId) {
            socket.join(socket.userId);
        }
    });

    socket.on('disconnect', () => {});

    socket.on('send_message', createSendMessageHandler(io, socket));
});

app.get('/socket-health', (req, res) => {
    res.json({
        status: 'ok',
        connections: io.engine.clientsCount,
        socketIoVersion: '4.8.1',
        uptime: process.uptime(),
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    logger.info(` FishCrewConnect Server running on port ${PORT}`);
});
