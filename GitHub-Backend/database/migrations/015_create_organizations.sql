CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(36) PRIMARY KEY,
  github_org_id BIGINT UNIQUE,
  login VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  description TEXT,
  avatar_url VARCHAR(512),
  html_url VARCHAR(512),
  blog VARCHAR(512),
  email VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_login ON organizations(login);
CREATE INDEX IF NOT EXISTS idx_organizations_github_id ON organizations(github_org_id);
