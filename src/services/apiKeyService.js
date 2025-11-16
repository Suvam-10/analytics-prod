const Knex = require('knex');
const knex = Knex(require('../db/knexfile'));
const { generateKey, hashKey, verifyHash } = require('../utils/crypto');
const config = require('../config');

async function registerApp({ name, owner_email, meta }) {
  const [app] = await knex('apps').insert({ name, owner_email, meta }).returning('*');
  const plaintextKey = generateKey(32);
  const hash = await hashKey(plaintextKey);
  const ttlDays = parseInt(process.env.API_KEY_TTL_DAYS || '365', 10);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 3600 * 1000);

  const [apiKeyRow] = await knex('api_keys').insert({
    app_id: app.id,
    key_hash: hash,
    expires_at: expiresAt
  }).returning(['id', 'created_at', 'expires_at']);

  return { app, apiKey: { id: apiKeyRow.id, token: plaintextKey, expires_at: apiKeyRow.expires_at } };
}

async function getApiKeyForApp(appId) {
  return knex('api_keys').where({ app_id: appId, revoked: false }).orderBy('created_at', 'desc').first();
}

async function revokeApiKey(keyId) {
  return knex('api_keys').where({ id: keyId }).update({ revoked: true });
}

async function regenerateKey(keyId) {
  const plaintextKey = generateKey(32);
  const hash = await hashKey(plaintextKey);
  await knex('api_keys').where({ id: keyId }).update({ key_hash: hash, revoked: false, created_at: knex.fn.now() });
  return plaintextKey;
}

async function validateKey(plaintextKey) {
  // For production shift to keyId.token pattern; for now we check recent non-revoked keys
  const rows = await knex('api_keys').where({ revoked: false }).andWhere(function () {
    this.whereNull('expires_at').orWhere('expires_at', '>', knex.fn.now())
  }).orderBy('created_at', 'desc').limit(1000);

  for (const r of rows) {
    const ok = await verifyHash(plaintextKey, r.key_hash);
    if (ok) return r;
  }
  return null;
}

module.exports = { registerApp, getApiKeyForApp, revokeApiKey, regenerateKey, validateKey };
