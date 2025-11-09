/* modules/analytics.js
   Advanced Analytics module for DataConecta (module-ready).
   - trackEvent / identify / alias
   - acquisition / retention / behavior reports
   - timeseries, funnel, trends detection + lightweight alerts
   - A/B experiments (create/evaluate)
   - Integrations stubs (BigQuery / Google Ads / Looker Studio CSV)
   - Privacy controls: cookieless, anonymize PII, retention/purge
   - Session recordings & heatmap generation (client-side demo)
   - Exposes window.analyticsAPI with init/destroy and functions for other modules
*/
(function () {
  const STORAGE = {
    EVENTS: 'analytics:events_v3',
    USERS: 'analytics:users_v3',
    SETTINGS: 'analytics:settings_v3',
    RECORDINGS: 'analytics:recordings_v1',
    AB: 'analytics:ab_v1'
  };

  // helpers
  const $ = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));
  const uid = (p='id') => p + '_' + Math.random().toString(36).slice(2,9);
  const nowIso = () => new Date().toISOString();

  function save(key, v){ try{ localStorage.setItem(key, JSON.stringify(v)); }catch(e){} }
  function load(key, fallback){ try{ const s = localStorage.getItem(key); return s?JSON.parse(s):fallback; }catch(e){ return fallback; } }

  // data
  let events = load(STORAGE.EVENTS, []);
  let users = load(STORAGE.USERS, {});
  let settings = load(STORAGE.SETTINGS, { cookieless:true, anonymize:true, retentionDays:365 });
  let recordings = load(STORAGE.RECORDINGS, []);
  let experiments = load(STORAGE.AB, []);

  // Persist helpers
  function persistAll() {
    save(STORAGE.EVENTS, events); save(STORAGE.USERS, users); save(STORAGE.SETTINGS, settings);
    save(STORAGE.RECORDINGS, recordings); save(STORAGE.AB, experiments);
  }

  // Privacy helpers
  function anonymizeEvent(ev) {
    if (!settings.anonymize) return ev;
    const copy = Object.assign({}, ev);
    if (copy.params) {
      const p = Object.assign({}, copy.params);
      if (p.email) p.email = 'redacted@example.com';
      if (p.name) p.name = 'redacted';
      copy.params = p;
    }
    if (copy.userId) copy.userId = 'anon_' + copy.userId.toString().slice(0,6);
    return copy;
  }

  // Public tracking API
  function trackEvent(name, params = {}, userId = null) {
    const ev = { id: uid('ev'), name: String(name), timestamp: nowIso(), userId: userId || null, params: params || {} };
    const store = anonymizeEvent(ev);
    events.push(store);
    persistAll();
    // evaluate alerts & experiments on new event
    evaluateAlertsForEvent(store);
    evaluateABForEvent(store);
    return store;
  }

  function identify(userId, profile = {}) {
    if (!userId) userId = uid('u');
    users[userId] = Object.assign(users[userId] || {}, profile, { updatedAt: nowIso() });
    save(STORAGE.USERS, users);
    return users[userId];
  }

  function alias(prevId, newId) {
    if (!prevId || !newId) return false;
    if (users[prevId]) {
      users[newId] = Object.assign({}, users[prevId], users[newId] || {}, { mergedFrom: prevId, updatedAt: nowIso() });
      delete users[prevId];
    }
    events.forEach(ev => { if (ev.userId === prevId) ev.userId = newId; });
    persistAll();
    return true;
  }

  // Query endpoints (in-memory mock)
  function getOverview({ from, to, source } = {}) {
    const f = filterEvents(from, to, source);
    const income = f.reduce((s,e)=> s + Number(e.params?.amount || 0), 0);
    const leads = f.filter(e => e.name === 'lead' || e.params?.stage === 'lead').length;
    const visits = f.filter(e => e.name === 'page_view' || e.name === 'visit').length;
    const conv = visits ? (leads / visits) : 0;
    return { income, leads, conv };
  }

  function filterEvents(from, to, source) {
    const fromD = from ? new Date(from) : new Date(Date.now() - 30*24*3600*1000);
    const toD = to ? new Date(to) : new Date();
    return events.filter(ev => {
      const t = new Date(ev.timestamp); if (t < fromD || t > toD) return false;
      if (source && ev.params && ev.params.source !== source) return false;
      return true;
    });
  }

  function timeseries({ metric='income', from, to } = {}) {
    const f = filterEvents(from, to);
    const buckets = {};
    for (let d = new Date(from ? new Date(from) : Date.now() - 30*24*3600*1000); d <= (to ? new Date(to) : new Date()); d.setDate(d.getDate()+1)) {
      buckets[d.toISOString().slice(0,10)] = 0;
    }
    f.forEach(ev => {
      const k = ev.timestamp.slice(0,10);
      if (!(k in buckets)) buckets[k] = 0;
      if (metric === 'income') buckets[k] += Number(ev.params?.amount || 0);
      if (metric === 'leads' && (ev.name==='lead' || ev.params?.stage==='lead')) buckets[k] += 1;
      if (metric === 'events') buckets[k] += 1;
    });
    const labels = Object.keys(buckets).sort();
    return { labels, values: labels.map(l => buckets[l]) };
  }

  function topSources({ from, to } = {}) {
    const f = filterEvents(from,to);
    const map = {};
    f.forEach(ev => {
      const s = ev.params?.source || (ev.params?.campaign ? ev.params.campaign : 'direct');
      map[s] = (map[s]||0) + Number(ev.params?.amount || 0);
    });
    return Object.keys(map).map(k=>({ source:k, value: map[k] })).sort((a,b)=>b.value-a.value);
  }

  function funnel({ steps = ['visit','lead','opportunity','won'], from, to } = {}) {
    const f = filterEvents(from,to);
    const counts = steps.map(step => f.filter(ev => ev.name === step || ev.params?.stage === step).length);
    return steps.map((s,i)=>({ step: s, count: counts[i] }));
  }

  // Trends detection (z-score)
  function detectTrends(series = [], lookback = 7) {
    const values = series.map(x => x.value || 0);
    const out = [];
    for (let i = lookback; i < values.length; i++) {
      const window = values.slice(i-lookback, i);
      const avg = window.reduce((s,v)=>s+v,0)/window.length;
      const varr = window.reduce((s,v)=>s+Math.pow(v-avg,2),0)/window.length;
      const sd = Math.sqrt(varr);
      const z = sd === 0 ? 0 : (values[i] - avg) / sd;
      if (Math.abs(z) >= 2) out.push({ index:i, label: series[i].label, value: series[i].value, z });
    }
    return out;
  }

  // Alerts: simple rules engine
  let alertRules = []; // { id, name, metric, operator, threshold, windowDays }
  function addAlertRule(rule) { rule.id = uid('alert'); alertRules.push(rule); return rule; }
  function evaluateAlertsForEvent(ev) {
    // evaluate all rules quickly (demo)
    alertRules.forEach(rule => {
      const ts = new Date(ev.timestamp);
      const from = new Date(ts.getTime() - (rule.windowDays||1)*24*3600*1000);
      const series = timeseries({ metric: rule.metric, from: from.toISOString(), to: ts.toISOString() });
      const latest = series.values[series.values.length-1] || 0;
      let fired = false;
      switch (rule.operator) {
        case '>': if (latest > rule.threshold) fired = true; break;
        case '<': if (latest < rule.threshold) fired = true; break;
        case '>=': if (latest >= rule.threshold) fired = true; break;
      }
      if (fired) {
        // notify UI (increase alert count)
        const el = $('#kpi-alerts'); if (el) { el.textContent = Number(el.textContent||0) + 1; }
        console.warn('Alert fired', rule.name, latest);
      }
    });
  }

  // A/B Experimenting (simple)
  function createExperiment(name, pctA=50, pctB=50) {
    const ex = { id: uid('ab'), name, pctA: Number(pctA), pctB: Number(pctB), createdAt: nowIso(), results: { A:0, B:0 } };
    experiments.unshift(ex); save(STORAGE.AB, experiments); return ex;
  }
  function assignVariant(userId, experimentId) {
    const ex = experiments.find(e => e.id === experimentId); if (!ex) return null;
    // simple hash
    const h = Math.abs(Array.from(userId||'').reduce((s,c)=>s*31 + c.charCodeAt(0),0));
    const mod = h % 100;
    return (mod < ex.pctA) ? 'A' : 'B';
  }
  function evaluateABForEvent(ev) {
    // if event is conversion and user assigned mark result
    if (!ev.userId) return;
    experiments.forEach(ex => {
      const variant = assignVariant(ev.userId, ex.id);
      if (ev.name === 'conversion' || ev.params?.stage === 'won') ex.results[variant] += 1;
    });
    save(STORAGE.AB, experiments);
  }

  // Integrations stubs (server-side recommended)
  async function pushToBigQuery(batch) {
    // stub: simulate network send and return success
    console.info('[BQ stub] sending batch size', batch.length);
    return { ok:true, sent: batch.length };
  }
  async function forwardToGoogleAds(ev) {
    console.info('[GA stub] event forwarded', ev.name);
    return { ok:true };
  }
  function exportToLookerCSV() {
    // export events to CSV for Looker Studio upload
    const csv = eventsToCSV(events);
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'looker-data.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function eventsToCSV(list) {
    const rows = [];
    rows.push(['id','timestamp','userId','name','params'].join(','));
    list.forEach(ev => rows.push([ev.id, ev.timestamp, ev.userId || '', `"${JSON.stringify(ev.params||{}).replace(/"/g,'""')}"`, ev.name].join(',')));
    return rows.join('\n');
  }

  // Recordings & heatmaps (client-side demo)
  let recording = false;
  let recBuffer = [];
  function startRecording() {
    recording = true; recBuffer = [];
    const onMove = (e) => {
      if (!recording) return;
      const p = { type: 'move', x: e.clientX, y: e.clientY, ts: Date.now() };
      recBuffer.push(p);
      if (recBuffer.length > 20000) recBuffer.shift();
    };
    const onClick = (e) => {
      if (!recording) return;
      recBuffer.push({ type:'click', x:e.clientX, y:e.clientY, ts: Date.now() });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('click', onClick);
    analyticsInternal._recHandlers = analyticsInternal._recHandlers || [];
    analyticsInternal._recHandlers.push({ onMove, onClick });
  }
  function stopRecording(name) {
    recording = false;
    (analyticsInternal._recHandlers || []).forEach(h => { try { window.removeEventListener('mousemove', h.onMove); window.removeEventListener('click', h.onClick); } catch(e){} });
    analyticsInternal._recHandlers = [];
    const recs = load(STORAGE.RECORDINGS, []);
    const rec = { id: uid('rec'), name: name || ('rec_'+Date.now()), createdAt: nowIso(), events: recBuffer.slice() };
    recs.unshift(rec); recordings = recs; save(STORAGE.RECORDINGS, recordings);
    recBuffer = [];
    renderRecordingsList();
    return rec;
  }

  function renderRecordingsList() {
    const list = load(STORAGE.RECORDINGS, []);
    const out = $('#recordings-list');
    if (!out) return;
    out.innerHTML = list.map(r => `<div class="recording-item"><strong>${r.name}</strong><div class="muted">${new Date(r.createdAt).toLocaleString()}</div><div><button data-id="${r.id}" class="btn small rec-heat">Heatmap</button></div></div>`).join('');
    qsa('.rec-heat').forEach(btn => btn.addEventListener('click', ()=> generateHeatmap(btn.dataset.id)));
  }

  function generateHeatmap(recId) {
    const recs = load(STORAGE.RECORDINGS, []);
    const rec = recs.find(r => r.id === recId);
    if (!rec) return alert('Recording not found');
    // aggregate click positions relative to viewport and draw simple heatmap in a popup canvas
    const clicks = rec.events.filter(e => e.type === 'click');
    const w = window.innerWidth, h = window.innerHeight;
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    clicks.forEach(c => {
      const grd = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 60);
      grd.addColorStop(0,'rgba(255,0,0,0.18)'); grd.addColorStop(1,'rgba(255,0,0,0)');
      ctx.fillStyle = grd; ctx.fillRect(c.x-60, c.y-60, 120, 120);
    });
    const wdt = window.open('', '_blank', `width=${w},height=${h}`);
    wdt.document.body.style.margin = '0'; wdt.document.body.appendChild(canvas);
  }

  // Scrollmap demo - generate aggregated scroll positions (mock)
  function generateScrollMap() {
    // for demo, create synthetic scroll map
    const w = 600, h = 800;
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    // create gradient from top to bottom showing most users stop mid-page
    const grd = ctx.createLinearGradient(0,0,0,h);
    grd.addColorStop(0,'rgba(0,200,0,0.2)'); grd.addColorStop(0.6,'rgba(255,200,0,0.25)'); grd.addColorStop(1,'rgba(255,0,0,0.3)');
    ctx.fillStyle = grd; ctx.fillRect(0,0,w,h);
    const wdt = window.open('', '_blank', `width=${w},height=${h}`);
    wdt.document.body.style.margin='0'; wdt.document.body.appendChild(canvas);
  }

  // UI wiring & lifecycle
  let mounted = false;
  function bindUI() {
    $('#an-track')?.addEventListener('click', () => {
      const name = $('#an-event-name').value.trim() || 'manual_event';
      let params = {};
      try { params = JSON.parse($('#an-event-params').value || '{}'); } catch(e){ return alert('Params JSON inválidos'); }
      const user = $('#an-event-user').value.trim() || null;
      trackEvent(name, params, user);
      refreshOverview();
    });
    $('#an-identify')?.addEventListener('click', ()=> {
      const uidv = $('#an-event-user').value.trim() || uid('u');
      const profile = { createdAt: nowIso() };
      identify(uidv, profile);
      alert('User identified: ' + uidv);
    });
    $('#an-alias')?.addEventListener('click', ()=> {
      const prev = prompt('Prev user id'); const nw = prompt('New user id'); if (!prev || !nw) return;
      alias(prev, nw); alert('Alias applied');
    });

    $('#an-save-privacy')?.addEventListener('click', ()=> {
      settings.cookieless = !!$('#an-cookieless').checked;
      settings.anonymize = !!$('#an-anonymize').checked;
      settings.retentionDays = Math.max(0, Number($('#an-retention').value || 0));
      persistAll();
      alert('Privacy settings saved');
    });

    $('#an-export-events')?.addEventListener('click', ()=> {
      const csv = eventsToCSV(events);
      const blob = new Blob([csv], { type:'text/csv' }); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'events.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });
    $('#an-clear-events')?.addEventListener('click', ()=> {
      const days = Number($('#an-retention').value || 365);
      purgeOldEvents(days);
      alert('Old events purged');
      refreshOverview();
    });

    $('#an-refresh')?.addEventListener('click', ()=> refreshOverview());
    $('#an-ts-export')?.addEventListener('click', ()=> {
      // export canvas placeholder (if chart used, would export)
      alert('Timeseries export demo — implement Chart.js export');
    });

    $('#an-funnel-run')?.addEventListener('click', ()=> {
      const steps = ($('#an-funnel-steps').value || 'visit,lead,opportunity,won').split(',').map(s=>s.trim());
      const f = funnel({ steps, from: new Date(Date.now()-30*24*3600*1000).toISOString(), to: new Date().toISOString() });
      $('#an-funnel-output').innerHTML = f.map(s=>`<div>${s.step}: ${s.count}</div>`).join('');
    });

    $('#ab-create')?.addEventListener('click', ()=> {
      const name = $('#ab-name').value || ('exp_'+Date.now());
      const a = Number($('#ab-a').value||50); const b = Number($('#ab-b').value||50);
      const ex = createExperiment(name, a, b);
      renderExperiments();
      alert('Experiment created: ' + ex.name);
    });

    $('#int-run-sync')?.addEventListener('click', async ()=> {
      const sendToBq = $('#int-bigquery').checked;
      const sendToAds = $('#int-google-ads').checked;
      if (sendToBq) {
        const res = await pushToBigQuery(events.slice(-200));
        alert('BQ sync (stub) sent: ' + res.sent);
      }
      if (sendToAds) { await forwardToGoogleAds(events[events.length-1]); alert('GA stub forward'); }
      if ($('#int-looker').checked) exportToLookerCSV();
    });

    $('#rec-start')?.addEventListener('click', ()=> { startRecording(); alert('Recording started'); });
    $('#rec-stop')?.addEventListener('click', ()=> { const r = stopRecording('rec_'+Date.now()); alert('Recording saved: ' + r.name); });
    $('#scroll-gen')?.addEventListener('click', ()=> generateScrollMap());

    $('#an-activity-export')?.addEventListener('click', ()=> {
      const rows = [];
      const header = ['Fecha','Usuario','Evento','Params'];
      rows.push(header.join(','));
      const act = events.slice().reverse().slice(0,200);
      act.forEach(e => rows.push([e.timestamp, e.userId||'', e.name, `"${JSON.stringify(e.params||{}).replace(/"/g,'""')}"`].join(',')));
      const blob = new Blob([rows.join('\n')], { type:'text/csv' }); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='activity.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });

    renderRecordingsList();
    renderExperiments();
  }

  function renderExperiments() {
    const out = $('#ab-list'); if (!out) return;
    out.innerHTML = experiments.map(ex => `<div><strong>${ex.name}</strong><div class="muted">A:${ex.results.A||0} B:${ex.results.B||0}</div></div>`).join('') || '<div class="muted">No experiments</div>';
  }

  // purge by retention days
  function purgeOldEvents(days) {
    const cutoff = Date.now() - (days||settings.retentionDays||365) * 24*3600*1000;
    events = events.filter(e => new Date(e.timestamp).getTime() >= cutoff);
    persistAll();
  }

  // refresh UI overview
  function refreshOverview() {
    const ov = getOverview();
    $('#kpi-income').textContent = '€' + Math.round(ov.income || 0);
    $('#kpi-leads').textContent = ov.leads || 0;
    $('#kpi-conv').textContent = ((ov.conv||0)*100).toFixed(2) + '%';
    // activity table
    const tb = $('#an-activity-table tbody'); if (tb) {
      tb.innerHTML = '';
      events.slice().reverse().slice(0,200).forEach(e => {
        const tr = document.createElement('tr');
        const params = JSON.stringify(e.params||{});
        tr.innerHTML = `<td>${new Date(e.timestamp).toLocaleString()}</td><td>${e.userId||''}</td><td>${e.name}</td><td>${params}</td>`;
        tb.appendChild(tr);
      });
    }
    // timeseries (simple)
    const ts = timeseries({ metric:'income' , from: new Date(Date.now()-30*24*3600*1000).toISOString(), to: new Date().toISOString() });
    // small visualization: list top values
    const top = topSources();
    $('#an-top-list').innerHTML = top.slice(0,8).map(t => `<div>${t.source}: €${Math.round(t.value)}</div>`).join('');
    // trends detect
    const series = (ts.labels || []).map((l,i) => ({ label: l, value: ts.values[i] || 0 }));
    const trends = detectTrends(series);
    $('#an-trends-output').textContent = JSON.stringify(trends, null, 2);
  }

  // evaluate AB when events come in
  function evaluateABForEvent(ev) { evaluateABForEvent; } // placeholder (already called in trackEvent)

  // expose API
  const api = {
    init: async function init(params={}) {
      if (mounted) return;
      bindUI();
      mounted = true;
      // initial demo events if empty
      if (!events.length) {
        // generate demo
        const now = Date.now();
        const sources = ['organic','ads','email','referral'];
        for (let i=0;i<400;i++){
          const t = new Date(now - Math.random()*90*24*3600*1000).toISOString();
          const s = sources[Math.floor(Math.random()*sources.length)];
          const name = Math.random() > 0.9 ? 'won' : Math.random() > 0.7 ? 'lead' : 'page_view';
          events.push({ id: uid('ev'), name, timestamp: t, userId: uid('u'), params:{ source:s, amount: name==='won' ? Math.round(100+Math.random()*900) : 0 }});
        }
        persistAll();
      }
      refreshOverview();
      return true;
    },
    destroy: function destroy() {
      if (!mounted) return;
      // no full unbind for brevity; module DOM removal will clean most handlers
      mounted = false;
    },

    // APIs
    trackEvent, identify, alias,
    getOverview, timeseries, topSources, funnel, detectTrends,
    addAlertRule, createExperiment, assignVariant,
    pushToBigQuery, forwardToGoogleAds, exportToLookerCSV,
    startRecording, stopRecording, generateHeatmapFromRecording, generateScrollMap,
    getRawEvents: () => events.slice(),
    setPrivacy: (p) => { settings = Object.assign(settings, p); persistAll(); }
  };

  window.analyticsAPI = Object.assign(window.analyticsAPI || {}, api);
  window.analyticsInternal = window.analyticsInternal || {};
  window.analyticsInternal._recHandlers = [];

  // small exposure for debug
  window.__dataconecta_analytics = { events, users, settings, recordings, experiments };

})();
