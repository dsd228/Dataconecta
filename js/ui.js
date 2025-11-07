// ui.js
// UI bindings: modals, CRUD, pipeline, toasts, validations, undo, export/import
(function(){
  // basic helpers
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const toastWrap = $('#toast-wrap');

  function showToast(msg, type='default', ttl=3000){
    const t = document.createElement('div'); t.className='toast'; t.textContent = msg;
    if(type==='error') t.style.background='#b91c1c';
    if(type==='success') t.style.background='#059669';
    if(type==='info') t.style.background='#0ea5e9';
    toastWrap.appendChild(t);
    setTimeout(()=> t.remove(), ttl);
  }

  // validation
  function validEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
  function validPhone(p){ return p.trim()==='' || /^[\d+\s()-]{6,20}$/.test(p); }

  // DOM containers
  const contactsTbody = $('#contacts-tbody');
  const communicationsTbody = $('#communications-tbody');
  const ticketsTbody = $('#tickets-tbody');
  const pipelineEl = $('#pipeline');
  const saveIndicator = $('#save-indicator');

  // modal root
  const modalRoot = $('#modal-root');

  // undo
  let lastAction = null;
  $('#btn-undo').addEventListener('click', ()=> {
    if(!lastAction || typeof lastAction.undo !== 'function') return showToast('Nada para deshacer','info');
    try{ lastAction.undo(); window.DataStore.save(); refreshAll(); lastAction = null; showToast('Deshecho','success'); } catch(e){ showToast('Error deshaciendo','error'); }
  });

  // autosave indicator show/hide via DataStore.save debounced
  const originalSave = window.DataStore.save;
  window.DataStore.save = function(opts){
    saveIndicator.textContent = 'Guardando...';
    originalSave.call(window.DataStore, opts);
    setTimeout(()=> saveIndicator.textContent = 'Guardado', 600);
    setTimeout(()=> saveIndicator.textContent = '—', 2200);
  };

  // render functions
  function renderContacts(list){
    const data = list || window.DataStore.contacts;
    contactsTbody.innerHTML = '';
    if(!data.length) return contactsTbody.innerHTML = `<tr><td colspan="7" class="muted">No hay contactos.</td></tr>`;
    data.forEach(c=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><a href="#" class="link-contact" data-id="${c.id}">${escapeHtml(c.name)}</a></td>
        <td>${escapeHtml(c.email||'')}</td><td>${escapeHtml(c.phone||'')}</td><td>${escapeHtml(c.company||'')}</td>
        <td><span class="status ${escapeHtml(c.stage||'')}">${escapeHtml(c.stage||'-')}</span></td>
        <td>${c.lastInteraction?new Date(c.lastInteraction).toLocaleString():'-'}</td>
        <td>
          <button data-action="edit" data-id="${c.id}" class="btn">Editar</button>
          <button data-action="delete" data-id="${c.id}" class="btn">Eliminar</button>
        </td>`;
      contactsTbody.appendChild(tr);
    });
    // bind
    $$('.link-contact').forEach(a=> a.addEventListener('click', e=>{
      e.preventDefault(); openContactDetail(a.dataset.id);
    }));
    $$('button[data-action]').forEach(b=> b.addEventListener('click', e=>{
      const id = b.dataset.id; const act = b.dataset.action;
      if(act==='edit') openContactForm(id);
      if(act==='delete') confirm(() => { deleteContact(id); });
    }));
  }

  function renderComms(){ const c = window.DataStore.comms; communicationsTbody.innerHTML = ''; if(!c.length) return communicationsTbody.innerHTML = `<tr><td colspan="4" class="muted">Sin registros.</td></tr>`; c.slice(0,50).forEach(m=>{ const contact = window.DataStore.contacts.find(x=>x.id===m.contactId) || {name:'-'}; const tr = document.createElement('tr'); tr.innerHTML = `<td>${escapeHtml(contact.name)}</td><td>${escapeHtml(m.type)}</td><td>${escapeHtml(m.summary)}</td><td>${new Date(m.date).toLocaleString()}</td>`; communicationsTbody.appendChild(tr); }); }

  function renderTickets(){ const t = window.DataStore.tickets; ticketsTbody.innerHTML=''; if(!t.length) return ticketsTbody.innerHTML = `<tr><td colspan="4" class="muted">No hay tickets.</td></tr>`; t.forEach(ti=>{ const c = window.DataStore.contacts.find(x=>x.id===ti.contactId) || {name:'-'}; const tr = document.createElement('tr'); tr.innerHTML = `<td>${escapeHtml(ti.id)}</td><td>${escapeHtml(ti.title)}</td><td>${escapeHtml(c.name)}</td><td>${escapeHtml(ti.state||'')}</td>`; ticketsTbody.appendChild(tr); }); }

  function renderPipeline(){
    const stages = ['Lead','Contacto','Prospecto','Cliente'];
    pipelineEl.innerHTML = '';
    stages.forEach(stage=>{
      const col = document.createElement('div'); col.className = 'stage'; col.dataset.stage = stage;
      col.innerHTML = `<h4>${escapeHtml(stage)} <span class="muted">(${window.DataStore.deals.filter(d=>d.stage===stage).length})</span></h4>`;
      const stageDeals = window.DataStore.deals.filter(d=>d.stage===stage);
      stageDeals.forEach(d=>{
        const el = document.createElement('div'); el.className='deal'; el.draggable=true; el.dataset.id = d.id;
        const c = window.DataStore.contacts.find(x=>x.id===d.contactId) || {};
        el.innerHTML = `<div><strong>${escapeHtml(d.title)}</strong></div><div class="small muted">${d.value?('$'+d.value):''} ${c.name? ' • '+escapeHtml(c.name):''}</div>`;
        el.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', d.id); });
        el.addEventListener('dblclick', ()=> openDealForm(d.id));
        col.appendChild(el);
      });
      col.addEventListener('dragover', e => { e.preventDefault(); col.style.background='#f0fbff'; });
      col.addEventListener('dragleave', ()=> col.style.background='');
      col.addEventListener('drop', e => { e.preventDefault(); col.style.background=''; const id = e.dataTransfer.getData('text/plain'); const idx = window.DataStore.deals.findIndex(x=>x.id===id); if(idx>-1){ const prev = Object.assign({}, window.DataStore.deals[idx]); window.DataStore.deals[idx].stage = col.getAttribute('data-stage') || col.dataset.stage; window.DataStore.save(); lastAction = { undo: ()=>{ const i = window.DataStore.deals.findIndex(x=>x.id===prev.id); if(i>-1){ window.DataStore.deals[i] = prev; window.DataStore.save(); refreshAll(); } } }; showToast('Deal movido','success'); refreshAll(); }});
      pipelineEl.appendChild(col);
    });
  }

  // utilities
  function escapeHtml(t){ if(t==null) return ''; return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // modals: simple reusable
  function createModal(title, bodyHtml, onClose){
    const m = document.createElement('div'); m.className='modal';
    m.innerHTML = `<div class="modal-card"><h3>${escapeHtml(title)}</h3><div class="modal-body">${bodyHtml}</div></div>`;
    m.addEventListener('click', e=>{ if(e.target===m){ m.remove(); onClose && onClose(); } });
    modalRoot.appendChild(m);
    return m;
  }

  function confirm(fn, text='¿Estás seguro?'){
    const m = createModal('Confirmar', `<p>${escapeHtml(text)}</p><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px"><button id="no" class="btn">Cancelar</button><button id="yes" class="btn primary">Sí</button></div>`);
    m.querySelector('#no').addEventListener('click', ()=> m.remove());
    m.querySelector('#yes').addEventListener('click', ()=> { fn && fn(); m.remove(); });
  }

  // Contact form (modal)
  function openContactForm(id){
    const c = id ? window.DataStore.contacts.find(x=>x.id===id) : null;
    const html = `
      <div style="display:flex;flex-direction:column;gap:8px">
        <input id="f-name" placeholder="Nombre*" value="${c?escapeHtml(c.name):''}" />
        <input id="f-email" placeholder="Email" value="${c?escapeHtml(c.email):''}" />
        <div style="display:flex;gap:8px"><input id="f-phone" placeholder="Teléfono" value="${c?escapeHtml(c.phone):''}" /><input id="f-company" placeholder="Empresa" value="${c?escapeHtml(c.company):''}" /></div>
        <div style="display:flex;gap:8px"><select id="f-stage"><option>Lead</option><option>Contacto</option><option>Prospecto</option><option>Cliente</option></select><input id="f-location" placeholder="Ubicación" value="${c?escapeHtml(c.location):''}" /></div>
        <div style="display:flex;justify-content:flex-end;gap:8px"><button id="f-cancel" class="btn">Cancelar</button><button id="f-save" class="btn primary">Guardar</button></div>
      </div>`;
    const m = createModal(id ? 'Editar contacto' : 'Agregar contacto', html);
    if(c) m.querySelector('#f-stage').value = c.stage || 'Lead';
    m.querySelector('#f-cancel').addEventListener('click', ()=> m.remove());
    m.querySelector('#f-save').addEventListener('click', ()=> {
      const name = m.querySelector('#f-name').value.trim();
      const email = m.querySelector('#f-email').value.trim();
      const phone = m.querySelector('#f-phone').value.trim();
      if(!name) return showToast('Nombre obligatorio','error');
      if(email && !validEmail(email)) return showToast('Email inválido','error');
      if(phone && !validPhone(phone)) return showToast('Teléfono inválido','error');
      const obj = { name, email, phone, company: m.querySelector('#f-company').value.trim(), stage: m.querySelector('#f-stage').value, location: m.querySelector('#f-location').value.trim(), lastInteraction: new Date().toISOString() };
      if(c){
        const prev = Object.assign({}, c);
        const idx = window.DataStore.contacts.findIndex(x=>x.id===c.id);
        window.DataStore.contacts[idx] = Object.assign({ id: c.id }, window.DataStore.contacts[idx], obj);
        window.DataStore.save();
        lastAction = { undo: ()=>{ const i = window.DataStore.contacts.findIndex(x=>x.id===c.id); if(i>-1){ window.DataStore.contacts[i] = prev; window.DataStore.save(); refreshAll(); } } };
        showToast('Contacto actualizado','success');
      } else {
        const newC = Object.assign({ id: window.DataStore.uid() }, obj);
        window.DataStore.contacts.unshift(newC);
        window.DataStore.save();
        lastAction = { undo: ()=>{ window.DataStore.contacts = window.DataStore.contacts.filter(x=>x.id!==newC.id); window.DataStore.save(); refreshAll(); } };
        showToast('Contacto agregado','success');
      }
      m.remove(); refreshAll();
    });
  }

  function openContactDetail(id){
    const c = window.DataStore.contacts.find(x=>x.id===id);
    if(!c) return showToast('Contacto no encontrado','error');
    // build interactions + add form
    const items = window.DataStore.comms.filter(m=>m.contactId===c.id).sort((a,b)=>new Date(b.date)-new Date(a.date)).map(it=>`<div class="small">${escapeHtml(it.type)} — ${escapeHtml(it.summary)} <span class="muted">(${new Date(it.date).toLocaleString()})</span></div>`).join('') || '<div class="muted">Sin interacciones</div>';
    const html = `<div><strong>${escapeHtml(c.name)}</strong><div class="muted">Email: ${escapeHtml(c.email||'-')} • Tel: ${escapeHtml(c.phone||'-')}</div><hr/></div>
      <h4>Interacciones</h4>${items}
      <hr/>
      <div style="display:flex;gap:8px"><select id="new-comm-type"><option>Email</option><option>Call</option><option>Meeting</option><option>Form</option></select><input id="new-comm-summary" placeholder="Resumen" /></div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px"><button id="add-comm-cancel" class="btn">Cancelar</button><button id="add-comm-save" class="btn btn-primary">Guardar</button></div>`;
    const m = createModal('Ficha de contacto', html);
    document.getElementById('add-comm-cancel').addEventListener('click', ()=> m.remove());
    document.getElementById('add-comm-save').addEventListener('click', ()=>{
      const type = document.getElementById('new-comm-type').value;
      const summary = document.getElementById('new-comm-summary').value.trim();
      if(!summary) return showToast('Agregá un resumen','error');
      const newC = { id: window.DataStore.uid(), contactId: c.id, type, summary, date: new Date().toISOString() };
      window.DataStore.comms.unshift(newC);
      const idx = window.DataStore.contacts.findIndex(x=>x.id===c.id);
      if(idx>-1) { window.DataStore.contacts[idx].lastInteraction = new Date().toISOString(); }
      window.DataStore.save();
      lastAction = { undo: ()=>{ window.DataStore.comms = window.DataStore.comms.filter(x=>x.id!==newC.id); window.DataStore.save(); refreshAll(); } };
      showToast('Interacción guardada','success');
      m.remove(); refreshAll();
    });
  }

  // deals (opportunities)
  function openDealForm(id){
    const d = id ? window.DataStore.deals.find(x=>x.id===id) : null;
    const contactOptions = '<option value="">(sin asignar)</option>' + window.DataStore.contacts.map(c=>`<option value="${c.id}" ${d && d.contactId===c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
    const html = `<div style="display:flex;flex-direction:column;gap:8px">
      <input id="f-title" placeholder="Título*" value="${d?escapeHtml(d.title):''}" />
      <div style="display:flex;gap:8px"><input id="f-value" type="number" placeholder="Valor" value="${d?escapeHtml(d.value||''):''}" /><select id="f-stage"><option>Lead</option><option>Contacto</option><option>Prospecto</option><option>Cliente</option></select></div>
      <select id="f-contact">${contactOptions}</select>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px"><button id="f-cancel" class="btn">Cancelar</button><button id="f-save" class="btn primary">Guardar</button></div>
    </div>`;
    const m = createModal(d ? 'Editar oportunidad' : 'Nueva oportunidad', html);
    if(d) m.querySelector('#f-stage').value = d.stage || 'Lead';
    m.querySelector('#f-cancel').addEventListener('click', ()=> m.remove());
    m.querySelector('#f-save').addEventListener('click', ()=>{
      const title = m.querySelector('#f-title').value.trim();
      if(!title) return showToast('Título requerido','error');
      const value = Number(m.querySelector('#f-value').value) || 0;
      const stage = m.querySelector('#f-stage').value;
      const contactId = m.querySelector('#f-contact').value || null;
      if(d){
        const prev = Object.assign({}, d);
        const idx = window.DataStore.deals.findIndex(x=>x.id===d.id);
        // keep createdAt if present
        const createdAt = window.DataStore.deals[idx] && window.DataStore.deals[idx].createdAt ? window.DataStore.deals[idx].createdAt : new Date().toISOString();
        window.DataStore.deals[idx] = Object.assign({id:d.id}, window.DataStore.deals[idx], { title, value, stage, contactId, createdAt });
        window.DataStore.save();
        lastAction = { undo: ()=>{ const i = window.DataStore.deals.findIndex(x=>x.id===prev.id); if(i>-1){ window.DataStore.deals[i]=prev; window.DataStore.save(); refreshAll(); } } };
        showToast('Oportunidad actualizada','success');
      } else {
        const newD = { id: window.DataStore.uid(), title, value, stage, contactId, createdAt: new Date().toISOString() };
        window.DataStore.deals.unshift(newD);
        window.DataStore.save();
        lastAction = { undo: ()=>{ window.DataStore.deals = window.DataStore.deals.filter(x=>x.id!==newD.id); window.DataStore.save(); refreshAll(); } };
        showToast('Oportunidad creada','success');
      }
      m.remove(); refreshAll();
    });
  }

  // Tickets
  function openTicketForm(){
    const contactOptions = '<option value="">(sin asignar)</option>' + window.DataStore.contacts.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    const html = `<div style="display:flex;flex-direction:column;gap:8px">
      <input id="t-title" placeholder="Título*" />
      <select id="t-contact">${contactOptions}</select>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px"><button id="t-cancel" class="btn">Cancelar</button><button id="t-save" class="btn primary">Guardar</button></div>
    </div>`;
    const m = createModal('Nuevo ticket', html);
    m.querySelector('#t-cancel').addEventListener('click', ()=> m.remove());
    m.querySelector('#t-save').addEventListener('click', ()=> {
      const title = m.querySelector('#t-title').value.trim();
      const contactId = m.querySelector('#t-contact').value || null;
      if(!title) return showToast('Título requerido','error');
      const newT = { id: window.DataStore.uid(), title, contactId, state:'open' };
      window.DataStore.tickets.unshift(newT);
      window.DataStore.save();
      lastAction = { undo: ()=>{ window.DataStore.tickets = window.DataStore.tickets.filter(x=>x.id!==newT.id); window.DataStore.save(); refreshAll(); } };
      showToast('Ticket creado','success');
      m.remove(); refreshAll();
    });
  }

  function deleteContact(id){ confirm(()=> { const prev = window.DataStore.contacts.find(x=>x.id===id); window.DataStore.contacts = window.DataStore.contacts.filter(x=>x.id!==id); const removedDeals = window.DataStore.deals.filter(d=>d.contactId===id); window.DataStore.deals = window.DataStore.deals.filter(d=>d.contactId!==id); window.DataStore.comms = window.DataStore.comms.filter(m=>m.contactId!==id); window.DataStore.tickets = window.DataStore.tickets.filter(t=>t.contactId!==id); window.DataStore.save(); lastAction = { undo: ()=>{ window.DataStore.contacts.unshift(prev); window.DataStore.deals = removedDeals.concat(window.DataStore.deals); window.DataStore.save(); refreshAll(); } }; showToast('Contacto eliminado','info'); } ); }

  // delete, import, export handlers
  $('#btn-export').addEventListener('click', ()=> {
    const payload = window.DataStore.exportAll();
    const blob = new Blob([payload], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `dataconecta_export_${(new Date()).toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
    showToast('Exportado JSON','success');
  });
  $('#btn-export-csv-contacts').addEventListener('click', ()=> {
    const csv = window.DataStore.toCSV(window.DataStore.contacts, ['id','name','email','phone','company','stage','location','lastInteraction']);
    const blob = new Blob([csv], { type: 'text/csv' }); const a=document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='contacts.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
    showToast('CSV contactos descargado','success');
  });
  $('#btn-export-csv-deals').addEventListener('click', ()=> {
    const csv = window.DataStore.toCSV(window.DataStore.deals, ['id','title','value','stage','contactId','createdAt']);
    const blob = new Blob([csv], { type: 'text/csv' }); const a=document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='deals.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
    showToast('CSV deals descargado','success');
  });

  $('#btn-import').addEventListener('click', ()=> $('#import-file').click());
  $('#import-file').addEventListener('change', e=> {
    const file = e.target.files && e.target.files[0]; if(!file) return;
    const reader = new FileReader(); reader.onload = ev => {
      try{
        const parsed = JSON.parse(ev.target.result);
        confirm(()=> { window.DataStore.importAll(parsed); refreshAll(); showToast('Importación realizada','success'); }, 'Importar reemplazará los datos locales. Continuar?');
      }catch(err){ showToast('JSON inválido','error'); }
    }; reader.readAsText(file); e.target.value='';
  });

  $('#btn-clear').addEventListener('click', ()=> confirm(()=>{ window.DataStore.reset(); refreshAll(); showToast('Datos limpiados','info'); }, 'Eliminar todos los datos locales?'));

  // add/create handlers
  $('#btn-add-contact').addEventListener('click', ()=> openContactForm(null));
  $('#btn-add-deal').addEventListener('click', ()=> openDealForm(null));
  $('#btn-add-ticket').addEventListener('click', ()=> openTicketForm());

  // search/filter/segment
  $('#btn-filter').addEventListener('click', ()=> {
    const q = $('#q').value.trim().toLowerCase(); const st = $('#filter-stage').value;
    let res = window.DataStore.contacts.filter(c => !q || (c.name&&c.name.toLowerCase().includes(q)) || (c.email&&c.email.toLowerCase().includes(q)) || (c.company&&c.company.toLowerCase().includes(q)));
    if(st) res = res.filter(c => c.stage === st);
    renderContacts(res);
  });
  $('#btn-reset').addEventListener('click', ()=> { $('#q').value=''; $('#filter-stage').value=''; renderContacts(); });

  $('#apply-segment').addEventListener('click', ()=> {
    const crit = $('#segment-criteria').value; const v = $('#segment-value').value.trim().toLowerCase();
    let res = [];
    if(crit==='location') res = window.DataStore.contacts.filter(c => c.location && c.location.toLowerCase().includes(v));
    else if(crit==='funnel-stage') res = window.DataStore.contacts.filter(c => c.stage && c.stage.toLowerCase().includes(v));
    else if(crit==='email-opened') res = window.DataStore.contacts.filter(c => c.emailOpened === true && !c.purchased);
    else if(crit==='email-not-opened') res = window.DataStore.contacts.filter(c => !c.emailOpened);
    else if(crit==='purchased') res = window.DataStore.contacts.filter(c => c.purchased === true);
    else if(crit==='not-purchased') res = window.DataStore.contacts.filter(c => !c.purchased);
    else res = window.DataStore.contacts.filter(c => (c.name && c.name.toLowerCase().includes(v)) || (c.company && c.company.toLowerCase().includes(v)));
    renderContacts(res);
    showToast(`Segmentación aplicada (${res.length})`,'info');
  });
  $('#reset-segment').addEventListener('click', ()=> renderContacts());

  // refresh UI
  function refreshAll(){
    renderContacts();
    renderComms();
    renderTickets();
    renderPipeline();
    if(window.Analytics && typeof window.Analytics.renderAll === 'function') window.Analytics.renderAll();
  }

  // load + seed + sync
  function seedIfEmpty(){
    const c = window.DataStore.contacts;
    if(!c || !c.length){
      window.DataStore.contacts = [
        { id: window.DataStore.uid(), name:'María González', email:'maria@example.com', phone:'+34 600111222', company:'ACME S.A.', stage:'Lead', location:'Madrid', lastInteraction: new Date().toISOString(), emailOpened:true, purchased:false },
        { id: window.DataStore.uid(), name:'Juan Pérez', email:'juan@example.com', phone:'+34 655222333', company:'Beta SRL', stage:'Prospecto', location:'Barcelona', lastInteraction: new Date().toISOString(), emailOpened:false, purchased:false }
      ];
      window.DataStore.deals = [
        { id: window.DataStore.uid(), title:'Oferta ACME', value:1200, stage:'Lead', contactId: window.DataStore.contacts[0].id, createdAt: new Date().toISOString() },
        { id: window.DataStore.uid(), title:'Demo Beta', value:4500, stage:'Prospecto', contactId: window.DataStore.contacts[1].id, createdAt: new Date().toISOString() }
      ];
      window.DataStore.comms = [
        { id: window.DataStore.uid(), contactId: window.DataStore.contacts[0].id, type:'Email', summary:'Email de bienvenida', date:new Date().toISOString(), opened:true }
      ];
      window.DataStore.tickets = [
        { id: window.DataStore.uid(), title:'Error facturación', contactId: window.DataStore.contacts[1].id, state:'open' }
      ];
      window.DataStore.save();
    }
  }

  // sync listener
  window.DataStore.onSync(() => { window.DataStore.load(); refreshAll(); showToast('Sincronizado desde otra pestaña','info'); });

  // initialize
  window.addEventListener('DOMContentLoaded', ()=> {
    window.DataStore.load();
    seedIfEmpty();
    refreshAll();
    if(window.Analytics && typeof window.Analytics.renderAll === 'function') window.Analytics.renderAll();
  });

  // basic keyboard shortcuts
  document.addEventListener('keydown', e => {
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){ e.preventDefault(); window.DataStore.save(); showToast('Guardado manual','success'); }
    if(e.key === 'Escape') { $$('.modal') .forEach(m=> m.remove()); }
  });

})();
