const { getDb } = require('../config/db');

/**
 * Normalizes Firestore document snapshots into plain JavaScript objects
 * matching Mongoose document ergonomics (_id, id, Date objects, save, toObject, toJSON).
 */
function normalizeDoc(docSnapshot, repo = null) {
  if (!docSnapshot) return null;
  const rawData = typeof docSnapshot.data === 'function' ? docSnapshot.data() : docSnapshot;
  if (!rawData && typeof docSnapshot.data === 'function') return null;

  const data = { ...rawData };
  const docId = docSnapshot.id || data._id || data.id;

  // Convert Firestore Timestamps to JavaScript Date instances
  for (const [key, val] of Object.entries(data)) {
    if (val && typeof val.toDate === 'function') {
      data[key] = val.toDate();
    } else if (val && typeof val === 'object' && !Array.isArray(val) && val._seconds !== undefined) {
      data[key] = new Date(val._seconds * 1000 + (val._nanoseconds || 0) / 1e6);
    }
  }

  // Ensure timestamps exist
  if (!data.createdAt) data.createdAt = new Date();
  if (!data.updatedAt) data.updatedAt = new Date();

  // Mongoose backwards-compatible ID ergonomics
  data.id = docId;
  data._id = docId;

  // Ergonomic helper methods
  Object.defineProperty(data, 'toObject', {
    value: function () {
      const copy = { ...this };
      return copy;
    },
    enumerable: false,
    writable: true,
  });

  Object.defineProperty(data, 'toJSON', {
    value: function () {
      const copy = { ...this };
      return copy;
    },
    enumerable: false,
    writable: true,
  });

  if (repo) {
    Object.defineProperty(data, 'save', {
      value: async function () {
        return await repo.findByIdAndUpdate(this._id, this);
      },
      enumerable: false,
      writable: true,
    });

    Object.defineProperty(data, 'populate', {
      value: async function (paths, select) {
        return await repo.populateDoc(this, paths, select);
      },
      enumerable: false,
      writable: true,
    });
  }

  return data;
}

/**
 * Prepares data for writing to Firestore by removing internal ID fields.
 */
function toFirestoreData(data) {
  const payload = { ...data };
  delete payload._id;
  delete payload.id;
  delete payload.save;
  delete payload.populate;
  delete payload.toObject;
  delete payload.toJSON;
  delete payload.matchPassword;
  return payload;
}

/**
 * Chainable QueryBuilder enabling Mongoose-like syntax:
 * repo.find(query).populate('requester').sort({ createdAt: -1 }).limit(10)
 */
class QueryBuilder {
  constructor(repo, filter = {}, single = false) {
    this.repo = repo;
    this.filter = filter || {};
    this.single = single;
    this.populates = [];
    this.sortCriteria = null;
    this.limitCount = null;
    this.selectFields = null;
  }

  populate(pathOrArray, select) {
    if (Array.isArray(pathOrArray)) {
      for (const item of pathOrArray) {
        if (typeof item === 'string') {
          this.populates.push({ path: item });
        } else if (item && item.path) {
          this.populates.push(item);
        }
      }
    } else if (typeof pathOrArray === 'object' && pathOrArray !== null) {
      this.populates.push(pathOrArray);
    } else if (typeof pathOrArray === 'string') {
      this.populates.push({ path: pathOrArray, select });
    }
    return this;
  }

  sort(sortCriteria) {
    this.sortCriteria = sortCriteria;
    return this;
  }

  limit(limitCount) {
    this.limitCount = limitCount;
    return this;
  }

  select(fields) {
    this.selectFields = fields;
    return this;
  }

