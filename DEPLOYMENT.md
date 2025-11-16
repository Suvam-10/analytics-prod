# Analytics Backend - Deployment Guide

This document provides comprehensive deployment instructions for various cloud hosting platforms.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Docker Setup](#docker-setup)
- [AWS EC2 Deployment](#aws-ec2-deployment)
- [Heroku Deployment](#heroku-deployment)
- [Render.com Deployment](#rendercom-deployment)
- [Railway.app Deployment](#railwayapp-deployment)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Monitoring & Logs](#monitoring--logs)

## Prerequisites

### Required Tools
- Docker and Docker Compose
- Git
- Cloud platform CLI tools (varies by platform)

### Local Testing
Ensure the application runs locally before deploying:
```bash
docker compose build
docker compose up -d
docker compose logs -f app
```

The app should be accessible at `http://localhost:8080` and show:
- Analytics backend listening on port 8080
- Connected to Redis
- Migrations completed

## Docker Setup

### Production Dockerfile
The provided Dockerfile uses multi-stage builds for optimal image size:

1. **deps stage**: Installs dependencies
2. **runner stage**: Minimal runtime image with:
   - Non-root `appuser` for security
   - Health checks enabled
   - Signal forwarding support

### Building Images
```bash
# Development
docker compose build

# Production (no cache)
docker compose build --no-cache

# Specific image
docker build -t analytics-backend:prod .
```

## AWS EC2 Deployment

### Step 1: Set Up EC2 Instance
```bash
# Launch Ubuntu 22.04 LTS t3.micro (free tier eligible)
# Open Security Group ports: 80, 443, 8080 (for testing)
```

### Step 2: Install Docker & Docker Compose
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

### Step 3: Clone Repository
```bash
git clone <your-repo-url> analytics-backend
cd analytics-backend
```

### Step 4: Set Environment Variables
```bash
cat > .env << EOF
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://postgres:password@db.example.com:5432/analytics
REDIS_URL=redis://cache.example.com:6379
API_KEY_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
MIGRATE_ON_START=true
EOF
```

### Step 5: Deploy with Docker Compose
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Step 6: Set Up Reverse Proxy (Nginx)
```bash
sudo apt-get install -y nginx

# Create nginx config
sudo tee /etc/nginx/sites-available/analytics << EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/analytics /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Heroku Deployment

### Step 1: Create Heroku App
```bash
heroku login
heroku create analytics-backend
```

### Step 2: Add PostgreSQL & Redis Add-ons
```bash
heroku addons:create heroku-postgresql:hobby-dev -a analytics-backend
heroku addons:create heroku-redis:premium-0 -a analytics-backend
```

### Step 3: Set Environment Variables
```bash
heroku config:set \
  NODE_ENV=production \
  API_KEY_SECRET=$(openssl rand -hex 32) \
  JWT_SECRET=$(openssl rand -hex 32) \
  -a analytics-backend
```

### Step 4: Deploy
```bash
git push heroku main
```

The DATABASE_URL and REDIS_URL are automatically set by Heroku add-ons.

### Step 5: Verify
```bash
heroku logs -f -a analytics-backend
heroku open -a analytics-backend
```

## Render.com Deployment

### Step 1: Connect GitHub Repository
- Go to render.com and connect your GitHub repository
- Click "New+" → "Web Service"

### Step 2: Configure Web Service
```
Name: analytics-backend
Region: Oregon (or closest)
Branch: main
Runtime: Docker
Plan: Free (or Starter)
```

### Step 3: Set Environment Variables in Render Dashboard
```
NODE_ENV=production
PORT=10000
API_KEY_SECRET=<generate-random-string>
JWT_SECRET=<generate-random-string>
DATABASE_URL=<postgresql-url-from-render-postgres>
REDIS_URL=<redis-url-from-render-redis>
MIGRATE_ON_START=true
```

### Step 4: Create PostgreSQL & Redis Services
- Add PostgreSQL database service from Render
- Add Redis service from Render
- Copy connection URLs to environment variables

### Step 5: Deploy
Click "Deploy" - Render will automatically build and deploy from Dockerfile.

## Railway.app Deployment

### Step 1: Create Railway Account
- Sign up at railway.app
- Connect GitHub account

### Step 2: Start New Project
```bash
railway login
railway init
```

### Step 3: Add Services
```bash
# PostgreSQL
railway add
# Select postgresql

# Redis
railway add
# Select redis
```

### Step 4: Deploy Application
```bash
railway up
```

### Step 5: Set Environment Variables
```bash
railway variables set \
  NODE_ENV=production \
  API_KEY_SECRET=$(openssl rand -hex 32) \
  JWT_SECRET=$(openssl rand -hex 32)
```

DATABASE_URL and REDIS_URL are automatically set by Railway.

## Environment Variables

### Required
```
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://user:pass@host:5432/analytics
REDIS_URL=redis://host:6379
API_KEY_SECRET=<random-32-char-string>
JWT_SECRET=<random-32-char-string>
```

### Optional
```
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=1000
API_KEY_TTL_DAYS=365
MIGRATE_ON_START=true
MAX_RETRIES=60
SLEEP_SEC=2
```

## Database Migrations

### Auto-run on Start
Set `MIGRATE_ON_START=true` in environment variables. Migrations run automatically when app starts.

### Manual Migration
```bash
# Inside container
docker compose exec app npm run migrate

# View migration status
docker compose exec app npx knex --knexfile src/db/knexfile.js migrate:status

# Rollback last migration
docker compose exec app npm run rollback
```

## Monitoring & Logs

### Docker Compose
```bash
# View logs
docker compose logs -f app

# View specific service
docker compose logs postgres
docker compose logs redis

# Last N lines
docker compose logs --tail=50 app
```

### Cloud Platform Logging

**AWS CloudWatch**
```bash
aws logs tail /aws/ec2/analytics-backend --follow
```

**Heroku**
```bash
heroku logs -f
```

**Render**
- Dashboard → Web Service → Logs tab

**Railway**
```bash
railway logs
```

## Health Checks

The application implements health checks:
- Endpoint: `GET /health` (if implemented in routes)
- Docker health check: `nc -z 127.0.0.1 8080`
- Postgres: `pg_isready -U postgres`
- Redis: `redis-cli ping`

## Troubleshooting

### Connection Refused
- Verify environment variables are set
- Check firewall rules on cloud platform
- Verify database and cache services are running

### Migrations Failed
```bash
docker compose logs app | grep -i migrate
```

### Memory Issues
- Reduce pool sizes in knexfile.js
- Scale up instance type
- Monitor Redis memory usage

### Rate Limiting
Adjust environment variables:
```
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=1000
```

## Best Practices

1. **Security**
   - Use strong API_KEY_SECRET and JWT_SECRET
   - Keep secrets out of version control
   - Use SSL/TLS for all connections

2. **Performance**
   - Enable Redis caching
   - Use connection pooling
   - Monitor response times

3. **Reliability**
   - Set up automated backups for PostgreSQL
   - Monitor error rates and logs
   - Implement alerting

4. **Scalability**
   - Use load balancers for multiple instances
   - Consider separate database instances
   - Implement caching strategies

## Support

For issues specific to cloud platforms:
- AWS: [AWS Documentation](https://docs.aws.amazon.com)
- Heroku: [Heroku Dev Center](https://devcenter.heroku.com)
- Render: [Render Docs](https://render.com/docs)
- Railway: [Railway Docs](https://docs.railway.app)
