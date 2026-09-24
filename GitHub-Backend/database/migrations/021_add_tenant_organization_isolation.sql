-- 021_add_tenant_organization_isolation.sql
-- Add tenant organization scoping for strict multi-tenant SaaS data isolation

-- 1. Ensure SaaS Organizations exist for all three client accounts
INSERT INTO saas_organizations (id, name, slug, plan, created_at, updated_at)
VALUES 
  ('org-masfiqurnehal', 'MasfiqurNehal Org', 'masfiqurnehal-org', 'enterprise', NOW(), NOW()),
  ('org-betopia-1', 'Betopia Global Org 1', 'betopia-org-1', 'enterprise', NOW(), NOW()),
  ('org-betopia-2', 'Betopia Global Org 2', 'betopia-org-2', 'enterprise', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, updated_at = NOW();

-- 2. Add organization_id column to projects, repositories, developers
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES saas_organizations(id) ON DELETE CASCADE;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES saas_organizations(id) ON DELETE CASCADE;
ALTER TABLE developers ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES saas_organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_repositories_org_id ON repositories(organization_id);
CREATE INDEX IF NOT EXISTS idx_developers_org_id ON developers(organization_id);

-- 3. Backfill existing unassigned projects, repositories, and developers to org-masfiqurnehal
UPDATE projects SET organization_id = 'org-masfiqurnehal' WHERE organization_id IS NULL;
UPDATE repositories SET organization_id = 'org-masfiqurnehal' WHERE organization_id IS NULL;
UPDATE developers SET organization_id = 'org-masfiqurnehal' WHERE organization_id IS NULL;
UPDATE users SET organization_id = 'org-masfiqurnehal' WHERE email = 'admin1@masfiqurnehal.com';
UPDATE users SET organization_id = 'org-betopia-1' WHERE email = 'admin@betopia.com';
UPDATE users SET organization_id = 'org-betopia-2' WHERE email = 'admin2@betopia.com';
