// editor/state.js
// central state management: history (undo/redo), selection and component registry
export function createState({ canvas }) {
  const state = {
    components: [], // saved components { id, name, json }
    history: { undo: [], redo: [], limit: 80 },
    selection: null,
    tokens: { primary: '#4f46e5', font: 'Inter, system-ui' },
    prototypeLinks: [] // { fromObjectId, toPageId, animation }
  };

  function pushHistory() {
    try {
      const snapshot = canvas.toJSON(['__componentId','__objectId','__isInstance','__overrides']);
      state.history.undo.push(snapshot);
      if (state.history.undo.length > state.history.limit) state.history.undo.shift();
      state.history.redo = [];
    } catch(e) { console.warn('pushHistory', e); }
  }

  function undo() {
    if (!state.history.undo.length) return;
    try {
      const last = state.history.undo.pop();
      state.history.redo.push(canvas.toJSON());
      canvas.loadFromJSON(last, () => canvas.renderAll());
    } catch(e){ console.warn('undo', e); }
  }

  function redo() {
    if (!state.history.redo.length) return;
    try {
      const next = state.history.redo.pop();
      state.history.undo.push(canvas.toJSON());
      canvas.loadFromJSON(next, () => canvas.renderAll());
    } catch(e){ console.warn('redo', e); }
  }

  function registerComponent(name, json) {
    const id = 'comp_' + Math.random().toString(36).slice(2,9);
    state.components.unshift({ id, name, json });
    return id;
  }

  function listComponents() { return state.components.slice(); }

  function saveTokens(tokens) { state.tokens = Object.assign(state.tokens, tokens); }

  function addPrototypeLink(fromId, toId, animation='instant') {
    state.prototypeLinks.push({ id: 'link_'+Math.random().toString(36).slice(2,8), from: fromId, to: toId, animation });
  }

  return {
    state,
    pushHistory,
    undo,
    redo,
    registerComponent,
    listComponents,
    saveTokens,
    addPrototypeLink
  };
}
