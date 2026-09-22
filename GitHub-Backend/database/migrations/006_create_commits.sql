CREATE TABLE IF NOT EXISTS commits (
  id VARCHAR(36) PRIMARY KEY,
  repository_id VARCHAR(36) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  github_commit_sha VARCHAR(64) NOT NULL,
  developer_id VARCHAR(36) REFERENCES developers(id) ON DELETE SET NULL,
  branch VARCHAR(255),
  message TEXT NOT NULL,
  commit_url VARCHAR(512),
  committed_at TIMESTAMPTZ NOT NULL,
  authored_at TIMESTAMPTZ,
  additions INT DEFAULT 0,
  deletions INT DEFAULT 0,
  changed_files INT DEFAULT 0,
  parent_count INT DEFAULT 1,
  is_merge_commit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_repo_commit_sha UNIQUE (repository_id, github_commit_sha)
);

CREATE INDEX IF NOT EXISTS idx_commits_repository_id ON commits(repository_id);
CREATE INDEX IF NOT EXISTS idx_commits_developer_id ON commits(developer_id);
CREATE INDEX IF NOT EXISTS idx_commits_committed_at ON commits(committed_at);
