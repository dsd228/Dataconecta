// realtime/server/server.js
// Simple Node server that runs:
// - y-websocket server for Yjs docs (CRDT sync)
// - socket.io for presence, cursors and lightweight ops
//
// Usage: node server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { setupWSConnection } = require('y-websocket/bin/utils.js'); // y-websocket util
const WebSocket = require('ws');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// simple health route
app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// socket.io: presence / cursors / chat / lightweight ops
io.on('connection', (socket) => {
  console.info('[socket.io] client connected', socket.id);

  // join room (project)
  socket.on('join', ({ room, user }) => {
    socket.join(room);
    socket.data.user = user || { id: socket.id, name: 'anon' };
    socket.to(room).emit('presence:join', { id: socket.id, user: socket.data.user });
  });

  socket.on('cursor', (payload) => {
    // payload: { room, x, y, color, userId }
    if (payload && payload.room) socket.to(payload.room).emit('cursor:update', { socketId: socket.id, user: socket.data.user, ...payload });
  });

  socket.on('op', (payload) => {
    // lightweight op broadcasting (non-CRDT fallback)
    if (payload && payload.room) socket.to(payload.room).emit('op', { socketId: socket.id, payload });
  });

  socket.on('disconnect', () => {
    console.info('[socket.io] disconnect', socket.id);
    // broadcast leave (rooms cleaned automatically)
    // cannot easily enumerate rooms per socket without tracking; emit global
    io.emit('presence:leave', { id: socket.id });
  });
});

// Yjs websocket server (CRDT). Uses same HTTP server on /yjs
const wss = new WebSocket.Server({ server, path: '/yjs' });
wss.on('connection', (ws, req) => {
  // setupWSConnection handles the Yjs doc sync
  setupWSConnection(ws, req);
});

const PORT = process.env.PORT || 1234;
server.listen(PORT, () => console.log(`Realtime stub server running on http://localhost:${PORT} (socket.io + y-websocket)`));
