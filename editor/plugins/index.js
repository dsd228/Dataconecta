// editor/plugins/index.js
// simple plugin registry for editor: register / list / load demo plugins
const registry = [];

export function registerPlugin(plugin) {
  // plugin: { id, name, init(editorAPI), uiMount(container) }
  if (!plugin || !plugin.id) throw new Error('invalid plugin');
  registry.push(plugin);
  if (plugin.init && typeof plugin.init === 'function') plugin.init(window.editorAPI || {});
  return plugin;
}

export function listPlugins() { return registry.slice(); }

// demo icon plugin loader
export async function loadIconPlugin() {
  const plugin = {
    id: 'icon-demo',
    name: 'Icons Demo',
    init(editorAPI) { this.api = editorAPI; },
    uiMount(container) {
      const div = document.createElement('div');
      div.innerHTML = `<div style="padding:6px">Icon plugin demo<br/><button class="btn small" id="insert-heart">Insert heart icon</button></div>`;
      container.appendChild(div);
      container.querySelector('#insert-heart').addEventListener('click', () => {
        if (window.editorAPI && window.editorAPI.addSVG) window.editorAPI.addSVG('<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 21s-7-4.35-9-6.66C0.74 11.65 2.11 7 6 7c1.66 0 3 .99 3.75 2.36C10.99 7.99 12.34 7 14 7c3.89 0 5.26 4.65 3 7.34C19 16.65 12 21 12 21z"/></svg>');
      });
    }
  };
  registerPlugin(plugin);
  return plugin;
}
