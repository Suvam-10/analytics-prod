const express = require('express');
const router = express.Router();
const Knex = require('knex');
const knex = Knex(require('../db/knexfile'));
const { v4: uuidv4 } = require('uuid');

router.post('/create', async (req, res, next) => {
  try {
    const { app_id, target_url, short_code } = req.body;
    if (!app_id || !target_url) return res.status(400).json({ error: 'app_id and target_url required' });
    const code = short_code || uuidv4().slice(0,8);
    const [row] = await knex('short_urls').insert({ app_id, short_code: code, target_url }).returning('*');
    res.status(201).json(row);
  } catch (err) { next(err); }
});

router.get('/stats', async (req, res, next) => {
  try {
    const { short_code } = req.query;
    if (!short_code) return res.status(400).json({ error: 'short_code required' });
    const urlRow = await knex('short_urls').where({ short_code }).first();
    if (!urlRow) return res.status(404).json({ error: 'not found' });
    const clicks = await knex('short_url_clicks').where({ short_url_id: urlRow.id }).count('* as cnt').first();
    res.json({ short: urlRow, clicks: parseInt(clicks.cnt,10) });
  } catch (err) { next(err); }
});

router.get('/r/:short_code', async (req, res, next) => {
  try {
    const { short_code } = req.params;
    const urlRow = await knex('short_urls').where({ short_code }).first();
    if (!urlRow) return res.status(404).send('Not found');
    await knex('short_url_clicks').insert({ short_url_id: urlRow.id, ip_address: req.ip, user_agent: req.get('User-Agent') || '' });
    await knex('short_urls').where({ id: urlRow.id }).increment('clicks', 1);
    res.redirect(urlRow.target_url);
  } catch (err) { next(err); }
});

module.exports = router;
