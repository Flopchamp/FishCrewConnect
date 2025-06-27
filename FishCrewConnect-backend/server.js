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
const paymentRoutes = require('./routes/paymentRoutes');

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

// Socket.IO connection
io.on('connection', (socket) => {
  // User connected - removed console log to reduce noise

  // Join a room based on user ID if provided (e.g., after authentication)  
  socket.on('join_room', (userId) => {
    if (userId) {
      socket.join(userId.toString());
      // User joined room - console log removed
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