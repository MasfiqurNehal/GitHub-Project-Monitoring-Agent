CREATE TABLE IF NOT EXISTS github_installations (
  id VARCHAR(36) PRIMARY KEY,
  github_installation_id BIGINT UNIQUE NOT NULL,
  account_login VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL DEFAULT 'Organization',
  target_type VARCHAR(50) DEFAULT 'User',
  permissions JSONB,
  events JSONB,
  single_file_name VARCHAR(255),
  has_multiple_single_files BOOLEAN DEFAULT FALSE,
  suspended_by VARCHAR(255),
  suspended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_installations_github_id ON github_installations(github_installation_id);
CREATE INDEX IF NOT EXISTS idx_github_installations_account_login ON github_installations(account_login);
