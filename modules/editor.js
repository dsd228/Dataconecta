/* modules/editor.js
   Corrected module-ready Editor script for GitHub Pages.
   - exposes window.editorAPI.init(params) and destroy()
   - ensureFabricAvailable tries CDNs and a local fallback at /modules/vendor/fabric.min.js
   - tolerates either #canvas/#canvas-wrap or #editor-canvas/#editor-canvas-wrap
*/
(function () {
  function loadScript(src, timeout = 8000) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        // wait briefly for initialization
        const start = Date.now();
        (function poll() {
          if (window.fabric) return resolve();
          if (Date.now() - start > 3000) return reject(new Error('Script present but window.fabric not initialized: ' + src));
          setTimeout(poll, 80);
        })();
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
    const waitShort = (ms) => new Promise(r => {
      const start = Date.now();
      (function poll() {
        if (window.fabric) return r(true);
        if (Date.now() - start > ms) return r(false);
        setTimeout(poll, 80);
      })();
    });
    if (await waitShort(1200)) return window.fabric;

    const cdns = [
      'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/4.6.0/fabric.min.js',
      'https://cdn.jsdelivr.net/npm/fabric@4.6.0/dist/fabric.min.js'
    ];
    let lastErr = null;
    for (const src of cdns) {
      try {
        await loadScript(src, 8000);
        const start = Date.now();
        while (!window.fabric && Date.now() - start < 2000) await new Promise(r => setTimeout(r, 80));
        if (window.fabric) { console.info('Fabric loaded from', src); return window.fabric; }
      } catch (err) {
        lastErr = err;
        console.warn('Failed to load Fabric from', src, err);
      }
    }

    // Local fallback for GitHub Pages: place a copy at /modules/vendor/fabric.min.js
    const local = '/modules/vendor/fabric.min.js';
    try {
      await loadScript(local, 8000);
      const start = Date.now();
      while (!window.fabric && Date.now() - start < 2000) await new Promise(r => setTimeout(r, 80));
      if (window.fabric) { console.info('Fabric loaded from local fallback', local); return window.fabric; }
    } catch (err) {
      lastErr = err;
      console.warn('Local fallback failed', err);
    }

    console.error('Unable to load Fabric.js', lastErr);
    throw lastErr || new Error('Unable to load Fabric.js');
  }

  // Accept multiple canvas id possibilities
  function findCanvasElements() {
    const canvasIds = ['#canvas', '#editor-canvas'];
    const wrapIds = ['#canvas-wrap', '#editor-canvas-wrap', '#editor-canvas'];
    let canvasEl = null, canvasWrap = null;
    for (const id of canvasIds) {
      const el = document.querySelector(id);
      if (el) { canvasEl = el; break; }
    }
    for (const id of wrapIds) {
      const el = document.querySelector(id);
      if (el) { canvasWrap = el; break; }
    }
    // if wrap not found but canvas is inside something, use canvas.parentElement
    if (!canvasWrap && canvasEl && canvasEl.parentElement) canvasWrap = canvasEl.parentElement;
    return { canvasEl, canvasWrap };
  }

  let mounted = false;
  let fabricCanvas = null;
  let destroyFns = [];

  async function start(params = {}) {
    await ensureFabricAvailable();

    const { canvasEl, canvasWrap } = findCanvasElements();
    if (!canvasEl || !canvasWrap) {
      console.error('Editor initialization failed: missing canvas or canvas-wrap in module HTML.');
      throw new Error('Faltan #canvas o #canvas-wrap en el HTML del módulo editor. Asegúrate que modules/editor.html contiene <canvas id="canvas"> y el contenedor con id="canvas-wrap".');
    }

    // create fabric instance (works if canvas already has id used)
    fabricCanvas = new fabric.Canvas(canvasEl.id || canvasEl, { backgroundColor: '#ffffff', preserveObjectStacking: true });
    window.fabricCanvas = fabricCanvas;

    // Minimal tools binding — toolbar buttons in modules/editor.html use modern IDs (btn-add-rect, btn-add-text, btn-upload-image, btn-remove-bg)
    function pushState(){ try { fabricCanvas && fabricCanvas.toJSON && null; } catch(e){} } // no-op placeholder for now

    function addRect(){ const r = new fabric.Rect({ left: 40, top: 40, width: 160, height: 100, fill: '#4f46e5' }); fabricCanvas.add(r).setActiveObject(r); }
    function addText(){ const t = new fabric.Textbox('Nuevo texto', { left: 80, top: 200, width: 240, fontSize: 18, fill:'#111827' }); fabricCanvas.add(t).setActiveObject(t); }
    async function addImageFromFile(file){
      if(!file) return;
      try {
        if (window.createImageBitmap) {
          const bitmap = await createImageBitmap(file);
          const tmp = document.createElement('canvas'); tmp.width = bitmap.width; tmp.height = bitmap.height;
          tmp.getContext('2d').drawImage(bitmap,0,0);
          const dataUrl = tmp.toDataURL('image/png');
          fabric.Image.fromURL(dataUrl, img => { img.set({ left:100, top:100 }); fabricCanvas.add(img).setActiveObject(img); }, { crossOrigin:'anonymous' });
        } else {
          const url = URL.createObjectURL(file);
          fabric.Image.fromURL(url, img => { img.set({ left:100, top:100 }); fabricCanvas.add(img).setActiveObject(img); URL.revokeObjectURL(url); }, { crossOrigin:'anonymous' });
        }
      } catch (err) { console.error('addImage error', err); alert('Error subiendo imagen'); }
    }

    // Bind buttons if present
    const btnRect = document.getElementById('btn-add-rect') || document.getElementById('ed-btn-rect');
    const btnText = document.getElementById('btn-add-text') || document.getElementById('ed-btn-text');
    const btnUpload = document.getElementById('btn-upload-image') || document.getElementById('ed-btn-image');
    const imgInput = document.getElementById('editor-image-input');

    if (btnRect) { btnRect.addEventListener('click', addRect); destroyFns.push(() => btnRect.removeEventListener('click', addRect)); }
    if (btnText) { btnText.addEventListener('click', addText); destroyFns.push(() => btnText.removeEventListener('click', addText)); }
    if (btnUpload && imgInput) {
      btnUpload.addEventListener('click', () => imgInput.click());
      destroyFns.push(() => btnUpload.removeEventListener('click', () => imgInput.click()));
      const onFile = (e) => { const f = e.target.files && e.target.files[0]; if (f) addImageFromFile(f); e.target.value = ''; };
      imgInput.addEventListener('change', onFile);
      destroyFns.push(() => imgInput.removeEventListener('change', onFile));
    }

    // remove bg button (if present) — uses simple cropping removal handler if editorAPI.removeBackgroundActiveImage is available or uses local implementation
    const btnRemoveBg = document.getElementById('btn-remove-bg');
    if (btnRemoveBg) {
      const fn = async () => {
        const tolEl = document.getElementById('bg-tolerance');
        const tol = tolEl ? parseInt(tolEl.value,10) : 32;
        // If advanced removeBackground implemented elsewhere, call it
        if (window.editorAPI && typeof window.editorAPI.removeBackgroundActiveImage === 'function') {
          try { await window.editorAPI.removeBackgroundActiveImage(tol); return; } catch(e) { console.warn('editorAPI.removeBackgroundActiveImage failed', e); }
        }
        alert('Quitar fondo requiere la implementación avanzada (editorAPI.removeBackgroundActiveImage). Si no está disponible, sube una imagen y usa recorte manual.');
      };
      btnRemoveBg.addEventListener('click', fn);
      destroyFns.push(() => btnRemoveBg.removeEventListener('click', fn));
    }

    mounted = true;
    return true;
  }

  window.editorAPI = Object.assign(window.editorAPI || {}, {
    init: async function init(params = {}) {
      if (mounted) return;
      await start(params);
      return true;
    },
    destroy: function destroy() {
      if (!mounted) return;
      // run destroy fns for bound handlers
      try { destroyFns.forEach(fn => { try { fn(); } catch(e){} }); } catch(e){}
      try { fabricCanvas && fabricCanvas.dispose && fabricCanvas.dispose(); } catch(e){}
      mounted = false;
      const el = document.getElementById('app-root')?.querySelector('.module-editor');
      if (el) el.remove();
    }
  });
})();
