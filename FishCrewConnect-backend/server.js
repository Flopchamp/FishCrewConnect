require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const jobRoutes = require('./routes/jobRoutes');
const jobApplicationRoutes = require('./routes/jobApplicationRoutes');
const reviewRoutes = require('./routes/reviewRoutes'); 
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const supportRoutes = require('./routes/supportRoutes');

const app = express();
const server = http.createServer(app);

// Parse allowed origins from ALLOWED_ORIGINS env var (comma-separated list)
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8081'];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin ${origin} not allowed`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

const io = new Server(server, {
  cors: corsOptions,
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 30000,
  pingInterval: 25000
});

// Make io accessible to our router
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json()); // Middleware to parse JSON bodies

// Serve uploaded files statically
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize DB Connection
require('./config/db');

// Import auth routes
const authRoutes = require('./routes/authRoutes');
// Import user routes
const userRoutes = require('./routes/userRoutes'); // Re-enabled

// Use auth routes
app.use('/api/auth', authRoutes);
// Use user routes
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', jobApplicationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/support', supportRoutes);

// Basic Routes
app.get('/', (req, res) => {
  res.send('FishCrew Connect Backend is running!');
});

// Health check endpoint for Socket.IO connectivity testing
app.get('/socket-health', (req, res) => {
  res.json({
    status: 'ok',
    connections: io.engine.clientsCount,
    socketIoVersion: '4.8.1', 
    uptime: process.uptime()
  });
});

// Socket.IO JWT authentication middleware — verifies token before any event
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
        return next(new Error('Socket authentication required'));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.user.id.toString();
        next();
    } catch (err) {
        next(new Error('Socket authentication failed'));
    }
});

// Socket.IO connection
io.on('connection', (socket) => {
  // Auto-join the authenticated user's own room on connect
  socket.join(socket.userId);

  // Validate that the requested room matches the authenticated user
  socket.on('join_room', (userId) => {
    if (userId && userId.toString() === socket.userId) {
      socket.join(socket.userId);
    }
  });
  
  socket.on('disconnect', () => {
    // User disconnected - console log removed
  });

  // Handle real-time messaging
  socket.on('send_message', async (messageData) => {
    try {
      const { recipientId, text, senderId } = messageData;
      
      if (recipientId && text) {
        // Message processing - console log removed for cleaner output
        
        // Forward the message to the recipient's room
        io.to(recipientId.toString()).emit('new_message', {
          id: Date.now(), // This will be overwritten when saved to DB
          senderId: senderId || socket.user?.id || 'unknown',
          recipientId,
          text,
          timestamp: new Date().toISOString(),
          read: false
        });
      }
    } catch (error) {
      console.error('Error handling send_message event:', error);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 FishCrewConnect Server running on port ${PORT}`);
});