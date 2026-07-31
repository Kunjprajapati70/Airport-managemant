/**
 * app.js
 * Express application entry point.
 *
 * Startup order:
 *   1. Load environment variables
 *   2. Create Express app + HTTP server
 *   3. Initialize Socket.IO on the HTTP server
 *   4. Connect to MongoDB
 *   5. Apply global middleware (security, CORS, body parsing, logging)
 *   6. Mount all API route groups
 *   7. 404 handler
 *   8. Centralized error handler
 *   9. Start listening
 */

require('dotenv').config();

const express    = require('express');
const http       = require('http');
const path       = require('path');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const connectDB      = require('./config/db');
const errorHandler   = require('./middleware/errorHandler');
const { initSocket } = require('./socket');

// ── App + HTTP server ─────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// Trust Render's proxy (required for correct IP in rate limiting)
app.set('trust proxy', 1);

// ── Socket.IO (must be attached to the HTTP server, not the Express app) ──────
initSocket(server);

// ── Database ──────────────────────────────────────────────────────────────────
connectDB();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow /uploads to be served cross-origin
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin:      process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Strict limit on auth endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      20,              // 20 attempts per window
  message:  { success: false, message: 'Too many requests from this IP. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// General API limit — generous for normal usage
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      500,
  message:  { success: false, message: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

app.use('/api/auth', authLimiter); // strict on auth
app.use('/api',      apiLimiter);  // general on everything else

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── HTTP request logging ──────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ── Static file serving (uploaded avatars, documents) ────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/users',          require('./routes/users'));
app.use('/api/passengers',     require('./routes/passengers'));
app.use('/api/airports',       require('./routes/airports'));
app.use('/api/airlines',       require('./routes/airlines'));
app.use('/api/aircraft',       require('./routes/aircraft'));
app.use('/api/flights',        require('./routes/flights'));
app.use('/api/bookings',       require('./routes/bookings'));
app.use('/api/checkin',        require('./routes/checkin'));
app.use('/api/boarding',       require('./routes/boarding'));
app.use('/api/baggage',        require('./routes/baggage'));
app.use('/api/security',       require('./routes/security'));
app.use('/api/maintenance',    require('./routes/maintenance'));
app.use('/api/staff',          require('./routes/staff'));
app.use('/api/notifications',  require('./routes/notifications'));
app.use('/api/reports',        require('./routes/reports'));
app.use('/api/infrastructure', require('./routes/infrastructure'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success:   true,
    status:    'OK',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV,
  });
});

// ── 404 — unmatched routes ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ── Centralized error handler (must be last) ──────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 AeroManage API running on port ${PORT} [${process.env.NODE_ENV}]`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Stop the existing process or change PORT in .env.`);
    process.exit(1);
  }

  console.error('❌ Server failed to start:', err.message);
  process.exit(1);
});

module.exports = { app, server };
