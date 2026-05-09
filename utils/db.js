// ContextShift — IndexedDB Conversation Library

const ContextShiftDB = {
  DB_NAME: 'contextshift',
  DB_VERSION: 1,
  STORE_NAME: 'conversations',

  _db: null,

  async open() {
    if (this._db) return this._db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, {
            keyPath: 'id',
          });
          store.createIndex('platform', 'platform', { unique: false });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('searchText', 'searchText', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this._db = event.target.result;
        resolve(this._db);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  },

  async save(conversation, handoff) {
    const db = await this.open();
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const firstMessage =
      conversation.messages[0]?.content?.slice(0, 120) || 'Empty conversation';
    const searchText = conversation.messages
      .map((m) => m.content)
      .join(' ')
      .toLowerCase()
      .slice(0, 5000);

    const record = {
      id,
      platform: conversation.platform,
      date: new Date().toISOString(),
      messageCount: conversation.messages.length,
      firstMessage,
      messages: conversation.messages,
      handoff: handoff || null,
      searchText,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.put(record);
      request.onsuccess = () => resolve(record);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async getAll(limit = 10) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const index = store.index('date');
      const request = index.openCursor(null, 'prev');
      const results = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = (e) => reject(e.target.error);
    });
  },

  async search(query) {
    const db = await this.open();
    const q = query.toLowerCase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.openCursor();
      const results = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const record = cursor.value;
          if (
            record.searchText?.includes(q) ||
            record.firstMessage?.toLowerCase().includes(q) ||
            record.platform?.toLowerCase().includes(q)
          ) {
            results.push(record);
          }
          cursor.continue();
        } else {
          results.sort((a, b) => new Date(b.date) - new Date(a.date));
          resolve(results.slice(0, 20));
        }
      };

      request.onerror = (e) => reject(e.target.error);
    });
  },

  async get(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async delete(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async clearAll() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  },
};

if (typeof window !== 'undefined') {
  window.ContextShiftDB = ContextShiftDB;
}
