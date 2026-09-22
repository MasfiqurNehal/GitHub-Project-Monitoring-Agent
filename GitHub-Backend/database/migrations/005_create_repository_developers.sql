CREATE TABLE IF NOT EXISTS repository_developers (
  repository_id VARCHAR(36) REFERENCES repositories(id) ON DELETE CASCADE,
  developer_id VARCHAR(36) REFERENCES developers(id) ON DELETE CASCADE,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (repository_id, developer_id)
);
