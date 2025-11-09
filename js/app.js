(function () {
  function $id(id){ return document.getElementById(id); }
  const routes = {
    '/contacts': () => showView('view-contacts','Contactos'),
    '/companies': () => showView('view-companies','Empresas'),
    '/deals': () => showView('view-deals','Ventas'),
    '/communications': () => showView('view-communications','Comunicaciones'),
    '/dashboard': () => showView('view-dashboard','Dashboard'),
    '/editor': () => showView('view-editor','Editor'),
    '/analytics': () => showView('view-analytics','Analítica'),
    '/settings': () => showView('view-settings','Ajustes'),
    '': () => showView('view-contacts','Contactos')
  };

  function showView(id,title){
    document.querySelectorAll('.view-panel').forEach(el => el.classList.add('hidden'));
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
    const titleEl = $id('page-title');
    if (titleEl) titleEl.textContent = title;
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    const currentHash = location.hash.replace(/^#\/?, '') || 'contacts';
    const link = Array.from(document.querySelectorAll('.sidebar a')).find(a => a.getAttribute('href') === '#/' + currentHash);
    if (link) link.classList.add('active');
  }

  function router(){
    const hash = location.hash.replace(/^#\/?, '');
    const route = '/' + (hash.split('?')[0] || '');
    (routes[route] || routes['']).call();
  }

  function safeOn(el, ev, fn){ if (!el) return; el.addEventListener(ev, fn); }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-route]').forEach(a => {
      if (!a) return;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const href = a.getAttribute('href') || '#/contacts';
        location.hash = href.replace(/^#/, '');
      });
    });

    window.addEventListener('hashchange', router);

    safeOn($id('btn-new-contact'), 'click', () => window.dispatchEvent(new CustomEvent('contacts.openNew')));
    safeOn($id('btn-seed'), 'click', () => { DC_Storage.seedDemo(); window.location.reload(); });
    safeOn($id('btn-clear'), 'click', () => { if (confirm('Borrar datos demo?')) { localStorage.clear(); location.reload(); }});

    safeOn($id('btn-export-json'), 'click', () => {
      try {
        const data = DC_Storage.exportAll();
        const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'dataconecta-export.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      } catch (err) { console.error(err); alert('Error exportando'); }
    });

    safeOn($id('btn-import-json'), 'click', () => { const f = $id('file-import'); if (f) f.click(); });
    const fileImport = $id('file-import');
    if (fileImport) {
      fileImport.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => { try { DC_Storage.importAll(r.result); alert('Import OK'); location.reload(); } catch(err){ alert('Import error: ' + err.message); } };
        r.readAsText(f);
      });
    }

    router();
  });

  window.DC_App = { router };
})();