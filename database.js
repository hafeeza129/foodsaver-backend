// ─────────────────────────────────────────────
//  FoodSaver — Database (SQLite via better-sqlite3)
// ─────────────────────────────────────────────

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'foodsaver.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Create Tables ─────────────────────────────

db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    role       TEXT    DEFAULT 'individual',
    phone      TEXT    DEFAULT '',
    org        TEXT    DEFAULT '',
    city       TEXT    DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Food listings table
  CREATE TABLE IF NOT EXISTS listings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant      TEXT    NOT NULL,
    contact         TEXT    NOT NULL,
    email           TEXT    DEFAULT '',
    address         TEXT    NOT NULL,
    food            TEXT    NOT NULL,
    qty             INTEGER NOT NULL,
    unit            TEXT    DEFAULT 'portions',
    category        TEXT    DEFAULT 'Vegetarian',
    pickup          TEXT    NOT NULL,
    expiry_minutes  INTEGER DEFAULT 360,
    notes           TEXT    DEFAULT '',
    veg             INTEGER DEFAULT 1,
    claimed         INTEGER DEFAULT 0,
    posted_by       INTEGER REFERENCES users(id),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Claims table (who claimed what)
  CREATE TABLE IF NOT EXISTS claims (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    listing_id INTEGER NOT NULL REFERENCES listings(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, listing_id)
  );

  -- Activity log
  CREATE TABLE IF NOT EXISTS activity (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    type        TEXT    NOT NULL,
    description TEXT    DEFAULT '',
    ref_id      INTEGER DEFAULT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── Seed demo listings (only if empty) ───────
const count = db.prepare('SELECT COUNT(*) as c FROM listings').get().c;
if (count === 0) {
  const demoListings = [
    { restaurant: 'Spice Garden',      contact: '+91 98765 43210', email: 'spice@garden.in',    address: 'MG Road, Near Clock Tower, Vijayawada', food: 'Mixed veg curry & steamed rice',   qty: 25, unit: 'portions', category: 'Vegetarian', pickup: '7:00 PM – 8:30 PM', expiry_minutes: 95,  veg: 1 },
    { restaurant: 'Annapoorna Sweets', contact: '+91 96543 21098', email: 'anna@sweets.in',     address: 'Labbipet, Vijayawada',                   food: 'Gulab jamun & medu vada',         qty: 40, unit: 'pieces',   category: 'Vegetarian', pickup: '6:30 PM – 7:30 PM', expiry_minutes: 28,  veg: 1 },
    { restaurant: 'Hotel Residency',   contact: '+91 94445 67890', email: 'residency@hotel.in', address: 'Benz Circle, Vijayawada',                 food: 'Chicken biryani (full portions)', qty: 15, unit: 'portions', category: 'Non-Veg',    pickup: '8:00 PM – 9:00 PM', expiry_minutes: 185, veg: 0 },
    { restaurant: 'Café Mocha',        contact: '+91 87654 32109', email: 'mocha@cafe.in',      address: 'Eluru Road, Vijayawada',                  food: 'Sandwiches & pastries',           qty: 18, unit: 'pieces',   category: 'Bakery',     pickup: '5:30 PM – 6:00 PM', expiry_minutes: 22,  veg: 1 },
    { restaurant: 'Punjab da Dhaba',   contact: '+91 77889 90011', email: 'punjab@dhaba.in',   address: 'Patamata, Vijayawada',                    food: 'Dal makhani, naan & salad',       qty: 20, unit: 'portions', category: 'Vegetarian', pickup: '9:00 PM – 10:00 PM',expiry_minutes: 300, veg: 1 },
    { restaurant: 'Udupi Palace',      contact: '+91 99887 65432', email: 'udupi@palace.in',   address: 'Governorpet, Vijayawada',                 food: 'Idli, dosa & fresh sambar',       qty: 30, unit: 'servings', category: 'Vegetarian', pickup: '9:00 AM – 10:00 AM',expiry_minutes: 480, veg: 1 },
  ];
  const ins = db.prepare(
    `INSERT INTO listings (restaurant, contact, email, address, food, qty, unit, category, pickup, expiry_minutes, veg)
     VALUES (@restaurant, @contact, @email, @address, @food, @qty, @unit, @category, @pickup, @expiry_minutes, @veg)`
  );
  demoListings.forEach(l => ins.run(l));
  console.log('✓ Demo listings seeded into database');
}

module.exports = db;
