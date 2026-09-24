-- 020_create_refresh_tokens_and_saas_orgs.sql
-- Create SaaS Organizations and Refresh Tokens table for dual-token authentication

CREATE TABLE IF NOT EXISTS saas_organizations (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'enterprise',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES saas_organizations(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS user_refresh_tokens (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_ip VARCHAR(100),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON user_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON user_refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON user_refresh_tokens(expires_at);

-- Insert Default SaaS Organization if not exists
INSERT INTO saas_organizations (id, name, slug, plan, created_at, updated_at)
VALUES ('org-default-betopia', 'Betopia Engineering', 'betopia-eng', 'enterprise', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
