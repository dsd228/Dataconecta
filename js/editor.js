// Editor completo mínimo con Fabric.js
(function () {
  const canvasEl = document.getElementById('canvas');
  if (!canvasEl) return;
  // Ajuste de tamaño del canvas
  function resizeCanvas() {
    canvasEl.width = window.innerWidth - 320; // panel width
    canvasEl.height = window.innerHeight - 52; // header height
    if (window.fabricCanvas) {
      window.fabricCanvas.setWidth(canvasEl.width);
      window.fabricCanvas.setHeight(canvasEl.height);
      window.fabricCanvas.renderAll();
    }
  }

  const fabricCanvas = new fabric.Canvas('canvas', {
    backgroundColor: '#fff',
    selection: true
  });
  window.fabricCanvas = fabricCanvas;
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Helpers
  function addRect() {
    const rect = new fabric.Rect({
      left: 60, top: 60, fill: '#4f46e5', width: 160, height: 100, rx: 6, ry: 6
    });
    fabricCanvas.add(rect).setActiveObject(rect);
  }

  function addCircle() {
    const c = new fabric.Circle({
      left: 120, top: 120, radius: 50, fill: '#ef4444'
    });
    fabricCanvas.add(c).setActiveObject(c);
  }

  function addText() {
    const t = new fabric.Textbox('Nuevo texto', {
      left: 80, top: 200, width: 200, fontSize: 18, fill: '#111827'
    });
    fabricCanvas.add(t).setActiveObject(t);
  }

  // Wire UI
  document.getElementById('btn-add-rect').addEventListener('click', addRect);
  document.getElementById('btn-add-circle').addEventListener('click', addCircle);
  document.getElementById('btn-add-text').addEventListener('click', addText);
  document.getElementById('btn-delete').addEventListener('click', () => {
    const obj = fabricCanvas.getActiveObject();
    if (obj) fabricCanvas.remove(obj);
  });

  const selInfo = document.getElementById('selected-info');
  const propText = document.getElementById('prop-text');
  const propFill = document.getElementById('prop-fill');

  function updateSelectedInfo() {
    const obj = fabricCanvas.getActiveObject();
    if (!obj) {
      selInfo.textContent = 'Ninguno';
      propText.value = '';
      propFill.value = '#000000';
      return;
    }
    selInfo.textContent = obj.type + (obj.text ? ` — "${obj.text}"` : '');
    if (obj.text) propText.value = obj.text;
    try {
      propFill.value = obj.fill || '#000000';
    } catch (e) {}
  }

  fabricCanvas.on('selection:created', updateSelectedInfo);
  fabricCanvas.on('selection:updated', updateSelectedInfo);
  fabricCanvas.on('selection:cleared', updateSelectedInfo);
  fabricCanvas.on('object:modified', updateSelectedInfo);

  propText.addEventListener('input', () => {
    const obj = fabricCanvas.getActiveObject();
    if (obj && obj.set) {
      if ('text' in obj || 'text' in obj) {
        obj.text = propText.value;
        obj.set('text', propText.value);
        fabricCanvas.requestRenderAll();
      }
    }
  });

  propFill.addEventListener('input', () => {
    const obj = fabricCanvas.getActiveObject();
    if (obj && obj.set) {
      obj.set('fill', propFill.value);
      fabricCanvas.requestRenderAll();
    }
  });

  // Export / Import
  document.getElementById('btn-export-png').addEventListener('click', () => {
    const dataURL = fabricCanvas.toDataURL({ format: 'png', multiplier: 2 });
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'canvas.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  document.getElementById('btn-export-json').addEventListener('click', () => {
    const json = JSON.stringify(fabricCanvas.toJSON());
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvas.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

})();
