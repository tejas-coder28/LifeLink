const bcrypt = require('bcryptjs');
const { BaseRepository, normalizeDoc, toFirestoreData } = require('./base.repository');
const { registerRepository } = require('./registry');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
    this.emailsCollection = 'emails';
  }

  attachMethods(user) {
    if (!user) return null;
    user.matchPassword = async function (enteredPassword) {
      if (!this.password) return false;
      return await bcrypt.compare(enteredPassword, this.password);
    };
    return user;
  }

  findById(id, transaction = null) {
    const q = super.findById(id, transaction);
    const originalExec = q.exec.bind(q);
    q.exec = async () => {
      const user = await originalExec();
      return this.attachMethods(user);
    };
    return q;
  }

  async findOne(filter = {}) {
    if (filter.email) {
      filter.email = filter.email.trim().toLowerCase();
    }
    const query = super.findOne(filter);
    const originalExec = query.exec.bind(query);
    query.exec = async () => {
      const user = await originalExec();
      return this.attachMethods(user);
    };
    return query;
  }

  async findByEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    const user = await this._executeFindOne({ email: normalized });
    return this.attachMethods(user);
  }

  /**
   * Enforces unique email atomically using an email-keyed document
   * in the 'emails' collection inside a Firestore transaction.
   */
  async create(userData, outerTransaction = null) {
    const normalizedEmail = (userData.email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Email is required');
    }

    // Hash password if raw string
    let hashedPassword = userData.password;
    if (hashedPassword && !hashedPassword.startsWith('$2a$') && !hashedPassword.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(hashedPassword, salt);
    }

    const customId = userData._id || userData.id;
    const userRef = customId
      ? this.collection.doc(customId.toString())
      : this.collection.doc();
    const emailRef = this.db.collection(this.emailsCollection).doc(normalizedEmail);

    const executeAtomicCreate = async (txn) => {
      const emailSnap = await txn.get(emailRef);
      if (emailSnap.exists) {
        throw new Error('User already exists with this email address');
      }

      const now = new Date();
      const payload = toFirestoreData({
        ...userData,
        email: normalizedEmail,
        password: hashedPassword,
        accountType: userData.accountType || 'user',
        hospitalId: userData.hospitalId || null,
        phone: userData.phone || '',
        createdAt: userData.createdAt || now,
        updatedAt: now,
      });

      txn.set(emailRef, {
        userId: userRef.id,
        email: normalizedEmail,
        createdAt: now,
      });

      txn.set(userRef, payload);

      return normalizeDoc({ id: userRef.id, data: () => payload }, this);
    };

    let resultUser;
    if (outerTransaction) {
      resultUser = await executeAtomicCreate(outerTransaction);
    } else {
      resultUser = await this.db.runTransaction(executeAtomicCreate);
    }

    return this.attachMethods(resultUser);
  }

  async deleteMany(filter = {}) {
    const users = await this._executeFind(filter);
    if (users.length === 0) return { deletedCount: 0 };

    const batch = this.db.batch();
    for (const u of users) {
      batch.delete(this.collection.doc(u._id));
      if (u.email) {
        batch.delete(this.db.collection(this.emailsCollection).doc(u.email));
      }
    }
    await batch.commit();
    return { deletedCount: users.length };
  }

  async findByIdAndDelete(id, transaction = null) {
    const user = await this.findById(id);
    if (!user) return null;

    if (transaction) {
      transaction.delete(this.collection.doc(user._id));
      if (user.email) {
        transaction.delete(this.db.collection(this.emailsCollection).doc(user.email));
      }
    } else {
      const batch = this.db.batch();
      batch.delete(this.collection.doc(user._id));
      if (user.email) {
        batch.delete(this.db.collection(this.emailsCollection).doc(user.email));
      }
      await batch.commit();
    }
    return user;
  }
}

const userRepo = new UserRepository();
registerRepository('users', userRepo);

module.exports = userRepo;
