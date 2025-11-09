/* js/editor.js
   Editor completo con UI de Component Library y Prototipado.
   - reemplaza tu archivo js/editor.js con este
*/
(function () {
  /* ---------------- Utilities ---------------- */
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
        }
      } catch (e) {}
    } catch (e) {}
    return '#000000';
  }
  function genId(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9); }

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
        while (!window.fabric && Date.now() - start < 2000) { await new Promise(r => setTimeout(r,80)); }
        if (window.fabric) return window.fabric;
      } catch (err) { lastErr = err; }
    }
    throw lastErr || new Error('No se pudo cargar Fabric.js');
  }

  /* ---------------- Main ---------------- */
  async function start() {
    try { await ensureFabricAvailable(); } catch (err) {
      console.error('Fabric no disponible:', err);
      const viewEditor = document.getElementById('view-editor');
      if (viewEditor) {
        const p = document.createElement('p'); p.style.color='red';
        p.textContent = 'Error: Fabric.js no se cargó. Revisa conexión/CDN.';
        viewEditor.querySelector('.panel')?.appendChild(p);
      }
      return;
    }
    if (window.__editorInitialized) return;
    window.__editorInitialized = true;

    const canvasEl = document.getElementById('canvas');
    const canvasWrap = document.getElementById('canvas-wrap');
    if (!canvasEl || !canvasWrap) { console.error('Faltan #canvas o #canvas-wrap'); return; }

    const fabricCanvas = new fabric.Canvas('canvas', { backgroundColor:'#ffffff', selection:true, preserveObjectStacking:true });
    window.fabricCanvas = fabricCanvas;

    const PAGES_KEY = 'editor:pages_v2';
    const COMPONENTS_KEY = 'editor:components_v2';
    const devicePresets = [
      { id:'desktop', name:'Desktop (1440x900)', w:1440,h:900 },
      { id:'tablet', name:'Tablet (768x1024)', w:768,h:1024 },
      { id:'mobile', name:'Mobile (375x812)', w:375,h:812 }
    ];

    let pages = [];
    let currentPage = -1;
    let components = [];

    function loadPages() { try { const j = localStorage.getItem(PAGES_KEY); pages = j ? JSON.parse(j) : []; } catch(e){ pages = []; } }
    function savePages(){ try{ localStorage.setItem(PAGES_KEY, JSON.stringify(pages)); }catch(e){ console.warn(e); } }
    function loadComponents(){ try{ const j = localStorage.getItem(COMPONENTS_KEY); components = j?JSON.parse(j):[]; }catch(e){ components=[]; } }
    function saveComponents(){ try{ localStorage.setItem(COMPONENTS_KEY, JSON.stringify(components)); }catch(e){ console.warn(e); } }

    // Resize + Zoom + History
    function resizeCanvas(){ try{ const rect = canvasWrap.getBoundingClientRect(); const minW=800,minH=400; const w=Math.max(minW,Math.floor(rect.width)); const h=Math.max(minH,Math.floor(rect.height)); canvasEl.width=w; canvasEl.height=h; fabricCanvas.setWidth(w); fabricCanvas.setHeight(h); fabricCanvas.calcOffset(); fabricCanvas.requestRenderAll(); }catch(e){console.warn(e);} }
    window.addEventListener('resize', resizeCanvas); resizeCanvas();

    let currentZoom = 1; const zoomLevelEl = document.getElementById('zoom-level');
    function setZoom(z){ currentZoom=Math.max(0.1,Math.min(4,z)); fabricCanvas.setZoom(currentZoom); if(zoomLevelEl) zoomLevelEl.textContent=Math.round(currentZoom*100)+'%'; fabricCanvas.requestRenderAll(); }

    const undoStack = [], redoStack = [], HISTORY_LIMIT = 80;
    function pushState(){ try{ undoStack.push(fabricCanvas.toJSON(['selectable','__componentId','__isInstance','__objectId'])); if(undoStack.length>HISTORY_LIMIT) undoStack.shift(); redoStack.length=0; }catch(e){} }
    function restoreState(json){ if(!json) return; try{ fabricCanvas.loadFromJSON(json,()=>{ fabricCanvas.renderAll(); refreshLayersList(); updateSelectedInfo(); }); }catch(e){} }
    function undo(){ if(!undoStack.length) return; redoStack.push(fabricCanvas.toJSON()); const last = undoStack.pop(); restoreState(last); }
    function redo(){ if(!redoStack.length) return; undoStack.push(fabricCanvas.toJSON()); const next = redoStack.pop(); restoreState(next); }

    // Layers & Props
    const layersListEl = document.getElementById('layers-list');
    const propText = document.getElementById('prop-text');
    const propFill = document.getElementById('prop-fill');
    const propStroke = document.getElementById('prop-stroke');
    const propFontsize = document.getElementById('prop-fontsize');
    const propWidth = document.getElementById('prop-width');
    const propHeight = document.getElementById('prop-height');
    const propAngle = document.getElementById('prop-angle');
    const propOpacity = document.getElementById('prop-opacity');
    const selSummary = document.getElementById('sel-summary');

    function refreshLayersList(){
      if(!layersListEl) return;
      layersListEl.innerHTML='';
      const objs = fabricCanvas.getObjects().slice().reverse();
      objs.forEach(o=>{
        const li = document.createElement('li');
        const label = (o.__isInstance? '[Instance] ':'') + (o.type) + (o.text? ' — ' + (o.text.length>20?o.text.slice(0,20)+'…':o.text):'');
        li.textContent = label;
        if (fabricCanvas.getActiveObject()===o) li.classList.add('active');
        const right = document.createElement('div'); right.style.display='flex'; right.style.gap='6px';
        const eye = document.createElement('button'); eye.className='btn small'; eye.innerHTML = o.visible===false?'<i class="fas fa-eye-slash"></i>':'<i class="fas fa-eye"></i>';
        eye.addEventListener('click',(ev)=>{ ev.stopPropagation(); pushState(); o.set('visible',!o.visible); eye.innerHTML = o.visible?'<i class="fas fa-eye"></i>':'<i class="fas fa-eye-slash"></i>'; fabricCanvas.requestRenderAll(); });
        right.appendChild(eye);
        li.appendChild(right);
        li.addEventListener('click',()=>{ fabricCanvas.setActiveObject(o); fabricCanvas.requestRenderAll(); });
        layersListEl.appendChild(li);
      });
    }

    function updateSelectedInfo(){
      const obj = fabricCanvas.getActiveObject();
      if(!obj){ if(selSummary) selSummary.textContent='Ninguno'; if(propText) propText.value=''; if(propFill) propFill.value='#000000'; if(propStroke) propStroke.value='#000000'; return; }
      if(selSummary) selSummary.textContent = (obj.__isInstance? '[Instance] ': '') + obj.type + (obj.text? ' — "' + (obj.text).slice(0,30) + '"' : '');
      if(propText && ('text' in obj)) propText.value = obj.text || '';
      try{ if(propFill) propFill.value = normalizeColor(obj.fill || '#000000'); }catch(e){ if(propFill) propFill.value='#000000'; }
      try{ if(propStroke) propStroke.value = normalizeColor(obj.stroke || '#000000'); }catch(e){ if(propStroke) propStroke.value='#000000'; }
      try{ if(propFontsize && obj.fontSize) propFontsize.value = obj.fontSize; }catch(e){}
      try{ if(propWidth) propWidth.value = Math.round(obj.getScaledWidth()); }catch(e){}
      try{ if(propHeight) propHeight.value = Math.round(obj.getScaledHeight()); }catch(e){}
      try{ if(propAngle) propAngle.value = Math.round(obj.angle || 0); }catch(e){}
      try{ if(propOpacity) propOpacity.value = (obj.opacity!=null?obj.opacity:1); }catch(e){}
      refreshLayersList();
    }

    if(propText) propText.addEventListener('input', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); if('text' in o){ o.text = propText.value; o.set('text', propText.value); } fabricCanvas.requestRenderAll(); });
    if(propFill) propFill.addEventListener('input', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); try{ o.set('fill', normalizeColor(propFill.value)); }catch(e){ o.set('fill', propFill.value); } fabricCanvas.requestRenderAll(); });
    if(propStroke) propStroke.addEventListener('input', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); try{ o.set('stroke', normalizeColor(propStroke.value)); }catch(e){ o.set('stroke', propStroke.value); } fabricCanvas.requestRenderAll(); });
    if(propFontsize) propFontsize.addEventListener('input', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o||!('fontSize' in o)) return; pushState(); o.set('fontSize', parseInt(propFontsize.value,10)||12); fabricCanvas.requestRenderAll(); });
    if(propWidth) propWidth.addEventListener('change', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); const w=parseFloat(propWidth.value)||o.width||1; o.scaleX = w/(o.width||1); o.setCoords(); fabricCanvas.requestRenderAll(); });
    if(propHeight) propHeight.addEventListener('change', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); const h=parseFloat(propHeight.value)||o.height||1; o.scaleY = h/(o.height||1); o.setCoords(); fabricCanvas.requestRenderAll(); });
    if(propAngle) propAngle.addEventListener('change', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); o.angle = parseFloat(propAngle.value)||0; o.setCoords(); fabricCanvas.requestRenderAll(); });
    if(propOpacity) propOpacity.addEventListener('input', ()=>{ const o=fabricCanvas.getActiveObject(); if(!o) return; pushState(); o.opacity = parseFloat(propOpacity.value); fabricCanvas.requestRenderAll(); });

    fabricCanvas.on('selection:created', updateSelectedInfo);
    fabricCanvas.on('selection:updated', updateSelectedInfo);
    fabricCanvas.on('selection:cleared', updateSelectedInfo);
    fabricCanvas.on('object:modified', ()=>{ pushState(); updateSelectedInfo(); refreshLayersList(); });
    fabricCanvas.on('object:added', (e)=>{ if(e.target && e.target.excludeFromExport) return; pushState(); refreshLayersList(); });
    fabricCanvas.on('object:removed', ()=>{ pushState(); refreshLayersList(); });

    document.addEventListener('keydown', (ev)=>{ const mod=ev.ctrlKey||ev.metaKey; if(mod && ev.key.toLowerCase()==='z'){ ev.preventDefault(); undo(); } if(mod && (ev.key.toLowerCase()==='y' || (ev.shiftKey && ev.key.toLowerCase()==='z'))){ ev.preventDefault(); redo(); } });

    // Basic shapes
    function addRect(){ pushState(); const rect=new fabric.Rect({ left:40, top:40, fill:'#4f46e5', width:160, height:100, rx:6, ry:6 }); fabricCanvas.add(rect).setActiveObject(rect); refreshLayersList(); }
    function addCircle(){ pushState(); const c=new fabric.Circle({ left:120, top:120, radius:50, fill:'#ef4444' }); fabricCanvas.add(c).setActiveObject(c); refreshLayersList(); }
    function addLine(){ pushState(); const l=new fabric.Line([50,50,200,50], { left:50, top:50, stroke:'#111111', strokeWidth:2 }); fabricCanvas.add(l).setActiveObject(l); refreshLayersList(); }
    function addText(){ pushState(); const t=new fabric.Textbox('Nuevo texto', { left:80, top:200, width:240, fontSize:18, fill:'#111827' }); fabricCanvas.add(t).setActiveObject(t); refreshLayersList(); }

    // Image upload
    async function addImageFromFile(file) {
      if(!file) return;
      pushState();
      try {
        if(window.createImageBitmap){
          try {
            const bitmap = await createImageBitmap(file);
            const canvasForBlob = document.createElement('canvas');
            canvasForBlob.width = bitmap.width; canvasForBlob.height = bitmap.height;
            const ctx = canvasForBlob.getContext('2d'); ctx.drawImage(bitmap,0,0);
            const MAX_DIM = 2048;
            let tw=bitmap.width, th=bitmap.height;
            if(Math.max(tw,th) > MAX_DIM){ const r = MAX_DIM/Math.max(tw,th); tw=Math.round(tw*r); th=Math.round(th*r); }
            if(tw !== canvasForBlob.width || th !== canvasForBlob.height){
              const scaled = document.createElement('canvas'); scaled.width=tw; scaled.height=th; const sctx=scaled.getContext('2d'); sctx.drawImage(canvasForBlob,0,0,tw,th);
              const dataUrl = scaled.toDataURL('image/png');
              fabric.Image.fromURL(dataUrl, img => { img.set({left:100,top:100}); fabricCanvas.add(img).setActiveObject(img); refreshLayersList(); }, { crossOrigin:'anonymous' });
              return;
            } else {
              const dataUrl = canvasForBlob.toDataURL('image/png');
              fabric.Image.fromURL(dataUrl, img => { img.set({left:100,top:100}); fabricCanvas.add(img).setActiveObject(img); refreshLayersList(); }, { crossOrigin:'anonymous' });
              return;
            }
          } catch(e){ console.warn('createImageBitmap failed, fallback', e); }
        }
        const url = URL.createObjectURL(file);
        fabric.Image.fromURL(url, img => { const MAX_DIM=2048; if(Math.max(img.width,img.height)>MAX_DIM){ const s=MAX_DIM/Math.max(img.width,img.height); img.scaleX=img.scaleY=s; } img.set({left:100,top:100}); fabricCanvas.add(img).setActiveObject(img); refreshLayersList(); setTimeout(()=>URL.revokeObjectURL(url),2000); }, { crossOrigin:'anonymous' });
      } catch(err){ console.error(err); alert('No se pudo subir la imagen.'); }
    }

    // Pages / Artboards
    function createArtboardRect(w,h,name){ return new fabric.Rect({ left:(fabricCanvas.getWidth()-w)/2, top:(fabricCanvas.getHeight()-h)/2, width:w, height:h, fill:'#fff', stroke:'#ddd', selectable:false, customArtboard:true, originX:'left', originY:'top' }); }
    function newPage(presetIdOrObject){ pushState(); let preset = devicePresets.find(p=>p.id===presetIdOrObject); if(!preset && typeof presetIdOrObject==='object') preset=presetIdOrObject; if(!preset) preset={name:'Página',w:1024,h:768}; const page={ name:preset.name||'Página', width:preset.w||1024, height:preset.h||768, json:null, links:[] }; pages.push(page); savePages(); switchPage(pages.length-1); renderPagesList(); }
    function duplicatePage(index=currentPage){ if(index<0||index>=pages.length) return; const copy=Object.assign({}, pages[index], { name: pages[index].name + ' (copia)' }); pages.splice(index+1,0,copy); savePages(); renderPagesList(); switchPage(index+1); }
    function deletePage(index=currentPage){ if(pages.length<=1){ if(!confirm('Eliminar única página?')) return; } pages.splice(index,1); if(currentPage>=pages.length) currentPage=pages.length-1; savePages(); renderPagesList(); switchPage(Math.max(0,currentPage)); }
    function switchPage(index){ if(index<0||index>=pages.length) return; if(currentPage>=0 && pages[currentPage]) { try{ pages[currentPage].json = fabricCanvas.toJSON(); savePages(); }catch(e){} } currentPage = index; fabricCanvas.clear(); const page = pages[index]; const artboard = createArtboardRect(page.width,page.height,page.name); fabricCanvas.add(artboard); if(page.json){ try{ fabricCanvas.loadFromJSON(page.json, ()=>{ const ab = fabricCanvas.getObjects().filter(o=>o.customArtboard); ab.forEach(o=>fabricCanvas.remove(o)); const art = createArtboardRect(page.width,page.height,page.name); fabricCanvas.insertAt(art,0); fabricCanvas.renderAll(); refreshLayersList(); updateSelectedInfo(); }); }catch(e){ fabricCanvas.renderAll(); } } else { fabricCanvas.renderAll(); } renderPagesList(); }
    function renderPagesList(){ const container = document.getElementById('pages-list'); if(!container) return; container.innerHTML=''; pages.forEach((p,idx)=>{ const wrap = document.createElement('div'); wrap.style.display='flex'; wrap.style.alignItems='center'; wrap.style.marginBottom='6px'; const b=document.createElement('button'); b.className='btn small'; if(idx===currentPage) b.classList.add('primary'); b.textContent = `${idx+1}. ${p.name}`; b.addEventListener('click', ()=> switchPage(idx)); const del=document.createElement('button'); del.className='btn tiny danger'; del.textContent='✕'; del.style.marginLeft='6px'; del.addEventListener('click', (ev)=>{ ev.stopPropagation(); if(confirm('Eliminar página?')) deletePage(idx); }); wrap.appendChild(b); wrap.appendChild(del); container.appendChild(wrap); }); const add=document.getElementById('btn-new-page'); if(add) add.onclick=()=> newPage('desktop'); }

    function exportCurrentPagePNG(){ const art = fabricCanvas.getObjects().find(o=>o.customArtboard); if(!art){ const dataURL = fabricCanvas.toDataURL({ format:'png', multiplier:2 }); downloadDataURL(dataURL,'page.png'); return; } const rect=art; try{ const dataURL = fabricCanvas.toDataURL({ format:'png', multiplier:2, left:rect.left, top:rect.top, width:rect.width*(rect.scaleX||1), height:rect.height*(rect.scaleY||1) }); downloadDataURL(dataURL,(pages[currentPage]?.name||'page')+'.png'); }catch(e){ const dataURL = fabricCanvas.toDataURL({ format:'png', multiplier:2 }); downloadDataURL(dataURL,'page.png'); } }
    function exportCurrentPageSVG(){ try{ const svg = fabricCanvas.toSVG(); const blob = new Blob([svg],{type:'image/svg+xml'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=(pages[currentPage]?.name||'page')+'.svg'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }catch(e){console.error(e);} }
    function downloadDataURL(dataURL,filename){ const a=document.createElement('a'); a.href=dataURL; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); }

    // Components: create from selection, insert, update, delete, drag-n-drop
    function createComponentFromSelection(name){
      const sel = fabricCanvas.getActiveObject();
      if(!sel){ alert('Selecciona un objeto o una selección para crear componente.'); return null; }
      let compJson = null;
      if(sel.type==='activeSelection'){
        const objs = sel.getObjects().map(o => o.toObject(['__objectId','__componentId','__isInstance']));
        compJson = { objects: objs };
      } else {
        compJson = { objects: [ sel.toObject(['__objectId','__componentId','__isInstance']) ] };
      }
      const id = genId('comp');
      const comp = { id, name: name || ('Component ' + (components.length+1)), json: compJson };
      components.push(comp); saveComponents();
      renderComponentsPreview();
      return comp;
    }

    // Render component thumbnails into components-preview and modal library
    async function renderComponentsPreview(){
      loadComponents();
      const preview = document.getElementById('components-preview');
      const libraryList = document.getElementById('library-list');
      if(preview) preview.innerHTML = '';
      if(libraryList) libraryList.innerHTML = '';
      components.forEach(async comp => {
        // create thumbnail using a temporary StaticCanvas
        const thumbWrapper = document.createElement('div'); thumbWrapper.className='component-card';
        const img = document.createElement('img'); img.alt = comp.name; img.src = '';
        const meta = document.createElement('div'); meta.className='meta'; meta.textContent = comp.name;
        thumbWrapper.appendChild(img); thumbWrapper.appendChild(meta);
        thumbWrapper.draggable = true;
        thumbWrapper.addEventListener('dragstart', (ev)=>{
          ev.dataTransfer.setData('text/plain', comp.id);
        });
        thumbWrapper.addEventListener('click', ()=>{ selectedComponentId = comp.id; highlightSelectedComponent(comp.id); });
        const btns = document.createElement('div');
        btns.style.display='flex'; btns.style.gap='6px'; btns.style.marginLeft='6px';
        const insertBtn = document.createElement('button'); insertBtn.className='btn tiny'; insertBtn.textContent='Insert';
        insertBtn.addEventListener('click', ()=> insertComponentInstance(comp.id));
        const delBtn = document.createElement('button'); delBtn.className='btn tiny danger'; delBtn.textContent='Del';
        delBtn.addEventListener('click', ()=>{ if(confirm('Eliminar componente?')){ deleteComponent(comp.id); } });
        btns.appendChild(insertBtn); btns.appendChild(delBtn);
        thumbWrapper.appendChild(btns);

        if(preview) preview.appendChild(thumbWrapper);
        if(libraryList){
          const big = thumbWrapper.cloneNode(true);
          big.querySelector('.meta').textContent = comp.name;
          big.addEventListener('click', ()=>{ selectedComponentId=comp.id; highlightSelectedComponent(comp.id); });
          libraryList.appendChild(big);
        }

        // generate thumbnail: use fabric.util.enlivenObjects to build objects and render to temp canvas
        try {
          const objectsJson = comp.json.objects || [];
          fabric.util.enlivenObjects(objectsJson, (enlivened) => {
            const tmp = new fabric.StaticCanvas(null, { width: 160, height: 120 });
            // normalize and add
            enlivened.forEach(o => {
              o.set({ left: (o.left||0), top: (o.top||0) });
              tmp.add(o);
            });
            tmp.renderAll();
            const data = tmp.toDataURL({ format:'png' });
            img.src = data;
            tmp.dispose && tmp.dispose();
          }, '');
        } catch(e) { console.warn('thumb error', e); img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="100%" height="100%" fill="#f3f4f6"/></svg>'); }
      });
    }

    function highlightSelectedComponent(id){
      const nodes = document.querySelectorAll('.component-card');
      nodes.forEach(n=> n.style.boxShadow = '');
      // simple highlight by matching image alt text
      const all = document.querySelectorAll('.component-card img');
      for(const img of all){ if(img.alt === (components.find(c=>c.id===id)?.name)){ img.parentElement.style.boxShadow='0 0 0 2px rgba(79,70,229,0.2)'; } }
    }

    function deleteComponent(componentId){
      components = components.filter(c=>c.id!==componentId);
      saveComponents();
      // remove instances
      const inst = fabricCanvas.getObjects().filter(o=>o.__componentId===componentId);
      inst.forEach(i=>fabricCanvas.remove(i));
      fabricCanvas.requestRenderAll();
      renderComponentsPreview();
    }

    // Insert component instance at drop/click
    async function insertComponentInstance(componentId, opts={ left:120, top:120 }){
      const comp = components.find(c=>c.id===componentId);
      if(!comp){ alert('Componente no encontrado'); return; }
      const objsJson = comp.json.objects || [];
      fabric.util.enlivenObjects(objsJson, (enlivened)=>{
        // position children relative to provided position
        try {
          const group = new fabric.Group(enlivened, { left: opts.left || 120, top: opts.top || 120 });
          group.__componentId = componentId;
          group.__isInstance = true;
          group.__objectId = genId('obj');
          fabricCanvas.add(group);
          fabricCanvas.setActiveObject(group);
          pushState();
          refreshLayersList();
        } catch (e) {
          console.warn('insert instance fallback', e);
        }
      });
    }

    function detachInstance(obj){
      const target = obj || fabricCanvas.getActiveObject();
      if(!target || !target.__isInstance){ alert('Selecciona una instancia para desagrupar'); return; }
      pushState();
      const children = target._objects ? target._objects.map(o=>o.clone()) : [];
      const baseLeft = target.left || 0, baseTop = target.top || 0;
      children.forEach(ch => { ch.left = (ch.left||0) + baseLeft; ch.top = (ch.top||0) + baseTop; ch.__isInstance = false; fabricCanvas.add(ch); });
      fabricCanvas.remove(target);
      fabricCanvas.requestRenderAll();
      refreshLayersList();
    }

    async function updateComponentFromSelection(componentId){
      const sel = fabricCanvas.getActiveObject();
      if(!sel){ alert('Selecciona una selección o grupo que represente el nuevo contenido del componente.'); return; }
      let compJson = null;
      if(sel.type === 'activeSelection'){
        const objs = sel.getObjects().map(o => o.toObject(['__objectId','__componentId','__isInstance']));
        compJson = { objects: objs };
      } else {
        compJson = { objects: [ sel.toObject(['__objectId','__componentId','__isInstance']) ] };
      }
      const comp = components.find(c=>c.id===componentId);
      if(!comp) { alert('Componente no encontrado'); return; }
      comp.json = compJson; saveComponents();
      // propagate updates
      const instances = fabricCanvas.getObjects().filter(o=>o.__componentId === componentId);
      for(const inst of instances){
        const left = inst.left, top = inst.top, angle = inst.angle, scaleX = inst.scaleX, scaleY = inst.scaleY;
        fabricCanvas.remove(inst);
        await insertComponentInstance(componentId, { left, top });
        const newInst = fabricCanvas.getObjects().slice(-1)[0];
        if(newInst){ newInst.set({ angle, scaleX, scaleY }); }
      }
      fabricCanvas.requestRenderAll();
    }

    // Drag & Drop handling for components
    canvasWrap.addEventListener('dragover', (ev)=>{ ev.preventDefault(); });
    canvasWrap.addEventListener('drop', (ev)=>{ ev.preventDefault(); const compId = ev.dataTransfer.getData('text/plain'); if(!compId) return; const rect = canvasWrap.getBoundingClientRect(); const x = ev.clientX - rect.left; const y = ev.clientY - rect.top; // convert to canvas coords
      const pt = fabricCanvas.getPointer(ev); insertComponentInstance(compId, { left: pt.x, top: pt.y }); });

    // Prototype: links and play mode
    function createLinkFromSelection(targetPageIndex){
      const sel = fabricCanvas.getActiveObject();
      if(!sel){ alert('Selecciona el objeto que actuará como hotspot'); return; }
      if(!pages[currentPage]) { alert('Página actual inválida'); return; }
      sel.__objectId = sel.__objectId || genId('obj');
      pages[currentPage].links = pages[currentPage].links || [];
      pages[currentPage].links.push({ sourceObjectId: sel.__objectId, targetPageIndex: targetPageIndex });
      savePages();
      alert('Link creado a página ' + (targetPageIndex + 1));
    }
    function findLinkByObject(objectId){ if(!pages[currentPage]||!pages[currentPage].links) return null; return pages[currentPage].links.find(l=>l.sourceObjectId===objectId); }

    let prototypeMode = false;
    function playPrototype(){
      if(prototypeMode) return;
      prototypeMode = true;
      document.body.style.cursor = 'crosshair';
      alert('Prototype mode activo. Clic en hotspots para navegar. ESC para salir.');
      function onProtoClick(e){
        const pointer = fabricCanvas.getPointer(e);
        const objs = fabricCanvas.getObjects().slice().reverse();
        for(const o of objs){
          try{
            if(o.containsPoint && o.containsPoint(pointer)){
              const oid = o.__objectId;
              const link = findLinkByObject(oid);
              if(link){ stopPrototype(); switchPage(link.targetPageIndex); return; }
            }
          }catch(err){}
        }
      }
      function onKey(e){ if(e.key==='Escape'){ stopPrototype(); } }
      fabricCanvas.on('mouse:down', onProtoClick);
      window.addEventListener('keydown', onKey);
      fabricCanvas._protoCleanup = ()=>{ fabricCanvas.off('mouse:down', onProtoClick); window.removeEventListener('keydown', onKey); document.body.style.cursor=''; prototypeMode=false; delete fabricCanvas._protoCleanup; };
    }
    function stopPrototype(){ fabricCanvas._protoCleanup && fabricCanvas._protoCleanup(); }

    // Background removal (kept)
    async function imageToImageData(imgSource, maxDim=2048){ const w = imgSource.width || imgSource.naturalWidth; const h = imgSource.height || imgSource.naturalHeight; let targetW = w, targetH = h; if(Math.max(w,h)>maxDim){ const r = maxDim/Math.max(w,h); targetW = Math.round(w*r); targetH=Math.round(h*r); } const c=document.createElement('canvas'); c.width=targetW; c.height=targetH; const ctx=c.getContext('2d'); ctx.drawImage(imgSource,0,0,targetW,targetH); return ctx.getImageData(0,0,c.width,c.height); }
    function removeBackgroundFromImageData(imageData,tolerance=32){ const w=imageData.width,h=imageData.height,data=imageData.data; function similarColor(r1,g1,b1,r2,g2,b2,tol){ return Math.abs(r1-r2)<=tol && Math.abs(g1-g2)<=tol && Math.abs(b1-b2)<=tol; } const visited=new Uint8Array(w*h); const queue=[]; function pushIf(idx){ if(!visited[idx]){ visited[idx]=1; queue.push(idx); } } for(let x=0;x<w;x++){ pushIf(x); pushIf((h-1)*w + x); } for(let y=0;y<h;y++){ pushIf(y*w); pushIf(y*w + (w-1)); } const sampleIdx = 0; const baseR=data[sampleIdx*4+0], baseG=data[sampleIdx*4+1], baseB=data[sampleIdx*4+2]; function pushNeighbor(nx,ny){ const nindex = ny*w + nx; if(!visited[nindex]){ visited[nindex]=1; queue.push(nindex); } } while(queue.length){ const idx=queue.shift(); const px = idx % w, py = Math.floor(idx / w), off = idx*4; const r=data[off+0], g=data[off+1], b=data[off+2]; if(similarColor(r,g,b, baseR, baseG, baseB, tolerance)){ data[off+3]=0; if(px>0) pushNeighbor(px-1,py); if(px<w-1) pushNeighbor(px+1,py); if(py>0) pushNeighbor(px,py-1); if(py<h-1) pushNeighbor(px,py+1); } } const outCanvas=document.createElement('canvas'); outCanvas.width=w; outCanvas.height=h; const outCtx=outCanvas.getContext('2d'); outCtx.putImageData(imageData,0,0); return outCanvas.toDataURL('image/png'); }
    async function removeBackgroundFromFileOrImage(source,tolerance=32,maxDim=2048){ try{ let imgEl=null; if(source instanceof File){ if(window.createImageBitmap){ try{ const bitmap=await createImageBitmap(source); const tmp=document.createElement('canvas'); tmp.width=bitmap.width; tmp.height=bitmap.height; tmp.getContext('2d').drawImage(bitmap,0,0); const imageData=await imageToImageData(tmp,maxDim); return removeBackgroundFromImageData(imageData,tolerance); }catch(e){} } const url = URL.createObjectURL(source); imgEl = await new Promise((res,rej)=>{ const im=new Image(); im.crossOrigin='anonymous'; im.onload=()=>res(im); im.onerror=(err)=>{ URL.revokeObjectURL(url); rej(err);} ; im.src = url; }); const imageData = await imageToImageData(imgEl,maxDim); if(imgEl.src && imgEl.src.startsWith('blob:')) URL.revokeObjectURL(imgEl.src); return removeBackgroundFromImageData(imageData,tolerance); } else if(source instanceof HTMLImageElement || source instanceof ImageBitmap || source instanceof HTMLCanvasElement){ const imageData=await imageToImageData(source,maxDim); return removeBackgroundFromImageData(imageData,tolerance); } else throw new Error('Tipo de fuente no soportado'); } catch(err){ console.error(err); throw err; } }
    async function removeBackgroundActiveImage(tolerance=32){ if(!fabricCanvas) throw new Error('fabricCanvas no definido'); const active=fabricCanvas.getActiveObject(); if(!active || active.type!=='image'){ alert('Selecciona primero una imagen en el lienzo.'); return; } try{ let imgEl = active._element || null; if(!imgEl){ const url = active.toDataURL({ format:'png' }); imgEl = await new Promise((res,rej)=>{ const im=new Image(); im.crossOrigin='anonymous'; im.onload=()=>res(im); im.onerror=(e)=>rej(e); im.src = url; }); } const prev = document.body.style.cursor; document.body.style.cursor='wait'; const dataUrl = await removeBackgroundFromFileOrImage(imgEl,tolerance,2048); fabric.Image.fromURL(dataUrl, function(newImg){ newImg.set({ left: active.left, top: active.top, angle: active.angle, scaleX: active.scaleX, scaleY: active.scaleY, originX: active.originX||'left', originY: active.originY||'top' }); try{ pushState(); }catch(_){} fabricCanvas.remove(active); fabricCanvas.add(newImg); fabricCanvas.setActiveObject(newImg); fabricCanvas.requestRenderAll(); refreshLayersList(); document.body.style.cursor = prev; alert('Fondo eliminado (resultado aproximado).'); }, { crossOrigin:'anonymous' }); } catch(err){ console.error(err); document.body.style.cursor='default'; alert('No fue posible quitar el fondo.'); } }

    // Wire basic UI buttons
    document.getElementById('btn-add-rect')?.addEventListener('click', addRect);
    document.getElementById('btn-add-circle')?.addEventListener('click', addCircle);
    document.getElementById('btn-add-line')?.addEventListener('click', addLine);
    document.getElementById('btn-add-text')?.addEventListener('click', addText);
    document.getElementById('btn-upload-image')?.addEventListener('click', ()=> document.getElementById('editor-image-input')?.click());
    document.getElementById('editor-image-input')?.addEventListener('change', (e)=>{ const f=e.target.files&&e.target.files[0]; if(f) addImageFromFile(f); e.target.value=''; });
    document.getElementById('btn-undo')?.addEventListener('click', undo);
    document.getElementById('btn-redo')?.addEventListener('click', redo);
    document.getElementById('btn-fit')?.addEventListener('click', ()=> setZoom(1));
    document.getElementById('btn-export-png')?.addEventListener('click', exportCurrentPagePNG);
    document.getElementById('btn-export-svg')?.addEventListener('click', exportCurrentPageSVG);
    document.getElementById('btn-toggle-grid')?.addEventListener('click', ()=>{ toggleGrid(); });

    function toggleGrid(){ let gridShown = fabricCanvas.__gridShown || false; fabricCanvas.__gridShown = !gridShown; // re-use existing functionless approach
      // remove old grid
      (fabricCanvas.__gridLines||[]).forEach(l=>fabricCanvas.remove(l));
      fabricCanvas.__gridLines = [];
      if(fabricCanvas.__gridShown){ const step=20; for(let i=0;i<fabricCanvas.width;i+=step){ const line=new fabric.Line([i,0,i,fabricCanvas.height], { stroke:'#eee', selectable:false, evented:false, excludeFromExport:true }); fabricCanvas.add(line); fabricCanvas.__gridLines.push(line);} for(let j=0;j<fabricCanvas.height;j+=step){ const line=new fabric.Line([0,j,fabricCanvas.width,j], { stroke:'#eee', selectable:false, evented:false, excludeFromExport:true }); fabricCanvas.add(line); fabricCanvas.__gridLines.push(line);} fabricCanvas.__gridLines.forEach(l=>l.sendToBack()); } fabricCanvas.requestRenderAll(); }

    // Components UI wiring
    loadComponents(); renderComponentsPreview();
    document.getElementById('btn-create-component')?.addEventListener('click', ()=> {
      const name = prompt('Nombre del componente:') || null;
      const comp = createComponentFromSelection(name);
      if(comp){ alert('Componente creado: ' + comp.name); renderComponentsPreview(); }
    });
    document.getElementById('btn-insert-component')?.addEventListener('click', ()=>{
      const id = (components[0] && components[0].id) ? components[0].id : null;
      if(!id){ alert('No hay componentes en la librería.'); return; }
      insertComponentInstance(id, { left: 180, top: 120 });
    });
    document.getElementById('btn-open-library')?.addEventListener('click', ()=>{ document.getElementById('library-modal').classList.remove('hidden'); renderComponentsPreview(); });
    document.getElementById('lib-close')?.addEventListener('click', ()=> document.getElementById('library-modal').classList.add('hidden'));
    document.getElementById('btn-refresh-components')?.addEventListener('click', ()=> renderComponentsPreview());

    // Insert component by selected card: handled by component card's insert button created in renderComponentsPreview

    // Update component from selection
    document.getElementById('btn-update-component')?.addEventListener('click', async ()=>{
      const selComp = components[0];
      if(!selComp){ alert('Selecciona un componente en la librería preview antes (click sobre su card).'); return; }
      await updateComponentFromSelection(selComp.id);
      alert('Componente actualizado y cambios propagados.');
    });

    // Detach instance
    document.getElementById('btn-detach-instance')?.addEventListener('click', ()=> detachInstance());

    // Component import/export
    document.getElementById('btn-export-library')?.addEventListener('click', ()=>{
      loadComponents();
      const data = JSON.stringify(components, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'components.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });
    document.getElementById('btn-import-library')?.addEventListener('click', ()=> document.getElementById('component-import-file')?.click());
    document.getElementById('component-import-file')?.addEventListener('change', (e)=> {
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      const reader = new FileReader();
      reader.onload = (ev)=>{
        try{
          const json = JSON.parse(ev.target.result);
          if(Array.isArray(json)) components = components.concat(json);
          else components.push(json);
          saveComponents(); renderComponentsPreview(); alert('Library importada.');
        }catch(err){ alert('JSON inválido'); }
      };
      reader.readAsText(f);
      e.target.value = '';
    });

    // Prototype wiring
    document.getElementById('btn-create-link')?.addEventListener('click', ()=> {
      const idxStr = prompt('Página destino (1..N):');
      const idx = parseInt(idxStr,10)-1;
      if(isNaN(idx) || idx<0 || idx>=pages.length){ alert('Índice inválido'); return; }
      createLinkFromSelection(idx);
    });
    document.getElementById('btn-play-prototype')?.addEventListener('click', ()=> playPrototype());
    document.getElementById('btn-stop-prototype')?.addEventListener('click', ()=> stopPrototype());

    // Remove background button
    document.getElementById('btn-remove-bg')?.addEventListener('click', async ()=> {
      const tolInput = document.getElementById('bg-tolerance'); const tol = tolInput?parseInt(tolInput.value,10):32;
      await removeBackgroundActiveImage(tol);
    });

    // Topbar open editor
    document.getElementById('btn-open-editor')?.addEventListener('click', ()=>{
      document.querySelectorAll('.view-panel').forEach(v => v.classList.add('hidden'));
      document.getElementById('view-editor')?.classList.remove('hidden');
      const pageTitle = document.getElementById('page-title'); if(pageTitle) pageTitle.textContent='Editor';
      setTimeout(()=> canvasEl.focus(),120);
    });

    // Init: load pages/components and switch to first page
    loadComponents();
    loadPages();
    if(!pages.length) pages.push({ name:'Página 1', width:1024, height:768, json:null, links:[] });
    renderPagesList();
    renderComponentsPreview();
    const presetSelect = document.getElementById('device-select');
    if(presetSelect){ presetSelect.innerHTML=''; devicePresets.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; presetSelect.appendChild(o); }); }
    document.getElementById('btn-add-artboard-from-preset')?.addEventListener('click', ()=>{ const pid = document.getElementById('device-select')?.value; newPage(pid); });
    document.getElementById('btn-new-page')?.addEventListener('click', ()=> newPage('desktop'));
    switchPage(0);
    pushState();

    // Expose API
    window.editorAPI = Object.assign(window.editorAPI||{}, {
      createComponentFromSelection,
      insertComponentInstance,
      detachInstance,
      updateComponentFromSelection,
      listComponents: ()=>components.slice(),
      removeBackgroundActiveImage,
      playPrototype,
      stopPrototype
    });

    console.info('Editor avanzado inicializado (Component Library + Prototype).');
  } // end start

  if(document.readyState !== 'loading') start(); else document.addEventListener('DOMContentLoaded', start);
})();
