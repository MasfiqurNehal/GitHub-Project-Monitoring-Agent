-- 026_ensure_github_app_connection_schema.sql
-- Ensure GitHub App Connection columns on github_installations table

ALTER TABLE github_installations ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);
ALTER TABLE github_installations ADD COLUMN IF NOT EXISTS github_account_id VARCHAR(255);
ALTER TABLE github_installations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
ALTER TABLE github_installations ADD COLUMN IF NOT EXISTS connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_github_installations_user_id ON github_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_github_installations_status ON github_installations(status);
