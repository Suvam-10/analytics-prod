const apiKeyService = require('../services/apiKeyService');

module.exports = async function apiKeyAuth(req, res, next) {
  const key = req.header('x-api-key') || req.header('authorization')?.replace('ApiKey ', '');
  if (!key) return res.status(401).json({ error: 'Missing API key' });

  try {
    const row = await apiKeyService.validateKey(key);
    if (!row) return res.status(401).json({ error: 'Invalid or expired API key' });
    req.app_id = row.app_id;
    req.api_key_id = row.id;
    next();
  } catch (err) {
    next(err);
  }
};
