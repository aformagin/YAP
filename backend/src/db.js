'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'yap_media.db');
const db = new Database(DB_PATH);

// WAL mode for better read concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Users table
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    must_change_password INTEGER DEFAULT 1,
    theme_preference TEXT DEFAULT 'light',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Media table
db.prepare(`
  CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    artist TEXT,
    album TEXT,
    genre TEXT,
    duration INTEGER,
    file_path TEXT UNIQUE NOT NULL,
    cover_path TEXT,
    bitrate INTEGER,
    format TEXT
  )
`).run();

// Indexes for common query patterns
db.prepare('CREATE INDEX IF NOT EXISTS idx_media_artist ON media(artist)').run();
db.prepare('CREATE INDEX IF NOT EXISTS idx_media_album ON media(album)').run();
db.prepare('CREATE INDEX IF NOT EXISTS idx_media_title ON media(title)').run();

// Settings table
db.prepare(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
  )
`).run();

// Seed default settings
const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
stmt.run('scanner.scrape_covers', 'false');

// Seed default admin on first run.
// bcrypt.hashSync is used here intentionally: this code runs synchronously at
// module-load time (before the HTTP server starts accepting requests), so there
// is no event loop to block and no DoS risk.  Switching to the async variant
// would require restructuring db.js as an async module, which is out of scope.
// See routes/auth.js and routes/admin.js for the async usage in request handlers.
const row = db.prepare('SELECT count(*) as count FROM users').get();
if (row.count === 0) {
  const hash = bcrypt.hashSync('YAPAdmin!', 12);
  db.prepare(
    'INSERT INTO users (username, password_hash, is_admin, must_change_password) VALUES (?, ?, ?, ?)'
  ).run('Admin', hash, 1, 1);
  console.log('[DB] Default admin created — username: Admin, password: YAPAdmin!');
}

module.exports = db;
