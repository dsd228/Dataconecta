// analytics.js
// Builds simple charts (Chart.js) based on DataStore contents
(function(){
  function buildConversionChart(ctx, data){
    const labels = data.stages || ['Lead','Contacto','Prospecto','Cliente'];
    const values = labels.map(s => (data.deals || []).filter(d=>d.stage===s).length);
    return new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label:'Oportunidades por etapa', data: values, backgroundColor: '#2b8fe6' }] },
      options: { responsive:true, plugins:{legend:{display:false}} }
    });
  }
  function buildRevenueChart(ctx, data){
    const months = data.months || ['Ene','Feb','Mar','Abr','May','Jun'];
    const values = months.map(()=> Math.floor(Math.random()*5000)); // placeholder simulated, use deals for real
    return new Chart(ctx, {
      type: 'line',
      data: { labels: months, datasets: [{ label:'Ingresos', data: values, borderColor:'#16a34a', backgroundColor:'rgba(22,163,74,0.08)', fill:true }] },
      options:{ responsive:true }
    });
  }

  window.Analytics = {
    render(){
      try{
        const convCtx = document.getElementById('chart-conversions');
        const revCtx = document.getElementById('chart-revenue');
        if(convCtx && revCtx){
          const ds = window.DataStore.load();
          // destroy previous charts if exist
          if(window._convChart) window._convChart.destroy();
          if(window._revChart) window._revChart.destroy();
          window._convChart = buildConversionChart(convCtx, { deals: ds.deals });
          window._revChart = buildRevenueChart(revCtx, {});
        }
      }catch(e){ console.warn('analytics render err', e); }
    }
  };
})();
