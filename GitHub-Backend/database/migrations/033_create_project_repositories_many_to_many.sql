-- 033_create_project_repositories_many_to_many.sql
-- Project ↔ Repository Many-to-Many Association
-- Allows a repository to belong to multiple projects and multiple tenants without duplicating raw GitHub records.

-- 1. Create junction table project_repositories
CREATE TABLE IF NOT EXISTS project_repositories (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  repository_id VARCHAR(64) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  organization_id VARCHAR(64) REFERENCES saas_organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_project_repository UNIQUE (project_id, repository_id)
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_project_repos_project_id ON project_repositories(project_id);
CREATE INDEX IF NOT EXISTS idx_project_repos_repo_id ON project_repositories(repository_id);
CREATE INDEX IF NOT EXISTS idx_project_repos_org_id ON project_repositories(organization_id);

-- 3. Safely backfill existing relationships from repositories.project_id
INSERT INTO project_repositories (id, project_id, repository_id, organization_id, created_at)
SELECT 
  'pr-' || MD5(r.id || '-' || r.project_id),
  r.project_id,
  r.id,
  r.organization_id,
  COALESCE(r.created_at, NOW())
FROM repositories r
WHERE r.project_id IS NOT NULL
ON CONFLICT (project_id, repository_id) DO NOTHING;
