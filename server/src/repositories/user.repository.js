const bcrypt = require('bcryptjs');
const UserModel = require('../models/User');
const { BaseRepository } = require('./base.repository');
const { registerRepository } = require('./registry');

class UserRepository extends BaseRepository {
  constructor() {
    super(UserModel);
  }

  attachMethods(user) {
    if (!user) return null;
    Object.defineProperty(user, 'matchPassword', {
      value: async function (enteredPassword) {
        if (!this.password) return false;
        return await bcrypt.compare(enteredPassword, this.password);
      },
      enumerable: false,
      writable: true,
      configurable: true,
    });
    return user;
  }

  findById(id, session = null) {
    const q = super.findById(id, session);
    const originalExec = q.exec.bind(q);
    q.exec = async () => {
      const user = await originalExec();
      return this.attachMethods(user);
    };
    return q;
  }

  findOne(filter = {}, session = null) {
    const nextFilter = { ...filter };
    if (typeof nextFilter.email === 'string') {
      nextFilter.email = nextFilter.email.trim().toLowerCase();
    }
    const query = super.findOne(nextFilter, session);
    const originalExec = query.exec.bind(query);
    query.exec = async () => {
      const user = await originalExec();
      return this.attachMethods(user);
    };
    return query;
  }

  async findByEmail(email, session = null) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    return await this.findOne({ email: normalized }, session).exec();
  }

  async create(userData, session = null) {
    const normalizedEmail = (userData.email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Email is required');
    }

    let hashedPassword = userData.password;
    if (hashedPassword && !hashedPassword.startsWith('$2a$') && !hashedPassword.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(hashedPassword, salt);
    }

    try {
      const created = await super.create(
        {
          ...userData,
          email: normalizedEmail,
          password: hashedPassword,
          accountType: userData.accountType || 'user',
          hospitalId: userData.hospitalId || null,
          phone: userData.phone || '',
        },
        session
      );
      return this.attachMethods(created);
    } catch (err) {
      if (err && (err.code === 11000 || /E11000|duplicate key/i.test(err.message))) {
        const dupErr = new Error('User already exists with this email address');
        dupErr.statusCode = 400;
        throw dupErr;
      }
      throw err;
    }
  }
}

const userRepo = new UserRepository();
registerRepository('users', userRepo);

module.exports = userRepo;
