const mongoose = require('mongoose');

/**
 * Recursively converts Mongoose ObjectIds to strings while preserving Date instances,
 * and attaches `id` matching `_id` for stable API responses and deep links.
 */
function normalizePlainValue(val) {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) return val;
  if (val instanceof mongoose.Types.ObjectId || (val && val._bsontype === 'ObjectId')) {
    return val.toString();
  }
  if (Array.isArray(val)) {
    return val.map(normalizePlainValue);
  }
  if (typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      if (k === '__v') continue;
      out[k] = normalizePlainValue(v);
    }
    if (out._id !== undefined && out.id === undefined) {
      out.id = out._id.toString();
    }
    return out;
  }
  return val;
}

/**
 * Normalizes a Mongoose document or lean object into a plain JS object
 * with string `_id` and `id`, JavaScript `Date` instances, and ergonomic
 * `save`, `populate`, `toObject`, `toJSON` helpers.
 */
function normalizeDoc(doc, repo = null) {
  if (!doc) return null;
  const raw = typeof doc.toObject === 'function' ? doc.toObject({ virtuals: true }) : { ...doc };
  const data = normalizePlainValue(raw);

  if (data._id !== undefined) {
    data._id = data._id.toString();
    data.id = data._id;
  } else if (data.id !== undefined) {
    data.id = data.id.toString();
    data._id = data.id;
  }

  Object.defineProperty(data, 'toObject', {
    value: function () {
      return { ...this };
    },
    enumerable: false,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(data, 'toJSON', {
    value: function () {
      return { ...this };
    },
    enumerable: false,
    writable: true,
    configurable: true,
  });

  if (repo) {
    Object.defineProperty(data, 'save', {
      value: async function (session = null) {
        return await repo.findByIdAndUpdate(this._id, this, {}, session);
      },
      enumerable: false,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(data, 'populate', {
      value: async function (paths, select) {
        return await repo.populateDoc(this, select ? { path: paths, select } : paths);
      },
      enumerable: false,
      writable: true,
      configurable: true,
    });
  }

  return data;
}

/**
 * Strips internal helper methods and ensures foreign key references are plain IDs.
 */
function toMongoData(data) {
  if (!data || typeof data !== 'object') return {};
  const payload = { ...data };
  delete payload.save;
  delete payload.populate;
  delete payload.toObject;
  delete payload.toJSON;
  delete payload.matchPassword;
  delete payload.id;
  delete payload.__v;

  // Guard against populated objects leaking into foreign key reference fields
  for (const f of ['targetHospital', 'hospital', 'requester', 'donor', 'donorProfile', 'user', 'request', 'requestId', 'donorId', 'hospitalId', 'actor']) {
    if (payload[f] && typeof payload[f] === 'object' && !Array.isArray(payload[f]) && !(payload[f] instanceof mongoose.Types.ObjectId) && (payload[f]._id || payload[f].id)) {
      payload[f] = (payload[f]._id || payload[f].id).toString();
    }
  }

  return payload;
}

function isValidObjectId(val) {
  if (!val) return false;
  if (val instanceof mongoose.Types.ObjectId) return true;
  if (typeof val === 'string') return /^[a-fA-F0-9]{24}$/.test(val);
  if (typeof val === 'object' && val._id) return isValidObjectId(val._id);
  return false;
}

function sanitizeFilter(filter = {}, model = null) {
  if (!filter || typeof filter !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(filter)) {
    if (v === undefined) continue;
    const schemaPath = model && model.schema ? model.schema.path(k) : null;
    const isObjectIdField =
      k === '_id' ||
      (schemaPath && (schemaPath.instance === 'ObjectId' || schemaPath.instance === 'ObjectID'));

    if (isObjectIdField && typeof v === 'string' && !isValidObjectId(v)) {
      out._id = new mongoose.Types.ObjectId('000000000000000000000000');
      out.__impossibleMatch = true;
      continue;
    }
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof mongoose.Types.ObjectId) && (v._id || v.id)) {
      const refStr = (v._id || v.id).toString();
      if (isObjectIdField && !isValidObjectId(refStr)) {
        out.__impossibleMatch = true;
      } else {
        out[k] = refStr;
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

class QueryBuilder {
  constructor(repo, filter = {}, single = false, options = {}) {
    this.repo = repo;
    this.filter = filter || {};
    this.single = single;
    this.populates = [];
    this.sortCriteria = null;
    this.limitCount = null;
    this.skipCount = null;
    this.selectFields = null;
    this.sessionObj = options.session || null;
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
      this.populates.push(select ? { path: pathOrArray, select } : { path: pathOrArray });
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

  skip(skipCount) {
    this.skipCount = skipCount;
    return this;
  }

  select(fields) {
    this.selectFields = fields;
    return this;
  }

  session(sess) {
    this.sessionObj = sess;
    return this;
  }

  lean() {
    // Queries already execute with .lean() and normalize
    return this;
  }

  async exec() {
    const cleanFilter = sanitizeFilter(this.filter, this.repo.model);
    if (cleanFilter.__impossibleMatch) {
      return this.single ? null : [];
    }
    let query = this.single
      ? this.repo.model.findOne(cleanFilter)
      : this.repo.model.find(cleanFilter);

    if (this.sessionObj) {
      query = query.session(this.sessionObj);
    }
    if (this.selectFields) {
      query = query.select(this.selectFields);
    }
    if (this.sortCriteria) {
      query = query.sort(this.sortCriteria);
    }
    if (this.skipCount !== null && this.skipCount !== undefined && !this.single) {
      query = query.skip(this.skipCount);
    }
    if (this.limitCount !== null && this.limitCount !== undefined && !this.single) {
      query = query.limit(this.limitCount);
    }
    for (const pop of this.populates) {
      query = query.populate(pop);
    }

    const res = await query.lean({ virtuals: true }).exec();
    if (this.single) {
      return res ? normalizeDoc(res, this.repo) : null;
    }
    return (res || []).map((doc) => normalizeDoc(doc, this.repo));
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

class BaseRepository {
  constructor(model) {
    if (!model) {
      throw new Error('BaseRepository requires a Mongoose model');
    }
    this.model = model;
    this.collectionName = model.collection ? model.collection.collectionName : model.modelName;
  }

  normalize(doc) {
    return normalizeDoc(doc, this);
  }

  findById(id, session = null) {
    if (!id) {
      const q = new QueryBuilder(this, {}, true, { session });
      q.exec = async () => null;
      return q;
    }
    const idStr = typeof id === 'object' && id._id ? id._id.toString() : id.toString();
    if (!isValidObjectId(idStr)) {
      const q = new QueryBuilder(this, {}, true, { session });
      q.exec = async () => null;
      return q;
    }
    return new QueryBuilder(this, { _id: idStr }, true, { session });
  }

  findOne(filter = {}, session = null) {
    return new QueryBuilder(this, filter, true, { session });
  }

  find(filter = {}, session = null) {
    return new QueryBuilder(this, filter, false, { session });
  }

  async paginate(filter = {}, { page = 1, limit = 20, sort = { createdAt: -1 }, populate = [], select = null } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    let q = this.find(filter).sort(sort).skip(skip).limit(safeLimit);
    if (select) q = q.select(select);
    if (populate && populate.length > 0) q = q.populate(populate);

    const [items, total] = await Promise.all([
      q.exec(),
      this.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
    };
  }

  async create(data, session = null) {
    const payload = toMongoData(data);
    if (data._id && isValidObjectId(data._id)) {
      payload._id = data._id.toString();
    }
    const opts = session ? { session } : {};
    const docs = await this.model.create([payload], opts);
    return normalizeDoc(docs[0], this);
  }

  async insertMany(docs = [], session = null) {
    if (!docs || docs.length === 0) return [];
    const payloads = docs.map((d) => {
      const p = toMongoData(d);
      if (d._id && isValidObjectId(d._id)) p._id = d._id.toString();
      return p;
    });
    const opts = session ? { session } : {};
    const created = await this.model.insertMany(payloads, opts);
    return created.map((d) => normalizeDoc(d, this));
  }

  async findByIdAndUpdate(id, updates, options = {}, session = null) {
    if (!id) return null;
    const idStr = typeof id === 'object' && id._id ? id._id.toString() : id.toString();
    if (!isValidObjectId(idStr)) return null;

    let updateDoc;
    if (updates && (updates.$set || updates.$inc || updates.$unset || updates.$push || updates.$pull)) {
      updateDoc = { ...updates };
      if (updateDoc.$set) {
        updateDoc.$set = toMongoData(updateDoc.$set);
      }
    } else {
      updateDoc = { $set: toMongoData(updates) };
      delete updateDoc.$set._id;
    }

    const opts = {
      returnDocument: options.new === false ? 'before' : (options.returnDocument || 'after'),
      runValidators: true,
      ...options,
      ...(session ? { session } : {}),
    };
    delete opts.new;

    const updated = await this.model.findByIdAndUpdate(idStr, updateDoc, opts).lean({ virtuals: true }).exec();
    return updated ? normalizeDoc(updated, this) : null;
  }

  async findOneAndUpdate(filter, updates, options = {}, session = null) {
    const cleanFilter = sanitizeFilter(filter);
    let updateDoc;
    if (updates && (updates.$set || updates.$inc || updates.$unset || updates.$push || updates.$pull)) {
      updateDoc = { ...updates };
      if (updateDoc.$set) {
        updateDoc.$set = toMongoData(updateDoc.$set);
      }
    } else {
      updateDoc = { $set: toMongoData(updates) };
      delete updateDoc.$set._id;
    }

    const opts = {
      returnDocument: options.new === false ? 'before' : (options.returnDocument || 'after'),
      runValidators: true,
      ...options,
      ...(session ? { session } : {}),
    };
    delete opts.new;

    const updated = await this.model.findOneAndUpdate(cleanFilter, updateDoc, opts).lean({ virtuals: true }).exec();
    return updated ? normalizeDoc(updated, this) : null;
  }

  async findByIdAndDelete(id, session = null) {
    if (!id) return null;
    const idStr = typeof id === 'object' && id._id ? id._id.toString() : id.toString();
    if (!isValidObjectId(idStr)) return null;

    const opts = session ? { session } : {};
    const deleted = await this.model.findByIdAndDelete(idStr, opts).lean({ virtuals: true }).exec();
    return deleted ? normalizeDoc(deleted, this) : null;
  }

  async updateMany(filter = {}, updates = {}, session = null) {
    const cleanFilter = sanitizeFilter(filter);
    let updateDoc;
    if (updates && (updates.$set || updates.$inc || updates.$unset)) {
      updateDoc = { ...updates };
      if (updateDoc.$set) {
        updateDoc.$set = toMongoData(updateDoc.$set);
      }
    } else {
      updateDoc = { $set: toMongoData(updates) };
    }
    const opts = session ? { session } : {};
    return await this.model.updateMany(cleanFilter, updateDoc, opts).exec();
  }

  async deleteMany(filter = {}, session = null) {
    const cleanFilter = sanitizeFilter(filter);
    const opts = session ? { session } : {};
    return await this.model.deleteMany(cleanFilter, opts).exec();
  }

  async countDocuments(filter = {}, session = null) {
    const cleanFilter = sanitizeFilter(filter);
    let q = this.model.countDocuments(cleanFilter);
    if (session) q = q.session(session);
    return await q.exec();
  }

  async count(filter = {}, session = null) {
    return await this.countDocuments(filter, session);
  }

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

    const normalizedPopulates = Array.isArray(populates)
      ? populates.map((p) => (typeof p === 'string' ? { path: p } : p))
      : [typeof populates === 'string' ? { path: populates } : populates];

    await this.model.populate(docs, normalizedPopulates);

    for (let i = 0; i < docs.length; i++) {
      if (docs[i]) {
        for (const pop of normalizedPopulates) {
          const p = pop.path;
          if (docs[i][p] && typeof docs[i][p] === 'object' && !(docs[i][p] instanceof Date)) {
            docs[i][p] = normalizePlainValue(docs[i][p]);
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
  normalizePlainValue,
  toMongoData,
  isValidObjectId,
  sanitizeFilter,
  QueryBuilder,
};
