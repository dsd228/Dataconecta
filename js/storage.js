// storage.js
// Responsible for persisting and syncing data (localStorage + BroadcastChannel)
(function(window){
  const KV = {
    CONTACTS: 'dataconecta_contacts_v3',
    DEALS: 'dataconecta_deals_v3',
    COMMS: 'dataconecta_comms_v3',
    TICKETS: 'dataconecta_tickets_v3'
  };

  function uid(){ return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function safeParse(v){ try{ return JSON.parse(v||'[]') }catch(e){ return [] } }

  // simple in-memory caches
  let contacts = [], deals = [], comms = [], tickets = [];
  let bc = null;
  try { bc = new BroadcastChannel('dataconecta_sync_v3'); } catch(e){ bc = null; }

  // load from localStorage
  function load(){
    contacts = safeParse(localStorage.getItem(KV.CONTACTS));
    deals = safeParse(localStorage.getItem(KV.DEALS));
    comms = safeParse(localStorage.getItem(KV.COMMS));
    tickets = safeParse(localStorage.getItem(KV.TICKETS));
    return { contacts, deals, comms, tickets };
  }

  function save(opts = { broadcast: true }){
    localStorage.setItem(KV.CONTACTS, JSON.stringify(contacts));
    localStorage.setItem(KV.DEALS, JSON.stringify(deals));
    localStorage.setItem(KV.COMMS, JSON.stringify(comms));
    localStorage.setItem(KV.TICKETS, JSON.stringify(tickets));
    if(opts.broadcast && bc) try{ bc.postMessage({ type: 'sync' }); }catch(e){}
  }

  function reset(){
    contacts = []; deals = []; comms = []; tickets = [];
    save();
  }

  function exportAll(){
    return JSON.stringify({ contacts, deals, comms, tickets, exportedAt: new Date().toISOString() }, null, 2);
  }

  function importAll(obj){
    if(!obj) return false;
    contacts = Array.isArray(obj.contacts) ? obj.contacts : contacts;
    deals = Array.isArray(obj.deals) ? obj.deals : deals;
    comms = Array.isArray(obj.comms) ? obj.comms : comms;
    tickets = Array.isArray(obj.tickets) ? obj.tickets : tickets;
    save();
    return true;
  }

  // CSV helper
  function toCSV(arr, fields){
    const esc = v => `"${String(v||'').replace(/"/g,'""')}"`;
    const head = fields.join(',');
    const rows = arr.map(r => fields.map(f=>esc(r[f])).join(',')).join('\n');
    return head + '\n' + rows;
  }

  // API
  window.DataStore = {
    uid,
    load,
    save,
    reset,
    exportAll,
    importAll,
    toCSV,
    get contacts(){ return contacts; },
    set contacts(v){ contacts = v; },
    get deals(){ return deals; },
    set deals(v){ deals = v; },
    get comms(){ return comms; },
    set comms(v){ comms = v; },
    get tickets(){ return tickets; },
    set tickets(v){ tickets = v; },
    onSync(cb){
      if(!bc) return;
      bc.onmessage = (e)=>{ if(e.data && e.data.type === 'sync'){ cb && cb(); } };
    }
  };

  // initialize with current storage
  load();
  // expose storage keys (for debugging)
  window.DataStoreKeys = KV;
})(window);
