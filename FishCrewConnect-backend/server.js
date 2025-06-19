require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const jobRoutes = require('./routes/jobRoutes');
const jobApplicationRoutes = require('./routes/jobApplicationRoutes');
const reviewRoutes = require('./routes/reviewRoutes'); 
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Be more specific in production!
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  },
  transports: ['polling', 'websocket'], // Support both polling and websocket
  allowEIO3: true, // Allow Engine.IO 3 transport for backwards compatibility
  pingTimeout: 30000, // Increased ping timeout (default: 20000ms)
  pingInterval: 25000 // Increased ping interval (default: 25000ms)
});

// Make io accessible to our router
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Middleware
// Enhanced CORS options to work better with Socket.IO
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json()); // Middleware to parse JSON bodies

// Initialize DB Connection
require('./config/db');

// ---- START DIAGNOSTIC ROUTE ----
// COMMENTED OUT FOR THIS TEST:
// app.get('/api/users/ping', (req, res) => {
//   console.log('Accessed /api/users/ping directly in server.js (with http, socket.io, cors)');
//   res.status(200).send('Pong from /api/users/ping in server.js (with http, socket.io, cors)');
// });
// ---- END DIAGNOSTIC ROUTE ----

// Import auth routes
const authRoutes = require('./routes/authRoutes');
// Import user routes
const userRoutes = require('./routes/userRoutes'); // Re-enabled

// Use auth routes
app.use('/api/auth', authRoutes);
// Use user routes
app.use('/api/users', userRoutes); // Re-enabled
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', jobApplicationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// Basic Routes
app.get('/', (req, res) => {
  res.send('FishCrew Connect Backend is running!');
});

// Health check endpoint for Socket.IO connectivity testing
app.get('/socket-health', (req, res) => {
  res.json({
    status: 'ok',
    connections: io.engine.clientsCount,
    socketIoVersion: '4.8.1', // Hardcode version instead of requiring package.json
    uptime: process.uptime()
  });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a room based on user ID if provided (e.g., after authentication)
  // The client should emit a 'join_room' event with their user ID after connecting
  socket.on('join_room', (userId) => {
    if (userId) {
      socket.join(userId.toString());
      console.log(`Socket ${socket.id} joined room for user ${userId}`);
    }
  });
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  // Handle real-time messaging
  socket.on('send_message', async (messageData) => {
    try {
      const { recipientId, text, senderId } = messageData;
      
      if (recipientId && text) {
        console.log(`Sending message to user ${recipientId}: ${text}`);
        
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
  console.log(`Server with authRoutes and userRoutes listening on port ${PORT}`); // Updated message
});