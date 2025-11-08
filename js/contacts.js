// contacts.js — CRUD, búsqueda, paginado y ficha con timeline (usa interactions)
(function () {
  function $id(id){ return document.getElementById(id); }
  const PAGE_SIZE = 10;
  let page = 1;
  let allContacts = [];

  function loadContacts(){ allContacts = DC_Storage.get('contacts', []) || []; }

  function renderTable(q='', stage=''){
    const tbody = $id('contacts-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let items = allContacts.slice();
    if (q) {
      const ql = q.toLowerCase();
      items = items.filter(c => (c.name||'').toLowerCase().includes(ql) || (c.email||'').toLowerCase().includes(ql) || (c.company||'').toLowerCase().includes(ql));
    }
    if (stage) items = items.filter(c => (c.stage||'') === stage);
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > pages) page = pages;
    const start = (page-1)*PAGE_SIZE;
    const pageItems = items.slice(start, start + PAGE_SIZE);
    if (!pageItems.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="muted">Sin contactos</td></tr>';
    } else {
      pageItems.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${c.name||''}</td><td>${c.email||''}</td><td>${c.tel||''}</td><td>${c.company||''}</td><td>${c.stage||''}</td><td>${(c.createdAt||'').slice(0,10)}</td>
          <td>
            <button class="btn tiny edit" data-id="${c.id}">Editar</button>
            <button class="btn tiny" data-id="${c.id}" data-action="view">Ver</button>
            <button class="btn tiny danger delete" data-id="${c.id}">Eliminar</button>
          </td>`;
        tbody.appendChild(tr);
      });
    }
    renderPagination(total, pages);
  }

  function renderPagination(total, pages){
    const wrap = $id('contacts-pagination');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (pages <= 1) return;
    for (let i=1;i<=pages;i++){
      const b = document.createElement('button');
      b.className = 'btn tiny' + (i===page?' active':'');
      b.textContent = i;
      b.addEventListener('click', () => { page = i; renderTable($id('global-q') ? $id('global-q').value : '', $id('global-stage') ? $id('global-stage').value : ''); });
      wrap.appendChild(b);
    }
  }

  // Modal handlers
  function openModal(editId){
    const modal = $id('modal-root');
    if (!modal) return;
    const modalBox = modal.querySelector('.modal');
    if (!modalBox) return;

    if (editId) {
      const c = allContacts.find(x=>x.id===editId) || {};
      $id('modal-title').textContent = 'Editar contacto';
      $id('m-name').value = c.name || '';
      $id('m-email').value = c.email || '';
      $id('m-tel').value = c.tel || '';
      $id('m-company').value = c.company || '';
      $id('m-stage').value = c.stage || 'Lead';
      modal._editing = editId;
    } else {
      $id('modal-title').textContent = 'Nuevo contacto';
      $id('m-name').value = '';
      $id('m-email').value = '';
      $id('m-tel').value = '';
      $id('m-company').value = '';
      $id('m-stage').value = 'Lead';
      modal._editing = null;
    }

    modal.classList.remove('hidden');
    document.body.classList.add('dc-modal-open');

    setTimeout(() => { const first = $id('m-name'); if (first) first.focus(); }, 60);

    if (!modal._overlayHandler) {
      modal._overlayHandler = function (ev) { if (!modalBox.contains(ev.target)) closeModal(); };
      modal.addEventListener('click', modal._overlayHandler, true);
    }
    if (!modal._escHandler) {
      modal._escHandler = function (ev) { if (ev.key === 'Escape') closeModal(); };
      document.addEventListener('keydown', modal._escHandler);
    }
  }

  function closeModal(){
    const modal = $id('modal-root');
    if (!modal) return;
    modal.classList.add('hidden');
    modal._editing = null;
    document.body.classList.remove('dc-modal-open');
    if (modal._overlayHandler) { modal.removeEventListener('click', modal._overlayHandler, true); modal._overlayHandler = null; }
    if (modal._escHandler) { document.removeEventListener('keydown', modal._escHandler); modal._escHandler = null; }
  }

  function saveModal(){
    const modal = $id('modal-root');
    if (!modal) return;
    const id = modal._editing || ('c_' + Date.now());
    const existing = allContacts.find(x => x.id === id);
    const obj = {
      id,
      name: $id('m-name').value,
      email: $id('m-email').value,
      tel: $id('m-tel').value,
      company: $id('m-company').value,
      stage: $id('m-stage').value,
      createdAt: existing ? existing.createdAt : new Date().toISOString()
    };
    const idx = allContacts.findIndex(x=>x.id===id);
    if (idx >= 0) allContacts[idx] = obj; else allContacts.unshift(obj);
    DC_Storage.set('contacts', allContacts);
    closeModal();
    renderTable($id('global-q') ? $id('global-q').value : '', $id('global-stage') ? $id('global-stage').value : '');
  }

  function deleteContact(id){
    if (!confirm('Eliminar contacto?')) return;
    allContacts = allContacts.filter(c => c.id !== id);
    DC_Storage.set('contacts', allContacts);
    renderTable($id('global-q') ? $id('global-q').value : '', $id('global-stage') ? $id('global-stage').value : '');
  }

  // View contact (profile with timeline)
  function viewContact(id){
    const c = allContacts.find(x=>x.id===id);
    if (!c) return alert('Contacto no encontrado');
    // open a simple modal showing timeline
    const interactions = DC_Storage.get('interactions', []) || [];
    const events = interactions.filter(i => i.contactId === id).sort((a,b)=> new Date(b.timestamp) - new Date(a.timestamp));
    const content = ['<strong>' + (c.name||'') + '</strong><br/><small>' + (c.email||'') + '</small><hr/>'];
    if (!events.length) content.push('<div class="muted">Sin interacciones</div>');
    else events.forEach(ev => content.push(`<div><b>${ev.type}</b> ${ev.subject||''} <div class="small muted">${(new Date(ev.timestamp)).toLocaleString()}</div></div><hr/>`));
    const modal = $id('modal-root');
    if (!modal) return;
    modal.querySelector('.modal').innerHTML = `<h3>${c.name}</h3><div class="modal-body">${content.join('')}</div><div class="modal-actions"><button id="m-close-view" class="btn">Cerrar</button></div>`;
    modal.classList.remove('hidden'); document.body.classList.add('dc-modal-open');
    document.getElementById('m-close-view').addEventListener('click', () => {
      // restore original modal content
      modal.querySelector('.modal').innerHTML = document.querySelector('#modal-root-template').innerHTML;
      closeModal();
    }, { once:true });
  }

  // init and events
  window.addEventListener('load', () => {
    loadContacts();
    renderTable();

    const gFilter = $id('global-filter');
    if (gFilter) gFilter.addEventListener('click', () => { page = 1; renderTable($id('global-q') ? $id('global-q').value : '', $id('global-stage') ? $id('global-stage').value : ''); });
    const gq = $id('global-q');
    if (gq) gq.addEventListener('keydown', (e) => { if (e.key === 'Enter') { page = 1; renderTable(gq.value, $id('global-stage') ? $id('global-stage').value : ''); } });

    window.addEventListener('contacts.openNew', () => openModal(null));
    const newBtn = $id('btn-new-contact');
    if (newBtn) newBtn.addEventListener('click', () => openModal(null));

    const btnCancel = $id('m-cancel');
    if (btnCancel) btnCancel.addEventListener('click', closeModal);
    const btnSave = $id('m-save');
    if (btnSave) btnSave.addEventListener('click', saveModal);

    const contactsTable = $id('contacts-table');
    if (contactsTable) {
      contactsTable.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        if (btn.classList.contains('edit')) openModal(id);
        else if (btn.getAttribute('data-action') === 'view') viewContact(id);
        else if (btn.classList.contains('delete')) deleteContact(id);
      });
    }

    window.addEventListener('dataconecta.change', (e) => {
      if (!e.detail || !e.detail.key) { loadContacts(); renderTable(); return; }
      if (e.detail.key === 'contacts') { loadContacts(); renderTable($id('global-q') ? $id('global-q').value : '', $id('global-stage') ? $id('global-stage').value : ''); }
    });
  });

})();
