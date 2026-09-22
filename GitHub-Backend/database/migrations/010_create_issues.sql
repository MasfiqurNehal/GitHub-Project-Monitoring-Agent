CREATE TABLE IF NOT EXISTS issues (
  id VARCHAR(36) PRIMARY KEY,
  repository_id VARCHAR(36) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  github_issue_id BIGINT NOT NULL,
  number INT NOT NULL,
  author_developer_id VARCHAR(36) REFERENCES developers(id) ON DELETE SET NULL,
  title VARCHAR(512) NOT NULL,
  body TEXT,
  state VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  comments_count INT DEFAULT 0,
  html_url VARCHAR(512),
  CONSTRAINT uq_repo_github_issue_id UNIQUE (repository_id, github_issue_id)
);

CREATE INDEX IF NOT EXISTS idx_issues_repository_id ON issues(repository_id);
CREATE INDEX IF NOT EXISTS idx_issues_author ON issues(author_developer_id);
CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at);
CREATE INDEX IF NOT EXISTS idx_issues_closed_at ON issues(closed_at);