  async exec() {
    let result;
    if (this.single) {
      result = await this.repo._executeFindOne(this.filter, {
        sort: this.sortCriteria,
        select: this.selectFields,
      });
    } else {
      result = await this.repo._executeFind(this.filter, {
        sort: this.sortCriteria,
        limit: this.limitCount,
        select: this.selectFields,
      });
    }

    if (!result) return null;

    if (this.populates.length > 0) {
      if (this.single) {
        result = await this.repo.populateDoc(result, this.populates);
      } else {
        result = await this.repo.populateDocs(result, this.populates);
      }
    }

    return result;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

/**
 * Base Repository providing unified Firestore CRUD operations
 * and explicit join populates.
 */
class BaseRepository {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  get db() {
    return getDb();
  }

  get collection() {
    return this.db.collection(this.collectionName);
  }

  normalize(snapshot) {
    return normalizeDoc(snapshot, this);
  }

  findById(id, transaction = null) {
    if (!id) {
      const q = new QueryBuilder(this, {}, true);
      q.exec = async () => null;
      return q;
    }
    const q = new QueryBuilder(this, { _id: id }, true);
    q.exec = async () => {
      const docId = typeof id === 'object' && id._id ? id._id.toString() : id.toString();
      const docRef = this.collection.doc(docId);
      const snap = transaction ? await transaction.get(docRef) : await docRef.get();
      if (!snap.exists) return null;
      let result = this.normalize(snap);
      if (q.populates.length > 0) {
        result = await this.populateDoc(result, q.populates);
      }
      return result;
    };
    return q;
  }

  findOne(filter = {}) {
    return new QueryBuilder(this, filter, true);
  }

  find(filter = {}) {
    return new QueryBuilder(this, filter, false);
  }

  async _executeFindOne(filter = {}, options = {}) {
    const list = await this._executeFind(filter, { ...options, limit: 1 });
    return list.length > 0 ? list[0] : null;
  }

  async _executeFind(filter = {}, options = {}) {
    if (filter.$or && Array.isArray(filter.$or)) {
      const branches = filter.$or;
      const otherFilters = { ...filter };
      delete otherFilters.$or;
      const combinedMap = new Map();
      for (const branch of branches) {
        const mergedFilter = { ...otherFilters, ...branch };
        const branchResults = await this._executeFind(mergedFilter, options);
        for (const doc of branchResults) {
          combinedMap.set(doc._id, doc);
        }
      }
      return Array.from(combinedMap.values());
    }

    let query = this.collection;
    const inMemoryFilters = [];

    // Parse filter clauses
    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined) continue;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        if (value.$in && Array.isArray(value.$in)) {
          if (value.$in.length === 0) return [];
          if (value.$in.length <= 10) {
            query = query.where(key, 'in', value.$in);
          } else {
            inMemoryFilters.push(doc => value.$in.includes(doc[key]));
          }
        } else if (value.in && Array.isArray(value.in)) {
          if (value.in.length === 0) return [];
          if (value.in.length <= 10) {
            query = query.where(key, 'in', value.in);
          } else {
            inMemoryFilters.push(doc => value.in.includes(doc[key]));
          }
        } else if (value.$gte !== undefined) {
          query = query.where(key, '>=', value.$gte);
        } else if (value.$lte !== undefined) {
          query = query.where(key, '<=', value.$lte);
        } else if (value.$gt !== undefined) {
          query = query.where(key, '>', value.$gt);
        } else if (value.$lt !== undefined) {
          query = query.where(key, '<', value.$lt);
        } else if (value.$ne !== undefined) {
          query = query.where(key, '!=', value.$ne);
        } else {
          // Complex or unknown operator -> filter in memory
          inMemoryFilters.push(doc => {
            return JSON.stringify(doc[key]) === JSON.stringify(value);
          });
        }
      } else {
        // Simple equality
        const eqVal = value && typeof value === 'object' && value._id ? value._id.toString() : value;
        query = query.where(key, '==', eqVal);
      }
    }

    // Apply sorting if compatible with query
    if (options.sort) {
      if (typeof options.sort === 'object') {
        for (const [sKey, sDir] of Object.entries(options.sort)) {
          const dir = sDir === -1 || sDir === 'desc' || sDir === 'descending' ? 'desc' : 'asc';
          try {
            query = query.orderBy(sKey, dir);
          } catch (e) {
            // Index required or unsupported order, fall back to in-memory sort
          }
        }
      }
    }

