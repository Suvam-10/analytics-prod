# Render.com Deployment Guide

## Overview

This guide covers deploying the Analytics Backend to Render.com with managed PostgreSQL and Redis services.

## Prerequisites

- GitHub account with repository access
- Render.com account
- Git repository pushed to GitHub

## Step-by-Step Deployment

### 1. Push Code to GitHub

Ensure your code is pushed to your GitHub repository:

```bash
git push origin master
```

### 2. Create Render Account & Connect Repository

1. Go to [render.com](https://render.com)
2. Sign up or log in
3. Click "New +" button
4. Select "Web Service"
5. Connect your GitHub repository
6. Select `analytics-prod` repository

### 3. Configure Web Service

In the Render dashboard, set:

- **Name**: `analytics-backend`
- **Environment**: `Docker`
- **Region**: US (Oregon) or your closest region
- **Plan**: Free or Starter (Free plan has limitations)
- **Auto-Deploy**: Enable (optional, recommended)

Leave all other settings at defaults initially.

### 4. Add PostgreSQL Database

1. Click "New +"
2. Select "PostgreSQL"
3. Set:
   - **Name**: `analytics-db`
   - **Database**: `analytics`
   - **User**: `postgres`
   - **Region**: Same as web service
   - **Plan**: Free or Starter

4. Click "Create Database"
5. Note the `Internal Database URL` (this will be used by the web service)

### 5. Add Redis Cache

1. Click "New +"
2. Select "Redis"
3. Set:
   - **Name**: `analytics-redis`
   - **Region**: Same as web service
   - **Plan**: Free or Starter
   - **Eviction Policy**: `allkeys-lru`

4. Click "Create Redis"
5. Note the `Internal Redis URL`

### 6. Link Database & Redis to Web Service

Go back to your web service settings:

1. Click on "Environment"
2. Add environment variables:

```
NODE_ENV=production
PORT=10000
DATABASE_URL=<paste-internal-database-url-here>
REDIS_URL=<paste-internal-redis-url-here>
API_KEY_SECRET=<generate-random-32-char-string>
JWT_SECRET=<generate-random-32-char-string>
MIGRATE_ON_START=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=1000
```

### 7. Deploy

1. Click "Deploy"
2. Watch deployment logs for progress
3. After deployment completes, click the service URL to visit your API
4. Verify at `https://your-service.onrender.com/docs` (Swagger UI)

## Monitoring & Logs

### View Logs

In the Render dashboard:
1. Select your web service
2. Click "Logs" tab
3. View real-time logs

```bash
# Real-time tail
tail -f /var/log/your-service.log
```

### Check Health

```bash
curl https://your-service.onrender.com/health
```

### Monitor Database

In Render dashboard, click PostgreSQL service:
- View connections
- Monitor storage
- View query stats

### Monitor Redis

In Render dashboard, click Redis service:
- View memory usage
- Monitor key count
- Check operations/sec

## Environment Variables Explained

### Required for Production
- `DATABASE_URL` - PostgreSQL connection string (from Render)
- `REDIS_URL` - Redis connection URL (from Render)
- `API_KEY_SECRET` - Secret for API key generation (generate new)
- `JWT_SECRET` - Secret for JWT tokens (generate new)

### Optional but Recommended
- `MIGRATE_ON_START=true` - Auto-run database migrations
- `RATE_LIMIT_WINDOW_MS=60000` - Rate limit window in ms
- `RATE_LIMIT_MAX=1000` - Max requests per window

### Generate Secure Secrets

```bash
# Generate 32-character random strings
openssl rand -hex 16
# Repeat 2x for both secrets
```

## Troubleshooting

### Build Failures

**Error**: `npm ci failed`
- **Cause**: Missing package-lock.json
- **Solution**: Ensure package-lock.json is committed to GitHub

**Error**: `Dockerfile not found`
- **Cause**: Wrong repository or branch
- **Solution**: Verify Dockerfile is in repository root

### Runtime Errors

**Error**: `ENOTFOUND postgres` or `ENOTFOUND redis`
- **Cause**: Environment variables not set or using wrong URLs
- **Solution**: 
  1. Check DATABASE_URL and REDIS_URL in environment variables
  2. Use the **Internal** URLs (not public URLs)
  3. Ensure services are linked to the web service

**Error**: `Migration failed`
- **Cause**: Database not ready or connection failed
- **Solution**:
  1. Check DATABASE_URL is correct
  2. Verify PostgreSQL service is running
  3. Check logs for specific migration error

**Error**: `Port already in use`
- **Cause**: PORT environment variable not set
- **Solution**: Set `PORT=10000` in environment variables

### Performance Issues

**Slow responses**:
1. Check Redis connection (should cache frequently accessed data)
2. Monitor database connection pool
3. Review slow query logs in PostgreSQL

**High memory usage**:
1. Reduce `RATE_LIMIT_MAX` value
2. Check for memory leaks in logs
3. Upgrade to higher plan

## Scaling & Upgrades

### Scale Up

1. Go to Web Service settings
2. Change Plan from Free to Starter or Pro
3. This provides more memory/CPU

### High Availability

For production:
1. Create multiple web service instances (with load balancer)
2. Use dedicated PostgreSQL plan (not free)
3. Use dedicated Redis plan (not free)

## Backup & Restore

### PostgreSQL Backups

Render automatically backs up PostgreSQL:
1. Go to PostgreSQL service
2. Click "Backups" tab
3. View automatic backups (hourly)

### Manual Export

```bash
# Connect to PostgreSQL and export
pg_dump $DATABASE_URL > backup.sql

# Restore from backup
psql $DATABASE_URL < backup.sql
```

## Cleanup

To delete services:

1. **Delete Web Service**
   - Go to Web Service → Settings
   - Scroll to "Danger Zone"
   - Click "Delete Web Service"

2. **Delete PostgreSQL**
   - Go to PostgreSQL service → Settings
   - Click "Delete Database"
   - Backups will be retained

3. **Delete Redis**
   - Go to Redis service → Settings
   - Click "Delete Redis"

## FAQ

**Q: How much does Render cost?**
A: Free tier includes 10 PostgreSQL databases and 1 Redis instance with limited resources. See [pricing](https://render.com/pricing).

**Q: Can I use GitHub Actions for CI/CD?**
A: Yes, Render integrates with GitHub. Enable "Auto Deploy" to deploy on every push.

**Q: How do I scale my application?**
A: 
1. Upgrade your Web Service plan
2. Use multiple instances with a load balancer
3. Optimize database queries and add indexing

**Q: Can I monitor my application?**
A: Yes, Render provides logs, metrics, and alerts. View them in the dashboard.

**Q: How do I enable HTTPS?**
A: Render automatically provides HTTPS for all services (*.onrender.com).

**Q: What if my service goes to sleep?**
A: Free tier services spin down after 15 minutes of inactivity. Paid plans stay active.

## Next Steps

After deployment:

1. **Set up a custom domain** (Render settings → Environment)
2. **Configure monitoring/alerts** 
3. **Set up CI/CD** with GitHub Actions
4. **Load testing** to verify performance
5. **Plan for scaling** as usage grows

## Support

- [Render Docs](https://render.com/docs)
- [Render Dashboard](https://dashboard.render.com)
- [Status Page](https://status.render.com)
