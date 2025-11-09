// modules/editor.js — Self-contained Editor module (complete).
// Replaces the init implementation: includes resizeCanvasToWrapper, DPR handling, keyboard shortcuts,
// snapping/grid, undo/redo, export PNG/SVG/JSON, realtime (socket.io + Yjs) cursors + CRDT sync.
//
// Exposes window.editorAPI.init(params) and window.editorAPI.destroy()
(function () {
  // --- Config ---
  const CONFIG = {
    fabricCdns: [
      'https://cdn.jsdelivr.net/npm/fabric@4.6.0/dist/fabric.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/4.6.0/fabric.min.js'
    ],
    localFabric: '/modules/vendor/fabric.min.js',
    socketIoCdn: 'https://cdn.socket.io/4.7.2/socket.io.min.js',
    yjsCdn: 'https://unpkg.com/yjs@13.5.50/dist/yjs.js',
    ywebsocketCdn: 'https://unpkg.com/y-websocket@1.4.5/bin/y-websocket.js',
    realtimeDefaultUrl: null,
    snapStep: 10,
    snapTolerance: 6,
    historyLimit: 120,
    yDebounceMs: 200
  };

  // --- Utilities ---
  const $ = (sel, root = document) => root && root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));
  const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);
  const nowIso = () => new Date().toISOString();
  function saveLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn(e); } }
  function loadLS(k, fallback) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : (fallback === undefined ? [] : fallback); } catch (e) { return fallback === undefined ? [] : fallback; } }

  // --- Script loader ---
  function loadScript(src, timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        // wait briefly for initialization
        const start = Date.now();
        (function poll() {
          if ((window.fabric && src.includes('fabric')) || (window.io && src.includes('socket.io')) || (window.Y && src.includes('yjs'))) return resolve();
          if (Date.now() - start > timeout) return reject(new Error('Script present but not initialized: ' + src));
          setTimeout(poll, 80);
        })();
        return;
      }
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  async function ensureFabricAvailable() {
    if (window.fabric) return window.fabric;
    for (const cdn of CONFIG.fabricCdns) {
      try {
        await loadScript(cdn);
        const start = Date.now();
        while (!window.fabric && Date.now() - start < 2000) await new Promise(r => setTimeout(r, 80));
        if (window.fabric) { console.info('Fabric loaded from', cdn); return window.fabric; }
      } catch (e) { console.warn('CDN fail', cdn, e); }
    }
    try {
      await loadScript(CONFIG.localFabric);
      const start = Date.now();
      while (!window.fabric && Date.now() - start < 2000) await new Promise(r => setTimeout(r, 80));
      if (window.fabric) { console.info('Fabric loaded from local fallback'); return window.fabric; }
    } catch (e) { console.warn('local fallback failed', e); }
    throw new Error('Fabric.js could not be loaded');
  }

  // --- Module state ---
  let mounted = false;
  let fabricCanvas = null;
  let overlayCursors = null;
  let overlayCtx = null;
  const state = {
    components: loadLS('editor:components', []),
    history: { undo: loadLS('editor:history:undo', []), redo: loadLS('editor:history:redo', []), limit: CONFIG.historyLimit },
    tokens: loadLS('editor:tokens', { primary: '#4f46e5', font: 'Inter, system-ui' }),
    recordings: loadLS('editor:recordings', []),
    comments: loadLS('editor:comments', []),
    snap: { enabled: false, step: CONFIG.snapStep, tolerance: CONFIG.snapTolerance },
    gridShown: false
  };
  const handlers = []; // DOM handlers for cleanup
  const subs = []; // fabric subscriptions for cleanup
  let realtime = { socket: null, ydoc: null, provider: null, ymap: null, room: null, user: null, serverUrl: null, cursors: {} };
  let yPushTimer = null;
  let applyingRemote = false;
  let __resizeObserver = null;
  let __resizeTimer = null;

  // --- Helpers ---
  function bind(el, ev, fn) { if (!el) return; el.addEventListener(ev, fn); handlers.push({ el, ev, fn }); }
  function unbindAll() { handlers.forEach(h => { try { h.el.removeEventListener(h.ev, h.fn); } catch (e) {} }); handlers.length = 0; }
  function fabricOffAll() { subs.forEach(s => { try { fabricCanvas.off(s.ev, s.fn); } catch (e) {} }); subs.length = 0; }

  function pushHistory() {
    try {
      const snap = fabricCanvas.toJSON(['__objectId', '__componentId', '__isInstance', '__overrides']);
      state.history.undo.push(snap);
      if (state.history.undo.length > state.history.limit) state.history.undo.shift();
      state.history.redo = [];
      saveLS('editor:history:undo', state.history.undo);
      saveLS('editor:history:redo', state.history.redo);
    } catch (e) { console.warn('pushHistory', e); }
  }
  function undo() {
    if (!state.history.undo.length) return;
    try {
      const last = state.history.undo.pop();
      state.history.redo.push(fabricCanvas.toJSON());
      fabricCanvas.loadFromJSON(last, () => { fabricCanvas.renderAll(); saveLS('editor:history:undo', state.history.undo); saveLS('editor:history:redo', state.history.redo); });
    } catch (e) { console.warn('undo', e); }
  }
  function redo() {
    if (!state.history.redo.length) return;
    try {
      const next = state.history.redo.pop();
      state.history.undo.push(fabricCanvas.toJSON());
      fabricCanvas.loadFromJSON(next, () => { fabricCanvas.renderAll(); saveLS('editor:history:undo', state.history.undo); saveLS('editor:history:redo', state.history.redo); });
    } catch (e) { console.warn('redo', e); }
  }

  function snapCoords(x, y) {
    if (!state.snap.enabled) return { x, y };
    const step = state.snap.step;
    const tx = Math.round(x / step) * step;
    const ty = Math.round(y / step) * step;
    if (Math.abs(tx - x) <= state.snap.tolerance) x = tx;
    if (Math.abs(ty - y) <= state.snap.tolerance) y = ty;
    return { x, y };
  }

  // Draw grid on canvas as fabric lines (non-selectable)
  function drawGrid() {
    // remove previous grid lines
    fabricCanvas.getObjects().filter(o => o.__isGridLine).forEach(o => fabricCanvas.remove(o));
    if (!state.gridShown) { fabricCanvas.requestRenderAll(); return; }
    const step = state.snap.step || CONFIG.snapStep;
    const w = fabricCanvas.getWidth(), h = fabricCanvas.getHeight();
    for (let i = 0; i < w; i += step) {
      const line = new fabric.Line([i, 0, i, h], { stroke: '#eee', selectable: false, evented: false });
      line.__isGridLine = true;
      fabricCanvas.add(line);
    }
    for (let j = 0; j < h; j += step) {
      const line = new fabric.Line([0, j, w, j], { stroke: '#eee', selectable: false, evented: false });
      line.__isGridLine = true;
      fabricCanvas.add(line);
    }
    fabricCanvas.sendToBack(...fabricCanvas.getObjects().filter(o => o.__isGridLine));
    fabricCanvas.requestRenderAll();
  }

  // --- Canvas finder / create fallback ---
  function findOrCreateCanvas() {
    const appRoot = document.getElementById('app-root');
    if (appRoot) {
      const c = appRoot.querySelector('#canvas');
      const w = appRoot.querySelector('#canvas-wrap');
      if (c && w) return { canvasEl: c, wrap: w, root: appRoot };
      const any = appRoot.querySelector('canvas');
      if (any) return { canvasEl: any, wrap: any.parentElement || appRoot, root: appRoot };
    }
    const moduleRoot = document.querySelector('.module-editor');
    if (moduleRoot) {
      const c = moduleRoot.querySelector('#canvas');
      const w = moduleRoot.querySelector('#canvas-wrap');
      if (c && w) return { canvasEl: c, wrap: w, root: moduleRoot };
      const any = moduleRoot.querySelector('canvas');
      if (any) return { canvasEl: any, wrap: any.parentElement || moduleRoot, root: moduleRoot };
    }
    const globalCanvas = document.querySelector('#canvas') || document.querySelector('canvas');
    if (globalCanvas) return { canvasEl: globalCanvas, wrap: globalCanvas.parentElement || document.body, root: document.body };
    // create fallback inside appRoot or body
    const host = appRoot || moduleRoot || document.body;
    const wrap = document.createElement('div');
    wrap.id = 'canvas-wrap';
    wrap.style.position = 'relative';
    wrap.style.minHeight = '420px';
    wrap.style.background = '#fff';
    wrap.style.border = '1px solid #e6e6e6';
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'stretch';
    wrap.style.justifyContent = 'center';
    const canvasEl = document.createElement('canvas');
    canvasEl.id = 'canvas';
    canvasEl.width = 1000;
    canvasEl.height = 600;
    wrap.appendChild(canvasEl);
    host.appendChild(wrap);
    return { canvasEl, wrap, root: host };
  }

  // --- Realtime (socket.io + Yjs) ---
  async function setupRealtime({ serverUrl = CONFIG.realtimeDefaultUrl, room = 'default', user = { id: uid('u'), name: 'anon' } } = {}) {
    if (!serverUrl) {
      console.warn('Realtime serverUrl not provided; skipping realtime setup');
      return null;
    }
    realtime.serverUrl = serverUrl;
    realtime.room = room;
    realtime.user = user;

    // load socket.io and Yjs libs dynamically
    if (!window.io) {
      try { await loadScript(CONFIG.socketIoCdn); } catch (e) { console.warn('socket.io client failed to load', e); }
    }
    if (!window.Y) {
      try { await loadScript(CONFIG.yjsCdn); await loadScript(CONFIG.ywebsocketCdn); } catch (e) { console.warn('Yjs or y-websocket failed to load', e); }
    }

    // connect socket.io for presence/cursors
    if (window.io && !realtime.socket) {
      try {
        realtime.socket = window.io(serverUrl);
        realtime.socket.on('connect', () => {
          realtime.socket.emit('join', { room, user });
        });
        realtime.socket.on('cursor:update', handleRemoteCursor);
        realtime.socket.on('presence:join', (p) => console.info('presence join', p));
        realtime.socket.on('presence:leave', (p) => {
          if (p && p.socketId && realtime.cursors[p.socketId]) { delete realtime.cursors[p.socketId]; drawCursors(); }
        });
      } catch (e) { console.warn('socket connect failed', e); }
    }

    // Yjs document sync (using y-websocket)
    if (window.Y) {
      try {
        const Y = window.Y;
        const doc = new Y.Doc();
        const providerCtor = window.WebsocketProvider || (window.yws && window.yws.WebsocketProvider);
        const provider = providerCtor ? new providerCtor(serverUrl.replace(/^http/, 'ws') + '/yjs', room, doc) : null;
        const ymap = doc.getMap('canvas');
        realtime.ydoc = doc; realtime.provider = provider; realtime.ymap = ymap;

        // remote -> local
        ymap.observeDeep(() => {
          const jsonStr = ymap.get('json');
          if (!jsonStr) return;
          if (applyingRemote) return;
          try {
            applyingRemote = true;
            const parsed = JSON.parse(jsonStr);
            fabricCanvas.loadFromJSON(parsed, () => { fabricCanvas.renderAll(); applyingRemote = false; });
          } catch (e) { console.warn('yjs parse error', e); applyingRemote = false; }
        });

        // local -> remote (debounced)
        const pushLocalToY = () => {
          if (applyingRemote) return;
          clearTimeout(yPushTimer);
          yPushTimer = setTimeout(() => {
            try {
              const json = fabricCanvas.toJSON(['__objectId', '__componentId', '__isInstance', '__overrides']);
              realtime.ymap.set('json', JSON.stringify(json));
            } catch (e) { console.warn('y push error', e); }
          }, CONFIG.yDebounceMs);
        };
        fabricCanvas.on('object:added', pushLocalToY);
        fabricCanvas.on('object:modified', pushLocalToY);
        fabricCanvas.on('object:removed', pushLocalToY);
        subs.push({ ev: 'object:added', fn: pushLocalToY }, { ev: 'object:modified', fn: pushLocalToY }, { ev: 'object:removed', fn: pushLocalToY });
      } catch (e) { console.warn('yjs setup failed', e); }
    }

    // overlay for cursors
    function ensureCursorOverlay() {
      if (overlayCursors && overlayCtx) return;
      const wrap = document.getElementById('canvas-wrap') || document.querySelector('.canvas-wrap');
      if (!wrap) return;
      overlayCursors = document.createElement('canvas');
      overlayCursors.id = 'realtime-cursors';
      overlayCursors.className = 'realtime-overlay';
      overlayCursors.style.position = 'absolute';
      overlayCursors.style.left = '0';
      overlayCursors.style.top = '0';
      overlayCursors.style.pointerEvents = 'none';
      overlayCursors.width = wrap.clientWidth;
      overlayCursors.height = wrap.clientHeight;
      overlayCursors.style.width = overlayCursors.width + 'px';
      overlayCursors.style.height = overlayCursors.height + 'px';
      wrap.appendChild(overlayCursors);
      overlayCtx = overlayCursors.getContext('2d');
      window.addEventListener('resize', () => {
        const r = wrap.getBoundingClientRect();
        overlayCursors.width = r.width;
        overlayCursors.height = r.height;
      });
    }

    function handleRemoteCursor(payload) {
      if (!payload || !payload.socketId) return;
      realtime.cursors[payload.socketId] = payload;
      drawCursors();
      setTimeout(() => {
        if (realtime.cursors[payload.socketId] && (Date.now() - (payload.ts || Date.now())) > 5000) {
          delete realtime.cursors[payload.socketId];
          drawCursors();
        }
      }, 7000);
    }

    function drawCursors() {
      ensureCursorOverlay();
      if (!overlayCtx || !overlayCursors) return;
      overlayCtx.clearRect(0, 0, overlayCursors.width, overlayCursors.height);
      Object.keys(realtime.cursors).forEach(k => {
        const c = realtime.cursors[k];
        if (!c) return;
        const x = c.x || 0, y = c.y || 0;
        overlayCtx.beginPath();
        overlayCtx.fillStyle = c.color || 'rgba(79,70,229,0.9)';
        overlayCtx.strokeStyle = '#fff';
        overlayCtx.lineWidth = 2;
        overlayCtx.arc(x, y, 6, 0, Math.PI * 2);
        overlayCtx.fill();
        overlayCtx.stroke();
        overlayCtx.fillStyle = '#fff';
        overlayCtx.font = '11px Inter, Arial';
        overlayCtx.fillText(c.user?.name || 'anon', (x + 8), (y + 4));
      });
    }

    // local pointer broadcast
    const wrap = document.getElementById('canvas-wrap') || document.querySelector('.canvas-wrap');
    if (wrap) {
      const onMove = (e) => {
        const r = wrap.getBoundingClientRect();
        const x = Math.round(e.clientX - r.left), y = Math.round(e.clientY - r.top);
        if (realtime.socket) realtime.socket.emit('cursor', { room, x, y, user, ts: Date.now() });
      };
      wrap.addEventListener('mousemove', onMove);
      handlers.push({ el: wrap, ev: 'mousemove', fn: onMove });
    }

    return { socket: realtime.socket, ydoc: realtime.ydoc, provider: realtime.provider };
  }

  // --- Export helpers ---
  function exportPNG(filename = 'canvas.png', multiplier = 2) {
    const data = fabricCanvas.toDataURL({ format: 'png', multiplier });
    const a = document.createElement('a'); a.href = data; a.download = filename;
    document.body.appendChild(a); a.click(); setTimeout(() => { a.remove(); URL.revokeObjectURL(data); }, 500);
  }
  function exportSVG(filename = 'canvas.svg') {
    try {
      const svg = fabricCanvas.toSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
    } catch (e) { console.warn('exportSVG failed', e); }
  }
  function exportJSON(filename = 'canvas.json') {
    const json = JSON.stringify(fabricCanvas.toJSON());
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  }

  // --- Component & UI render helpers (kept local) ---
  function createComponentFromSelection(name) {
    const sel = fabricCanvas.getActiveObject();
    if (!sel) return null;
    let json;
    if (sel.type === 'activeSelection') json = { objects: sel.getObjects().map(o => o.toObject(['__objectId','__componentId','__isInstance'])) };
    else json = { objects: [ sel.toObject(['__objectId','__componentId','__isInstance']) ] };
    const id = uid('comp');
    state.components.unshift({ id, name: name || 'Component', json });
    saveLS('editor:components', state.components);
    renderComponentsList();
    return id;
  }
  function insertComponentInstance(componentId, opts = {}) {
    const comp = state.components.find(c => c.id === componentId);
    if (!comp) return null;
    fabric.util.enlivenObjects(comp.json.objects || [], (enlivened) => {
      const group = new fabric.Group(enlivened, { left: opts.left || 120, top: opts.top || 120 });
      group.__componentId = componentId; group.__isInstance = true; group.__objectId = uid('o');
      fabricCanvas.add(group); fabricCanvas.setActiveObject(group); pushHistory();
    }, '');
  }

  function renderLayers() {
    const container = document.getElementById('layers-list') || document.querySelector('.module-editor')?.querySelector('#layers-list');
    if (!container) return;
    container.innerHTML = '';
    fabricCanvas.getObjects().slice().reverse().forEach(obj => {
      const el = document.createElement('div'); el.className = 'component-card';
      el.textContent = (obj.type || 'object') + (obj.__objectId ? ' • ' + obj.__objectId : '');
      el.addEventListener('click', () => { fabricCanvas.setActiveObject(obj); fabricCanvas.requestRenderAll(); });
      container.appendChild(el);
    });
  }

  function renderComponentsList() {
    const out = document.getElementById('components-list') || document.querySelector('.module-editor')?.querySelector('#components-list');
    if (!out) return;
    out.innerHTML = (state.components || []).map(c => `<div class="component-card"><div>${c.name}</div><div><button data-id="${c.id}" class="btn small comp-insert">Insert</button></div></div>`).join('') || '<div class="muted">Sin componentes</div>';
    qsa('.comp-insert', out).forEach(btn => {
      try { btn.removeEventListener('click', btn._h); } catch (e) {}
      const h = () => insertComponentInstance(btn.dataset.id, { left: 120, top: 120 });
      btn._h = h; btn.addEventListener('click', h);
    });
  }

  function renderRecordingsList() {
    const out = document.getElementById('recordings-list') || document.querySelector('.module-editor')?.querySelector('#recordings-list');
    if (!out) return;
    const recs = loadLS('editor:recordings', state.recordings || []);
    out.innerHTML = recs.map(r => `<div class="component-card"><div>${r.name}</div><div class="muted">${new Date(r.createdAt).toLocaleString()}</div><div><button data-id="${r.id}" class="btn small rec-heat">Heat</button></div></div>`).join('') || '<div class="muted">Sin recordings</div>';
    qsa('.rec-heat', out).forEach(btn => {
      try { btn.removeEventListener('click', btn._h); } catch (e) {}
      const h = () => generateHeatmap(btn.dataset.id);
      btn._h = h; btn.addEventListener('click', h);
    });
  }

  function renderComments() {
    const out = document.querySelector('.module-editor')?.querySelector('#comments-list') || document.getElementById('comments-list');
    if (!out) return;
    state.comments = loadLS('editor:comments', state.comments || []);
    out.innerHTML = state.comments.map(c => `<div class="component-card"><div><strong>${c.author}</strong> <small class="muted">${new Date(c.ts).toLocaleString()}</small></div><div>${c.text}</div></div>`).join('') || '<div class="muted">Sin comentarios</div>';
  }

  // --- Show properties panel ---
  function showProperties(obj) {
    const panel = document.getElementById('properties-panel');
    if (!panel || !obj) return;
    const fill = (obj && (obj.fill && typeof obj.fill === 'string')) ? obj.fill : '#ffffff';
    const opacity = (obj && (typeof obj.opacity === 'number')) ? obj.opacity : 1;
    panel.innerHTML = `
      <p><strong>Tipo:</strong> ${obj.type || 'object'}</p>
      <p><strong>Color:</strong> <input type="color" id="prop-color" value="${fill}"></p>
      <p><strong>Opacidad:</strong> <input type="range" id="prop-opacity" min="0" max="1" step="0.01" value="${opacity}"></p>
      <p><strong>X:</strong> <input type="number" id="prop-left" value="${Math.round(obj.left || 0)}"></p>
      <p><strong>Y:</strong> <input type="number" id="prop-top" value="${Math.round(obj.top || 0)}"></p>
    `;
    const colorInput = panel.querySelector('#prop-color');
    const opacityInput = panel.querySelector('#prop-opacity');
    const leftInput = panel.querySelector('#prop-left');
    const topInput = panel.querySelector('#prop-top');
    if (colorInput) bind(colorInput, 'input', (e) => { try { obj.set('fill', e.target.value); fabricCanvas.requestRenderAll(); } catch (err) { console.warn(err); } });
    if (opacityInput) bind(opacityInput, 'input', (e) => { try { obj.set('opacity', parseFloat(e.target.value)); fabricCanvas.requestRenderAll(); } catch (err) { console.warn(err); } });
    if (leftInput) bind(leftInput, 'change', (e) => { try { obj.set('left', parseFloat(e.target.value)); obj.setCoords(); fabricCanvas.requestRenderAll(); } catch (err) { console.warn(err); } });
    if (topInput) bind(topInput, 'change', (e) => { try { obj.set('top', parseFloat(e.target.value)); obj.setCoords(); fabricCanvas.requestRenderAll(); } catch (err) { console.warn(err); } });
  }

  // --- Resize logic (critical to fix narrow canvas) ---
  function resizeCanvasToWrapper() {
    try {
      const wrap = document.getElementById('canvas-wrap') || document.querySelector('.canvas-wrap');
      if (!wrap || !fabricCanvas) return;

      const rect = wrap.getBoundingClientRect();
      const cssWidth = Math.max(320, Math.floor(rect.width));
      const cssHeight = Math.max(240, Math.floor(rect.height));
      const dpr = window.devicePixelRatio || 1;

      const canvasEl = fabricCanvas.lowerCanvasEl || fabricCanvas.upperCanvasEl || fabricCanvas.getElement && fabricCanvas.getElement();
      if (!canvasEl) return;

      // Style to fill wrapper
      canvasEl.style.width = cssWidth + 'px';
      canvasEl.style.height = cssHeight + 'px';

      // Backing store size
      canvasEl.width = Math.round(cssWidth * dpr);
      canvasEl.height = Math.round(cssHeight * dpr);

      // Fabric dimensions (use logical CSS size but account for DPR)
      fabricCanvas.setWidth(cssWidth * dpr);
      fabricCanvas.setHeight(cssHeight * dpr);

      // Keep visual scale at 1 (scale drawing to DPR)
      fabricCanvas.setZoom(1 * dpr);

      // Update overlay canvases
      const heat = wrap.querySelector('.heatmap-overlay') || document.getElementById('ed-heatmap-overlay');
      if (heat) {
        heat.style.width = cssWidth + 'px';
        heat.style.height = cssHeight + 'px';
        heat.width = Math.round(cssWidth * dpr);
        heat.height = Math.round(cssHeight * dpr);
      }
      const rc = wrap.querySelector('#realtime-cursors') || document.getElementById('realtime-cursors');
      if (rc) {
        rc.style.width = cssWidth + 'px';
        rc.style.height = cssHeight + 'px';
        rc.width = Math.round(cssWidth * dpr);
        rc.height = Math.round(cssHeight * dpr);
      }

      fabricCanvas.requestRenderAll();
    } catch (e) {
      console.warn('resizeCanvasToWrapper error', e);
    }
  }

  function scheduleResize() {
    clearTimeout(__resizeTimer);
    __resizeTimer = setTimeout(() => { resizeCanvasToWrapper(); }, 80);
  }

  // --- Wire UI and features ---
  function wireModuleUI() {
    // Tools click: set active class and current tool
    qsa('.tool').forEach(btn => {
      bind(btn, 'click', () => {
        const tools = qsa('.tool');
        tools.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const t = btn.dataset.tool || 'select';
        fabricCanvas._currentTool = t;
      });
    });

    // Undo/Redo
    bind($('#undo'), 'click', () => undo());
    bind($('#redo'), 'click', () => redo());

    // Grid / Snap toggle
    bind($('#toggle-grid'), 'click', () => {
      state.gridShown = !state.gridShown;
      state.snap.enabled = state.gridShown;
      drawGrid();
    });

    // Export buttons
    bind($('#export-png'), 'click', () => exportPNG());
    bind($('#export-svg'), 'click', () => exportSVG());
    bind($('#export-json'), 'click', () => exportJSON());

    // Save project
    bind($('#ed-btn-save'), 'click', () => {
      const json = fabricCanvas.toJSON(['__objectId', '__componentId', '__isInstance', '__overrides']);
      const name = prompt('Nombre del proyecto') || ('project_' + Date.now());
      saveLS('editor:project:' + name, { json, meta: { savedAt: nowIso() } });
      alert('Guardado local: ' + name);
    });

    // Keyboard shortcuts
    const keyHandler = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
      const key = e.key.toLowerCase();
      const meta = e.ctrlKey || e.metaKey;
      if (meta && key === 'z') { e.preventDefault(); undo(); return; }
      if (meta && (key === 'y' || (e.shiftKey && key === 'z'))) { e.preventDefault(); redo(); return; }
      switch (key) {
        case 'r': selectTool('rect'); break;
        case 'c': selectTool('circle'); break;
        case 't': selectTool('text'); break;
        case 'i': selectTool('image'); break;
        case 'v': selectTool('select'); break;
        case 'g':
          state.gridShown = !state.gridShown; state.snap.enabled = state.gridShown; drawGrid(); break;
      }
    };
    bind(document, 'keydown', keyHandler);

    // Object moving with snapping
    const onObjectMoving = (opt) => {
      const obj = opt.target;
      if (!obj) return;
      if (state.snap.enabled) {
        const snapped = snapCoords(obj.left, obj.top);
        obj.set({ left: snapped.x, top: snapped.y });
        obj.setCoords();
      }
    };
    fabricCanvas.on('object:moving', onObjectMoving); subs.push({ ev: 'object:moving', fn: onObjectMoving });

    // Push history on changes
    const onChangePush = () => pushHistory();
    fabricCanvas.on('object:added', onChangePush); fabricCanvas.on('object:modified', onChangePush); fabricCanvas.on('object:removed', onChangePush);
    subs.push({ ev: 'object:added', fn: onChangePush }, { ev: 'object:modified', fn: onChangePush }, { ev: 'object:removed', fn: onChangePush });

    // Selection -> properties
    const showPropsSafe = (e) => {
      const target = (e && e.selected && e.selected[0]) || (e && e.target) || (fabricCanvas.getActiveObject && fabricCanvas.getActiveObject());
      if (target) showProperties(target);
    };
    fabricCanvas.on('selection:created', showPropsSafe); fabricCanvas.on('selection:updated', showPropsSafe);
    fabricCanvas.on('selection:cleared', () => {
      const panel = document.getElementById('properties-panel');
      if (panel) panel.innerHTML = 'Selecciona un elemento';
    });
    subs.push({ ev: 'selection:created', fn: showPropsSafe }, { ev: 'selection:updated', fn: showPropsSafe }, { ev: 'selection:cleared', fn: () => { const panel = document.getElementById('properties-panel'); if (panel) panel.innerHTML = 'Selecciona un elemento'; } });

    // Mouse down -> create shapes depending on tool (only when clicking empty area)
    const onMouseDown = (opt) => {
      try {
        if (opt.target) return; // do not create if clicking an existing object
        const pointer = fabricCanvas.getPointer(opt.e);
        const tool = fabricCanvas._currentTool || 'select';
        if (tool === 'rect') {
          const rect = new fabric.Rect({ left: pointer.x, top: pointer.y, width: 100, height: 60, fill: state.tokens.primary, opacity: 0.9, originX: 'left', originY: 'top' });
          fabricCanvas.add(rect); fabricCanvas.setActiveObject(rect); pushHistory();
        } else if (tool === 'circle') {
          const circ = new fabric.Circle({ left: pointer.x, top: pointer.y, radius: 40, fill: '#10b981', opacity: 0.9, originX: 'center', originY: 'center' });
          fabricCanvas.add(circ); fabricCanvas.setActiveObject(circ); pushHistory();
        } else if (tool === 'text') {
          const t = new fabric.IText('Texto', { left: pointer.x, top: pointer.y, fontFamily: state.tokens.font, fill: '#111', originX: 'left', originY: 'top' });
          fabricCanvas.add(t); fabricCanvas.setActiveObject(t); pushHistory();
        } else if (tool === 'image') {
          const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
          input.onchange = (e) => {
            const file = e.target.files && e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (f) => {
              fabric.Image.fromURL(f.target.result, (img) => {
                img.scaleToWidth(200); img.set({ left: pointer.x, top: pointer.y, originX: 'left', originY: 'top' }); fabricCanvas.add(img); fabricCanvas.setActiveObject(img); pushHistory();
              }, { crossOrigin: 'anonymous' });
            };
            reader.readAsDataURL(file);
          };
          input.click();
        }
      } catch (e) { console.warn('onMouseDown create error', e); }
    };
    fabricCanvas.on('mouse:down', onMouseDown); subs.push({ ev: 'mouse:down', fn: onMouseDown });

    // Realtime connect control (if UI element present)
    bind($('#realtime-connect'), 'click', async () => {
      const url = prompt('Realtime server URL', CONFIG.realtimeDefaultUrl || '');
      if (!url) return alert('server URL required');
      await setupRealtime({ serverUrl: url, room: prompt('Room id', 'default'), user: { id: uid('u'), name: prompt('Your name', 'anon') } });
      alert('Realtime connected (attempted)');
    });
  }

  // --- Init and Resize integration (this is the replaced init block) ---
  async function initEditor(params = {}) {
    if (mounted) return true;
    await ensureFabricAvailable();

    // find or create canvas and wrapper
    const { canvasEl, wrap } = findOrCreateCanvas();
    if (!canvasEl) throw new Error('Editor canvas not found or created');
    if (!canvasEl.id) canvasEl.id = uid('canvas');

    // instantiate fabric canvas
    fabricCanvas = new fabric.Canvas(canvasEl.id, { selection: true, preserveObjectStacking: true, backgroundColor: '#ffffff' });

    // ensure overlay heatmap sizing if present
    const heat = wrap.querySelector('.heatmap-overlay') || wrap.querySelector('#ed-heatmap-overlay');
    if (heat) { heat.width = wrap.clientWidth; heat.height = wrap.clientHeight; }

    // Wire UI
    wireModuleUI();

    // Resize: ensure canvas fills wrapper; use DPR for crispness
    resizeCanvasToWrapper();
    window.addEventListener('resize', scheduleResize);

    // Use ResizeObserver for wrapper size changes if available
    if (wrap && typeof ResizeObserver !== 'undefined') {
      __resizeObserver = new ResizeObserver(() => scheduleResize());
      __resizeObserver.observe(wrap);
    }

    // initial render state
    drawGrid();
    renderComponentsList();
    renderRecordingsList();
    renderComments();

    // expose API functions (idempotent)
    window.editorAPI = Object.assign(window.editorAPI || {}, {
      init: initEditor,
      destroy: destroyEditor,
      createComponentFromSelection,
      insertComponentInstance,
      exportPNG,
      exportSVG,
      exportJSON,
      setupRealtime,
      state
    });

    mounted = true;
    return true;
  }

  // --- Destroy ---
  function destroyEditor() {
    if (!mounted) return;
    try {
      unbindAll();
      fabricOffAll();
      if (realtime.socket) { try { realtime.socket.disconnect(); } catch (e) {} }
      if (realtime.provider && realtime.provider.disconnect) try { realtime.provider.disconnect(); } catch (e) {}
      if (fabricCanvas && fabricCanvas.dispose) fabricCanvas.dispose();
      fabricCanvas = null;
      if (__resizeObserver) { try { __resizeObserver.disconnect(); } catch (e) {} __resizeObserver = null; }
      window.removeEventListener('resize', scheduleResize);
    } catch (e) { console.warn(e); }
    mounted = false;
  }

  // --- Utilities exposed/debugging ---
  window.editorAPI = Object.assign(window.editorAPI || {}, {
    init: initEditor,
    destroy: destroyEditor,
    createComponentFromSelection,
    insertComponentInstance,
    exportPNG,
    exportSVG,
    exportJSON,
    setupRealtime,
    state
  });

  // Auto-init in standalone contexts
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
      const isStandalone = !!document.querySelector('.editor-shell') || !!document.querySelector('.editor-main') || !!document.querySelector('.module-editor');
      if (isStandalone) initEditor().catch(e => console.warn('editor init failed', e));
    }, 50);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      const isStandalone = !!document.querySelector('.editor-shell') || !!document.querySelector('.editor-main') || !!document.querySelector('.module-editor');
      if (isStandalone) initEditor().catch(e => console.warn('editor init failed', e));
    });
  }

  // --- Expose some helpers for debugging -->
  window.__editor_internal = { state, getCanvas: () => fabricCanvas, realtime };
})();
