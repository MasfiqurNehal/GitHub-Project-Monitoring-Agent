-- 031_add_multi_tenant_indexes_and_constraints.sql
-- Multi-Tenant Security, Data Isolation & Foreign Key Optimization Indexes

-- 1. Ensure composite indexes on foreign keys for fast tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_commits_repo_dev ON commits(repository_id, developer_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_author ON pull_requests(repository_id, author_developer_id);
CREATE INDEX IF NOT EXISTS idx_issues_repo_author ON issues(repository_id, author_developer_id);
CREATE INDEX IF NOT EXISTS idx_pull_request_reviews_pr_reviewer ON pull_request_reviews(pull_request_id, reviewer_developer_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_org_repo ON activity_events(repository_id, developer_id);
CREATE INDEX IF NOT EXISTS idx_repositories_proj_org ON repositories(project_id, organization_id);

-- 2. Ensure unique constraints where required
-- Prevent duplicate github_installation_id entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_github_installations_inst_id'
  ) THEN
    ALTER TABLE github_installations ADD CONSTRAINT uq_github_installations_inst_id UNIQUE (github_installation_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
