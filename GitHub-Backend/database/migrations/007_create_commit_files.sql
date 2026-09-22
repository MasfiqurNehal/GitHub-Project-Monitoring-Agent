CREATE TABLE IF NOT EXISTS commit_files (
  id VARCHAR(36) PRIMARY KEY,
  commit_id VARCHAR(36) NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'modified',
  additions INT DEFAULT 0,
  deletions INT DEFAULT 0,
  changes INT DEFAULT 0,
  patch TEXT,
  previous_filename TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commit_files_commit_id ON commit_files(commit_id);
