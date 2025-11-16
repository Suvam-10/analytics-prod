# Render.com Quick Start - Analytics Backend

## The Issue You Encountered

When deploying to Render, you got errors like:
```
Postgres not ready (60/60). Timed out waiting for Postgres after 60 tries
getaddrinfo ENOTFOUND postgres
getaddrinfo ENOTFOUND redis
```

**Root Cause:** The app was trying to connect to hardcoded hostnames (`postgres`, `redis`) that don't exist on Render.

## The Solution in 5 Steps

### 1. Create Services on Render Dashboard
Go to https://render.com/dashboard and create:
- **PostgreSQL Database** (note: this creates a managed service)
- **Redis Cache** (note: this creates a managed service)

### 2. Get Internal Connection URLs
When services are created, Render shows you connection details. **Use the Internal URLs:**

```
PostgreSQL Internal: postgresql://user:pass@analytics-prod-db.internal:5432/analytics
Redis Internal:      redis://analytics-prod-redis.internal:6379
```

**Key:** URLs contain `.internal` - this is for service-to-service communication within your project.

### 3. Create Web Service
Click "New+" → "Web Service":
- Connect your GitHub repo
- Select the `analytics-prod` branch
- Runtime: Docker (auto-detected from Dockerfile)

### 4. Set Environment Variables
In the Render dashboard, add these environment variables to your web service:

```
NODE_ENV=production
PORT=10000
API_KEY_SECRET=your-random-secret-here
JWT_SECRET=your-random-jwt-secret-here
DATABASE_URL=postgresql://user:pass@analytics-prod-db.internal:5432/analytics
REDIS_URL=redis://analytics-prod-redis.internal:6379
MIGRATE_ON_START=true
```

**Replace the connection strings with your actual Internal URLs from step 2.**

### 5. Deploy
Click "Deploy" - Render will:
1. Clone your repo from GitHub
2. Build the Docker image
3. Start the container
4. Run database migrations automatically
5. Connect to PostgreSQL and Redis

## Verification

Once deployed, check the logs in Render dashboard for:
```
Analytics backend listening on port 10000
Connected to Redis
Migrations completed
```

Then test the API:
```bash
curl https://your-service-name.onrender.com/health
```

Should return:
```json
{"status":"ok"}
```

## Troubleshooting

### Still getting "ENOTFOUND postgres"?
- Double-check your DATABASE_URL uses the `.internal` URL (not public)
- Make sure the database service name matches your URL
- Restart the web service from Render dashboard

### Still getting "ENOTFOUND redis"?
- Double-check your REDIS_URL uses the `.internal` URL (not public)
- Make sure the Redis service name matches your URL
- Restart the web service from Render dashboard

### App crashes after deployment?
- Check logs in Render dashboard (click service → Logs)
- Most common: Wrong database URL or Redis URL
- Next common: Missing environment variables

### Need detailed help?
See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for comprehensive troubleshooting and advanced setup.

## Important Differences from Local Development

| Local | Render |
|-------|--------|
| `localhost:5432` | `.internal:5432` |
| `localhost:6379` | `.internal:6379` |
| `.env` file | Environment variables in dashboard |
| `docker compose up` | Automatic via GitHub webhook |

## Key Learning

Managed services on cloud platforms typically provide **internal URLs** for service-to-service communication. Always use these internal URLs for services deployed on the same platform - they're:
- Faster (no internet roundtrip)
- More secure (not exposed publicly)
- Properly networked within the platform

This same pattern applies to Heroku, Railway, AWS, etc. - each platform has its own internal networking setup.
