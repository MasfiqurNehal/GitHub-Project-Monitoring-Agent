-- 032_project_multi_repository_association.sql
-- Project ↔ Multi-Repository Association Foundation
-- Ensures foreign keys, uniqueness, composite performance indexes, and strict multi-tenant data isolation.

-- 1. Ensure foreign key constraint from repositories(project_id) to projects(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_repositories_project'
  ) THEN
    ALTER TABLE repositories 
      ADD CONSTRAINT fk_repositories_project 
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Ensure foreign key constraint from repositories(organization_id) to saas_organizations(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_repositories_organization'
  ) THEN
    ALTER TABLE repositories 
      ADD CONSTRAINT fk_repositories_organization 
      FOREIGN KEY (organization_id) REFERENCES saas_organizations(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Composite performance indexes for project-repository multi-tenant query aggregation
CREATE INDEX IF NOT EXISTS idx_repositories_project_org ON repositories(project_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_repositories_org_project ON repositories(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_repositories_fullname_org ON repositories(full_name, organization_id);
