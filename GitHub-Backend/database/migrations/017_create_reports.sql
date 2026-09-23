CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(36) PRIMARY KEY,
  repository_id VARCHAR(36) REFERENCES repositories(id) ON DELETE CASCADE,
  project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL DEFAULT 'WEEKLY_SUMMARY',
  period_from DATE,
  period_to DATE,
  content TEXT NOT NULL,
  metadata JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_repository_id ON reports(repository_id);
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
