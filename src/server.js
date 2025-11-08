// src/server.js
// Minimal Express server serving repo root and a small API + health check.
// NOTE: Add this file if src/ currently missing.

const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const createDb = require('./db');

require('dotenv').config();

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Serve repository root as static (so index.html, editor.html, analitica.html work)
app.use(express.static(path.resolve(__dirname, '..')));

// Simple health endpoint
app.get('/_health', (req, res) => res.json({ ok: true }));

// Initialize DB and make it available via req.app.locals.db
(async () => {
  try {
    const db = await createDb();
    app.locals.db = db;

    // Minimal example endpoints (extend as needed)
    app.get('/api/analytics/events', async (req, res) => {
      try {
        const rows = await db.all('SELECT * FROM analytics_events ORDER BY ts DESC LIMIT 200');
        res.json({ ok: true, events: rows });
      } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
      }
    });

    app.post('/api/track', async (req, res) => {
      try {
        const { type, payload } = req.body;
        const ts = Date.now();
        await db.run('INSERT INTO analytics_events (type, payload, ts) VALUES (?, ?, ?)', [type, JSON.stringify(payload || {}), ts]);
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
      }
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`Dataconecta server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize DB', err);
    process.exit(1);
  }
})();
