# Testing Documentation

## Overview

The Analytics Backend includes comprehensive test coverage using Jest and Supertest to ensure reliability and maintainability. Tests cover unit, integration, and security aspects.

## Test Suite Structure

```
tests/
├── auth.test.js          # Authentication & API key management
├── analytics.test.js     # Event collection & analytics endpoints
├── shorturl.test.js      # URL shortening & redirect functionality
└── integration.test.js   # System integration & security tests
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (auto-rerun on changes)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Integration Tests Only
```bash
npm run test:integration
```

## Test Categories

### 1. Authentication Tests (`auth.test.js`)

Tests for API key and app registration management:

- **POST /api/auth/register**
  - Register new app successfully
  - Handle missing required fields
  - Validate email format
  - Return API key with response

- **GET /api/auth/api-key**
  - Retrieve API key for valid app_id
  - Fail without app_id parameter
  - Return 404 for non-existent app_id

- **POST /api/auth/revoke**
  - Revoke API key successfully
  - Validate key_id parameter

- **POST /api/auth/regenerate**
  - Generate new API key
  - Maintain app_id association

### 2. Analytics Tests (`analytics.test.js`)

Tests for event collection and analytics queries:

- **POST /api/analytics/collect**
  - Single event collection
  - Batch event collection (up to 500 events)
  - API key authentication
  - Custom metadata handling
  - Timestamp override
  - Large payload handling
  - Device classification

- **GET /api/analytics/event-summary**
  - Default summary statistics
  - Filter by event type
  - Filter by date range
  - Device breakdown reporting
  - Caching behavior

- **GET /api/analytics/user-stats**
  - Retrieve user statistics
  - Recent events (limited to 50)
  - Handle non-existent users
  - Device details tracking

### 3. Short URL Tests (`shorturl.test.js`)

Tests for URL shortening and click tracking:

- **POST /api/short/create**
  - Create with auto-generated code
  - Create with custom code
  - Validate app_id and target_url
  - Support various URL formats
  - Unique code generation

- **GET /api/short/stats**
  - Retrieve click statistics
  - Handle non-existent short codes
  - Return click count and metadata

- **GET /api/short/r/:short_code** (Redirect)
  - Redirect to target URL
  - Increment click counter
  - Record IP and user agent
  - Handle multiple redirects

### 4. Integration Tests (`integration.test.js`)

System-wide tests:

- **Health Check**
  - `/health` endpoint availability
  - Response format validation

- **CORS Handling**
  - Cross-origin request support
  - Proper header inclusion

- **Error Handling**
  - 404 for non-existent endpoints
  - Graceful JSON parsing errors
  - Method validation

- **Rate Limiting**
  - Request throttling
  - Rate limit headers

- **Security Tests**
  - SQL injection prevention
  - API key validation
  - Security headers presence

- **Data Validation**
  - Email format validation
  - UUID format validation
  - Date format validation
  - URL format validation

- **Performance Tests**
  - Health check response time < 100ms
  - Concurrent request handling

## Coverage Thresholds

```json
{
  "branches": 50,
  "functions": 50,
  "lines": 50,
  "statements": 50
}
```

Current target: 50% coverage, increase with each release.

## Running Tests in Docker

```bash
# Build with development dependencies
docker compose build

# Run tests inside container
docker compose exec app npm test

# Run with coverage
docker compose exec app npm run test:coverage
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: analytics
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
      redis:
        image: redis:7

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run test:integration
```

## Test Output Format

Jest provides multiple output formats:

```bash
# Default (human-readable)
npm test

# JSON format (for CI/CD)
npm test -- --json --outputFile=test-results.json

# JUNIT format (for Jenkins)
npm test -- --reporters=default --reporters=jest-junit
```

## Debugging Tests

### Run Single Test File
```bash
npm test -- auth.test.js
```

### Run Single Test
```bash
npm test -- auth.test.js -t "should register a new app successfully"
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Test Data Management

Tests use the actual database configured in `.env`. Consider using:

1. **Database Transactions** - Rollback after each test
2. **Isolated Test Data** - Use unique IDs per test run
3. **Test Fixtures** - Pre-seeded data for complex tests
4. **Cleanup Hooks** - `beforeEach` and `afterEach` for setup/teardown

## Mocking External Services

For services like email or payment:

```javascript
// Mock Redis
jest.mock('../src/redisClient', () => ({
  get: jest.fn(),
  set: jest.fn(),
  on: jest.fn()
}));

// Use in tests
const redisClient = require('../src/redisClient');
redisClient.get.mockResolvedValue('cached-value');
```

## Performance Testing

Monitor test execution time:

```bash
npm test -- --verbose --logHeapUsage
```

Target: < 30 seconds for full suite

## Best Practices

1. **One assertion per test** (ideally)
2. **Descriptive test names** - Clearly state what is being tested
3. **Setup/Teardown** - Use `beforeAll`, `afterAll`, `beforeEach`, `afterEach`
4. **Avoid test interdependence** - Tests should be independent
5. **Use test utilities** - Create helper functions for common operations
6. **Keep tests maintainable** - DRY principle applies to tests too

## Troubleshooting

### Database Locked
- Ensure previous tests completed
- Check for hung connections
- Clear connections in afterAll hooks

### Test Timeout
- Increase timeout: `jest.setTimeout(30000)`
- Check database/redis connectivity
- Look for infinite loops

### Flaky Tests
- Avoid time-dependent assertions
- Use mock timers for time-based tests
- Ensure proper async/await handling

## Contributing Tests

When adding new features:

1. Write tests first (TDD approach)
2. Ensure 50%+ coverage for new code
3. Update this documentation
4. Run full suite before submitting PR
5. Include integration tests for new endpoints

## Resources

- [Jest Documentation](https://jestjs.io)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://jestjs.io/docs/getting-started)
