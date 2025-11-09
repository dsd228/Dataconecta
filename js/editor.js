/* js/editor.js
   Editor robusto con:
   - carga dinámica de Fabric.js si hace falta,
   - subida de imágenes robusta,
   - gestión de páginas/artboards (presets dispositivos),
   - undo/redo, capas, props, export.
   Reemplaza el archivo js/editor.js existente por este.
*/
(function () {
  // ---------- Helpers for script loading & color normalization ----------
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
      // fallback: draw to canvas
      try {
        const cvs = document.createElement('canvas'); cvs.width = cvs.height = 1;
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
      } catch (e) {}
    } catch (e) {}
    return '#000000';
  }

  // ---------- Ensure Fabric is available (load CDNs if needed) ----------
  function ensureFabricAvailable() {
    return new Promise(async (resolve, reject) => {
      if (window.fabric) return resolve(window.fabric);
      // wait briefly for any existing deferred script
      const waitShort = (ms) => new Promise(r => {
        const start = Date.now();
        (function poll() {
          if (window.fabric) return r(true);
          if (Date.now() - start > ms) return r(false);
          setTimeout(poll, 80);
        })();
      });
      const found = await waitShort(1200);
      if (found) return resolve(window.fabric);

      const cdns = [
        'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/4.6.0/fabric.min.js',
        'https://cdn.jsdelivr.net/npm/fabric@4.6.0/dist/fabric.min.js'
      ];
      let lastErr = null;
      for (let src of cdns) {
        try {
          await loadScript(src, 8000);
          // wait small time for global
          const start = Date.now();
          while (!window.fabric && Date.now() - start < 2000) {
            await new Promise(r => setTimeout(r, 80));
          }
          if (window.fabric) {
            console.info('Fabric cargado desde', src);
            return resolve(window.fabric);
          } else {
            lastErr = new Error('Script cargado pero window.fabric no inicializó: ' + src);
          }
        } catch (err) {
          lastErr = err;
          console.warn('No se pudo cargar Fabric desde', src, err);
        }
      }
      reject(lastErr || new Error('No se pudo cargar Fabric.js'));
    });
  }

  // ---------- Editor implementation ----------
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

    // Avoid double init
    if (window.__editorInitialized) return;
    window.__editorInitialized = true;

    // DOM refs
    const canvasEl = document.getElementById('canvas');
    const canvasWrap = document.getElementById('canvas-wrap');
    if (!canvasEl || !canvasWrap) {
      console.error('Faltan elementos #canvas o #canvas-wrap');
      return;
    }

    const fabricCanvas = new fabric.Canvas('canvas', {
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true
    });
    window.fabricCanvas = fabricCanvas;

    // Presets de dispositivos / artboards
    const devicePresets = [
      { id: 'desktop', name: 'Desktop (1440x900)', w: 1440, h: 900 },
      { id: 'laptop', name: 'Laptop (1366x768)', w: 1366, h: 768 },
      { id: 'tablet', name: 'Tablet (768x1024)', w: 768, h: 1024 },
      { id: 'mobile', name: 'Mobile (375x812)', w: 375, h: 812 }
    ];

    // Páginas/artboards state
    let pages = []; // each page: { name, width, height, json } (json null => blank)
    let currentPage = -1;

    // Utility: persist pages
    function savePages() {
      try {
        localStorage.setItem('editor:pages', JSON.stringify(pages));
      } catch (e) { console.warn('No se pudo guardar pages', e); }
    }
    function loadPages() {
      try {
        const j = localStorage.getItem('editor:pages');
        if (!j) return;
        pages = JSON.parse(j) || [];
      } catch (e) {
        console.warn('Error loadPages', e);
      }
    }

    // Canvas resizing to wrapper
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

    // Zoom & history
    let currentZoom = 1;
    const zoomLevelEl = document.getElementById('zoom-level');
    function setZoom(z) { currentZoom = Math.max(0.1, Math.min(4, z)); fabricCanvas.setZoom(currentZoom); if (zoomLevelEl) zoomLevelEl.textContent = Math.round(currentZoom * 100) + '%'; fabricCanvas.requestRenderAll(); }

    const undoStack = [], redoStack = [];
    const HISTORY_LIMIT = 80;
    function pushState() {
      try {
        undoStack.push(fabricCanvas.toJSON(['selectable']));
        if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
        redoStack.length = 0;
      } catch (e) { console.warn('pushState', e); }
    }
    function restoreState(json) {
      if (!json) return;
      try {
        fabricCanvas.loadFromJSON(json, () => { fabricCanvas.renderAll(); refreshLayersList(); updateSelectedInfo(); });
      } catch (e) { console.warn('restoreState', e); }
    }
    function undo() { if (!undoStack.length) return; redoStack.push(fabricCanvas.toJSON()); const last = undoStack.pop(); restoreState(last); }
    function redo() { if (!redoStack.length) return; undoStack.push(fabricCanvas.toJSON()); const next = redoStack.pop(); restoreState(next); }

    // Grid / snapping
    let gridShown = false, gridLines = [];
    function toggleGrid() {
      gridShown = !gridShown; gridLines.forEach(l => fabricCanvas.remove(l)); gridLines = [];
      if (gridShown) {
        const step = 20;
        for (let i = 0; i < fabricCanvas.width; i += step) {
          const line = new fabric.Line([i,0,i,fabricCanvas.height], { stroke: '#eee', selectable: false, evented: false, excludeFromExport: true });
          fabricCanvas.add(line); gridLines.push(line);
        }
        for (let j = 0; j < fabricCanvas.height; j += step) {
          const line = new fabric.Line([0,j,fabricCanvas.width,j], { stroke: '#eee', selectable: false, evented: false, excludeFromExport: true });
          fabricCanvas.add(line); gridLines.push(line);
        }
        gridLines.forEach(l => l.sendToBack());
      }
      fabricCanvas.requestRenderAll();
    }

    // Layers UI
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

    // Props panel
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

    // Prop bindings
    if (propText) propText.addEventListener('input', () => { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); if ('text' in o) { o.text = propText.value; o.set('text', propText.value); } fabricCanvas.requestRenderAll(); });
    if (propFill) propFill.addEventListener('input', () => { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); try { o.set('fill', normalizeColor(propFill.value)); } catch (e) { o.set('fill', propFill.value); } fabricCanvas.requestRenderAll(); });
    if (propStroke) propStroke.addEventListener('input', () => { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); try { o.set('stroke', normalizeColor(propStroke.value)); } catch (e) { o.set('stroke', propStroke.value); } fabricCanvas.requestRenderAll(); });
    if (propFontsize) propFontsize.addEventListener('input', () => { const o = fabricCanvas.getActiveObject(); if (!o || !('fontSize' in o)) return; pushState(); o.set('fontSize', parseInt(propFontsize.value, 10) || 12); fabricCanvas.requestRenderAll(); });
    if (propWidth) propWidth.addEventListener('change', () => { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); const w = parseFloat(propWidth.value) || o.width || 1; o.scaleX = w / (o.width || 1); o.setCoords(); fabricCanvas.requestRenderAll(); });
    if (propHeight) propHeight.addEventListener('change', () => { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); const h = parseFloat(propHeight.value) || o.height || 1; o.scaleY = h / (o.height || 1); o.setCoords(); fabricCanvas.requestRenderAll(); });
    if (propAngle) propAngle.addEventListener('change', () => { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); o.angle = parseFloat(propAngle.value) || 0; o.setCoords(); fabricCanvas.requestRenderAll(); });
    if (propOpacity) propOpacity.addEventListener('input', () => { const o = fabricCanvas.getActiveObject(); if (!o) return; pushState(); o.opacity = parseFloat(propOpacity.value); fabricCanvas.requestRenderAll(); });

    // Canvas event sync
    fabricCanvas.on('selection:created', updateSelectedInfo);
    fabricCanvas.on('selection:updated', updateSelectedInfo);
    fabricCanvas.on('selection:cleared', updateSelectedInfo);
    fabricCanvas.on('object:modified', function () { pushState(); updateSelectedInfo(); refreshLayersList(); });
    fabricCanvas.on('object:added', function (e) { if (e.target && e.target.excludeFromExport) return; pushState(); refreshLayersList(); });
    fabricCanvas.on('object:removed', function () { pushState(); refreshLayersList(); });

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

    // Basic create functions
    function addRect() { pushState(); const rect = new fabric.Rect({ left: 40, top: 40, fill: '#4f46e5', width: 160, height: 100, rx: 6, ry: 6 }); fabricCanvas.add(rect).setActiveObject(rect); refreshLayersList(); }
    function addCircle() { pushState(); const c = new fabric.Circle({ left: 120, top: 120, radius: 50, fill: '#ef4444' }); fabricCanvas.add(c).setActiveObject(c); refreshLayersList(); }
    function addLine() { pushState(); const l = new fabric.Line([50, 50, 200, 50], { left: 50, top: 50, stroke: '#111111', strokeWidth: 2 }); fabricCanvas.add(l).setActiveObject(l); refreshLayersList(); }
    function addText() { pushState(); const t = new fabric.Textbox('Nuevo texto', { left: 80, top: 200, width: 240, fontSize: 18, fill: '#111827' }); fabricCanvas.add(t).setActiveObject(t); refreshLayersList(); }

    // ---------- Image upload: robust implementation ----------
    async function addImageFromFile(file) {
      if (!file) return;
      pushState();
      try {
        // Prefer createImageBitmap for performance (and browser support)
        if (window.createImageBitmap) {
          try {
            const bitmap = await createImageBitmap(file);
            // create a Blob URL to hand to fabric
            const canvasForBlob = document.createElement('canvas');
            canvasForBlob.width = bitmap.width;
            canvasForBlob.height = bitmap.height;
            const ctx = canvasForBlob.getContext('2d');
            ctx.drawImage(bitmap, 0, 0);
            // scale down if too big
            const MAX_DIM = 2048;
            let targetW = bitmap.width, targetH = bitmap.height;
            if (Math.max(targetW, targetH) > MAX_DIM) {
              const ratio = MAX_DIM / Math.max(targetW, targetH);
              targetW = Math.round(targetW * ratio);
              targetH = Math.round(targetH * ratio);
            }
            // draw into scaled canvas if needed
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
            // fallback to objectURL
            console.warn('createImageBitmap falló, usando objectURL', e);
          }
        }

        // Fallback: use object URL (fast) then revoke
        const url = URL.createObjectURL(file);
        fabric.Image.fromURL(url, function (img) {
          // scale down large images to prevent OOM
          const MAX_DIM = 2048;
          let scale = 1;
          if (Math.max(img.width, img.height) > MAX_DIM) {
            scale = MAX_DIM / Math.max(img.width, img.height);
            img.scaleX = img.scaleY = scale;
          }
          img.set({ left: 100, top: 100 });
          fabricCanvas.add(img).setActiveObject(img);
          refreshLayersList();
          // revoke after a tick
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        }, { crossOrigin: 'anonymous' });
      } catch (err) {
        console.error('addImageFromFile error', err);
        alert('No se pudo subir la imagen.');
      }
    }

    // ---------- Page / Artboard management ----------
    // create an artboard rectangle background (non-exported helper?) we'll export full canvas so artboard is normal object
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
      const page = { name: preset.name || 'Página', width: preset.w || preset.w, height: preset.h || preset.h, json: null };
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
      // Guardar estado actual en pages[currentPage].json
      if (currentPage >= 0 && pages[currentPage]) {
        try {
          pages[currentPage].json = fabricCanvas.toJSON();
        } catch (e) { console.warn('save current page json', e); }
      }
      currentPage = index;
      // Limpiar canvas
      fabricCanvas.clear();
      // Cargar artboard size
      const page = pages[index];
      // Ajustar "artboard" visual: lo implementamos como un rect en el centro
      const artboard = createArtboardRect(page.width, page.height, page.name);
      fabricCanvas.add(artboard);
      // Si tenía json cargado, cargarlo (excepto artboard que se re-crea)
      if (page.json) {
        try {
          fabricCanvas.loadFromJSON(page.json, () => {
            // Render and ensure artboard at bottom
            // remove any existing customArtboard if duplicate and re-add
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
        // no JSON: just have artboard
        // set zoom to fit maybe
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
      // add "new page" quick button
      const add = document.getElementById('btn-new-page');
      if (add) {
        add.onclick = () => newPage('desktop');
      }
    }

    function exportCurrentPagePNG() {
      // If there's an artboard, crop to its bounds
      const art = fabricCanvas.getObjects().find(o => o.customArtboard);
      if (!art) {
        // full canvas
        const dataURL = fabricCanvas.toDataURL({ format: 'png', multiplier: 2 });
        downloadDataURL(dataURL, 'page.png');
        return;
      }
      // Create clone to export only the artboard area (works by viewport transform)
      const rect = art;
      const origZoom = fabricCanvas.getZoom();
      // Temporarily set viewport so artboard is top-left
      const left = rect.left || 0, top = rect.top || 0;
      // Use toDataURL with cropping via multiplier and left/top/width/height options if supported
      try {
        const dataURL = fabricCanvas.toDataURL({
          format: 'png',
          multiplier: 2,
          left: left,
          top: top,
          width: rect.width * (rect.scaleX || 1),
          height: rect.height * (rect.scaleY || 1)
        });
        downloadDataURL(dataURL, (pages[currentPage]?.name || 'page') + '.png');
      } catch (e) {
        // fallback: export full canvas
        const dataURL = fabricCanvas.toDataURL({ format: 'png', multiplier: 2 });
        downloadDataURL(dataURL, 'page.png');
      } finally {
        setZoom(origZoom);
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
      } catch (e) {
        console.error('export svg', e);
      }
    }
    function downloadDataURL(dataURL, filename) {
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    // ---------- Basic editing actions (duplicate, group, lock, etc.) ----------
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

    // ---------- Wire UI buttons (defensive) ----------
    function bind(id, fn) { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); }
    bind('btn-add-rect', addRect);
    bind('btn-add-circle', addCircle);
    bind('btn-add-line', addLine);
    bind('btn-add-text', addText);
    const imgIn = document.getElementById('editor-image-input');
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

    // Panning con Shift + drag
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

    // ---------- Initial pages load (if none, create a default) ----------
    loadPages();
    if (!pages.length) {
      // create a default desktop page
      pages.push({ name: 'Página 1', width: 1024, height: 768, json: null });
    }
    renderPagesList();
    // if there was saved 'editor:canvas' (old single-canvas storage), migrate to first page
    try {
      const old = localStorage.getItem('editor:canvas');
      if (old && !pages[0].json) {
        pages[0].json = JSON.parse(old);
        savePages();
      }
    } catch (e) {}
    switchPage(0);
    pushState();

    // Expose API
    window.editorAPI = {
      newPage, duplicatePage, deletePage, switchPage, exportCurrentPagePNG, exportCurrentPageSVG,
      addImageFromFile, addRect, addCircle, addLine, addText, getState: () => fabricCanvas.toJSON()
    };

    // Keep pages UI up-to-date in case DOM buttons exist
    function ensurePagesUIButtons() {
      const createBtn = document.getElementById('btn-new-page');
      if (createBtn) createBtn.addEventListener('click', () => newPage('desktop'));
      const presetSelect = document.getElementById('device-select');
      if (presetSelect) {
        presetSelect.innerHTML = '';
        devicePresets.forEach(p => {
          const o = document.createElement('option');
          o.value = p.id; o.textContent = p.name;
          presetSelect.appendChild(o);
        });
        const addFromPreset = document.getElementById('btn-add-artboard-from-preset');
        if (addFromPreset) addFromPreset.addEventListener('click', () => {
          const presetId = presetSelect.value;
          newPage(presetId);
        });
      }
    }
    ensurePagesUIButtons();

    console.info('Editor inicializado con soporte de páginas y subida de imágenes robusta.');
  } // end start

  // Boot
  if (document.readyState !== 'loading') start(); else document.addEventListener('DOMContentLoaded', start);
})();
