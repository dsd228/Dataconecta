/* Router hash mínimo para mostrar las vistas .view-panel por id.
   Añade este archivo y referencia en index.html después de app.js:
   <script src="js/navigation.js" defer></script>
   Garantiza que #/analytics y #/editor muestren sus paneles y no rompa las otras funciones CRM.
*/
(function () {
  function showViewByHash() {
    const hash = location.hash.replace(/^#/, '') || '/dashboard';
    // mapa simple: '#/contacts' -> id 'view-contacts'
    const route = hash.replace(/^\//, '').split('?')[0];
    const targetId = 'view-' + (route || 'dashboard');
    // ocultar todas view-panel y mostrar la que corresponda
    document.querySelectorAll('.view-panel').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(targetId);
    if (target) {
      target.classList.remove('hidden');
      const pageTitle = document.getElementById('page-title');
      if (pageTitle) {
        const titleMap = {
          'dashboard': 'Dashboard',
          'contacts': 'Contactos',
          'companies': 'Empresas',
          'deals': 'Ventas',
          'communications': 'Comunicación',
          'editor': 'Editor',
          'analytics': 'Analítica',
          'settings': 'Ajustes'
        };
        pageTitle.textContent = titleMap[route] || pageTitle.textContent;
      }
    } else {
      // si ruta no encontrada, mostrar placeholder
      const placeholder = document.getElementById('view-placeholder');
      if (placeholder) placeholder.classList.remove('hidden');
    }
  }

  // Enlaces con data-route deben actualizar location.hash
  document.addEventListener('click', function (e) {
    const a = e.target.closest && e.target.closest('[data-route]');
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute('href') || '#/dashboard';
    location.hash = href.replace(/^#/, '');
  });

  window.addEventListener('hashchange', showViewByHash);
  document.addEventListener('DOMContentLoaded', showViewByHash);
})();
