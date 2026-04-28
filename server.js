// ─────────────────────────────────────────────
//  FoodSaver — Backend Server
//  Node.js + Express + SQLite + JWT Auth
// ─────────────────────────────────────────────

const express      = require('express');
const path         = require('path');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const db           = require('./database');

const app    = express();
const PORT   = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'foodsaver_secret_key_2025';

// ── Middleware ────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ── Auth Middleware ───────────────────────────
function authenticate(req, res, next) {
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

function optionalAuth(req, res, next) {
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
  if (token) {
    try { req.user = jwt.verify(token, SECRET); } catch {}
  }
  next();
}

// ════════════════════════════════════════════
//  AUTH ROUTES
// ════════════════════════════════════════════

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, role, phone, org, city } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

  const hashed = await bcrypt.hash(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password, role, phone, org, city) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(name, email.toLowerCase(), hashed, role || 'individual', phone || '', org || '', city || '');

  // Log activity
  db.prepare('INSERT INTO activity (user_id, type, description) VALUES (?, ?, ?)').run(result.lastInsertRowid, 'signup', 'Account created');

  res.status(201).json({ message: 'Account created! Please sign in.' });
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    SECRET,
    { expiresIn: '7d' }
  );

  // Log activity
  db.prepare('INSERT INTO activity (user_id, type, description) VALUES (?, ?, ?)').run(user.id, 'login', 'Signed in');

  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({
    message: 'Login successful',
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, org: user.org, city: user.city }
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, phone, org, city, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user });
});

// ════════════════════════════════════════════
//  USER / PROFILE ROUTES
// ════════════════════════════════════════════

// PUT /api/profile — update profile
app.put('/api/profile', authenticate, (req, res) => {
  const { name, phone, org, city, role } = req.body;
  db.prepare('UPDATE users SET name=?, phone=?, org=?, city=?, role=? WHERE id=?')
    .run(name, phone || '', org || '', city || '', role || 'individual', req.user.id);
  res.json({ message: 'Profile updated successfully.' });
});

// GET /api/profile/stats — user stats
app.get('/api/profile/stats', authenticate, (req, res) => {
  const claimed = db.prepare('SELECT COUNT(*) as count FROM claims WHERE user_id = ?').get(req.user.id);
  const posted  = db.prepare('SELECT COUNT(*) as count FROM listings WHERE posted_by = ?').get(req.user.id);
  const kgRescued = (claimed.count * 0.6 + posted.count * 1.2).toFixed(1);
  res.json({
    claimed: claimed.count,
    posted:  posted.count,
    kg_rescued: parseFloat(kgRescued),
    co2_saved:  +(claimed.count * 0.4).toFixed(1),
    water_saved: claimed.count * 220,
  });
});

// GET /api/profile/activity — recent activity
app.get('/api/profile/activity', authenticate, (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM activity WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
  ).all(req.user.id);
  res.json({ activity: rows });
});

// ════════════════════════════════════════════
//  LISTINGS ROUTES
// ════════════════════════════════════════════

// GET /api/listings — all listings (with optional filters)
app.get('/api/listings', optionalAuth, (req, res) => {
  const { veg, urgent, search, sort } = req.query;
  let query = 'SELECT l.*, u.name as poster_name FROM listings l LEFT JOIN users u ON l.posted_by = u.id WHERE l.expiry_minutes > 0';
  const params = [];

  if (veg === '1')    { query += ' AND l.veg = 1'; }
  if (urgent === '1') { query += ' AND l.expiry_minutes < 90'; }
  if (search)         { query += ' AND (l.restaurant LIKE ? OR l.food LIKE ? OR l.category LIKE ?)'; const s = '%' + search + '%'; params.push(s, s, s); }

  if (sort === 'qty')    query += ' ORDER BY l.qty DESC';
  else                   query += ' ORDER BY l.expiry_minutes ASC';

  const rows = db.prepare(query).all(...params);

  // Mark which ones current user claimed
  if (req.user) {
    const claimed = db.prepare('SELECT listing_id FROM claims WHERE user_id = ?').all(req.user.id).map(r => r.listing_id);
    rows.forEach(r => { r.claimed_by_me = claimed.includes(r.id); });
  }

  res.json({ listings: rows });
});

