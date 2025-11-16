const request = require('supertest');
const app = require('../src/app');
const Knex = require('knex');
const knex = Knex(require('../src/db/knexfile'));

describe('URL Shortener Routes', () => {
  let testAppId;

  beforeAll(async () => {
    // Setup: create test app
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Short URL Test App',
        owner_email: 'shorturl@example.com'
      });

    testAppId = res.body.app.id;
  });

  afterAll(async () => {
    // Clean up
    await knex('short_urls').where({ app_id: testAppId }).del();
    await knex.destroy();
  });

  describe('POST /api/short/create', () => {
    it('should create a short URL with auto-generated code', async () => {
      const res = await request(app)
        .post('/api/short/create')
        .send({
          app_id: testAppId,
          target_url: 'https://www.example.com/very/long/url'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('short_code');
      expect(res.body.target_url).toBe('https://www.example.com/very/long/url');
      expect(res.body.app_id).toBe(testAppId);
      expect(res.body.clicks).toBe(0);
    });

    it('should create a short URL with custom code', async () => {
      const res = await request(app)
        .post('/api/short/create')
        .send({
          app_id: testAppId,
          target_url: 'https://example.com',
          short_code: 'mycustom'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.short_code).toBe('mycustom');
    });

    it('should fail without app_id', async () => {
      const res = await request(app)
        .post('/api/short/create')
        .send({
          target_url: 'https://example.com'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('app_id and target_url required');
    });

    it('should fail without target_url', async () => {
      const res = await request(app)
        .post('/api/short/create')
        .send({
          app_id: testAppId
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('app_id and target_url required');
    });

    it('should accept various URL formats', async () => {
      const urls = [
        'https://example.com',
        'https://example.com/path',
        'https://example.com/path?query=value',
        'https://example.com/path#anchor',
        'https://example.com:8080/path'
      ];

      for (const url of urls) {
        const res = await request(app)
          .post('/api/short/create')
          .send({
            app_id: testAppId,
            target_url: url
          });

        expect(res.statusCode).toBe(201);
        expect(res.body.target_url).toBe(url);
      }
    });

    it('should generate unique short codes', async () => {
      const res1 = await request(app)
        .post('/api/short/create')
        .send({
          app_id: testAppId,
          target_url: 'https://example1.com'
        });

      const res2 = await request(app)
        .post('/api/short/create')
        .send({
          app_id: testAppId,
          target_url: 'https://example2.com'
        });

      expect(res1.body.short_code).not.toBe(res2.body.short_code);
    });
  });

  describe('GET /api/short/stats', () => {
    let shortCode;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/short/create')
        .send({
          app_id: testAppId,
          target_url: 'https://example.com/test'
        });
      shortCode = res.body.short_code;
    });

    it('should get stats for valid short_code', async () => {
      const res = await request(app)
        .get('/api/short/stats')
        .query({ short_code: shortCode });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('short');
      expect(res.body).toHaveProperty('clicks');
      expect(res.body.short.short_code).toBe(shortCode);
      expect(res.body.clicks).toBeGreaterThanOrEqual(0);
    });

    it('should fail without short_code', async () => {
      const res = await request(app)
        .get('/api/short/stats');

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('short_code required');
    });

    it('should return 404 for non-existent short_code', async () => {
      const res = await request(app)
        .get('/api/short/stats')
        .query({ short_code: 'nonexistent123' });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('not found');
    });
  });

  describe('GET /api/short/r/:short_code (Redirect)', () => {
    let shortCode;
    let targetUrl;

    beforeAll(async () => {
      targetUrl = 'https://example.com/redirect-test';
      const res = await request(app)
        .post('/api/short/create')
        .send({
          app_id: testAppId,
          target_url: targetUrl
        });
      shortCode = res.body.short_code;
    });

    it('should redirect to target URL', async () => {
      const res = await request(app)
        .get(`/api/short/r/${shortCode}`)
        .redirects(0); // Don't follow redirects automatically

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(targetUrl);
    });

    it('should increment click count', async () => {
      // Get initial stats
      const statsBefore = await request(app)
        .get('/api/short/stats')
        .query({ short_code: shortCode });

      const clicksBefore = statsBefore.body.clicks;

      // Trigger redirect
      await request(app)
        .get(`/api/short/r/${shortCode}`)
        .redirects(0);

      // Get updated stats
      const statsAfter = await request(app)
        .get('/api/short/stats')
        .query({ short_code: shortCode });

      expect(statsAfter.body.clicks).toBe(clicksBefore + 1);
    });

    it('should return 404 for non-existent short_code', async () => {
      const res = await request(app)
        .get(`/api/short/r/nonexistent123`)
        .redirects(0);

      expect(res.statusCode).toBe(404);
    });

    it('should record click metadata (IP, user agent)', async () => {
      // Trigger redirect with specific user agent
      const userAgent = 'Test User Agent 1.0';
      await request(app)
        .get(`/api/short/r/${shortCode}`)
        .set('User-Agent', userAgent)
        .redirects(0);

      // Verify click was recorded
      const stats = await request(app)
        .get('/api/short/stats')
        .query({ short_code: shortCode });

      expect(stats.statusCode).toBe(200);
      expect(stats.body.clicks).toBeGreaterThan(0);
    });

    it('should handle multiple redirects', async () => {
      const statsBefore = await request(app)
        .get('/api/short/stats')
        .query({ short_code: shortCode });

      const initialClicks = statsBefore.body.clicks;

      // Multiple redirects
      for (let i = 0; i < 5; i++) {
        await request(app)
          .get(`/api/short/r/${shortCode}`)
          .redirects(0);
      }

      const statsAfter = await request(app)
        .get('/api/short/stats')
        .query({ short_code: shortCode });

      expect(statsAfter.body.clicks).toBe(initialClicks + 5);
    });
  });
});
