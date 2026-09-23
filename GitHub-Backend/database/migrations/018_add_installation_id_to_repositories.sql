ALTER TABLE repositories 
ADD COLUMN IF NOT EXISTS github_installation_id BIGINT REFERENCES github_installations(github_installation_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_repositories_installation_id ON repositories(github_installation_id);
