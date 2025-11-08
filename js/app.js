// app.js — router minimal y init global
(function () {
  function $(id){ return document.getElementById(id); }

  const routes = {
    '/contacts': () => showView('view-contacts','Contactos'),
    '/dashboard': () => showView('view-dashboard','Dashboard'),
    '/companies': () => showPlaceholder('Empresas'),
    '/deals': () => showPlaceholder('Deals'),
    '/tasks': () => showPlaceholder('Tareas'),
    '/settings': () => showPlaceholder('Ajustes'),
    '': () => showView('view-contacts','Contactos')
  };

  function showView(id,title){
    document.querySelectorAll('.view-panel').forEach(el => el.classList.add('hidden'));
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
    document.getElementById('page-title').textContent = title;
    // activate sidebar link
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    const link = Array.from(document.querySelectorAll('.sidebar a')).find(a => a.getAttribute('href') === '#/' + (location.hash.slice(2)||'contacts'));
    if (link) link.classList.add('active');
  }

  function showPlaceholder(title){
    showView('view-placeholder', title);
  }

  function router(){
    const hash = location.hash.replace(/^#\/?/, '');
    const route = '/' + (hash.split('?')[0] || '');
    (routes[route] || routes['']).call();
  }

  // Wire nav links
  document.querySelectorAll('[data-route]').forEach(a => a.addEventListener('click', (e) => {
    e.preventDefault();
    location.hash = a.getAttribute('href');
  }));

  window.addEventListener('hashchange', router);
  window.addEventListener('load', () => {
    // bind global actions
    $('#btn-new-contact').addEventListener('click', () => window.dispatchEvent(new CustomEvent('contacts.openNew')));
    $('#btn-seed').addEventListener('click', () => { DC_Storage.seedDemo(); window.location.reload(); });
    $('#btn-clear').addEventListener('click', () => { if (confirm('Borrar datos demo?')) { localStorage.clear(); location.reload(); }});

    // import/export
    $('#btn-export-json').addEventListener('click', () => {
      const data = DC_Storage.exportAll();
      const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'dataconecta-export.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });
    $('#btn-import-json').addEventListener('click', () => $('#file-import').click());
    $('#file-import').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => { try { DC_Storage.importAll(r.result); alert('Import OK'); location.reload(); } catch(err){ alert('Import error: ' + err.message); } };
      r.readAsText(f);
    });

    router();
  });

  // Expose minimal helper
  window.DC_App = { router };

})();
