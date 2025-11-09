// modules/crm.js — Advanced CRM module (complete front-end logic, simulated backend + analytics wiring)
// Exposes window.crmAPI with init(params) and destroy()
(function () {
  const STORAGE_PREFIX = 'dataconecta:crm:v4:';
  const KEYS = {
    CONTACTS: STORAGE_PREFIX + 'contacts',
    COMPANIES: STORAGE_PREFIX + 'companies',
    DEALS: STORAGE_PREFIX + 'deals',
    INTERACTIONS: STORAGE_PREFIX + 'interactions',
    TEMPLATES: STORAGE_PREFIX + 'templates',
    TASKS: STORAGE_PREFIX + 'tasks',
    CAMPAIGNS: STORAGE_PREFIX + 'campaigns',
    TICKETS: STORAGE_PREFIX + 'tickets',
    KB: STORAGE_PREFIX + 'kb',
    SURVEYS: STORAGE_PREFIX + 'surveys'
  };

  // --- Utilities ---
  function genId(prefix='id') { return prefix + '_' + Math.random().toString(36).slice(2,9); }
  function nowIso() { return new Date().toISOString(); }
  function save(key, obj) { try { localStorage.setItem(key, JSON.stringify(obj)); } catch(e) { console.warn(e); } }
  function load(key, fallback) { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : (fallback || []); } catch(e) { return fallback || []; } }
  function $(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

  // --- Data caches ---
  let contacts = load(KEYS.CONTACTS, []);
  let companies = load(KEYS.COMPANIES, []);
  let deals = load(KEYS.DEALS, []);
  let interactions = load(KEYS.INTERACTIONS, []);
  let templates = load(KEYS.TEMPLATES, []);
  let tasks = load(KEYS.TASKS, []);
  let campaigns = load(KEYS.CAMPAIGNS, []);
  let tickets = load(KEYS.TICKETS, []);
  let kb = load(KEYS.KB, []);
  let surveys = load(KEYS.SURVEYS, []);

  function persistAll() {
    save(KEYS.CONTACTS, contacts);
    save(KEYS.COMPANIES, companies);
    save(KEYS.DEALS, deals);
    save(KEYS.INTERACTIONS, interactions);
    save(KEYS.TEMPLATES, templates);
    save(KEYS.TASKS, tasks);
    save(KEYS.CAMPAIGNS, campaigns);
    save(KEYS.TICKETS, tickets);
    save(KEYS.KB, kb);
    save(KEYS.SURVEYS, surveys);
  }

  // --- Pub/Sub / webhooks simulation ---
  const listeners = {};
  function on(event, cb) { listeners[event]=listeners[event]||[]; listeners[event].push(cb); return () => off(event,cb); }
  function off(event, cb) { if(!listeners[event]) return; listeners[event]=listeners[event].filter(f=>f!==cb); }
  function emit(event, payload) {
    (listeners[event]||[]).forEach(cb => { try{ cb(payload); }catch(e){console.warn(e);} });
    // analytics forwarding (if analyticsAPI exists)
    if (window.analyticsAPI && typeof window.analyticsAPI.trackEvent === 'function') {
      try { window.analyticsAPI.trackEvent(event, payload, payload && payload.userId ? payload.userId : null); } catch(e) { console.warn('analytics forward', e); }
    }
    // webhooks: stored per-module, call registered webhooks
    (webhooks || []).forEach(h => {
      try { fetch(h.url, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ event, payload }) }).catch(()=>{}); } catch(e){}
    });
  }

  let webhooks = [];

  // --- Core Models & functions ---
  function createContact(data) {
    const c = Object.assign({ id: genId('c'), name:'', email:'', phone:'', companyId:null, tags:[], metadata:{}, createdAt: nowIso(), updatedAt: nowIso() }, data);
    contacts.unshift(c);
    persistAll();
    emit('contact.created', c);
    return c;
  }
  function updateContact(id, patch) {
    const idx = contacts.findIndex(x=>x.id===id); if (idx===-1) return null;
    Object.assign(contacts[idx], patch, { updatedAt: nowIso() });
    persistAll();
    emit('contact.updated', contacts[idx]);
    return contacts[idx];
  }
  function deleteContact(id) {
    const idx = contacts.findIndex(x=>x.id===id); if (idx===-1) return false;
    const removed = contacts.splice(idx,1)[0]; persistAll(); emit('contact.deleted', removed); return true;
  }

  function createCompany(data) {
    const c = Object.assign({ id: genId('co'), name:'', domain:'', createdAt: nowIso(), updatedAt: nowIso() }, data);
    companies.unshift(c); persistAll(); emit('company.created', c); return c;
  }

  function createDeal(payload) {
    const d = Object.assign({ id: genId('deal'), title: payload.title || 'Deal', contactId: payload.contactId || null, companyId: payload.companyId || null, amount: payload.amount || 0, currency: payload.currency || 'EUR', stage: payload.stage || 'new', createdAt: nowIso(), updatedAt: nowIso(), closeDate: payload.closeDate || null }, payload);
    deals.unshift(d); persistAll(); emit('deal.created', d); return d;
  }
  function updateDeal(id, patch) {
    const i = deals.findIndex(x=>x.id===id); if (i===-1) return null;
    const prev = Object.assign({}, deals[i]);
    Object.assign(deals[i], patch, { updatedAt: nowIso() });
    persistAll();
    emit('deal.updated', { before: prev, after: deals[i] });
    if (patch.stage) { // auto tasks when moving to negotiation or won
      if (patch.stage === 'negotiation') createTask({ title: 'Follow up negotiation', contactId: deals[i].contactId, dueAt: new Date(Date.now()+3*24*3600*1000).toISOString() });
      if (patch.stage === 'closed_won') createTask({ title: 'Onboard customer', contactId: deals[i].contactId, dueAt: new Date(Date.now()+1*24*3600*1000).toISOString() });
    }
    return deals[i];
  }

  function createTask(data) {
    const t = Object.assign({ id: genId('task'), title: data.title || 'Tarea', dueAt: data.dueAt || null, assignedTo: data.assignedTo || null, contactId: data.contactId || null, dealId: data.dealId || null, completed: false, createdAt: nowIso() }, data);
    tasks.unshift(t); persistAll(); emit('task.created', t); return t;
  }

  function logInteraction(data) {
    const i = Object.assign({ id: genId('int'), contactId: null, type: 'note', note: '', timestamp: nowIso(), meta:{} }, data);
    interactions.unshift(i); persistAll(); emit('interaction.logged', i);
    return i;
  }

  // --- Email templates & simulated send/tracking ---
  function createTemplate({ name='Plantilla', subject='', body='' } = {}) {
    const tpl = { id: genId('tpl'), name, subject, body, createdAt: nowIso(), updatedAt: nowIso() };
    templates.unshift(tpl); persistAll(); return tpl;
  }
  function sendEmailSimulated({ toContactId, templateId, override = {}, track = true }) {
    const contact = contacts.find(c=>c.id===toContactId);
    const tpl = templates.find(t=>t.id===templateId);
    if (!contact || !tpl) throw new Error('contact or template not found');
    const subject = override.subject || tpl.subject;
    const body = (override.body || tpl.body).replace(/\{\{name\}\}/g, contact.name || '');
    // log email.sent
    const sent = logInteraction({ contactId: contact.id, type: 'email.sent', note: subject, meta:{ templateId } });
    // simulate open/click events
    if (track) {
      setTimeout(()=> {
        logInteraction({ contactId: contact.id, type: 'email.open', note: 'opened', meta:{ templateId } });
        emit('email.open', { contactId: contact.id, templateId });
      }, 2000 + Math.random()*6000);
      if (Math.random() > 0.6) {
        setTimeout(()=> {
          logInteraction({ contactId: contact.id, type: 'email.click', note: 'clicked link', meta:{ templateId, url:'https://example.com' } });
          emit('email.click', { contactId: contact.id, templateId });
        }, 3000 + Math.random()*9000);
      }
    }
    emit('email.sent', { contactId: contact.id, templateId });
    return sent;
  }

  // --- Campaigns / Automations (simple engine) ---
  function createCampaign(data) {
    const c = Object.assign({ id: genId('camp'), name: data.name || 'Campaña', triggers: data.triggers || [], actions: data.actions || [], createdAt: nowIso() }, data);
    campaigns.unshift(c); persistAll(); return c;
  }
  function runCampaign(campaignId) {
    const c = campaigns.find(x=>x.id===campaignId); if(!c) return { sent:0 };
    // naive: apply to first 20 contacts
    const targets = contacts.slice(0, Math.min(50, contacts.length));
    let sent = 0;
    targets.forEach(ct => {
      if (templates[0]) { sendEmailSimulated({ toContactId: ct.id, templateId: templates[0].id, track:true }); sent++; }
    });
    emit('campaign.run', { campaignId, sent });
    return { sent };
  }

  // --- Forms / Landing pages (simple capture) ---
  function captureFormSubmission(formData) {
    // create contact or update if email exists
    let c = contacts.find(x => x.email && x.email.toLowerCase() === (formData.email||'').toLowerCase());
    if (c) {
      updateContact(c.id, { ...formData });
    } else {
      c = createContact(formData);
    }
    logInteraction({ contactId: c.id, type: 'form', note: 'form submission', meta: { formName: formData.formName || 'form' } });
    emit('form.submitted', { contactId: c.id, formData });
    return c;
  }

  // --- Tickets & KB ---
  function createTicket(data) {
    const t = Object.assign({ id: genId('ticket'), title: data.title || 'Ticket', contactId: data.contactId || null, status: data.status || 'open', messages: data.messages || [], createdAt: nowIso() }, data);
    tickets.unshift(t); persistAll(); emit('ticket.created', t); return t;
  }
  function createKbArticle(data) {
    const a = Object.assign({ id: genId('kb'), title: data.title||'Artículo', body: data.body||'', tags: data.tags||[], createdAt: nowIso() }, data);
    kb.unshift(a); persistAll(); return a;
  }

  // --- Surveys (NPS/CSAT) ---
  function createSurvey(data) { const s = Object.assign({ id: genId('survey'), name: data.name||'Survey', type: data.type||'NPS', questions: data.questions||[], responses: [], createdAt: nowIso() }, data); surveys.unshift(s); persistAll(); return s; }
  function recordSurveyResponse(surveyId, response) { const s = surveys.find(x=>x.id===surveyId); if(!s) return null; s.responses.push(Object.assign({id:genId('resp'), ts:nowIso()}, response)); persistAll(); emit('survey.response', { surveyId, response }); return true; }

  // --- Integrations stubs & webhooks ---
  function registerWebhook(url) { webhooks.push({ id: genId('wh'), url }); return webhooks[webhooks.length-1]; }
  function listWebhooks() { return webhooks.slice(); }
  function clearWebhooks() { webhooks = []; }

  // --- Segmentation helpers (example from the requirement) ---
  function segmentOpenedButNotBought() {
    // contacts with at least one email.open but no closed_won deals
    return contacts.filter(c => {
      const opened = interactions.some(i => i.contactId === c.id && i.type === 'email.open');
      const bought = deals.some(d => d.contactId === c.id && d.stage === 'closed_won');
      return opened && !bought;
    });
  }

  // --- Pipeline forecast ---
  function forecastNextWeek() {
    // simplistic: sum of deals in negotiation + contacted that have closeDate within next 7 days
    const now = Date.now();
    const weekMs = 7*24*3600*1000;
    const relevant = deals.filter(d => ['negotiation','contacted','new'].includes(d.stage));
    const expected = relevant.reduce((s,d)=> s + (d.amount || 0), 0);
    return { expected, count: relevant.length };
  }

  // --- UI Rendering & bindings (mount/unmount) ---
  let mounted = false;
  let boundHandlers = [];

  function renderContacts(filterText='') {
    const listEl = document.getElementById('crm-contacts-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    const items = contacts.filter(c => {
      if (!filterText) return true;
      const q = filterText.toLowerCase();
      return (c.name||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q) || (c.phone||'').toLowerCase().includes(q);
    });
    items.forEach(c => {
      const div = document.createElement('div');
      div.className = 'contact-item';
      div.innerHTML = `<div><strong>${c.name}</strong><div class="muted">${c.email || ''}${c.phone ? ' • ' + c.phone : ''}</div></div><div><small>${c.tags?.join(',')||''}</small></div>`;
      div.dataset.id = c.id;
      div.addEventListener('click', () => selectContact(c.id));
      listEl.appendChild(div);
    });
  }

  function selectContact(id) {
    const contact = contacts.find(x=>x.id===id);
    if (!contact) return;
    $('#detail-name').textContent = contact.name;
    $('#detail-meta').innerHTML = `<div><strong>Email:</strong> ${contact.email||'-'}</div><div><strong>Tel:</strong> ${contact.phone||'-'}</div><div><strong>Tags:</strong> ${(contact.tags||[]).join(', ')}</div>`;
    // interactions
    const inter = interactions.filter(i => i.contactId === id).slice().reverse();
    const interList = inter.map(i => `<div><small>${new Date(i.timestamp||i.ts).toLocaleString()}</small><div>${i.type} ${i.note? ' • ' + i.note : ''}</div></div>`).join('');
    $('#interactions-list').innerHTML = interList || '<div class="muted">Sin interacciones</div>';
    // deals for contact
    renderPipeline();
    // tasks
    renderTasks();
    // timeline (combined)
    renderTimeline(id);
    // store selected contact id on detail actions
    $('#detail-edit').dataset.contactId = id;
    $('#detail-email').dataset.contactId = id;
    $('#detail-log-call').dataset.contactId = id;
  }

  function renderPipeline() {
    // clear columns
    ['new','contacted','negotiation','closed_won','closed_lost'].forEach(stage => {
      const col = document.getElementById('col-' + stage);
      if (col) col.innerHTML = '';
    });
    deals.forEach(d => {
      const el = document.createElement('div');
      el.className = 'deal-card';
      el.draggable = true;
      el.dataset.id = d.id;
      el.innerHTML = `<strong>${d.title}</strong><div class="muted">€${d.amount} • ${d.companyId ? (companies.find(c=>c.id===d.companyId)?.name||'') : ''}</div>`;
      // drag handlers
      el.addEventListener('dragstart', (ev) => { ev.dataTransfer.setData('text/deal', d.id); });
      const col = document.getElementById('col-' + d.stage);
      if (col) col.appendChild(el);
    });

    // make columns droppable
    qsa('.column-body').forEach(col => {
      const onDragOver = (e) => { e.preventDefault(); col.classList.add('dragover'); };
      const onDragLeave = () => col.classList.remove('dragover');
      const onDrop = (e) => {
        e.preventDefault();
        col.classList.remove('dragover');
        const id = e.dataTransfer.getData('text/deal');
        const stage = col.parentElement.dataset.stage;
        if (id && stage) updateDeal(id, { stage });
        renderPipeline();
      };
      col.addEventListener('dragover', onDragOver);
      col.addEventListener('dragleave', onDragLeave);
      col.addEventListener('drop', onDrop);
      boundHandlers.push(() => { col.removeEventListener('dragover', onDragOver); col.removeEventListener('dragleave', onDragLeave); col.removeEventListener('drop', onDrop); });
    });

    // update forecast display
    const fc = forecastNextWeek();
    $('#forecast').textContent = `Forecast (estimado): €${Math.round(fc.expected)} — ${fc.count} deals`;
  }

  function renderTasks() {
    const el = document.getElementById('tasks-list');
    if (!el) return;
    el.innerHTML = tasks.map(t => `<div style="padding:6px;border-bottom:1px solid #eee;"><strong>${t.title}</strong><div class="muted">${t.contactId ? (contacts.find(c=>c.id===t.contactId)?.name||'') : ''} • Due: ${t.dueAt ? new Date(t.dueAt).toLocaleDateString() : '—'}</div></div>`).join('') || '<div class="muted">No hay tareas</div>';
  }

  function renderTimeline(contactId) {
    const events = interactions.filter(i => !contactId || i.contactId === contactId).slice().reverse();
    $('#crm-timeline').innerHTML = events.map(e => `<div style="padding:6px;border-bottom:1px solid #eee;"><small>${new Date(e.timestamp).toLocaleString()}</small><div><strong>${e.type}</strong> ${e.note||''}</div></div>`).join('');
  }

  // --- Template manager UI ---
  function loadTemplatesUI() {
    const sel = $('#template-select');
    if (!sel) return;
    sel.innerHTML = templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('') || '<option value="">(sin plantillas)</option>';
  }

  // --- Chat widget (simple simulated) ---
  function initChatWidget() {
    const win = $('#chat-window');
    const input = $('#chat-input');
    const send = $('#chat-send');
    if (!win || !input || !send) return;
    send.addEventListener('click', () => {
      const text = input.value.trim(); if (!text) return;
      const msg = { id: genId('chat'), text, ts: nowIso() };
      win.innerHTML += `<div class="msg"><small>${new Date(msg.ts).toLocaleTimeString()}</small><div>${msg.text}</div></div>`;
      // record in interactions as chat for selected contact if present
      const contactId = $('#detail-edit')?.dataset?.contactId;
      if (contactId) logInteraction({ contactId, type:'chat', note: text, timestamp: nowIso() });
      input.value = '';
      win.scrollTop = win.scrollHeight;
    });
  }

  // --- Event wiring for UI controls (init/destroy) ---
  let handlers = [];
  function bind(selector, ev, fn) {
    const el = $(selector);
    if (!el) return;
    el.addEventListener(ev, fn);
    handlers.push({ el, ev, fn });
  }
  function unbindAll() {
    handlers.forEach(h => { try { h.el.removeEventListener(h.ev, h.fn); } catch(e){} });
    handlers = [];
    boundHandlers.forEach(fn => { try { fn(); } catch(e){} });
    boundHandlers = [];
  }

  function openModal(title, bodyHtml, onSave) {
    const modal = $('#modal-root'); const titleEl = $('#modal-title'); const body = $('#modal-body');
    modal.classList.remove('hidden'); titleEl.textContent = title; body.innerHTML = bodyHtml;
    const save = $('#m-save'); const cancel = $('#m-cancel');
    const onSaveWrap = () => { try { if (onSave) onSave(); } finally { modal.classList.add('hidden'); save.removeEventListener('click', onSaveWrap'); } };
    // set handlers
    save.onclick = () => { onSave && onSave(); modal.classList.add('hidden'); };
    cancel.onclick = () => { modal.classList.add('hidden'); };
  }

  // --- Small helpers for UI actions ---
  function applySegment(name) {
    if (name === 'opened_not_bought') {
      const list = segmentOpenedButNotBought();
      // show them in contacts list (render only these)
      $('#crm-contacts-list').innerHTML = '';
      list.forEach(c => {
        const div = document.createElement('div'); div.className='contact-item';
        div.innerHTML = `<div><strong>${c.name}</strong><div class="muted">${c.email||''}</div></div>`;
        div.dataset.id = c.id; div.addEventListener('click', ()=>selectContact(c.id));
        $('#crm-contacts-list').appendChild(div);
      });
    } else if (name === 'high_value') {
      const list = contacts.filter(c => deals.some(d=>d.contactId===c.id && (d.amount||0) > 1000));
      $('#crm-contacts-list').innerHTML = '';
      list.forEach(c => {
        const div = document.createElement('div'); div.className='contact-item';
        div.innerHTML = `<div><strong>${c.name}</strong><div class="muted">${c.email||''}</div></div>`; div.dataset.id = c.id; div.addEventListener('click', ()=>selectContact(c.id));
        $('#crm-contacts-list').appendChild(div);
      });
    } else if (name === 'from_ads') {
      const list = contacts.filter(c => interactions.some(i => i.contactId === c.id && (i.meta && i.meta.source === 'ads')));
      $('#crm-contacts-list').innerHTML = '';
      list.forEach(c => {
        const div = document.createElement('div'); div.className='contact-item';
        div.innerHTML = `<div><strong>${c.name}</strong><div class="muted">${c.email||''}</div></div>`; div.dataset.id = c.id; div.addEventListener('click', ()=>selectContact(c.id));
        $('#crm-contacts-list').appendChild(div);
      });
    }
  }

  // --- Public API + init/destroy ---
  window.crmAPI = window.crmAPI || {};
  window.crmAPI.init = async function init(params = {}) {
    if (mounted) return;
    // ensure some demo data
    if (!templates.length) createTemplate({ name:'Bienvenida', subject:'Hola {{name}}', body:'Gracias por contactarnos, {{name}}.' });
    if (!contacts.length) {
      createContact({ name:'María Pérez', email:'maria@example.com', phone:'+34 600 000 001', tags:['lead'], metadata:{ country:'ES', stage:'lead' } });
      createCompany({ name:'Acme Corp', domain:'acme.example' });
      createDeal({ title:'Deal demo', amount:1200, contactId: contacts[0].id, stage:'negotiation' });
    }
    // Render UI
    renderContacts();
    renderPipeline();
    loadTemplatesUI();
    renderTasks();
    renderTimeline();
    initChatWidget();

    // Bindings
    bind('#crm-search', 'input', (e)=> renderContacts(e.target.value));
    bind('#crm-apply-seg', 'click', ()=> {
      const stage = $('#crm-filter-stage').value;
      const country = $('#crm-filter-country').value;
      const tag = $('#crm-filter-tag').value;
      // simple filter
      const filtered = contacts.filter(c => { if (stage && c.metadata?.stage !== stage) return false; if (country && c.metadata?.country !== country) return false; if (tag && !(c.tags||[]).includes(tag)) return false; return true; });
      $('#crm-contacts-list').innerHTML = '';
      filtered.forEach(c => {
        const d = document.createElement('div'); d.className='contact-item'; d.innerHTML = `<div><strong>${c.name}</strong><div class="muted">${c.email||''}</div></div>`; d.dataset.id = c.id; d.addEventListener('click', ()=>selectContact(c.id)); $('#crm-contacts-list').appendChild(d);
      });
    });
    bind('#crm-clear-seg','click', ()=> renderContacts());
    bind('.segments-panel .btn.tiny','click', (e)=> applySegment(e.target.dataset.seg || e.target.getAttribute('data-seg')) );
    bind('#crm-new-contact','click', ()=> {
      // show modal to create contact
      const html = `<label>Nombre<input id="m-name" /></label><label>Email<input id="m-email" /></label><label>Teléfono<input id="m-tel" /></label><label>Empresa<input id="m-company" /></label>`;
      $('#modal-title').textContent = 'Nuevo contacto';
      $('#modal-body').innerHTML = html;
      $('#modal-root').classList.remove('hidden');
      $('#m-save').onclick = () => {
        const name = $('#m-name').value.trim(); const email = $('#m-email').value.trim(); const tel = $('#m-tel').value.trim(); const company = $('#m-company').value.trim();
        let cid = null; if (company) { let co = companies.find(c=>c.name.toLowerCase()===company.toLowerCase()); if (!co) co = createCompany({ name: company }); cid = co.id; }
        createContact({ name, email, phone: tel, companyId: cid });
        $('#modal-root').classList.add('hidden'); renderContacts();
      };
      $('#m-cancel').onclick = () => $('#modal-root').classList.add('hidden');
    });

    bind('#detail-edit','click', ()=> {
      const cid = $('#detail-edit').dataset.contactId; if (!cid) return alert('Seleccione un contacto');
      const c = contacts.find(x=>x.id===cid);
      $('#modal-title').textContent = 'Editar contacto';
      $('#modal-body').innerHTML = `<label>Nombre<input id="m-name" value="${(c.name||'')}" /></label><label>Email<input id="m-email" value="${(c.email||'')}" /></label><label>Teléfono<input id="m-tel" value="${(c.phone||'')}" /></label>`;
      $('#modal-root').classList.remove('hidden');
      $('#m-save').onclick = () => { updateContact(cid, { name: $('#m-name').value, email: $('#m-email').value, phone: $('#m-tel').value }); $('#modal-root').classList.add('hidden'); renderContacts(); selectContact(cid); };
      $('#m-cancel').onclick = () => $('#modal-root').classList.add('hidden');
    });

    bind('#detail-email','click', ()=> {
      const cid = $('#detail-email').dataset.contactId; if(!cid) return alert('Seleccione un contacto');
      const tplId = $('#template-select').value || (templates[0] && templates[0].id);
      try { sendEmailSimulated({ toContactId: cid, templateId: tplId, track:true }); alert('Email enviado (simulado)'); } catch(e){ alert(e.message); }
    });

    bind('#interaction-form','submit', (e) => {
      e.preventDefault();
      const type = $('#interaction-type').value;
      const note = $('#interaction-note').value;
      const cid = $('#detail-edit').dataset.contactId;
      logInteraction({ contactId: cid || null, type, note, timestamp: nowIso() });
      $('#interaction-note').value = '';
      selectContact(cid);
    });

    bind('#deal-new','click', ()=> {
      const cid = $('#detail-edit').dataset.contactId || null;
      const d = createDeal({ title: 'Deal ' + Math.floor(Math.random()*1000), contactId: cid, amount: Math.round(Math.random()*5000), stage:'new' });
      renderPipeline(); if (cid) selectContact(cid);
    });

    bind('#task-new','click', ()=> {
      const cid = $('#detail-edit').dataset.contactId || null;
      createTask({ title:'Seguimiento', contactId: cid, dueAt: new Date(Date.now()+2*24*3600*1000).toISOString() });
      renderTasks();
    });

    bind('#template-new','click', ()=> {
      const id = createTemplate({ name: 'Plantilla ' + (templates.length+1), subject:'Asunto', body:'Hola {{name}}, ...' }).id;
      loadTemplatesUI();
      $('#template-select').value = id;
    });

    bind('#crm-export','click', ()=> {
      const dump = { contacts, companies, deals, interactions, templates, tasks, campaigns, tickets, kb, surveys };
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'dataconecta-crm-export.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    bind('#crm-import','click', ()=> {
      const input = document.createElement('input'); input.type='file'; input.accept='application/json';
      input.addEventListener('change', (ev) => {
        const f = ev.target.files && ev.target.files[0]; if (!f) return;
        const fr = new FileReader(); fr.onload = () => {
          try {
            const parsed = JSON.parse(fr.result);
            contacts = (parsed.contacts||[]).concat(contacts);
            companies = (parsed.companies||[]).concat(companies);
            deals = (parsed.deals||[]).concat(deals);
            interactions = (parsed.interactions||[]).concat(interactions);
            persistAll(); renderContacts(); renderPipeline();
            alert('Importado');
          } catch(e){ alert('JSON inválido'); }
        }; fr.readAsText(f);
      });
      input.click();
    });

    bind('#crm-open-campaigns','click', ()=> {
      const html = `<label>Nombre campaña<input id="camp-name" /></label><label>Enviar plantilla<select id="camp-tpl">${templates.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></label>`;
      $('#modal-title').textContent = 'Crear campaña';
      $('#modal-body').innerHTML = html; $('#modal-root').classList.remove('hidden');
      $('#m-save').onclick = () => { const name = $('#camp-name').value; const tpl = $('#camp-tpl').value; const c = createCampaign({ name, triggers:[], actions:[{ type:'email', templateId: tpl }] }); $('#modal-root').classList.add('hidden'); alert('Campaña creada: ' + c.name); };
      $('#m-cancel').onclick = () => $('#modal-root').classList.add('hidden');
    });

    // segments quick buttons
    qsa('.segments-panel .btn.tiny').forEach(btn => {
      const fn = (e) => applySegment(btn.dataset.seg || btn.getAttribute('data-seg'));
      btn.addEventListener('click', fn); boundHandlers.push(() => btn.removeEventListener('click', fn));
    });

    // tickets & kb
    bind('#ticket-new','click', ()=> {
      const html = `<label>Título<input id="t-title" /></label><label>Contacto (email)<input id="t-contact" /></label><label>Descripción<textarea id="t-desc"></textarea></label>`;
      $('#modal-title').textContent = 'Crear ticket'; $('#modal-body').innerHTML = html; $('#modal-root').classList.remove('hidden');
      $('#m-save').onclick = () => { const title = $('#t-title').value; const email = $('#t-contact').value; const c = contacts.find(x=>x.email===email) || null; const t = createTicket({ title, contactId: c ? c.id : null, messages: [{ text: $('#t-desc').value, author:'agent', ts: nowIso() }] }); $('#modal-root').classList.add('hidden'); renderTickets(); alert('Ticket creado'); };
      $('#m-cancel').onclick = () => $('#modal-root').classList.add('hidden');
    });

    // KB
    bind('#kb-new','click', ()=> {
      const html = `<label>Título<input id="kb-title" /></label><label>Contenido<textarea id="kb-body"></textarea></label>`;
      $('#modal-title').textContent = 'Nuevo artículo KB'; $('#modal-body').innerHTML = html; $('#modal-root').classList.remove('hidden');
      $('#m-save').onclick = () => { createKbArticle({ title: $('#kb-title').value, body: $('#kb-body').value }); $('#modal-root').classList.add('hidden'); renderKB(); };
      $('#m-cancel').onclick = () => $('#modal-root').classList.add('hidden');
    });

    // pipeline drag-drop already bound in renderPipeline

    mounted = true;
  };

  window.crmAPI.destroy = function destroy() {
    if (!mounted) return;
    unbindAll();
    mounted = false;
    // remove module DOM
    const el = document.getElementById('app-root')?.querySelector('.crm-module');
    if (el) el.remove();
  };

  // --- Helper renderers for tickets/kb/etc. ---
  function renderTickets() {
    const el = document.getElementById('tickets-list'); if (!el) return;
    el.innerHTML = tickets.map(t => `<div style="padding:6px;border-bottom:1px solid #eee"><strong>${t.title}</strong><div class="muted">${t.status} • ${t.contactId ? contacts.find(c=>c.id===t.contactId)?.name||'' : ''}</div></div>`).join('') || '<div class="muted">No hay tickets</div>';
  }
  function renderKB() {
    const el = document.getElementById('kb-list'); if (!el) return;
    el.innerHTML = kb.map(a => `<div style="padding:6px;border-bottom:1px solid #eee"><strong>${a.title}</strong><div class="muted">${(a.tags||[]).join(', ')}</div></div>`).join('') || '<div class="muted">No hay artículos</div>';
  }

  // --- Expose richer API surface & integrations stubs ---
  window.crmAPI.createContact = createContact;
  window.crmAPI.updateContact = updateContact;
  window.crmAPI.deleteContact = deleteContact;
  window.crmAPI.createCompany = createCompany;
  window.crmAPI.createDeal = createDeal;
  window.crmAPI.updateDeal = updateDeal;
  window.crmAPI.createTask = createTask;
  window.crmAPI.logInteraction = logInteraction;
  window.crmAPI.createTemplate = createTemplate;
  window.crmAPI.sendEmailSimulated = sendEmailSimulated;
  window.crmAPI.registerWebhook = registerWebhook;
  window.crmAPI.listWebhooks = listWebhooks;
  window.crmAPI.clearWebhooks = clearWebhooks;
  window.crmAPI.createCampaign = createCampaign;
  window.crmAPI.runCampaign = runCampaign;
  window.crmAPI.captureFormSubmission = captureFormSubmission;
  window.crmAPI.createTicket = createTicket;
  window.crmAPI.createKbArticle = createKbArticle;
  window.crmAPI.createSurvey = createSurvey;
  window.crmAPI.recordSurveyResponse = recordSurveyResponse;
  window.crmAPI.segmentOpenedButNotBought = segmentOpenedButNotBought;
  window.crmAPI.forecastNextWeek = forecastNextWeek;
  window.crmAPI.on = on;
  window.crmAPI.off = off;

  // initialize UI data renderers for lists
  // call these periodically or after mutations
  function refreshAllViews() {
    renderContacts();
    renderPipeline();
    renderTasks();
    renderTimeline();
    renderKB();
    renderTickets();
    loadTemplatesUI();
  }

  // Small boot: ensure templates exist and persist
  if (!templates || templates.length === 0) {
    createTemplate({ name:'Bienvenida', subject:'Bienvenido {{name}}', body:'Hola {{name}}, ¡gracias por registrarte!' });
    persistAll();
  }

  // Expose internal data for debugging (read-only)
  window.__dataconecta_crm = { contacts, companies, deals, interactions, templates, tasks, campaigns, tickets, kb, surveys, webhooks };

})();
