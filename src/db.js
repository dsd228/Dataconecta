// src/db.js - inicializa SQLite y crea tablas si no existen
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || './data/dataconecta.db';

async function init() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS editor_contents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT,
      status TEXT DEFAULT 'draft',
      author_email TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS editor_revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER NOT NULL,
      content TEXT,
      author_email TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (content_id) REFERENCES editor_contents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      name TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER,
      type TEXT,
      title TEXT,
      content_id INTEGER,
      snippet TEXT,
      payload TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
      FOREIGN KEY (content_id) REFERENCES editor_contents(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT,
      event_name TEXT,
      payload TEXT,
      crm_contact_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (crm_contact_id) REFERENCES contacts(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
    CREATE INDEX IF NOT EXISTS idx_analytics_crm_contact_id ON analytics_events(crm_contact_id);
    CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
  `);

  return db;
}

module.exports = { init };
