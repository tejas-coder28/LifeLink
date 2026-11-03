/**
 * server/tests/helpers/inMemoryFirestore.js
 *
 * Isolated In-Memory Firestore & Auth Test Double for Jest automated tests.
 * STRICTLY restricted to testing (NODE_ENV === 'test').
 * Completely isolated from real Firebase credentials to guarantee tests never write to cloud.
 */

const crypto = require('crypto');

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[part];
  }
  return curr;
}

class InMemoryDocSnapshot {
  constructor(id, data, ref) {
    this.id = id;
    this._data = data ? JSON.parse(JSON.stringify(data)) : null;
    this.exists = data !== null && data !== undefined;
    this.ref = ref;
  }

  data() {
    if (!this.exists) return undefined;
    // Restore dates
    const copy = JSON.parse(JSON.stringify(this._data));
    for (const [k, v] of Object.entries(copy)) {
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
        copy[k] = new Date(v);
      }
    }
    return copy;
  }
}

class InMemoryQuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }

  forEach(callback) {
    this.docs.forEach(callback);
  }
}

class InMemoryDocRef {
  constructor(collectionRef, id) {
    this.collectionRef = collectionRef;
    this.id = id || crypto.randomBytes(12).toString('hex');
    this.path = `${collectionRef.name}/${this.id}`;
  }

  async get() {
    const raw = this.collectionRef.store.get(this.id);
    return new InMemoryDocSnapshot(this.id, raw, this);
  }

  async set(data, options = {}) {
    const merge = options && options.merge;
    let finalData;
    if (merge && this.collectionRef.store.has(this.id)) {
      const existing = this.collectionRef.store.get(this.id);
      finalData = { ...existing, ...data };
    } else {
      finalData = { ...data };
    }
    this.collectionRef.store.set(this.id, finalData);
    return { writeTime: new Date() };
  }

  async update(data) {
    if (!this.collectionRef.store.has(this.id)) {
      throw new Error(`Document ${this.id} does not exist`);
    }
    const existing = this.collectionRef.store.get(this.id);
    const updated = { ...existing, ...data };
    this.collectionRef.store.set(this.id, updated);
    return { writeTime: new Date() };
  }

  async delete() {
    this.collectionRef.store.delete(this.id);
    return { writeTime: new Date() };
  }
}

class InMemoryQuery {
  constructor(collectionRef) {
    this.collectionRef = collectionRef;
    this.filters = [];
    this.sorts = [];
    this.limitCount = null;
  }

  where(field, op, value) {
    const q = new InMemoryQuery(this.collectionRef);
    q.filters = [...this.filters, { field, op, value }];
    q.sorts = [...this.sorts];
    q.limitCount = this.limitCount;
    return q;
  }

  orderBy(field, direction = 'asc') {
    const q = new InMemoryQuery(this.collectionRef);
    q.filters = [...this.filters];
    q.sorts = [...this.sorts, { field, direction: direction.toLowerCase() }];
    q.limitCount = this.limitCount;
    return q;
  }

  limit(count) {
    const q = new InMemoryQuery(this.collectionRef);
    q.filters = [...this.filters];
    q.sorts = [...this.sorts];
    q.limitCount = count;
    return q;
  }

