// src/routes/track.js
const express = require('express');
const router = express.Router();

// POST /api/track
// { client_id, event_name, params, crm_contact_email (opcional) }
router.post('/', async (req, res) => {
  try {
    const db = req.db;
    const { client_id, event_name, params = {}, crm_contact_email } = req.body;

    let crm_contact_id = null;
    if (crm_contact_email) {
      const contact = await db.get(`SELECT id FROM contacts WHERE email = ?`, [crm_contact_email]);
      if (contact) crm_contact_id = contact.id;
    }

    await db.run(
      `INSERT INTO analytics_events (client_id, event_name, payload, crm_contact_id) VALUES (?, ?, ?, ?)`,
      [client_id || null, event_name, JSON.stringify(params || {}), crm_contact_id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('track error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
