/* js/editor.js
   Carga dinámica y robusta de Fabric.js + inicialización del editor.
   - Si window.fabric ya existe, inicializa inmediatamente.
   - Si no existe, intenta cargar desde CDNs (cdnjs -> jsDelivr) y espera onload.
   - Si ninguna carga funciona muestra mensaje claro en la UI.
   Reemplaza tu js/editor.js por este archivo.
*/
(function () {
  // Util: cargar un script dinámicamente y resolver onload/onerror
  function loadScript(src, timeout = 8000) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      let done = false;
      s.src = src;
      s.async = true;
      s.onload = () => { if (!done) { done = true; resolve(); } };
      s.onerror = () => { if (!done) { done = true; reject(new Error('Failed to load ' + src)); } };
      document.head.appendChild(s);
      // timeout guard
      setTimeout(() => { if (!done) { done = true; reject(new Error('Timeout loading ' + src)); } }, timeout);
    });
  }

  // Normalize color (de versiones anteriores)
  function normalizeColor(value) {
    try {
      if (!value) return '#000000';
      if (typeof value !== 'string') return '#000000';
      value = value.trim();
      if (value[0] === '#') {
        if (value.length === 4) {
          const r = value[1], g = value[2], b = value[3];
          return ('#' + r + r + g + g + b + b).toLowerCase();
        }
        return value.slice(0, 7).toLowerCase();
      }
      const rgbMatch = value.match(/rgba?\s*\(\s*([0-9.]+)[^\d]*([0-9.]+)[^\d]*([0-9.]+)/i);
      if (rgbMatch) {
        const r = Math.max(0, Math.min(255, parseInt(rgbMatch[1], 10) || 0));
        const g = Math.max(0, Math.min(255, parseInt(rgbMatch[2], 10) || 0));
        const b = Math.max(0, Math.min(255, parseInt(rgbMatch[3], 10) || 0));
        const toHex = (n) => ('0' + n.toString(16)).slice(-2);
        return ('#' + toHex(r) + toHex(g) + toHex(b)).toLowerCase();
      }
      // fallback via canvas
      try {
        const cvs = document.createElement('canvas');
        cvs.width = cvs.height = 1;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillStyle = value;
        const computed = ctx.fillStyle;
        if (typeof computed === 'string') {
          if (computed[0] === '#') {
            if (computed.length === 7) return computed.toLowerCase();
            if (computed.length === 4) {
              const r = computed[1], g = computed[2], b = computed[3];
              return ('#' + r + r + g + g + b + b).toLowerCase();
            }
          }
          const m = computed.match(/rgba?\s*\(\s*([0-9.]+)[^\d]*([0-9.]+)[^\d]*([0-9.]+)/i);
          if (m) {
            const r = Math.max(0, Math.min(255, parseInt(m[1], 10) || 0));
            const g = Math.max(0, Math.min(255, parseInt(m[2], 10) || 0));
            const b = Math.max(0, Math.min(255, parseInt(m[3], 10) || 0));
            const toHex = (n) => ('0' + n.toString(16)).slice(-2);
            return ('#' + toHex(r) + toHex(g) + toHex(b)).toLowerCase();
          }
        }
      } catch (e) { /* ignore */ }
    } catch (e) { /* ignore */ }
    return '#000000';
  }

  // Espera natively a fabric o intenta cargarlo
  function ensureFabricAvailable() {
    return new Promise((resolve, reject) => {
      if (window.fabric) return resolve(window.fabric);

      // Primero, si hay una etiqueta <script src="...fabric..."> pendiente con defer, esperar un poco
      const waitForExisting = (waitMs = 1200) => new Promise((res) => {
        const start = Date.now();
        (function poll() {
          if (window.fabric) return res(true);
          if (Date.now() - start > waitMs) return res(false);
          setTimeout(poll, 80);
        })();
      });

      (async function attempt() {
        try {
          const found = await waitForExisting(1200);
          if (found) return resolve(window.fabric);

          // Intentar cargar desde CDN principal y fallback en cadena
          const cdns = [
            'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/4.6.0/fabric.min.js',
            'https://cdn.jsdelivr.net/npm/fabric@4.6.0/dist/fabric.min.js'
          ];
          let lastErr = null;
          for (let i = 0; i < cdns.length; i++) {
            try {
              await loadScript(cdns[i], 8000);
              // esperar muy brevemente a que el script establezca window.fabric
              const start = Date.now();
              while (!window.fabric && Date.now() - start < 2000) {
                await new Promise(r => setTimeout(r, 80));
              }
              if (window.fabric) {
                console.info('Fabric cargado desde ' + cdns[i]);
                return resolve(window.fabric);
              } else {
                lastErr = new Error('Script cargado pero window.fabric no inicializó: ' + cdns[i]);
              }
            } catch (err) {
              lastErr = err;
              console.warn('No se pudo cargar Fabric desde', cdns[i], err);
            }
          }
          // Si llegamos aquí, nada funcionó
          return reject(lastErr || new Error('No se pudo cargar Fabric.js desde CDNs'));
        } catch (e) {
          return reject(e);
        }
      })();
    });
  }

  // Inicializador principal del editor (toda la lógica existente)
  function initEditor() {
    // Evitar doble inicialización
    if (window.__editorInitialized) {
      console.warn('Editor: ya inicializado');
      return;
    }
    window.__editorInitialized = true;

    // Elementos DOM requeridos
    const canvasEl = document.getElementById('canvas');
    const canvasWrap = document.getElementById('canvas-wrap');
    if (!canvasEl || !canvasWrap) {
      console.error('Editor: faltan #canvas o #canvas-wrap en el DOM');
      return;
    }

    const fabricCanvas = new fabric.Canvas('canvas', {
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true
    });
    window.fabricCanvas = fabricCanvas;

    // Resize
    function resizeCanvas() {
      try {
        const rect = canvasWrap.getBoundingClientRect();
        const w = Math.max(800, Math.floor(rect.width));
        const h = Math.max(400, Math.floor(rect.height));
        canvasEl.width = w; canvasEl.height = h;
        fabricCanvas.setWidth(w); fabricCanvas.setHeight(h);
        fabricCanvas.calcOffset(); fabricCanvas.requestRenderAll();
      } catch (e) { console.warn('resizeCanvas error', e); }
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Estado, helpers y funciones (resumido pero funcional)
    let currentZoom = 1;
    const zoomLevelEl = document.getElementById('zoom-level');
    const selSummary = document.getElementById('sel-summary');

    function setZoom(z) { currentZoom = Math.max(0.1, Math.min(4, z)); fabricCanvas.setZoom(currentZoom); if (zoomLevelEl) zoomLevelEl.textContent = Math.round(currentZoom * 100) + '%'; fabricCanvas.requestRenderAll(); }

    const undoStack = [], redoStack = [];
    function pushState() { try { undoStack.push(fabricCanvas.toJSON(['selectable'])); if (undoStack.length > 60) undoStack.shift(); redoStack.length = 0; } catch (e) { console.warn(e); } }
    function restoreState(j) { if (!j) return; try { fabricCanvas.loadFromJSON(j, () => { fabricCanvas.renderAll(); refreshLayersList(); updateSelectedInfo(); }); } catch (e) { console.warn(e); } }
    function undo() { if (!undoStack.length) return; redoStack.push(fabricCanvas.toJSON()); const last = undoStack.pop(); restoreState(last); }
    function redo() { if (!redoStack.length) return; undoStack.push(fabricCanvas.toJSON()); const next = redoStack.pop(); restoreState(next); }

    let gridShown = false, gridLines = [];
    function toggleGrid() { gridShown = !gridShown; gridLines.forEach(l => fabricCanvas.remove(l)); gridLines = []; if (gridShown) { const step = 20; for (let i = 0; i < fabricCanvas.width; i += step) { const line = new fabric.Line([i,0,i,fabricCanvas.height], { stroke:'#eee', selectable:false, evented:false, excludeFromExport:true }); fabricCanvas.add(line); gridLines.push(line); } for (let j=0;j<fabricCanvas.height;j+=step){ const line = new fabric.Line([0,j,fabricCanvas.width,j], { stroke:'#eee', selectable:false, evented:false, excludeFromExport:true }); fabricCanvas.add(line); gridLines.push(line);} gridLines.forEach(l=>l.sendToBack()); } fabricCanvas.requestRenderAll(); }

    // Creación básica (usar hex de 6 dígitos)
    function addRect(){ pushState(); const rect=new fabric.Rect({ left:40, top:40, fill:'#4f46e5', width:160, height:100, rx:6, ry:6 }); fabricCanvas.add(rect).setActiveObject(rect); refreshLayersList(); }
    function addCircle(){ pushState(); const c=new fabric.Circle({ left:120, top:120, radius:50, fill:'#ef4444' }); fabricCanvas.add(c).setActiveObject(c); refreshLayersList(); }
    function addLine(){ pushState(); const l=new fabric.Line([50,50,200,50], { left:50, top:50, stroke:'#111111', strokeWidth:2 }); fabricCanvas.add(l).setActiveObject(l); refreshLayersList(); }
    function addText(){ pushState(); const t=new fabric.Textbox('Nuevo texto', { left:80, top:200, width:240, fontSize:18, fill:'#111827' }); fabricCanvas.add(t).setActiveObject(t); refreshLayersList(); }

    function addImageFromFile(file) {
      if (!file) return;
      pushState();
      const reader = new FileReader();
      reader.onload = function (e) {
        fabric.Image.fromURL(e.target.result, function (img) {
          img.set({ left:100, top:100, scaleX:0.5, scaleY:0.5 });
          fabricCanvas.add(img).setActiveObject(img);
          refreshLayersList();
        }, { crossOrigin: 'anonymous' });
      };
      reader.readAsDataURL(file);
    }

    // Duplicar/eliminar/agrupaciones/orden
    function duplicateSelection(){ const a=fabricCanvas.getActiveObject(); if(!a) return; pushState(); a.clone(function(c){ c.set({ left:(a.left||0)+20, top:(a.top||0)+20 }); fabricCanvas.add(c); fabricCanvas.setActiveObject(c); refreshLayersList(); }); }
    function deleteSelection(){ const a=fabricCanvas.getActiveObject(); if(!a) return; pushState(); if (a.type === 'activeSelection') a.forEachObject(o=>fabricCanvas.remove(o)); else fabricCanvas.remove(a); fabricCanvas.discardActiveObject(); fabricCanvas.requestRenderAll(); refreshLayersList(); }
    function groupSelection(){ const s=fabricCanvas.getActiveObject(); if(!s||s.type!=='activeSelection') return; pushState(); s.toGroup(); refreshLayersList(); }
    function ungroupSelection(){ const a=fabricCanvas.getActiveObject(); if(a && a.type==='group'){ pushState(); a.toActiveSelection(); refreshLayersList(); } }
    function bringForward(){ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); fabricCanvas.bringForward(o); refreshLayersList(); }
    function sendBackward(){ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); fabricCanvas.sendBackwards(o); refreshLayersList(); }
    function lockToggle(){ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); const locked = !!o.lockMovementX; o.set({ lockMovementX:!locked, lockMovementY:!locked, lockScalingX:!locked, lockScalingY:!locked, lockRotation:!locked, selectable: locked }); refreshLayersList(); }
    function centerSelected(){ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); o.center(); o.setCoords(); fabricCanvas.requestRenderAll(); }

    // Export/save
    function exportPNG(){ try { const d = fabricCanvas.toDataURL({ format:'png', multiplier:2 }); const a=document.createElement('a'); a.href=d; a.download='canvas.png'; document.body.appendChild(a); a.click(); a.remove(); } catch(e) { console.error(e); } }
    function exportSVG(){ try { const svg = fabricCanvas.toSVG(); const blob = new Blob([svg], { type:'image/svg+xml' }); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='canvas.svg'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); } catch(e){ console.error(e); } }
    function saveJSON(){ try { localStorage.setItem('editor:canvas', JSON.stringify(fabricCanvas.toJSON())); alert('Lienzo guardado en localStorage'); } catch(e) { console.error(e); } }
    function loadJSONFile(file){ if(!file) return; const r=new FileReader(); r.onload=function(ev){ try{ const j=JSON.parse(ev.target.result); pushState(); fabricCanvas.loadFromJSON(j, ()=>{ fabricCanvas.renderAll(); refreshLayersList(); updateSelectedInfo(); }); } catch(e){ alert('Archivo JSON inválido'); } }; r.readAsText(file); }
    function loadFromLocalStorage(){ try{ const j = localStorage.getItem('editor:canvas'); if(!j) return; fabricCanvas.loadFromJSON(JSON.parse(j), ()=>{ fabricCanvas.renderAll(); refreshLayersList(); }); } catch(e){ console.warn('loadFromLocalStorage failed', e); } }

    // Layers panel
    const layersListEl = document.getElementById('layers-list');
    function refreshLayersList(){ if(!layersListEl) return; layersListEl.innerHTML=''; const objs = fabricCanvas.getObjects().slice().reverse(); objs.forEach(o => { const li = document.createElement('li'); li.textContent = o.type + (o.text ? ' — ' + (o.text.length>20 ? o.text.slice(0,20)+'…' : o.text) : ''); if (fabricCanvas.getActiveObject()===o) li.classList.add('active'); const right=document.createElement('div'); right.style.display='flex'; right.style.gap='6px'; const eye=document.createElement('button'); eye.className='btn small'; eye.innerHTML = o.visible === false ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>'; eye.addEventListener('click', (ev)=>{ ev.stopPropagation(); pushState(); o.set('visible', !o.visible); eye.innerHTML = o.visible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>'; fabricCanvas.requestRenderAll(); }); right.appendChild(eye); li.appendChild(right); li.addEventListener('click', ()=>{ fabricCanvas.setActiveObject(o); fabricCanvas.requestRenderAll(); }); layersListEl.appendChild(li); }); }

    // Properties panel
    const propText = document.getElementById('prop-text');
    const propFill = document.getElementById('prop-fill');
    const propStroke = document.getElementById('prop-stroke');
    const propFontsize = document.getElementById('prop-fontsize');
    const propWidth = document.getElementById('prop-width');
    const propHeight = document.getElementById('prop-height');
    const propAngle = document.getElementById('prop-angle');
    const propOpacity = document.getElementById('prop-opacity');

    function safeGetColor(v) { try { return normalizeColor(v); } catch(e) { return '#000000'; } }

    function updateSelectedInfo(){
      const obj = fabricCanvas.getActiveObject();
      if (!obj) {
        if (selSummary) selSummary.textContent = 'Ninguno';
        if (propText) propText.value = '';
        if (propFill) propFill.value = '#000000';
        if (propStroke) propStroke.value = '#000000';
        return;
      }
      if (selSummary) selSummary.textContent = obj.type + (obj.text ? ' — "' + (obj.text).slice(0,30) + '"' : '');
      if (propText && ('text' in obj)) propText.value = obj.text || '';
      try {
        if (propFill) {
          const fillVal = (obj.fill && typeof obj.fill === 'string') ? obj.fill : (obj.fill && obj.fill.colorStops ? (obj.fill.colorStops[0] && obj.fill.colorStops[0].color) : null);
          propFill.value = safeGetColor(fillVal);
        }
      } catch(e){ if (propFill) propFill.value = '#000000'; }
      try { if (propStroke) propStroke.value = safeGetColor(obj.stroke || '#000000'); } catch(e){ if (propStroke) propStroke.value = '#000000'; }
      try { if (propFontsize && obj.fontSize) propFontsize.value = obj.fontSize; } catch(e){}
      try { if (propWidth) propWidth.value = Math.round(obj.getScaledWidth()); } catch(e){}
      try { if (propHeight) propHeight.value = Math.round(obj.getScaledHeight()); } catch(e){}
      try { if (propAngle) propAngle.value = Math.round(obj.angle || 0); } catch(e){}
      try { if (propOpacity) propOpacity.value = (obj.opacity != null ? obj.opacity : 1); } catch(e){}
      refreshLayersList();
    }

    // Prop bindings
    if (propText) propText.addEventListener('input', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); if('text' in o){ o.text = propText.value; o.set('text', propText.value); } fabricCanvas.requestRenderAll(); });
    if (propFill) propFill.addEventListener('input', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); try{ o.set('fill', normalizeColor(propFill.value)); } catch(e){ o.set('fill', propFill.value); } fabricCanvas.requestRenderAll(); });
    if (propStroke) propStroke.addEventListener('input', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); try{ o.set('stroke', normalizeColor(propStroke.value)); } catch(e){ o.set('stroke', propStroke.value); } fabricCanvas.requestRenderAll(); });
    if (propFontsize) propFontsize.addEventListener('input', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o||!('fontSize' in o)) return; pushState(); o.set('fontSize', parseInt(propFontsize.value,10)||12); fabricCanvas.requestRenderAll(); });
    if (propWidth) propWidth.addEventListener('change', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); const w=parseFloat(propWidth.value)||o.width||1; o.scaleX = w/(o.width||1); o.setCoords(); fabricCanvas.requestRenderAll(); });
    if (propHeight) propHeight.addEventListener('change', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); const h=parseFloat(propHeight.value)||o.height||1; o.scaleY = h/(o.height||1); o.setCoords(); fabricCanvas.requestRenderAll(); });
    if (propAngle) propAngle.addEventListener('change', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); o.angle = parseFloat(propAngle.value)||0; o.setCoords(); fabricCanvas.requestRenderAll(); });
    if (propOpacity) propOpacity.addEventListener('input', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); o.opacity = parseFloat(propOpacity.value); fabricCanvas.requestRenderAll(); });

    // Canvas events
    fabricCanvas.on('selection:created', updateSelectedInfo);
    fabricCanvas.on('selection:updated', updateSelectedInfo);
    fabricCanvas.on('selection:cleared', updateSelectedInfo);
    fabricCanvas.on('object:modified', ()=>{ pushState(); updateSelectedInfo(); refreshLayersList(); });
    fabricCanvas.on('object:added', (e)=>{ if (e.target && e.target.excludeFromExport) return; pushState(); refreshLayersList(); });
    fabricCanvas.on('object:removed', ()=>{ pushState(); refreshLayersList(); });

    // Keyboard shortcuts
    document.addEventListener('keydown', (ev) => {
      const mod = ev.ctrlKey || ev.metaKey;
      if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); undo(); return; }
      if (mod && (ev.key.toLowerCase() === 'y' || (ev.shiftKey && ev.key.toLowerCase() === 'z'))) { ev.preventDefault(); redo(); return; }
      if (ev.key === 'Delete' || ev.key === 'Backspace') { deleteSelection(); return; }
      if (mod && ev.key.toLowerCase() === 'd') { ev.preventDefault(); duplicateSelection(); return; }
      if (mod && ev.key.toLowerCase() === 'g') { ev.preventDefault(); groupSelection(); return; }
      if (mod && ev.shiftKey && ev.key.toLowerCase() === 'g') { ev.preventDefault(); ungroupSelection(); return; }
    });

    // UI bindings (defensivo)
    function bind(id, fn) { const el=document.getElementById(id); if(el) el.addEventListener('click', fn); }
    bind('btn-add-rect', addRect);
    bind('btn-add-circle', addCircle);
    bind('btn-add-line', addLine);
    bind('btn-add-text', addText);
    const imgIn = document.getElementById('editor-image-input');
    if (imgIn) imgIn.addEventListener('change', (e)=>{ const f = e.target.files && e.target.files[0]; if(f) addImageFromFile(f); e.target.value = ''; });
    bind('btn-duplicate', duplicateSelection);
    bind('btn-delete', deleteSelection);
    bind('btn-group', groupSelection);
    bind('btn-ungroup', ungroupSelection);
    bind('btn-bring-forward', bringForward);
    bind('btn-send-backward', sendBackward);
    bind('btn-lock', lockToggle);
    bind('btn-center', centerSelected);
    bind('btn-undo', undo);
    bind('btn-redo', redo);
    bind('btn-zoom-in', ()=>setZoom(currentZoom * 1.2));
    bind('btn-zoom-out', ()=>setZoom(currentZoom / 1.2));
    bind('btn-fit', ()=>{ try { const objs = fabricCanvas.getObjects(); if (!objs.length) { setZoom(1); return; } const bounds = objs.map(o=>o.getBoundingRect()); const minX = Math.min(...bounds.map(b=>b.left)); const maxW = Math.max(...bounds.map(b=>b.left + b.width)) - minX; const minY = Math.min(...bounds.map(b=>b.top)); const maxH = Math.max(...bounds.map(b=>b.top + b.height)) - minY; const wRatio = fabricCanvas.getWidth() / maxW; const hRatio = fabricCanvas.getHeight() / maxH; const z = Math.max(0.1, Math.min(2, Math.min(wRatio, hRatio) * 0.9)); setZoom(z); } catch(e) { setZoom(1); } });
    bind('btn-toggle-grid', toggleGrid);
    bind('btn-export-png', exportPNG);
    bind('btn-export-svg', exportSVG);
    bind('btn-save-json', saveJSON);
    bind('btn-load-json', ()=>{ const f = document.getElementById('editor-file-json'); if (f) f.click(); });
    const fileJson = document.getElementById('editor-file-json');
    if (fileJson) fileJson.addEventListener('change', (e)=>{ const f = e.target.files && e.target.files[0]; if (f) loadJSONFile(f); e.target.value = ''; });
    bind('btn-reset', ()=>{ setZoom(1); fabricCanvas.absolutePan({ x:0, y:0 }); fabricCanvas.renderAll(); });

    // Panning con Shift + drag
    let isPanning=false, lastPos=null;
    canvasWrap.addEventListener('pointerdown', (ev)=>{ if(ev.shiftKey){ isPanning=true; lastPos={x:ev.clientX,y:ev.clientY}; ev.preventDefault(); }});
    document.addEventListener('pointermove', (ev)=>{ if(!isPanning) return; const dx = ev.clientX - lastPos.x; const dy = ev.clientY - lastPos.y; const v = fabricCanvas.viewportTransform; v[4] += dx; v[5] += dy; lastPos={x:ev.clientX,y:ev.clientY}; fabricCanvas.requestRenderAll(); });
    document.addEventListener('pointerup', ()=>{ isPanning=false; lastPos=null; });

    // Inicializar UI
    refreshLayersList();
    loadFromLocalStorage();
    try { pushState(); } catch(e){}

    // Exponer utilidades
    window.getEditorState = function () { try { return JSON.stringify(fabricCanvas.toJSON()); } catch(e) { return null; } };
    window.openEditorForProject = function (projectId) { const btn = document.getElementById('btn-open-editor'); if (btn) btn.click(); console.log('Editor opened for project:', projectId); };

    console.info('Editor inicializado correctamente.');
  } // end initEditor

  // Arranque: esperar DOMContentLoaded, luego asegurar Fabric, luego initEditor
  if (document.readyState !== 'loading') {
    ensureStart();
  } else {
    document.addEventListener('DOMContentLoaded', ensureStart);
  }

  function ensureStart() {
    ensureFabricAvailable().then(() => {
      // fabric listo
      initEditor();
    }).catch((err) => {
      console.error('No se pudo inicializar el editor porque Fabric.js no está disponible:', err);
      // mostrar mensaje claro en la vista del editor
      const viewEditor = document.getElementById('view-editor');
      if (viewEditor) {
        const p = document.createElement('p');
        p.style.color = 'red';
        p.style.marginTop = '8px';
        p.textContent = 'Error: Fabric.js no se cargó. Comprueba conexión o bloqueo de CDN. (Ver consola para más detalles)';
        viewEditor.querySelector('.panel')?.appendChild(p);
      }
    });
  }
})();
