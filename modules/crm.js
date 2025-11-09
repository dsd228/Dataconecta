/* modules/crm.js
   Versión completa del CRM (adaptada para cargarse como módulo).
   Exports: window.crmAPI with init(params) and destroy()
*/
(function () {
  const STORAGE_PREFIX = 'dataconecta:crm:';
  const KEYS = {
    CONTACTS: STORAGE_PREFIX + 'contacts_v1',
    COMPANIES: STORAGE_PREFIX + 'companies_v1',
    DEALS: STORAGE_PREFIX + 'deals_v1',
    INTERACTIONS: STORAGE_PREFIX + 'interactions_v1',
    TEMPLATES: STORAGE_PREFIX + 'templates_v1',
    TASKS: STORAGE_PREFIX + 'tasks_v1',
    CAMPAIGNS: STORAGE_PREFIX + 'campaigns_v1',
    TICKETS: STORAGE_PREFIX + 'tickets_v1',
    KB: STORAGE_PREFIX + 'kb_v1',
    SURVEYS: STORAGE_PREFIX + 'surveys_v1',
    SETTINGS: STORAGE_PREFIX + 'settings_v1',
  };

  function genId(prefix = 'id') { return prefix + '_' + Math.random().toString(36).slice(2, 9); }
  function nowIso() { return new Date().toISOString(); }
  function save(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.warn('Storage save failed', e); } }
  function load(key, fallback = []) { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; } }

  // In-memory caches
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
  let settings = load(KEYS.SETTINGS, { backend: null, token: null });

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
    save(KEYS.SETTINGS, settings);
  }

  // pub/sub
  const listeners = {};
  function on(event, cb) { listeners[event] = listeners[event] || []; listeners[event].push(cb); return () => off(event, cb); }
  function off(event, cb) { if (!listeners[event]) return; listeners[event] = listeners[event].filter(f => f !== cb); }
  function emitEvent(event, payload) { (listeners[event] || []).forEach(cb => { try { cb(payload); } catch (e) { console.warn(e); } }); }

  // Core functions similar to previously provided advanced crm.js
  function createContact(data) {
    const contact = Object.assign({
      id: genId('contact'),
      name: '',
      email: '',
      phone: '',
      companyId: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      metadata: {},
      tags: []
    }, data);
    contacts.unshift(contact);
    persistAll();
    emitEvent('contact.created', contact);
    return contact;
  }
  function updateContact(id, patch) {
    const c = contacts.find(x => x.id === id);
    if (!c) return null;
    Object.assign(c, patch, { updatedAt: nowIso() });
    persistAll();
    emitEvent('contact.updated', c);
    return c;
  }
  function deleteContact(id) {
    const i = contacts.findIndex(x => x.id === id);
    if (i === -1) return false;
    const removed = contacts.splice(i, 1)[0];
    persistAll();
    emitEvent('contact.deleted', removed);
    return true;
  }

  // small UI for the module (bind/unbind)
  let mounted = false;
  let handlers = [];

  function $(sel, root=document) { return root.querySelector(sel); }
  function renderContactsList(filter='') {
    const list = document.getElementById('crm-contacts-list');
    if (!list) return;
    list.innerHTML = '';
    const items = contacts.filter(c => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (c.name||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q) || (c.phone||'').toLowerCase().includes(q);
    });
    items.forEach(c => {
      const el = document.createElement('div'); el.className = 'contact-item';
      el.dataset.id = c.id;
      el.innerHTML = `<strong>${c.name}</strong><div style="color:#666;font-size:13px">${c.email || ''} ${c.phone ? '• ' + c.phone : ''}</div>`;
      el.addEventListener('click', () => showContactDetail(c.id));
      list.appendChild(el);
    });
  }

  function showContactDetail(id) {
    const c = contacts.find(x=>x.id===id); if(!c) return;
    const nameEl = document.getElementById('crm-detail-name'); const meta = document.getElementById('crm-detail-meta'); const inter = document.getElementById('crm-detail-interactions');
    if (nameEl) nameEl.textContent = c.name;
    if (meta) meta.innerHTML = `<div><strong>Email:</strong> ${c.email || '-'}</div><div><strong>Tel:</strong> ${c.phone || '-'}</div><div><strong>Empresa:</strong> ${c.companyId ? (companies.find(cc=>cc.id===c.companyId)?.name||'-') : (c.company || '-')}</div>`;
    if (inter) {
      const list = interactions.filter(i => i.contactId === id).slice().reverse();
      inter.innerHTML = list.map(it => `<div style="padding:6px;border-bottom:1px solid #f0f0f0"><small>${new Date(it.timestamp||it.ts||nowIso()).toLocaleString()}</small><div>${it.type} ${it.note? '• ' + it.note : ''}</div></div>`).join('') || '<div class="muted">Sin interacciones</div>';
    }
  }

  function bindUI() {
    // basic bindings inside this module's DOM
    const search = document.getElementById('crm-search');
    if (search) {
      const fn = (e) => renderContactsList(e.target.value);
      search.addEventListener('input', fn);
      handlers.push({ el: search, ev:'input', fn });
    }
    const btnNew = document.getElementById('crm-btn-new');
    if (btnNew) {
      const fn = () => {
        const form = document.getElementById('crm-form'); const detail = document.getElementById('crm-detail');
        form.style.display = 'block'; detail.style.display = 'none';
        document.getElementById('crm-form-title').textContent = 'Nuevo contacto';
        document.getElementById('crm-form-save').dataset.editId = '';
      };
      btnNew.addEventListener('click', fn); handlers.push({ el: btnNew, ev:'click', fn });
    }
    const form = document.getElementById('crm-form-el');
    if (form) {
      const fn = (ev) => {
        ev.preventDefault();
        const editId = document.getElementById('crm-form-save').dataset.editId;
        const payload = {
          name: document.getElementById('crm-form-name').value.trim(),
          email: document.getElementById('crm-form-email').value.trim(),
          phone: document.getElementById('crm-form-phone').value.trim(),
          company: document.getElementById('crm-form-company').value.trim()
        };
        if (editId) updateContact(editId, payload);
        else createContact(payload);
        document.getElementById('crm-form').style.display = 'none';
        document.getElementById('crm-detail').style.display = 'block';
        renderContactsList();
      };
      form.addEventListener('submit', fn); handlers.push({ el: form, ev:'submit', fn });
    }
    const cancel = document.getElementById('crm-form-cancel');
    if (cancel) {
      const fn = (e) => { e.preventDefault(); document.getElementById('crm-form').style.display='none'; document.getElementById('crm-detail').style.display='block'; };
      cancel.addEventListener('click', fn); handlers.push({ el: cancel, ev:'click', fn });
    }
    const btnExport = document.getElementById('crm-btn-export');
    if (btnExport) {
      const fn = () => {
        const rows = ['id,name,email,phone,company,createdAt'];
        contacts.forEach(c => rows.push([c.id, `"${(c.name||'').replace(/"/g,'""')}"`, c.email||'', c.phone||'', `"${(c.company||'').replace(/"/g,'""')}"`, c.createdAt].join(',')));
        const blob = new Blob([rows.join('\n')], { type:'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'contacts.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      };
      btnExport.addEventListener('click', fn); handlers.push({ el: btnExport, ev:'click', fn });
    }

    renderContactsList();
  }

  function unbindUI() {
    handlers.forEach(h => {
      try { h.el.removeEventListener(h.ev, h.fn); } catch(e) {}
    });
    handlers = [];
  }

  // Public API
  window.crmAPI = Object.assign(window.crmAPI || {}, {
    init: async function init(params = {}) {
      if (mounted) return;
      // ensure some demo data
      if (!templates.length) templates.push({ id: genId('tpl'), name: 'Welcome', subject: 'Hola {{name}}', body: 'Hola {{name}}...' });
      if (!contacts.length) contacts.push({ id: genId('c'), name: 'María Pérez', email:'maria@example.com', phone:'+34 600 000 001', company: 'Acme', createdAt: nowIso(), updatedAt: nowIso() });
      persistAll();
      bindUI();
      mounted = true;
      return true;
    },

    destroy: function destroy() {
      if (!mounted) return;
      unbindUI();
      mounted = false;
      // remove module DOM for cleanliness
      const mod = document.getElementById('app-root')?.querySelector('.module-crm');
      if (mod) mod.remove();
    },

    // data API
    createContact, updateContact, deleteContact,
    createCompany(data){ const c = Object.assign({ id: genId('company'), createdAt: nowIso(), updatedAt: nowIso() }, data); companies.push(c); persistAll(); return c; },
    listContacts(){ return contacts.slice(); },
    listCompanies(){ return companies.slice(); },

    on, off, exportCSV() {
      const rows = ['id,name,email,phone,company,createdAt'];
      contacts.forEach(c => rows.push([c.id, `"${(c.name||'').replace(/"/g,'""')}"`, c.email||'', c.phone||'', `"${(c.company||'').replace(/"/g,'""')}"`, c.createdAt].join(',')));
      const blob = new Blob([rows.join('\n')], { type:'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='contacts.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }
  });

})();
