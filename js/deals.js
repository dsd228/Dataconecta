// deals.js — pipeline simple con drag & drop y forecast básico
(function () {
  function $id(id){ return document.getElementById(id); }
  let allDeals = [];
  const STAGES = ['new','contacted','proposal','negotiation','won','lost'];

  function load(){ allDeals = DC_Storage.get('deals', []) || []; render(); }

  function render(){
    const pipeline = $id('pipeline');
    if (!pipeline) return;
    pipeline.innerHTML = '';
    STAGES.forEach(stage => {
      const col = document.createElement('div'); col.className = 'col';
      col.dataset.stage = stage;
      col.innerHTML = `<h4 style="text-transform:capitalize">${stage}</h4><div class="col-body"></div>`;
      const body = col.querySelector('.col-body');
      const cards = allDeals.filter(d => (d.stage||'new') === stage);
      cards.forEach(d => {
        const card = document.createElement('div'); card.className = 'card'; card.draggable = true; card.dataset.id = d.id;
        card.innerHTML = `<strong>${d.title||'(sin título)'}</strong><div class="small muted">$${Number(d.amount||0).toLocaleString()}</div>`;
        body.appendChild(card);
      });
      pipeline.appendChild(col);
    });
    // wire DnD
    pipeline.querySelectorAll('.card').forEach(c => {
      c.addEventListener('dragstart', (ev) => ev.dataTransfer.setData('text/plain', c.dataset.id));
    });
    pipeline.querySelectorAll('.col').forEach(col => {
      col.addEventListener('dragover', ev => ev.preventDefault());
      col.addEventListener('drop', ev => {
        ev.preventDefault();
        const id = ev.dataTransfer.getData('text/plain');
        const stage = col.dataset.stage;
        moveDeal(id, stage);
      });
    });
  }

  function moveDeal(id, stage){
    const d = allDeals.find(x=>x.id===id);
    if (!d) return;
    d.stage = stage;
    if (stage === 'won') d.closedAt = new Date().toISOString(), d.won = true;
    DC_Storage.set('deals', allDeals);
    render();
  }

  function newDeal(){
    const title = prompt('Título de la oportunidad:');
    if (!title) return;
    const amount = Number(prompt('Importe (número):', '0')) || 0;
    const obj = { id:'d_' + Date.now(), title, amount, stage:'new', createdAt:new Date().toISOString(), won:false };
    allDeals.unshift(obj); DC_Storage.set('deals', allDeals); render();
  }

  window.addEventListener('load', () => {
    load();
    const btn = $id('btn-new-deal'); if (btn) btn.addEventListener('click', newDeal);
    window.addEventListener('dataconecta.change', (e) => { if (e.detail && e.detail.key === 'deals') load(); });
  });
})();
