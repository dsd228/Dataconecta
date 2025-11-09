// editor/plugins/icon-plugin.js
import { registerPlugin } from './index.js';

const iconPlugin = {
  id: 'icon-bank',
  name: 'Icon Bank (stub)',
  init(editorAPI) { this.api = editorAPI; },
  async fetchIcons() {
    // stub: return a tiny set
    return [
      { id: 'icon-heart', svg: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 21s-7-4.35-9-6.66C0.74 11.65 2.11 7 6 7c1.66 0 3 .99 3.75 2.36C10.99 7.99 12.34 7 14 7c3.89 0 5.26 4.65 3 7.34C19 16.65 12 21 12 21z"/></svg>' }
    ];
  }
};

registerPlugin(iconPlugin);
export default iconPlugin;
