// src/db.js
// Creates/opens SQLite DB and ensures required tables exist.

const fs = require('fs');
const path = require('path');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

async function createDb() {
  const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'dataconecta.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = await sqlite.open({ filename: dbPath, driver: sqlite3.Database });

  // Basic schema (keep in migration.sql too)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      phone TEXT,
      company TEXT,
      stage TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      contact_id TEXT,
      type TEXT,
      summary TEXT,
      ts INTEGER,
      FOREIGN KEY(contact_id) REFERENCES contacts(id)
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      type TEXT,
      payload TEXT,
      ts INTEGER
    );

    CREATE TABLE IF NOT EXISTS editor_contents (
      id TEXT PRIMARY KEY,
      slug TEXT,
      title TEXT,
      content TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS editor_revisions (
      id TEXT PRIMARY KEY,
      content_id TEXT,
      content TEXT,
      ts INTEGER,
      FOREIGN KEY(content_id) REFERENCES editor_contents(id)
    );
  `);

  return db;
}

module.exports = createDb;
