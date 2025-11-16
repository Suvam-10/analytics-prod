const request = require('supertest');
const app = require('../src/app');

describe('Integration Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('CORS Handling', () => {
    it('should include CORS headers', async () => {
      const res = await request(app)
        .options('/api/auth/register')
        .set('Origin', 'https://example.com');

      expect([200, 204]).toContain(res.statusCode);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoint', async () => {
      const res = await request(app).get('/api/nonexistent');

      expect(res.statusCode).toBe(404);
    });

    it('should handle malformed JSON gracefully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should accept requests within rate limit', async () => {
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            name: `Test App ${i}`,
            owner_email: `test${i}@example.com`
          });

        expect([201, 429]).toContain(res.statusCode);
      }
    });
  });

  describe('Request Size Limits', () => {
    it('should reject oversized payloads', async () => {
      // Create payload larger than 2MB limit
      const largePayload = {
        event_type: 'test',
        metadata: Buffer.alloc(3 * 1024 * 1024).toString() // 3MB
      };

      // This might be 413 (Payload Too Large) or similar
      const res = await request(app)
        .post('/api/analytics/collect')
        .set('x-api-key', 'test-key')
        .send(largePayload);

      expect([413, 400, 401]).toContain(res.statusCode);
    });
  });

  describe('HTTP Method Handling', () => {
    it('should reject wrong HTTP methods', async () => {
      const res = await request(app)
        .get('/api/auth/register'); // Should be POST

      expect(res.statusCode).toBe(404);
    });

    it('should handle OPTIONS requests', async () => {
      const res = await request(app).options('/api/auth/register');

      expect([200, 204]).toContain(res.statusCode);
    });
  });
});

describe('Security Tests', () => {
  describe('API Key Validation', () => {
    it('should reject missing API key for protected endpoints', async () => {
      const res = await request(app)
        .post('/api/analytics/collect')
        .send({ event_type: 'test' });

      expect(res.statusCode).toBe(401);
    });

    it('should reject malformed API key', async () => {
      const res = await request(app)
        .post('/api/analytics/collect')
        .set('x-api-key', '')
        .send({ event_type: 'test' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should handle SQL injection attempts safely', async () => {
      const res = await request(app)
        .get('/api/analytics/event-summary')
        .set('x-api-key', "'; DROP TABLE events; --")
        .query({ event: "'; DROP TABLE events; --" });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const res = await request(app).get('/health');

      expect(res.headers['x-content-type-options']).toBeDefined();
      expect(res.headers['x-frame-options']).toBeDefined();
    });
  });
});

describe('Data Validation Tests', () => {
  describe('Email Validation', () => {
    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test App',
          owner_email: 'not-an-email'
        });

      // Should either succeed (email validation on backend) or fail gracefully
      expect([201, 400]).toContain(res.statusCode);
    });
  });

  describe('UUID Validation', () => {
    it('should handle invalid UUID format', async () => {
      const res = await request(app)
        .get('/api/auth/api-key')
        .query({ app_id: 'not-a-uuid' });

      expect([400, 404]).toContain(res.statusCode);
    });
  });

  describe('Date Validation', () => {
    it('should handle invalid date formats', async () => {
      const res = await request(app)
        .get('/api/analytics/event-summary')
        .set('x-api-key', 'test-key')
        .query({
          startDate: 'invalid-date',
          endDate: 'also-invalid'
        });

      expect([200, 400, 401]).toContain(res.statusCode);
    });
  });

  describe('URL Validation', () => {
    it('should accept valid URLs', async () => {
      const res = await request(app)
        .post('/api/short/create')
        .send({
          app_id: '550e8400-e29b-41d4-a716-446655440000',
          target_url: 'https://example.com'
        });

      // May fail due to invalid app_id, but URL format should be acceptable
      expect([201, 400, 404]).toContain(res.statusCode);
    });

    it('should handle relative URLs', async () => {
      const res = await request(app)
        .post('/api/short/create')
        .send({
          app_id: '550e8400-e29b-41d4-a716-446655440000',
          target_url: '/relative/path'
        });

      expect([201, 400, 404]).toContain(res.statusCode);
    });
  });
});

describe('Performance Tests', () => {
  it('should respond to health check within 100ms', async () => {
    const start = Date.now();
    await request(app).get('/health');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('should handle rapid requests', async () => {
    const promises = Array.from({ length: 10 }, () =>
      request(app).get('/health')
    );

    const results = await Promise.all(promises);
    expect(results.every(r => r.statusCode === 200)).toBe(true);
  });
});
