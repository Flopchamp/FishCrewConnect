const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const app = require('./app');

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

    socket.on('send_message', async (messageData) => {
        try {
            const { recipientId, text } = messageData;
            if (recipientId && text) {
                io.to(recipientId.toString()).emit('new_message', {
                    id: Date.now(),
                    senderId: socket.userId,
                    recipientId,
                    text,
                    timestamp: new Date().toISOString(),
                    read: false,
                });
            }
        } catch (error) {
            console.error('Error handling send_message event:', error);
        }
    });
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
    console.log(`🚀 FishCrewConnect Server running on port ${PORT}`);
});
