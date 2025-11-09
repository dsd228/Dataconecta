// --- Insertar / reemplazar en modules/editor.js dentro de initEditor() después de crear fabricCanvas ---

// Function to resize fabric canvas to wrapper size (handles DPR and overlays)
function resizeCanvasToWrapper() {
  try {
    const wrap = document.getElementById('canvas-wrap') || document.querySelector('.canvas-wrap');
    if (!wrap || !fabricCanvas) return;

    // Logical CSS size
    const rect = wrap.getBoundingClientRect();
    const cssWidth = Math.max(320, Math.floor(rect.width));
    const cssHeight = Math.max(240, Math.floor(rect.height));

    // Device pixel ratio for crispness
    const dpr = window.devicePixelRatio || 1;

    // Set the canvas element size (backing store) using DPR
    const canvasEl = fabricCanvas.getElement ? fabricCanvas.getElement() : document.getElementById(fabricCanvas.lowerCanvasEl?.id || fabricCanvas.upperCanvasEl?.id || 'canvas');
    if (!canvasEl) return;

    // Update element style to fill wrapper (redundant with CSS but safe)
    canvasEl.style.width = cssWidth + 'px';
    canvasEl.style.height = cssHeight + 'px';

    // Set actual pixel resolution
    canvasEl.width = Math.round(cssWidth * dpr);
    canvasEl.height = Math.round(cssHeight * dpr);

    // Tell fabric to use scaled dimensions
    fabricCanvas.setWidth(cssWidth * dpr);
    fabricCanvas.setHeight(cssHeight * dpr);
    // Keep visual scale at 1 for fabric; adjust viewportTransform to compensate DPR
    fabricCanvas.setZoom(1 * dpr);
    // Reset viewport transform so objects aren't unexpectedly scaled (optional)
    // fabricCanvas.viewportTransform = [dpr,0,0,dpr,0,0];

    // If you prefer not to change zoom, instead scale context:
    // fabricCanvas.getContext().scale(dpr, dpr);

    // Update overlays (heatmap, realtime cursor canvas)
    const heat = wrap.querySelector('.heatmap-overlay') || document.getElementById('ed-heatmap-overlay');
    if (heat) {
      heat.style.width = cssWidth + 'px';
      heat.style.height = cssHeight + 'px';
      heat.width = Math.round(cssWidth * dpr);
      heat.height = Math.round(cssHeight * dpr);
    }
    const rc = wrap.querySelector('#realtime-cursors') || document.getElementById('realtime-cursors');
    if (rc) {
      rc.style.width = cssWidth + 'px';
      rc.style.height = cssHeight + 'px';
      rc.width = Math.round(cssWidth * dpr);
      rc.height = Math.round(cssHeight * dpr);
    }

    // Re-render fabric after resize
    fabricCanvas.requestRenderAll();
  } catch (e) {
    console.warn('resizeCanvasToWrapper error', e);
  }
}

// Debounced resize handler
let __resizeTimer = null;
function scheduleResize() {
  clearTimeout(__resizeTimer);
  __resizeTimer = setTimeout(() => {
    resizeCanvasToWrapper();
  }, 80);
}

// Call once on init after fabricCanvas created
resizeCanvasToWrapper();
// Listen window resize and container mutations (for shell layout changes)
window.addEventListener('resize', scheduleResize);

// Optional: observe wrapper size changes (useful when shell dynamic layout modifies dimensions)
const wrapEl = document.getElementById('canvas-wrap') || document.querySelector('.canvas-wrap');
if (wrapEl && typeof ResizeObserver !== 'undefined') {
  const ro = new ResizeObserver(() => scheduleResize());
  ro.observe(wrapEl);
  // store observer to disconnect on destroy
  window.__editorResizeObserver = ro;
}
