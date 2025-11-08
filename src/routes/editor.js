const express = require('express');
const router = express.Router();

// POST /api/editor/save
// body: { title, content, author_email }
// POST /api/editor/publish
// body: { id (optional), title, content, author_email, crm_contact_email (optional), client_id (optional) }

router.post('/save', async (req, res) => {
  try {
    const db = req.db;
    const { title, content, author_email } = req.body;

    const result = await db.run(
      `INSERT INTO editor_contents (title, content, status, author_email) VALUES (?, ?, 'draft', ?)`,
      [title || 'Sin título', content || '', author_email || null]
    );
    const id = result.lastID;

    await db.run(
      `INSERT INTO editor_revisions (content_id, content, author_email) VALUES (?, ?, ?)`,
      [id, content || '', author_email || null]
    );

    res.json({ ok: true, id });
  } catch (err) {
    console.error('editor.save error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/publish', async (req, res) => {
  try {
    const db = req.db;
    const { id, title, content, author_email, crm_contact_email, client_id } = req.body;

    let contentId = id;

    if (contentId) {
      // actualizar registro existente
      await db.run(
        `UPDATE editor_contents SET title = ?, content = ?, status = 'published', author_email = ?, updated_at = datetime('now') WHERE id = ?`,
        [title || 'Sin título', content || '', author_email || null, contentId]
      );
    } else {
      const result = await db.run(
        `INSERT INTO editor_contents (title, content, status, author_email) VALUES (?, ?, 'published', ?)`,
        [title || 'Sin título', content || '', author_email || null]
      );
      contentId = result.lastID;
    }

    // añadir revisión
    await db.run(
      `INSERT INTO editor_revisions (content_id, content, author_email) VALUES (?, ?, ?)`,
      [contentId, content || '', author_email || null]
    );

    // Si nos pasan un email, asegurar que exista el contacto local (crear si no)
    let contactId = null;
    if (crm_contact_email) {
      const existing = await db.get(`SELECT id FROM contacts WHERE email = ?`, [crm_contact_email]);
      if (existing) {
        contactId = existing.id;
      } else {
        const ins = await db.run(
          `INSERT INTO contacts (email, name) VALUES (?, ?)`,
          [crm_contact_email, null]
        );
        contactId = ins.lastID;
      }

      // Crear actividad local vinculada al contacto
      await db.run(
        `INSERT INTO activities (contact_id, type, title, content_id, snippet, payload) VALUES (?, 'content_published', ?, ?, ?, ?)`,
        [contactId, title || null, contentId, (content || '').slice(0, 800), JSON.stringify({ author_email })]
      );
    } else {
      // Si no hay contacto, aún crear actividad global (contact_id NULL)
      await db.run(
        `INSERT INTO activities (contact_id, type, title, content_id, snippet, payload) VALUES (NULL, 'content_published', ?, ?, ?, ?)`,
        [title || null, contentId, (content || '').slice(0, 800), JSON.stringify({ author_email })]
      );
    }

    // Registrar evento analítico local (editor_publish)
    await db.run(
      `INSERT INTO analytics_events (client_id, event_name, payload, crm_contact_id) VALUES (?, 'editor_publish', ?, ?)`,
      [client_id || null, JSON.stringify({ content_id: contentId, title }), contactId]
    );

    res.json({ ok: true, id: contentId });
  } catch (err) {
    console.error('editor.publish error', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
