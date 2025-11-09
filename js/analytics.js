/* js/analytics.js
   Dashboard Analítica ampliado — incluye:
   - Recolección de eventos y API trackEvent / identify / setUser
   - Informes: adquisición, retención, comportamiento
   - Predicciones simples y detección de tendencias (IA ligera on-device)
   - Conversiones y embudos configurables
   - Integraciones: stubs para Google Ads, BigQuery, Looker Studio
   - Privacidad: modo cookieless, anonimización PII, políticas de retención y purge
   - Mantiene mock API/localStorage y posibilidad de backend real
*/
(function () {
  // CONFIG
  const config = {
    realBackend: false,
    baseUrl: '',
    sampleSizeDays: 90,
    integrations: {
      googleAds: { enabled: false, config: {} },
      bigQuery: { enabled: false, config: {} },
      lookerStudio: { enabled: false, config: {} }
    },
    privacy: {
      cookieless: true,
      retentionDays: 365,
      anonymizePII: true
    }
  };

  // Helpers
  const qs = (s) => document.querySelector(s);
  const genId = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);
  const nowIso = () => new Date().toISOString();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const toDateKey = (iso) => iso.slice(0, 10);

  // STORAGE KEYS
  const EVENTS_KEY = 'analytics:events_v2';
  const USERS_KEY = 'analytics:users_v2';
  const SETTINGS_KEY = 'analytics:settings_v2';

  // Load/Save
  function save(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.warn('save failed', e); } }
  function load(key, fallback = []) { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch (e) { return fallback; } }

  // MAIN DATA
  let events = load(EVENTS_KEY, []); // each event: { id, name, timestamp, userId, params }
  let users = load(USERS_KEY, {});    // map userId -> profile
  let settings = load(SETTINGS_KEY, config.privacy);

  // Persist privacy settings
  function persistSettings() { save(SETTINGS_KEY, settings); }

  // PRIVACY API
  function setCookieless(enabled) {
    settings.cookieless = !!enabled;
    persistSettings();
  }
  function setRetentionDays(days) {
    settings.retentionDays = Math.max(0, parseInt(days || 0, 10));
    persistSettings();
    purgeOldEvents();
  }
  function setAnonymizePII(enabled) {
    settings.anonymizePII = !!enabled;
    persistSettings();
  }
  function anonymizeEvent(e) {
    if (!settings.anonymizePII) return e;
    const copy = Object.assign({}, e);
    // remove or redact common PII fields in params
    if (copy.params) {
      const p = Object.assign({}, copy.params);
      if (p.email) p.email = 'redacted@example.com';
      if (p.phone) p.phone = 'redacted';
      if (p.name) p.name = 'redacted';
      copy.params = p;
    }
    if (copy.userId && copy.userId.startsWith('anon_')) {
      // already anonymous
    } else {
      copy.userId = 'anon_' + (copy.userId ? copy.userId.slice(0,6) : genId('u').slice(0,6));
    }
    return copy;
  }
  function purgeOldEvents() {
    if (!settings.retentionDays || settings.retentionDays <= 0) return;
    const cutoff = Date.now() - (settings.retentionDays * 24 * 3600 * 1000);
    events = events.filter(ev => new Date(ev.timestamp).getTime() >= cutoff);
    save(EVENTS_KEY, events);
  }

  // EVENT COLLECTION API
  function trackEvent(name, params = {}, userId = null) {
    const ev = {
      id: genId('ev'),
      name: String(name),
      timestamp: nowIso(),
      userId: userId || null,
      params: params || {}
    };
    const stored = settings.anonymizePII ? anonymizeEvent(ev) : ev;
    events.push(stored);
    save(EVENTS_KEY, events);
    // optional integration forwarders
    if (config.integrations.googleAds.enabled) forwardToGoogleAds(stored);
    if (config.integrations.bigQuery.enabled) forwardToBigQuery([stored]);
    // emit to UI modules if present
    if (window.analyticsInternal && typeof window.analyticsInternal.onEvent === 'function') {
      window.analyticsInternal.onEvent(stored);
    }
    return stored;
  }

  function identify(userId, profile = {}) {
    if (!userId) userId = genId('u');
    users[userId] = Object.assign(users[userId] || {}, profile, { updatedAt: nowIso() });
    save(USERS_KEY, users);
    return users[userId];
  }
  function alias(prevId, newId) {
    // unify user ids
    if (!prevId || !newId) return false;
    users[newId] = Object.assign({}, users[prevId] || {}, users[newId] || {}, { mergedFrom: prevId, updatedAt: nowIso() });
    delete users[prevId];
    // update events
    events.forEach(ev => { if (ev.userId === prevId) ev.userId = newId; });
    save(EVENTS_KEY, events);
    save(USERS_KEY, users);
    return true;
  }

  // Simple in-memory query + mock api for compatibility with previous module
  async function apiGet(path, params = {}) {
    // path routing for analytics module (local)
    const from = params.from ? new Date(params.from) : new Date(Date.now() - 30*24*3600*1000);
    const to = params.to ? new Date(params.to) : new Date();
    const source = params.source || '';
    const segment = params.segment || '';

    // helper to filter events by time and optional filters
    function filterEvents(evList) {
      return evList.filter(ev => {
        const t = new Date(ev.timestamp);
        if (t < from || t > to) return false;
        if (source && ev.params && ev.params.source !== source) return false;
        if (segment && ev.params && ev.params.segment !== segment) return false;
        return true;
      });
    }

    // endpoints
    if (path === '/api/analytics/overview') {
      const filtered = filterEvents(events);
      const income = filtered.reduce((s, e) => s + (e.params && e.params.amount ? Number(e.params.amount) : 0), 0);
      const leads = filtered.filter(e => e.name === 'lead' || (e.params && e.params.stage === 'lead')).length;
      const visits = filtered.filter(e => e.name === 'page_view' || e.name === 'visit').length;
      const conv = visits ? (leads / visits) : 0;
      // M/M mock: compute last 30 days vs previous 30 days
      const last30From = new Date(to.getTime() - 30*24*3600*1000);
      const prev30From = new Date(last30From.getTime() - 30*24*3600*1000);
      const last = events.filter(e => new Date(e.timestamp) >= last30From && new Date(e.timestamp) <= to);
      const prev = events.filter(e => new Date(e.timestamp) >= prev30From && new Date(e.timestamp) < last30From);
      const incomeLast = last.reduce((s, e) => s + (e.params && e.params.amount ? Number(e.params.amount) : 0), 0);
      const incomePrev = prev.reduce((s, e) => s + (e.params && e.params.amount ? Number(e.params.amount) : 0), 0);
      const mom = incomePrev ? ((incomeLast - incomePrev) / incomePrev * 100) : 0;
      return { income, leads, conv, mom };
    }

    if (path === '/api/analytics/timeseries') {
      const metric = params.metric || 'income'; // income|leads|visits|events
      const filtered = filterEvents(events);
      const buckets = {};
      for (let d = new Date(from); d <= to; d.setDate(d.getDate()+1)) buckets[toDateKey(d.toISOString())] = 0;
      filtered.forEach(ev => {
        const k = toDateKey(ev.timestamp);
        if (!(k in buckets)) buckets[k] = 0;
        if (metric === 'income') buckets[k] += Number(ev.params && ev.params.amount ? ev.params.amount : 0);
        if (metric === 'leads' && (ev.name === 'lead' || ev.params && ev.params.stage === 'lead')) buckets[k] += 1;
        if (metric === 'visits' && (ev.name === 'page_view' || ev.name === 'visit')) buckets[k] += 1;
        if (metric === 'events') buckets[k] += 1;
      });
      const labels = Object.keys(buckets).sort();
      return { labels, values: labels.map(l => buckets[l]) };
    }

    if (path === '/api/analytics/top-sources') {
      const filtered = filterEvents(events);
      const map = {};
      filtered.forEach(ev => {
        const s = ev.params && ev.params.source ? ev.params.source : (ev.name === 'page_view' && ev.params && ev.params.referrer ? 'referral' : 'unknown');
        map[s] = (map[s]||0) + Number(ev.params && ev.params.amount ? ev.params.amount : 0);
      });
      const items = Object.keys(map).map(k => ({ source: k, value: map[k] })).sort((a,b) => b.value - a.value);
      return { items };
    }

    if (path === '/api/analytics/funnel') {
      // params.funnel = ['visit','lead','opportunity','won'] or default
      const funnel = params.funnel || ['visit','lead','opportunity','won'];
      const filtered = filterEvents(events);
      const counts = funnel.map(step => {
        return filtered.filter(ev => ev.name === step || (ev.params && ev.params.stage === step)).length;
      });
      return { funnel: funnel.map((s, i) => ({ step: s, count: counts[i] })) };
    }

    if (path === '/api/analytics/activity') {
      const filtered = filterEvents(events);
      const sorted = filtered.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
      return { items: sorted.slice(0, 200) };
    }

    if (path === '/api/analytics/cohort') {
      // cohort by first lead date
      const firstLeadByUser = {};
      events.filter(e => e.name === 'lead' || (e.params && e.params.stage === 'lead')).forEach(e => {
        if (!e.userId) return;
        if (!firstLeadByUser[e.userId]) firstLeadByUser[e.userId] = toDateKey(e.timestamp);
      });
      const cohorts = {};
      Object.values(firstLeadByUser).forEach(d => cohorts[d] = (cohorts[d] || 0) + 1);
      return { cohorts };
    }

    // fallback
    return { items: filterEvents(events) };
  }

  // USER ANALYTICS REPORTS
  function acquisitionReport({ from, to, groupBy = 'source' } = {}) {
    // returns counts by source or campaign
    const res = {};
    const fromD = from ? new Date(from) : new Date(Date.now() - 30*24*3600*1000);
    const toD = to ? new Date(to) : new Date();
    events.forEach(ev => {
      const t = new Date(ev.timestamp);
      if (t < fromD || t > toD) return;
      const key = (ev.params && ev.params[groupBy]) || (groupBy === 'source' ? (ev.params && ev.params.source) || 'direct' : 'unknown');
      res[key] = (res[key] || 0) + 1;
    });
    return Object.entries(res).map(([k,v]) => ({ key: k, value: v })).sort((a,b)=>b.value-a.value);
  }

  function retentionReport({ windowDays = 30 } = {}) {
    // simplistic retention: users active on day0 and returning in following weeks
    const cutoff = Date.now() - windowDays * 24 * 3600 * 1000;
    const recentEvents = events.filter(e => new Date(e.timestamp).getTime() >= cutoff);
    const usersSet = {};
    recentEvents.forEach(e => { if (e.userId) usersSet[e.userId] = usersSet[e.userId] || []; usersSet[e.userId].push(e.timestamp); });
    // retention per day count
    const retention = {};
    Object.keys(usersSet).forEach(uid => {
      const first = new Date(usersSet[uid].sort()[0]).toISOString().slice(0,10);
      retention[first] = (retention[first] || 0) + 1;
    });
    return retention;
  }

  function behaviorReport({ topN = 20 } = {}) {
    // most common events
    const map = {};
    events.forEach(e => map[e.name] = (map[e.name]||0) + 1);
    return Object.entries(map).map(([k,v]) => ({ event: k, count: v })).sort((a,b)=>b.count-a.count).slice(0, topN);
  }

  // PREDICTIONS & TRENDS (lightweight)
  function detectTrends(metricSeries = [], lookback = 7) {
    // metricSeries: [{label, value}, ...] chronological
    // simple approach: compute moving average and z-score to flag spikes/trends
    const values = metricSeries.map(x => x.value);
    const trends = [];
    for (let i = lookback; i < values.length; i++) {
      const window = values.slice(i - lookback, i);
      const avg = window.reduce((s, v) => s + v, 0) / window.length;
      const variance = window.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / window.length;
      const sd = Math.sqrt(variance);
      const current = values[i];
      const z = sd === 0 ? 0 : (current - avg) / sd;
      trends.push({ index: i, label: metricSeries[i].label, value: current, z });
    }
    // return points where |z| > 2 as significant
    return trends.filter(t => Math.abs(t.z) >= 2);
  }

  // CONVERSION TRACKING & FLEXIBLE FUNNELS
  function evaluateFunnel(usersEvents, funnelSteps = ['visit','lead','opportunity','won']) {
    // usersEvents: group by userId -> [events]
    const result = funnelSteps.map(step => ({ step, count: 0 }));
    const userIds = Object.keys(usersEvents);
    userIds.forEach(uid => {
      const evNames = usersEvents[uid].map(e => e.name || (e.params && e.params.stage));
      // determine highest funnel step this user reached
      for (let i = funnelSteps.length - 1; i >= 0; i--) {
        if (evNames.includes(funnelSteps[i])) {
          result[i].count++;
          break;
        }
      }
    });
    return result;
  }

  function buildUsersEventsMap(filteredEvents) {
    const map = {};
    filteredEvents.forEach(e => {
      if (!e.userId) return;
      map[e.userId] = map[e.userId] || [];
      map[e.userId].push(e);
    });
    return map;
  }

  // INTEGRATIONS (stubs)
  async function forwardToGoogleAds(event) {
    if (!config.integrations.googleAds.enabled) return;
    // stub: map event to Google Ads conversions, then call server-side endpoint or gtag if available
    console.info('[GA-Stub] Forwarding event to Google Ads', event.name, event.params);
    // if gtag available:
    try {
      if (window.gtag) {
        window.gtag('event', event.name, Object.assign({}, event.params));
      } else {
        // else forward to backend for server-side upload
        // await serverForward('/integrations/google-ads', event);
      }
    } catch (err) { console.warn('Google Ads forward error', err); }
  }
  async function forwardToBigQuery(eventsBatch) {
    if (!config.integrations.bigQuery.enabled) return;
    console.info('[BQ-Stub] Forwarding batch to BigQuery, size=', eventsBatch.length);
    // Implement server-side push or use BigQuery streaming API with credentials (not in client)
  }
  async function exportToLookerStudio() {
    if (!config.integrations.lookerStudio.enabled) return;
    // Looker Studio often reads from BigQuery or Google Sheets. Provide CSV export link.
    const csv = eventsToCSV(events);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'looker-data.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // UTIL: convert events to CSV
  function eventsToCSV(list) {
    const headers = ['id','timestamp','userId','name','params'];
    const rows = [headers.join(',')];
    list.forEach(ev => {
      const params = JSON.stringify(ev.params || {}).replace(/"/g, '""');
      rows.push([ev.id, ev.timestamp, ev.userId || '', ev.name, `"${params}"`].join(','));
    });
    return rows.join('\n');
  }

  // EXPORTS: CSV and chart PNG handled in UI module earlier; reuse export helper
  function exportEventsCSV(filename='events.csv') {
    const csv = eventsToCSV(events);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  // PURGE OLD EVENT SCHEDULE (enforce retention)
  function schedulePurgeRoutine() {
    const dayMs = 24*3600*1000;
    setInterval(purgeOldEvents, dayMs); // daily
  }

  // EXPOSED API
  const analyticsAPI = {
    // collection
    trackEvent,
    identify,
    alias,

    // queries
    apiGet,
    acquisitionReport,
    retentionReport,
    behaviorReport,
    detectTrends,
    evaluateFunnel,
    buildUsersEventsMap,

    // integrations
    configureIntegration(name, cfg) {
      if (!config.integrations[name]) config.integrations[name] = {};
      config.integrations[name].enabled = !!cfg.enabled;
      config.integrations[name].config = cfg.config || {};
    },
    forwardToGoogleAds,
    forwardToBigQuery,
    exportToLookerStudio,
    exportEventsCSV,

    // privacy controls
    setCookieless,
    setRetentionDays,
    setAnonymizePII: setAnonymizePII,
    purgeOldEvents,

    // admin
    getRawEvents: () => events.slice(),
    resetMockData() {
      events = [];
      save(EVENTS_KEY, events);
    },

    // config
    setBackend(baseUrl) { config.realBackend = true; config.baseUrl = baseUrl; },
    useMock() { config.realBackend = false; },

    // internal utilities
    _getConfig: () => config
  };

  // Attach to window
  window.analyticsAPI = Object.assign(window.analyticsAPI || {}, analyticsAPI);

  // INTERNAL HOOK for UI to receive live events
  window.analyticsInternal = window.analyticsInternal || {};
  window.analyticsInternal.onEvent = function (ev) {
    // optional UI update hooks (chart streaming, counters)
    // Implemented by UI code if needed
  };

  // BOOT: ensure mock data and schedule purge
  function ensureMockData() {
    if (!events || events.length === 0) {
      // generate a small set if empty
      const sample = [];
      const now = Date.now();
      const sources = ['organic','ads','email','referral'];
      for (let i = 0; i < 800; i++) {
        const t = new Date(now - Math.random() * config.sampleSizeDays * 24*3600*1000).toISOString();
        const source = sources[Math.floor(Math.random()*sources.length)];
        const stageRoll = Math.random();
        let name = 'page_view';
        if (stageRoll > 0.88) name = 'won';
        else if (stageRoll > 0.75) name = 'opportunity';
        else if (stageRoll > 0.45) name = 'lead';
        sample.push({ id: genId('e'), name, timestamp: t, userId: genId('u'), params: { source, amount: name==='won' ? Math.round(100 + Math.random()*900) : 0 } });
      }
      events = sample;
      save(EVENTS_KEY, events);
    }
    if (!users || Object.keys(users).length === 0) {
      const u = {};
      for (let i = 0; i < 60; i++) { const id = genId('u'); u[id] = { id, createdAt: nowIso(), country: ['US','ES','FR','DE'][Math.floor(Math.random()*4)] }; }
      users = u; save(USERS_KEY, users);
    }
    // apply persisted privacy settings
    const s = load(SETTINGS_KEY, null);
    if (s) settings = Object.assign(settings, s);
  }

  ensureMockData();
  schedulePurgeRoutine();

  // provide small UI helper: auto-forward events from CRM module if present
  if (window.crmAPI && typeof window.crmAPI.on === 'function') {
    // subscribe to interactions
    window.crmAPI.on('interaction.logged', (i) => {
      try { trackEvent(i.type || 'interaction', i.meta || {}, i.contactId || i.userId); } catch(e) {}
    });
  }

  // quick debug interface in console
  console.info('analyticsAPI initialized (trackEvent, apiGet, acquisitionReport, retentionReport, detectTrends, etc.).');
})();
