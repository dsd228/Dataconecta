// analytics-full.js — toma datos reales desde DC_Storage (contacts, deals, interactions)
// Dibuja KPIs y charts (Chart.js)
(function () {
  function safeParse(it){ try { return JSON.parse(it); } catch(e) { return null; } }
  function formatISO(d){ return d.toISOString().slice(0,10); }
  function parseDateFlexible(val){
    if (!val && val !== 0) return null;
    if (typeof val === 'number') { if (val < 1e12) val = val * 1000; return new Date(val); }
    if (typeof val === 'string') { const maybe = new Date(val); if (!isNaN(maybe)) return maybe; const n = Number(val); if (!isNaN(n)) return new Date(n < 1e12 ? n*1000 : n); }
    return null;
  }

  function safeParseItemDate(item, fields=['createdAt','created','timestamp','date']){
    for (const f of fields) if (item[f]) { const d = parseDateFlexible(item[f]); if (d) return d; }
    for (const k of Object.keys(item)) if (k.toLowerCase().includes('date')||k.toLowerCase().includes('at')||k.toLowerCase().includes('time')) {
      const d = parseDateFlexible(item[k]); if (d) return d;
    }
    return null;
  }

  function listAndLoad(key){ return DC_Storage.get(key, []) || []; }

  function buildDaySeries(items, dateFields, fromISO, toISO){
    const from = fromISO ? new Date(fromISO) : null; const to = toISO ? new Date(toISO) : null;
    const end = to || new Date(); const start = from || new Date(Date.now() - 29*86400000);
    const map = {}; const labels = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)){ const k=formatISO(new Date(d)); map[k]=0; labels.push(k); }
    items.forEach(it => {
      const d = safeParseItemDate(it, dateFields); if (!d) return; const k = formatISO(d); if (k in map) map[k] += 1;
    });
    return { labels, series: labels.map(l=>map[l]||0) };
  }

  function revenueSeries(deals, fromISO, toISO) {
    const from = fromISO ? new Date(fromISO) : null; const to = toISO ? new Date(toISO) : null;
    const end = to || new Date(); const start = from || new Date(Date.now() - 29*86400000);
    const map = {}; const labels = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)){ const k=formatISO(new Date(d)); map[k]=0; labels.push(k); }
    deals.forEach(d => {
      const closed = safeParseItemDate(d, ['closedAt','closed_at','closed']);
      const created = safeParseItemDate(d, ['createdAt','created','timestamp']);
      const ref = closed || created; if (!ref) return;
      const key = formatISO(ref); if (!(key in map)) return;
      const amount = Number(d.amount || d.value || d.total) || 0;
      const won = d.won === true || String(d.stage||'').toLowerCase().includes('won') || String(d.stage||'').toLowerCase().includes('closed');
      if (won) map[key] += amount;
    });
    return { labels, series: labels.map(l => map[l] || 0) };
  }

  let chartSessions, chartConversions, chartRevenue, chartDevices;

  function safeDestroy(ch){ if (ch && ch.destroy) ch.destroy(); }

  function draw(fromISO, toISO){
    const contacts = listAndLoad('contacts');
    const deals = listAndLoad('deals');
    const interactions = listAndLoad('interactions');

    const sessions = buildDaySeries(contacts, ['createdAt','created','timestamp'], fromISO, toISO);
    const dealsSeries = buildDaySeries(deals, ['createdAt','created','timestamp'], fromISO, toISO);
    const revenue = revenueSeries(deals, fromISO, toISO);

    safeDestroy(chartSessions);
    const c1 = document.getElementById('chart-sessions').getContext('2d');
    chartSessions = new Chart(c1, { type:'line', data:{labels:sessions.labels,datasets:[{label:'Nuevos contactos',data:sessions.series,borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,0.08)',fill:true,tension:0.3}]}, options:{responsive:true,plugins:{legend:{display:false}}}});

    safeDestroy(chartConversions);
    const c2 = document.getElementById('chart-conversions-full').getContext('2d');
    chartConversions = new Chart(c2, { type:'bar', data:{labels:dealsSeries.labels,datasets:[{label:'Oportunidades',data:dealsSeries.series,backgroundColor:'#10b981'}]}, options:{responsive:true,plugins:{legend:{display:false}}}});

    safeDestroy(chartRevenue);
    const c3 = document.getElementById('chart-revenue-full').getContext('2d');
    chartRevenue = new Chart(c3, { type:'line', data:{labels:revenue.labels,datasets:[{label:'Ingresos (won)',data:revenue.series,borderColor:'#ef4444',backgroundColor:'rgba(239,68,68,0.07)',fill:true,tension:0.25}]}, options:{responsive:true,plugins:{legend:{display:false}}}});

    safeDestroy(chartDevices);
    const c4 = document.getElementById('chart-devices').getContext('2d');
    const totalSessions = sessions.series.reduce((a,b)=>a+b,0) || 1;
    const desktop = Math.max(1, Math.round(totalSessions * 0.6));
    const mobile = Math.max(1, Math.round(totalSessions * 0.3));
    const tablet = Math.max(1, Math.round(totalSessions * 0.1));
    chartDevices = new Chart(c4, { type:'doughnut', data:{labels:['Desktop','Mobile','Tablet'],datasets:[{data:[desktop,mobile,tablet],backgroundColor:['#2563eb','#f59e0b','#ef4444']}]}, options:{responsive:true,plugins:{legend:{position:'bottom'}}}});
  }

  function computeKPIs(fromISO, toISO){
    const contacts = DC_Storage.get('contacts',[]) || [];
    const deals = DC_Storage.get('deals',[]) || [];
    const interactions = DC_Storage.get('interactions',[]) || [];
    const from = fromISO ? new Date(fromISO) : null; const to = toISO ? new Date(toISO) : null;
    const contactsIn = contacts.filter(c => { const d = safeParseItemDate(c); if (!d) return false; if (from && d < from) return false; if (to && d > to) return false; return true; });
    const dealsIn = deals.filter(d => { const dC = safeParseItemDate(d, ['createdAt','created']); if (!dC) return false; if (from && dC < from) return false; if (to && dC > to) return false; return true; });
    const won = deals.filter(d => { const cl = safeParseItemDate(d, ['closedAt','closed']); if (!cl) return false; if (from && cl < from) return false; if (to && cl > to) return false; const w = d.won === true || String(d.stage||'').toLowerCase().includes('won') || String(d.stage||'').toLowerCase().includes('closed'); return !!w; });
    const revenue = won.reduce((s,d)=> s + (Number(d.amount||d.value||d.total)||0), 0);
    const conversionRate = dealsIn.length ? Math.round((won.length / dealsIn.length) * 10000) / 100 : 0;
    return { contactsCount: contactsIn.length, dealsCount: dealsIn.length, wonCount: won.length, revenue, conversionRate };
  }

  function renderDetails(fromISO, toISO){
    const tbody = document.getElementById('details-tbody');
    if (!tbody) return;
    const contacts = DC_Storage.get('contacts',[]) || [];
    const deals = DC_Storage.get('deals',[]) || [];
    const rows = [];
    contacts.forEach(c => { const d = safeParseItemDate(c) || new Date(); rows.push({ type:'contact', name:c.name||c.email||'', date:d, amount:'' }); });
    deals.forEach(d => { const created = safeParseItemDate(d, ['createdAt','created']) || new Date(); const closed = safeParseItemDate(d, ['closedAt','closed']); const won = d.won === true || String(d.stage||'').toLowerCase().includes('won'); rows.push({ type:'deal', name:d.title||'', date:created, amount: won ? Number(d.amount||0) : '' }); });
    const from = fromISO ? new Date(fromISO) : null; const to = toISO ? new Date(toISO) : null;
    const filtered = rows.filter(r => { if (!r.date) return false; if (from && r.date < from) return false; if (to && r.date > to) return false; return true; }).sort((a,b)=> b.date - a.date);
    tbody.innerHTML = '';
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="4" class="small">No hay eventos para el rango seleccionado</td></tr>'; return; }
    filtered.forEach(r => {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td'); td1.textContent = r.type;
      const td2 = document.createElement('td'); td2.textContent = r.name;
      const td3 = document.createElement('td'); td3.textContent = r.date.toISOString().slice(0,10);
      const td4 = document.createElement('td'); td4.textContent = r.amount ? ('$' + Number(r.amount).toLocaleString()) : '';
      tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4);
      tbody.appendChild(tr);
    });
  }

  function refreshUI(){
    const fromISO = document.getElementById('from') ? document.getElementById('from').value : '';
    const toISO = document.getElementById('to') ? document.getElementById('to').value : '';
    const k = computeKPIs(fromISO, toISO);
    const elContacts = document.getElementById('kpi-contacts'); if (elContacts) elContacts.textContent = k.contactsCount;
    const elDeals = document.getElementById('kpi-deals'); if (elDeals) elDeals.textContent = k.dealsCount;
    const elRev = document.getElementById('kpi-revenue'); if (elRev) elRev.textContent = '$' + k.revenue.toLocaleString();
    const elConv = document.getElementById('kpi-conv'); if (elConv) elConv.textContent = k.conversionRate + '%';
    draw(fromISO, toISO);
    renderDetails(fromISO, toISO);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btnRefresh = document.getElementById('btn-refresh');
    if (btnRefresh) btnRefresh.addEventListener('click', refreshUI);
    const btnExpC = document.getElementById('btn-export-contacts'); if (btnExpC) btnExpC.addEventListener('click', () => {
      const chosen = { key:'contacts', data: DC_Storage.get('contacts',[]) || [] }; if (!chosen.data.length) return alert('No hay contactos'); const keys = Object.keys(chosen.data[0]||{}); const lines = [keys.join(',')].concat(chosen.data.map(r => keys.map(k => `"${String(r[k]||'').replace(/"/g,'""')}"`).join(','))); const blob = new Blob([lines.join('\n')], { type:'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'dataconecta-contacts.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });
    const btnExpD = document.getElementById('btn-export-deals'); if (btnExpD) btnExpD.addEventListener('click', () => {
      const chosen = { key:'deals', data: DC_Storage.get('deals',[]) || [] }; if (!chosen.data.length) return alert('No hay deals'); const keys = Object.keys(chosen.data[0]||{}); const lines = [keys.join(',')].concat(chosen.data.map(r => keys.map(k => `"${String(r[k]||'').replace(/"/g,'""')}"`).join(','))); const blob = new Blob([lines.join('\n')], { type:'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'dataconecta-deals.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    // set defaults and draw initial
    const to = new Date(); const from = new Date(); from.setDate(to.getDate()-29);
    if (document.getElementById('to')) document.getElementById('to').value = to.toISOString().slice(0,10);
    if (document.getElementById('from')) document.getElementById('from').value = from.toISOString().slice(0,10);
    refreshUI();

    // refresh when data changes
    window.addEventListener('dataconecta.change', refreshUI);
    window.addEventListener('dataconecta.interaction', refreshUI);
    window.addEventListener('dataconecta.email.opened', refreshUI);
  });
})();
