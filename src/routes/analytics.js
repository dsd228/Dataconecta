// src/routes/analytics.js
const express = require('express');
const router = express.Router();

router.get('/events', async (req, res) => {
  try {
    const db = req.db;
    const limit = parseInt(req.query.limit || '50', 10);
    const rows = await db.all(`SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT ?`, [limit]);
    res.json({ ok: true, events: rows });
  } catch (err) {
    console.error('analytics.events error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const db = req.db;
    const counts = await db.all(`
      SELECT event_name, COUNT(*) as count
      FROM analytics_events
      GROUP BY event_name
      ORDER BY count DESC
      LIMIT 200
    `);
    res.json({ ok: true, summary: counts });
  } catch (err) {
    console.error('analytics.summary error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
