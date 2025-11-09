// modules/crm.js
// Lightweight CRM module exposing crmAPI.init(params) and crmAPI.destroy()
// Uses localStorage for persistence and provides simple UI bindings in modules/crm.html

(function () {
  const STORAGE_KEY = 'dataconecta:crm:v3';
  let state = { contacts: [], companies: [], interactions: [] };
  let dom = {};
  let mounted = false;
  let handlers = [];

  function load() {
    try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || state; } catch (e) { state = state; }
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  function genId(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9); }
  function nowIso(){ return new Date().toISOString(); }

  // Simple APIs
  function createContact({ name, email, phone, company } = {}) {
    const c = { id: genId('c'), name, email, phone, company, createdAt: nowIso(), updatedAt: nowIso() };
    state.contacts.unshift(c); save(); renderList(); return c;
  }
  function updateContact(id, patch) {
    const idx = state.contacts.findIndex(x => x.id === id); if (idx === -1) return null;
    Object.assign(state.contacts[idx], patch, { updatedAt: nowIso() }); save(); renderList(); return state.contacts[idx];
  }
  function deleteContact(id) {
    state.contacts = state.contacts.filter(x => x.id !== id); save(); renderList();
  }

  // UI helpers
  function $(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from((root || document).querySelectorAll(sel)); }

  function renderList(filter = '') {
    const listEl = dom.list;
    if (!listEl) return;
    listEl.innerHTML = '';
    const items = state.contacts.filter(c => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q);
    });
    items.forEach(c => {
      const div = document.createElement('div'); div.className = 'contact-item';
      div.dataset.id = c.id;
      div.innerHTML = `<strong>${c.name}</strong><div style="color:#666;font-size:13px">${c.email || ''} ${c.phone ? '• ' + c.phone : ''}</div>`;
      div.addEventListener('click', () => showDetail(c.id));
      listEl.appendChild(div);
    });
  }

  function showDetail(id) {
    const contact = state.contacts.find(c => c.id === id);
    if (!contact) return;
    dom.detailName.textContent = contact.name;
    dom.detailMeta.innerHTML = `<div><strong>Email:</strong> ${contact.email || '-'}</div><div><strong>Tel:</strong> ${contact.phone || '-'}</div><div><strong>Empresa:</strong> ${contact.company || '-'}</div>`;
    const interactions = state.interactions.filter(i => i.contactId === id).slice().reverse();
    dom.detailInteractions.innerHTML = interactions.map(i => `<div style="padding:6px;border-bottom:1px solid #f0f0f0"><small>${new Date(i.ts).toLocaleString()}</small><div>${i.type} ${i.note? '• ' + i.note : ''}</div></div>`).join('') || '<div class="muted">Sin interacciones</div>';
  }

  function showForm(edit = null) {
    dom.form.style.display = 'block';
    dom.detail.style.display = 'none';
    dom.formTitle.textContent = edit ? 'Editar contacto' : 'Nuevo contacto';
    if (edit) {
      dom.formName.value = edit.name || '';
      dom.formEmail.value = edit.email || '';
      dom.formPhone.value = edit.phone || '';
      dom.formCompany.value = edit.company || '';
      dom.formSave.dataset.editId = edit.id;
    } else {
      dom.formName.value = '';
      dom.formEmail.value = '';
      dom.formPhone.value = '';
      dom.formCompany.value = '';
      delete dom.formSave.dataset.editId;
    }
  }

  function hideForm() {
    dom.form.style.display = 'none';
    dom.detail.style.display = 'block';
  }

  // Wiring
  function bindUI() {
    dom = {
      search: document.getElementById('crm-search'),
      list: document.getElementById('crm-contacts-list'),
      detailName: document.getElementById('crm-detail-name'),
      detailMeta: document.getElementById('crm-detail-meta'),
      detailInteractions: document.getElementById('crm-detail-interactions'),
      btnNew: document.getElementById('crm-btn-new'),
      btnExport: document.getElementById('crm-btn-export'),
      form: document.getElementById('crm-form'),
      formEl: document.getElementById('crm-form-el'),
      formTitle: document.getElementById('crm-form-title'),
      formName: document.getElementById('crm-form-name'),
      formEmail: document.getElementById('crm-form-email'),
      formPhone: document.getElementById('crm-form-phone'),
      formCompany: document.getElementById('crm-form-company'),
      formSave: document.getElementById('crm-form-save'),
      formCancel: document.getElementById('crm-form-cancel'),
      detail: document.getElementById('crm-detail')
    };

    handlers.push({ el: dom.search, ev: 'input', fn: (e) => renderList(e.target.value) });
    dom.search.addEventListener('input', handlers[handlers.length-1].fn);

    handlers.push({ el: dom.btnNew, ev: 'click', fn: () => showForm(null) });
    dom.btnNew.addEventListener('click', handlers[handlers.length-1].fn);

    handlers.push({ el: dom.btnExport, ev: 'click', fn: () => exportCSV() });
    dom.btnExport.addEventListener('click', handlers[handlers.length-1].fn);

    handlers.push({ el: dom.formEl, ev: 'submit', fn: (ev) => {
      ev.preventDefault();
      const editId = dom.formSave.dataset.editId;
      const payload = { name: dom.formName.value.trim(), email: dom.formEmail.value.trim(), phone: dom.formPhone.value.trim(), company: dom.formCompany.value.trim() };
      if (editId) { updateContact(editId, payload); alert('Contacto actualizado'); } else { createContact(payload); alert('Contacto creado'); }
      hideForm();
    }});
    dom.formEl.addEventListener('submit', handlers[handlers.length-1].fn);

    handlers.push({ el: dom.formCancel, ev: 'click', fn: (e) => { e.preventDefault(); hideForm(); }});
    dom.formCancel.addEventListener('click', handlers[handlers.length-1].fn);

    // initial render
    renderList();
  }

  function unbindUI() {
    handlers.forEach(h => {
      try { h.el.removeEventListener(h.ev, h.fn); } catch(e) {}
    });
    handlers = [];
  }

  function exportCSV(filename = 'contacts.csv') {
    const rows = ['id,name,email,phone,company,createdAt'];
    state.contacts.forEach(c => rows.push([c.id, `"${(c.name||'').replace(/"/g,'""')}"`, c.email || '', c.phone || '', `"${(c.company||'').replace(/"/g,'""')}"`, c.createdAt].join(',')));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // Public API
  window.crmAPI = window.crmAPI || {};
  window.crmAPI.init = async function init(params = {}) {
    if (mounted) return;
    load();
    bindUI();
    mounted = true;
    // Prepopulate demo if empty
    if (!state.contacts.length) {
      state.contacts.push({ id: genId('c'), name: 'María Pérez', email: 'maria@example.com', phone: '+34 600 000 001', company: 'Acme', createdAt: nowIso(), updatedAt: nowIso() });
      save();
      renderList();
    }
    return true;
  };

  window.crmAPI.destroy = function destroy() {
    if (!mounted) return;
    unbindUI();
    mounted = false;
    document.getElementById('app-root')?.querySelector('.module-crm')?.remove();
  };

  // expose small utilities
  window.crmAPI.createContact = createContact;
  window.crmAPI.updateContact = updateContact;
  window.crmAPI.deleteContact = deleteContact;
  window.crmAPI.exportCSV = exportCSV;
})();
