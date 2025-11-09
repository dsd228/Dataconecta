// modules/editor.js — module-ready Editor script (robust canvas detection + fallback creation)
// Exposes window.editorAPI.init(params) and window.editorAPI.destroy()
(function () {
  const CONFIG = {
    cdnList: [
      'https://cdn.jsdelivr.net/npm/fabric@4.6.0/dist/fabric.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/4.6.0/fabric.min.js'
    ],
    localFallback: '/modules/vendor/fabric.min.js'
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));
  const uid = (p='id') => p + '_' + Math.random().toString(36).slice(2,9);
  const nowIso = () => new Date().toISOString();

  let mounted = false;
  let fabricCanvas = null;
  let state = { components: [], history: { undo: [], redo: [], limit: 80 }, tokens: { primary: '#4f46e5', font: 'Inter, system-ui' }, recordings: [] };
  let handlers = [];
  let recHandlers = [];

  function saveLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function loadLS(k, fallback) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; } }

  function loadScript(src, timeout = 8000) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + src + '"]')) {
        const start = Date.now();
        (function poll() { if (window.fabric) return resolve(); if (Date.now() - start > 3000) return reject(new Error('Script present but fabric not initialized: ' + src)); setTimeout(poll, 80); })();
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
    for (const src of CONFIG.cdnList) {
      try {
        await loadScript(src);
        const start = Date.now();
        while (!window.fabric && Date.now() - start < 2000) await new Promise(r => setTimeout(r, 80));
        if (window.fabric) { console.info('Fabric loaded from', src); return window.fabric; }
      } catch (e) { console.warn('Failed to load Fabric from', src, e); }
    }
    try {
      await loadScript(CONFIG.localFallback);
      const start = Date.now();
      while (!window.fabric && Date.now() - start < 2000) await new Promise(r => setTimeout(r, 80));
      if (window.fabric) { console.info('Fabric loaded from local fallback', CONFIG.localFallback); return window.fabric; }
    } catch (e) { console.warn('Local fallback failed', e); }
    throw new Error('Fabric.js could not be loaded');
  }

  function bind(el, ev, fn) {
    if (!el) return;
    el.addEventListener(ev, fn);
    handlers.push({ el, ev, fn });
  }
  function unbindAll() {
    handlers.forEach(h => { try { h.el.removeEventListener(h.ev, h.fn); } catch (e) {} });
    handlers = [];
    recHandlers.forEach(h => {
      try {
        h.wrap.removeEventListener('mousemove', h.onPointer);
        h.wrap.removeEventListener('click', h.onPointer);
      } catch (e) {}
    });
    recHandlers = [];
  }

  // Robust canvas finder: checks #app-root (injected), .module-editor, document, and can create a fallback canvas
  function findOrCreateCanvas() {
    const appRoot = document.getElementById('app-root');
    const candidates = [];

    // 1) prefer inside app-root (when module injected)
    if (appRoot) {
      const c1 = appRoot.querySelector('#canvas');
      const w1 = appRoot.querySelector('#canvas-wrap');
      if (c1 && w1) return { canvasEl: c1, wrap: w1, contextRoot: appRoot };
      // try any canvas inside appRoot
      const anyCanvas = appRoot.querySelector('canvas');
      if (anyCanvas) {
        return { canvasEl: anyCanvas, wrap: anyCanvas.parentElement || appRoot, contextRoot: appRoot };
      }
    }

    // 2) module root
    const moduleRoot = document.querySelector('.module-editor');
    if (moduleRoot) {
      const c2 = moduleRoot.querySelector('#canvas');
      const w2 = moduleRoot.querySelector('#canvas-wrap');
      if (c2 && w2) return { canvasEl: c2, wrap: w2, contextRoot: moduleRoot };
      const anyCanvas = moduleRoot.querySelector('canvas');
      if (anyCanvas) return { canvasEl: anyCanvas, wrap: anyCanvas.parentElement || moduleRoot, contextRoot: moduleRoot };
    }

    // 3) global fallback
    const globalCanvas = document.querySelector('#canvas') || document.querySelector('canvas');
    if (globalCanvas) return { canvasEl: globalCanvas, wrap: globalCanvas.parentElement || document.body, contextRoot: document.body };

    // 4) Create fallback inside #app-root if available, else body
    const host = appRoot || moduleRoot || document.body;
    const wrap = document.createElement('div');
    wrap.id = 'canvas-wrap';
    wrap.style.position = 'relative';
    wrap.style.minHeight = '400px';
    wrap.style.border = '1px solid #e6e6e6';
    wrap.style.background = '#fff';
    const canvasEl = document.createElement('canvas');
    canvasEl.id = 'canvas';
    canvasEl.width = 1000;
    canvasEl.height = 600;
    wrap.appendChild(canvasEl);
    host.appendChild(wrap);
    console.warn('Created fallback canvas dynamically inside', host === document.body ? 'document.body' : (host.id || host.className));
    return { canvasEl, wrap, contextRoot: host };
  }

  // History helpers
  function pushHistory() {
    try {
      const snap = fabricCanvas.toJSON(['__objectId','__componentId','__isInstance','__overrides']);
      state.history = state.history || { undo: [], redo: [], limit: 80 };
      state.history.undo.push(snap);
      if (state.history.undo.length > state.history.limit) state.history.undo.shift();
      state.history.redo = [];
      saveLS('editor:state', state);
    } catch (e) { console.warn('pushHistory', e); }
  }
  function undo() {
    if (!state.history || !state.history.undo.length) return;
    try {
      const last = state.history.undo.pop();
      state.history.redo = state.history.redo || [];
      state.history.redo.push(fabricCanvas.toJSON());
      fabricCanvas.loadFromJSON(last, () => fabricCanvas.renderAll());
    } catch (e) { console.warn('undo', e); }
  }
  function redo() {
    if (!state.history || !state.history.redo.length) return;
    try {
      const next = state.history.redo.pop();
      state.history.undo.push(fabricCanvas.toJSON());
      fabricCanvas.loadFromJSON(next, () => fabricCanvas.renderAll());
    } catch (e) { console.warn('redo', e); }
  }

  // Component & UI render helpers (kept concise)
  function renderLayers() {
    const container = document.getElementById('layers-list') || (document.querySelector('.module-editor') && document.querySelector('.module-editor').querySelector('#layers-list'));
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
    const out = document.getElementById('components-list') || (document.querySelector('.module-editor') && document.querySelector('.module-editor').querySelector('#components-list'));
    if (!out) return;
    out.innerHTML = (state.components || []).map(c => `<div class="component-card"><div>${c.name}</div><div><button data-id="${c.id}" class="btn small comp-insert">Insert</button></div></div>`).join('') || '<div class="muted">Sin componentes</div>';
    qsa('.comp-insert', out).forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const comp = state.components.find(x => x.id === id);
      if (comp) fabric.util.enlivenObjects(comp.json.objects || [], (enlivened) => {
        const g = new fabric.Group(enlivened, { left: 120, top: 120 });
        g.__componentId = id; g.__isInstance = true; g.__objectId = uid('o');
        fabricCanvas.add(g); fabricCanvas.setActiveObject(g); pushHistory();
      }, '');
    }));
  }
  function refreshInspector() {
    const out = document.getElementById('inspector') || (document.querySelector('.module-editor') && document.querySelector('.module-editor').querySelector('#inspector'));
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

  // Recording / Heatmap helpers
  function startRecording() {
    recHandlers = [];
    recHandlers = recHandlers || [];
    const wrap = document.getElementById('canvas-wrap') || document.querySelector('.canvas-wrap');
    if (!wrap) return;
    recording = true;
    const onPointer = (e) => {
      if (!recording) return;
      const r = wrap.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      recHandlers.buffer = recHandlers.buffer || [];
      recHandlers.buffer.push({ type: e.type, x, y, ts: Date.now() });
      if (recHandlers.buffer.length > 20000) recHandlers.buffer.shift();
    };
    wrap.addEventListener('mousemove', onPointer);
    wrap.addEventListener('click', onPointer);
    recHandlers.push({ wrap, onPointer });
  }
  function stopRecording(name) {
    recording = false;
    if (recHandlers && recHandlers.length) {
      recHandlers.forEach(h => {
        try { h.wrap.removeEventListener('mousemove', h.onPointer); h.wrap.removeEventListener('click', h.onPointer); } catch (e) {}
      });
    }
    const recs = loadLS('editor:recordings', []);
    const rec = { id: uid('rec'), name: name || ('rec_' + Date.now()), createdAt: nowIso(), events: (recHandlers.buffer || []).slice() };
    recs.unshift(rec); saveLS('editor:recordings', recs); state.recordings = recs;
    renderRecordingsList();
    recHandlers.buffer = [];
    return rec;
  }
  function renderRecordingsList() {
    const out = document.getElementById('recordings-list') || (document.querySelector('.module-editor') && document.querySelector('.module-editor').querySelector('#recordings-list'));
    if (!out) return;
    const recs = loadLS('editor:recordings', []);
    out.innerHTML = recs.map(r => `<div class="component-card"><div>${r.name}</div><div class="muted">${new Date(r.createdAt).toLocaleString()}</div><div><button data-id="${r.id}" class="btn small rec-heat">Heat</button></div></div>`).join('');
    qsa('.rec-heat', out).forEach(btn => btn.addEventListener('click', () => {
      generateHeatmap(btn.dataset.id);
    }));
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
    ctx.clearRect(0,0,overlay.width, overlay.height);
    clicks.forEach(c => {
      const grd = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 40);
      grd.addColorStop(0, 'rgba(255,0,0,0.18)');
      grd.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(c.x - 40, c.y - 40, 80, 80);
    });
  }

  // Background removal heuristic
  async function removeBackgroundActiveImage(tolerance = 32) {
    const active = fabricCanvas.getActiveObject();
    if (!active || active.type !== 'image') { alert('Selecciona una imagen primero'); return; }
    let imgEl = active._element;
    if (!imgEl) {
      const url = active.toDataURL();
      imgEl = await new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = rej; im.src = url; });
    }
    const tmp = document.createElement('canvas'); tmp.width = imgEl.naturalWidth || imgEl.width; tmp.height = imgEl.naturalHeight || imgEl.height;
    const ctx = tmp.getContext('2d'); ctx.drawImage(imgEl, 0, 0);
    const imageData = ctx.getImageData(0,0,tmp.width,tmp.height);
    const w = imageData.width, h = imageData.height, data = imageData.data;
    const visited = new Uint8Array(w*h);
    const queue = [];
    function push(i) { if (!visited[i]) { visited[i] = 1; queue.push(i); } }
    for (let x=0;x<w;x++){ push(x); push((h-1)*w + x); }
    for (let y=0;y<h;y++){ push(y*w); push(y*w + (w-1)); }
    const baseOff = 0, baseR = data[baseOff], baseG = data[baseOff+1], baseB = data[baseOff+2];
    while (queue.length) {
      const idx = queue.shift();
      const px = idx % w; const py = Math.floor(idx / w); const off = idx*4;
      const r = data[off], g = data[off+1], b = data[off+2];
      if (Math.abs(r-baseR) <= tolerance && Math.abs(g-baseG) <= tolerance && Math.abs(b-baseB) <= tolerance) {
        data[off+3] = 0;
        if (px>0) push(idx-1); if (px<w-1) push(idx+1); if (py>0) push(idx-w); if (py<h-1) push(idx+w);
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

  // Wire UI after fabric available and canvas present
  function wireModuleUI() {
    bind($('#btn-add-rect'), 'click', () => {
      const r = new fabric.Rect({ left: 60, top: 40, width: 160, height: 100, fill: state.tokens.primary });
      r.__objectId = uid('o'); fabricCanvas.add(r).setActiveObject(r); pushHistory();
    });

    bind($('#btn-add-text'), 'click', () => {
      const t = new fabric.Textbox('Texto', { left: 80, top: 160, width: 240, fontSize: 18, fill: '#111' });
      t.__objectId = uid('o'); fabricCanvas.add(t).setActiveObject(t); pushHistory();
    });

    const imgIn = $('#editor-image-input');
    bind($('#btn-upload-image'), 'click', () => imgIn && imgIn.click());
    bind(imgIn, 'change', (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      if (window.createImageBitmap) {
        createImageBitmap(f).then(bitmap => {
          const tmp = document.createElement('canvas'); tmp.width = bitmap.width; tmp.height = bitmap.height; tmp.getContext('2d').drawImage(bitmap,0,0);
          const url = tmp.toDataURL('image/png');
          fabric.Image.fromURL(url, img => { img.__objectId = uid('o'); img.set({ left: 120, top: 120 }); fabricCanvas.add(img).setActiveObject(img); pushHistory(); }, { crossOrigin:'anonymous' });
        }).catch(() => {
          const url = URL.createObjectURL(f);
          fabric.Image.fromURL(url, img => { img.__objectId = uid('o'); img.set({ left:120, top:120 }); fabricCanvas.add(img).setActiveObject(img); pushHistory(); URL.revokeObjectURL(url); }, { crossOrigin:'anonymous' });
        });
      } else {
        const url = URL.createObjectURL(f);
        fabric.Image.fromURL(url, img => { img.__objectId = uid('o'); img.set({ left:120, top:120 }); fabricCanvas.add(img).setActiveObject(img); pushHistory(); URL.revokeObjectURL(url); }, { crossOrigin:'anonymous' });
      }
      e.target.value = '';
    });

    bind($('#ed-zoom'), 'input', (e) => { const z = parseFloat(e.target.value); fabricCanvas.setZoom(z); fabricCanvas.requestRenderAll(); });
    bind($('#ed-undo'), 'click', undo); bind($('#ed-redo'), 'click', redo);

    bind($('#ed-toggle-grid'), 'click', () => {
      const existing = fabricCanvas.getObjects().filter(o => o.__isGridLine);
      if (existing.length) { existing.forEach(l => fabricCanvas.remove(l)); fabricCanvas.requestRenderAll(); return; }
      const step = 20;
      for (let i = 0; i < fabricCanvas.getWidth(); i += step) { const line = new fabric.Line([i,0,i,fabricCanvas.getHeight()], { stroke:'#eee', selectable:false, evented:false }); line.__isGridLine = true; fabricCanvas.add(line); }
      for (let j = 0; j < fabricCanvas.getHeight(); j += step) { const line = new fabric.Line([0,j,fabricCanvas.getWidth(),j], { stroke:'#eee', selectable:false, evented:false }); line.__isGridLine = true; fabricCanvas.add(line); }
      fabricCanvas.requestRenderAll();
    });

    bind($('#ed-tool-component'), 'click', () => {
      const id = createComponentFromSelection(prompt('Nombre del componente') || 'Component'); if (id) alert('Componente creado: ' + id);
    });
    bind($('#ed-tool-instance'), 'click', () => { if (!state.components.length) return alert('No hay componentes'); insertComponentInstance(state.components[0].id, { left: 140, top: 140 }); });

    bind($('#btn-remove-bg'), 'click', () => removeBackgroundActiveImage(parseInt($('#token-primary').dataset?.tol || 32, 10) || 32));
    bind($('#tokens-save'), 'click', () => { state.tokens.primary = $('#token-primary').value; state.tokens.font = $('#token-font').value; saveLS('editor:tokens', state.tokens); alert('Tokens guardados'); });

    fabricCanvas.on('selection:created', () => { renderLayers(); refreshInspector(); });
    fabricCanvas.on('selection:updated', () => { renderLayers(); refreshInspector(); });
    fabricCanvas.on('selection:cleared', () => { refreshInspector(); });
    fabricCanvas.on('object:added', () => { renderLayers(); pushHistory(); });
    fabricCanvas.on('object:removed', () => { renderLayers(); pushHistory(); });
    fabricCanvas.on('object:modified', () => { renderLayers(); pushHistory(); });

    bind($('#comment-add'), 'click', () => {
      const text = $('#comment-box').value.trim(); if (!text) return;
      const sel = fabricCanvas.getActiveObject(); const objectId = sel ? sel.__objectId : null;
      const list = loadLS('editor:comments', []); list.unshift({ id: uid('c'), objectId, author: 'You', text, ts: nowIso() }); saveLS('editor:comments', list); renderComments(); $('#comment-box').value = '';
    });

    bind($('#rec-start'), 'click', () => { startRecording(); alert('Recording started'); });
    bind($('#rec-stop'), 'click', () => { const r = stopRecording(); alert('Recording stopped: ' + (r && r.name)); });
    bind($('#rec-heat'), 'click', () => { const recs = loadLS('editor:recordings', []); if (!recs.length) return alert('No recordings'); generateHeatmap(recs[0].id); });

    bind($('#ed-btn-save'), 'click', () => {
      const json = fabricCanvas.toJSON(['__objectId','__componentId','__isInstance','__overrides']);
      const name = prompt('Nombre del proyecto') || 'project';
      saveLS('editor:project:' + name, { json, meta: { savedAt: nowIso() } });
      alert('Guardado local: ' + name);
    });

    bind($('#ed-btn-export-png'), 'click', () => {
      const data = fabricCanvas.toDataURL({ format: 'png', multiplier: 2 });
      const a = document.createElement('a'); a.href = data; a.download = 'canvas.png'; document.body.appendChild(a); a.click(); a.remove();
    });

    renderComponentsList(); renderRecordingsList(); renderComments(); renderLayers();
  }

  // Public API
  window.editorAPI = window.editorAPI || {};
  window.editorAPI.init = async function init(params = {}) {
    if (mounted) return true;
    await ensureFabricAvailable();

    // find or create canvas
    const { canvasEl, wrap } = findOrCreateCanvas();
    if (!canvasEl || !wrap) {
      console.error('Editor init failed: canvas or wrap missing even after fallback');
      throw new Error('Editor HTML missing canvas elements');
    }

    if (!canvasEl.id) canvasEl.id = uid('canvas');

    fabricCanvas = new fabric.Canvas(canvasEl.id, { selection: true, preserveObjectStacking: true, backgroundColor: '#ffffff' });

    // restore saved
    const comps = loadLS('editor:components', []); if (comps && comps.length) state.components = comps;
    const tokens = loadLS('editor:tokens', null); if (tokens) state.tokens = tokens;

    // wire UI
    wireModuleUI();

    mounted = true;
    return true;
  };

  window.editorAPI.destroy = function destroy() {
    if (!mounted) return;
    try {
      unbindAll();
      fabricCanvas && fabricCanvas.dispose && fabricCanvas.dispose();
    } catch (e) { console.warn(e); }
    mounted = false;
    const root = document.getElementById('app-root')?.querySelector('.module-editor') || document.querySelector('.module-editor');
    if (root && root.parentElement) root.remove();
  };

  // integration helpers
  window.editorAPI.createComponentFromSelection = function(name) {
    const sel = fabricCanvas.getActiveObject();
    if (!sel) return null;
    let json;
    if (sel.type === 'activeSelection') json = { objects: sel.getObjects().map(o => o.toObject(['__objectId','__componentId','__isInstance'])) };
    else json = { objects: [ sel.toObject(['__objectId','__componentId','__isInstance']) ] };
    const id = uid('comp'); state.components.unshift({ id, name: name || 'Component', json }); saveLS('editor:components', state.components); renderComponentsList(); return id;
  };
  window.editorAPI.insertComponentInstance = insertComponentInstance;
  window.editorAPI.removeBackgroundActiveImage = removeBackgroundActiveImage;
  window.editorAPI.renderComments = renderComments;
  window.editorAPI.generateHeatmap = generateHeatmap;

  // debug
  window.__editor_internal = { state, fabricCanvas };

})();
