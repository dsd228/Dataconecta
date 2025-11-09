// Reemplaza la función wireModuleUI existente por esta versión robusta.
// Esta implementación llama a window.editorAPI si existe, o
// a las funciones locales como fallback, evitando ReferenceError.

function safeCallApi(fnName, ...args) {
  try {
    // prefer the public API on window.editorAPI (provided when module initializes)
    if (window.editorAPI && typeof window.editorAPI[fnName] === 'function') {
      return window.editorAPI[fnName](...args);
    }
    // fallback to a global/local function with the same name if present
    const local = (typeof window[fnName] === 'function') ? window[fnName] : (typeof eval(fnName) === 'function' ? eval(fnName) : null);
    if (local) return local(...args);
  } catch (e) {
    console.warn('safeCallApi error calling', fnName, e);
  }
  console.warn('safeCallApi: function not available:', fnName);
  return null;
}

function wireModuleUI() {
  // --- toolbar bindings ---
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
    // image loading logic (same as before)...
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

  // --- components panel: use safeCallApi to insert instances ---
  bind($('#ed-tool-component'), 'click', () => {
    const compName = prompt('Nombre del componente') || 'Component';
    // safe creation: try public API or local
    const compId = safeCallApi('createComponentFromSelection', compName) || null;
    if (compId) alert('Componente creado: ' + compId);
  });

  bind($('#ed-tool-instance'), 'click', () => {
    // when user clicks Insert on components list we handle below; also allow inserting the first component
    if (!state.components.length) return alert('No hay componentes');
    // Prefer calling public API; fallback to local function
    safeCallApi('insertComponentInstance', state.components[0].id, { left: 140, top: 140 });
  });

  // If components list contains insert buttons, attach handlers robustly
  // (attach in a delegated, safe way)
  const compsContainer = document.getElementById('components-list') || (document.querySelector('.module-editor') && document.querySelector('.module-editor').querySelector('#components-list'));
  if (compsContainer) {
    // Remove previous delegated handlers if any (defensive)
    qsa('.comp-insert', compsContainer).forEach(btn => {
      btn.removeEventListener('click', btn._compInsertHandler);
      const handler = (e) => {
        const id = btn.dataset.id;
        safeCallApi('insertComponentInstance', id, { left: 120, top: 120 });
      };
      btn._compInsertHandler = handler;
      btn.addEventListener('click', handler);
    });
  }

  bind($('#btn-remove-bg'), 'click', () => removeBackgroundActiveImage(parseInt($('#token-primary').dataset?.tol || 32, 10) || 32));
  bind($('#tokens-save'), 'click', () => { state.tokens.primary = $('#token-primary').value; state.tokens.font = $('#token-font').value; saveLS('editor:tokens', state.tokens); alert('Tokens guardados'); });

  // selection / object events
  fabricCanvas.on('selection:created', () => { renderLayers(); refreshInspector(); });
  fabricCanvas.on('selection:updated', () => { renderLayers(); refreshInspector(); });
  fabricCanvas.on('selection:cleared', () => { refreshInspector(); });
  fabricCanvas.on('object:added', () => { renderLayers(); pushHistory(); });
  fabricCanvas.on('object:removed', () => { renderLayers(); pushHistory(); });
  fabricCanvas.on('object:modified', () => { renderLayers(); pushHistory(); });

  // comments
  bind($('#comment-add'), 'click', () => {
    const text = $('#comment-box').value.trim(); if (!text) return;
    const sel = fabricCanvas.getActiveObject(); const objectId = sel ? sel.__objectId : null;
    const list = loadLS('editor:comments', []); list.unshift({ id: uid('c'), objectId, author: 'You', text, ts: nowIso() }); saveLS('editor:comments', list);
    // use public renderer when available, else call local
    safeCallApi('renderComments');
    $('#comment-box').value = '';
  });

  // recordings/buttons bindings
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

  // ensure UI is refreshed initially (use safeCallApi for renderComments)
  renderComponentsList();
  renderRecordingsList();
  safeCallApi('renderComments'); // will call public API if set, otherwise local renderComments if exists
  renderLayers();
}
