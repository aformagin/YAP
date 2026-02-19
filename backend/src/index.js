'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('./middleware/auth');
const firstRunMiddleware = require('./middleware/firstRun');

// Check for default JWT secret and issue a warning if it's being used
const JWT_SECRET = process.env.JWT_SECRET || 'yap-dev-secret-change-in-prod';
const DEFAULT_JWT_SECRET = 'yap-dev-secret-change-in-prod';

if (JWT_SECRET === DEFAULT_JWT_SECRET) {
  console.warn(`
/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\
[SECURITY WARNING] You are using the default JWT_SECRET.
This is insecure and should be changed for a production environment.
Please generate a long, random string and set it as the JWT_SECRET
environment variable in a .env file.
/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\/!\\
`);
}

// Ensure the covers cache directory exists before anything else runs
const COVERS_DIR = process.env.COVERS_DIR || path.resolve(__dirname, '..', '.cache', 'covers');
if (!fs.existsSync(COVERS_DIR)) {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
  console.log(`[Init] Created covers cache directory: ${COVERS_DIR}`);
}

// Initialize DB (schema creation + admin seed happens on require)
require('./db');

const app = express();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173', // Vite dev server
  credentials: true, // Allow cookies to be sent cross-origin
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Public routes — no first-run enforcement needed.
// /api/auth handles its own per-route auth (login/logout are public; /me and
// /change-password carry authMiddleware internally).
// /api/covers intentionally requires no auth (opaque filenames, low sensitivity).
app.use('/api/auth', require('./routes/auth'));
app.use('/api/covers', require('./routes/covers'));

// FIX #1 — Protected routes: authMiddleware + firstRunMiddleware are applied
// here at the app level so that firstRunMiddleware always runs AFTER a valid
// JWT has been verified and req.user has been populated.
//
// Trade-off: individual route files still carry their own authMiddleware, so
// JWT verification runs twice for these route groups.  The overhead is
// negligible (<1 ms) and keeps the route files self-contained.  Remove the
// per-route authMiddleware calls if you want a single verification point.
app.use('/api/media',  authMiddleware, firstRunMiddleware, require('./routes/media'));
app.use('/api/stream', authMiddleware, firstRunMiddleware, require('./routes/stream'));
app.use('/api/scan',   authMiddleware, firstRunMiddleware, require('./routes/scan'));
app.use('/api/user',   authMiddleware, firstRunMiddleware, require('./routes/user'));
app.use('/api/admin',  authMiddleware, firstRunMiddleware, require('./routes/admin'));

// ---------------------------------------------------------------------------
// Health check (no auth required)
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// ---------------------------------------------------------------------------
// 404 handler for unknown routes
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: 'NotFound', message: `Route ${req.method} ${req.path} not found` });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack || err.message);
  res.status(500).json({ error: 'InternalError', message: 'An unexpected error occurred' });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`[YAP] Backend running on http://${HOST}:${PORT}`);
  console.log(`[YAP] Accepting frontend connections from ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
});

module.exports = app; // Exported for testing
