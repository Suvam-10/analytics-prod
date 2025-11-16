const crypto = require('crypto');
const bcrypt = require('bcrypt');

const generateKey = (len = 32) => {
  return crypto.randomBytes(len).toString('hex');
};

const hashKey = async (key, saltRounds = 12) => {
  const hash = await bcrypt.hash(key, saltRounds);
  return hash;
};

const verifyHash = async (key, hash) => {
  return bcrypt.compare(key, hash);
};

module.exports = { generateKey, hashKey, verifyHash };
