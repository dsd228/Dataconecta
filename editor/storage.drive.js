// editor/storage.drive.js
// Google Drive adapter stub for uploads. Implement OAuth2 server-side exchange and use Drive API.
//
// This file is a client-side helper showing how you'd upload a Blob to Drive via your backend which holds credentials.
// The recommended flow: user authenticates with Google OAuth, obtains an access token via your backend, then client POSTs file to your backend, backend uploads to Drive.

export const driveAdapter = {
  async uploadFileToDrive({ backendUploadUrl, file, metadata = {} }) {
    // backendUploadUrl: POST endpoint that expects multipart/form-data or JSON
    const form = new FormData();
    form.append('file', file);
    form.append('metadata', JSON.stringify(metadata));
    const res = await fetch(backendUploadUrl, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Upload failed: ' + res.status);
    return await res.json();
  }
};
