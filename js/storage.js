// storage.js — wrapper robusto para localStorage con versionado y undo stack
(function (global) {
  const PREFIX = 'dataconecta:v1:'; // incrementar versión cuando cambie esquema
  const UNDO_KEY = PREFIX + '__undo';
  function key(k){ return PREFIX + k; }

  function safeParse(raw){
    try { return JSON.parse(raw); } catch(e){ return null; }
  }

  function get(k, fallback){
    const raw = localStorage.getItem(key(k));
    if (!raw) return fallback === undefined ? null : fallback;
    const parsed = safeParse(raw);
    return parsed === null ? raw : parsed;
  }

  function set(k, v){
    // push undo
    pushUndo(k, get(k));
    localStorage.setItem(key(k), JSON.stringify(v));
    dispatchChange(k);
    return true;
  }

  function remove(k){
    pushUndo(k, get(k));
    localStorage.removeItem(key(k));
    dispatchChange(k);
  }

  function listKeys(){
    const out = [];
    for (let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
    }
    return out;
  }

  // Undo stack (simple LIFO, mantiene últimos 50)
  function pushUndo(k, prev){
    const stack = safeParse(localStorage.getItem(UNDO_KEY)) || [];
    stack.push({k, prev, time: Date.now()});
    while (stack.length > 50) stack.shift();
    localStorage.setItem(UNDO_KEY, JSON.stringify(stack));
  }
  function undoLast(){
    const stack = safeParse(localStorage.getItem(UNDO_KEY)) || [];
    if (!stack.length) return null;
    const last = stack.pop();
    if (last.prev === null) localStorage.removeItem(key(last.k));
    else localStorage.setItem(key(last.k), JSON.stringify(last.prev));
    localStorage.setItem(UNDO_KEY, JSON.stringify(stack));
    dispatchChange(last.k);
    return last;
  }

  // Export / Import
  function exportAll(){
    const data = {};
    listKeys().forEach(k => data[k] = get(k));
    return JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2);
  }

  function importAll(raw){
    const parsed = safeParse(raw);
    if (!parsed || !parsed.data) throw new Error('Formato inválido');
    Object.entries(parsed.data).forEach(([k,v]) => localStorage.setItem(key(k), JSON.stringify(v)));
    dispatchChange();
  }

  // Seeder demo
  function seedDemo(){
    const contacts = [
      { id:'c_1', name:'María López', email:'maria@empresa.com', tel:'600111222', company:'ACME', stage:'Lead', createdAt: new Date(Date.now()-10*86400000).toISOString() },
      { id:'c_2', name:'Javier Ruiz', email:'jruiz@example.com', tel:'600222333', company:'Beta SL', stage:'Contacto', createdAt: new Date(Date.now()-5*86400000).toISOString() },
      { id:'c_3', name:'Lucía Pérez', email:'lucia@perez.es', tel:'600333444', company:'Gamma', stage:'Prospecto', createdAt: new Date().toISOString() }
    ];
    const deals = [
      { id:'d_1', title:'Deal ACME', contactId:'c_1', amount:1200, stage:'proposal', createdAt:new Date(Date.now()-9*86400000).toISOString(), closedAt:null, won:false },
      { id:'d_2', title:'Deal Beta', contactId:'c_2', amount:3200, stage:'won', createdAt:new Date(Date.now()-4*86400000).toISOString(), closedAt:new Date(Date.now()-1*86400000).toISOString(), won:true }
    ];
    set('contacts', contacts);
    set('deals', deals);
    return { contacts, deals };
  }

  // Simple event dispatch to listen changes
  function dispatchChange(k){
    const ev = new CustomEvent('dataconecta.change', { detail: { key:k }});
    window.dispatchEvent(ev);
  }

  // Public API
  global.DC_Storage = {
    get, set, remove, listKeys, exportAll, importAll, undoLast, seedDemo, keyPrefix: PREFIX
  };
})(window);
