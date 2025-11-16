# setup-and-run.ps1
# Run this in project root: C:\Users\ASUS\Desktop\analytics-prod
# PowerShell (Admin) is recommended.

$ErrorActionPreference = "Stop"
Write-Host "Starting automated setup-and-run script..." -ForegroundColor Cyan

# Helper: backup file if exists
function Backup-File($path) {
  if (Test-Path $path) {
    $bak = "$path.bak"
    Copy-Item -Path $path -Destination $bak -Force
    Write-Host "Backed up $path -> $bak"
  }
}

# Ensure Docker is available
try {
  docker info > $null 2>&1
} catch {
  Write-Host "ERROR: Docker doesn't appear to be running or accessible. Start Docker Desktop and re-run this script." -ForegroundColor Red
  exit 1
}

# 1) Stop compose stack if running
Write-Host "`n[1] Bringing down any existing docker-compose stack..."
docker compose down

# 2) Fix start.sh BOM & ensure shebang
$startSh = ".\start.sh"
if (Test-Path $startSh) {
  Backup-File $startSh
  $content = Get-Content $startSh -Raw
  $clean = $content -replace '^\uFEFF',''
  # ensure Unix line endings (replace CRLF with LF)
  $clean = $clean -replace "`r`n", "`n"
  Set-Content -Path $startSh -Value $clean -Encoding UTF8
  Write-Host "Fixed BOM and line endings in start.sh. First line:"
  Get-Content $startSh -TotalCount 1 | ForEach-Object { Write-Host $_ }
} else {
  Write-Host "Warning: start.sh not found at $startSh" -ForegroundColor Yellow
}

# 3) Ensure robust redisClient.js
$redisClientPath = ".\src\redisClient.js"
Backup-File $redisClientPath
@'
const Redis = require("ioredis");
const config = require("./config");

const redisUrl = config && config.redisUrl ? config.redisUrl : (process.env.REDIS_URL || "redis://redis:6379");

const client = new Redis(redisUrl);

client.on("error", (err) => console.error("Redis Client Error", err));
client.on("connect", () => console.log("Connected to Redis at", redisUrl));

module.exports = client;
'@ | Set-Content -Path $redisClientPath -Encoding UTF8
Write-Host "Wrote redisClient.js"

# 4) Ensure robust config.js
$configPath = ".\src\config.js"
Backup-File $configPath
@'
require("dotenv").config();
module.exports = {
  port: process.env.PORT || 8080,
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@postgres:5432/analytics",
  redisUrl: process.env.REDIS_URL || "redis://redis:6379",
  apiKeySecret: process.env.API_KEY_SECRET || "changeme",
  jwtSecret: process.env.JWT_SECRET || "changeme2",
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "1000", 10)
};
'@ | Set-Content -Path $configPath -Encoding UTF8
Write-Host "Wrote config.js"

# 5) Ensure robust knexfile
$knexPath = ".\src\db\knexfile.js"
Backup-File $knexPath
@'
const config = (() => {
  try { return require("../config"); } catch (e) { return {}; }
})();

const envDatabaseUrl = process.env.DATABASE_URL || config.databaseUrl;

const connection = envDatabaseUrl || {
  host: process.env.DB_HOST || process.env.POSTGRES_HOST || "postgres",
  port: process.env.DB_PORT || process.env.POSTGRES_PORT || 5432,
  user: process.env.DB_USER || process.env.POSTGRES_USER || "postgres",
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || "postgres",
  database: process.env.DB_NAME || process.env.POSTGRES_DB || "analytics"
};

module.exports = {
  client: "pg",
  connection,
  pool: { min: 2, max: 10 },
  migrations: { directory: __dirname + "/migrations" }
};
'@ | Set-Content -Path $knexPath -Encoding UTF8
Write-Host "Wrote knexfile.js"

# 6) Ensure robust rateLimiter
$rlPath = ".\src\middleware\rateLimiter.js"
Backup-File $rlPath
@'
const config = require("../config");
const redisClient = require("../redisClient");
const localStore = new Map();
function nowMs(){ return Date.now(); }
module.exports = function rateLimiter(req,res,next){
  const identifier = (req.header("x-api-key") || req.ip || "anon").toString();
  const windowMs = config.rateLimitWindowMs || 60000;
  const max = config.rateLimitMax || 1000;
  const key = `rl:${identifier}`;
  (async ()=>{
    try {
      if(redisClient && redisClient.isOpen){
        const cur = await redisClient.incr(key);
        if(cur === 1) await redisClient.pexpire(key, windowMs);
        if(cur > max) return res.status(429).json({ error: "Rate limit exceeded" });
        return next();
      } else {
        const entry = localStore.get(key) || { count:0, start: nowMs() };
        if(nowMs() - entry.start > windowMs){ entry.count=1; entry.start=nowMs(); } else entry.count++;
        localStore.set(key, entry);
        if(entry.count > max) return res.status(429).json({ error: "Rate limit exceeded" });
        return next();
      }
    } catch (err){
      console.warn("rateLimiter error:", err && err.message ? err.message : err);
      return next();
    }
  })();
};
'@ | Set-Content -Path $rlPath -Encoding UTF8
Write-Host "Wrote rateLimiter.js"

