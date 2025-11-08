const express = require('express');
const router = express.Router();

// POST /api/contacts  { email, name, metadata }
// GET  /api/contacts?email=...  -> buscar por email
// GET  /api/contacts/:id/activities -> listar actividades

router.post('/', async (req, res) => {
  try {
    const db = req.db;
    const { email, name, metadata } = req.body;
    if (!email) return res.status(400).json({ ok: false, error: 'email required' });

    // Upsert simple: intentar insertar, si falla por unique actualizar
    try {
      const ins = await db.run(
        `INSERT INTO contacts (email, name, metadata) VALUES (?, ?, ?)`,
        [email, name || null, metadata ? JSON.stringify(metadata) : null]
      );
      const id = ins.lastID;
      const contact = await db.get(`SELECT * FROM contacts WHERE id = ?`, [id]);
      return res.json({ ok: true, contact });
    } catch (e) {
      // Si ya existe, actualizar
      await db.run(
        `UPDATE contacts SET name = COALESCE(?, name), metadata = COALESCE(?, metadata), updated_at = datetime('now') WHERE email = ?`,
        [name || null, metadata ? JSON.stringify(metadata) : null, email]
      );
      const contact = await db.get(`SELECT * FROM contacts WHERE email = ?`, [email]);
      return res.json({ ok: true, contact });
    }
  } catch (err) {
    console.error('contacts.post error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const db = req.db;
    const email = req.query.email;
    if (email) {
      const contact = await db.get(`SELECT * FROM contacts WHERE email = ?`, [email]);
      return res.json({ ok: true, contact });
    } else {
      const rows = await db.all(`SELECT * FROM contacts ORDER BY created_at DESC LIMIT 200`);
      return res.json({ ok: true, contacts: rows });
    }
  } catch (err) {
    console.error('contacts.get error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/:id/activities', async (req, res) => {
  try {
    const db = req.db;
    const id = req.params.id;
    const rows = await db.all(`SELECT * FROM activities WHERE contact_id = ? ORDER BY created_at DESC LIMIT 200`, [id]);
    res.json({ ok: true, activities: rows });
  } catch (err) {
    console.error('contacts.activities error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
