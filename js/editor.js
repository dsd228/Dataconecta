// editor.js - Editor Premium (Konva-based) with features:
// - component palette & saved components
// - undo/redo stack (simple)
// - export HTML (basic), export/import components
// - zoom, grid, responsive views
// - save components to localStorage (key: dataconecta_editor_components_v1)

(function(){
  // Helpers
  const UID = () => 'e_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const COMP_KEY = 'dataconecta_editor_components_v1';
  function showToast(msg, ttl=3000){
    const wrap = document.getElementById('editor-toast');
    const t = document.createElement('div'); t.className='toast'; t.textContent = msg;
    wrap.appendChild(t); setTimeout(()=>t.remove(), ttl);
  }
  function saveComponents(list){ localStorage.setItem(COMP_KEY, JSON.stringify(list||[])); }
  function loadComponents(){ try{ return JSON.parse(localStorage.getItem(COMP_KEY)||'[]'); }catch(e){ return []; } }

  // Stage defaults
  const views = {
    desktop: { width: 1366, height: 768 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 }
  };
  let currentView = 'desktop';

  // Init Konva stage
  const stageContainer = document.getElementById('canvas-stage');
  let stage = new Konva.Stage({ container: 'canvas-stage', width: views.desktop.width, height: views.desktop.height });
  let layer = new Konva.Layer();
  stage.add(layer);

  // Transformer and selection
  const tr = new Konva.Transformer({ rotateEnabled:false, padding:4, anchorSize:8 });
  layer.add(tr);
  let selected = null;

  // Undo / redo stacks
  const undoStack = [];
  const redoStack = [];
  function pushUndo(action){ undoStack.push(action); if(undoStack.length>50) undoStack.shift(); redoStack.length=0; }

  // Grid
  const gridGroup = new Konva.Group({ listening:false });
  layer.add(gridGroup);
  function drawGrid(step=20){
    gridGroup.destroyChildren();
    const w = stage.width(), h = stage.height();
    for(let x=0;x<w;x+=step){
      gridGroup.add(new Konva.Line({ points:[x,0,x,h], stroke:'#f0f6fb', strokeWidth:1 }));
    }
    for(let y=0;y<h;y+=step){
      gridGroup.add(new Konva.Line({ points:[0,y,w,y], stroke:'#f0f6fb', strokeWidth:1 }));
    }
    layer.batchDraw();
  }
  document.getElementById('show-grid').addEventListener('change', (e)=> {
    const visible = e.target.checked;
    gridGroup.visible(visible);
    layer.draw();
  });
  document.getElementById('snap-grid').addEventListener('change', ()=> { /* handled in dragend */ });

  // zoom
  const zoomRange = document.getElementById('zoom-range');
  zoomRange.addEventListener('input', ()=> {
    const v = parseFloat(zoomRange.value);
    stage.scale({ x:v, y:v });
    stage.draw();
  });

  // Palette dragstart
  document.querySelectorAll('.component-item').forEach(item=>{
    item.draggable = true;
    item.addEventListener('dragstart', (ev)=>{
      ev.dataTransfer.setData('text/plain', item.dataset.type);
      window.__editor_drag_type = item.dataset.type;
    });
  });

  // Drop on stage (use container)
  const sc = stage.container();
  sc.addEventListener('dragover', ev=> ev.preventDefault());
  sc.addEventListener('drop', ev=>{
    ev.preventDefault();
    const type = ev.dataTransfer.getData('text/plain') || window.__editor_drag_type;
    if(!type) return;
    // pointer pos relative to stage container
    const rect = sc.getBoundingClientRect();
    const pos = {
      x: (ev.clientX - rect.left) / (stage.scaleX() || 1),
      y: (ev.clientY - rect.top) / (stage.scaleY() || 1)
    };
    createElement(type, pos);
    window.__editor_drag_type = null;
  });

  // create element factory
  function createElement(type, pos){
    let node = null;
    if(type === 'Text'){
      node = new Konva.Text({ x:pos.x, y:pos.y, text:'Texto', fontSize:20, fill:'#222', draggable:true, id:UID(), draggable:true, name:'Text' });
    } else if(type === 'Button'){
      const g = new Konva.Group({ x:pos.x, y:pos.y, id:UID(), draggable:true, name:'Button' });
      const rect = new Konva.Rect({ width:140, height:40, fill:'#2b8fe6', cornerRadius:6 });
      const txt = new Konva.Text({ text:'Click', fontSize:16, fill:'#fff', width:140, height:40, align:'center', verticalAlign:'middle', listening:false });
      g.add(rect, txt);
      node = g;
    } else if(type === 'Image'){
      const g = new Konva.Group({ x:pos.x, y:pos.y, id:UID(), draggable:true, name:'Image' });
      const rect = new Konva.Rect({ width:160, height:100, fill:'#eee', stroke:'#ccc' });
      const lab = new Konva.Text({ text:'IMAGEN', fontSize:14, fill:'#999', width:160, height:100, align:'center', verticalAlign:'middle', listening:false });
      g.add(rect, lab);
      node = g;
    } else if(type === 'Input'){
      const g = new Konva.Group({ x:pos.x, y:pos.y, id:UID(), draggable:true, name:'Input' });
      const rect = new Konva.Rect({ width:220, height:36, fill:'#fff', stroke:'#ccc', cornerRadius:6 });
      const txt = new Konva.Text({ text:'Placeholder', fontSize:14, fill:'#999', width:220, height:36, align:'left', verticalAlign:'middle', padding:8, listening:false });
      g.add(rect, txt);
      node = g;
    } else {
      // try to instantiate saved component JSON if type is a JSON string
      try {
        const parsed = JSON.parse(type);
        node = Konva.Node.create(parsed);
        node.id(UID());
      } catch(e){}
    }

    if(node){
      layer.add(node);
      node.on('click tap', (e)=> selectNode(node));
      node.on('dragend', ()=> { if(document.getElementById('snap-grid').checked){ node.x(Math.round(node.x()/10)*10); node.y(Math.round(node.y()/10)*10); } layer.draw(); });
      pushUndo({ type:'add', nodeData: node.toObject(), undo: ()=> { const n = layer.findOne('#' + node.id()); if(n) n.destroy(); layer.draw(); } });
      layer.draw();
      selectNode(node);
      return node;
    }
    return null;
  }

  // selection
  function selectNode(node){
    selected = node;
    tr.nodes([node]);
    drawProperties(node);
    layer.draw();
  }
  function deselect(){
    selected = null; tr.nodes([]); drawProperties(null); layer.draw();
  }
  stage.on('click tap', (e)=>{
    if(e.target === stage) return deselect();
    // if clicked on child inside group, bubble up
    let node = e.target;
    if(node.getParent && node.getParent().getClassName() === 'Group') node = node.getParent();
    selectNode(node);
  });

  // properties panel
  const props = document.getElementById('properties-panel');
  function drawProperties(node){
    props.innerHTML = '';
    if(!node){ props.innerHTML = '<div class="muted">Selecciona un elemento</div>'; return; }
    const type = node.getClassName();
    const html = [];
    html.push(`<div><strong>ID:</strong> ${node.id()}</div>`);
    if(node.getAttr && node.getAttr('name')) html.push(`<div><strong>Tipo:</strong> ${node.getAttr('name')}</div>`);
    // position
    html.push(`<label>X <input id="prop-x" type="number" value="${Math.round(node.x())}"/></label>`);
    html.push(`<label>Y <input id="prop-y" type="number" value="${Math.round(node.y())}"/></label>`);
    if(node.getClassName() === 'Text' || node.findOne && node.findOne('Text')){
      const text = node.getClassName()==='Text' ? node : node.findOne('Text');
      html.push(`<label>Texto <input id="prop-text" value="${escapeAttr(text.text())}"/></label>`);
      html.push(`<label>Tamaño <input id="prop-font" type="number" value="${text.fontSize()}"/></label>`);
      html.push(`<label>Color <input id="prop-color" type="color" value="${rgbToHex(text.fill()||'#000')}"/></label>`);
    }
    if(node.getClassName() === 'Group' && node.findOne('Rect')){
      const rect = node.findOne('Rect');
      html.push(`<label>Fondo <input id="prop-bg" type="color" value="${rgbToHex(rect.fill()||'#ffffff')}"/></label>`);
    }
    html.push(`<div style="display:flex;gap:8px"><button id="prop-delete" class="btn">Eliminar</button><button id="prop-save-comp" class="btn">Guardar como componente</button></div>`);
    props.innerHTML = html.join('');
    // handlers
    document.getElementById('prop-x').addEventListener('input', (e)=>{ node.x(Number(e.target.value)); layer.draw(); });
    document.getElementById('prop-y').addEventListener('input', (e)=>{ node.y(Number(e.target.value)); layer.draw(); });
    const tinput = document.getElementById('prop-text');
    if(tinput){
      tinput.addEventListener('input', (e)=>{ const text = node.getClassName()==='Text'?node:node.findOne('Text'); if(text) text.text(e.target.value); layer.draw(); });
    }
    const del = document.getElementById('prop-delete');
    del && del.addEventListener('click', ()=>{ const prev = node.toObject(); node.destroy(); layer.draw(); pushUndo({ undo: ()=>{ const n = Konva.Node.create(prev); layer.add(n); layer.draw(); } }); drawProperties(null); });
    const saveCompBtn = document.getElementById('prop-save-comp');
    saveCompBtn && saveCompBtn.addEventListener('click', ()=> {
      const json = node.toObject();
      const comps = loadComponents();
      const name = prompt('Nombre del componente','Componente '+(comps.length+1));
      comps.unshift({ id: UID(), name: name||'Componente', json });
      saveComponents(comps);
      renderSavedComponents();
      showToast('Componente guardado');
    });
  }

  function renderSavedComponents(){
    const wrap = document.getElementById('saved-components');
    const comps = loadComponents();
    wrap.innerHTML = '';
    if(!comps.length) return wrap.innerHTML = '<div class="muted">Sin componentes guardados.</div>';
    comps.forEach(c=>{
      const el = document.createElement('div'); el.className='saved-item'; el.style.padding='6px'; el.style.border='1px solid #eef6ff'; el.style.marginBottom='6px';
      el.innerHTML = `<strong>${c.name}</strong> <div style="margin-top:6px"><button class="btn btn-add" data-id="${c.id}">Agregar</button> <button class="btn btn-del" data-id="${c.id}">Eliminar</button></div>`;
      wrap.appendChild(el);
    });
    wrap.querySelectorAll('.btn-add').forEach(b=> b.addEventListener('click', ()=> {
      const id = b.dataset.id; const comps = loadComponents(); const comp = comps.find(x=>x.id===id); if(!comp) return;
      const node = Konva.Node.create(comp.json);
      node.id(UID());
      layer.add(node);
      layer.draw();
      pushUndo({ undo: ()=>{ const n = layer.findOne('#'+node.id()); if(n) n.destroy(); layer.draw(); } });
      showToast('Componente instanciado');
    }));
    wrap.querySelectorAll('.btn-del').forEach(b=> b.addEventListener('click', ()=> {
      const id = b.dataset.id; if(!confirm('Eliminar componente?')) return; let comps = loadComponents(); comps = comps.filter(x=>x.id!==id); saveComponents(comps); renderSavedComponents(); showToast('Componente eliminado');
    }));
  }

  // utilities for color conversion
  function componentToHex(c){ const hex = c.toString(16); return hex.length==1 ? '0'+hex : hex; }
  function rgbToHex(rgb){
    if(!rgb) return '#000000';
    if(rgb.startsWith('#')) return rgb;
    const m = rgb.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/);
    if(!m) return '#000000';
    return '#'+componentToHex(Number(m[1]))+componentToHex(Number(m[2]))+componentToHex(Number(m[3]));
  }
  function escapeAttr(s){ return String(s||'').replace(/\"/g,'&quot;'); }

  // export HTML (very basic): serializa el contenido visible de stage into inline HTML + styles
  function exportToHTML(){
    const stageJson = layer.toJSON();
    // We'll render a simple HTML wrapper and include a script that reconstructs Konva from JSON — for a quick export
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Export - DataConecta</title><script src="https://unpkg.com/konva@9.3.13/konva.min.js"></script></head><body><div id="root"></div><script>
      const stageData = ${JSON.stringify({ stage: stage.toJSON(), width: stage.width(), height: stage.height() })};
      const container = document.getElementById('root');
      const s = new Konva.Stage({ container: 'root', width: stageData.width, height: stageData.height });
      const l = new Konva.Layer();
      s.add(l);
      const nodes = stageData.stage.children[0].children || [];
      nodes.forEach(n => { try{ const node = Konva.Node.create(JSON.stringify(n)); l.add(node); }catch(e){} });
      l.draw();
    </script></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dataconecta_export.html'; document.body.appendChild(a); a.click(); a.remove();
    showToast('Exportado HTML');
  }

  // export/import components
  document.getElementById('btn-export-components').addEventListener('click', ()=> {
    const comps = loadComponents(); const blob = new Blob([JSON.stringify(comps,null,2)], { type:'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'components.json'; document.body.appendChild(a); a.click(); a.remove();
    showToast('Componentes exportados');
  });
  document.getElementById('btn-import-components').addEventListener('click', ()=> document.getElementById('components-file').click());
  document.getElementById('components-file').addEventListener('change', (e)=> {
    const f = e.target.files && e.target.files[0]; if(!f) return;
    const reader = new FileReader(); reader.onload = ev => {
      try{ const parsed = JSON.parse(ev.target.result); if(Array.isArray(parsed)){ saveComponents(parsed); renderSavedComponents(); showToast('Componentes importados'); } else showToast('JSON inválido','error'); }catch(er){ showToast('Error parseando JSON','error'); }
    }; reader.readAsText(f); e.target.value='';
  });

  // basic undo/redo buttons
  document.getElementById('btn-undo').addEventListener('click', ()=> {
    const act = undoStack.pop(); if(!act) return showToast('Nada para deshacer'); try{ if(act.undo) act.undo(); redoStack.push(act); layer.draw(); }catch(e){ console.error(e); }
  });
  document.getElementById('btn-redo').addEventListener('click', ()=> {
    const act = redoStack.pop(); if(!act) return showToast('Nada para rehacer'); try{ if(act.redo) act.redo(); undoStack.push(act); layer.draw(); }catch(e){ console.error(e); }
  });

  // Save state indicator (simple)
  function setSaving(flag){
    const el = document.getElementById('editor-save-state');
    el.textContent = flag ? 'Guardando...' : 'Guardado';
    setTimeout(()=> el.textContent = '—', 1500);
  }

  // Save components button (quick)
  document.getElementById('btn-save-components').addEventListener('click', ()=> {
    const comps = loadComponents();
    saveComponents(comps);
    showToast('Componentes guardados a localStorage');
  });

  // export HTML
  document.getElementById('btn-export-html').addEventListener('click', exportToHTML);

  // view select
  document.getElementById('view-select').addEventListener('change', (e)=> {
    currentView = e.target.value;
    const v = views[currentView];
    stage.width(v.width); stage.height(v.height);
    drawGrid();
    layer.draw();
  });

  // initial load
  function init(){
    drawGrid();
    renderSavedComponents();
    // basic click outside to deselect
    stage.container().style.cursor = 'default';
    document.addEventListener('keydown', (e)=> {
      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase() === 's'){ e.preventDefault(); saveComponents(loadComponents()); setSaving(true); setTimeout(()=> setSaving(false), 800); showToast('Guardado manual'); }
      if(e.key === 'Escape') deselect();
    });
    showToast('Editor listo');
  }
  init();

})();
