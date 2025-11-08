// contacts.js — módulo de Contactos (CRUD, búsqueda, paginado) usando DC_Storage
(function () {
  function $id(id){ return document.getElementById(id); }
  const PAGE_SIZE = 10;
  let page = 1;
  let allContacts = [];

  function loadContacts(){
    allContacts = DC_Storage.get('contacts', []) || [];
  }

  function renderTable(q='', stage=''){
    const tbody = $id('contacts-tbody');
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
            <button class="btn tiny danger delete" data-id="${c.id}">Eliminar</button>
          </td>`;
        tbody.appendChild(tr);
      });
    }
    renderPagination(total, pages);
  }

  function renderPagination(total, pages){
    const wrap = $id('contacts-pagination');
    wrap.innerHTML = '';
    if (pages <= 1) return;
    for (let i=1;i<=pages;i++){
      const b = document.createElement('button');
      b.className = 'btn tiny' + (i===page?' active':'');
      b.textContent = i;
      b.addEventListener('click', () => { page = i; renderTable($id('global-q').value, $id('global-stage').value); });
      wrap.appendChild(b);
    }
  }

  // Modal handlers (mejorados)
  function openModal(editId){
    const modal = $id('modal-root');
    // populate fields
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

    // show modal and lock scroll
    modal.classList.remove('hidden');
    document.body.classList.add('dc-modal-open');

    // focus first input
    setTimeout(() => {
      const first = $id('m-name');
      if (first) first.focus();
    }, 60);

    // attach overlay click handler (close when clicking outside modal content)
    if (!modal._overlayHandler) {
      modal._overlayHandler = function (ev) {
        // if clicked directly on the overlay (not inside the modal box)
        if (ev.target === modal) {
          closeModal();
        }
      };
      modal.addEventListener('click', modal._overlayHandler);
    }

    // attach ESC key handler
    if (!modal._escHandler) {
      modal._escHandler = function (ev) {
        if (ev.key === 'Escape' || ev.key === 'Esc') {
          closeModal();
        }
      };
      document.addEventListener('keydown', modal._escHandler);
    }
  }

  function closeModal(){
    const modal = $id('modal-root');
    if (!modal) return;
    modal.classList.add('hidden');
    // clear editing state
    modal._editing = null;
    // unlock scroll
    document.body.classList.remove('dc-modal-open');
    // remove temporary handlers (we keep them attached but safe to remove)
    if (modal._overlayHandler) {
      modal.removeEventListener('click', modal._overlayHandler);
      modal._overlayHandler = null;
    }
    if (modal._escHandler) {
      document.removeEventListener('keydown', modal._escHandler);
      modal._escHandler = null;
    }
  }

  function saveModal(){
    const modal = $id('modal-root');
    const id = modal._editing || ('c_' + Date.now());
    const obj = {
      id,
      name: $id('m-name').value,
      email: $id('m-email').value,
      tel: $id('m-tel').value,
      company: $id('m-company').value,
      stage: $id('m-stage').value,
      createdAt: modal._editing ? (allContacts.find(x=>x.id===id).createdAt) : new Date().toISOString()
    };
    const idx = allContacts.findIndex(x=>x.id===id);
    if (idx >= 0) allContacts[idx] = obj;
    else allContacts.unshift(obj);
    DC_Storage.set('contacts', allContacts);
    closeModal();
    renderTable($id('global-q').value, $id('global-stage').value);
  }

  function deleteContact(id){
    if (!confirm('Eliminar contacto?')) return;
    allContacts = allContacts.filter(c => c.id !== id);
    DC_Storage.set('contacts', allContacts);
    renderTable($id('global-q').value, $id('global-stage').value);
  }

  // Events wiring
  window.addEventListener('load', () => {
    loadContacts();
    renderTable();

    // global filters
    $id('global-filter').addEventListener('click', () => { page = 1; renderTable($id('global-q').value, $id('global-stage').value); });
    $id('global-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { page = 1; renderTable($id('global-q').value, $id('global-stage').value); } });

    // New contact
    window.addEventListener('contacts.openNew', () => openModal(null));
    $id('btn-new-contact').addEventListener('click', () => openModal(null));

    // Modal buttons
    $id('m-cancel').addEventListener('click', closeModal);
    $id('m-save').addEventListener('click', saveModal);

    // table action delegation
    document.getElementById('contacts-table').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (btn.classList.contains('edit')) openModal(id);
      if (btn.classList.contains('delete')) deleteContact(id);
    });

    // listen storage changes
    window.addEventListener('dataconecta.change', (e) => {
      if (e.detail && e.detail.key === 'contacts') { loadContacts(); renderTable($id('global-q').value, $id('global-stage').value); }
    });
  });

})();
