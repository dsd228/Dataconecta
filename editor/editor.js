// REPLACE the start() initialization block in editor/editor.js with the following robust version.
// It finds canvas/wrap using multiple possible IDs and container contexts so the editor works
// whether loaded as /editor/index.html or injected as modules/editor.html inside the app shell.

async function start() {
  try {
    await ensureFabric();
  } catch (err) {
    console.error('Fabric load failed', err);
    alert('Fabric.js no disponible. Revisa CDN o coloca modules/vendor/fabric.min.js');
    return;
  }

  // Helper: find canvas and wrapper robustly in many contexts (module or standalone)
  function findCanvasElements() {
    const canvasIds = ['#canvas', '#ed-canvas', '#editor-canvas'];
    const wrapIds = ['#canvas-wrap', '#ed-canvas-wrap', '#editor-canvas-wrap', '#ed-canvas-wrap'];
    // First, try top-level IDs
    let canvasEl = null, wrap = null;
    for (const id of canvasIds) {
      const el = document.querySelector(id);
      if (el) { canvasEl = el; break; }
    }
    for (const id of wrapIds) {
      const el = document.querySelector(id);
      if (el) { wrap = el; break; }
    }
    // If not found, try searching inside module container (.module-editor) injected by loader
    if ((!canvasEl || !wrap) && document.querySelector('.module-editor')) {
      const root = document.querySelector('.module-editor');
      for (const id of canvasIds) {
        const el = root.querySelector(id);
        if (el) { canvasEl = canvasEl || el; }
      }
      for (const id of wrapIds) {
        const el = root.querySelector(id);
        if (el) { wrap = wrap || el; }
      }
      // if wrap missing, maybe canvas is direct child of module root
      if (!wrap && canvasEl && canvasEl.parentElement) wrap = canvasEl.parentElement;
      // fallback: find any canvas under module root
      if (!canvasEl) canvasEl = root.querySelector('canvas');
    }

    // As last resort, locate the first canvas in the document and use document.body as wrap
    if (!canvasEl) canvasEl = document.querySelector('canvas');
    if (!wrap && canvasEl) wrap = canvasEl.parentElement || document.body;

    return { canvasEl, wrap };
  }

  const elems = findCanvasElements();
  const canvasEl = elems.canvasEl;
  const wrap = elems.wrap;

  // Diagnostic logging to help debugging if something still missing
  if (!canvasEl || !wrap) {
    console.error('Editor initialization failed: missing canvas or canvas-wrap in module HTML.');
    console.error('findCanvasElements() results:', {
      canvasIdFound: !!canvasEl,
      canvasTag: canvasEl ? (canvasEl.id || canvasEl.tagName) : null,
      wrapFound: !!wrap,
      wrapId: wrap ? (wrap.id || wrap.className || wrap.tagName) : null,
      moduleRootPresent: !!document.querySelector('.module-editor'),
      appRootPresent: !!document.getElementById('app-root')
    });
    throw new Error('Editor HTML missing canvas elements. Asegúrate que tu HTML incluye un <canvas id="canvas"> dentro de un contenedor #canvas-wrap o que hay un <canvas> dentro de .module-editor.');
  }

  // proceed to initialize Fabric canvas using the actual canvas element id
  const canvasId = canvasEl.id || (canvasEl.getAttribute && canvasEl.getAttribute('id')) || ('canvas_' + Math.random().toString(36).slice(2,8));
  // if canvas element has no id, ensure it has one for Fabric constructor
  if (!canvasEl.id) canvasEl.id = canvasId;

  // initialize Fabric canvas
  const canvas = new fabric.Canvas(canvasEl.id, { selection: true, preserveObjectStacking: true, backgroundColor: '#ffffff' });

  // state manager
  const stateManager = createState({ canvas });

  // expose minimal editor API for other modules (unchanged)
  window.editorAPI = Object.assign(window.editorAPI || {}, {
    createComponentFromSelection: (name) => {
      const sel = canvas.getActiveObject();
      if (!sel) return null;
      let compJson;
      if (sel.type === 'activeSelection') {
        compJson = { objects: sel.getObjects().map(o => o.toObject(['__objectId','__componentId','__isInstance'])) };
      } else {
        compJson = { objects: [ sel.toObject(['__objectId','__componentId','__isInstance']) ] };
      }
      return stateManager.registerComponent(name || 'Component', compJson) || null;
    },

    insertComponentInstance: async (compId, opts) => {
      const comps = stateManager.state.components;
      const comp = comps.find(c => c.id === compId);
      if (!comp) return null;
      fabric.util.enlivenObjects(comp.json.objects || [], (enlivened) => {
        const group = new fabric.Group(enlivened, { left: opts?.left || 120, top: opts?.top || 120 });
        group.__componentId = compId;
        group.__isInstance = true;
        group.__objectId = 'o_' + Math.random().toString(36).slice(2,9);
        canvas.add(group);
        canvas.setActiveObject(group);
      }, '');
    },

    addSVG: (svgString) => {
      fabric.loadSVGFromString(svgString, (objs, opts) => {
        const g = fabric.util.groupSVGElements(objs, opts);
        g.set({ left: 120, top: 120 });
        g.__objectId = 'svg_' + Math.random().toString(36).slice(2,9);
        canvas.add(g).setActiveObject(g);
      });
    },

    playPrototype: () => {
      return stateManager.state.prototypeLinks;
    },

    removeBackgroundActiveImage: async (tolerance=32) => {
      const active = canvas.getActiveObject();
      if (!active || active.type !== 'image') throw new Error('Select an image first');
      if (typeof window.editorAPI._bgRemove === 'function') return window.editorAPI._bgRemove(active, tolerance);
      throw new Error('BG removal not implemented');
    }
  });

  // init UI wiring (panels, inspector, toolbar)
  const ui = initUI({ canvas, stateManager, storage, plugins });

  // load plugins demo
  try { await plugins.loadIconPlugin(); } catch(e) { console.warn('plugin load fail', e); }

  // save / export hooks
  document.getElementById('save-project')?.addEventListener('click', () => {
    const json = canvas.toJSON(['__objectId','__componentId','__isInstance','__overrides']);
    const name = prompt('Project name') || 'project';
    storage.saveProject(name, { json, meta:{ savedAt: nowIso() } });
    alert('Proyecto guardado localmente: ' + name);
  });

  document.getElementById('export-css')?.addEventListener('click', () => {
    const tokens = stateManager.state.tokens;
    const css = `:root{--color-primary:${tokens.primary};--font:${tokens.font};}\n`;
    const blob = new Blob([css], { type:'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'design-tokens.css'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  // background removal helper implementation (exposed)
  window.editorAPI._bgRemove = async (activeImage, tolerance=32) => {
    let imgEl = activeImage._element;
    if (!imgEl) {
      const url = activeImage.toDataURL();
      imgEl = await new Promise((res, rej) => { const im = new Image(); im.crossOrigin='anonymous'; im.onload = ()=>res(im); im.onerror = rej; im.src = url; });
    }
    const tmp = document.createElement('canvas'); tmp.width = imgEl.naturalWidth || imgEl.width; tmp.height = imgEl.naturalHeight || imgEl.height;
    const ctx = tmp.getContext('2d'); ctx.drawImage(imgEl, 0, 0);
    const imageData = ctx.getImageData(0,0,tmp.width,tmp.height);
    const w = imageData.width, h = imageData.height, data = imageData.data;
    const visited = new Uint8Array(w*h);
    const queue = [];
    function push(idx){ if(!visited[idx]){ visited[idx]=1; queue.push(idx); } }
    for (let x=0;x<w;x++){ push(x); push((h-1)*w + x); }
    for (let y=0;y<h;y++){ push(y*w); push(y*w + (w-1)); }
    const baseOff = 0;
    const baseR = data[baseOff], baseG = data[baseOff+1], baseB = data[baseOff+2];
    while (queue.length) {
      const idx = queue.shift();
      const px = idx % w; const py = Math.floor(idx / w); const off = idx*4;
      const r=data[off], g=data[off+1], b=data[off+2];
      if (Math.abs(r-baseR)<=tolerance && Math.abs(g-baseG)<=tolerance && Math.abs(b-baseB)<=tolerance) {
        data[off+3] = 0;
        if (px>0) push(idx-1); if (px<w-1) push(idx+1); if (py>0) push(idx-w); if (py<h-1) push(idx+w);
      }
    }
    ctx.putImageData(imageData,0,0);
    const outUrl = tmp.toDataURL('image/png');
    fabric.Image.fromURL(outUrl, newImg => {
      newImg.set({ left: activeImage.left, top: activeImage.top, scaleX: activeImage.scaleX, scaleY: activeImage.scaleY });
      canvas.remove(activeImage);
      canvas.add(newImg);
      canvas.setActiveObject(newImg);
      stateManager.pushHistory();
    }, { crossOrigin:'anonymous' });
    return true;
  };

  window.__editor = { canvas, stateManager, ui };
  console.info('Editor started');
}
