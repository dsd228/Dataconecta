/* modules/editor.js
   Advanced Editor (UX/UI) module implementing:
   - reusable components + instances + overrides
   - design tokens (colors/fonts) and export CSS variables
   - prototyping (hotspots & transitions)
   - comments anchored to objects
   - collaboration stub (WebSocket optional) with ops & live cursors
   - export assets / CSS / iOS/Android snippets
   - plugins registry (icons/image bank/AI)
   - heatmaps & session recordings (client-side capture + heatmap generator)
   - background removal (on-device heuristic flood-fill)
   Exposes window.editorAPI.init(params) and destroy()
*/
(function () {
  // Config
  const CONFIG = {
    wsUrl: null, // set to wss://... to enable real-time features
    localFallbackFabric: '/modules/vendor/fabric.min.js', // expected on GitHub Pages if CDN blocked
    recordingMaxEvents: 20000
  };

  // Utilities
  const $ = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from((root||document).querySelectorAll(sel));
  const uid = (p='id') => p + '_' + Math.random().toString(36).slice(2,9);
  const nowIso = () => new Date().toISOString();

  // Storage keys
  const KEYS = {
    PAGES: 'editor:pages_v2',
    COMPONENTS: 'editor:components_v2',
    TOKENS: 'editor:tokens_v1',
    COMMENTS: 'editor:comments_v1',
    RECORDINGS: 'editor:recordings_v1'
  };

  // State
  let fabricCanvas = null;
  let mounted = false;
  let ws = null;
  let pluginRegistry = {};
  let recordBuffer = [];
  let recording = false;

  // Persistence helpers
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} }
  function load(key, fallback) { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch(e){ return fallback; } }

  // Ensure Fabric loaded (tries CDN then local)
  function loadScript(src, timeout=8000) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        const start = Date.now();
        (function poll(){ if (window.fabric) return resolve(); if (Date.now()-start>3000) return reject(new Error('Script present but fabric not initialized')); setTimeout(poll,80); })();
        return;
      }
      const s = document.createElement('script'); s.src = src; s.async = true;
      let done=false;
      s.onload = ()=> { if(!done){done=true;resolve();} };
      s.onerror = ()=> { if(!done){done=true;reject(new Error('Failed to load '+src));} };
      document.head.appendChild(s);
      setTimeout(()=>{ if(!done){done=true;reject(new Error('Timeout loading '+src));} }, timeout);
    });
  }
  async function ensureFabric() {
    if (window.fabric) return window.fabric;
    const cdns = [
      'https://cdn.jsdelivr.net/npm/fabric@4.6.0/dist/fabric.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/4.6.0/fabric.min.js'
    ];
    for (const src of cdns) {
      try { await loadScript(src); if (window.fabric) return window.fabric; } catch(e){ console.warn('fabric cdn error', e); }
    }
    // local fallback
    try { await loadScript(CONFIG.localFallbackFabric); if (window.fabric) return window.fabric; } catch(e){ console.warn('local fallback failed', e); }
    throw new Error('Fabric.js not available');
  }

  // Design tokens
  function getTokens() { return load(KEYS.TOKENS, { primary:'#4f46e5', accent:'#06b6D4', font:'Inter, system-ui' }); }
  function setTokens(t) { save(KEYS.TOKENS, t); applyTokensToUI(t); }
  function applyTokensToUI(t) {
    // update color inputs if present
    const primary = $('#token-primary'); if (primary) primary.value = t.primary || '#4f46e5';
    const accent = $('#token-accent'); if (accent) accent.value = t.accent || '#06b6D4';
    const font = $('#token-font'); if (font) font.value = t.font || 'Inter, system-ui';
    // apply CSS variables for preview/export
    document.documentElement.style.setProperty('--editor-primary', t.primary);
    document.documentElement.style.setProperty('--editor-accent', t.accent);
    document.documentElement.style.setProperty('--editor-font', t.font);
  }
  function exportTokensAsCSS() {
    const t = getTokens();
    const css = `:root {\n  --color-primary: ${t.primary};\n  --color-accent: ${t.accent};\n  --font-family: ${t.font};\n}\n`;
    const blob = new Blob([css], { type:'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='design-tokens.css'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // Components system
  function loadComponents() { return load(KEYS.COMPONENTS, []); }
  function saveComponents(comps) { save(KEYS.COMPONENTS, comps); }
  function createComponentFromSelection(name) {
    const sel = fabricCanvas.getActiveObject();
    if (!sel) return null;
    let compJson = null;
    if (sel.type === 'activeSelection') {
      const objs = sel.getObjects().map(o => o.toObject(['__objectId','__isInstance','__componentId']));
      compJson = { objects: objs };
    } else {
      compJson = { objects: [ sel.toObject(['__objectId','__isInstance','__componentId']) ] };
    }
    const comps = loadComponents();
    const id = uid('comp');
    comps.unshift({ id, name: name || 'Component '+(comps.length+1), json: compJson });
    saveComponents(comps);
    renderComponentsList();
    return id;
  }
  async function insertComponentInstance(componentId, opts={left:120,top:120}) {
    const comps = loadComponents();
    const comp = comps.find(c=>c.id===componentId); if(!comp) return null;
    // enliven objects
    const objsJson = comp.json.objects || [];
    fabric.util.enlivenObjects(objsJson, (enlivened) => {
      const group = new fabric.Group(enlivened, { left: opts.left||120, top: opts.top||120 });
      group.__componentId = componentId;
      group.__isInstance = true;
      group.__overrides = {}; // map propPath -> value
      group.__objectId = uid('o');
      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);
    }, '');
  }
  function updateComponent(componentId, newJson) {
    const comps = loadComponents();
    const comp = comps.find(c=>c.id===componentId); if(!comp) return false;
    comp.json = newJson;
    saveComponents(comps);
    // propagate to instances on canvas
    const instances = fabricCanvas.getObjects().filter(o => o.__componentId === componentId);
    instances.forEach(inst => {
      const left = inst.left, top = inst.top, angle = inst.angle, scaleX = inst.scaleX, scaleY = inst.scaleY;
      fabricCanvas.remove(inst);
      insertComponentInstance(componentId, { left, top }).then(() => {
        const newInst = fabricCanvas.getObjects().slice(-1)[0];
        if (newInst) newInst.set({ angle, scaleX, scaleY });
      });
    });
    return true;
  }

  // Overrides: for an instance store map of objectPath->value. We'll support simple top-level overrides: fill, text, fontSize.
  function setInstanceOverride(instanceObj, key, value) {
    instanceObj.__overrides = instanceObj.__overrides || {};
    instanceObj.__overrides[key] = value;
    // apply immediately
    try { instanceObj.set(key, value); instanceObj.setCoords(); fabricCanvas.requestRenderAll(); } catch(e){}
    // persist not necessary (instance exists in canvas state)
  }

  // Prototyping: hotspots & transitions
  function createHotspotForObject(obj, targetPageId, transition='none') {
    obj.__hotspot = { targetPageId, transition };
    obj.set({ hasControls: true }); // remain selectable
    fabricCanvas.requestRenderAll();
    emit('prototype.hotspot.created', { objectId: obj.__objectId, targetPageId, transition });
  }
  function playPrototypeAt(pageIndex=0) {
    // simple: hide UI in module and listen clicks on canvas to navigate between pages by hotspots
    alert('Prototype play — click hotspots to navigate (demo)');
    let playing = true;
    function onCanvasDown(e) {
      const pointer = fabricCanvas.getPointer(e.e);
      const objs = fabricCanvas.getObjects().slice().reverse();
      for (const o of objs) {
        try {
          if (o.containsPoint && o.containsPoint(pointer)) {
            if (o.__hotspot && o.__hotspot.targetPageId != null) {
              alert('Navigate to: ' + o.__hotspot.targetPageId + ' (demo)');
              // in a full app switch viewport to that page
            }
            break;
          }
        } catch(err){}
      }
    }
    fabricCanvas.on('mouse:down', onCanvasDown);
    return () => { fabricCanvas.off('mouse:down', onCanvasDown); playing = false; };
  }

  // Comments system
  function loadComments() { return load(KEYS.COMMENTS, []); }
  function saveComments(list) { save(KEYS.COMMENTS, list); }
  function addComment(objectId, author, text) {
    const list = loadComments();
    const c = { id: uid('c'), objectId, author, text, ts: nowIso() };
    list.unshift(c); saveComments(list); renderComments(); emit('comment.added', c); return c;
  }
  function renderComments() {
    const list = loadComments();
    const out = $('#comments-list');
    if (!out) return;
    out.innerHTML = list.map(c => `<div class="comment-item"><strong>${c.author}</strong> <small class="muted">${new Date(c.ts).toLocaleString()}</small><div>${c.text}</div></div>`).join('') || '<div class="muted">No comments</div>';
  }

  // Recordings & heatmaps (client-side)
  function startRecording(sessionName) {
    recordBuffer = []; recording = true;
    const wrap = $('#ed-canvas-wrap');
    const onPointer = (e) => {
      if (!recording) return;
      const rect = wrap.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      recordBuffer.push({ type: e.type, x, y, ts: Date.now() });
      if (recordBuffer.length > CONFIG.recordingMaxEvents) recordBuffer.shift();
    };
    wrap.addEventListener('click', onPointer);
    wrap.addEventListener('mousemove', onPointer);
    // store handler for stop
    editorInternal._recHandlers = editorInternal._recHandlers || [];
    editorInternal._recHandlers.push({ onPointer, wrap });
    return true;
  }
  function stopRecording(name) {
    recording = false;
    // remove listeners
    (editorInternal._recHandlers || []).forEach(h => { try { h.wrap.removeEventListener('click', h.onPointer); h.wrap.removeEventListener('mousemove', h.onPointer); } catch(e){} });
    editorInternal._recHandlers = [];
    const recordings = load(KEYS.RECORDINGS, []);
    const rec = { id: uid('rec'), name: name || ('rec_'+Date.now()), createdAt: nowIso(), events: recordBuffer.slice() };
    recordings.unshift(rec); save(KEYS.RECORDINGS, recordings);
    document.getElementById('recordings-list').innerHTML = recordings.map(r => `<div>${r.name} • ${new Date(r.createdAt).toLocaleString()}</div>`).join('');
    recordBuffer = [];
    return rec;
  }
  function generateHeatmapFromRecording(recId) {
    const recordings = load(KEYS.RECORDINGS, []);
    const rec = recordings.find(r => r.id === recId) || recordings[0];
    if (!rec) { alert('No recording found'); return; }
    const overlay = $('#ed-heatmap-overlay');
    const canvas = overlay;
    const ctx = canvas.getContext('2d');
    // assume overlay matches canvas size
    const events = rec.events.filter(e => e.type === 'click' || e.type === 'mousedown');
    // clear
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // draw radial spots accumulating alpha
    events.forEach(ev => {
      const grd = ctx.createRadialGradient(ev.x, ev.y, 0, ev.x, ev.y, 40);
      grd.addColorStop(0, 'rgba(255,0,0,0.18)');
      grd.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(ev.x-40, ev.y-40, 80, 80);
    });
    // apply blur (simple) by composite
    // leave as is for demo
  }

  // Background removal (heuristic flood fill) - simplified version
  async function removeBackgroundActiveImage(tolerance=32) {
    if (!fabricCanvas) throw new Error('canvas not ready');
    const active = fabricCanvas.getActiveObject();
    if (!active || active.type !== 'image') { alert('Selecciona una imagen'); return; }
    let imgEl = active._element;
    if (!imgEl) {
      const url = active.toDataURL();
      imgEl = await new Promise((res, rej) => { const im = new Image(); im.crossOrigin='anonymous'; im.onload = ()=>res(im); im.onerror = rej; im.src = url; });
    }
    // draw to temp canvas, getImageData, flood-fill edges by color tolerance -> set alpha=0
    const temp = document.createElement('canvas'); temp.width = imgEl.naturalWidth || imgEl.width; temp.height = imgEl.naturalHeight || imgEl.height;
    const ctx = temp.getContext('2d'); ctx.drawImage(imgEl,0,0);
    const imageData = ctx.getImageData(0,0,temp.width,temp.height);
    // flood fill from edges -> simple BFS (use same algorithm as earlier)
    const w = imageData.width, h = imageData.height, data = imageData.data;
    const visited = new Uint8Array(w*h);
    const queue = [];
    function pushIf(i){ if(!visited[i]){ visited[i]=1; queue.push(i); } }
    for(let x=0;x<w;x++){ pushIf(x); pushIf((h-1)*w + x); }
    for(let y=0;y<h;y++){ pushIf(y*w); pushIf(y*w + (w-1)); }
    const off0 = 0; const baseR = data[off0], baseG = data[off0+1], baseB = data[off0+2];
    while(queue.length){
      const idx = queue.shift();
      const px = idx % w, py = Math.floor(idx / w);
      const off = idx*4;
      const r = data[off], g = data[off+1], b = data[off+2];
      if (Math.abs(r-baseR)<=tolerance && Math.abs(g-baseG)<=tolerance && Math.abs(b-baseB)<=tolerance) {
        data[off+3] = 0;
        if (px>0) pushIf(idx-1);
        if (px<w-1) pushIf(idx+1);
        if (py>0) pushIf(idx-w);
        if (py<h-1) pushIf(idx+w);
      }
    }
    ctx.putImageData(imageData,0,0);
    const outUrl = temp.toDataURL('image/png');
    fabric.Image.fromURL(outUrl, function(newImg){
      newImg.set({ left: active.left, top: active.top, scaleX: active.scaleX, scaleY: active.scaleY });
      fabricCanvas.remove(active);
      fabricCanvas.add(newImg);
      fabricCanvas.setActiveObject(newImg);
      fabricCanvas.requestRenderAll();
      emit('image.backgroundRemoved', { id: newImg.__objectId || null });
    }, { crossOrigin:'anonymous' });
  }

  // Plugins registry (icons / imagebank / ai)
  function registerPlugin(plugin) {
    // plugin = { id, name, init:fn(editorAPI), ui:fn() }
    pluginRegistry[plugin.id] = plugin;
    if (plugin.init && typeof plugin.init === 'function') plugin.init(editorAPI);
    renderPluginList();
  }
  function renderPluginList() {
    const out = $('#plugins-list'); if (!out) return;
    out.innerHTML = Object.values(pluginRegistry).map(p => `<div>${p.name}</div>`).join('') || '<div class="muted">No plugins</div>';
  }
  // Demo icon plugin
  function loadDemoIconPlugin() {
    const plugin = {
      id: 'icons-demo',
      name: 'Icon Bank (demo)',
      init(api) { this.api = api; },
      ui() {
        return `<div>Icons loaded</div>`;
      },
      fetchIcons() {
        // return a few SVG icons (inline)
        return [{ id:'i-heart', svg:'<svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 21s-7-4.35-9-6.66C0.74 11.65 2.11 7 6 7c1.66 0 3 .99 3.75 2.36C10.99 7.99 12.34 7 14 7c3.89 0 5.26 4.65 3 7.34C19 16.65 12 21 12 21z"/></svg>'}];
      }
    };
    registerPlugin(plugin);
  }

  // Collaboration (WebSocket stub): basic presence + ops forwarding
  function initRealtime() {
    if (!CONFIG.wsUrl) return null;
    try {
      ws = new WebSocket(CONFIG.wsUrl);
      ws.onopen = () => console.info('WS connected');
      ws.onmessage = (m) => {
        try { const msg = JSON.parse(m.data); handleRemoteMessage(msg); } catch(e){ console.warn('ws msg parse', e); }
      };
      ws.onclose = ()=> console.info('WS closed');
      return ws;
    } catch(e){ console.warn('WS init failed', e); return null; }
  }
  function handleRemoteMessage(msg) {
    // handle ops like 'op-add-object', 'op-cursor'
    if (!msg || !msg.type) return;
    if (msg.type === 'cursor') {
      // show remote cursor (not implemented fully)
    }
  }
  function broadcastOp(op) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(op));
    }
  }

  // Editor lifecycle: init / destroy
  const editorInternal = {};
  async function init(params={}) {
    if (mounted) return;
    await ensureFabric();
    // set up fabric canvas
    const canvasEl = $('#ed-canvas');
    const wrap = $('#ed-canvas-wrap');
    if (!canvasEl || !wrap) throw new Error('Editor HTML missing canvas elements');
    // size canvas to wrapper
    const rect = wrap.getBoundingClientRect();
    canvasEl.width = rect.width; canvasEl.height = rect.height;
    const overlay = $('#ed-heatmap-overlay'); overlay.width = rect.width; overlay.height = rect.height;

    fabricCanvas = new fabric.Canvas('ed-canvas', { backgroundColor:'#fff', preserveObjectStacking:true });
    // basic events wiring
    fabricCanvas.on('selection:created', onSelectionChanged);
    fabricCanvas.on('selection:updated', onSelectionChanged);
    fabricCanvas.on('selection:cleared', onSelectionChanged);
    fabricCanvas.on('object:modified', (e)=> { emit('object.modified', e.target); broadcastOp({ type:'modify', id: e.target.__objectId || null }); });
    fabricCanvas.on('mouse:down', (e) => { if (e.target && e.target.__hotspot) { emit('proto.click', e.target.__hotspot); } });

    // bind UI controls
    $('#ed-tool-rect')?.addEventListener('click', ()=> addRectangle());
    $('#ed-tool-text')?.addEventListener('click', ()=> addTextBox());
    $('#ed-tool-image')?.addEventListener('click', ()=> $('#ed-image-input').click());
    $('#ed-image-input')?.addEventListener('change', (ev)=> { const f = ev.target.files && ev.target.files[0]; if(f) addImageFromFile(f); ev.target.value=''; });

    $('#ed-tool-component')?.addEventListener('click', ()=> {
      const name = prompt('Component name') || null;
      const id = createComponentFromSelection(name);
      if (id) alert('Component created: ' + id);
    });
    $('#ed-tool-instance')?.addEventListener('click', ()=> {
      const comps = load(KEYS.COMPONENTS);
      if (!comps.length) return alert('No components');
      insertComponentInstance(comps[0].id, { left: 120, top: 120 });
    });

    $('#tokens-save')?.addEventListener('click', ()=> {
      const t = { primary: $('#token-primary').value, accent: $('#token-accent').value, font: $('#token-font').value };
      setTokens(t); alert('Tokens saved');
    });
    $('#ed-btn-export-css')?.addEventListener('click', ()=> exportTokensAsCSS());
    $('#ed-btn-play-proto')?.addEventListener('click', ()=> { const stop = playPrototype(); editorInternal._protoStop = stop; });
    $('#proto-stop')?.addEventListener('click', ()=> { if (editorInternal._protoStop) editorInternal._protoStop(); });

    $('#comment-add')?.addEventListener('click', ()=> {
      const txt = $('#comment-box').value.trim(); if (!txt) return;
      const sel = fabricCanvas.getActiveObject(); const objId = sel && sel.__objectId ? sel.__objectId : null;
      addComment(objId || null, 'You', txt); $('#comment-box').value=''; renderComments();
    });

    $('#rec-start')?.addEventListener('click', ()=> { startRecording('rec_'+Date.now()); alert('Recording started'); });
    $('#rec-stop')?.addEventListener('click', ()=> { const r = stopRecording(); alert('Recording stopped: ' + r.name); });
    $('#heatgen')?.addEventListener('click', ()=> {
      const recs = load(KEYS.RECORDINGS, []);
      if (!recs.length) return alert('No recordings');
      generateHeatmapFromRecording(recs[0].id);
      alert('Heatmap generated (demo)');
    });

    $('#ed-tool-bg-rem')?.addEventListener('click', ()=> {
      const tol = parseInt($('#token-accent').dataset?.tol || 32,10) || 32;
      removeBackgroundActiveImage(tol).catch(e=>alert('BG removal failed: '+e.message));
    });

    $('#plugin-load-icons')?.addEventListener('click', ()=> loadDemoIconPlugin());

    // ui initial state
    applyTokensToUI(getTokens());
    renderComponentsList();
    renderComments();
    const recordings = load(KEYS.RECORDINGS, []);
    document.getElementById('recordings-list').innerHTML = recordings.map(r => `<div>${r.name} • ${new Date(r.createdAt).toLocaleString()}</div>`).join('');

    // init collaboration if configured
    if (CONFIG.wsUrl) initRealtime();

    mounted = true;
    return true;
  }

  function destroy() {
    if (!mounted) return;
    try { fabricCanvas && fabricCanvas.dispose && fabricCanvas.dispose(); } catch(e){}
    mounted = false;
    // remove module DOM
    const el = document.getElementById('app-root')?.querySelector('.editor-module');
    if (el) el.remove();
  }

  // Simple add primitives
  function addRectangle() {
    const r = new fabric.Rect({ left: 80, top: 80, width: 160, height: 100, fill: getTokens().primary });
    r.__objectId = uid('o');
    fabricCanvas.add(r).setActiveObject(r);
    emit('object.added', r);
    return r;
  }
  function addTextBox() {
    const t = new fabric.Textbox('Text', { left: 60, top: 160, width: 200, fontSize: 16, fill: '#111' });
    t.__objectId = uid('o');
    fabricCanvas.add(t).setActiveObject(t);
    emit('object.added', t);
    return t;
  }
  async function addImageFromFile(file) {
    if (!file) return;
    try {
      if (window.createImageBitmap) {
        const bitmap = await createImageBitmap(file);
        const c = document.createElement('canvas'); c.width = bitmap.width; c.height = bitmap.height; c.getContext('2d').drawImage(bitmap,0,0);
        const url = c.toDataURL('image/png');
        fabric.Image.fromURL(url, img => { img.set({ left:100, top:100 }); img.__objectId = uid('o'); fabricCanvas.add(img).setActiveObject(img); }, { crossOrigin:'anonymous' });
        return;
      }
      const blobUrl = URL.createObjectURL(file);
      fabric.Image.fromURL(blobUrl, img => { img.set({ left:100, top:100 }); img.__objectId = uid('o'); fabricCanvas.add(img).setActiveObject(img); URL.revokeObjectURL(blobUrl); }, { crossOrigin:'anonymous' });
    } catch(e) { console.error('addImage error', e); alert('Image upload failed'); }
  }

  // Render components list UI
  function renderComponentsList() {
    const out = $('#components-list');
    if (!out) return;
    const comps = load(KEYS.COMPONENTS, []);
    out.innerHTML = comps.map(c => `<div class="component-card"><div>${c.name}</div><div><button data-id="${c.id}" class="btn small comp-insert">Insert</button></div></div>`).join('') || '<div class="muted">No components</div>';
    qsa('.comp-insert').forEach(btn => btn.addEventListener('click', (e)=> insertComponentInstance(btn.dataset.id, { left: 140, top: 140 })));
  }

  // Expose editorAPI
  const editorAPI = {
    init, destroy,
    createComponentFromSelection, insertComponentInstance, updateComponent,
    getTokens, setTokens, exportTokensAsCSS,
    registerPlugin, loadDemoIconPlugin,
    addComment, renderComments,
    startRecording, stopRecording, generateHeatmapFromRecording,
    removeBackgroundActiveImage,
    broadcastOp,
    _internal: { fabricCanvas }
  };
  window.editorAPI = Object.assign(window.editorAPI || {}, editorAPI);

  // small internal object for handlers
  window.editorInternal = editorInternal;

})();
