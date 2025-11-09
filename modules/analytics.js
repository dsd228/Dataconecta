// modules/analytics.js
// Lightweight analytics module exposing analyticsAPI.init/destroy
// Integrates with global analyticsAPI when present, otherwise provides minimal local functions

(function () {
  let mounted = false;
  let dom = {};

  function $(id){ return document.getElementById(id); }

  function bindUI() {
    dom.trackBtn = $('an-track');
    dom.trackBtn.addEventListener('click', onTrack);

    dom.refresh = $('an-refresh');
    dom.refresh.addEventListener('click', refreshAll);

    dom.export = $('an-export');
    dom.export.addEventListener('click', () => {
      if (window.analyticsAPI && typeof window.analyticsAPI.exportEventsCSV === 'function') {
        window.analyticsAPI.exportEventsCSV();
      } else {
        alert('Export no disponible, no analyticsAPI.');
      }
    });

    dom.cookieless = $('an-cookieless');
    dom.retention = $('an-retention');
    dom.retention.addEventListener('change', () => {
      const d = parseInt(dom.retention.value || 0, 10);
      window.analyticsAPI?.setRetentionDays?.(d);
      alert('Retención ajustada: ' + d + ' días');
    });

    // initial state
    if (window.analyticsAPI && window.analyticsAPI._getConfig) {
      const cfg = window.analyticsAPI._getConfig();
      dom.cookieless.checked = cfg.privacy?.cookieless ?? true;
      dom.retention.value = cfg.privacy?.retentionDays ?? 365;
    }
  }

  function onTrack(){
    const name = $('an-event-name').value.trim() || 'manual_event';
    let params = {};
    try { params = JSON.parse($('an-event-params').value || '{}'); } catch(e){ alert('Parámetros JSON inválidos'); return; }
    const user = $('an-event-user').value.trim() || null;
    if (window.analyticsAPI && typeof window.analyticsAPI.trackEvent === 'function') {
      window.analyticsAPI.trackEvent(name, params, user);
      alert('Evento trackeado: ' + name);
      refreshAll();
    } else {
      alert('analyticsAPI.trackEvent no disponible');
    }
  }

  async function refreshAll() {
    if (!window.analyticsAPI) return;
    const f = { from: new Date(Date.now() - 30*24*3600*1000).toISOString(), to: new Date().toISOString() };
    try {
      const overview = await window.analyticsAPI.apiGet('/api/analytics/overview', f);
      $('an-kpi-income').textContent = overview.income ? '€' + Math.round(overview.income) : '€0';
      $('an-kpi-leads').textContent = overview.leads || 0;
      $('an-kpi-conv').textContent = (Math.round((overview.conv || 0) * 10000)/100) + '%';

      const ts = await window.analyticsAPI.apiGet('/api/analytics/timeseries', Object.assign({}, f, { metric: 'income' }));
      // detect trends
      const series = ts.labels.map((l,i) => ({ label: l, value: ts.values[i] || 0 }));
      const trends = window.analyticsAPI.detectTrends ? window.analyticsAPI.detectTrends(series) : [];
      $('an-trends').textContent = JSON.stringify(trends, null, 2);

      const top = await window.analyticsAPI.apiGet('/api/analytics/top-sources', f);
      const topEl = $('an-top-events'); topEl.innerHTML = '';
      (top.items || []).slice(0,8).forEach(it => { const d=document.createElement('div'); d.textContent = `${it.source}: €${Math.round(it.value)}`; topEl.appendChild(d); });

    } catch (err) { console.error(err); }
  }

  window.analyticsModuleAPI = window.analyticsModuleAPI || {};
  window.analyticsModuleAPI.init = async function init(params = {}) {
    if (mounted) return;
    bindUI();
    mounted = true;
    await refreshAll();
    return true;
  };

  window.analyticsModuleAPI.destroy = function destroy() {
    if (!mounted) return;
    try {
      dom.trackBtn.removeEventListener('click', onTrack);
      dom.refresh.removeEventListener('click', refreshAll);
      dom.export.removeEventListener('click', () => {});
    } catch (e) {}
    mounted = false;
    document.getElementById('app-root')?.querySelector('.module-analytics')?.remove();
  };
})();
