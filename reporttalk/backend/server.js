require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const mongoose = require('mongoose');

// Routes and Middleware
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const { verifyToken } = require('./middleware/auth');
const { GEMINI_MODELS } = require('./services/gemini');

// Config
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('\n❌ Fatal Error: MONGODB_URI is missing. Please set it in .env');
  process.exit(1);
}

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Rate Limiting
const rateLimits = new Map();

function checkRateLimit(ip, type, limit, windowMs) {
  const now = Date.now();
  if (!rateLimits.has(ip)) rateLimits.set(ip, { general: {}, auth: {}, analyse: {} });
  const ipLimits = rateLimits.get(ip);
  const record = ipLimits[type];

  if (!record.resetTime || now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return true; // Allowed
  }

  if (record.count >= limit) return false; // Rate limited

  record.count++;
  return true; // Allowed
}

function handleRateLimit(req, url) {
  const ip = req.socket.remoteAddress || 'unknown';

  // General: 100 req per 15 min
  if (!checkRateLimit(ip, 'general', 100, 15 * 60 * 1000)) return false;

  if (url.pathname.startsWith('/api/auth')) {
    // Auth routes: 10 req per 15 min
    if (!checkRateLimit(ip, 'auth', 10, 15 * 60 * 1000)) return false;
  }

  if (url.pathname === '/api/analyse') {
    // Analyse route: 20 req per 1 hr
    if (!checkRateLimit(ip, 'analyse', 20, 60 * 60 * 1000)) return false;
  }

  return true;
}

// Helpers
function parseMultipart(body, boundary) {
  const parts = [];
  const boundaryBuf = Buffer.from('--' + boundary);
  let start = 0;
  while (start < body.length) {
    const bStart = body.indexOf(boundaryBuf, start);
    if (bStart === -1) break;
    const headerStart = bStart + boundaryBuf.length + 2;
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;
    const headers = body.slice(headerStart, headerEnd).toString();
    const dataStart = headerEnd + 4;
    const bEnd = body.indexOf(boundaryBuf, dataStart);
    if (bEnd === -1) break;
    const data = body.slice(dataStart, bEnd - 2);
    parts.push({ headers, data });
    start = bEnd;
  }
  return parts;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function json(res, status, obj) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    cors(res);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// Request Body Parser
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
  });
}

// Main Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS preflight
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(200); res.end(); return; }

  // Rate Limiting
  if (!handleRateLimit(req, url)) {
    return json(res, 429, { error: 'Too many requests. Please try again later.' });
  }

  // Frontend Serving
  if (req.method === 'GET' && url.pathname === '/') {
    return serveFile(res, path.join(__dirname, '../frontend/index.html'), 'text/html');
  }

  // Health check
  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, {
      status: 'ok',
      db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      models: GEMINI_MODELS
    });
  }

  // API Routes
  if (url.pathname.startsWith('/api/')) {

    // Auth Routes
    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      try {
        const body = await parseJsonBody(req);
        const result = await authRoutes.register(req, res, body);
        return json(res, result.status, result.data);
      } catch (e) { return json(res, 400, { error: 'Invalid JSON' }); }
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      try {
        const body = await parseJsonBody(req);
        const result = await authRoutes.login(req, res, body);
        return json(res, result.status, result.data);
      } catch (e) { return json(res, 400, { error: 'Invalid JSON' }); }
    }

    // Protected Routes
    let user = null;
    try {
      user = await verifyToken(req);
    } catch (e) {
      if (url.pathname === '/api/auth/me' || url.pathname.startsWith('/api/reports') || url.pathname === '/api/analyse') {
        return json(res, 401, { error: e.message });
      }
    }

    if (url.pathname === '/api/auth/me' && req.method === 'GET') {
      const result = await authRoutes.me(req, res, user);
      return json(res, result.status, result.data);
    }

    // Reports Routes
    if (url.pathname === '/api/analyse' && req.method === 'POST') {
      const contentType = req.headers['content-type'] || '';
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', async () => {
        try {
          const body = Buffer.concat(chunks);
          let boundary = '';
          if (contentType.includes('boundary=')) {
            boundary = contentType.split('boundary=')[1];
          }
          const result = await reportRoutes.analyse(req, res, user, body, contentType, boundary, parseMultipart);
          return json(res, result.status, result.data);
        } catch (e) {
          return json(res, 500, { error: e.message });
        }
      });
      return;
    }

    if (url.pathname === '/api/reports' && req.method === 'GET') {
      const result = await reportRoutes.history(req, res, user, url);
      return json(res, result.status, result.data);
    }

    const idMatch = url.pathname.match(/^\/api\/reports\/([a-f0-9]{24})$/);
    if (idMatch) {
      const reportId = idMatch[1];
      if (req.method === 'GET') {
        const result = await reportRoutes.getOne(req, res, user, reportId);
        return json(res, result.status, result.data);
      }
      if (req.method === 'DELETE') {
        const result = await reportRoutes.deleteOne(req, res, user, reportId);
        return json(res, result.status, result.data);
      }
    }

    return json(res, 404, { error: 'API route not found' });
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n🏥 ReportTalk Backend running at http://localhost:${PORT}`);
  console.log(`📋 Open http://localhost:${PORT} in your browser`);
});
