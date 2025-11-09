// modules/editor.js
// Minimal editor module exposing editorAPI.init(params) and destroy()
// Loads Fabric.js dynamically (if not present) and provides few editing tools.

(function () {
  let mounted = false;
  let canvas = null;
  let handlers = [];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureFabric() {
    if (window.fabric) return;
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/fabric.js/4.6.0/fabric.min.js');
    if (!window.fabric) throw new Error('Fabric failed to load');
  }

  function initCanvas() {
    const canvasEl = document.getElementById('editor-canvas');
    if (!canvasEl) return;
    canvas = new fabric.Canvas('editor-canvas', { selection: true, backgroundColor: '#fff' });
  }

  function addRect() {
    if (!canvas) return;
    const r = new fabric.Rect({ left: 60, top: 40, width: 160, height: 100, fill: '#4f46e5' });
    canvas.add(r).setActiveObject(r);
  }
  function addText() {
    if (!canvas) return;
    const t = new fabric.Textbox('Texto', { left: 80, top: 160, width: 200, fontSize: 18, fill: '#111' });
    canvas.add(t).setActiveObject(t);
  }
  async function addImageFromFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    fabric.Image.fromURL(url, img => {
      img.set({ left: 80, top: 80, scaleX: 0.5, scaleY: 0.5 });
      canvas.add(img).setActiveObject(img);
      URL.revokeObjectURL(url);
    }, { crossOrigin: 'anonymous' });
  }

  function bindUI() {
    handlers.push({ el: document.getElementById('ed-btn-rect'), ev: 'click', fn: addRect });
    document.getElementById('ed-btn-rect')?.addEventListener('click', addRect);

    handlers.push({ el: document.getElementById('ed-btn-text'), ev: 'click', fn: addText });
    document.getElementById('ed-btn-text')?.addEventListener('click', addText);

    handlers.push({ el: document.getElementById('ed-btn-image'), ev: 'click', fn: () => document.getElementById('editor-image-input')?.click() });
    document.getElementById('ed-btn-image')?.addEventListener('click', () => document.getElementById('editor-image-input')?.click());

    handlers.push({ el: document.getElementById('editor-image-input'), ev: 'change', fn: (e) => {
      const f = e.target.files && e.target.files[0]; if (f) addImageFromFile(f); e.target.value = '';
    }});
    document.getElementById('editor-image-input')?.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0]; if (f) addImageFromFile(f); e.target.value = '';
    });
  }

  function unbindUI() {
    // best-effort remove listeners
    try {
      document.getElementById('ed-btn-rect')?.removeEventListener('click', addRect);
      document.getElementById('ed-btn-text')?.removeEventListener('click', addText);
      document.getElementById('ed-btn-image')?.removeEventListener('click', () => document.getElementById('editor-image-input')?.click());
      document.getElementById('editor-image-input')?.removeEventListener('change', handlers.find(h=>h.el&&h.el.id==='editor-image-input')?.fn);
    } catch (e){}
    handlers = [];
  }

  window.editorAPI = window.editorAPI || {};
  window.editorAPI.init = async function init(params = {}) {
    if (mounted) return;
    await ensureFabric();
    initCanvas();
    bindUI();
    mounted = true;
    return true;
  };

  window.editorAPI.destroy = function destroy() {
    if (!mounted) return;
    try { unbindUI(); canvas && canvas.dispose && canvas.dispose(); } catch(e){}
    mounted = false;
    document.getElementById('app-root')?.querySelector('.module-editor')?.remove();
  };
})();
