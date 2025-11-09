/* modules/analytics.js
   Corrected module-friendly analytics script exposing analyticsAPI.init/destroy.
   (This mirrors the advanced analytics implementation but wrapped for module lifecycle.)
*/
(function () {
  const EVENTS_KEY = 'analytics:events_v2';
  const USERS_KEY = 'analytics:users_v2';
  const SETTINGS_KEY = 'analytics:settings_v2';

  function genId(p='id'){ return p + '_' + Math.random().toString(36).slice(2,9); }
  function nowIso(){ return new Date().toISOString(); }
  function save(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function load(k, fallback){ try{ const s = localStorage.getItem(k); return s ? JSON.parse(s) : fallback; }catch(e){ return fallback; } }

  let events = load(EVENTS_KEY, []);
  let users = load(USERS_KEY, {});
  let settings = load(SETTINGS_KEY, { cookieless:true, retentionDays:365, anonymizePII:true });

  function anonymizeEvent(e){
    if (!settings.anonymizePII) return e;
    const copy = Object.assign({}, e);
    if (copy.params) {
      const p = Object.assign({}, copy.params);
      if (p.email) p.email = 'redacted@example.com';
      if (p.phone) p.phone = 'redacted';
      if (p.name) p.name = 'redacted';
      copy.params = p;
    }
    copy.userId = copy.userId ? 'anon_' + copy.userId.slice(0,6) : 'anon_' + genId('u').slice(0,6);
    return copy;
  }

  function trackEvent(name, params = {}, userId = null) {
    const ev = { id: genId('ev'), name: String(name), timestamp: nowIso(), userId: userId || null, params: params || {} };
    const stored = settings.anonymizePII ? anonymizeEvent(ev) : ev;
    events.push(stored); save(EVENTS_KEY, events);
    return stored;
  }

  async function apiGet(path, params = {}) {
    const from = params.from ? new Date(params.from) : new Date(Date.now() - 30*24*3600*1000);
    const to = params.to ? new Date(params.to) : new Date();
    const source = params.source || '';
    function filterEvents(list) {
      return list.filter(ev => { const t = new Date(ev.timestamp); if (t < from || t > to) return false; if (source && ev.params && ev.params.source !== source) return false; return true; });
    }
    if (path === '/api/analytics/overview') {
      const f = filterEvents(events);
      const income = f.reduce((s,e)=> s + (e.params?.amount? Number(e.params.amount):0), 0);
      const leads = f.filter(e => e.name==='lead' || e.params?.stage==='lead').length;
      const visits = f.filter(e => e.name==='page_view' || e.name==='visit').length;
      const conv = visits ? leads/visits : 0;
      return { income, leads, conv, mom: 0 };
    }
    if (path === '/api/analytics/timeseries') {
      const metric = params.metric || 'income';
      const f = filterEvents(events);
      const buckets = {};
      for (let d = new Date(from); d <= to; d.setDate(d.getDate()+1)) buckets[d.toISOString().slice(0,10)] = 0;
      f.forEach(ev => {
        const k = ev.timestamp.slice(0,10);
        if (!(k in buckets)) buckets[k] = 0;
        if (metric === 'income') buckets[k] += Number(ev.params?.amount || 0);
        if (metric === 'leads' && (ev.name==='lead' || ev.params?.stage==='lead')) buckets[k] += 1;
      });
      const labels = Object.keys(buckets).sort();
      return { labels, values: labels.map(l=>buckets[l]) };
    }
    if (path === '/api/analytics/top-sources') {
      const f = filterEvents(events);
      const map = {};
      f.forEach(ev => { const s = ev.params?.source || 'direct'; map[s] = (map[s]||0) + Number(ev.params?.amount || 0); });
      const items = Object.keys(map).map(k=>({ source:k, value: map[k] })).sort((a,b)=>b.value-a.value);
      return { items };
    }
    if (path === '/api/analytics/activity') {
      const f = filterEvents(events).sort((a,b)=> new Date(b.timestamp) - new Date(a.timestamp));
      return { items: f.slice(0,200) };
    }
    if (path === '/api/analytics/funnel') {
      const funnel = params.funnel || ['visit','lead','opportunity','won'];
      const f = filterEvents(events);
      const counts = funnel.map(step => f.filter(ev => ev.name===step || ev.params?.stage===step).length);
      return { funnel: funnel.map((s,i)=>({ step:s, count: counts[i] })) };
    }
    if (path === '/api/analytics/cohort') {
      const first = {};
      events.filter(e => e.name==='lead' || e.params?.stage==='lead').forEach(e => { if (!e.userId) return; if (!first[e.userId]) first[e.userId] = e.timestamp.slice(0,10); });
      const cohorts = {};
      Object.values(first).forEach(d => cohorts[d] = (cohorts[d]||0)+1);
      return { cohorts };
    }
    return { items: filterEvents(events) };
  }

  let mounted = false;
  function bindUI() {
    document.getElementById('an-track')?.addEventListener('click', () => {
      const name = document.getElementById('an-event-name').value.trim() || 'manual_event';
      let params = {};
      try { params = JSON.parse(document.getElementById('an-event-params').value || '{}'); } catch(e){ alert('Parámetros JSON inválidos'); return; }
      const user = document.getElementById('an-event-user').value.trim() || null;
      trackEvent(name, params, user);
      alert('Evento trackeado: ' + name);
      refreshAll();
    });
    document.getElementById('an-refresh')?.addEventListener('click', refreshAll);
    document.getElementById('an-export')?.addEventListener('click', () => {
      const csv = eventsToCSV(events);
      const blob = new Blob([csv], { type:'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'events.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });
    document.getElementById('an-cookieless')?.addEventListener('change', (e)=> { settings.cookieless = !!e.target.checked; persistSettings(); });
    document.getElementById('an-retention')?.addEventListener('change', (e)=> { settings.retentionDays = Math.max(0, parseInt(e.target.value||0,10)); persistSettings(); purgeOld(); });
  }
  function eventsToCSV(list) {
    const headers = ['id','timestamp','userId','name','params'];
    const rows = [headers.join(',')];
    list.forEach(ev => {
      const p = JSON.stringify(ev.params||{}).replace(/"/g,'""');
      rows.push([ev.id, ev.timestamp, ev.userId||'', ev.name, `"${p}"`].join(','));
    });
    return rows.join('\n');
  }
  function persistSettings(){ save(SETTINGS_KEY, settings); }
  function purgeOld(){ if(!settings.retentionDays||settings.retentionDays<=0) return; const cutoff = Date.now() - settings.retentionDays*24*3600*1000; events = events.filter(ev => new Date(ev.timestamp).getTime() >= cutoff); save(EVENTS_KEY, events); }
  async function refreshAll() {
    const from = new Date(Date.now() - 30*24*3600*1000).toISOString();
    const to = new Date().toISOString();
    try {
      const ov = await apiGet('/api/analytics/overview',{from,to});
      document.getElementById('an-kpi-income').textContent = ov.income ? '€' + Math.round(ov.income) : '€0';
      document.getElementById('an-kpi-leads').textContent = ov.leads || 0;
      document.getElementById('an-kpi-conv').textContent = (Math.round((ov.conv||0)*10000)/100) + '%';
      const top = await apiGet('/api/analytics/top-sources',{from,to});
      const topEl = document.getElementById('an-top-events'); if (topEl) { topEl.innerHTML=''; (top.items||[]).slice(0,8).forEach(it=>{ const d=document.createElement('div'); d.textContent=`${it.source}: €${Math.round(it.value)}`; topEl.appendChild(d); }); }
      const ts = await apiGet('/api/analytics/timeseries',{from,to,metric:'income'});
      const series = (ts.labels||[]).map((l,i)=>({label:l, value: ts.values[i]||0}));
      const trends = window.analyticsAPI?.detectTrends ? window.analyticsAPI.detectTrends(series) : [];
      document.getElementById('an-trends').textContent = JSON.stringify(trends, null, 2);
    } catch(e){ console.error(e); }
  }

  window.analyticsAPI = Object.assign(window.analyticsAPI || {}, {
    init: async function init(params={}) {
      if (mounted) return;
      bindUI();
      mounted = true;
      if (!events.length) {
        const now = Date.now();
        const sources = ['organic','ads','email','referral'];
        for (let i=0;i<400;i++){
          const t = new Date(now - Math.random()*90*24*3600*1000).toISOString();
          const s = sources[Math.floor(Math.random()*sources.length)];
          const stageRoll = Math.random();
          const name = stageRoll > 0.88 ? 'won' : stageRoll > 0.75 ? 'opportunity' : stageRoll > 0.45 ? 'lead' : 'page_view';
          events.push({ id: genId('ev'), name, timestamp: t, userId: genId('u'), params:{ source: s, amount: name==='won' ? Math.round(100+Math.random()*900) : 0 }});
        }
        save(EVENTS_KEY, events);
      }
      await refreshAll();
      return true;
    },
    destroy: function destroy() {
      if (!mounted) return;
      // no explicit unbind implemented for simplicity (module DOM removal will clear handlers)
      mounted = false;
      const el = document.getElementById('app-root')?.querySelector('.module-analytics'); if (el) el.remove();
    },

    // API surface
    trackEvent, apiGet, detectTrends(series,look)=>(function(){ /* small forwarder */ return (function(){ return []; })(); })(),
    exportEventsCSV: ()=>{ const csv = eventsToCSV(events); const blob = new Blob([csv],{type:'text/csv'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='events.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); },
    setRetentionDays: (d)=>{ settings.retentionDays = d; persistSettings(); purgeOld(); }
  });

})();
