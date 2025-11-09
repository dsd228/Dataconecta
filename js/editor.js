/* Editor avanzado basado en Fabric.js — funciones tipo "Figma Pro" (mínimo funcional)
   Requiere: un canvas con id="canvas" y elementos UI presentes en index.html
*/

(function () {
  // Esperar a que Fabric esté listo y DOM cargado
  function ready(fn) {
    if (document.readyState !== 'loading') return fn();
    document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    if (!window.fabric) {
      console.error('Fabric.js no cargado');
      return;
    }

    // DOM referencias
    const canvasEl = document.getElementById('canvas');
    const btnOpenEditor = document.getElementById('btn-open-editor');
    const viewEditor = document.getElementById('view-editor');
    const viewContainer = document.getElementById('view-container');

    // If not in page, nothing to do
    if (!canvasEl) return;

    // Mostrar vista del editor desde el topbar (usa rutas hash si tu app las maneja)
    if (btnOpenEditor) {
      btnOpenEditor.addEventListener('click', () => {
        // activar la vista del editor (asumiendo una simple gestión de vistas por clases)
        document.querySelectorAll('.view-panel').forEach(v => v.classList.add('hidden'));
        viewEditor.classList.remove('hidden');
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) pageTitle.textContent = 'Editor';
        // focus canvas
        setTimeout(() => canvasEl.focus(), 100);
      });
    }

    // Inicializar Fabric
    const fabricCanvas = new fabric.Canvas('canvas', {
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });
    window.fabricCanvas = fabricCanvas;

    // Resize canvas a area disponible
    function resizeCanvas() {
      const wrap = document.getElementById('canvas-wrap');
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      canvasEl.width = Math.max(800, rect.width - 0);
      canvasEl.height = Math.max(400, rect.height - 0);
      fabricCanvas.setWidth(canvasEl.width);
      fabricCanvas.setHeight(canvasEl.height);
      fabricCanvas.calcOffset();
      fabricCanvas.requestRenderAll();
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Estado de zoom y grid
    let currentZoom = 1;
    const zoomLevelEl = document.getElementById('zoom-level');
    const selSummary = document.getElementById('sel-summary');

    function setZoom(z) {
      currentZoom = Math.max(0.1, Math.min(4, z));
      fabricCanvas.setZoom(currentZoom);
      if (zoomLevelEl) zoomLevelEl.textContent = Math.round(currentZoom * 100) + '%';
      fabricCanvas.requestRenderAll();
    }

    // Historial simple (JSON snapshots) — push antes de cambios importantes
    const undoStack = [];
    const redoStack = [];
    const HISTORY_LIMIT = 60;

    function pushState() {
      try {
        const json = fabricCanvas.toJSON(['selectable', 'customId']);
        undoStack.push(json);
        if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
        // limpiar redo al crear nuevo estado
        redoStack.length = 0;
      } catch (e) {
        console.warn('No se pudo pushState', e);
      }
    }

    function restoreState(json, pushToRedo = false) {
      if (!json) return;
      const current = fabricCanvas.toJSON();
      if (pushToRedo) redoStack.push(current);
      fabricCanvas.loadFromJSON(json, () => {
        fabricCanvas.renderAll();
        refreshLayersList();
        updateSelectedInfo();
      }, function (o, obj) {
        // after object restored callback (no-op)
      });
    }

    function undo() {
      if (undoStack.length === 0) return;
      const last = undoStack.pop();
      const current = fabricCanvas.toJSON();
      redoStack.push(current);
      restoreState(last, false);
    }

    function redo() {
      if (redoStack.length === 0) return;
      const next = redoStack.pop();
      undoStack.push(fabricCanvas.toJSON());
      restoreState(next, false);
    }

    // Grid toggle
    let gridShown = false;
    let gridLines = [];
    function toggleGrid() {
      gridShown = !gridShown;
      // remover existentes
      gridLines.forEach(l => fabricCanvas.remove(l));
      gridLines = [];
      if (gridShown) {
        const step = 20;
        for (let i = 0; i < fabricCanvas.width; i += step) {
          const line = new fabric.Line([i, 0, i, fabricCanvas.height], { stroke: '#eee', selectable: false, evented: false, excludeFromExport: true });
          fabricCanvas.add(line);
          gridLines.push(line);
        }
        for (let j = 0; j < fabricCanvas.height; j += step) {
          const line = new fabric.Line([0, j, fabricCanvas.width, j], { stroke: '#eee', selectable: false, evented: false, excludeFromExport: true });
          fabricCanvas.add(line);
          gridLines.push(line);
        }
        gridLines.forEach(l => l.sendToBack());
      }
      fabricCanvas.requestRenderAll();
    }

    // Utilidades de creación
    function addRect() {
      pushState();
      const rect = new fabric.Rect({
        left: 40, top: 40, fill: '#4f46e5', width: 160, height: 100, rx: 6, ry: 6, originX: 'left', originY: 'top'
      });
      fabricCanvas.add(rect).setActiveObject(rect);
      fabricCanvas.requestRenderAll();
      refreshLayersList();
    }

    function addCircle() {
      pushState();
      const c = new fabric.Circle({
        left: 120, top: 120, radius: 50, fill: '#ef4444', originX: 'center', originY: 'center'
      });
      fabricCanvas.add(c).setActiveObject(c);
      fabricCanvas.requestRenderAll();
      refreshLayersList();
    }

    function addLine() {
      pushState();
      const l = new fabric.Line([50, 50, 200, 50], {
        left: 50, top: 50, stroke: '#111', strokeWidth: 2
      });
      fabricCanvas.add(l).setActiveObject(l);
      fabricCanvas.requestRenderAll();
      refreshLayersList();
    }

    function addText() {
      pushState();
      const t = new fabric.Textbox('Nuevo texto', {
        left: 80, top: 200, width: 240, fontSize: 18, fill: '#111827'
      });
      fabricCanvas.add(t).setActiveObject(t);
      fabricCanvas.requestRenderAll();
      refreshLayersList();
    }

    function addImageFromFile(file) {
      if (!file) return;
      pushState();
      const reader = new FileReader();
      reader.onload = function (e) {
        fabric.Image.fromURL(e.target.result, function (img) {
          img.set({ left: 100, top: 100, scaleX: 0.5, scaleY: 0.5 });
          fabricCanvas.add(img).setActiveObject(img);
          fabricCanvas.requestRenderAll();
          refreshLayersList();
        });
      };
      reader.readAsDataURL(file);
    }

    // Duplicar, eliminar, agrupar, desagrupar
    function duplicateSelection() {
      const active = fabricCanvas.getActiveObject();
      if (!active) return;
      pushState();
      active.clone(function (cloned) {
        cloned.set({ left: active.left + 20, top: active.top + 20 });
        fabricCanvas.add(cloned);
        fabricCanvas.setActiveObject(cloned);
        refreshLayersList();
      });
    }

    function deleteSelection() {
      const active = fabricCanvas.getActiveObject();
      if (!active) return;
      pushState();
      if (active.type === 'activeSelection') {
        active.forEachObject(obj => fabricCanvas.remove(obj));
      } else {
        fabricCanvas.remove(active);
      }
      fabricCanvas.discardActiveObject();
      fabricCanvas.requestRenderAll();
      refreshLayersList();
    }

    function groupSelection() {
      const sel = fabricCanvas.getActiveObject();
      if (!sel || sel.type !== 'activeSelection') return;
      pushState();
      sel.toGroup();
      fabricCanvas.requestRenderAll();
      refreshLayersList();
    }

    function ungroupSelection() {
      const active = fabricCanvas.getActiveObject();
      if (!active) return;
      if (active.type === 'group') {
        pushState();
        active.toActiveSelection();
        fabricCanvas.requestRenderAll();
        refreshLayersList();
      }
    }

    function bringForward() {
      const obj = fabricCanvas.getActiveObject();
      if (!obj) return;
      pushState();
      fabricCanvas.bringForward(obj);
      fabricCanvas.requestRenderAll();
    }

    function sendBackward() {
      const obj = fabricCanvas.getActiveObject();
      if (!obj) return;
      pushState();
      fabricCanvas.sendBackwards(obj);
      fabricCanvas.requestRenderAll();
    }

    function lockToggle() {
      const obj = fabricCanvas.getActiveObject();
      if (!obj) return;
      pushState();
      const locked = !!obj.lockMovementX;
      obj.set({
        lockMovementX: !locked,
        lockMovementY: !locked,
        lockScalingX: !locked,
        lockScalingY: !locked,
        lockRotation: !locked,
        selectable: locked
      });
      fabricCanvas.requestRenderAll();
    }

    function centerSelected() {
      const obj = fabricCanvas.getActiveObject();
      if (!obj) return;
      pushState();
      obj.center();
      obj.setCoords();
      fabricCanvas.requestRenderAll();
    }

    // Alignment helpers
    function alignSelected(mode) {
      const sel = fabricCanvas.getActiveObject();
      if (!sel) return;
      pushState();
      const objects = (sel.type === 'activeSelection') ? sel.getObjects() : [sel];
      const bbox = fabric.util.groupSVGElements ? null : null;
      const canvasW = fabricCanvas.getWidth();
      const canvasH = fabricCanvas.getHeight();
      objects.forEach(obj => {
        if (mode === 'left') obj.set('left', 10);
        if (mode === 'center') obj.set('left', (canvasW - obj.getScaledWidth()) / 2);
        if (mode === 'right') obj.set('left', canvasW - obj.getScaledWidth() - 10);
        if (mode === 'top') obj.set('top', 10);
        if (mode === 'middle') obj.set('top', (canvasH - obj.getScaledHeight()) / 2);
        if (mode === 'bottom') obj.set('top', canvasH - obj.getScaledHeight() - 10);
        obj.setCoords();
      });
      fabricCanvas.requestRenderAll();
    }

    // Export
    function exportPNG() {
      const dataURL = fabricCanvas.toDataURL({ format: 'png', multiplier: 2 });
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = 'canvas.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    function exportSVG() {
      const svg = fabricCanvas.toSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'canvas.svg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    // Save / load JSON
    function saveJSON() {
      const json = JSON.stringify(fabricCanvas.toJSON());
      localStorage.setItem('editor:canvas', json);
      alert('Lienzo guardado en localStorage');
    }

    function loadJSONFile(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const json = JSON.parse(e.target.result);
          pushState();
          fabricCanvas.loadFromJSON(json, () => {
            fabricCanvas.renderAll();
            refreshLayersList();
            updateSelectedInfo();
          });
        } catch (err) {
          alert('Archivo JSON inválido');
        }
      };
      reader.readAsText(file);
    }

    function loadFromLocalStorage() {
      const json = localStorage.getItem('editor:canvas');
      if (!json) return;
      try {
        fabricCanvas.loadFromJSON(JSON.parse(json), () => {
          fabricCanvas.renderAll();
          refreshLayersList();
        });
      } catch (e) {
        console.warn('No se pudo cargar JSON guardado', e);
      }
    }

    // Layers panel
    const layersListEl = document.getElementById('layers-list');
    function refreshLayersList() {
      if (!layersListEl) return;
      layersListEl.innerHTML = '';
      const objs = fabricCanvas.getObjects().slice().reverse(); // top-first
      objs.forEach((o, idx) => {
        const li = document.createElement('li');
        li.textContent = `${o.type}${o.text ? ' — ' + (o.text.length > 20 ? o.text.slice(0, 20) + '…' : o.text) : ''}`;
        if (fabricCanvas.getActiveObject() === o) li.classList.add('active');
        const right = document.createElement('div');
        right.style.display = 'flex';
        right.style.gap = '6px';
        const eye = document.createElement('button');
        eye.className = 'btn small';
        eye.innerHTML = o.visible === false ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
        eye.addEventListener('click', (ev) => {
          ev.stopPropagation();
          pushState();
          o.set('visible', !o.visible);
          eye.innerHTML = o.visible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
          fabricCanvas.requestRenderAll();
        });
        right.appendChild(eye);
        li.appendChild(right);
        li.addEventListener('click', () => {
          fabricCanvas.setActiveObject(o);
          fabricCanvas.requestRenderAll();
        });
        layersListEl.appendChild(li);
      });
    }

    // Propiedades
    const propText = document.getElementById('prop-text');
    const propFill = document.getElementById('prop-fill');
    const propStroke = document.getElementById('prop-stroke');
    const propFontsize = document.getElementById('prop-fontsize');
    const propWidth = document.getElementById('prop-width');
    const propHeight = document.getElementById('prop-height');
    const propAngle = document.getElementById('prop-angle');
    const propOpacity = document.getElementById('prop-opacity');

    function updateSelectedInfo() {
      const obj = fabricCanvas.getActiveObject();
      if (!obj) {
        selSummary.textContent = 'Ninguno';
        if (propText) propText.value = '';
        if (propFill) propFill.value = '#000000';
        return;
      }
      selSummary.textContent = (obj.type) + (obj.text ? ` — "${(obj.text).slice(0,30)}"` : '');
      if (propText && ('text' in obj)) propText.value = obj.text || '';
      if (propFill && obj.fill) {
        try { propFill.value = obj.fill; } catch (e) {}
      }
      if (propStroke) propStroke.value = obj.stroke || '#000000';
      if (propFontsize && obj.fontSize) propFontsize.value = obj.fontSize;
      if (propWidth) propWidth.value = Math.round(obj.getScaledWidth());
      if (propHeight) propHeight.value = Math.round(obj.getScaledHeight());
      if (propAngle) propAngle.value = Math.round(obj.angle || 0);
      if (propOpacity) propOpacity.value = (obj.opacity != null ? obj.opacity : 1);
      refreshLayersList();
    }

    // Syncronizar changes from properties to object
    if (propText) propText.addEventListener('input', () => {
      const obj = fabricCanvas.getActiveObject();
      if (!obj) return;
      pushState();
      if ('text' in obj) {
        obj.text = propText.value;
        obj.set('text', propText.value);
      }
      fabricCanvas.requestRenderAll();
    });
    if (propFill) propFill.addEventListener('input', () => {
      const obj = fabricCanvas.getActiveObject();
      if (!obj) return;
      pushState();
      obj.set('fill', propFill.value);
      fabricCanvas.requestRenderAll();
    });
    if (propStroke) propStroke.addEventListener('input', () => {
      const obj = fabricCanvas.getActiveObject();
      if (!obj) return;
      pushState();
      obj.set('stroke', propStroke.value);
      fabricCanvas.requestRenderAll();
    });
    if (propFontsize) propFontsize.addEventListener('input', () => {
      const obj = fabricCanvas.getActiveObject();
      if (!obj) return;
      if (!('fontSize' in obj)) return;
      pushState();
      obj.set('fontSize', parseInt(propFontsize.value, 10) || 12);
      fabricCanvas.requestRenderAll();
    });
    if (propWidth) propWidth.addEventListener('change', () => {
      const obj = fabricCanvas.getActiveObject();
      if (!obj) return;
      pushState();
      const w = parseFloat(propWidth.value) || obj.width;
      obj.scaleX = w / obj.width;
      obj.setCoords();
      fabricCanvas.requestRenderAll();
    });
    if (propHeight) propHeight.addEventListener('change', () => {
      const obj = fabricCanvas.getActiveObject();
      if (!obj) return;
      pushState();
      const h = parseFloat(propHeight.value) || obj.height;
      obj.scaleY = h / obj.height;
      obj.setCoords();
      fabricCanvas.requestRenderAll();
    });
    if (propAngle) propAngle.addEventListener('change', () => {
      const obj = fabricCanvas.getActiveObject();
      if (!obj) return;
      pushState();
      obj.angle = parseFloat(propAngle.value) || 0;
      obj.setCoords();
      fabricCanvas.requestRenderAll();
    });
    if (propOpacity) propOpacity.addEventListener('input', () => {
      const obj = fabricCanvas.getActiveObject();
      if (!obj) return;
      pushState();
      obj.opacity = parseFloat(propOpacity.value);
      fabricCanvas.requestRenderAll();
    });

    // Eventos canvas para mantener UI sincronizada
    fabricCanvas.on('selection:created', updateSelectedInfo);
    fabricCanvas.on('selection:updated', updateSelectedInfo);
    fabricCanvas.on('selection:cleared', updateSelectedInfo);
    fabricCanvas.on('object:modified', function () {
      pushState();
      updateSelectedInfo();
      refreshLayersList();
    });
    fabricCanvas.on('object:added', function (e) {
      if (e.target && e.target.excludeFromExport) return;
      // No empujar el estado inicial de carga
      pushState();
      refreshLayersList();
    });
    fabricCanvas.on('object:removed', function () {
      pushState();
      refreshLayersList();
    });

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

    // Wire UI buttons
    document.getElementById('btn-add-rect')?.addEventListener('click', addRect);
    document.getElementById('btn-add-circle')?.addEventListener('click', addCircle);
    document.getElementById('btn-add-line')?.addEventListener('click', addLine);
    document.getElementById('btn-add-text')?.addEventListener('click', addText);
    document.getElementById('btn-upload-image')?.addEventListener('click', () => {
      document.getElementById('editor-image-input')?.click();
    });
    document.getElementById('editor-image-input')?.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) addImageFromFile(f);
      e.target.value = '';
    });

    document.getElementById('btn-duplicate')?.addEventListener('click', duplicateSelection);
    document.getElementById('btn-delete')?.addEventListener('click', deleteSelection);
    document.getElementById('btn-group')?.addEventListener('click', groupSelection);
    document.getElementById('btn-ungroup')?.addEventListener('click', ungroupSelection);
    document.getElementById('btn-bring-forward')?.addEventListener('click', bringForward);
    document.getElementById('btn-send-backward')?.addEventListener('click', sendBackward);
    document.getElementById('btn-lock')?.addEventListener('click', lockToggle);
    document.getElementById('btn-center')?.addEventListener('click', centerSelected);

    document.getElementById('btn-undo')?.addEventListener('click', undo);
    document.getElementById('btn-redo')?.addEventListener('click', redo);
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => setZoom(currentZoom * 1.2));
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => setZoom(currentZoom / 1.2));
    document.getElementById('btn-fit')?.addEventListener('click', () => {
      // Ajustar zoom para contener objetos
      const objs = fabricCanvas.getObjects();
      if (!objs.length) { setZoom(1); return; }
      const bound = fabric.util.getBounds(objs.map(o => o.getBoundingRect()));
      const wRatio = fabricCanvas.getWidth() / bound.width;
      const hRatio = fabricCanvas.getHeight() / bound.height;
      const z = Math.max(0.1, Math.min(2, Math.min(wRatio, hRatio) * 0.9));
      setZoom(z);
      fabricCanvas.absolutePan(new fabric.Point(-bound.left * z + (fabricCanvas.getWidth() - bound.width * z) / 2, -bound.top * z + (fabricCanvas.getHeight() - bound.height * z) / 2));
    });

    document.getElementById('btn-toggle-grid')?.addEventListener('click', toggleGrid);
    document.getElementById('btn-export-png')?.addEventListener('click', exportPNG);
    document.getElementById('btn-export-svg')?.addEventListener('click', exportSVG);
    document.getElementById('btn-save-json')?.addEventListener('click', saveJSON);
    document.getElementById('btn-load-json')?.addEventListener('click', () => document.getElementById('editor-file-json')?.click());
    document.getElementById('editor-file-json')?.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) loadJSONFile(f);
      e.target.value = '';
    });
    document.getElementById('btn-reset')?.addEventListener('click', () => {
      setZoom(1);
      fabricCanvas.absolutePan({ x: 0, y: 0 });
      fabricCanvas.renderAll();
    });

    // Mantener UI de propiedades cuando cambia selección
    fabricCanvas.on('selection:created', updateSelectedInfo);
    fabricCanvas.on('selection:updated', updateSelectedInfo);
    fabricCanvas.on('selection:cleared', updateSelectedInfo);

    // Inicial cargar desde localStorage si existe
    loadFromLocalStorage();

    // Inicial push de estado para tener punto base
    try { pushState(); } catch (e) { /* ignore */ }

    // Pequeños ajustes de UX: arrastrar canvas con espaciobar (panning)
    let isPanning = false;
    let lastPos = null;
    document.getElementById('canvas-wrap')?.addEventListener('pointerdown', (ev) => {
      if (ev.shiftKey) {
        isPanning = true;
        lastPos = { x: ev.clientX, y: ev.clientY };
        ev.preventDefault();
      }
    });
    document.addEventListener('pointermove', (ev) => {
      if (!isPanning) return;
      const dx = ev.clientX - lastPos.x;
      const dy = ev.clientY - lastPos.y;
      const v = fabricCanvas.viewportTransform;
      v[4] += dx;
      v[5] += dy;
      lastPos = { x: ev.clientX, y: ev.clientY };
      fabricCanvas.requestRenderAll();
    });
    document.addEventListener('pointerup', () => { isPanning = false; lastPos = null; });

    // Refrescar lista de capas al inicio
    refreshLayersList();

    // Exportar estado (para telemetría o guardado manual)
    window.getEditorState = function () {
      return JSON.stringify(fabricCanvas.toJSON());
    };

    // Pequeña API pública para interacción desde CRM
    window.openEditorForProject = function (projectId) {
      // se puede usar para pre-cargar assets o seleccionar una capa
      if (btnOpenEditor) btnOpenEditor.click();
      console.log('Editor abierto para proyecto:', projectId);
    };

    console.log('Editor inicializado (Fabric.js).');
  });
})();
