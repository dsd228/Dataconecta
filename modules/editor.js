// modules/editor.js — Self-contained Editor module (all logic in one file)
// Exposes window.editorAPI.init(params) and window.editorAPI.destroy()
(function () {
  // --- Config ---
  const CONFIG = {
    fabricCdns: [
      'https://cdn.jsdelivr.net/npm/fabric@4.6.0/dist/fabric.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/4.6.0/fabric.min.js'
    ],
    localFabric: '/modules/vendor/fabric.min.js',
    realtimeDefault: null // e.g. "https://realtime.dataconecta.me"
  };

  // --- Small utilities ---
  const $ = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));
  const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);
  const nowIso = () => new Date().toISOString();
  function saveLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn(e); } }
  function loadLS(k, fallback) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : (fallback === undefined ? [] : fallback); } catch (e) { return fallback === undefined ? [] : fallback; } }

  // --- Script loader for Fabric.js ---
  function loadScript(src, timeout = 8000) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        // wait briefly for initialization
        const start = Date.now();
        (function poll() { if (window.fabric) return resolve(); if (Date.now() - start > 3000) return reject(new Error('Script present but not initialized: ' + src)); setTimeout(poll, 80); })();
        return;
      }
      const s = document.createElement('script');
      s.src = src; s.async = true;
      let done = false;
      s.onload = () => { if (!done) { done = true; resolve(); } };
      s.onerror = () => { if (!done) { done = true; reject(new Error('Failed to load ' + src)); } };
      document.head.appendChild(s);
      setTimeout(() => { if (!done) { done = true; reject(new Error('Timeout loading ' + src)); } }, timeout);
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
      } catch (e) { console.warn('CDN failed', cdn, e); }
    }
    // local fallback
    try {
      await loadScript(CONFIG.localFabric);
      const start = Date.now();
      while (!window.fabric && Date.now() - start < 2000) await new Promise(r => setTimeout(r, 80));
      if (window.fabric) { console.info('Fabric loaded from local fallback'); return window.fabric; }
    } catch (e) { console.warn('Local fallback failed', e); }
    throw new Error('Fabric.js could not be loaded');
  }

  // --- Module state (single-file) ---
  let mounted = false;
  let fabricCanvas = null;
  const state = {
    components: loadLS('editor:components', []),
    history: { undo: [], redo: [], limit: 80 },
    tokens: loadLS('editor:tokens', { primary: '#4f46e5', font: 'Inter, system-ui' }),
    recordings: loadLS('editor:recordings', []),
    comments: loadLS('editor:comments', [])
  };
  const handlers = []; // for DOM event cleanup
  let recSession = null;

  // --- Helper: bind/unbind ---
  function bind(el, ev, fn) { if (!el) return; el.addEventListener(ev, fn); handlers.push({ el, ev, fn }); }
  function unbindAll() { handlers.forEach(h => { try { h.el.removeEventListener(h.ev, h.fn); } catch (e) {} }); handlers.length = 0; }

  // --- Canvas finder / create fallback if missing ---
  function findOrCreateCanvas() {
    const appRoot = document.getElementById('app-root');
    // prefer inside module injected
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
    // global canvas
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
    const canvasEl = document.createElement('canvas');
    canvasEl.id = 'canvas';
    canvasEl.width = 1000;
    canvasEl.height = 600;
    wrap.appendChild(canvasEl);
    host.appendChild(wrap);
    console.warn('Fallback canvas created inside', host === document.body ? 'document.body' : (host.id || host.className));
    return { canvasEl, wrap, root: host };
  }

  // --- History: push / undo / redo ---
  function pushHistory() {
    try {
      const snap = fabricCanvas.toJSON(['__objectId', '__componentId', '__isInstance', '__overrides']);
      state.history.undo.push(snap);
      if (state.history.undo.length > state.history.limit) state.history.undo.shift();
      state.history.redo = [];
      saveLS('editor:state', state.history);
    } catch (e) { console.warn('pushHistory', e); }
  }
  function undo() {
    if (!state.history.undo.length) return;
    try {
      const last = state.history.undo.pop();
      state.history.redo = state.history.redo || [];
      state.history.redo.push(fabricCanvas.toJSON());
      fabricCanvas.loadFromJSON(last, () => fabricCanvas.renderAll());
    } catch (e) { console.warn('undo', e); }
  }
  function redo() {
    if (!state.history.redo.length) return;
    try {
      const next = state.history.redo.pop();
      state.history.undo.push(fabricCanvas.toJSON());
      fabricCanvas.loadFromJSON(next, () => fabricCanvas.renderAll());
    } catch (e) { console.warn('redo', e); }
  }

  // --- Components system (defined early so UI can call synchronously) ---
  function createComponentFromSelection(name) {
    const sel = fabricCanvas.getActiveObject();
    if (!sel) return null;
    let json;
    if (sel.type === 'activeSelection') {
      json = { objects: sel.getObjects().map(o => o.toObject(['__objectId', '__componentId', '__isInstance'])) };
    } else {
      json = { objects: [sel.toObject(['__objectId', '__componentId', '__isInstance'])] };
    }
    const id = uid('comp');
    state.components.unshift({ id, name: name || 'Component', json });
    saveLS('editor:components', state.components);
    renderComponentsList();
    return id;
  }

  function insertComponentInstance(componentId, opts = {}) {
    const comp = (state.components || []).find(c => c.id === componentId);
    if (!comp) return null;
    fabric.util.enlivenObjects(comp.json.objects || [], (enlivened) => {
      const g = new fabric.Group(enlivened, { left: opts.left || 120, top: opts.top || 120 });
      g.__componentId = componentId;
      g.__isInstance = true;
      g.__objectId = uid('o');
      fabricCanvas.add(g);
      fabricCanvas.setActiveObject(g);
      pushHistory();
    }, '');
  }

  // Expose these early so UI wiring can call them (avoids ReferenceError)
  window.editorAPI = window.editorAPI || {};
  window.editorAPI.createComponentFromSelection = createComponentFromSelection;
  window.editorAPI.insertComponentInstance = insertComponentInstance;

  // --- Comments (local) ---
  function renderComments() {
    const out = document.querySelector('.module-editor')?.querySelector('#comments-list') || document.getElementById('comments-list');
    if (!out) return;
    state.comments = loadLS('editor:comments', state.comments || []);
    out.innerHTML = state.comments.map(c => `<div class="component-card"><div><strong>${c.author}</strong> <small class="muted">${new Date(c.ts).toLocaleString()}</small></div><div>${c.text}</div></div>`).join('') || '<div class="muted">Sin comentarios</div>';
  }
  window.editorAPI.renderComments = renderComments;

  // --- Recordings & Heatmaps ---
  function startRecording() {
    if (recSession) return;
    const wrap = document.getElementById('canvas-wrap') || document.querySelector('.canvas-wrap');
    if (!wrap) return;
    const buffer = [];
    const onPointer = (e) => {
      const r = wrap.getBoundingClientRect();
      buffer.push({ type: e.type, x: e.clientX - r.left, y: e.clientY - r.top, ts: Date.now() });
      if (buffer.length > 20000) buffer.shift();
    };
    wrap.addEventListener('mousemove', onPointer);
    wrap.addEventListener('click', onPointer);
    recSession = { buffer, onPointer, wrap };
    return true;
  }
  function stopRecording(name) {
    if (!recSession) return null;
    const { buffer, onPointer, wrap } = recSession;
    try { wrap.removeEventListener('mousemove', onPointer); wrap.removeEventListener('click', onPointer); } catch (e) {}
    const recs = loadLS('editor:recordings', []);
    const rec = { id: uid('rec'), name: name || ('rec_' + Date.now()), createdAt: nowIso(), events: buffer.slice() };
    recs.unshift(rec); saveLS('editor:recordings', recs); state.recordings = recs;
    recSession = null;
    renderRecordingsList();
    return rec;
  }
  function renderRecordingsList() {
    const out = document.querySelector('.module-editor')?.querySelector('#recordings-list') || document.getElementById('recordings-list');
    if (!out) return;
    const recs = loadLS('editor:recordings', state.recordings || []);
    out.innerHTML = recs.map(r => `<div class="component-card"><div>${r.name}</div><div class="muted">${new Date(r.createdAt).toLocaleString()}</div><div><button data-id="${r.id}" class="btn small rec-heat">Heat</button></div></div>`).join('') || '<div class="muted">Sin recordings</div>';
    qsa('.rec-heat', out).forEach(btn => btn.removeEventListener('click', btn._h), btn._h = (() => {
      const h = (e) => generateHeatmap(btn.dataset.id);
      btn.addEventListener('click', h); btn._h = h;
    })());
  }
  function generateHeatmap(recId) {
    const recs = loadLS('editor:recordings', []);
    const rec = recs.find(r => r.id === recId) || recs[0];
    if (!rec) return alert('No recordings');
    const clicks = rec.events.filter(e => e.type === 'click' || e.type === 'mousedown');
    const overlay = document.getElementById('ed-heatmap-overlay') || document.querySelector('.heatmap-overlay');
    if (!overlay) return;
    overlay.width = overlay.clientWidth || overlay.width;
    overlay.height = overlay.clientHeight || overlay.height;
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    clicks.forEach(c => {
      const grd = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 40);
      grd.addColorStop(0, 'rgba(255,0,0,0.18)'); grd.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = grd; ctx.fillRect(c.x - 40, c.y - 40, 80, 80);
    });
  }

  // --- Background removal (heuristic flood fill) ---
  async function removeBackgroundActiveImage(tolerance = 32) {
    const active = fabricCanvas.getActiveObject();
    if (!active || active.type !== 'image') { alert('Selecciona una imagen'); return; }
    let imgEl = active._element;
    if (!imgEl) {
      const url = active.toDataURL();
      imgEl = await new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = rej; im.src = url; });
    }
    const tmp = document.createElement('canvas');
    tmp.width = imgEl.naturalWidth || imgEl.width;
    tmp.height = imgEl.naturalHeight || imgEl.height;
    const ctx = tmp.getContext('2d'); ctx.drawImage(imgEl, 0, 0);
    const imageData = ctx.getImageData(0, 0, tmp.width, tmp.height);
    const w = imageData.width, h = imageData.height, data = imageData.data;
    const visited = new Uint8Array(w * h);
    const queue = [];
    function push(i) { if (!visited[i]) { visited[i] = 1; queue.push(i); } }
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + (w - 1)); }
    const baseOff = 0, baseR = data[baseOff], baseG = data[baseOff + 1], baseB = data[baseOff + 2];
    while (queue.length) {
      const idx = queue.shift();
      const px = idx % w, py = Math.floor(idx / w), off = idx * 4;
      const r = data[off], g = data[off + 1], b = data[off + 2];
      if (Math.abs(r - baseR) <= tolerance && Math.abs(g - baseG) <= tolerance && Math.abs(b - baseB) <= tolerance) {
        data[off + 3] = 0;
        if (px > 0) push(idx - 1);
        if (px < w - 1) push(idx + 1);
        if (py > 0) push(idx - w);
        if (py < h - 1) push(idx + w);
      }
    }
    ctx.putImageData(imageData, 0, 0);
    const outUrl = tmp.toDataURL('image/png');
    fabric.Image.fromURL(outUrl, newImg => {
      newImg.set({ left: active.left, top: active.top, scaleX: active.scaleX, scaleY: active.scaleY });
      fabricCanvas.remove(active);
      fabricCanvas.add(newImg);
      fabricCanvas.setActiveObject(newImg);
      pushHistory();
      alert('Fondo eliminado (resultado aproximado)');
    }, { crossOrigin: 'anonymous' });
  }
  window.editorAPI.removeBackgroundActiveImage = removeBackgroundActiveImage;

  // --- Render helpers for Layers/Components ---
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
      // remove existing to avoid double binds
      try { btn.removeEventListener('click', btn._h); } catch (e) {}
      const h = () => insertComponentInstance(btn.dataset.id, { left: 120, top: 120 });
      btn._h = h;
      btn.addEventListener('click', h);
    });
  }

  // --- UI wiring: all event handlers use functions already defined above ---
  function wireModuleUI() {
    // basic primitives
    bind($('#btn-add-rect'), 'click', () => {
      const r = new fabric.Rect({ left: 60, top: 40, width: 160, height: 100, fill: state.tokens.primary });
      r.__objectId = uid('o');
      fabricCanvas.add(r).setActiveObject(r);
      pushHistory();
    });
    bind($('#btn-add-text'), 'click', () => {
      const t = new fabric.Textbox('Texto', { left: 80, top: 160, width: 240, fontSize: 18, fill: '#111' });
      t.__objectId = uid('o');
      fabricCanvas.add(t).setActiveObject(t);
      pushHistory();
    });

    // image upload
    const imgIn = $('#editor-image-input');
    bind($('#btn-upload-image'), 'click', () => imgIn && imgIn.click());
    bind(imgIn, 'change', (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const addImgFromUrl = (url) => {
        fabric.Image.fromURL(url, img => { img.__objectId = uid('o'); img.set({ left: 120, top: 120 }); fabricCanvas.add(img).setActiveObject(img); pushHistory(); }, { crossOrigin: 'anonymous' });
      };
      if (window.createImageBitmap) {
        createImageBitmap(f).then(bitmap => {
          const tmp = document.createElement('canvas'); tmp.width = bitmap.width; tmp.height = bitmap.height; tmp.getContext('2d').drawImage(bitmap, 0, 0);
          addImgFromUrl(tmp.toDataURL('image/png'));
        }).catch(() => { addImgFromUrl(URL.createObjectURL(f)); });
      } else addImgFromUrl(URL.createObjectURL(f));
      e.target.value = '';
    });

    bind($('#ed-zoom'), 'input', (e) => { const z = parseFloat(e.target.value); fabricCanvas.setZoom(z); fabricCanvas.requestRenderAll(); });
    bind($('#ed-undo'), 'click', undo);
    bind($('#ed-redo'), 'click', redo);

    bind($('#ed-toggle-grid'), 'click', () => {
      const existing = fabricCanvas.getObjects().filter(o => o.__isGridLine);
      if (existing.length) { existing.forEach(l => fabricCanvas.remove(l)); fabricCanvas.requestRenderAll(); return; }
      const step = 20;
      for (let i = 0; i < fabricCanvas.getWidth(); i += step) { const line = new fabric.Line([i, 0, i, fabricCanvas.getHeight()], { stroke: '#eee', selectable: false, evented: false }); line.__isGridLine = true; fabricCanvas.add(line); }
      for (let j = 0; j < fabricCanvas.getHeight(); j += step) { const line = new fabric.Line([0, j, fabricCanvas.getWidth(), j], { stroke: '#eee', selectable: false, evented: false }); line.__isGridLine = true; fabricCanvas.add(line); }
      fabricCanvas.requestRenderAll();
    });

    bind($('#ed-tool-component'), 'click', () => {
      const name = prompt('Nombre del componente') || 'Component';
      createComponentFromSelection(name);
    });
    bind($('#ed-tool-instance'), 'click', () => {
      if (!state.components.length) return alert('No hay componentes');
      insertComponentInstance(state.components[0].id, { left: 140, top: 140 });
    });

    bind($('#btn-remove-bg'), 'click', () => removeBackgroundActiveImage(parseInt($('#token-primary')?.value || 32, 10) || 32);
    bind($('#tokens-save'), 'click', () => {
      state.tokens.primary = $('#token-primary').value || state.tokens.primary;
      state.tokens.font = $('#token-font').value || state.tokens.font;
      saveLS('editor:tokens', state.tokens);
      alert('Tokens guardados');
    });

    // selection changes -> inspector & layers
    fabricCanvas.on('selection:created', () => { renderLayers(); refreshInspector(); });
    fabricCanvas.on('selection:updated', () => { renderLayers(); refreshInspector(); });
    fabricCanvas.on('selection:cleared', () => { refreshInspector(); });
    fabricCanvas.on('object:added', () => { renderLayers(); pushHistory(); });
    fabricCanvas.on('object:removed', () => { renderLayers(); pushHistory(); });
    fabricCanvas.on('object:modified', () => { renderLayers(); pushHistory(); });

    // comments add
    bind($('#comment-add'), 'click', () => {
      const text = $('#comment-box')?.value?.trim();
      if (!text) return;
      const sel = fabricCanvas.getActiveObject();
      const objectId = sel ? sel.__objectId : null;
      state.comments = loadLS('editor:comments', state.comments || []);
      state.comments.unshift({ id: uid('c'), objectId, author: 'You', text, ts: nowIso() });
      saveLS('editor:comments', state.comments);
      renderComments();
      if ($('#comment-box')) $('#comment-box').value = '';
    });

    // recordings
    bind($('#rec-start'), 'click', () => { startRecording(); alert('Recording started'); });
    bind($('#rec-stop'), 'click', () => { const r = stopRecording(); alert('Recording stopped: ' + (r && r.name)); });
    bind($('#rec-heat'), 'click', () => { const recs = loadLS('editor:recordings', []); if (!recs.length) return alert('No recordings'); generateHeatmap(recs[0].id); });

    // save/export
    bind($('#ed-btn-save'), 'click', () => {
      const json = fabricCanvas.toJSON(['__objectId', '__componentId', '__isInstance', '__overrides']);
      const name = prompt('Nombre del proyecto') || ('project_' + Date.now());
      saveLS('editor:project:' + name, { json, meta: { savedAt: nowIso() } });
      alert('Guardado local: ' + name);
    });
    bind($('#ed-btn-export-png'), 'click', () => {
      const data = fabricCanvas.toDataURL({ format: 'png', multiplier: 2 });
      const a = document.createElement('a'); a.href = data; a.download = 'canvas.png'; document.body.appendChild(a); a.click(); a.remove();
    });

    // initial renders
    renderComponentsList();
    renderRecordingsList();
    renderComments();
    renderLayers();
  }

  // inspector refresher
  function refreshInspector() {
    const out = document.getElementById('inspector') || document.querySelector('.module-editor')?.querySelector('#inspector');
    if (!out) return;
    const sel = fabricCanvas.getActiveObject();
    if (!sel) { out.innerHTML = '<div class="muted">Ningún objeto seleccionado</div>'; return; }
    out.innerHTML = `
      <label>Nombre <input id="ins-name" value="${sel.__objectId || ''}" /></label>
      <label>Fill <input id="ins-fill" type="color" value="${sel.fill ? sel.fill : '#000000'}" /></label>
      <label>Left <input id="ins-left" type="number" value="${Math.round(sel.left || 0)}" /></label>
      <label>Top <input id="ins-top" type="number" value="${Math.round(sel.top || 0)}" /></label>
      <label>Angle <input id="ins-angle" type="number" value="${Math.round(sel.angle || 0)}" /></label>
    `;
    bind(document.getElementById('ins-fill'), 'input', (e) => { sel.set('fill', e.target.value); fabricCanvas.requestRenderAll(); pushHistory(); });
    bind(document.getElementById('ins-left'), 'change', (e) => { sel.set('left', parseFloat(e.target.value)); sel.setCoords(); fabricCanvas.requestRenderAll(); pushHistory(); });
    bind(document.getElementById('ins-top'), 'change', (e) => { sel.set('top', parseFloat(e.target.value)); sel.setCoords(); fabricCanvas.requestRenderAll(); pushHistory(); });
    bind(document.getElementById('ins-angle'), 'change', (e) => { sel.set('angle', parseFloat(e.target.value)); sel.setCoords(); fabricCanvas.requestRenderAll(); pushHistory(); });
  }

  // --- Init / Destroy API (single-file) ---
  async function initEditor(params = {}) {
    if (mounted) return true;
    await ensureFabricAvailable();

    const { canvasEl } = findOrCreateCanvas();
    if (!canvasEl) throw new Error('Editor HTML missing canvas elements');

    if (!canvasEl.id) canvasEl.id = uid('canvas');
    fabricCanvas = new fabric.Canvas(canvasEl.id, { selection: true, preserveObjectStacking: true, backgroundColor: '#ffffff' });

    // restore persisted state
    state.components = loadLS('editor:components', state.components || []);
    state.tokens = loadLS('editor:tokens', state.tokens || { primary: '#4f46e5', font: 'Inter, system-ui' });
    state.recordings = loadLS('editor:recordings', state.recordings || []);
    state.comments = loadLS('editor:comments', state.comments || []);

    // Wire UI (safe because core functions are already declared)
    wireModuleUI();

    // Expose API (idempotent)
    window.editorAPI = Object.assign(window.editorAPI || {}, {
      init: initEditor,
      destroy: destroyEditor,
      createComponentFromSelection,
      insertComponentInstance,
      renderComments,
      removeBackgroundActiveImage,
      startRecording,
      stopRecording,
      generateHeatmap
    });

    mounted = true;
    return true;
  }

  function destroyEditor() {
    if (!mounted) return;
    try {
      unbindAll();
      if (fabricCanvas && typeof fabricCanvas.dispose === 'function') fabricCanvas.dispose();
    } catch (e) { console.warn(e); }
    mounted = false;
    const root = document.getElementById('app-root')?.querySelector('.module-editor') || document.querySelector('.module-editor');
    if (root && root.parentElement) root.remove();
  }

  // expose to window
  window.editorAPI = window.editorAPI || {};
  window.editorAPI.init = initEditor;
  window.editorAPI.destroy = destroyEditor;

  // Also expose key helpers globally for debugging/backwards compatibility
  window.insertComponentInstance = insertComponentInstance;
  window.createComponentFromSelection = createComponentFromSelection;
  window.renderComments = renderComments;

  // automatic init if module loaded standalone (editor/index.html scenario)
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // if this script is loaded in a standalone editor page, auto-init
    const isStandalone = !!document.querySelector('.editor-shell') || !!document.querySelector('.editor-main') || !!document.querySelector('.module-editor');
    if (isStandalone) {
      setTimeout(() => { initEditor().catch(e => console.warn('editor init failed', e)); }, 50);
    }
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      const isStandalone = !!document.querySelector('.editor-shell') || !!document.querySelector('.editor-main') || !!document.querySelector('.module-editor');
      if (isStandalone) initEditor().catch(e => console.warn('editor init failed', e));
    });
  }
})();
