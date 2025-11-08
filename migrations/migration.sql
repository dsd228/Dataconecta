-- Ejecuta: sqlite3 ./data/dataconecta.db < migrations/migration.sql

PRAGMA foreign_keys = ON;

-- Contenidos del editor
CREATE TABLE IF NOT EXISTS editor_contents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  content TEXT,
  status TEXT DEFAULT 'draft', -- draft | published | archived
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

-- Eventos analíticos (local)
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT,
  event_name TEXT,
  payload TEXT, -- JSON string
  crm_contact_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (crm_contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);

-- Contactos (CRM local)
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  name TEXT,
  metadata TEXT, -- JSON string con campos adicionales
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Actividades (acciones vinculadas a contactos, p.ej. content_published)
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER,
  type TEXT, -- e.g. content_published, note, call
  title TEXT,
  content_id INTEGER, -- FK a editor_contents.id (opcional)
  snippet TEXT,
  payload TEXT, -- JSON string
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
  FOREIGN KEY (content_id) REFERENCES editor_contents(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_crm_contact_id ON analytics_events(crm_contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
