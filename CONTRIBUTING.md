# Contributing to Analytics Backend

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (recommended)
- Git

### Local Setup
```bash
git clone <repository-url>
cd analytics-prod
npm ci
cp .env.example .env

# Start dependencies
docker compose up -d postgres redis

# Run migrations
npm run migrate

# Start development server
npm run dev
```

## Development Workflow

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `test/` - Test improvements
- `refactor/` - Code refactoring

### 2. Make Changes
- Follow the existing code style
- Write tests for new functionality
- Update documentation as needed

### 3. Testing
```bash
# Run all tests
npm test

# Watch mode during development
npm run test:watch

# Check coverage
npm run test:coverage
```

### 4. Commit Changes
Write clear, descriptive commit messages:

```bash
git commit -m "feature: add user authentication

- Implement JWT-based authentication
- Add login and logout endpoints
- Include comprehensive tests"
```

Commit message format:
- `type: summary` (50 chars max)
- Blank line
- Detailed description (wrap at 72 chars)
- Blank line
- Related issues/PRs

Types: `feature`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

### 5. Push and Create Pull Request
```bash
git push origin feature/your-feature-name
```

Then create PR on GitHub with:
- Clear title referencing the issue
- Description of changes
- Screenshots/logs if applicable
- Checklist of testing performed

## Code Style

### JavaScript/Node.js
- Use ESLint configuration (if present)
- Prefer const/let over var
- Use async/await over callbacks
- Add JSDoc comments for functions

### Example:
```javascript
/**
 * Calculate event summary statistics
 * @param {string} appId - Application ID
 * @param {Date} startDate - Start date for range
 * @param {Date} endDate - End date for range
 * @returns {Promise<Object>} Summary statistics
 */
async function calculateSummary(appId, startDate, endDate) {
  // Implementation
}
```

### Database
- Use Knex.js for migrations and queries
- Name migrations with timestamps
- Write down migrations for rollback support
- Use transactions for multi-step operations

## Testing Requirements

### Minimum Coverage
- New features: 80% coverage
- Bug fixes: 70% coverage
- Refactoring: Maintain current coverage

### Test Structure
```javascript
describe('Feature Name', () => {
  describe('Happy Path', () => {
    it('should do the expected behavior', () => {
      // Arrange
      const input = { /* */ };
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });

  describe('Error Handling', () => {
    it('should fail with invalid input', () => {
      expect(() => functionUnderTest(invalid)).toThrow();
    });
  });
});
```

## Documentation

### README Updates
Update README.md if:
- Adding new endpoints
- Changing setup instructions
- Adding new features

### API Documentation
- Update Swagger docs in `src/docs/swagger.js`
- Include request/response examples
- Document all error responses

### Code Comments
- Explain "why" not "what"
- Document complex algorithms
- Update comments when changing code

## Performance Considerations

When contributing, consider:
- Query optimization
- Database indexing
- Caching strategies
- Memory usage
- Response times

## Security Checklist

Before submitting:
- [ ] No secrets in code/comments
- [ ] Input validation implemented
- [ ] SQL injection prevention (use Knex)
- [ ] XSS prevention (sanitize output)
- [ ] CSRF protection if applicable
- [ ] Rate limiting considered
- [ ] Authentication checked
- [ ] Authorization validated

## Deployment Testing

Before deployment, test:

```bash
# Build Docker image
docker compose build

# Test in production-like environment
NODE_ENV=production npm test
docker compose -f docker-compose.prod.yml up -d
```

## Common Issues & Solutions

### Port Already in Use
```bash
# Find process using port
lsof -i :8080

# Or stop all containers
docker compose down
```

### Database Connection Error
```bash
# Ensure migrations ran
npm run migrate

# Check connection string in .env
# Verify database is running
docker compose logs postgres
```

### Test Failures
```bash
# Clear Jest cache
npx jest --clearCache

# Run with verbose output
npm test -- --verbose

# Run single test for debugging
npm test -- --testNamePattern="specific test"
```

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create release branch: `release/v1.x.x`
4. Merge to main after approval
5. Tag release: `git tag v1.x.x`
6. Push: `git push origin --tags`

## Getting Help

- Check existing issues/discussions
- Ask in PR comments
- Create detailed issue with:
  - Steps to reproduce
  - Expected vs actual behavior
  - System information
  - Error messages/logs

## Code Review Process

Reviewers will check:
- ✅ Tests pass and coverage maintained
- ✅ Code follows style guide
- ✅ No security vulnerabilities
- ✅ Documentation updated
- ✅ Changes are focused and minimal
- ✅ Commit messages are clear

## Acknowledgments

Contributors making significant contributions may be:
- Added to CONTRIBUTORS.md
- Recognized in release notes
- Given maintainer status (if consistent quality)

Thank you for contributing to Analytics Backend! 🚀
