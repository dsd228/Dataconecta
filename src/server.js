// src/server.js - arranque del servidor y montaje de rutas
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { init } = require('./db');

async function main() {
  const db = await init();
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));

  // inyectar db
  app.use((req, res, next) => {
    req.db = db;
    next();
  });

  // rutas API
  app.use('/api/track', require('./routes/track'));
  app.use('/api/editor', require('./routes/editor'));
  app.use('/api/contacts', require('./routes/contacts'));
  app.use('/api/analytics', require('./routes/analytics'));

  // servir archivos estáticos en raíz (usa los html que ya están en repo)
  const publicRoot = path.join(__dirname, '..');
  app.use(express.static(publicRoot));

  app.get('/_health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  app.listen(PORT, () => {
    console.log(`Dataconecta server listening on http://localhost:${PORT}`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
