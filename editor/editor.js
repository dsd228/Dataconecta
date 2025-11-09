// editor/editor.js (entry module)
// Coordinates loading Fabric.js, wiring state, storage, ui and plugins.
// Uses ES modules; run in modern browsers (GitHub Pages).
import { storage } from './storage.js';
import { createState } from './state.js';
import { initUI } from './ui.js';
import * as plugins from './plugins/index.js';

async function loadScript(src, timeout=8000) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      const start = Date.now();
      (function poll(){ if (window.fabric) return resolve(); if (Date.now()-start>3000) return reject(new Error('Fabric present but not initialized')); setTimeout(poll,80); })();
      return;
    }
    const s = document.createElement('script');
    s.src = src; s.async = true;
    let done=false;
    s.onload = () => { if(!done){ done=true; resolve(); } };
    s.onerror = (e) => { if(!done){ done=true; reject(new Error('Failed to load '+src)); } };
    document.head.appendChild(s);
    setTimeout(()=>{ if(!done){ done=true; reject(new Error('Timeout loading '+src)); } }, timeout);
  });
}

async function ensureFabric() {
  if (window.fabric) return window.fabric;
  const cdns = [
    'https://cdn.jsdelivr.net/npm/fabric@4.6.0/dist/fabric.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/4.6.0/fabric.min.js'
  ];
  for (const src of cdns) {
    try { await loadScript(src); if (window.fabric) return window.fabric; } catch(e){ console.warn('cdn fail', src, e); }
  }
  // local fallback path within repo for GitHub Pages
  try { await loadScript('/modules/vendor/fabric.min.js'); if (window.fabric) return window.fabric; } catch(e){ console.warn('local fallback fail', e); }
  throw new Error('Fabric.js could not be loaded from CDN or local fallback');
}

async function start() {
  try {
    await ensureFabric();
  } catch (err) {
    console.error('Fabric load failed', err);
    alert('Fabric.js no disponible. Revisa CDN o coloca modules/vendor/fabric.min.js');
    return;
  }

  const canvasEl = document.getElementById('canvas');
  const wrap = document.getElementById('canvas-wrap');
  if (!canvasEl || !wrap) {
    console.error('missing canvas or canvas-wrap');
    throw new Error('Faltan #canvas o #canvas-wrap en el HTML del módulo editor.');
  }

  // initialize Fabric canvas
  const canvas = new fabric.Canvas('canvas', { selection: true, preserveObjectStacking: true, backgroundColor: '#ffffff' });

  // state manager
  const stateManager = createState({ canvas });

  // expose minimal editor API for other modules
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
      // simple play: alert and allow clicks on hotspot objects
      return stateManager.state.prototypeLinks;
    },

    removeBackgroundActiveImage: async (tolerance=32) => {
      // basic delegation: implement small floodfill here or call other helper
      const active = canvas.getActiveObject();
      if (!active || active.type !== 'image') throw new Error('Select an image first');
      // delegate to a helper defined in editor/editor.js (for now call window.editorAPI internal)
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
    // Use same heuristic flood-fill approach as earlier modules
    let imgEl = activeImage._element;
    if (!imgEl) {
      const url = activeImage.toDataURL();
      imgEl = await new Promise((res, rej) => { const im = new Image(); im.crossOrigin='anonymous'; im.onload = ()=>res(im); im.onerror = rej; im.src = url; });
    }
    // create imageData
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

  // expose some methods to window for debugging
  window.__editor = { canvas, stateManager, ui };

  console.info('Editor started');
}

document.addEventListener('DOMContentLoaded', () => {
  start().catch(err => {
    console.error('editor start error', err);
    alert('Editor failed to start: ' + err.message);
  });
});
