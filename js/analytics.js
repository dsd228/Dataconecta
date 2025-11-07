// analytics.js (mejorado)
// Usa Chart.js para mostrar funnel (conversiones por etapa) y revenue por mes.
// Añade export CSV y export PNG (descarga de imagen del canvas).

(function () {
  function monthKey(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${y}-${m}`;
  }

  function aggregateDealsByStage(deals) {
    const stages = ['Lead', 'Contacto', 'Prospecto', 'Cliente'];
    const counts = stages.map(s => deals.filter(d => d.stage === s).length);
    return { stages, counts };
  }

  function aggregateRevenueByMonth(deals) {
    const map = {};
    deals.forEach(d => {
      const key = d.createdAt ? monthKey(d.createdAt) : monthKey(new Date());
      map[key] = (map[key] || 0) + (Number(d.value) || 0);
    });
    const keys = Object.keys(map).sort();
    const values = keys.map(k => map[k]);
    return { months: keys, values };
  }

  function downloadCSV(filename, text) {
    const blob = new Blob([text], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  function downloadCanvasPNG(canvas, filename) {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  let funnelChart = null;
  let revenueChart = null;

  function renderFunnel(ctx, deals) {
    const { stages, counts } = aggregateDealsByStage(deals);
    if (funnelChart) funnelChart.destroy();
    funnelChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: stages, datasets: [{ label:'Oportunidades', data: counts, backgroundColor: ['#2b8fe6', '#16a34a', '#f59e0b', '#ef4444'] }] },
      options: { responsive:true, plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } } } }
    });
    return funnelChart;
  }

  function renderRevenue(ctx, deals) {
    const { months, values } = aggregateRevenueByMonth(deals);
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(ctx, {
      type: 'line',
      data: { labels: months, datasets: [{ label:'Ingresos', data: values, borderColor:'#16a34a', backgroundColor:'rgba(22,163,74,0.08)', fill:true, tension:0.3 }] },
      options:{ responsive:true, plugins:{legend:{display:false}} }
    });
    return revenueChart;
  }

  window.Analytics = {
    renderAll: function () {
      try {
        const ds = window.DataStore.load();
        const deals = ds.deals || [];
        const funnelCtx = document.getElementById('chart-conversions');
        const revCtx = document.getElementById('chart-revenue');
        if (funnelCtx) renderFunnel(funnelCtx, deals);
        if (revCtx) renderRevenue(revCtx, deals);
      } catch (err) { console.error('Analytics render error:', err); }
    },

    exportFunnelCSV: function () {
      const ds = window.DataStore.load();
      const deals = ds.deals || [];
      const { stages, counts } = aggregateDealsByStage(deals);
      const lines = ['stage,count', ...stages.map((s, i) => `${s},${counts[i]}`)];
      downloadCSV('funnel.csv', lines.join('\n'));
    },

    exportRevenueCSV: function () {
      const ds = window.DataStore.load();
      const deals = ds.deals || [];
      const { months, values } = aggregateRevenueByMonth(deals);
      const lines = ['month,revenue', ...months.map((m, i) => `${m},${values[i]}`)];
      downloadCSV('revenue.csv', lines.join('\n'));
    },

    exportFunnelPNG: function () { const canvas = document.getElementById('chart-conversions'); if (canvas) downloadCanvasPNG(canvas, 'funnel.png'); },
    exportRevenuePNG: function () { const canvas = document.getElementById('chart-revenue'); if (canvas) downloadCanvasPNG(canvas, 'revenue.png'); }
  };

  // compatibility alias
  window.Analytics.render = window.Analytics.renderAll;
})();