# 7) Ensure dotenv is dependency in package.json
Write-Host "`n[7] Checking package.json for dotenv..."
$pkg = Get-Content package.json -Raw | ConvertFrom-Json
if (-not $pkg.dependencies) { $pkg | Add-Member -NotePropertyName dependencies -NotePropertyValue @{} }
if (-not $pkg.dependencies.dotenv) {
  Write-Host "Adding dotenv to package.json dependencies..."
  $pkg.dependencies.dotenv = "^17.2.3"
  $pkg | ConvertTo-Json -Depth 50 | Set-Content package.json -Encoding UTF8
  Write-Host "Running npm install dotenv --no-audit --no-fund ..."
  npm install dotenv --no-audit --no-fund | Out-Null
} else {
  Write-Host "dotenv already present."
}

# 8) Ensure docker-compose.yml has anonymous node_modules volume and REDIS_URL
$dcPath = ".\docker-compose.yml"
Backup-File $dcPath
# Overwrite docker-compose.yml with a known-good template (keeps most settings from original)
@'
services:
  app:
    build: .
    image: analytics-backend:dev
    env_file:
      - .env
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: "redis://redis:6379"
      PORT: ${PORT:-8080}
      API_KEY_TTL_DAYS: ${API_KEY_TTL_DAYS}
      NODE_ENV: ${NODE_ENV:-development}
      MIGRATE_ON_START: ${MIGRATE_ON_START:-true}
      MAX_RETRIES: ${MAX_RETRIES:-60}
      SLEEP_SEC: ${SLEEP_SEC:-2}
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./:/app:cached
      - /app/node_modules
    command: sh ./start.sh
    restart: unless-stopped

  postgres:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: analytics
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 20
      timeout: 2s
      start_period: 5s

  redis:
    image: redis:7
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 5
      timeout: 2s
      start_period: 5s

volumes:
  pgdata:
  redisdata:
'@ | Set-Content -Path $dcPath -Encoding UTF8
Write-Host "Wrote docker-compose.yml (backup created)."

# 9) Ensure .env has required variables
$envPath = ".\.env"
if (-not (Test-Path $envPath)) {
  Write-Host "Creating .env file..."
  @"
# Environment variables for local dev/dockers
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/analytics
REDIS_URL=redis://redis:6379
PORT=8080
NODE_ENV=development
MIGRATE_ON_START=true
"@ | Set-Content -Path $envPath -Encoding UTF8
} else {
  # replace or append entries
  $envText = Get-Content $envPath -Raw
  if ($envText -notmatch 'REDIS_URL=') { Add-Content $envPath "`nREDIS_URL=redis://redis:6379" } else { (Get-Content $envPath) -replace '^\s*REDIS_URL=.*','REDIS_URL=redis://redis:6379' | Set-Content $envPath }
  if ($envText -notmatch 'DATABASE_URL=') { Add-Content $envPath "`nDATABASE_URL=postgresql://postgres:postgres@postgres:5432/analytics" } else { (Get-Content $envPath) -replace '^\s*DATABASE_URL=.*','DATABASE_URL=postgresql://postgres:postgres@postgres:5432/analytics' | Set-Content $envPath }
  if ($envText -notmatch 'PORT=') { Add-Content $envPath "`nPORT=8080" } else { (Get-Content $envPath) -replace '^\s*PORT=.*','PORT=8080' | Set-Content $envPath }
}
Write-Host ".env updated:"
Select-String -Path $envPath -Pattern 'REDIS_URL|DATABASE_URL|PORT' | ForEach-Object { Write-Host $_.Line }

# 10) Remove host node_modules (to avoid platform native mismatch)
if (Test-Path ".\node_modules") {
  Write-Host "`n[10] Removing host node_modules (so container builds native modules correctly)..."
  Remove-Item -Recurse -Force .\node_modules
  Write-Host "Removed host node_modules."
}

# 11) Clean docker (optional prune of unused) - keep minimal to avoid accidental deletes (skipped)
# Write-Host "Pruning unused docker objects..."
# docker system prune -f

# 12) Build images without cache and bring up the stack
Write-Host "`n[12] Building docker images (this may take several minutes)..."
docker compose build --no-cache

Write-Host "`n[13] Starting docker-compose stack..."
docker compose up -d

# 13b) Wait a short while for containers to initialize
Start-Sleep -Seconds 6

# 14) Run the migrations by piping SQL file into Postgres (if migrations file exists)
$migFile = ".\migrations\0001_init.sql"
if (Test-Path $migFile) {
  Write-Host "`n[14] Piping migrations into Postgres..."
  Get-Content $migFile -Raw | docker compose exec -T postgres psql -U postgres -d analytics
  Write-Host "Migration attempt completed."
} else {
  Write-Host "No migrations file found at $migFile. Skipping automatic migration."
}

# 15) Tail the app logs to observe startup (will run until you Ctrl+C)
Write-Host "`n[15] Tailing app logs (press Ctrl+C to stop)..."
docker compose logs -f app --tail=200