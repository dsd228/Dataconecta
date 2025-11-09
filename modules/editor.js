// Import Fabric.js desde CDN si no está cargado
if (!window.fabric) {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';
  document.head.appendChild(s);
}

window.editorAPI = {
  canvas: null,
  currentTool: 'select',

  async init() {
    await new Promise(r => {
      const check = () => window.fabric ? r() : setTimeout(check, 100);
      check();
    });

    const canvasEl = document.getElementById('editor-canvas');
    this.canvas = new fabric.Canvas(canvasEl, {
      backgroundColor: '#fff',
      selection: true
    });

    // Selección de herramienta
    document.querySelectorAll('.tool').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentTool = btn.dataset.tool;
      });
    });

    // Exportar JSON
    document.getElementById('export-json').addEventListener('click', () => {
      const json = JSON.stringify(this.canvas.toJSON());
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'design.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    // Click en el lienzo
    this.canvas.on('mouse:down', (opt) => {
      const pointer = this.canvas.getPointer(opt.e);
      switch (this.currentTool) {
        case 'rect': {
          const rect = new fabric.Rect({
            left: pointer.x, top: pointer.y,
            width: 100, height: 60,
            fill: '#4f46e5', opacity: 0.8
          });
          this.canvas.add(rect);
          break;
        }
        case 'circle': {
          const circ = new fabric.Circle({
            left: pointer.x, top: pointer.y,
            radius: 40, fill: '#10b981', opacity: 0.8
          });
          this.canvas.add(circ);
          break;
        }
        case 'text': {
          const text = new fabric.IText('Texto', {
            left: pointer.x, top: pointer.y,
            fontFamily: 'Inter', fill: '#111'
          });
          this.canvas.add(text);
          break;
        }
        case 'image': {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (f) => {
              fabric.Image.fromURL(f.target.result, (img) => {
                img.scaleToWidth(200);
                this.canvas.add(img);
              });
            };
            reader.readAsDataURL(file);
          };
          input.click();
          break;
        }
      }
    });

    // Mostrar propiedades
    this.canvas.on('selection:created', (e) => this.showProperties(e.selected[0]));
    this.canvas.on('selection:updated', (e) => this.showProperties(e.selected[0]));
    this.canvas.on('selection:cleared', () => {
      document.getElementById('properties-panel').innerHTML = 'Selecciona un elemento';
    });

    console.log('✅ Editor UX/UI Pro inicializado');
  },

  showProperties(obj) {
    const panel = document.getElementById('properties-panel');
    panel.innerHTML = `
      <p><strong>Tipo:</strong> ${obj.type}</p>
      <p><strong>Color:</strong> <input type="color" id="prop-color" value="${obj.fill || '#ffffff'}"></p>
      <p><strong>Opacidad:</strong> <input type="range" id="prop-opacity" min="0" max="1" step="0.1" value="${obj.opacity || 1}"></p>
    `;

    panel.querySelector('#prop-color').addEventListener('input', e => {
      obj.set('fill', e.target.value);
      this.canvas.renderAll();
    });

    panel.querySelector('#prop-opacity').addEventListener('input', e => {
      obj.set('opacity', parseFloat(e.target.value));
      this.canvas.renderAll();
    });
  },

  async destroy() {
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
    }
  }
};
