CREATE TABLE IF NOT EXISTS branches (
  id VARCHAR(36) PRIMARY KEY,
  repository_id VARCHAR(36) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  organization_id VARCHAR(36),
  name VARCHAR(255) NOT NULL,
  head_sha VARCHAR(100),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_protected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(repository_id, name)
);

CREATE INDEX IF NOT EXISTS idx_branches_repository_id ON branches(repository_id);
CREATE INDEX IF NOT EXISTS idx_branches_organization_id ON branches(organization_id);
