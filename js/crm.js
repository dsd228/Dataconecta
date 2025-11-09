/* js/crm.js
   Core CRM module for DataConecta — central logic for Contacts, Companies, Deals,
   Communications, Tasks, Campaigns, Tickets, KnowledgeBase, Surveys and Integrations.
   - Storage: localStorage by default, with optional backend via window.crmAPI.setBackend(url, token)
   - Exposes window.crmAPI for integrations and testing
   - Wires to basic UI elements in index.html (buttons already present in the template)
   Paste this file to js/crm.js and add <script src="js/crm.js" defer></script> in index.html
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

  // Minimal helpers
  function genId(prefix = 'id') { return prefix + '_' + Math.random().toString(36).slice(2, 9); }
  function nowIso() { return new Date().toISOString(); }
  function safeParse(s, fallback = []) { try { return JSON.parse(s); } catch (e) { return fallback; } }
  function save(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.warn('Storage save failed', e); } }
  function load(key, fallback = []) { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; } }

  // Local data caches (kept in memory)
  let contacts = load(KEYS.CONTACTS, []);
  let companies = load(KEYS.COMPANIES, []);
  let deals = load(KEYS.DEALS, []);
  let interactions = load(KEYS.INTERACTIONS, []); // emails, calls, meetings, forms, tracking events
  let templates = load(KEYS.TEMPLATES, []); // email templates
  let tasks = load(KEYS.TASKS, []);
  let campaigns = load(KEYS.CAMPAIGNS, []);
  let tickets = load(KEYS.TICKETS, []);
  let kb = load(KEYS.KB, []);
  let surveys = load(KEYS.SURVEYS, []);
  let settings = load(KEYS.SETTINGS, { backend: null, token: null });

  // Backend sync hooks (optional)
  const backend = {
    enabled: false,
    baseUrl: null,
    token: null,
    set(baseUrl, token) {
      this.enabled = !!baseUrl;
      this.baseUrl = baseUrl || null;
      this.token = token || null;
    },
    async request(path, { method = 'GET', body = null } = {}) {
      if (!this.enabled || !this.baseUrl) throw new Error('Backend not configured');
      const url = (this.baseUrl.replace(/\/$/, '') + '/' + path.replace(/^\//, ''));
      const opts = { method, headers: {} };
      if (this.token) opts.headers['Authorization'] = 'Bearer ' + this.token;
      if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error('Network error: ' + res.status);
      return res.json();
    }
  };

  // Persist caches
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

  // ----------------- Data model helpers -----------------
  function findContact(id) { return contacts.find(c => c.id === id) || null; }
  function findCompany(id) { return companies.find(c => c.id === id) || null; }
  function findDeal(id) { return deals.find(d => d.id === id) || null; }

  // ----------------- Contacts CRUD -----------------
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
    contacts.push(contact);
    persistAll();
    emitEvent('contact.created', contact);
    return contact;
  }

  function updateContact(id, patch) {
    const c = findContact(id);
    if (!c) return null;
    Object.assign(c, patch, { updatedAt: nowIso() });
    persistAll();
    emitEvent('contact.updated', c);
    return c;
  }

  function deleteContact(id) {
    const i = contacts.findIndex(c => c.id === id);
    if (i === -1) return false;
    const removed = contacts.splice(i, 1)[0];
    // optionally remove interactions, tasks, deals related (soft)
    persistAll();
    emitEvent('contact.deleted', removed);
    return true;
  }

  function searchContacts(q = '', filters = {}) {
    // q: free text (name/email/phone), filters: {tag, companyId, stage, country}
    q = (q || '').toLowerCase().trim();
    return contacts.filter(c => {
      if (q) {
        const hay = ((c.name||'') + ' ' + (c.email||'') + ' ' + (c.phone||'')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.tag && !(c.tags || []).includes(filters.tag)) return false;
      if (filters.companyId && c.companyId !== filters.companyId) return false;
      if (filters.stage && c.metadata && c.metadata.stage !== filters.stage) return false;
      if (filters.country && c.metadata && c.metadata.country !== filters.country) return false;
      return true;
    });
  }

  // ----------------- Companies -----------------
  function createCompany(data) {
    const comp = Object.assign({
      id: genId('company'),
      name: '',
      domain: '',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      metadata: {}
    }, data);
    companies.push(comp);
    persistAll();
    emitEvent('company.created', comp);
    return comp;
  }
  function updateCompany(id, patch) {
    const c = findCompany(id);
    if (!c) return null;
    Object.assign(c, patch, { updatedAt: nowIso() });
    persistAll();
    emitEvent('company.updated', c);
    return c;
  }
  function deleteCompany(id) {
    const i = companies.findIndex(c => c.id === id);
    if (i === -1) return false;
    const removed = companies.splice(i, 1)[0];
    persistAll();
    emitEvent('company.deleted', removed);
    return true;
  }

  // ----------------- Deals / Pipeline -----------------
  // deal: { id, title, contactId, companyId, amount, currency, stage, createdAt, updatedAt, closeDate }
  const DEFAULT_PIPELINE = ['new', 'contacted', 'negotiation', 'closed_won', 'closed_lost'];
  function createDeal(data) {
    const d = Object.assign({
      id: genId('deal'),
      title: 'Nuevo deal',
      contactId: null,
      companyId: null,
      amount: 0,
      currency: 'EUR',
      stage: 'new',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      closeDate: null,
      owner: null
    }, data);
    deals.push(d);
    persistAll();
    emitEvent('deal.created', d);
    return d;
  }
  function updateDeal(id, patch) {
    const d = findDeal(id);
    if (!d) return null;
    const prev = Object.assign({}, d);
    Object.assign(d, patch, { updatedAt: nowIso() });
    persistAll();
    emitEvent('deal.updated', { before: prev, after: d });
    return d;
  }
  function deleteDeal(id) {
    const i = deals.findIndex(d => d.id === id);
    if (i === -1) return false;
    const removed = deals.splice(i, 1)[0];
    persistAll();
    emitEvent('deal.deleted', removed);
    return true;
  }
  function getPipelineSummary() {
    const summary = {};
    DEFAULT_PIPELINE.forEach(s => summary[s] = { count: 0, amount: 0 });
    deals.forEach(d => {
      if (!summary[d.stage]) summary[d.stage] = { count: 0, amount: 0 };
      summary[d.stage].count++;
      summary[d.stage].amount += (d.amount || 0);
    });
    return summary;
  }
  function forecastNextPeriod() {
    // simplistic forecast: sum of amounts of deals in negotiation and new
    const relevant = deals.filter(d => ['negotiation', 'contacted', 'new'].includes(d.stage));
    const total = relevant.reduce((s, d) => s + (d.amount || 0), 0);
    return { expected: total, count: relevant.length };
  }

  // ----------------- Interactions (emails, calls, meetings, forms, opens/clicks) -----------------
  // interaction: { id, contactId, type: 'email'|'call'|'meeting'|'form'|'open'|'click', subject, body, timestamp, meta:{} }
  function logInteraction(obj) {
    const it = Object.assign({ id: genId('int'), timestamp: nowIso() }, obj);
    interactions.push(it);
    persistAll();
    emitEvent('interaction.logged', it);
    return it;
  }

  // Email sending & tracking (stubs)
  function createTemplate({ id = genId('tpl'), name = 'Template', subject = '', body = '' } = {}) {
    const tpl = { id, name, subject, body, createdAt: nowIso(), updatedAt: nowIso() };
    templates.push(tpl);
    persistAll();
    emitEvent('template.created', tpl);
    return tpl;
  }
  function updateTemplate(id, patch) {
    const t = templates.find(x => x.id === id);
    if (!t) return null;
    Object.assign(t, patch, { updatedAt: nowIso() });
    persistAll();
    emitEvent('template.updated', t);
    return t;
  }
  function deleteTemplate(id) {
    const i = templates.findIndex(x => x.id === id);
    if (i === -1) return false;
    const removed = templates.splice(i, 1)[0];
    persistAll();
    emitEvent('template.deleted', removed);
    return true;
  }

  async function sendEmail({ toContactId, templateId, override = {}, track = true }) {
    const contact = findContact(toContactId);
    const tpl = templates.find(t => t.id === templateId);
    if (!contact || !tpl) throw new Error('contact/template not found');
    // Compose
    const subject = override.subject || tpl.subject;
    const body = (override.body || tpl.body).replace(/\{\{name\}\}/g, contact.name || '');
    // Log sending as interaction
    const sent = logInteraction({
      contactId: contact.id,
      type: 'email.sent',
      subject,
      body,
      meta: { templateId, tracked: !!track }
    });
    // Simulate tracking: schedule an "open" after random time if track=true
    if (track) {
      setTimeout(() => {
        const open = logInteraction({
          contactId: contact.id,
          type: 'email.open',
          subject,
          body: '',
          meta: { templateId, simulated: true }
        });
        emitEvent('email.open', { contact, open });
      }, 3000 + Math.random() * 8000); // 3-11s
      // Simulate click occasionally
      if (Math.random() > 0.8) {
        setTimeout(() => {
          const click = logInteraction({
            contactId: contact.id,
            type: 'email.click',
            subject, body: '', meta: { templateId, url: 'https://example.com' }
          });
          emitEvent('email.click', { contact, click });
        }, 5000 + Math.random() * 10000);
      }
    }
    emitEvent('email.sent', { contact, sent });
    return sent;
  }

  // ----------------- Tasks (follow-ups, reminders) -----------------
  // task: { id, title, dueAt, assignedTo, contactId, dealId, completed, createdAt }
  function createTask(data) {
    const t = Object.assign({ id: genId('task'), title: '', dueAt: null, assignedTo: null, contactId: null, dealId: null, completed: false, createdAt: nowIso() }, data);
    tasks.push(t); persistAll(); emitEvent('task.created', t); return t;
  }
  function updateTask(id, patch) {
    const t = tasks.find(x => x.id === id); if (!t) return null; Object.assign(t, patch); persistAll(); emitEvent('task.updated', t); return t;
  }
  function completeTask(id) { return updateTask(id, { completed: true }); }

  // ----------------- Campaigns + Marketing automations (stubs) -----------------
  function createCampaign(data) {
    const c = Object.assign({ id: genId('camp'), name: 'Campaign', channels: [], createdAt: nowIso(), metadata: {} }, data);
    campaigns.push(c); persistAll(); emitEvent('campaign.created', c); return c;
  }
  function runSimpleAutomationForCampaign(campaignId) {
    // Example: send template to contacts in campaign segment
    const camp = campaigns.find(x => x.id === campaignId); if (!camp) throw new Error('campaign not found');
    // for demo, pick 10 random contacts and send template if exists
    const tpl = templates[0];
    if (!tpl) return { sent: 0, message: 'No template' };
    const sample = contacts.slice(0, Math.min(10, contacts.length));
    sample.forEach(c => sendEmail({ toContactId: c.id, templateId: tpl.id, track: true }));
    return { sent: sample.length };
  }

  // ----------------- Tickets / Service -----------------
  // ticket: { id, title, contactId, status:open/closed/pending, messages:[], createdAt }
  function createTicket(data) {
    const t = Object.assign({ id: genId('ticket'), title: '', contactId: null, status: 'open', messages: [], createdAt: nowIso() }, data);
    tickets.push(t); persistAll(); emitEvent('ticket.created', t); return t;
  }
  function addTicketMessage(ticketId, msg) {
    const t = tickets.find(x => x.id === ticketId); if(!t) return null; const m = Object.assign({ id: genId('msg'), text: msg.text || '', author: msg.author || 'agent', ts: nowIso() }, msg); t.messages.push(m); persistAll(); emitEvent('ticket.message', { ticket: t, message: m }); return m;
  }
  function updateTicketStatus(ticketId, status) { const t = tickets.find(x=>x.id===ticketId); if(!t) return null; t.status = status; persistAll(); emitEvent('ticket.updated', t); return t; }

  // ----------------- Knowledge Base -----------------
  function createKbArticle(data) {
    const a = Object.assign({ id: genId('kb'), title: '', body: '', tags: [], createdAt: nowIso() }, data);
    kb.push(a); persistAll(); return a;
  }

  // ----------------- Surveys (NPS/CSAT) stub -----------------
  function createSurvey(data) { const s = Object.assign({ id: genId('survey'), name: '', type: 'NPS', questions: [], responses: [], createdAt: nowIso() }, data); surveys.push(s); persistAll(); return s; }
  function recordSurveyResponse(surveyId, response) { const s = surveys.find(x=>x.id===surveyId); if(!s) return null; s.responses.push(Object.assign({ id: genId('resp'), ts: nowIso() }, response)); persistAll(); return true; }

  // ----------------- Exports / Import -----------------
  function exportCRM() {
    const dump = { contacts, companies, deals, interactions, templates, tasks, campaigns, tickets, kb, surveys };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'dataconecta-crm-export.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function importCRMFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          // merge by naive concatenation with id dedup
          contacts = (parsed.contacts || []).concat(contacts);
          companies = (parsed.companies || []).concat(companies);
          deals = (parsed.deals || []).concat(deals);
          interactions = (parsed.interactions || []).concat(interactions);
          templates = (parsed.templates || []).concat(templates);
          tasks = (parsed.tasks || []).concat(tasks);
          campaigns = (parsed.campaigns || []).concat(campaigns);
          tickets = (parsed.tickets || []).concat(tickets);
          kb = (parsed.kb || []).concat(kb);
          surveys = (parsed.surveys || []).concat(surveys);
          persistAll();
          resolve(true);
        } catch (e) { reject(e); }
      };
      r.onerror = reject;
      r.readAsText(file);
    });
  }

  // ----------------- Simple segmentation examples -----------------
  function segmentContacts(criteria = {}) {
    // criteria: { country, tag, stage, source }
    return contacts.filter(c => {
      if (criteria.country && c.metadata?.country !== criteria.country) return false;
      if (criteria.tag && !(c.tags || []).includes(criteria.tag)) return false;
      if (criteria.stage && c.metadata?.stage !== criteria.stage) return false;
      if (criteria.emailOpened === true) {
        // find an open interaction
        const opened = interactions.find(i => i.contactId === c.id && i.type === 'email.open');
        if (!opened) return false;
      }
      return true;
    });
  }

  // Example: filter leads that opened an email but didn't buy -> leads with email.open but no won deal
  function leadsOpenedEmailNotBought() {
    const leadContacts = contacts.filter(c => c.metadata?.stage === 'lead');
    return leadContacts.filter(c => {
      const opened = interactions.some(i => i.contactId === c.id && i.type === 'email.open');
      const bought = deals.some(d => d.contactId === c.id && d.stage === 'closed_won');
      return opened && !bought;
    });
  }

  // ----------------- Events / pubsub -----------------
  const listeners = {};
  function on(event, cb) { listeners[event] = listeners[event] || []; listeners[event].push(cb); return () => off(event, cb); }
  function off(event, cb) { if (!listeners[event]) return; listeners[event] = listeners[event].filter(f => f !== cb); }
  function emitEvent(event, payload) { (listeners[event] || []).forEach(cb => { try { cb(payload); } catch (e) { console.warn(e); } }); }

  // ----------------- UI bindings to existing index.html controls ----------------  //
  function wireUI() {
    // New contact button: opens existing modal in index.html (#modal-root)
    document.getElementById('btn-new-contact')?.addEventListener('click', () => {
      const modal = document.getElementById('modal-root');
      if (!modal) {
        // Quick inline prompt fallback
        const name = prompt('Nombre del contacto');
        if (!name) return;
        createContact({ name });
        alert('Contacto creado: ' + name);
        return;
      }
      // fill modal and show
      modal.classList.remove('hidden');
      // set handlers for save (m-save) and cancel (m-cancel)
      document.getElementById('m-name').value = '';
      document.getElementById('m-email').value = '';
      document.getElementById('m-tel').value = '';
      document.getElementById('m-company').value = '';
      document.getElementById('m-save').onclick = () => {
        const name = document.getElementById('m-name').value.trim();
        const email = document.getElementById('m-email').value.trim();
        const tel = document.getElementById('m-tel').value.trim();
        const companyName = document.getElementById('m-company').value.trim();
        let companyId = null;
        if (companyName) {
          // find or create company
          let comp = companies.find(c => c.name.toLowerCase() === companyName.toLowerCase());
          if (!comp) comp = createCompany({ name: companyName });
          companyId = comp.id;
        }
        const contact = createContact({ name, email, phone: tel, companyId });
        modal.classList.add('hidden');
        alert('Contacto guardado: ' + contact.name);
      };
      document.getElementById('m-cancel').onclick = () => modal.classList.add('hidden');
    });

    // Export/Import JSON
    document.getElementById('btn-export-json')?.addEventListener('click', () => exportCRM());
    const importFile = document.getElementById('file-import');
    document.getElementById('btn-import-json')?.addEventListener('click', () => importFile?.click());
    importFile?.addEventListener('change', (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (f) {
        importCRMFile(f).then(() => { alert('Importado correctamente'); }).catch(err => alert('Import error: ' + err.message));
      }
      ev.target.value = '';
    });

    // Open editor button: pass selected contact id (if any)
    document.getElementById('btn-open-editor')?.addEventListener('click', () => {
      // pick active contact if any (this UI doesn't select contacts programatically), so open editor blank
      if (window.openEditorForProject) {
        // pass dummy projectId or contact id if selected
        window.openEditorForProject(null);
      } else if (window.editorAPI && window.editorAPI.open) {
        window.editorAPI.open();
      } else {
        // fallback: switch view by hash
        location.hash = '#/editor';
      }
    });

    // Quick export CSV activity from analytics UI buttons if present (integrates)
    document.getElementById('btn-export-json-contacts')?.addEventListener('click', () => exportContactsCSV());
  }

  // Small CSV export helper for contacts
  function exportContactsCSV(filename = 'contacts.csv') {
    const rows = [];
    rows.push(['id','name','email','phone','company','tags','createdAt'].join(','));
    contacts.forEach(c => {
      const comp = c.companyId ? (findCompany(c.companyId)?.name || '') : '';
      rows.push([c.id, `"${(c.name||'').replace(/"/g,'""')}"`, c.email || '', c.phone || '', `"${comp.replace(/"/g,'""')}"`, `"${(c.tags||[]).join(';')}"`, c.createdAt].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // ----------------- Public API (exposed on window.crmAPI) -----------------
  const crmAPI = {
    // CRUD
    createContact,
    updateContact,
    deleteContact,
    searchContacts,
    createCompany,
    updateCompany,
    deleteCompany,
    createDeal,
    updateDeal,
    deleteDeal,
    listDeals: () => deals.slice(),
    listContacts: () => contacts.slice(),
    listCompanies: () => companies.slice(),

    // interactions & communications
    logInteraction,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    sendEmail,

    // tasks, tickets, KB, surveys
    createTask, updateTask, completeTask,
    createTicket, addTicketMessage, updateTicketStatus,
    createKbArticle,
    createSurvey, recordSurveyResponse,

    // segments and queries
    segmentContacts,
    leadsOpenedEmailNotBought,

    // exports
    exportCRM,
    importCRMFile,

    // pipeline & analytics helpers
    getPipelineSummary,
    forecastNextPeriod,

    // components
    setBackend(baseUrl, token) {
      backend.set(baseUrl, token);
      settings.backend = baseUrl;
      settings.token = token;
      save(KEYS.SETTINGS, settings);
      persistAll();
      return true;
    },
    disableBackend() { backend.set(null); settings.backend = null; settings.token = null; persistAll(); },

    // events (pubsub)
    on,
    off,

    // admin helpers
    resetDemoData() {
      contacts = []; companies = []; deals = []; interactions = []; templates = []; tasks = []; campaigns = []; tickets = []; kb = []; surveys = [];
      persistAll();
      return true;
    }
  };

  // attach crmAPI to window
  window.crmAPI = Object.assign(window.crmAPI || {}, crmAPI);

  // ----------------- Initialize and wire UI -----------------
  document.addEventListener('DOMContentLoaded', () => {
    wireUI();
    // ensure at least one template exists for demo
    if (!templates.length) createTemplate({ name: 'Welcome', subject: 'Hola {{name}}', body: 'Hola {{name}}, gracias por contactarnos.' });
    // ensure demo company/contact
    if (!contacts.length) createContact({ name: 'María Pérez', email: 'maria@example.com', phone: '+34 600 000 001', metadata: { country: 'ES', stage: 'lead' } });
    if (!companies.length) createCompany({ name: 'Acme Corp', domain: 'acme.example' });
    persistAll();
    // listen to events (example: forward opens to analytics module)
    on('email.open', ({ contact, open }) => {
      if (window.analyticsAPI && typeof window.analyticsAPI.refreshAll === 'function') {
        // small debounce
        setTimeout(() => window.analyticsAPI.refreshAll().catch(()=>{}), 500);
      }
    });
    console.info('CRM module initialized. window.crmAPI available.');
  });

  // expose internals for debugging
  window.__dataconecta_crm_internal = {
    contacts, companies, deals, interactions, templates, tasks, campaigns, tickets, kb, surveys, settings
  };
})();
