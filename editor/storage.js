// editor/storage.js
// simple storage layer supporting localStorage and a pluggable cloud adapter (stub)
export const storage = {
  saveProject(key, data) {
    try {
      localStorage.setItem('editor:project:' + key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('saveProject error', e);
      return false;
    }
  },

  loadProject(key) {
    try {
      const s = localStorage.getItem('editor:project:' + key);
      return s ? JSON.parse(s) : null;
    } catch (e) {
      console.warn('loadProject error', e);
      return null;
    }
  },

  listProjects() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('editor:project:')) out.push(k.replace('editor:project:', ''));
    }
    return out;
  },

  // cloud adapter stub (to be implemented server-side)
  async uploadProject(key, data, opts = {}) {
    // placeholder: would POST to backend
    console.info('uploadProject stub', key);
    return { ok: true };
  },

  async downloadProject(key, opts = {}) {
    console.info('downloadProject stub', key);
    return null;
  }
};
