-- 030_add_organization_id_to_commits_and_prs.sql
-- Ensure organization_id is present on commits, pull_requests, issues for direct multi-tenant SaaS isolation

-- 1. Add organization_id column to commits, pull_requests, issues
ALTER TABLE commits ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36);
ALTER TABLE pull_requests ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36);
ALTER TABLE issues ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_commits_org_id ON commits(organization_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_org_id ON pull_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_issues_org_id ON issues(organization_id);

-- 3. Backfill organization_id from parent repository record
UPDATE commits c
SET organization_id = r.organization_id
FROM repositories r
WHERE c.repository_id = r.id AND c.organization_id IS NULL AND r.organization_id IS NOT NULL;

UPDATE pull_requests pr
SET organization_id = r.organization_id
FROM repositories r
WHERE pr.repository_id = r.id AND pr.organization_id IS NULL AND r.organization_id IS NOT NULL;

UPDATE issues i
SET organization_id = r.organization_id
FROM repositories r
WHERE i.repository_id = r.id AND i.organization_id IS NULL AND r.organization_id IS NOT NULL;