// GET /api/listings/:id — single listing
app.get('/api/listings/:id', (req, res) => {
  const row = db.prepare('SELECT l.*, u.name as poster_name FROM listings l LEFT JOIN users u ON l.posted_by = u.id WHERE l.id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Listing not found.' });
  res.json({ listing: row });
});

// POST /api/listings — create listing
app.post('/api/listings', authenticate, (req, res) => {
  const { restaurant, contact, email, address, food, qty, unit, category, pickup, expiry_minutes, notes, veg } = req.body;
  if (!restaurant || !contact || !address || !food || !qty || !pickup) {
    return res.status(400).json({ error: 'Please fill all required fields.' });
  }

  const result = db.prepare(
    `INSERT INTO listings (restaurant, contact, email, address, food, qty, unit, category, pickup, expiry_minutes, notes, veg, posted_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(restaurant, contact, email || '', address, food, parseInt(qty), unit || 'portions', category || 'Vegetarian', pickup, parseInt(expiry_minutes) || 360, notes || '', veg ? 1 : 0, req.user.id);

  db.prepare('INSERT INTO activity (user_id, type, description, ref_id) VALUES (?, ?, ?, ?)').run(req.user.id, 'posted', 'Posted listing: ' + food, result.lastInsertRowid);

  res.status(201).json({ message: 'Listing posted successfully!', id: result.lastInsertRowid });
});

// DELETE /api/listings/:id — delete own listing
app.delete('/api/listings/:id', authenticate, (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.posted_by !== req.user.id) return res.status(403).json({ error: 'Not authorized.' });
  db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id);
  res.json({ message: 'Listing deleted.' });
});

// POST /api/listings/:id/claim
app.post('/api/listings/:id/claim', authenticate, (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.claimed) return res.status(409).json({ error: 'This listing has already been claimed.' });

  const alreadyClaimed = db.prepare('SELECT id FROM claims WHERE user_id = ? AND listing_id = ?').get(req.user.id, listing.id);
  if (alreadyClaimed) return res.status(409).json({ error: 'You already claimed this listing.' });

  db.prepare('UPDATE listings SET claimed = 1 WHERE id = ?').run(listing.id);
  db.prepare('INSERT INTO claims (user_id, listing_id) VALUES (?, ?)').run(req.user.id, listing.id);
  db.prepare('INSERT INTO activity (user_id, type, description, ref_id) VALUES (?, ?, ?, ?)').run(req.user.id, 'claimed', 'Claimed food from ' + listing.restaurant, listing.id);

  res.json({ message: 'Claimed! Contact ' + listing.restaurant + ' at ' + listing.contact + ' for pickup.' });
});

// GET /api/listings/mine — listings posted by current user
app.get('/api/my/listings', authenticate, (req, res) => {
  const rows = db.prepare('SELECT * FROM listings WHERE posted_by = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ listings: rows });
});

// GET /api/my/claims — listings claimed by current user
app.get('/api/my/claims', authenticate, (req, res) => {
  const rows = db.prepare(
    `SELECT l.*, c.created_at as claimed_at
     FROM claims c JOIN listings l ON c.listing_id = l.id
     WHERE c.user_id = ? ORDER BY c.created_at DESC`
  ).all(req.user.id);
  res.json({ claims: rows });
});

// ════════════════════════════════════════════
//  ADMIN / STATS
// ════════════════════════════════════════════

// GET /api/stats — public platform stats
app.get('/api/stats', (req, res) => {
  const totalListings = db.prepare('SELECT COUNT(*) as c FROM listings').get().c;
  const totalClaimed  = db.prepare('SELECT COUNT(*) as c FROM claims').get().c;
  const totalUsers    = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalKg       = +(totalClaimed * 0.6).toFixed(1);
  res.json({ total_listings: totalListings, total_claimed: totalClaimed, total_users: totalUsers, kg_rescued: totalKg });
});

// ── Tick expiry every minute ──────────────────
setInterval(() => {
  db.prepare('UPDATE listings SET expiry_minutes = expiry_minutes - 1 WHERE expiry_minutes > 0').run();
}, 60 * 1000);

// ── Serve frontend for all other routes ───────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start server ──────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌿 FoodSaver server running at http://localhost:${PORT}`);
  console.log(`   Database: foodsaver.db`);
  console.log(`   Press Ctrl+C to stop\n`);
});
