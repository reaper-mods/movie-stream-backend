const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config/environment');

class Encryption {
  static async hashPassword(password) {
    return bcrypt.hash(password, config.bcrypt.saltRounds);
  }

  static async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  static generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  static generateResetToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }
}

module.exports = Encryption;