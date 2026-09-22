CREATE TABLE IF NOT EXISTS repositories (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) REFERENCES projects(id) ON DELETE SET NULL,
  github_repository_id BIGINT UNIQUE,
  owner VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(512) NOT NULL UNIQUE,
  html_url VARCHAR(512) NOT NULL,
  clone_url VARCHAR(512),
  default_branch VARCHAR(100) NOT NULL DEFAULT 'main',
  visibility VARCHAR(50) DEFAULT 'public',
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  language VARCHAR(100),
  stars INT DEFAULT 0,
  forks INT DEFAULT 0,
  open_issues_count INT DEFAULT 0,
  github_created_at TIMESTAMPTZ,
  github_updated_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  sync_status VARCHAR(50) DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repositories_project_id ON repositories(project_id);
CREATE INDEX IF NOT EXISTS idx_repositories_full_name ON repositories(full_name);
