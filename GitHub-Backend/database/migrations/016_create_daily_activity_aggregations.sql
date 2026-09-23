CREATE TABLE IF NOT EXISTS daily_activity_aggregations (
  id VARCHAR(36) PRIMARY KEY,
  repository_id VARCHAR(36) REFERENCES repositories(id) ON DELETE CASCADE,
  developer_id VARCHAR(36) REFERENCES developers(id) ON DELETE SET NULL,
  activity_date DATE NOT NULL,
  commits_count INT DEFAULT 0,
  additions INT DEFAULT 0,
  deletions INT DEFAULT 0,
  prs_opened_count INT DEFAULT 0,
  prs_merged_count INT DEFAULT 0,
  prs_closed_count INT DEFAULT 0,
  issues_opened_count INT DEFAULT 0,
  issues_closed_count INT DEFAULT 0,
  reviews_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_repo_dev_date UNIQUE (repository_id, developer_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_repo_id ON daily_activity_aggregations(repository_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_dev_id ON daily_activity_aggregations(developer_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_date ON daily_activity_aggregations(activity_date);
