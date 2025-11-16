# ---------- stage: deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
# copy only package files first to leverage layer caching
COPY package*.json ./
# install production dependencies only
RUN npm ci --omit=dev

# ---------- stage: runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# install small utils: postgres client for pg_isready (optional) and netcat for healthchecks
RUN apk add --no-cache postgresql-client netcat-openbsd

# create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# copy node_modules from deps stage (preserves ownership of files inside image)
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
# copy application source (owned by appuser)
COPY --chown=appuser:appgroup . .

# make sure start script is executable
RUN chmod +x ./start.sh || true

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD nc -z 127.0.0.1 ${PORT} || exit 1

# Use exec form so signal forwarding works correctly
CMD ["sh", "./start.sh"]

