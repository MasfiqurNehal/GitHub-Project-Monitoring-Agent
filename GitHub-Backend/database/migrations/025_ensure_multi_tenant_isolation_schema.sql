-- 025_ensure_multi_tenant_isolation_schema.sql
-- Multi-Tenant SaaS Data Isolation Schema Enforcement

-- 1. Ensure saas_organizations table exists
CREATE TABLE IF NOT EXISTS saas_organizations (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'enterprise',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add organization_id column to all tenant-owned entities
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES saas_organizations(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES saas_organizations(id) ON DELETE CASCADE;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES saas_organizations(id) ON DELETE CASCADE;
ALTER TABLE developers ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES saas_organizations(id) ON DELETE CASCADE;
ALTER TABLE github_installations ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES saas_organizations(id) ON DELETE CASCADE;
ALTER TABLE sync_jobs ADD COLUMN IF NOT EXISTS organization_id VARCHAR(36) REFERENCES saas_organizations(id) ON DELETE CASCADE;

-- 3. Create high-performance indexes for tenant-isolated queries
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_repositories_org_id ON repositories(organization_id);
CREATE INDEX IF NOT EXISTS idx_developers_org_id ON developers(organization_id);
CREATE INDEX IF NOT EXISTS idx_github_installations_org_id ON github_installations(organization_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_org_id ON sync_jobs(organization_id);
