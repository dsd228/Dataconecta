/* js/editor.js
   Versión completa y robusta del editor:
   - carga dinámica de Fabric.js si hace falta
   - subida de imágenes robusta (createImageBitmap / objectURL)
   - gestión de páginas/artboards (presets dispositivos)
   - quitar fondo on-device (flood-fill heurístico) con control de tolerancia
   - undo/redo, capas, props, export PNG/SVG
   Copia este archivo a js/editor.js en tu proyecto.
*/
(function () {
  // --- Utilities: dynamic script loader & color normalization ---
  function loadScript(src, timeout = 8000) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      let done = false;
      s.src = src;
      s.async = true;
      s.onload = () => { if (!done) { done = true; resolve(); } };
      s.onerror = () => { if (!done) { done = true; reject(new Error('Failed to load ' + src)); } };
      document.head.appendChild(s);
      setTimeout(() => { if (!done) { done = true; reject(new Error('Timeout loading ' + src)); } }, timeout);
    });
  }

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
      try {
        const cvs = document.createElement('canvas'); cvs.width = cvs.height = 1;
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#000'; ctx.fillStyle = value;
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
      } catch (e) {}
    } catch (e) {}
    return '#000000';
  }

  // --- Ensure Fabric is available (tries global, then CDNs) ---
  async function ensureFabricAvailable() {
    if (window.fabric) return window.fabric;
    // wait briefly for preloaded deferred script
    const waitShort = (ms) => new Promise(r => {
      const start = Date.now();
      (function poll() {
        if (window.fabric) return r(true);
        if (Date.now() - start > ms) return r(false);
        setTimeout(poll, 80);
      })();
    });
    const found = await waitShort(1200);
    if (found) return window.fabric;

    const cdns = [
      'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/4.6.0/fabric.min.js',
      'https://cdn.jsdelivr.net/npm/fabric@4.6.0/dist/fabric.min.js'
    ];
    let lastErr = null;
    for (let src of cdns) {
      try {
        await loadScript(src, 8000);
        const start = Date.now();
        while (!window.fabric && Date.now() - start < 2000) {
          await new Promise(r => setTimeout(r, 80));
        }
        if (window.fabric) {
          console.info('Fabric cargado desde', src);
          return window.fabric;
        } else {
          lastErr = new Error('Script cargado pero window.fabric no inicializó: ' + src);
        }
      } catch (err) {
        lastErr = err;
        console.warn('No se pudo cargar Fabric desde', src, err);
      }
    }
    throw lastErr || new Error('No se pudo cargar Fabric.js');
  }

  // --- Main editor initialization ---
  async function start() {
    try {
      await ensureFabricAvailable();
    } catch (err) {
      console.error('Fabric no disponible:', err);
      const viewEditor = document.getElementById('view-editor');
      if (viewEditor) {
        const p = document.createElement('p');
        p.style.color = 'red';
        p.textContent = 'Error: Fabric.js no se cargó. Revisa conexión/CDN.';
        viewEditor.querySelector('.panel')?.appendChild(p);
      }
      return;
    }

    if (window.__editorInitialized) return;
    window.__editorInitialized = true;

    // DOM refs
    const canvasEl = document.getElementById('canvas');
    const canvasWrap = document.getElementById('canvas-wrap');
    if (!canvasEl || !canvasWrap) { console.error('Faltan #canvas o #canvas-wrap'); return; }

    const fabricCanvas = new fabric.Canvas('canvas', {
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true
    });
    window.fabricCanvas = fabricCanvas;

    // device presets
    const devicePresets = [
      { id: 'desktop', name: 'Desktop (1440x900)', w: 1440, h: 900 },
      { id: 'laptop', name: 'Laptop (1366x768)', w: 1366, h: 768 },
      { id: 'tablet', name: 'Tablet (768x1024)', w: 768, h: 1024 },
      { id: 'mobile', name: 'Mobile (375x812)', w: 375, h: 812 }
    ];

    // pages
    let pages = [];
    let currentPage = -1;
    function savePages() { try { localStorage.setItem('editor:pages', JSON.stringify(pages)); } catch (e) { console.warn(e); } }
    function loadPages() { try { const j = localStorage.getItem('editor:pages'); if (!j) return; pages = JSON.parse(j) || []; } catch (e) { console.warn('Error loadPages', e); } }

    // resize canvas
    function resizeCanvas() {
      try {
        const rect = canvasWrap.getBoundingClientRect();
        const minW = 800, minH = 400;
        const w = Math.max(minW, Math.floor(rect.width));
        const h = Math.max(minH, Math.floor(rect.height));
        canvasEl.width = w; canvasEl.height = h;
        fabricCanvas.setWidth(w); fabricCanvas.setHeight(h);
        fabricCanvas.calcOffset(); fabricCanvas.requestRenderAll();
      } catch (e) { console.warn('resizeCanvas', e); }
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // zoom & history
    let currentZoom = 1;
    const zoomLevelEl = document.getElementById('zoom-level');
    function setZoom(z) { currentZoom = Math.max(0.1, Math.min(4, z)); fabricCanvas.setZoom(currentZoom); if (zoomLevelEl) zoomLevelEl.textContent = Math.round(currentZoom * 100) + '%'; fabricCanvas.requestRenderAll(); }

    const undoStack = [], redoStack = [], HISTORY_LIMIT = 80;
    function pushState() { try { undoStack.push(fabricCanvas.toJSON(['selectable'])); if (undoStack.length > HISTORY_LIMIT) undoStack.shift(); redoStack.length = 0; } catch (e) { console.warn(e); } }
    function restoreState(json) { if (!json) return; try { fabricCanvas.loadFromJSON(json, () => { fabricCanvas.renderAll(); refreshLayersList(); updateSelectedInfo(); }); } catch (e) { console.warn(e); } }
    function undo() { if (!undoStack.length) return; redoStack.push(fabricCanvas.toJSON()); const last = undoStack.pop(); restoreState(last); }
    function redo() { if (!redoStack.length) return; undoStack.push(fabricCanvas.toJSON()); const next = redoStack.pop(); restoreState(next); }

    // grid
    let gridShown = false, gridLines = [];
    function toggleGrid() {
      gridShown = !gridShown; gridLines.forEach(l => fabricCanvas.remove(l)); gridLines = [];
      if (gridShown) {
        const step = 20;
        for (let i = 0; i < fabricCanvas.width; i += step) {
          const line = new fabric.Line([i,0,i,fabricCanvas.height], { stroke: '#eee', selectable:false, evented:false, excludeFromExport:true });
          fabricCanvas.add(line); gridLines.push(line);
        }
        for (let j = 0; j < fabricCanvas.height; j += step) {
          const line = new fabric.Line([0,j,fabricCanvas.width,j], { stroke: '#eee', selectable:false, evented:false, excludeFromExport:true });
          fabricCanvas.add(line); gridLines.push(line);
        }
        gridLines.forEach(l => l.sendToBack());
      }
      fabricCanvas.requestRenderAll();
    }

    // layers UI
    const layersListEl = document.getElementById('layers-list');
    function refreshLayersList() {
      if (!layersListEl) return;
      layersListEl.innerHTML = '';
      const objs = fabricCanvas.getObjects().slice().reverse();
      objs.forEach(o => {
        const li = document.createElement('li');
        li.textContent = o.type + (o.text ? ' — ' + (o.text.length > 20 ? o.text.slice(0,20)+'…' : o.text) : '');
        if (fabricCanvas.getActiveObject() === o) li.classList.add('active');
        const right = document.createElement('div'); right.style.display='flex'; right.style.gap='6px';
        const eye = document.createElement('button'); eye.className='btn small'; eye.innerHTML = o.visible === false ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
        eye.addEventListener('click', (ev) => { ev.stopPropagation(); pushState(); o.set('visible', !o.visible); eye.innerHTML = o.visible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>'; fabricCanvas.requestRenderAll(); });
        right.appendChild(eye);
        li.appendChild(right);
        li.addEventListener('click', () => { fabricCanvas.setActiveObject(o); fabricCanvas.requestRenderAll(); });
        layersListEl.appendChild(li);
      });
    }

    // props panel
    const propText = document.getElementById('prop-text');
    const propFill = document.getElementById('prop-fill');
    const propStroke = document.getElementById('prop-stroke');
    const propFontsize = document.getElementById('prop-fontsize');
    const propWidth = document.getElementById('prop-width');
    const propHeight = document.getElementById('prop-height');
    const propAngle = document.getElementById('prop-angle');
    const propOpacity = document.getElementById('prop-opacity');
    const selSummary = document.getElementById('sel-summary');

    function safeColor(v) { try { return normalizeColor(v); } catch (e) { return '#000000'; } }
    function updateSelectedInfo() {
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
          propFill.value = safeColor(fillVal);
        }
      } catch (e) { if (propFill) propFill.value = '#000000'; }
      try { if (propStroke) propStroke.value = safeColor(obj.stroke || '#000000'); } catch (e) { if (propStroke) propStroke.value = '#000000'; }
      try { if (propFontsize && obj.fontSize) propFontsize.value = obj.fontSize; } catch (e) {}
      try { if (propWidth) propWidth.value = Math.round(obj.getScaledWidth()); } catch (e) {}
      try { if (propHeight) propHeight.value = Math.round(obj.getScaledHeight()); } catch (e) {}
      try { if (propAngle) propAngle.value = Math.round(obj.angle || 0); } catch (e) {}
      try { if (propOpacity) propOpacity.value = (obj.opacity != null ? obj.opacity : 1); } catch (e) {}
      refreshLayersList();
    }

    // props -> object bindings
    if (propText) propText.addEventListener('input', () => { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); if ('text' in o) { o.text = propText.value; o.set('text', propText.value); } fabricCanvas.requestRenderAll(); });
    if (propFill) propFill.addEventListener('input', () => { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); try { o.set('fill', normalizeColor(propFill.value)); } catch (e) { o.set('fill', propFill.value); } fabricCanvas.requestRenderAll(); });
    if (propStroke) propStroke.addEventListener('input', () => { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); try { o.set('stroke', normalizeColor(propStroke.value)); } catch (e) { o.set('stroke', propStroke.value); } fabricCanvas.requestRenderAll(); });
    if (propFontsize) propFontsize.addEventListener('input', () => { const o = fabricCanvas.getActiveObject(); if (!o || !('fontSize' in o)) return; pushState(); o.set('fontSize', parseInt(propFontsize.value, 10) || 12); fabricCanvas.requestRenderAll(); });
    if (propWidth) propWidth.addEventListener('change', () => { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); const w = parseFloat(propWidth.value) || o.width || 1; o.scaleX = w / (o.width || 1); o.setCoords(); fabricCanvas.requestRenderAll(); });
    if (propHeight) propHeight.addEventListener('change', () => { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); const h = parseFloat(propHeight.value) || o.height || 1; o.scaleY = h / (o.height || 1); o.setCoords(); fabricCanvas.requestRenderAll(); });
    if (propAngle) propAngle.addEventListener('change', () => { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); o.angle = parseFloat(propAngle.value) || 0; o.setCoords(); fabricCanvas.requestRenderAll(); });
    if (propOpacity) propOpacity.addEventListener('input', () => { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); o.opacity = parseFloat(propOpacity.value); fabricCanvas.requestRenderAll(); });

    fabricCanvas.on('selection:created', updateSelectedInfo);
    fabricCanvas.on('selection:updated', updateSelectedInfo);
    fabricCanvas.on('selection:cleared', updateSelectedInfo);
    fabricCanvas.on('object:modified', function () { pushState(); updateSelectedInfo(); refreshLayersList(); });
    fabricCanvas.on('object:added', function (e) { if (e.target && e.target.excludeFromExport) return; pushState(); refreshLayersList(); });
    fabricCanvas.on('object:removed', function () { pushState(); refreshLayersList(); });

    document.addEventListener('keydown', (ev) => {
      const mod = ev.ctrlKey || ev.metaKey;
      if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); undo(); return; }
      if (mod && (ev.key.toLowerCase() === 'y' || (ev.shiftKey && ev.key.toLowerCase() === 'z'))) { ev.preventDefault(); redo(); return; }
      if (ev.key === 'Delete' || ev.key === 'Backspace') { deleteSelection(); return; }
      if (mod && ev.key.toLowerCase() === 'd') { ev.preventDefault(); duplicateSelection(); return; }
      if (mod && ev.key.toLowerCase() === 'g') { ev.preventDefault(); groupSelection(); return; }
      if (mod && ev.shiftKey && ev.key.toLowerCase() === 'g') { ev.preventDefault(); ungroupSelection(); return; }
    });

    // create helpers
    function addRect() { pushState(); const rect = new fabric.Rect({ left: 40, top: 40, fill: '#4f46e5', width: 160, height: 100, rx: 6, ry: 6 }); fabricCanvas.add(rect).setActiveObject(rect); refreshLayersList(); }
    function addCircle() { pushState(); const c = new fabric.Circle({ left: 120, top: 120, radius: 50, fill: '#ef4444' }); fabricCanvas.add(c).setActiveObject(c); refreshLayersList(); }
    function addLine() { pushState(); const l = new fabric.Line([50, 50, 200, 50], { left: 50, top: 50, stroke: '#111111', strokeWidth: 2 }); fabricCanvas.add(l).setActiveObject(l); refreshLayersList(); }
    function addText() { pushState(); const t = new fabric.Textbox('Nuevo texto', { left: 80, top: 200, width: 240, fontSize: 18, fill: '#111827' }); fabricCanvas.add(t).setActiveObject(t); refreshLayersList(); }

    // --- Robust image upload ---
    async function addImageFromFile(file) {
      if (!file) return;
      pushState();
      try {
        if (window.createImageBitmap) {
          try {
            const bitmap = await createImageBitmap(file);
            const canvasForBlob = document.createElement('canvas');
            canvasForBlob.width = bitmap.width;
            canvasForBlob.height = bitmap.height;
            const ctx = canvasForBlob.getContext('2d');
            ctx.drawImage(bitmap, 0, 0);
            const MAX_DIM = 2048;
            let targetW = bitmap.width, targetH = bitmap.height;
            if (Math.max(targetW, targetH) > MAX_DIM) {
              const ratio = MAX_DIM / Math.max(targetW, targetH);
              targetW = Math.round(targetW * ratio);
              targetH = Math.round(targetH * ratio);
            }
            if (targetW !== canvasForBlob.width || targetH !== canvasForBlob.height) {
              const scaled = document.createElement('canvas');
              scaled.width = targetW; scaled.height = targetH;
              const sctx = scaled.getContext('2d');
              sctx.drawImage(canvasForBlob, 0, 0, targetW, targetH);
              const dataUrl = scaled.toDataURL('image/png');
              fabric.Image.fromURL(dataUrl, function (img) {
                img.set({ left: 100, top: 100, scaleX: 1, scaleY: 1 });
                fabricCanvas.add(img).setActiveObject(img);
                refreshLayersList();
              }, { crossOrigin: 'anonymous' });
              return;
            } else {
              const dataUrl = canvasForBlob.toDataURL('image/png');
              fabric.Image.fromURL(dataUrl, function (img) {
                img.set({ left: 100, top: 100, scaleX: 1, scaleY: 1 });
                fabricCanvas.add(img).setActiveObject(img);
                refreshLayersList();
              }, { crossOrigin: 'anonymous' });
              return;
            }
          } catch (e) {
            console.warn('createImageBitmap falló, usando objectURL', e);
          }
        }
        const url = URL.createObjectURL(file);
        fabric.Image.fromURL(url, function (img) {
          const MAX_DIM = 2048;
          let scale = 1;
          if (Math.max(img.width, img.height) > MAX_DIM) {
            scale = MAX_DIM / Math.max(img.width, img.height);
            img.scaleX = img.scaleY = scale;
          }
          img.set({ left: 100, top: 100 });
          fabricCanvas.add(img).setActiveObject(img);
          refreshLayersList();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        }, { crossOrigin: 'anonymous' });
      } catch (err) {
        console.error('addImageFromFile error', err);
        alert('No se pudo subir la imagen.');
      }
    }

    // --- Page / Artboard management ---
    function createArtboardRect(w, h, name) {
      const rect = new fabric.Rect({
        left: (fabricCanvas.getWidth() - w) / 2,
        top: (fabricCanvas.getHeight() - h) / 2,
        width: w,
        height: h,
        fill: '#ffffff',
        stroke: '#ddd',
        selectable: false,
        hoverCursor: 'default',
        customArtboard: true,
        originX: 'left',
        originY: 'top'
      });
      return rect;
    }

    function newPage(presetIdOrObject) {
      pushState();
      let preset = devicePresets.find(p => p.id === presetIdOrObject);
      if (!preset && typeof presetIdOrObject === 'object') preset = presetIdOrObject;
      if (!preset) preset = { name: 'Página', w: 1024, h: 768 };
      const page = { name: preset.name || 'Página', width: preset.w || 1024, height: preset.h || 768, json: null };
      pages.push(page);
      savePages();
      switchPage(pages.length - 1);
      renderPagesList();
    }

    function duplicatePage(index = currentPage) {
      if (index < 0 || index >= pages.length) return;
      const copy = Object.assign({}, pages[index], { name: pages[index].name + ' (copia)' });
      pages.splice(index + 1, 0, copy);
      savePages();
      renderPagesList();
      switchPage(index + 1);
    }

    function deletePage(index = currentPage) {
      if (pages.length <= 1) {
        if (!confirm('¿Eliminar la única página? Se reseteará.')) return;
      }
      pages.splice(index, 1);
      if (currentPage >= pages.length) currentPage = pages.length - 1;
      savePages();
      renderPagesList();
      switchPage(Math.max(0, currentPage));
    }

    function switchPage(index) {
      if (index < 0 || index >= pages.length) return;
      if (currentPage >= 0 && pages[currentPage]) {
        try { pages[currentPage].json = fabricCanvas.toJSON(); } catch (e) { console.warn(e); }
      }
      currentPage = index;
      fabricCanvas.clear();
      const page = pages[index];
      const artboard = createArtboardRect(page.width, page.height, page.name);
      fabricCanvas.add(artboard);
      if (page.json) {
        try {
          fabricCanvas.loadFromJSON(page.json, () => {
            const ab = fabricCanvas.getObjects().filter(o => o.customArtboard);
            ab.forEach(o => fabricCanvas.remove(o));
            const art = createArtboardRect(page.width, page.height, page.name);
            fabricCanvas.insertAt(art, 0);
            fabricCanvas.renderAll();
            refreshLayersList();
            updateSelectedInfo();
          });
        } catch (e) {
          console.warn('Error loading page JSON', e);
          fabricCanvas.renderAll();
        }
      } else {
        fabricCanvas.renderAll();
      }
      renderPagesList();
    }

    function renderPagesList() {
      const container = document.getElementById('pages-list');
      if (!container) return;
      container.innerHTML = '';
      pages.forEach((p, idx) => {
        const b = document.createElement('button');
        b.className = 'btn small';
        if (idx === currentPage) b.classList.add('primary');
        b.textContent = `${idx + 1}. ${p.name}`;
        b.addEventListener('click', () => switchPage(idx));
        const del = document.createElement('button'); del.className = 'btn tiny danger'; del.textContent = '✕';
        del.style.marginLeft = '6px';
        del.addEventListener('click', (ev) => { ev.stopPropagation(); if (confirm('Eliminar página?')) deletePage(idx); });
        const wrap = document.createElement('div'); wrap.style.display = 'flex'; wrap.style.alignItems = 'center'; wrap.style.marginBottom = '6px';
        wrap.appendChild(b); wrap.appendChild(del);
        container.appendChild(wrap);
      });
      const add = document.getElementById('btn-new-page');
      if (add) add.onclick = () => newPage('desktop');
    }

    function exportCurrentPagePNG() {
      const art = fabricCanvas.getObjects().find(o => o.customArtboard);
      if (!art) {
        const dataURL = fabricCanvas.toDataURL({ format: 'png', multiplier: 2 });
        downloadDataURL(dataURL, 'page.png');
        return;
      }
      const rect = art;
      try {
        const dataURL = fabricCanvas.toDataURL({
          format: 'png',
          multiplier: 2,
          left: rect.left,
          top: rect.top,
          width: rect.width * (rect.scaleX || 1),
          height: rect.height * (rect.scaleY || 1)
        });
        downloadDataURL(dataURL, (pages[currentPage]?.name || 'page') + '.png');
      } catch (e) {
        const dataURL = fabricCanvas.toDataURL({ format: 'png', multiplier: 2 });
        downloadDataURL(dataURL, 'page.png');
      }
    }

    function exportCurrentPageSVG() {
      try {
        const svg = fabricCanvas.toSVG();
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (pages[currentPage]?.name || 'page') + '.svg';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (e) { console.error('export svg', e); }
    }

    function downloadDataURL(dataURL, filename) {
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    // edit helpers
    function duplicateSelection() {
      const a = fabricCanvas.getActiveObject();
      if (!a) return;
      pushState();
      a.clone(function (cloned) {
        cloned.set({ left: (a.left || 0) + 20, top: (a.top || 0) + 20 });
        fabricCanvas.add(cloned);
        fabricCanvas.setActiveObject(cloned);
        refreshLayersList();
      });
    }
    function deleteSelection() {
      const a = fabricCanvas.getActiveObject();
      if (!a) return;
      pushState();
      if (a.type === 'activeSelection') a.forEachObject(o => fabricCanvas.remove(o)); else fabricCanvas.remove(a);
      fabricCanvas.discardActiveObject(); fabricCanvas.requestRenderAll(); refreshLayersList();
    }
    function groupSelection() { const s = fabricCanvas.getActiveObject(); if (!s || s.type !== 'activeSelection') return; pushState(); s.toGroup(); refreshLayersList(); }
    function ungroupSelection() { const a = fabricCanvas.getActiveObject(); if (a && a.type === 'group') { pushState(); a.toActiveSelection(); refreshLayersList(); } }
    function bringForward() { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); fabricCanvas.bringForward(o); refreshLayersList(); }
    function sendBackward() { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); fabricCanvas.sendBackwards(o); refreshLayersList(); }
    function lockToggle() { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); const locked = !!o.lockMovementX; o.set({ lockMovementX: !locked, lockMovementY: !locked, lockScalingX: !locked, lockScalingY: !locked, lockRotation: !locked, selectable: locked }); refreshLayersList(); }
    function centerSelected() { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); o.center(); o.setCoords(); fabricCanvas.requestRenderAll(); }

    // Wire UI
    function bind(id, fn) { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); }
    bind('btn-add-rect', addRect);
    bind('btn-add-circle', addCircle);
    bind('btn-add-line', addLine);
    bind('btn-add-text', addText);
    const imgIn = document.getElementById('editor-image-input');
    document.getElementById('btn-upload-image')?.addEventListener('click', () => imgIn?.click());
    if (imgIn) imgIn.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) addImageFromFile(f);
      e.target.value = '';
    });
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
    bind('btn-zoom-in', () => setZoom(currentZoom * 1.2));
    bind('btn-zoom-out', () => setZoom(currentZoom / 1.2));
    bind('btn-fit', () => setZoom(1));
    bind('btn-toggle-grid', toggleGrid);
    bind('btn-export-png', exportCurrentPagePNG);
    bind('btn-export-svg', exportCurrentPageSVG);
    bind('btn-save-json', () => {
      if (currentPage >= 0 && pages[currentPage]) {
        pages[currentPage].json = fabricCanvas.toJSON();
        savePages();
        alert('Página guardada en localStorage');
      } else {
        const json = fabricCanvas.toJSON();
        localStorage.setItem('editor:canvas', JSON.stringify(json));
        alert('Lienzo guardado en localStorage');
      }
    });
     // Bind simple para el botón Quitar fondo (usa editorAPI si está disponible)
