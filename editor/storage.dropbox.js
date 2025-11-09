// editor/storage.dropbox.js
// Dropbox adapter stub. Use Dropbox SDK or server-side token flow.
// Example client-side upload to your server, server exchanges/upload to Dropbox.

export const dropboxAdapter = {
  async uploadProject({ backendUrl, name, dataBlob }) {
    const form = new FormData();
    form.append('file', dataBlob, name + '.json');
    const res = await fetch(backendUrl + '/upload/dropbox', { method: 'POST', body: form });
    if (!res.ok) throw new Error('Dropbox upload failed');
    return res.json();
  }
};
