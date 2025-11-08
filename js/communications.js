// communications.js — registrar interacciones (emails, llamadas, reuniones) y simular apertura
(function () {
  function $id(id){ return document.getElementById(id); }
  function load(){ return DC_Storage.get('interactions', []) || []; }

  function render(){
    const tb = $id('interactions-tbody');
    if (!tb) return;
    const items = load().slice().sort((a,b)=> new Date(b.timestamp) - new Date(a.timestamp));
    if (!items.length) { tb.innerHTML = '<tr><td colspan="5" class="muted">Sin eventos</td></tr>'; return; }
    tb.innerHTML = '';
    items.forEach(i => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i.type}</td><td>${i.contactId||''}</td><td>${i.subject||''}</td><td>${(new Date(i.timestamp)).toLocaleString()}</td><td>${JSON.stringify(i.meta||{})}</td>`;
      tb.appendChild(tr);
    });
  }

  function addInteraction(obj){
    const items = load();
    obj.id = 'i_' + Date.now();
    obj.timestamp = obj.timestamp || new Date().toISOString();
    items.unshift(obj);
    DC_Storage.set('interactions', items);
    // notify other modules
    window.dispatchEvent(new CustomEvent('dataconecta.interaction', { detail: obj }));
  }

  function wireUI(){
    const btn = $id('btn-log-comm');
    if (btn) btn.addEventListener('click', () => {
      const type = $id('comm-type').value;
      const contactId = $id('comm-contact').value || null;
      const subject = $id('comm-subject').value || (type === 'call' ? 'Llamada' : 'Interacción');
      addInteraction({ type, contactId, subject, body:'', meta:{} });
      $id('comm-subject').value = '';
      render();
    });
    const sim = $id('btn-sim-open');
    if (sim) sim.addEventListener('click', () => {
      // simula una apertura: busca último email sin opened y marca opened:true
      const items = load();
      const email = items.find(i => i.type === 'email' && (!i.meta || !i.meta.opened));
      if (email) {
        email.meta = email.meta || {}; email.meta.opened = true; DC_Storage.set('interactions', items); alert('Apertura simulada para ' + email.id);
        // dispatch event global para automatizaciones/analytics
        window.dispatchEvent(new CustomEvent('dataconecta.email.opened', { detail: email }));
        render();
      } else alert('No hay emails pendientes de apertura para simular');
    });
  }

  window.addEventListener('load', () => {
    render(); wireUI();
    window.addEventListener('dataconecta.change', (e) => { if (e.detail && e.detail.key === 'interactions') render(); });
  });
})();