document.getElementById('btn-remove-bg')?.addEventListener('click', async () => {
  const tolInput = document.getElementById('bg-tolerance');
  const tol = tolInput ? parseInt(tolInput.value, 10) || 32 : 32;
  if (window.editorAPI && typeof window.editorAPI.removeBackgroundActiveImage === 'function') {
    await window.editorAPI.removeBackgroundActiveImage(tol);
  } else {
    alert('Función de quitar fondo no disponible. Asegúrate de usar el js/editor.js completo que expone editorAPI.removeBackgroundActiveImage.');
  }
});
    bind('btn-load-json', () => { const f = document.getElementById('editor-file-json'); if (f) f.click(); });
    const fileJson = document.getElementById('editor-file-json');
    if (fileJson) fileJson.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) {
        const reader = new FileReader();
        reader.onload = function (ev) {
          try {
            const json = JSON.parse(ev.target.result);
            pushState();
            fabricCanvas.loadFromJSON(json, () => { fabricCanvas.renderAll(); refreshLayersList(); updateSelectedInfo(); });
          } catch (err) {
            alert('JSON inválido');
          }
        };
        reader.readAsText(f);
      }
      e.target.value = '';
    });
    bind('btn-reset', () => { setZoom(1); fabricCanvas.absolutePan({ x: 0, y: 0 }); fabricCanvas.renderAll(); });

    // panning with shift+drag
    let isPanning = false, lastPos = null;
    canvasWrap.addEventListener('pointerdown', (ev) => { if (ev.shiftKey) { isPanning = true; lastPos = { x: ev.clientX, y: ev.clientY }; ev.preventDefault(); } });
    document.addEventListener('pointermove', (ev) => {
      if (!isPanning) return;
      const dx = ev.clientX - lastPos.x; const dy = ev.clientY - lastPos.y;
      const v = fabricCanvas.viewportTransform;
      v[4] += dx; v[5] += dy;
      lastPos = { x: ev.clientX, y: ev.clientY };
      fabricCanvas.requestRenderAll();
    });
    document.addEventListener('pointerup', () => { isPanning = false; lastPos = null; });

    // initial pages load (migrate single-canvas storage if present)
    loadPages();
    if (!pages.length) pages.push({ name: 'Página 1', width: 1024, height: 768, json: null });
    try {
      const old = localStorage.getItem('editor:canvas');
      if (old && !pages[0].json) {
        pages[0].json = JSON.parse(old);
        savePages();
      }
    } catch (e) {}
    renderPagesList();

    // device select population
    const presetSelect = document.getElementById('device-select');
    if (presetSelect) {
      presetSelect.innerHTML = '';
      devicePresets.forEach(p => {
        const o = document.createElement('option');
        o.value = p.id; o.textContent = p.name;
        presetSelect.appendChild(o);
      });
    }
    document.getElementById('btn-add-artboard-from-preset')?.addEventListener('click', () => {
      const presetId = document.getElementById('device-select')?.value;
      newPage(presetId);
    });
    document.getElementById('btn-new-page')?.addEventListener('click', () => newPage('desktop'));

    switchPage(0);
    pushState();

    // public API
    window.editorAPI = {
      newPage, duplicatePage, deletePage, switchPage, exportCurrentPagePNG, exportCurrentPageSVG,
      addImageFromFile, addRect, addCircle, addLine, addText, getState: () => fabricCanvas.toJSON()
    };

    // wire topbar editor open button
    document.getElementById('btn-open-editor')?.addEventListener('click', () => {
      document.querySelectorAll('.view-panel').forEach(v => v.classList.add('hidden'));
      document.getElementById('view-editor')?.classList.remove('hidden');
      const pageTitle = document.getElementById('page-title');
      if (pageTitle) pageTitle.textContent = 'Editor';
      setTimeout(() => canvasEl.focus(), 120);
    });

    // ----------------- Background removal functions -----------------
    // Convert an Image/Canvas/Bitmap to ImageData with optional scaling
    async function imageToImageData(imgSource, maxDim = 2048) {
      const w = imgSource.width || imgSource.naturalWidth;
      const h = imgSource.height || imgSource.naturalHeight;
      let targetW = w, targetH = h;
      if (Math.max(w, h) > maxDim) {
        const ratio = maxDim / Math.max(w, h);
        targetW = Math.round(w * ratio);
        targetH = Math.round(h * ratio);
      }
      const c = document.createElement('canvas');
      c.width = targetW; c.height = targetH;
      const ctx = c.getContext('2d');
      ctx.drawImage(imgSource, 0, 0, targetW, targetH);
      return ctx.getImageData(0, 0, c.width, c.height);
    }

    // Flood-fill from edges to detect and remove bg of uniform-ish backgrounds
    function removeBackgroundFromImageData(imageData, tolerance = 32) {
      const w = imageData.width, h = imageData.height;
      const data = imageData.data;
      function similarColor(r1,g1,b1,r2,g2,b2, tol) {
        return Math.abs(r1-r2) <= tol && Math.abs(g1-g2) <= tol && Math.abs(b1-b2) <= tol;
      }
      const visited = new Uint8Array(w * h);
      const queue = [];
      function pushIf(idx) { if (!visited[idx]) { visited[idx] = 1; queue.push(idx); } }
      for (let x = 0; x < w; x++) { pushIf(x); pushIf((h-1)*w + x); }
      for (let y = 0; y < h; y++) { pushIf(y * w + 0); pushIf(y * w + (w-1)); }
      const sampleIdx = 0;
      const baseR = data[sampleIdx*4 + 0];
      const baseG = data[sampleIdx*4 + 1];
      const baseB = data[sampleIdx*4 + 2];
      function pushNeighbor(nx, ny) {
        const nindex = ny * w + nx;
        if (!visited[nindex]) { visited[nindex] = 1; queue.push(nindex); }
      }
      while (queue.length) {
        const idx = queue.shift();
        const px = idx % w;
        const py = Math.floor(idx / w);
        const offset = idx * 4;
        const r = data[offset + 0], g = data[offset + 1], b = data[offset + 2];
        if (similarColor(r,g,b, baseR, baseG, baseB, tolerance)) {
          data[offset + 3] = 0;
          if (px > 0) pushNeighbor(px-1, py);
          if (px < w-1) pushNeighbor(px+1, py);
          if (py > 0) pushNeighbor(px, py-1);
          if (py < h-1) pushNeighbor(px, py+1);
        }
      }
      const outCanvas = document.createElement('canvas');
      outCanvas.width = w; outCanvas.height = h;
      const outCtx = outCanvas.getContext('2d');
      outCtx.putImageData(imageData, 0, 0);
      return outCanvas.toDataURL('image/png');
    }

    async function removeBackgroundFromFileOrImage(source, tolerance = 32, maxDim = 2048) {
      try {
        let imgEl = null;
        if (source instanceof File) {
          if (window.createImageBitmap) {
            try {
              const bitmap = await createImageBitmap(source);
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = bitmap.width; tempCanvas.height = bitmap.height;
              const tctx = tempCanvas.getContext('2d');
              tctx.drawImage(bitmap, 0, 0);
              const imageData = await imageToImageData(tempCanvas, maxDim);
              return removeBackgroundFromImageData(imageData, tolerance);
            } catch (e) {
              console.warn('createImageBitmap failed, using objectURL', e);
            }
          }
          const url = URL.createObjectURL(source);
          imgEl = await new Promise((res, rej) => {
            const im = new Image(); im.crossOrigin = 'anonymous';
            im.onload = () => res(im); im.onerror = (err) => { URL.revokeObjectURL(url); rej(err); };
            im.src = url;
          });
          const imageData = await imageToImageData(imgEl, maxDim);
          if (imgEl.src && imgEl.src.startsWith('blob:')) URL.revokeObjectURL(imgEl.src);
          return removeBackgroundFromImageData(imageData, tolerance);
        } else if (source instanceof HTMLImageElement || source instanceof ImageBitmap || source instanceof HTMLCanvasElement) {
          const imageData = await imageToImageData(source, maxDim);
          return removeBackgroundFromImageData(imageData, tolerance);
        } else {
          throw new Error('Tipo de fuente no soportado');
        }
      } catch (err) { console.error('removeBackgroundFromFileOrImage error', err); throw err; }
    }

    async function removeBackgroundActiveImage(tolerance = 32) {
      if (!window.fabricCanvas) throw new Error('fabricCanvas no definido');
      const active = fabricCanvas.getActiveObject();
      if (!active || active.type !== 'image') {
        alert('Selecciona primero una imagen en el lienzo.');
        return;
      }
      try {
        let imgEl = active._element || null;
        if (!imgEl) {
          const url = active.toDataURL({ format: 'png' });
          imgEl = await new Promise((res, rej) => {
            const im = new Image(); im.crossOrigin = 'anonymous';
            im.onload = () => res(im); im.onerror = (e) => rej(e);
            im.src = url;
          });
        }
        const prevCursor = document.body.style.cursor; document.body.style.cursor = 'wait';
        const dataUrl = await removeBackgroundFromFileOrImage(imgEl, tolerance, 2048);
        fabric.Image.fromURL(dataUrl, function (newImg) {
          newImg.set({
            left: active.left,
            top: active.top,
            angle: active.angle,
            scaleX: active.scaleX,
            scaleY: active.scaleY,
            originX: active.originX || 'left',
            originY: active.originY || 'top'
          });
          try { pushState(); } catch (_) {}
          fabricCanvas.remove(active);
          fabricCanvas.add(newImg);
          fabricCanvas.setActiveObject(newImg);
          fabricCanvas.requestRenderAll();
          refreshLayersList();
          document.body.style.cursor = prevCursor;
          alert('Fondo eliminado (resultado aproximado).');
        }, { crossOrigin: 'anonymous' });
      } catch (err) {
        console.error('Error quitando fondo:', err);
        document.body.style.cursor = 'default';
        alert('No fue posible quitar el fondo de esta imagen (prueba otra o aumenta la tolerancia).');
      }
    }

    // Wire remove background UI
    document.getElementById('btn-remove-bg')?.addEventListener('click', async () => {
      const tolInput = document.getElementById('bg-tolerance');
      const tol = tolInput ? parseInt(tolInput.value, 10) : 32;
      await removeBackgroundActiveImage(tol);
    });

    // expose removeBackground via API
    if (window.editorAPI) window.editorAPI.removeBackgroundActiveImage = removeBackgroundActiveImage;
    else window.editorAPI = { removeBackgroundActiveImage };

    console.info('Editor inicializado con soporte de páginas, subida de imágenes y quitar fondo.');
  } // end start

  if (document.readyState !== 'loading') start(); else document.addEventListener('DOMContentLoaded', start);
})();
