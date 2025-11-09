// editor/realtime-client.js
// Client wiring for socket.io presence & cursors (used by editor module).
// Include <script src="/socket.io/socket.io.js"></script> or use dynamic import.
// Usage: Realtime.connect({ serverUrl, room, user })
export const Realtime = (function () {
  let socket = null;
  let room = null;
  let handlers = {};

  function connect({ serverUrl = window.location.origin, room: r = 'default', user = { id: null, name: 'anon' } } = {}) {
    if (socket) disconnect();
    // dynamic load socket.io client if not present
    if (!window.io) {
      console.warn('socket.io client not loaded; ensure /socket.io/socket.io.js is served by the server or include CDN.');
    }
    socket = (window.io ? window.io(serverUrl) : null);
    if (!socket) {
      console.warn('Socket.io client is not available.');
      return;
    }
    room = r;
    socket.on('connect', () => {
      socket.emit('join', { room, user });
      console.info('[realtime] connected', socket.id);
    });
    socket.on('cursor:update', payload => { handlers['cursor'] && handlers['cursor'](payload); });
    socket.on('presence:join', payload => { handlers['join'] && handlers['join'](payload); });
    socket.on('presence:leave', payload => { handlers['leave'] && handlers['leave'](payload); });
    socket.on('op', payload => { handlers['op'] && handlers['op'](payload); });
  }

  function sendCursor({ x, y, color = '#4f46e5', meta = {} } = {}) {
    if (!socket || !room) return;
    socket.emit('cursor', { room, x, y, color, meta });
  }
  function sendOp(op) {
    if (!socket || !room) return;
    socket.emit('op', { room, op });
  }
  function on(event, cb) { handlers[event] = cb; }
  function disconnect() {
    if (!socket) return;
    socket.disconnect();
    socket = null;
    room = null;
    handlers = {};
  }

  return { connect, sendCursor, sendOp, on, disconnect };
})();
