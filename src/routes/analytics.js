const express = require('express');
const router = express.Router();
const Knex = require('knex');
const knex = Knex(require('../db/knexfile'));
const apiKeyAuth = require('../middleware/apiKeyAuth');
const rateLimiter = require('../middleware/rateLimiter');
const Redis = require('ioredis');
const config = require('../config');
const redis = new Redis(config.redisUrl);

router.post('/collect', apiKeyAuth, rateLimiter, async (req, res, next) => {
  try {
    const payload = req.body.events ? req.body.events : [req.body];

    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({ error: 'No events provided' });
    }

    const rows = payload.map(ev => ({
      app_id: req.app_id,
      event_type: ev.event || ev.event_type || 'unknown',
      url: ev.url || null,
      referrer: ev.referrer || null,
      device: ev.device || null,
      ip_address: ev.ipAddress || ev.ip_address || req.ip,
      timestamp: ev.timestamp ? new Date(ev.timestamp) : new Date(),
      metadata: ev.metadata || {},
      user_id: ev.userId || ev.user_id || null
    }));

    const chunkSize = 1000;
    await knex.batchInsert('events', rows, chunkSize);

    return res.status(201).json({ accepted: rows.length });
  } catch (err) {
    next(err);
  }
});

router.get('/event-summary', apiKeyAuth, rateLimiter, async (req, res, next) => {
  try {
    const { event, startDate, endDate, app_id } = req.query;
    const appFilter = app_id ? { app_id } : { app_id: req.app_id };

    const cacheKey = `summary:${appFilter.app_id || 'all'}:${event || 'all'}:${startDate || '0'}:${endDate || 'now'}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const baseQuery = knex('events').whereBetween('timestamp', [start, end]).andWhere(function() {
      if (appFilter.app_id) this.where('app_id', appFilter.app_id);
    });

    if (event) baseQuery.andWhere('event_type', event);

    const totalCountPromise = baseQuery.clone().count('* as cnt').first();
    const uniqueUsersPromise = baseQuery.clone().countDistinct('user_id as unique_users').first();
    const deviceSplitPromise = baseQuery.clone().select('device').count('* as cnt').groupBy('device');

    const [totalCountRow, uniqueUsersRow, deviceRows] = await Promise.all([totalCountPromise, uniqueUsersPromise, deviceSplitPromise]);

    const resp = {
      event: event || 'all',
      count: parseInt(totalCountRow.cnt, 10),
      uniqueUsers: parseInt(uniqueUsersRow.unique_users || 0, 10),
      deviceData: deviceRows.reduce((acc, r) => { acc[r.device || 'unknown'] = parseInt(r.cnt, 10); return acc; }, {})
    };

    await redis.set(cacheKey, JSON.stringify(resp), 'EX', 60);

    res.json(resp);
  } catch (err) {
    next(err);
  }
});

router.get('/user-stats', apiKeyAuth, rateLimiter, async (req, res, next) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const rows = await knex('events').where({ user_id: userId, app_id: req.app_id }).orderBy('timestamp', 'desc').limit(50);
    const totalEventsRow = await knex('events').where({ user_id: userId, app_id: req.app_id }).count('* as cnt').first();
    const deviceDetails = rows.length ? rows[0].metadata : {};

    res.json({
      userId,
      totalEvents: parseInt(totalEventsRow.cnt, 10),
      recentEvents: rows.map(r => ({ id: r.id, event: r.event_type, timestamp: r.timestamp, metadata: r.metadata })),
      deviceDetails
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