  async get() {
    let docs = [];
    for (const [id, data] of this.collectionRef.store.entries()) {
      docs.push(new InMemoryDocSnapshot(id, data, new InMemoryDocRef(this.collectionRef, id)));
    }

    // Apply where filters
    for (const filter of this.filters) {
      const { field, op, value } = filter;
      docs = docs.filter(docSnap => {
        const docData = docSnap.data();
        const docVal = getNestedValue(docData, field);

        if (op === '==') {
          if (docVal instanceof Date && value instanceof Date) {
            return docVal.getTime() === value.getTime();
          }
          return docVal === value || (docVal !== undefined && value !== undefined && docVal?.toString() === value?.toString());
        }
        if (op === '!=') {
          return docVal !== value;
        }
        if (op === '>') {
          return docVal > value;
        }
        if (op === '>=') {
          return docVal >= value;
        }
        if (op === '<') {
          return docVal < value;
        }
        if (op === '<=') {
          return docVal <= value;
        }
        if (op === 'in') {
          if (!Array.isArray(value)) return false;
          return value.some(v => v === docVal || (v && docVal && v.toString() === docVal.toString()));
        }
        if (op === 'array-contains') {
          if (!Array.isArray(docVal)) return false;
          return docVal.includes(value);
        }
        return true;
      });
    }

    // Apply sorts
    for (const sort of this.sorts) {
      const { field, direction } = sort;
      const isDesc = direction === 'desc';
      docs.sort((a, b) => {
        const valA = getNestedValue(a.data(), field);
        const valB = getNestedValue(b.data(), field);
        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitCount !== null && this.limitCount >= 0) {
      docs = docs.slice(0, this.limitCount);
    }

    return new InMemoryQuerySnapshot(docs);
  }
}

class InMemoryCollectionRef extends InMemoryQuery {
  constructor(firestore, name) {
    super(null);
    this.firestore = firestore;
    this.name = name;
    this.collectionRef = this;
    if (!this.firestore.collections.has(name)) {
      this.firestore.collections.set(name, new Map());
    }
  }

  get store() {
    return this.firestore.collections.get(this.name);
  }

  doc(id) {
    return new InMemoryDocRef(this, id);
  }

  async add(data) {
    const docRef = this.doc();
    await docRef.set(data);
    return docRef;
  }
}

class InMemoryBatch {
  constructor() {
    this.ops = [];
  }

  set(docRef, data, options = {}) {
    this.ops.push(async () => await docRef.set(data, options));
    return this;
  }

  update(docRef, data) {
    this.ops.push(async () => await docRef.update(data));
    return this;
  }

  delete(docRef) {
    this.ops.push(async () => await docRef.delete());
    return this;
  }

  async commit() {
    for (const op of this.ops) {
      await op();
    }
    this.ops = [];
  }
}

class InMemoryFirestore {
  constructor() {
    this.collections = new Map();
  }

  collection(name) {
    return new InMemoryCollectionRef(this, name);
  }

  batch() {
    return new InMemoryBatch();
  }

  async runTransaction(updateFn) {
    const txn = {
      get: async (docRef) => await docRef.get(),
      set: (docRef, data, options) => { docRef.set(data, options); return txn; },
      update: (docRef, data) => { docRef.update(data); return txn; },
      delete: (docRef) => { docRef.delete(); return txn; },
    };
    return await updateFn(txn);
  }

  reset() {
    for (const store of this.collections.values()) {
      store.clear();
    }
    this.collections.clear();
  }
}

class InMemoryAuth {
  async verifyIdToken(idToken) {
    if (idToken === 'mock_google_id_token' || idToken.startsWith('mock_')) {
      return {
        uid: 'google_mock_uid_123',
        email: 'mock_google_user@gmail.com',
        email_verified: true,
        name: 'Mock Google User',
      };
    }
    // Attempt decoding if it looks like a JWT
    try {
      const parts = idToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload.email) {
          return {
            uid: payload.sub || payload.uid || 'google_user_uid',
            email: payload.email,
            email_verified: payload.email_verified !== false,
            name: payload.name || payload.email.split('@')[0],
          };
        }
      }
    } catch (e) {
      // Ignore
    }
    const err = new Error('Invalid or expired Google authentication token');
    err.code = 'auth/argument-error';
    throw err;
  }
}

const memoryFirestoreInstance = new InMemoryFirestore();
const memoryAuthInstance = new InMemoryAuth();

module.exports = {
  InMemoryFirestore,
  memoryFirestoreInstance,
  memoryAuthInstance,
};