    // Apply limit if no in-memory filters
    if (options.limit && inMemoryFilters.length === 0) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    let results = [];
    snapshot.forEach(docSnap => {
      results.push(this.normalize(docSnap));
    });

    // Run in-memory filters if any
    if (inMemoryFilters.length > 0) {
      results = results.filter(doc => inMemoryFilters.every(fn => fn(doc)));
    }

    // Run in-memory sort if needed
    if (options.sort && typeof options.sort === 'object') {
      const [sKey, sDir] = Object.entries(options.sort)[0] || [];
      if (sKey) {
        const isDesc = sDir === -1 || sDir === 'desc' || sDir === 'descending';
        results.sort((a, b) => {
          const va = a[sKey];
          const vb = b[sKey];
          if (va < vb) return isDesc ? 1 : -1;
          if (va > vb) return isDesc ? -1 : 1;
          return 0;
        });
      }
    }

    if (options.limit && results.length > options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async create(data, transaction = null) {
    const customId = data._id || data.id;
    const docRef = customId ? this.collection.doc(customId.toString()) : this.collection.doc();
    const payload = toFirestoreData(data);
    const now = new Date();
    if (!payload.createdAt) payload.createdAt = now;
    payload.updatedAt = now;

    if (transaction) {
      transaction.set(docRef, payload);
    } else {
      await docRef.set(payload);
    }

    return normalizeDoc({ id: docRef.id, data: () => payload }, this);
  }

  async insertMany(docs = []) {
    const created = [];
    const batch = this.db.batch();
    const now = new Date();

    for (const item of docs) {
      const customId = item._id || item.id;
      const docRef = customId ? this.collection.doc(customId.toString()) : this.collection.doc();
      const payload = toFirestoreData(item);
      if (!payload.createdAt) payload.createdAt = now;
      payload.updatedAt = now;
      batch.set(docRef, payload);
      created.push(normalizeDoc({ id: docRef.id, data: () => payload }, this));
    }

    await batch.commit();
    return created;
  }

  async findByIdAndUpdate(id, updates, options = {}, transaction = null) {
    if (!id) return null;
    const docId = typeof id === 'object' && id._id ? id._id.toString() : id.toString();
    const docRef = this.collection.doc(docId);

    const performUpdate = async (txn) => {
      const snap = txn ? await txn.get(docRef) : await docRef.get();
      if (!snap.exists) return null;

      const existing = snap.data();
      let payload = { ...existing };
      const rawUpdates = updates && updates.$set ? { ...updates.$set } : { ...updates };

      // Handle MongoDB-style $inc
      if (updates && updates.$inc) {
        for (const [incKey, incVal] of Object.entries(updates.$inc)) {
          payload[incKey] = (Number(payload[incKey]) || 0) + Number(incVal);
        }
      }

      delete rawUpdates.$set;
      delete rawUpdates.$inc;

      payload = {
        ...payload,
        ...toFirestoreData(rawUpdates),
        updatedAt: new Date(),
      };

      if (txn) {
        txn.set(docRef, payload);
      } else {
        await docRef.set(payload);
      }

      return normalizeDoc({ id: docId, data: () => payload }, this);
    };

    if (transaction) {
      return await performUpdate(transaction);
    }
    return await performUpdate(null);
  }

  async findOneAndUpdate(filter, updates, options = {}) {
    const doc = await this._executeFindOne(filter);
    if (!doc) return null;
    return await this.findByIdAndUpdate(doc._id, updates, options);
  }

  async findByIdAndDelete(id, transaction = null) {
    if (!id) return null;
    const docId = typeof id === 'object' && id._id ? id._id.toString() : id.toString();
    const docRef = this.collection.doc(docId);
    const snap = transaction ? await transaction.get(docRef) : await docRef.get();
    if (!snap.exists) return null;
    const docData = this.normalize(snap);

    if (transaction) {
      transaction.delete(docRef);
    } else {
      await docRef.delete();
    }
    return docData;
  }

  async updateMany(filter = {}, updates = {}) {
    const docs = await this._executeFind(filter);
    if (docs.length === 0) return { modifiedCount: 0 };

    const batch = this.db.batch();
    for (const doc of docs) {
      const docRef = this.collection.doc(doc._id);
      let payload = { ...doc };
      const rawUpdates = updates && updates.$set ? { ...updates.$set } : { ...updates };
      delete rawUpdates.$set;
      payload = { ...payload, ...toFirestoreData(rawUpdates), updatedAt: new Date() };
      batch.set(docRef, payload);
    }
    await batch.commit();
    return { modifiedCount: docs.length };
  }

  async deleteMany(filter = {}) {
    const docs = await this._executeFind(filter);
    if (docs.length === 0) return { deletedCount: 0 };

    const batch = this.db.batch();
    for (const doc of docs) {
      const docRef = this.collection.doc(doc._id);
      batch.delete(docRef);
    }
    await batch.commit();
    return { deletedCount: docs.length };
  }

  async countDocuments(filter = {}) {
    if (Object.keys(filter).length === 0) {
      const snap = await this.collection.count().get();
      return snap.data().count;
    }
    const docs = await this._executeFind(filter);
    return docs.length;
  }

  async count(filter = {}) {
    return await this.countDocuments(filter);
  }

  /**
   * Performs explicit joins to replace Mongoose populate.
   * Can be overridden by subclasses or uses registered repositories.
   */
  async populateDoc(doc, populates = []) {
    if (!doc) return null;
    const list = [doc];
    await this.populateDocs(list, populates);
    return list[0];
  }

  async populateDocs(docs = [], populates = []) {
    if (!docs || docs.length === 0 || !populates || populates.length === 0) {
      return docs;
    }

    const { getRepositoryRegistry } = require('./registry');
    const registry = getRepositoryRegistry();

    const normalizedPopulates = Array.isArray(populates)
      ? populates
      : [populates];

    for (const pop of normalizedPopulates) {
      const path = typeof pop === 'string' ? pop : pop.path;
      const selectFields = typeof pop === 'object' && pop.select
        ? (typeof pop.select === 'string' ? pop.select.trim().split(/\s+/) : pop.select)
        : null;

      // Determine target collection/repository based on path name
      let targetRepo = null;
      if (['requester', 'user', 'donor', 'actor'].includes(path)) {
        targetRepo = registry.users;
      } else if (['targetHospital', 'hospital'].includes(path)) {
        targetRepo = registry.hospitals;
      } else if (['donorProfile'].includes(path)) {
        targetRepo = registry.donorProfiles;
      } else if (['request', 'requestId'].includes(path)) {
        targetRepo = registry.bloodRequests;
      } else if (['donorId'].includes(path)) {
        targetRepo = registry.users;
      } else if (['hospitalId'].includes(path)) {
        // ping.hospitalId references User in LifeLink
        targetRepo = registry.users;
      }

      if (!targetRepo) continue;

      // Collect unique IDs to join
      const idMap = new Map();
      for (const d of docs) {
        const val = d[path];
        if (val) {
          const idStr = typeof val === 'object' && val._id ? val._id.toString() : val.toString();
          idMap.set(idStr, null);
        }
      }

      // Fetch all referenced documents
      const ids = Array.from(idMap.keys());
      for (const id of ids) {
        const targetDoc = await targetRepo.findById(id);
        if (targetDoc) {
          let resolved = targetDoc;
          if (selectFields && Array.isArray(selectFields) && selectFields.length > 0) {
            resolved = { _id: targetDoc._id, id: targetDoc.id };
            for (const f of selectFields) {
              if (targetDoc[f] !== undefined) resolved[f] = targetDoc[f];
            }
          }
          idMap.set(id, resolved);
        }
      }

      // Assign joined docs back
      for (const d of docs) {
        const val = d[path];
        if (val) {
          const idStr = typeof val === 'object' && val._id ? val._id.toString() : val.toString();
          const joined = idMap.get(idStr);
          if (joined) {
            d[path] = joined;
          }
        }
      }
    }

    return docs;
  }
}

module.exports = {
  BaseRepository,
  normalizeDoc,
  toFirestoreData,
  QueryBuilder,
};
