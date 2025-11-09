// editor/yjs-sync.js
// Basic Yjs integration for canvas state synchronization.
// Uses y-websocket client to connect to the server's /yjs endpoint.
// client: `import * as Y from 'yjs'; import { WebsocketProvider } from 'y-websocket'`
// For simplicity we use global scripts (yjs and y-websocket via CDN) or your bundler.
//
// Approach: maintain a Y.Map 'canvas' with a 'json' string containing the latest canvas.toJSON().
// On local canvas changes we set map.set('json', JSON.stringify(canvas.toJSON()))
// On remote updates we load JSON into fabric via canvas.loadFromJSON(...).
//
// This is NOT a perfect per-object CRDT binding but provides robust conflict resolution via last-writer pattern on the shared map.
// For production consider fabric-yjs bindings (community libraries) or per-object CRDT merges.

export async function setupYjsSync({ canvas, docName = 'default-doc', serverUrl }) {
  if (!window.Y || !window.yws) {
    console.warn('Yjs or y-websocket client not found. Include via CDN or bundler.');
    // try dynamic load of CDN scripts
    await new Promise((resolve) => {
      const s1 = document.createElement('script');
      s1.src = 'https://unpkg.com/yjs@13.5.50/dist/yjs.js';
      s1.onload = () => {
        const s2 = document.createElement('script');
        s2.src = (serverUrl || '') + '/yjs'; // not valid CDN, but prefer bundler; user should include y-websocket client
        s2.onload = resolve;
        s2.onerror = resolve;
        document.head.appendChild(s2);
      };
      s1.onerror = resolve;
      document.head.appendChild(s1);
    });
  }

  // if still not available bail
  if (!window.Y) {
    throw new Error('Yjs client not available. Add yjs and y-websocket client libs.');
  }

  // create doc & provider
  const Y = window.Y;
  const providerCtor = window.WebsocketProvider || (window.yws && window.yws.WebsocketProvider);
  if (!providerCtor) {
    console.warn('y-websocket client constructor not found. Please include y-websocket client.');
  }
  const doc = new Y.Doc();
  const provider = providerCtor ? new providerCtor(serverUrl || (location.origin.replace(/^http/, 'ws') + '/yjs'), docName, doc) : null;

  const ymap = doc.getMap('canvas');

  // flag to prevent echo
  let applyingRemote = false;

  // listen remote changes
  ymap.observeDeep(() => {
    const jsonStr = ymap.get('json');
    if (!jsonStr) return;
    if (applyingRemote) return;
    try {
      applyingRemote = true;
      const parsed = JSON.parse(jsonStr);
      canvas.loadFromJSON(parsed, () => { canvas.renderAll(); applyingRemote = false; });
    } catch (e) { console.warn('yjs load parse error', e); applyingRemote = false; }
  });

  // push local changes (debounced)
  let txTimer = null;
  function pushLocal() {
    if (applyingRemote) return;
    clearTimeout(txTimer);
    txTimer = setTimeout(() => {
      try {
        const json = canvas.toJSON(['__objectId','__componentId','__isInstance','__overrides']);
        const str = JSON.stringify(json);
        ymap.set('json', str);
      } catch (e) { console.warn('pushLocal error', e); }
    }, 200);
  }

  canvas.on('object:added', pushLocal);
  canvas.on('object:modified', pushLocal);
  canvas.on('object:removed', pushLocal);

  return { doc, provider, ymap, destroy: () => { canvas.off('object:added', pushLocal); canvas.off('object:modified', pushLocal); canvas.off('object:removed', pushLocal); provider && provider.disconnect(); doc && doc.destroy(); } };
}
