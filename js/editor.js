// Simple local editor module for DataConecta
// Persiste en localStorage bajo la clave "dataconecta-editor-content"
// Provee guardar, cargar ejemplo, exportar e importar.

(function () {
  const KEY = 'dataconecta-editor-content';
  const editorId = 'editor';
  const saveBtnId = 'editor-save';
  const sampleBtnId = 'editor-load-sample';
  const exportBtnId = 'editor-export';
  const importBtnId = 'editor-import';
  const importFileId = 'editor-import-file';
  const statusId = 'editor-status';
  const saveIndicatorId = 'save-indicator';

  function qs(id) { return document.getElementById(id); }

  function setStatus(text, timeout = 2500) {
    const el = qs(statusId);
    if (!el) return;
    el.textContent = text;
    if (timeout) {
      clearTimeout(el._t);
      el._t = setTimeout(() => { el.textContent = '—'; }, timeout);
    }
  }

  function setGlobalSaveIndicator(text) {
    const si = qs(saveIndicatorId);
    if (!si) return;
    si.textContent = text;
  }

  function load() {
    const raw = localStorage.getItem(KEY);
    if (raw != null) {
      qs(editorId).value = raw;
      setStatus('Contenido cargado desde local');
    } else {
      setStatus('No hay contenido guardado aún');
    }
  }

  function save() {
    const val = qs(editorId).value;
    localStorage.setItem(KEY, val);
    setStatus('Guardado en localStorage');
    setGlobalSaveIndicator('Guardado ✓');
    setTimeout(() => setGlobalSaveIndicator('—'), 1200);
  }

  function loadSample() {
    const sample = `# Plantilla de email\n\nHola {{nombre}},\n\nGracias por tu interés en nuestros servicios. Adjunto encontrarás la propuesta.\n\nSaludos,\nEquipo DataConecta\n`;
    qs(editorId).value = sample;
    setStatus('Ejemplo cargado (recuerda guardar si deseas mantenerlo)');
  }

  function exportContent() {
    const content = qs(editorId).value || '';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dataconecta-editor.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('Exportado como dataconecta-editor.txt');
  }

  function importFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      qs(editorId).value = String(e.target.result);
      setStatus(`Importado: ${file.name} (recuerda guardar)`);
    };
    reader.onerror = function () {
      setStatus('Error leyendo el archivo');
    };
    reader.readAsText(file, 'utf-8');
  }

  function init() {
    const editor = qs(editorId);
    if (!editor) return;

    // Buttons
    const saveBtn = qs(saveBtnId);
    const sampleBtn = qs(sampleBtnId);
    const exportBtn = qs(exportBtnId);
    const importBtn = qs(importBtnId);
    const importFile = qs(importFileId);

    // Load existing content
    load();

    // Wire events
    if (saveBtn) saveBtn.addEventListener('click', save);
    if (sampleBtn) sampleBtn.addEventListener('click', loadSample);
    if (exportBtn) exportBtn.addEventListener('click', exportContent);
    if (importBtn && importFile) importBtn.addEventListener('click', () => importFile.click());
    if (importFile) importFile.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) importFromFile(file);
      // reset input to allow re-importing same file later
      importFile.value = '';
    });

    // Auto-save debounce while typing
    let t;
    editor.addEventListener('input', () => {
      setGlobalSaveIndicator('Guardando…');
      clearTimeout(t);
      t = setTimeout(() => {
        localStorage.setItem(KEY, editor.value);
        setGlobalSaveIndicator('Guardado ✓');
        setTimeout(() => setGlobalSaveIndicator('—'), 900);
      }, 800);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
