# Analytics Backend (Production-ready skeleton)

## Quickstart (local)
1. Ensure PostgreSQL and Redis are running.
2. Copy env variables:
   - DATABASE_URL (e.g. postgresql://postgres:postgres@localhost:5432/analytics)
   - REDIS_URL (e.g. redis://localhost:6379)
3. Install:
   npm ci
4. Run migrations:
   npm run migrate
5. Start:
   npm run dev

## Endpoints (overview)
- POST /api/auth/register
- GET /api/auth/api-key?app_id=...
- POST /api/auth/revoke
- POST /api/auth/regenerate
- POST /api/analytics/collect
- GET /api/analytics/event-summary
- GET /api/analytics/user-stats
- POST /api/short/create
- GET /r/:short_code

## Notes
- Replace validateKey implementation with keyId.token pattern for scale.
- Add OAuth onboarding, monitoring, and CI/CD for production.
