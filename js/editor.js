/* js/editor.js
   Editor con componentes e prototipado básico añadido.
   - Component library: create / insert / update / delete components
   - Instances: linked to componentId; updateComponent propaga cambios
   - Prototype links: vincular objeto -> pageIndex; modo Play Prototype para testear
   - Mantiene las funciones previas (images, pages, undo/redo, export, etc.)
   Reemplaza el archivo js/editor.js por este.
*/
(function () {
  /* ------------------- helpers (loader & colors) ------------------- */
  function loadScript(src, timeout = 8000) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      let done = false;
      s.src = src; s.async = true;
      s.onload = () => { if (!done) { done = true; resolve(); } };
      s.onerror = () => { if (!done) { done = true; reject(new Error('Failed to load ' + src)); } };
      document.head.appendChild(s);
      setTimeout(() => { if (!done) { done = true; reject(new Error('Timeout loading ' + src)); } }, timeout);
    });
  }
  function normalizeColor(value) { try { if (!value) return '#000000'; if (typeof value !== 'string') return '#000000'; value = value.trim(); if (value[0] === '#') { if (value.length === 4) { const r = value[1], g = value[2], b = value[3]; return ('#' + r + r + g + g + b + b).toLowerCase(); } return value.slice(0, 7).toLowerCase(); } const rgbMatch = value.match(/rgba?\s*\(\s*([0-9.]+)[^\d]*([0-9.]+)[^\d]*([0-9.]+)/i); if (rgbMatch) { const r = Math.max(0, Math.min(255, parseInt(rgbMatch[1], 10) || 0)); const g = Math.max(0, Math.min(255, parseInt(rgbMatch[2], 10) || 0)); const b = Math.max(0, Math.min(255, parseInt(rgbMatch[3], 10) || 0)); const toHex = (n) => ('0' + n.toString(16)).slice(-2); return ('#' + toHex(r) + toHex(g) + toHex(b)).toLowerCase(); } } catch (e) {} return '#000000'; }

  /* ------------------- ensure fabric ------------------- */
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
        if (window.fabric) return window.fabric;
      } catch (err) { lastErr = err; }
    }
    throw lastErr || new Error('No se pudo cargar Fabric.js');
  }

  /* ------------------- main start ------------------- */
  async function start() {
    try { await ensureFabricAvailable(); } catch (err) {
      console.error('Fabric no disponible:', err);
      const viewEditor = document.getElementById('view-editor');
      if (viewEditor) {
        const p = document.createElement('p'); p.style.color = 'red';
        p.textContent = 'Error: Fabric.js no se cargó. Revisa conexión/CDN.';
        viewEditor.querySelector('.panel')?.appendChild(p);
      }
      return;
    }

    if (window.__editorInitialized) return;
    window.__editorInitialized = true;

    // minimal DOM refs (defensive)
    const canvasEl = document.getElementById('canvas');
    const canvasWrap = document.getElementById('canvas-wrap');
    if (!canvasEl || !canvasWrap) { console.error('Faltan #canvas o #canvas-wrap'); return; }

    const fabricCanvas = new fabric.Canvas('canvas', { backgroundColor: '#ffffff', selection: true, preserveObjectStacking: true });
    window.fabricCanvas = fabricCanvas;

    /* ---------- state: pages, components, prototype links ---------- */
    const COMPONENTS_KEY = 'editor:components';
    const PAGES_KEY = 'editor:pages';
    function loadComponents() {
      try { const j = localStorage.getItem(COMPONENTS_KEY); return j ? JSON.parse(j) : []; } catch(e){ return []; }
    }
    function saveComponents(list) { try { localStorage.setItem(COMPONENTS_KEY, JSON.stringify(list)); } catch(e){ console.warn(e); } }

    let components = loadComponents(); // array { id, name, json }
    let pages = []; // loaded later
    let currentPage = -1;
    // prototype links are stored per page inside pages[i].links = [{ sourceId, targetPage }]
    function loadPages() {
      try { const j = localStorage.getItem(PAGES_KEY); if (!j) { pages = []; return; } pages = JSON.parse(j) || []; } catch(e) { pages = []; }
    }
    function savePages() { try { localStorage.setItem(PAGES_KEY, JSON.stringify(pages)); } catch(e){ console.warn(e); } }

    /* ---------- utility id generator ---------- */
    function genId(prefix='id') { return prefix + '_' + Math.random().toString(36).slice(2,9); }

    /* ---------- canvas resize & zoom/history (kept) ---------- */
    function resizeCanvas() {
      try {
        const rect = canvasWrap.getBoundingClientRect();
        const minW = 800, minH = 400;
        const w = Math.max(minW, Math.floor(rect.width));
        const h = Math.max(minH, Math.floor(rect.height));
        canvasEl.width = w; canvasEl.height = h;
        fabricCanvas.setWidth(w); fabricCanvas.setHeight(h);
        fabricCanvas.calcOffset(); fabricCanvas.requestRenderAll();
      } catch (e) {}
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    let currentZoom = 1; const zoomLevelEl = document.getElementById('zoom-level');
    function setZoom(z) { currentZoom = Math.max(0.1, Math.min(4, z)); fabricCanvas.setZoom(currentZoom); if (zoomLevelEl) zoomLevelEl.textContent = Math.round(currentZoom*100)+'%'; fabricCanvas.requestRenderAll(); }

    const undoStack = [], redoStack = [], HISTORY_LIMIT = 80;
    function pushState() { try { undoStack.push(fabricCanvas.toJSON(['selectable','__componentId','__isInstance','__objectId'])); if (undoStack.length>HISTORY_LIMIT) undoStack.shift(); redoStack.length=0; } catch(e){} }
    function restoreState(json) { if (!json) return; try { fabricCanvas.loadFromJSON(json, ()=>{ fabricCanvas.renderAll(); refreshLayersList(); updateSelectedInfo(); }); } catch(e){} }
    function undo(){ if(!undoStack.length) return; redoStack.push(fabricCanvas.toJSON()); const last = undoStack.pop(); restoreState(last); }
    function redo(){ if(!redoStack.length) return; undoStack.push(fabricCanvas.toJSON()); const next = redoStack.pop(); restoreState(next); }

    /* ---------- layers / props (kept) ---------- */
    const layersListEl = document.getElementById('layers-list');
    function refreshLayersList() {
      if (!layersListEl) return;
      layersListEl.innerHTML = '';
      const objs = fabricCanvas.getObjects().slice().reverse();
      objs.forEach(o => {
        const li = document.createElement('li');
        const label = (o.__isInstance ? '[Instance] ' : '') + o.type + (o.text ? ' — ' + (o.text.length>24?o.text.slice(0,24)+'…':o.text) : '');
        li.textContent = label;
        if (fabricCanvas.getActiveObject()===o) li.classList.add('active');
        const right = document.createElement('div'); right.style.display='flex'; right.style.gap='6px';
        const eye = document.createElement('button'); eye.className='btn small'; eye.innerHTML = o.visible===false?'<i class="fas fa-eye-slash"></i>':'<i class="fas fa-eye"></i>';
        eye.addEventListener('click', (ev)=>{ ev.stopPropagation(); pushState(); o.set('visible', !o.visible); eye.innerHTML = o.visible?'<i class="fas fa-eye"></i>':'<i class="fas fa-eye-slash"></i>'; fabricCanvas.requestRenderAll(); });
        right.appendChild(eye);
        li.appendChild(right);
        li.addEventListener('click', ()=>{ fabricCanvas.setActiveObject(o); fabricCanvas.requestRenderAll(); });
        layersListEl.appendChild(li);
      });
    }

    const propText = document.getElementById('prop-text');
    const propFill = document.getElementById('prop-fill');
    const propStroke = document.getElementById('prop-stroke');
    const propFontsize = document.getElementById('prop-fontsize');
    const propWidth = document.getElementById('prop-width');
    const propHeight = document.getElementById('prop-height');
    const propAngle = document.getElementById('prop-angle');
    const propOpacity = document.getElementById('prop-opacity');
    const selSummary = document.getElementById('sel-summary');

    function updateSelectedInfo() {
      const obj = fabricCanvas.getActiveObject();
      if (!obj) {
        if (selSummary) selSummary.textContent = 'Ninguno';
        if (propText) propText.value=''; if (propFill) propFill.value='#000000'; if (propStroke) propStroke.value='#000000';
        return;
      }
      if (selSummary) selSummary.textContent = (obj.__isInstance ? '[Instance] ' : '') + obj.type + (obj.text ? ' — "' + (obj.text).slice(0,30) + '"' : '');
      if (propText && ('text' in obj)) propText.value = obj.text || '';
      try { if (propFill) propFill.value = normalizeColor(obj.fill || '#000000'); } catch(e){ if(propFill) propFill.value='#000000'; }
      try { if (propStroke) propStroke.value = normalizeColor(obj.stroke || '#000000'); } catch(e){ if(propStroke) propStroke.value='#000000'; }
      try { if (propFontsize && obj.fontSize) propFontsize.value = obj.fontSize; } catch(e){}
      try { if (propWidth) propWidth.value = Math.round(obj.getScaledWidth()); } catch(e){}
      try { if (propHeight) propHeight.value = Math.round(obj.getScaledHeight()); } catch(e){}
      try { if (propAngle) propAngle.value = Math.round(obj.angle || 0); } catch(e){}
      try { if (propOpacity) propOpacity.value = (obj.opacity!=null?obj.opacity:1); } catch(e){}
      refreshLayersList();
    }

    // wire props
    if (propText) propText.addEventListener('input', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); if('text' in o){ o.text = propText.value; o.set('text', propText.value); } fabricCanvas.requestRenderAll(); });
    if (propFill) propFill.addEventListener('input', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); try{ o.set('fill', normalizeColor(propFill.value)); }catch(e){ o.set('fill', propFill.value); } fabricCanvas.requestRenderAll(); });
    if (propStroke) propStroke.addEventListener('input', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); try{ o.set('stroke', normalizeColor(propStroke.value)); }catch(e){ o.set('stroke', propStroke.value); } fabricCanvas.requestRenderAll(); });
    if (propFontsize) propFontsize.addEventListener('input', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o||!('fontSize' in o)) return; pushState(); o.set('fontSize', parseInt(propFontsize.value,10)||12); fabricCanvas.requestRenderAll(); });
    if (propWidth) propWidth.addEventListener('change', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); const w=parseFloat(propWidth.value)||o.width||1; o.scaleX = w/(o.width||1); o.setCoords(); fabricCanvas.requestRenderAll(); });
    if (propHeight) propHeight.addEventListener('change', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); const h=parseFloat(propHeight.value)||o.height||1; o.scaleY = h/(o.height||1); o.setCoords(); fabricCanvas.requestRenderAll(); });
    if (propAngle) propAngle.addEventListener('change', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); o.angle = parseFloat(propAngle.value)||0; o.setCoords(); fabricCanvas.requestRenderAll(); });
    if (propOpacity) propOpacity.addEventListener('input', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); o.opacity = parseFloat(propOpacity.value); fabricCanvas.requestRenderAll(); });

    // canvas events
    fabricCanvas.on('selection:created', updateSelectedInfo);
    fabricCanvas.on('selection:updated', updateSelectedInfo);
    fabricCanvas.on('selection:cleared', updateSelectedInfo);
    fabricCanvas.on('object:modified', function () { pushState(); updateSelectedInfo(); refreshLayersList(); });
    fabricCanvas.on('object:added', function (e) { if (e.target && e.target.excludeFromExport) return; pushState(); refreshLayersList(); });
    fabricCanvas.on('object:removed', function () { pushState(); refreshLayersList(); });

    // keyboard shortcuts
    document.addEventListener('keydown', (ev) => {
      const mod = ev.ctrlKey || ev.metaKey;
      if (mod && ev.key.toLowerCase() === 'z') { ev.preventDefault(); undo(); return; }
      if (mod && (ev.key.toLowerCase() === 'y' || (ev.shiftKey && ev.key.toLowerCase() === 'z'))) { ev.preventDefault(); redo(); return; }
      if (ev.key === 'Delete' || ev.key === 'Backspace') { deleteSelection(); return; }
      if (mod && ev.key.toLowerCase() === 'd') { ev.preventDefault(); duplicateSelection(); return; }
      if (mod && ev.key.toLowerCase() === 'g') { ev.preventDefault(); groupSelection(); return; }
      if (mod && ev.shiftKey && ev.key.toLowerCase() === 'g') { ev.preventDefault(); ungroupSelection(); return; }
    });

    /* ------------------- image upload, pages (existing) ------------------- */
    async function addImageFromFile(file) {
      if (!file) return;
      pushState();
      try {
        if (window.createImageBitmap) {
          try {
            const bitmap = await createImageBitmap(file);
            const canvasForBlob = document.createElement('canvas');
            canvasForBlob.width = bitmap.width; canvasForBlob.height = bitmap.height;
            const ctx = canvasForBlob.getContext('2d'); ctx.drawImage(bitmap, 0, 0);
            const MAX_DIM = 2048;
            let targetW = bitmap.width, targetH = bitmap.height;
            if (Math.max(targetW, targetH) > MAX_DIM) {
              const ratio = MAX_DIM / Math.max(targetW, targetH);
              targetW = Math.round(targetW * ratio); targetH = Math.round(targetH * ratio);
            }
            if (targetW !== canvasForBlob.width || targetH !== canvasForBlob.height) {
              const scaled = document.createElement('canvas'); scaled.width = targetW; scaled.height = targetH;
              const sctx = scaled.getContext('2d'); sctx.drawImage(canvasForBlob, 0, 0, targetW, targetH);
              const dataUrl = scaled.toDataURL('image/png');
              fabric.Image.fromURL(dataUrl, function (img) { img.set({ left:100, top:100, scaleX:1, scaleY:1 }); fabricCanvas.add(img).setActiveObject(img); refreshLayersList(); }, { crossOrigin:'anonymous' });
              return;
            } else {
              const dataUrl = canvasForBlob.toDataURL('image/png');
              fabric.Image.fromURL(dataUrl, function (img) { img.set({ left:100, top:100, scaleX:1, scaleY:1 }); fabricCanvas.add(img).setActiveObject(img); refreshLayersList(); }, { crossOrigin:'anonymous' });
              return;
            }
          } catch (e) { console.warn('createImageBitmap falló, usando objectURL', e); }
        }
        const url = URL.createObjectURL(file);
        fabric.Image.fromURL(url, function (img) {
          const MAX_DIM = 2048; let scale = 1;
          if (Math.max(img.width, img.height) > MAX_DIM) { scale = MAX_DIM / Math.max(img.width, img.height); img.scaleX = img.scaleY = scale; }
          img.set({ left:100, top:100 }); fabricCanvas.add(img).setActiveObject(img); refreshLayersList(); setTimeout(()=>URL.revokeObjectURL(url),2000);
        }, { crossOrigin:'anonymous' });
      } catch (err) { console.error('addImageFromFile error', err); alert('No se pudo subir la imagen.'); }
    }

    // pages implementation (kept similar to prior)
    function createArtboardRect(w,h,name){ const rect=new fabric.Rect({ left:(fabricCanvas.getWidth()-w)/2, top:(fabricCanvas.getHeight()-h)/2, width:w, height:h, fill:'#ffffff', stroke:'#ddd', selectable:false, hoverCursor:'default', customArtboard:true, originX:'left', originY:'top' }); return rect; }
    function newPage(presetIdOrObject){ pushState(); let preset = devicePresets.find(p=>p.id===presetIdOrObject); if(!preset && typeof presetIdOrObject==='object') preset = presetIdOrObject; if(!preset) preset={name:'Página', w:1024, h:768}; const page={ name: preset.name||'Página', width:preset.w||1024, height:preset.h||768, json:null, links:[] }; pages.push(page); savePages(); switchPage(pages.length-1); renderPagesList(); }
    function duplicatePage(index=currentPage){ if(index<0||index>=pages.length) return; const copy=Object.assign({}, pages[index], { name: pages[index].name+' (copia)' }); pages.splice(index+1,0,copy); savePages(); renderPagesList(); switchPage(index+1); }
    function deletePage(index=currentPage){ if(pages.length<=1){ if(!confirm('¿Eliminar la única página? Se reseteará.')) return; } pages.splice(index,1); if(currentPage>=pages.length) currentPage=pages.length-1; savePages(); renderPagesList(); switchPage(Math.max(0,currentPage)); }
    function switchPage(index){ if(index<0||index>=pages.length) return; if(currentPage>=0 && pages[currentPage]) { try{ pages[currentPage].json = fabricCanvas.toJSON(); pages[currentPage].links = pages[currentPage].links || pages[currentPage].links; savePages(); } catch(e){} } currentPage = index; fabricCanvas.clear(); const page = pages[index]; const artboard = createArtboardRect(page.width, page.height, page.name); fabricCanvas.add(artboard); if(page.json){ try{ fabricCanvas.loadFromJSON(page.json, ()=>{ const ab = fabricCanvas.getObjects().filter(o=>o.customArtboard); ab.forEach(o=>fabricCanvas.remove(o)); const art = createArtboardRect(page.width,page.height,page.name); fabricCanvas.insertAt(art,0); fabricCanvas.renderAll(); refreshLayersList(); updateSelectedInfo(); }); }catch(e){ fabricCanvas.renderAll(); } } else { fabricCanvas.renderAll(); } renderPagesList(); }
    function renderPagesList(){ const container=document.getElementById('pages-list'); if(!container) return; container.innerHTML=''; pages.forEach((p,idx)=>{ const b=document.createElement('button'); b.className='btn small'; if(idx===currentPage) b.classList.add('primary'); b.textContent=`${idx+1}. ${p.name}`; b.addEventListener('click',()=>switchPage(idx)); const del=document.createElement('button'); del.className='btn tiny danger'; del.textContent='✕'; del.style.marginLeft='6px'; del.addEventListener('click',(ev)=>{ ev.stopPropagation(); if(confirm('Eliminar página?')) deletePage(idx); }); const wrap=document.createElement('div'); wrap.style.display='flex'; wrap.style.alignItems='center'; wrap.style.marginBottom='6px'; wrap.appendChild(b); wrap.appendChild(del); container.appendChild(wrap); }); const add=document.getElementById('btn-new-page'); if(add) add.onclick = ()=> newPage('desktop'); }
    function exportCurrentPagePNG(){ const art = fabricCanvas.getObjects().find(o=>o.customArtboard); if(!art){ const dataURL = fabricCanvas.toDataURL({ format:'png', multiplier:2 }); downloadDataURL(dataURL,'page.png'); return; } const rect=art; try{ const dataURL=fabricCanvas.toDataURL({ format:'png', multiplier:2, left:rect.left, top:rect.top, width:rect.width*(rect.scaleX||1), height:rect.height*(rect.scaleY||1) }); downloadDataURL(dataURL,(pages[currentPage]?.name||'page')+'.png'); }catch(e){ const dataURL=fabricCanvas.toDataURL({format:'png', multiplier:2}); downloadDataURL(dataURL,'page.png'); } }
    function exportCurrentPageSVG(){ try{ const svg=fabricCanvas.toSVG(); const blob=new Blob([svg],{type:'image/svg+xml'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=(pages[currentPage]?.name||'page')+'.svg'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }catch(e){ console.error('export svg', e); } }
    function downloadDataURL(dataURL, filename){ const a=document.createElement('a'); a.href=dataURL; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); }

    /* ------------------- Components system ------------------- */
    // component: { id, name, json } where json is fabric JSON (array of objects or group)
    function listComponents() { return components.slice(); }
    function createComponentFromSelection(name) {
      const sel = fabricCanvas.getActiveObject();
      if (!sel) {
        alert('Selecciona un objeto o selección para crear un componente.');
        return null;
      }
      // If selection is activeSelection, we serialize selected objects as a group
      let compJson = null;
      if (sel.type === 'activeSelection') {
        const objects = sel.getObjects();
        // create a temporary group to serialize
        const group = new fabric.Group(objects.map(o=>o.clone()), { left:0, top:0 });
        compJson = group.toJSON(['__objectId','__componentId','__isInstance']);
        // destroy temp group
        group.destroy && group.destroy();
      } else {
        compJson = sel.toJSON(['__objectId','__componentId','__isInstance']);
      }
      const id = genId('comp');
      const comp = { id, name: name || ('Component ' + (components.length+1)), json: compJson };
      components.push(comp);
      saveComponents(components);
      // Replace selection with an instance of the component
      insertComponentInstance(id, { left: sel.left, top: sel.top });
      return comp;
    }

    async function insertComponentInstance(componentId, opts = {}) {
      const comp = components.find(c => c.id === componentId);
      if (!comp) { alert('Componente no encontrado'); return; }
      // load component.json into a fabric object (group) and add to canvas
      try {
        // fabric.loadFromJSON expects a top-level canvas JSON, we can use loadFromJSON on a temp canvas or on current canvas with care.
        // We'll create objects from comp.json manually:
        const tempCanvas = new fabric.StaticCanvas(null, { width: 10, height: 10 });
        // load objects into tempCanvas
        await new Promise((resolve) => {
          tempCanvas.loadFromJSON({ objects: Array.isArray(comp.json.objects ? comp.json.objects : (comp.json.objects || [])) ? comp.json : { objects: comp.json.objects || [] } }, () => resolve());
        });
        // clone objects and add to main canvas as a group
        const objs = tempCanvas.getObjects().map(o => o.clone());
        const group = new fabric.Group(objs, { left: opts.left || 120, top: opts.top || 120, selectable: true });
        group.__componentId = componentId;
        group.__isInstance = true;
        group.__objectId = genId('obj');
        fabricCanvas.add(group);
        fabricCanvas.setActiveObject(group);
        refreshLayersList();
        pushState();
        return group;
      } catch (e) {
        // fallback simple approach: use fabric.util.enlivenObjects if comp.json.objects exists
        try {
          const objsJson = comp.json.objects || (Array.isArray(comp.json) ? comp.json : (comp.json.objects || []));
          fabric.util.enlivenObjects(objsJson, function (enlivened) {
            const group = new fabric.Group(enlivened, { left: opts.left || 120, top: opts.top || 120 });
            group.__componentId = componentId;
            group.__isInstance = true;
            group.__objectId = genId('obj');
            fabricCanvas.add(group);
            fabricCanvas.setActiveObject(group);
            refreshLayersList();
            pushState();
            return group;
          }, '');
        } catch (err) {
          console.error('insertComponentInstance error', err); alert('No se pudo insertar instancia del componente.');
        }
      }
    }

    function detachInstance(obj) {
      const target = obj || fabricCanvas.getActiveObject();
      if (!target || !target.__isInstance) { alert('Selecciona una instancia para desagrupar/detach'); return; }
      pushState();
      // replace instance group by its ungrouped children at same position
      const children = target._objects ? target._objects.map(o => o.clone()) : [];
      const baseLeft = target.left || 0, baseTop = target.top || 0;
      // calculate relative positioning if needed
      children.forEach(ch => {
        ch.left = (ch.left || 0) + baseLeft;
        ch.top = (ch.top || 0) + baseTop;
        ch.__isInstance = false;
        fabricCanvas.add(ch);
      });
      fabricCanvas.remove(target);
      fabricCanvas.requestRenderAll();
      refreshLayersList();
      pushState();
    }

    function updateComponent(componentId, newName, newJson) {
      const comp = components.find(c => c.id === componentId);
      if (!comp) return false;
      if (newName) comp.name = newName;
      if (newJson) comp.json = newJson;
      // propagate to instances
      const instances = fabricCanvas.getObjects().filter(o => o.__componentId === componentId);
      instances.forEach(inst => {
        // remember transform
        const left = inst.left, top = inst.top, angle = inst.angle, scaleX = inst.scaleX, scaleY = inst.scaleY;
        // remove instance and insert a fresh one
        fabricCanvas.remove(inst);
        // insert a new instance (synchronous attempt)
        insertComponentInstance(componentId, { left, top }).then(newInst => {
          if (newInst) {
            newInst.set({ angle, scaleX, scaleY });
            fabricCanvas.requestRenderAll();
          }
        }).catch(e => console.warn('updateComponent::insert failed', e));
      });
      saveComponents(components);
      return true;
    }

    function deleteComponent(componentId) {
      components = components.filter(c => c.id !== componentId);
      saveComponents(components);
      // optionally remove instances
      const inst = fabricCanvas.getObjects().filter(o=>o.__componentId===componentId);
      inst.forEach(i=>fabricCanvas.remove(i));
      fabricCanvas.requestRenderAll();
      refreshLayersList();
    }

    /* ------------------- Prototype links ------------------- */
    // each page has links: array of { sourceObjectId, targetPageIndex, hotspotRect?:{left,top,width,height} }
    function createLinkFromSelection(targetPageIndex) {
      const sel = fabricCanvas.getActiveObject();
      if (!sel) { alert('Selecciona el objeto que actuará como hotspot'); return; }
      if (!pages[currentPage]) { alert('Página actual no válida'); return; }
      pages[currentPage].links = pages[currentPage].links || [];
      pages[currentPage].links.push({ sourceObjectId: sel.__objectId || (sel.__objectId = genId('obj')), targetPageIndex: targetPageIndex });
      savePages();
      alert('Link creado a página ' + (targetPageIndex + 1));
    }

    // Find link by object id on current page
    function findLinkByObject(objectId) {
      if (!pages[currentPage] || !pages[currentPage].links) return null;
      return pages[currentPage].links.find(l => l.sourceObjectId === objectId);
    }

    // Prototype mode: clicking on hotspot navigates to target page
    let prototypeMode = false;
    function playPrototype() {
      if (prototypeMode) return;
      prototypeMode = true;
      // Visual hint
      document.body.style.cursor = 'crosshair';
      alert('Prototype mode: haz clic en hotspots para navegar entre páginas. Presiona ESC para salir.');
      // attach click handler
      function onProtoClick(e) {
        // find clicked fabric object
        const pointer = fabricCanvas.getPointer(e);
        const objs = fabricCanvas.getObjects().slice().reverse();
        for (let o of objs) {
          if (o === undefined || !o.containsPoint) continue;
          try {
            if (o.containsPoint && o.containsPoint(pointer)) {
              const oid = o.__objectId;
              const link = findLinkByObject(oid);
              if (link) {
                stopPrototype(); // leave prototype before switching
                switchPage(link.targetPageIndex);
              } else {
                // no link: continue
              }
              return;
            }
          } catch (err) { /* some objects may not implement containsPoint */ }
        }
      }
      fabricCanvas.on('mouse:down', onProtoClick);
      // Esc to quit
      function onKey(e) { if (e.key === 'Escape') stopPrototype(); }
      window.addEventListener('keydown', onKey);
      // attach cleanup
      fabricCanvas._protoCleanup = function () { fabricCanvas.off('mouse:down', onProtoClick); window.removeEventListener('keydown', onKey); document.body.style.cursor=''; prototypeMode=false; delete fabricCanvas._protoCleanup; };
    }
    function stopPrototype() { if (fabricCanvas._protoCleanup) fabricCanvas._protoCleanup(); }

    /* ------------------- background removal (kept) ------------------- */
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
    function removeBackgroundFromImageData(imageData, tolerance = 32) {
      const w = imageData.width, h = imageData.height; const data = imageData.data;
      function similarColor(r1,g1,b1,r2,g2,b2,tol){ return Math.abs(r1-r2)<=tol && Math.abs(g1-g2)<=tol && Math.abs(b1-b2)<=tol; }
      const visited = new Uint8Array(w*h); const queue=[];
      function pushIf(idx){ if(!visited[idx]){ visited[idx]=1; queue.push(idx);} }
      for (let x=0;x<w;x++){ pushIf(x); pushIf((h-1)*w + x); }
      for (let y=0;y<h;y++){ pushIf(y*w + 0); pushIf(y*w + (w-1)); }
      const sampleIdx = 0;
      const baseR = data[sampleIdx*4+0], baseG = data[sampleIdx*4+1], baseB = data[sampleIdx*4+2];
      function pushNeighbor(nx,ny){ const nindex = ny*w + nx; if(!visited[nindex]){ visited[nindex]=1; queue.push(nindex); } }
      while(queue.length){
        const idx = queue.shift();
        const px = idx % w, py = Math.floor(idx / w), off = idx*4;
        const r = data[off+0], g = data[off+1], b = data[off+2];
        if (similarColor(r,g,b, baseR, baseG, baseB, tolerance)) {
          data[off+3] = 0;
          if(px>0) pushNeighbor(px-1,py);
          if(px<w-1) pushNeighbor(px+1,py);
          if(py>0) pushNeighbor(px,py-1);
          if(py<h-1) pushNeighbor(px,py+1);
        }
      }
      const outCanvas = document.createElement('canvas'); outCanvas.width = w; outCanvas.height = h;
      const outCtx = outCanvas.getContext('2d'); outCtx.putImageData(imageData,0,0);
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
              const tctx = tempCanvas.getContext('2d'); tctx.drawImage(bitmap,0,0);
              const imageData = await imageToImageData(tempCanvas, maxDim);
              return removeBackgroundFromImageData(imageData, tolerance);
            } catch (e) {}
          }
          const url = URL.createObjectURL(source);
          imgEl = await new Promise((res, rej) => { const im=new Image(); im.crossOrigin='anonymous'; im.onload=()=>res(im); im.onerror=(err)=>{ URL.revokeObjectURL(url); rej(err); }; im.src=url; });
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
      if (!active || active.type !== 'image') { alert('Selecciona primero una imagen en el lienzo.'); return; }
      try {
        let imgEl = active._element || null;
        if (!imgEl) {
          const url = active.toDataURL({ format:'png' });
          imgEl = await new Promise((res, rej) => { const im = new Image(); im.crossOrigin='anonymous'; im.onload=()=>res(im); im.onerror=(e)=>rej(e); im.src=url; });
        }
        const prevCursor = document.body.style.cursor; document.body.style.cursor = 'wait';
        const dataUrl = await removeBackgroundFromFileOrImage(imgEl, tolerance, 2048);
        fabric.Image.fromURL(dataUrl, function (newImg) {
          newImg.set({ left: active.left, top: active.top, angle: active.angle, scaleX: active.scaleX, scaleY: active.scaleY, originX: active.originX||'left', originY: active.originY||'top' });
          try { pushState(); } catch(_) {}
          fabricCanvas.remove(active); fabricCanvas.add(newImg); fabricCanvas.setActiveObject(newImg); fabricCanvas.requestRenderAll(); refreshLayersList();
          document.body.style.cursor = prevCursor; alert('Fondo eliminado (resultado aproximado).');
        }, { crossOrigin:'anonymous' });
      } catch (err) { console.error('Error quitando fondo:', err); document.body.style.cursor='default'; alert('No fue posible quitar el fondo de esta imagen (prueba otra o aumenta la tolerancia).'); }
    }

    // wire remove bg button
    document.getElementById('btn-remove-bg')?.addEventListener('click', async () => {
      const tolInput = document.getElementById('bg-tolerance'); const tol = tolInput?parseInt(tolInput.value,10):32;
      await removeBackgroundActiveImage(tol);
    });

    /* ------------------- prototype wiring buttons (create link, play) ------------------- */
    document.getElementById('btn-play-prototype')?.addEventListener('click', ()=> playPrototype());
    document.getElementById('btn-stop-prototype')?.addEventListener('click', ()=> stopPrototype());
    document.getElementById('btn-create-link')?.addEventListener('click', ()=> {
      const targetIdx = parseInt(prompt('Index de la página destino (1..N)'),10) - 1;
      if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= pages.length) { alert('Índice inválido'); return; }
      createLinkFromSelection(targetIdx);
    });

    /* ------------------- expose API ------------------- */
    window.editorAPI = Object.assign(window.editorAPI || {}, {
      createComponentFromSelection,
      insertComponentInstance,
      detachInstance,
      updateComponent,
      listComponents,
      deleteComponent,
      createLinkFromSelection,
      playPrototype,
      stopPrototype,
      removeBackgroundActiveImage
    });

    /* ------------------- final init: pages/components load ------------------- */
    loadPages();
    if (!pages.length) pages.push({ name:'Página 1', width:1024, height:768, json:null, links:[] });
    renderPagesList();
    // populate device presets select (if exists)
    const presetSelect = document.getElementById('device-select');
    if (presetSelect) {
      presetSelect.innerHTML = '';
      devicePresets.forEach(p => { const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; presetSelect.appendChild(o); });
    }
    // wire topbar editor open button
    document.getElementById('btn-open-editor')?.addEventListener('click', ()=> {
      document.querySelectorAll('.view-panel').forEach(v=>v.classList.add('hidden'));
      document.getElementById('view-editor')?.classList.remove('hidden');
      const pageTitle=document.getElementById('page-title'); if(pageTitle) pageTitle.textContent='Editor';
      setTimeout(()=>canvasEl.focus(),120);
    });

    console.info('Editor inicializado con COMPONENTS + PROTOTYPE features.');
  } // end start

  if (document.readyState !== 'loading') start(); else document.addEventListener('DOMContentLoaded', start);
})();
