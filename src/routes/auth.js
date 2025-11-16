const express = require('express');
const router = express.Router();
const apiKeyService = require('../services/apiKeyService');

router.post('/register', async (req, res, next) => {
  try {
    const { name, owner_email, meta } = req.body;
    if (!name || !owner_email) return res.status(400).json({ error: 'name and owner_email required' });

    const { app, apiKey } = await apiKeyService.registerApp({ name, owner_email, meta });
    res.status(201).json({ app, apiKey });
  } catch (err) {
    next(err);
  }
});

router.get('/api-key', async (req, res, next) => {
  try {
    const appId = req.query.app_id;
    if (!appId) return res.status(400).json({ error: 'app_id required' });
    const row = await apiKeyService.getApiKeyForApp(appId);
    if (!row) return res.status(404).json({ error: 'No API key found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.post('/revoke', async (req, res, next) => {
  try {
    const { key_id } = req.body;
    if (!key_id) return res.status(400).json({ error: 'key_id required' });
    await apiKeyService.revokeApiKey(key_id);
    res.json({ revoked: true });
  } catch (err) {
    next(err);
  }
});

router.post('/regenerate', async (req, res, next) => {
  try {
    const { key_id } = req.body;
    if (!key_id) return res.status(400).json({ error: 'key_id required' });
    const newKey = await apiKeyService.regenerateKey(key_id);
    res.json({ key: newKey });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
