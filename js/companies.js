// companies.js — CRUD simple
(function () {
  function $id(id){ return document.getElementById(id); }
  let allCompanies = [];

  function load(){ allCompanies = DC_Storage.get('companies', []) || []; render(); }

  function render(){
    const tb = $id('companies-tbody');
    if (!tb) return;
    tb.innerHTML = '';
    if (!allCompanies.length) { tb.innerHTML = '<tr><td colspan="4" class="muted">Sin empresas</td></tr>'; return; }
    allCompanies.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${c.name||''}</td><td>${c.domain||''}</td><td>${c.revenue ? '$'+c.revenue.toLocaleString() : ''}</td>
        <td><button class="btn tiny edit" data-id="${c.id}">Editar</button><button class="btn tiny danger delete" data-id="${c.id}">Eliminar</button></td>`;
      tb.appendChild(tr);
    });
  }

  function openNew(){
    const name = prompt('Nombre empresa:');
    if (!name) return;
    const obj = { id:'co_' + Date.now(), name, domain: (name||'').toLowerCase().replace(/\s+/g,''), revenue:0 };
    allCompanies.unshift(obj);
    DC_Storage.set('companies', allCompanies);
    render();
  }

  function deleteOne(id){
    if (!confirm('Eliminar empresa?')) return;
    allCompanies = allCompanies.filter(c => c.id !== id);
    DC_Storage.set('companies', allCompanies);
    render();
  }

  window.addEventListener('load', () => {
    load();
    const btnNew = $id('btn-new-company');
    if (btnNew) btnNew.addEventListener('click', openNew);
    const tb = $id('companies-table');
    if (tb) tb.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (btn.classList.contains('delete')) deleteOne(id);
      if (btn.classList.contains('edit')) {
        const c = allCompanies.find(x=>x.id===id);
        if (!c) return;
        const name = prompt('Editar nombre', c.name);
        if (!name) return;
        c.name = name; DC_Storage.set('companies', allCompanies); render();
      }
    });

    window.addEventListener('dataconecta.change', (e) => { if (e.detail && e.detail.key === 'companies') load(); });
  });
})();
