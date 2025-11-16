const request = require('supertest');
const app = require('../src/app');
const Knex = require('knex');
const knex = Knex(require('../src/db/knexfile'));

describe('Analytics Routes', () => {
  let testAppId;
  let testApiKey;

  beforeAll(async () => {
    // Setup: create test app
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Analytics Test App',
        owner_email: 'analytics@example.com'
      });

    testAppId = res.body.app.id;
    testApiKey = res.body.apiKey.token;
  });

  afterAll(async () => {
    // Clean up test data
    await knex('events').where({ app_id: testAppId }).del();
    await knex.destroy();
  });

  describe('POST /api/analytics/collect', () => {
    it('should collect a single event', async () => {
      const res = await request(app)
        .post('/api/analytics/collect')
        .set('x-api-key', testApiKey)
        .send({
          event_type: 'page_view',
          url: '/',
          device: 'desktop'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.accepted).toBe(1);
    });

    it('should collect multiple events in batch', async () => {
      const res = await request(app)
        .post('/api/analytics/collect')
        .set('x-api-key', testApiKey)
        .send({
          events: [
            { event_type: 'page_view', url: '/home', device: 'mobile' },
            { event_type: 'button_click', url: '/home', metadata: { button: 'submit' } },
            { event_type: 'form_submit', url: '/contact' }
          ]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.accepted).toBe(3);
    });

    it('should fail without API key', async () => {
      const res = await request(app)
        .post('/api/analytics/collect')
        .send({
          event_type: 'page_view',
          url: '/'
        });

      expect(res.statusCode).toBe(401);
    });

    it('should fail with invalid API key', async () => {
      const res = await request(app)
        .post('/api/analytics/collect')
        .set('x-api-key', 'invalid-key')
        .send({
          event_type: 'page_view',
          url: '/'
        });

      expect(res.statusCode).toBe(401);
    });

    it('should fail with empty events array', async () => {
      const res = await request(app)
        .post('/api/analytics/collect')
        .set('x-api-key', testApiKey)
        .send({ events: [] });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('No events provided');
    });

    it('should fail without event_type', async () => {
      const res = await request(app)
        .post('/api/analytics/collect')
        .set('x-api-key', testApiKey)
        .send({
          url: '/'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('No events provided');
    });

    it('should handle large payloads', async () => {
      const events = Array.from({ length: 500 }, (_, i) => ({
        event_type: `event_${i % 5}`,
        url: `/page-${i % 10}`,
        device: ['desktop', 'mobile', 'tablet'][i % 3],
        userId: `user_${i % 100}`
      }));

      const res = await request(app)
        .post('/api/analytics/collect')
        .set('x-api-key', testApiKey)
        .send({ events });

      expect(res.statusCode).toBe(201);
      expect(res.body.accepted).toBe(500);
    });

    it('should include custom metadata', async () => {
      const res = await request(app)
        .post('/api/analytics/collect')
        .set('x-api-key', testApiKey)
        .send({
          event_type: 'purchase',
          url: '/checkout',
          metadata: {
            amount: 99.99,
            currency: 'USD',
            items: 3
          }
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.accepted).toBe(1);
    });

    it('should handle timestamp override', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago

      const res = await request(app)
        .post('/api/analytics/collect')
        .set('x-api-key', testApiKey)
        .send({
          event_type: 'page_view',
          timestamp: pastDate
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.accepted).toBe(1);
    });
  });

  describe('GET /api/analytics/event-summary', () => {
    beforeAll(async () => {
      // Create test data
      await request(app)
        .post('/api/analytics/collect')
        .set('x-api-key', testApiKey)
        .send({
          events: [
            { event_type: 'page_view', device: 'desktop', user_id: 'user1' },
            { event_type: 'page_view', device: 'mobile', user_id: 'user2' },
            { event_type: 'button_click', device: 'desktop', user_id: 'user1' },
            { event_type: 'button_click', device: 'mobile', user_id: 'user3' }
          ]
        });
    });

    it('should get event summary with defaults', async () => {
      const res = await request(app)
        .get('/api/analytics/event-summary')
        .set('x-api-key', testApiKey);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('count');
      expect(res.body).toHaveProperty('uniqueUsers');
      expect(res.body).toHaveProperty('deviceData');
      expect(typeof res.body.count).toBe('number');
    });

    it('should filter by event type', async () => {
      const res = await request(app)
        .get('/api/analytics/event-summary')
        .set('x-api-key', testApiKey)
        .query({ event: 'page_view' });

      expect(res.statusCode).toBe(200);
      expect(res.body.event).toBe('page_view');
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const res = await request(app)
        .get('/api/analytics/event-summary')
        .set('x-api-key', testApiKey)
        .query({
          startDate: yesterday.toISOString(),
          endDate: now.toISOString()
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBeGreaterThanOrEqual(0);
    });

    it('should fail without API key', async () => {
      const res = await request(app)
        .get('/api/analytics/event-summary');

      expect(res.statusCode).toBe(401);
    });

    it('should return device breakdown', async () => {
      const res = await request(app)
        .get('/api/analytics/event-summary')
        .set('x-api-key', testApiKey);

      expect(res.statusCode).toBe(200);
      expect(res.body.deviceData).toBeDefined();
      expect(typeof res.body.deviceData).toBe('object');
    });
  });

  describe('GET /api/analytics/user-stats', () => {
    beforeAll(async () => {
      // Create test user data
      await request(app)
        .post('/api/analytics/collect')
        .set('x-api-key', testApiKey)
        .send({
          events: [
            { event_type: 'login', user_id: 'test_user_123' },
            { event_type: 'page_view', user_id: 'test_user_123', url: '/dashboard' },
            { event_type: 'button_click', user_id: 'test_user_123', url: '/dashboard', metadata: { button: 'export' } }
          ]
        });
    });

    it('should get user stats for valid userId', async () => {
      const res = await request(app)
        .get('/api/analytics/user-stats')
        .set('x-api-key', testApiKey)
        .query({ userId: 'test_user_123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.userId).toBe('test_user_123');
      expect(res.body).toHaveProperty('totalEvents');
      expect(res.body).toHaveProperty('recentEvents');
      expect(res.body).toHaveProperty('deviceDetails');
    });

    it('should fail without userId', async () => {
      const res = await request(app)
        .get('/api/analytics/user-stats')
        .set('x-api-key', testApiKey);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('userId is required');
    });

    it('should fail without API key', async () => {
      const res = await request(app)
        .get('/api/analytics/user-stats')
        .query({ userId: 'test_user' });

      expect(res.statusCode).toBe(401);
    });

    it('should return recent events limited to 50', async () => {
      const res = await request(app)
        .get('/api/analytics/user-stats')
        .set('x-api-key', testApiKey)
        .query({ userId: 'test_user_123' });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.recentEvents)).toBe(true);
      expect(res.body.recentEvents.length).toBeLessThanOrEqual(50);
    });

    it('should return 0 events for non-existent user', async () => {
      const res = await request(app)
        .get('/api/analytics/user-stats')
        .set('x-api-key', testApiKey)
        .query({ userId: 'non_existent_user' });

      expect(res.statusCode).toBe(200);
      expect(res.body.totalEvents).toBe(0);
      expect(res.body.recentEvents.length).toBe(0);
    });
  });
});
