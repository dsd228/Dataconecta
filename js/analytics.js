// Analytics conectado a localStorage (más robusto).
// Busca claves comunes para contactos y deals, parsea fechas flexiblemente,
// calcula KPIs reales y dibuja charts con Chart.js.
// Espera objetos tipo:
// contact: {id, name, email, createdAt | created | timestamp}
// deal: {id, contactId, amount, stage, createdAt, closedAt, won}
// Si no encuentra datos muestra un mensaje y puede dibujar demo.

(function () {
  // — Utilities
  const CONTACT_KEYS_CANDIDATES = ['dataconecta-contacts','contacts','contacts_list','dc_contacts'];
  const DEAL_KEYS_CANDIDATES = ['dataconecta-deals','deals','opportunities','dc_deals'];

  function tryParseJSON(raw) {
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function readKey(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = tryParseJSON(raw);
      if (Array.isArray(parsed)) return parsed;
      return null;
    } catch (e) { return null; }
  }

  function findFirstNonEmpty(keys) {
    for (const k of keys) {
      const v = readKey(k);
      if (v && v.length) return { key: k, data: v };
    }
    return null;
  }

  function parseDateFlexible(val) {
    if (!val && val !== 0) return null;
    // number -> timestamp (ms or s)
    if (typeof val === 'number') {
      // if seconds (10 digits) convert to ms
      if (val < 1e12) val = val * 1000;
      return new Date(val);
    }
    // string
    if (typeof val === 'string') {
      // iso-like
      const maybe = new Date(val);
      if (!isNaN(maybe)) return maybe;
      // try parse integer
      const n = Number(val);
      if (!isNaN(n)) {
        if (n < 1e12) return new Date(n * 1000);
        return new Date(n);
      }
    }
    return null;
  }

  function safeParseItemDate(item, possibleFields = ['createdAt','created','timestamp','date']) {
    for (const f of possibleFields) {
      if (item[f]) {
        const d = parseDateFlexible(item[f]);
        if (d) return d;
      }
    }
    // try any field that looks like date
    for (const k of Object.keys(item)) {
      if (k.toLowerCase().includes('date') || k.toLowerCase().includes('at') || k.toLowerCase().includes('time')) {
        const d = parseDateFlexible(item[k]);
        if (d) return d;
      }
    }
    return null;
  }

  function formatISODate(d) {
    return d.toISOString().slice(0,10);
  }

  // — Data loader
  function loadData() {
    const contactsEntry = findFirstNonEmpty(CONTACT_KEYS_CANDIDATES);
    const dealsEntry = findFirstNonEmpty(DEAL_KEYS_CANDIDATES);
    const contacts = contactsEntry ? contactsEntry.data : [];
    const deals = dealsEntry ? dealsEntry.data : [];
    return {
      contacts, contactsKey: contactsEntry ? contactsEntry.key : null,
      deals, dealsKey: dealsEntry ? dealsEntry.key : null
    };
  }

  // — Filtering and series builders
  function clampDates(fromISO, toISO) {
    const from = fromISO ? new Date(fromISO) : null;
    const to = toISO ? new Date(toISO) : null;
    return { from, to };
  }

  function buildEmptyDayMap(startDate, endDate) {
    const map = {};
    const labels = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = formatISODate(new Date(d));
      map[key] = 0;
      labels.push(key);
    }
    return { map, labels };
  }

  function buildSeriesByDay(items, dateFieldCandidates, fromISO, toISO) {
    const { from, to } = clampDates(fromISO, toISO);
    const end = to || new Date();
    const start = from || new Date(Date.now() - 29 * 24*60*60*1000);
    const { map, labels } = buildEmptyDayMap(new Date(start), new Date(end));
    items.forEach(it => {
      const d = safeParseItemDate(it, dateFieldCandidates);
      if (!d) return;
      const key = formatISODate(d);
      if (key in map) map[key] += 1;
    });
    const series = labels.map(l => map[l] || 0);
    return { labels, series, map };
  }

  function buildRevenueSeries(deals, fromISO, toISO) {
    const { from, to } = clampDates(fromISO, toISO);
    const end = to || new Date();
    const start = from || new Date(Date.now() - 29 * 24*60*60*1000);
    const { map, labels } = buildEmptyDayMap(new Date(start), new Date(end));
    deals.forEach(d => {
      if (!d) return;
      // consider only won deals when computing revenue by close date, fallback to created date
      const closed = safeParseItemDate(d, ['closedAt','closed_at','closed','closedAtDate']);
      const created = safeParseItemDate(d, ['createdAt','created','timestamp']);
      const dateRef = closed || created;
      if (!dateRef) return;
      const key = formatISODate(dateRef);
      if (!(key in map)) return;
      const amount = Number(d.amount || d.value || d.total || 0) || 0;
      // if deal has a won flag, prefer it; otherwise include it but mark later
      const won = d.won === true || String(d.stage || '').toLowerCase().includes('won') || String(d.stage || '').toLowerCase().includes('closed');
      map[key] += won ? amount : 0;
    });
    const series = labels.map(l => map[l] || 0);
    return { labels, series };
  }

  // — KPIs
  function computeKPIs(contacts, deals, fromISO, toISO) {
    const { from, to } = clampDates(fromISO, toISO);
    const contactsInRange = contacts.filter(c => {
      const d = safeParseItemDate(c);
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
    const dealsInRange = deals.filter(d => {
      const dCreated = safeParseItemDate(d, ['createdAt','created']);
      if (!dCreated) return false;
      if (from && dCreated < from) return false;
      if (to && dCreated > to) return false;
      return true;
    });
    const wonDeals = deals.filter(d => {
      const closed = safeParseItemDate(d, ['closedAt','closed_at','closed']);
      if (!closed) return false;
      if (from && closed < from) return false;
      if (to && closed > to) return false;
      const won = d.won === true || String(d.stage || '').toLowerCase().includes('won') || String(d.stage || '').toLowerCase().includes('closed');
      return !!won;
    });
    const revenue = wonDeals.reduce((s,d) => s + (Number(d.amount || d.value || d.total) || 0), 0);
    const conversionRate = dealsInRange.length ? Math.round((wonDeals.length / dealsInRange.length) * 10000) / 100 : 0;
    return {
      contactsCount: contactsInRange.length,
      dealsCount: dealsInRange.length,
      wonDeals: wonDeals.length,
      revenue,
      conversionRate
    };
  }

  // — Charts (global refs)
  let chartSessions, chartConversions, chartRevenue, chartDevices;

  function safeDestroy(ch) { if (ch && ch.destroy) ch.destroy(); }

  function drawCharts(contacts, deals, fromISO, toISO) {
    const sessionsSeries = buildSeriesByDay(contacts, ['createdAt','created','timestamp'], fromISO, toISO);
    const dealsSeries = buildSeriesByDay(deals, ['createdAt','created','timestamp'], fromISO, toISO);
    const revenueSeries = buildRevenueSeries(deals, fromISO, toISO);

    // Sessions
    safeDestroy(chartSessions);
    const c1 = document.getElementById('chart-sessions').getContext('2d');
    chartSessions = new Chart(c1, {
      type: 'line',
      data: { labels: sessionsSeries.labels, datasets: [{ label: 'Nuevos contactos', data: sessionsSeries.series, borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,0.08)', fill:true, tension:0.3 }] },
      options: { responsive:true, plugins:{legend:{display:false}} }
    });

    // Conversions (deals)
    safeDestroy(chartConversions);
    const c2 = document.getElementById('chart-conversions-full').getContext('2d');
    chartConversions = new Chart(c2, {
      type: 'bar',
      data: { labels: dealsSeries.labels, datasets: [{ label: 'Oportunidades creadas', data: dealsSeries.series, backgroundColor:'#10b981' }] },
      options: { responsive:true, plugins:{legend:{display:false}} }
    });

    // Revenue
    safeDestroy(chartRevenue);
    const c3 = document.getElementById('chart-revenue-full').getContext('2d');
    chartRevenue = new Chart(c3, {
      type: 'line',
      data: { labels: revenueSeries.labels, datasets: [{ label:'Ingresos (won)', data: revenueSeries.series, borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,0.07)', fill:true, tension:0.25 }] },
      options: { responsive:true, plugins:{legend:{display:false}} }
    });

    // Devices (simulated distribution) — you can later replace by source field
    safeDestroy(chartDevices);
    const c4 = document.getElementById('chart-devices').getContext('2d');
    const desktop = Math.max(5, Math.round(sessionsSeries.series.reduce((a,b)=>a+b,0) * 0.6));
    const mobile = Math.max(3, Math.round(sessionsSeries.series.reduce((a,b)=>a+b,0) * 0.3));
    const tablet = Math.max(1, Math.round(sessionsSeries.series.reduce((a,b)=>a+b,0) * 0.1));
    chartDevices = new Chart(c4, {
      type: 'doughnut',
      data: { labels:['Desktop','Mobile','Tablet'], datasets:[{ data:[desktop,mobile,tablet], backgroundColor:['#2563eb','#f59e0b','#ef4444'] }] },
      options: { responsive:true, plugins:{legend:{position:'bottom'}} }
    });
  }

  // — Details table render
  function renderDetailsTable(contacts, deals, fromISO, toISO) {
    const tbody = document.getElementById('details-tbody');
    tbody.innerHTML = '';
    // merge events: contacts created + deals created + deals won
    const rows = [];
    contacts.forEach(c => {
      const d = safeParseItemDate(c) || new Date();
      const iso = formatISODate(d);
      rows.push({ type: 'contact', name: c.name || c.fullname || c.email || '—', date: iso, rawDate: d, amount: '' });
    });
    deals.forEach(d => {
      const created = safeParseItemDate(d, ['createdAt','created','timestamp']) || new Date();
      const closed = safeParseItemDate(d, ['closedAt','closed_at','closed']);
      const won = d.won === true || String(d.stage||'').toLowerCase().includes('won') || String(d.stage||'').toLowerCase().includes('closed');
      rows.push({ type: 'deal', name: d.title || d.name || ('Deal #' + (d.id||'')), date: formatISODate(created), rawDate: created, amount: won ? (Number(d.amount||d.value||d.total)||0) : '' });
    });

    // apply date filter
    const { from, to } = clampDates(fromISO, toISO);
    const filtered = rows.filter(r => {
      const d = r.rawDate;
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });

    // sort desc by date
    filtered.sort((a,b) => b.rawDate - a.rawDate);

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="small">No hay eventos para el rango seleccionado</td></tr>';
      return;
    }

    filtered.forEach(r => {
      const tr = document.createElement('tr');
      const tdType = document.createElement('td'); tdType.textContent = (r.type === 'contact') ? 'Contacto' : 'Deal';
      const tdName = document.createElement('td'); tdName.textContent = r.name;
      const tdDate = document.createElement('td'); tdDate.textContent = r.date;
      const tdAmount = document.createElement('td'); tdAmount.textContent = r.amount ? ('$' + Number(r.amount).toLocaleString()) : '';
      tr.appendChild(tdType); tr.appendChild(tdName); tr.appendChild(tdDate); tr.appendChild(tdAmount);
      tbody.appendChild(tr);
    });
  }

  // — CSV Export
  function exportCSVFromData(name, items) {
    if (!items || !items.length) return alert('No hay datos para exportar: ' + name);
    const keys = Array.from(items.reduce((acc,it) => {
      Object.keys(it).forEach(k => acc.add(k));
      return acc;
    }, new Set()));
    const lines = [keys.join(',')].concat(items.map(r => keys.map(k => `"${String(r[k]||'').replace(/"/g,'""')}"`).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `dataconecta-${name}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // — UI wiring
  function refreshUI() {
    const fromISO = document.getElementById('from').value || '';
    const toISO = document.getElementById('to').value || '';
    const { contacts, deals, contactsKey, dealsKey } = loadData();
    // if no keys found, show helpful message
    if ((!contacts || !contacts.length) && (!deals || !deals.length)) {
      // show "no data" in KPIs and draw demo charts
      document.getElementById('kpi-contacts').textContent = '0';
      document.getElementById('kpi-deals').textContent = '0';
      document.getElementById('kpi-revenue').textContent = '$0';
      document.getElementById('kpi-conv').textContent = '0%';
      // draw demo (random) if desired
      drawCharts([], [], fromISO, toISO);
      const tbody = document.getElementById('details-tbody');
      tbody.innerHTML = '<tr><td colspan="4" class="small">No se detectaron datos en localStorage. Claves buscadas: ' + CONTACT_KEYS_CANDIDATES.join(', ') + ' / ' + DEAL_KEYS_CANDIDATES.join(', ') + '</td></tr>';
      return;
    }

    const kpis = computeKPIs(contacts, deals, fromISO, toISO);
    document.getElementById('kpi-contacts').textContent = kpis.contactsCount;
    document.getElementById('kpi-deals').textContent = kpis.dealsCount;
    document.getElementById('kpi-revenue').textContent = '$' + kpis.revenue.toLocaleString();
    document.getElementById('kpi-conv').textContent = kpis.conversionRate + '%';

    drawCharts(contacts, deals, fromISO, toISO);
    renderDetailsTable(contacts, deals, fromISO, toISO);
  }

  document.getElementById('btn-refresh').addEventListener('click', refreshUI);
  document.getElementById('btn-export-contacts').addEventListener('click', () => {
    const chosen = findFirstNonEmpty(CONTACT_KEYS_CANDIDATES);
    if (!chosen) return alert('No se encontraron contactos para exportar (localStorage).');
    exportCSVFromData('contacts', chosen.data);
  });
  document.getElementById('btn-export-deals').addEventListener('click', () => {
    const chosen = findFirstNonEmpty(DEAL_KEYS_CANDIDATES);
    if (!chosen) return alert('No se encontraron deals para exportar (localStorage).');
    exportCSVFromData('deals', chosen.data);
  });

  // set defaults and init
  (function setDefaultDates() {
    const to = new Date();
    const from = new Date(); from.setDate(to.getDate() - 29);
    document.getElementById('to').value = to.toISOString().slice(0,10);
    document.getElementById('from').value = from.toISOString().slice(0,10);
  })();

  window.addEventListener('load', refreshUI);
})();
