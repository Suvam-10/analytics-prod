const request = require('supertest');
const app = require('../src/app');
const Knex = require('knex');
const knex = Knex(require('../src/db/knexfile'));

describe('Auth Routes', () => {
  beforeAll(async () => {
    // Ensure tables are migrated
    await knex.migrate.latest();
  });

  afterAll(async () => {
    await knex.destroy();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new app successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test App 1',
          owner_email: 'owner@example.com',
          meta: { company: 'Test Corp' }
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('app');
      expect(res.body).toHaveProperty('apiKey');
      expect(res.body.app.name).toBe('Test App 1');
      expect(res.body.app.owner_email).toBe('owner@example.com');
      expect(res.body.apiKey.token).toBeDefined();
    });

    it('should fail without name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          owner_email: 'owner@example.com'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('name and owner_email required');
    });

    it('should fail without owner_email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test App'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('name and owner_email required');
    });

    it('should fail without body', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('name and owner_email required');
    });
  });

  describe('GET /api/auth/api-key', () => {
    let testAppId;

    beforeAll(async () => {
      // Create an app to test with
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'API Key Test App',
          owner_email: 'apikey@example.com'
        });
      testAppId = res.body.app.id;
    });

    it('should retrieve API key for valid app_id', async () => {
      const res = await request(app)
        .get('/api/auth/api-key')
        .query({ app_id: testAppId });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('key_id');
      expect(res.body.app_id).toBe(testAppId);
    });

    it('should fail without app_id query param', async () => {
      const res = await request(app).get('/api/auth/api-key');

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('app_id required');
    });

    it('should return 404 for non-existent app_id', async () => {
      const res = await request(app)
        .get('/api/auth/api-key')
        .query({ app_id: '00000000-0000-0000-0000-000000000000' });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('No API key found');
    });
  });

  describe('POST /api/auth/revoke', () => {
    let testKeyId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Revoke Test App',
          owner_email: 'revoke@example.com'
        });
      testKeyId = res.body.apiKey.id;
    });

    it('should revoke API key successfully', async () => {
      const res = await request(app)
        .post('/api/auth/revoke')
        .send({ key_id: testKeyId });

      expect(res.statusCode).toBe(200);
      expect(res.body.revoked).toBe(true);
    });

    it('should fail without key_id', async () => {
      const res = await request(app)
        .post('/api/auth/revoke')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('key_id required');
    });
  });

  describe('POST /api/auth/regenerate', () => {
    let testKeyId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Regenerate Test App',
          owner_email: 'regenerate@example.com'
        });
      testKeyId = res.body.apiKey.id;
    });

    it('should regenerate API key successfully', async () => {
      const res = await request(app)
        .post('/api/auth/regenerate')
        .send({ key_id: testKeyId });

      expect(res.statusCode).toBe(200);
      expect(res.body.key).toBeDefined();
      expect(typeof res.body.key).toBe('string');
    });

    it('should fail without key_id', async () => {
      const res = await request(app)
        .post('/api/auth/regenerate')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('key_id required');
    });
  });
});
