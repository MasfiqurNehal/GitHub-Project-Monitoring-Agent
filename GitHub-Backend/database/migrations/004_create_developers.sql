CREATE TABLE IF NOT EXISTS developers (
  id VARCHAR(36) PRIMARY KEY,
  github_user_id BIGINT UNIQUE,
  login VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  avatar_url VARCHAR(512),
  html_url VARCHAR(512),
  email VARCHAR(255),
  type VARCHAR(50) DEFAULT 'User',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_developers_login ON developers(login);
