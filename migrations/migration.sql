-- migrations/migration.sql
-- Basic schema for Dataconecta (run once if you prefer SQL migration)

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
  ts INTEGER
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
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_analytics_ts ON analytics_events(ts);
CREATE INDEX IF NOT EXISTS idx_activities_ts ON activities(ts);
