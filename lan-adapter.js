(function () {
  if (new URLSearchParams(location.search).get('lan') !== '1') return;

  const api = '/api';
  const subscriptions = new Map();
  const timestampValue = {'.sv':'timestamp'};

  function normalizedPath(path) {
    return String(path || '').split('/').filter(Boolean).join('/');
  }

  function makeSnapshot(path, value) {
    return {
      key:path.split('/').filter(Boolean).pop() || null,
      val:() => value == null ? null : value,
      exists:() => value != null
    };
  }

  async function request(method, path, body) {
    const response = await fetch(api + '/data?path=' + encodeURIComponent(path), {
      method,
      headers:body === undefined ? {} : {'Content-Type':'application/json'},
      body:body === undefined ? undefined : JSON.stringify(body)
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'LAN server request failed (' + response.status + ').');
    }
    if (response.status === 204) return null;
    return response.json();
  }

  class LocalReference {
    constructor(path, limit) {
      this.path = normalizedPath(path);
      this.key = this.path.split('/').filter(Boolean).pop() || null;
      this.limit = limit || null;
    }

    child(path) {
      return new LocalReference([this.path, normalizedPath(path)].filter(Boolean).join('/'), this.limit);
    }

    limitToLast(limit) {
      return new LocalReference(this.path, limit);
    }

    async get() {
      let value = await request('GET', this.path);
      if (this.limit && value && typeof value === 'object') {
        value = Object.fromEntries(Object.entries(value).slice(-this.limit));
      }
      return makeSnapshot(this.path, value);
    }

    async set(value) {
      await request('PUT', this.path, value);
    }

    async update(values) {
      await request('PATCH', this.path, values);
    }

    async remove() {
      await request('DELETE', this.path);
    }

    push(value) {
      const randomKey = globalThis.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      const key = 'lan-' + randomKey;
      const ref = this.child(key);
      if (value !== undefined) return ref.set(value).then(() => ref);
      return ref;
    }

    on(event, callback) {
      if (event !== 'value' && event !== 'child_added') {
        throw new Error('Unsupported LAN database event: ' + event);
      }
      const subscriptionKey = this.path + ':' + event;
      let listeners = subscriptions.get(subscriptionKey);
      if (!listeners) {
        listeners = new Map();
        subscriptions.set(subscriptionKey, listeners);
        const source = new EventSource(api + '/events?path=' + encodeURIComponent(this.path));
        listeners.source = source;
        let previous = new Set();
        source.onmessage = message => {
          const value = JSON.parse(message.data);
          if (event === 'value') {
            listeners.forEach(listener => listener(makeSnapshot(this.path, value)));
            return;
          }
          let entries = value && typeof value === 'object' ? Object.entries(value) : [];
          if (this.limit) entries = entries.slice(-this.limit);
          const current = new Set(entries.map(([key]) => key));
          entries.forEach(([key, childValue]) => {
            if (!previous.has(key)) {
              const snapshot = makeSnapshot([this.path, key].filter(Boolean).join('/'), childValue);
              snapshot.key = key;
              listeners.forEach(listener => listener(snapshot));
            }
          });
          previous = current;
        };
      }
      listeners.set(callback, callback);
      return callback;
    }

    off(event, callback) {
      const subscriptionKey = this.path + ':' + event;
      const listeners = subscriptions.get(subscriptionKey);
      if (!listeners) return;
      if (callback) listeners.delete(callback);
      else listeners.clear();
      if (!listeners.size) {
        listeners.source.close();
        subscriptions.delete(subscriptionKey);
      }
    }

    onDisconnect() {
      return {remove:async () => {}, cancel:async () => {}};
    }
  }

  const database = {ref:path => new LocalReference(path)};
  window.firebase = {
    initializeApp:() => ({database:() => database, auth:() => firebaseAuth}),
    database:{ServerValue:{TIMESTAMP:timestampValue}},
    auth:() => firebaseAuth
  };
  const firebaseAuth = {currentUser:null, signInAnonymously:async () => {
    firebaseAuth.currentUser = {uid:'lan-user'};
    return {user:firebaseAuth.currentUser};
  }};
})();
