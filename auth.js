// Google Drive auth + per-module JSON storage with in-memory offline queue.
const Auth = (() => {
  const CLIENT_ID = '823247782356-5nvuvgcfs2m6ltpm32vt941h7i2m25oj.apps.googleusercontent.com';
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';
  let token = null;
  let tokenClient = null;
  const listeners = [];

  function onChange(fn) { listeners.push(fn); fn(!!token); }
  function emit() { listeners.forEach(fn => fn(!!token)); }

  function ensureClient() {
    if (tokenClient || !window.google) return;
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: resp => {
        if (resp.access_token) {
          token = resp.access_token;
          emit();
          Store.flushQueue();
        }
      }
    });
  }

  function signIn() {
    ensureClient();
    if (!tokenClient) { toast('Google sign-in not loaded yet'); return; }
    tokenClient.requestAccessToken({ prompt: token ? '' : 'consent' });
  }

  function signOut() {
    if (token) google.accounts.oauth2.revoke(token, () => {});
    token = null;
    emit();
  }

  function toggle() { token ? signOut() : signIn(); }
  function getToken() { return token; }
  function isSignedIn() { return !!token; }

  return { onChange, toggle, getToken, isSignedIn };
})();

const Store = (() => {
  const API = 'https://www.googleapis.com/drive/v3';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
  let folderId = null;
  const fileIds = {};   // module -> drive file id
  const cache = {};     // module -> data (in-memory, survives offline)
  const queue = [];     // pending writes: module names
  let flushing = false;

  function headers() {
    return { Authorization: 'Bearer ' + Auth.getToken(), 'Content-Type': 'application/json' };
  }

  async function gfetch(url, opts = {}) {
    const res = await fetch(url, { ...opts, headers: { ...headers(), ...(opts.headers || {}) } });
    if (!res.ok) throw new Error('Drive API ' + res.status);
    return res;
  }

  async function ensureFolder() {
    if (folderId) return folderId;
    const q = encodeURIComponent("name='LifeOS' and mimeType='application/vnd.google-apps.folder' and trashed=false");
    const found = await (await gfetch(`${API}/files?q=${q}&fields=files(id)`)).json();
    if (found.files.length) { folderId = found.files[0].id; return folderId; }
    const created = await (await gfetch(`${API}/files`, {
      method: 'POST',
      body: JSON.stringify({ name: 'LifeOS', mimeType: 'application/vnd.google-apps.folder' })
    })).json();
    folderId = created.id;
    return folderId;
  }

  async function ensureFile(module) {
    if (fileIds[module]) return fileIds[module];
    const folder = await ensureFolder();
    const name = module + '.json';
    const q = encodeURIComponent(`name='${name}' and '${folder}' in parents and trashed=false`);
    const found = await (await gfetch(`${API}/files?q=${q}&fields=files(id)`)).json();
    if (found.files.length) { fileIds[module] = found.files[0].id; return fileIds[module]; }
    const created = await (await gfetch(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/related; boundary=lifeos' },
      body: [
        '--lifeos',
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify({ name, parents: [folder] }),
        '--lifeos',
        'Content-Type: application/json',
        '',
        JSON.stringify([]),
        '--lifeos--'
      ].join('\r\n')
    })).json();
    fileIds[module] = created.id;
    return created.id;
  }

  async function load(module) {
    if (cache[module] !== undefined) return cache[module];
    if (!Auth.isSignedIn() || !navigator.onLine) { cache[module] = []; return cache[module]; }
    try {
      const id = await ensureFile(module);
      const data = await (await gfetch(`${API}/files/${id}?alt=media`)).json();
      cache[module] = Array.isArray(data) ? data : [];
    } catch {
      cache[module] = cache[module] || [];
    }
    return cache[module];
  }

  async function save(module, data) {
    cache[module] = data;
    if (!Auth.isSignedIn() || !navigator.onLine) {
      if (!queue.includes(module)) queue.push(module);
      toast('Saved locally — will sync when online');
      return;
    }
    try {
      const id = await ensureFile(module);
      await gfetch(`${UPLOAD}/files/${id}?uploadType=media`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    } catch {
      if (!queue.includes(module)) queue.push(module);
      toast('Sync failed — queued');
    }
  }

  async function flushQueue() {
    if (flushing || !Auth.isSignedIn() || !navigator.onLine) return;
    flushing = true;
    while (queue.length) {
      const module = queue.shift();
      try {
        const id = await ensureFile(module);
        await gfetch(`${UPLOAD}/files/${id}?uploadType=media`, {
          method: 'PATCH',
          body: JSON.stringify(cache[module])
        });
      } catch {
        queue.unshift(module);
        break;
      }
    }
    flushing = false;
    if (!queue.length) toast('Synced');
  }

  window.addEventListener('online', flushQueue);

  return { load, save, flushQueue };
})();

// shared helpers
const $ = (sel, root = document) => root.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtMoney = n => (n < 0 ? '-' : '') + '₪' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
