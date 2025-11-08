// Frontend administrativo mínimo (lista contactos, detalle, analytics)
(async function () {
  const qs = sel => document.querySelector(sel);
  const contactsListEl = qs('#contacts-list');
  const contactDetailEl = qs('#contact-detail');
  const analyticsSummaryEl = qs('#analytics-summary');
  const analyticsEventsEl = qs('#analytics-events');

  qs('#btn-refresh').addEventListener('click', () => loadAll());
  qs('#btn-search').addEventListener('click', () => {
    const email = qs('#search-email').value.trim();
    if (email) searchContactByEmail(email);
  });

  async function fetchJson(url, opts = {}) {
    try {
      const r = await fetch(url, opts);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      console.error('fetch error', url, e);
      return { ok: false, error: e.message };
    }
  }

  function formatDate(ts) {
    try {
      return new Date(ts + 'Z').toLocaleString();
    } catch { return ts; }
  }

  async function loadContacts() {
    contactsListEl.innerHTML = 'Cargando contactos...';
    const res = await fetchJson('/api/contacts');
    if (!res.ok) {
      contactsListEl.innerText = 'Error cargando contactos: ' + (res.error || 'unknown');
      return;
    }
    const rows = res.contacts || [];
    if (!rows.length) {
      contactsListEl.innerText = 'No hay contactos.';
      return;
    }
    contactsListEl.innerHTML = '';
    rows.forEach(c => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `<strong>${escapeHtml(c.email)}</strong>
        <div class="meta">${escapeHtml(c.name || '')} · creado: ${formatDate(c.created_at)}</div>`;
      div.addEventListener('click', () => loadContactDetail(c.id));
      contactsListEl.appendChild(div);
    });
  }

  async function loadContactDetail(id) {
    contactDetailEl.innerHTML = 'Cargando actividades...';
    const res = await fetchJson(`/api/contacts/${id}/activities`);
    if (!res.ok) {
      contactDetailEl.innerText = 'Error: ' + (res.error || 'unknown');
      return;
    }
    const activities = res.activities || [];
    const header = document.createElement('div');
    header.innerHTML = `<div class="small">Actividades (${activities.length})</div>`;
    const list = document.createElement('div');
    activities.forEach(a => {
      const d = document.createElement('div');
      d.className = 'activity';
      d.innerHTML = `<div><strong>${escapeHtml(a.type || 'actividad')}</strong> <span class="small">· ${formatDate(a.created_at)}</span></div>
        <div class="small">${escapeHtml(a.title || '')}</div>
        <pre>${escapeHtml(a.snippet || (a.payload || '').slice(0, 400) || '')}</pre>`;
      list.appendChild(d);
    });
    contactDetailEl.innerHTML = '';
    contactDetailEl.appendChild(header);
    contactDetailEl.appendChild(list);
  }

  async function searchContactByEmail(email) {
    contactDetailEl.innerHTML = 'Buscando contacto...';
    const res = await fetchJson(`/api/contacts?email=${encodeURIComponent(email)}`);
    if (!res.ok) {
      contactDetailEl.innerText = 'Error: ' + (res.error || 'unknown');
      return;
    }
    const contact = res.contact;
    if (!contact) {
      contactDetailEl.innerText = 'No encontrado: ' + email;
      return;
    }
    // show basic info and activities
    contactDetailEl.innerHTML = `<div><strong>${escapeHtml(contact.email)}</strong> <div class="small">${escapeHtml(contact.name || '')}</div></div>`;
    await loadContactDetail(contact.id);
  }

  async function loadAnalyticsSummary() {
    analyticsSummaryEl.innerHTML = 'Cargando resumen...';
    const res = await fetchJson('/api/analytics/summary');
    if (!res.ok) {
      analyticsSummaryEl.innerText = 'Error: ' + (res.error || 'unknown');
      return;
    }
    const rows = res.summary || [];
    if (!rows.length) {
      analyticsSummaryEl.innerText = 'No hay eventos.';
      return;
    }
    const table = document.createElement('table');
    table.style.width = '100%';
    table.innerHTML = `<thead><tr><th>Evento</th><th>Conteo</th></tr></thead>`;
    const tbody = document.createElement('tbody');
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(r.event_name)}</td><td style="text-align:right">${r.count}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    analyticsSummaryEl.innerHTML = '';
    analyticsSummaryEl.appendChild(table);
  }

  async function loadAnalyticsEvents() {
    analyticsEventsEl.innerHTML = 'Cargando eventos...';
    const res = await fetchJson('/api/analytics/events?limit=100');
    if (!res.ok) {
      analyticsEventsEl.innerText = 'Error: ' + (res.error || 'unknown');
      return;
    }
    const rows = res.events || [];
    if (!rows.length) {
      analyticsEventsEl.innerText = 'Sin eventos recientes.';
      return;
    }
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    rows.forEach(ev => {
      const r = document.createElement('div');
      r.className = 'activity';
      const payload = tryParse(ev.payload);
      r.innerHTML = `<div><strong>${escapeHtml(ev.event_name)}</strong> <span class="small">· ${formatDate(ev.created_at)}</span></div>
        <div class="small">client_id: ${escapeHtml(ev.client_id || '')} • crm_contact_id: ${escapeHtml(ev.crm_contact_id || '')}</div>
        <pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`;
      container.appendChild(r);
    });
    analyticsEventsEl.innerHTML = '';
    analyticsEventsEl.appendChild(container);
  }

  function tryParse(s) {
    if (!s) return {};
    try { return JSON.parse(s); } catch { return s; }
  }

  function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function loadAll() {
    await Promise.all([loadContacts(), loadAnalyticsSummary(), loadAnalyticsEvents()]);
  }

  // Inicializar
  loadAll();
})();
