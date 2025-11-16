-- Enable extension for gen_random_uuid (Postgres >=13)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_email text NOT NULL,
  name text NOT NULL,
  domain text,
  google_oauth_sub text,
  api_key_hash text NOT NULL,
  is_revoked boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id bigserial PRIMARY KEY,
  app_id uuid REFERENCES apps(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  url text,
  referrer text,
  device text,
  ip_address inet,
  user_agent text,
  user_id text,
  timestamp timestamptz NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_app_time ON events(app_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_event_time ON events(event_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_device ON events(device);
