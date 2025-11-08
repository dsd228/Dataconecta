// Analytics completo demo — genera datos aleatorios y dibuja charts con Chart.js
(function () {
  function rand(min = 10, max = 200) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function generateSeries(days = 14) {
    const labels = [];
    const s1 = [];
    const revenue = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toISOString().slice(0,10));
      s1.push(rand(50, 300));
      revenue.push(rand(200, 2000));
    }
    return { labels, s1, revenue };
  }

  function draw() {
    const out = generateSeries(30);
    // Sessions / Visits
    const ctx1 = document.getElementById('chart-sessions').getContext('2d');
    new Chart(ctx1, {
      type: 'line',
      data: { labels: out.labels, datasets: [{ label: 'Sesiones', data: out.s1, borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,0.08)', fill:true }] },
      options: { responsive:true, plugins:{legend:{display:false}} }
    });

    // Conversions (small bars)
    const ctx2 = document.getElementById('chart-conversions-full').getContext('2d');
    new Chart(ctx2, {
      type: 'bar',
      data: { labels: out.labels, datasets: [{ label: 'Conversiones', data: out.s1.map(v=>Math.round(v*0.12)), backgroundColor:'#10b981' }] },
      options: { responsive:true, plugins:{legend:{display:false}} }
    });

    // Devices (pie)
    const ctx3 = document.getElementById('chart-devices').getContext('2d');
    new Chart(ctx3, {
      type: 'doughnut',
      data: { labels:['Desktop','Mobile','Tablet'], datasets:[{ data:[rand(40,70), rand(20,50), rand(5,15)], backgroundColor:['#2563eb','#f59e0b','#ef4444'] }] },
      options: { responsive:true }
    });

    // Revenue
    const ctx4 = document.getElementById('chart-revenue-full').getContext('2d');
    new Chart(ctx4, {
      type: 'line',
      data: { labels: out.labels, datasets: [{ label:'Ingresos', data: out.revenue, borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,0.07)', fill:true }] },
      options: { responsive:true, plugins:{legend:{display:false}} }
    });
  }

  document.getElementById('btn-refresh').addEventListener('click', () => {
    // a modo de demo regeneramos gráficos
    document.querySelectorAll('canvas').forEach(c => {
      if (c.chart) { c.chart.destroy && c.chart.destroy(); }
      // Chart.js attach happens in draw() which will re-init
    });
    draw();
  });

  // Init with default date values
  (function setDefaultDates() {
    const to = new Date();
    const from = new Date(); from.setDate(to.getDate() - 29);
    document.getElementById('to').value = to.toISOString().slice(0,10);
    document.getElementById('from').value = from.toISOString().slice(0,10);
  })();

  // Draw initial charts
  window.addEventListener('load', draw);
})();
