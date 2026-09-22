CREATE TABLE IF NOT EXISTS pull_requests (
  id VARCHAR(36) PRIMARY KEY,
  repository_id VARCHAR(36) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  github_pr_id BIGINT NOT NULL,
  number INT NOT NULL,
  author_developer_id VARCHAR(36) REFERENCES developers(id) ON DELETE SET NULL,
  title VARCHAR(512) NOT NULL,
  body TEXT,
  state VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  draft BOOLEAN DEFAULT FALSE,
  merged BOOLEAN DEFAULT FALSE,
  mergeable BOOLEAN,
  base_branch VARCHAR(255),
  head_branch VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  merged_at TIMESTAMPTZ,
  comments_count INT DEFAULT 0,
  review_comments_count INT DEFAULT 0,
  commits_count INT DEFAULT 0,
  additions INT DEFAULT 0,
  deletions INT DEFAULT 0,
  changed_files INT DEFAULT 0,
  html_url VARCHAR(512),
  CONSTRAINT uq_repo_github_pr_id UNIQUE (repository_id, github_pr_id)
);

CREATE INDEX IF NOT EXISTS idx_pull_requests_repository_id ON pull_requests(repository_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_author ON pull_requests(author_developer_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_created_at ON pull_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_pull_requests_merged_at ON pull_requests(merged_at);
