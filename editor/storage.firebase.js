// editor/storage.firebase.js
// Firebase adapter (stub). To use enable Firebase in your project and fill in config.
//
// npm install firebase
//
// Example usage:
// import { firebaseAdapter } from './storage.firebase.js';
// await firebaseAdapter.init({ apiKey: '...', authDomain: '...', projectId: '...' });
// await firebaseAdapter.saveProject('demo', data);

export const firebaseAdapter = {
  app: null,
  db: null,
  async init(config) {
    if (!config) throw new Error('Provide Firebase config object');
    // lazy import to avoid bundler issues in demo
    const firebase = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js');
    const firestore = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
    this.app = firebase.initializeApp(config);
    this.db = firestore.getFirestore(this.app);
    return true;
  },
  async saveProject(name, data) {
    if (!this.db) throw new Error('Firebase not initialized');
    // sample: set document at projects/{name}
    // const { doc, setDoc } = await import('firebase/firestore');
    // await setDoc(doc(this.db, 'projects', name), { data, updatedAt: new Date().toISOString() });
    console.info('firebaseAdapter.saveProject stub for', name);
    return true;
  },
  async loadProject(name) {
    console.info('firebaseAdapter.loadProject stub for', name);
    return null;
  }
};
