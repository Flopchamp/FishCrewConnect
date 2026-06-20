require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8081'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// req.io is injected by server.js; undefined in tests (all controllers guard with if (req.io))
app.use((req, res, next) => { req.io = app._io || null; next(); });

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

require('./config/db');

app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/users',         require('./routes/userRoutes'));
app.use('/api/jobs',          require('./routes/jobRoutes'));
app.use('/api/applications',  require('./routes/jobApplicationRoutes'));
app.use('/api/reviews',       require('./routes/reviewRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/messages',      require('./routes/messageRoutes'));
app.use('/api/admin',         require('./routes/adminRoutes'));
app.use('/api/payments',      require('./routes/paymentRoutes'));
app.use('/api/support',       require('./routes/supportRoutes'));

app.get('/', (req, res) => res.send('FishCrew Connect Backend is running!'));

module.exports = app;
