import { pool } from '../db/connection.js';

export interface BranchRow {
  id: string;
  repository_id: string;
  organization_id?: string | null;
  name: string;
  head_sha: string | null;
  is_default: boolean;
  is_protected: boolean;
  created_at: Date;
  updated_at: Date;
}

export class BranchRepository {
  private schemaChecked = false;

  private async ensureTable() {
    if (this.schemaChecked) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS branches (
          id VARCHAR(36) PRIMARY KEY,
          repository_id VARCHAR(36) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
          organization_id VARCHAR(36),
          name VARCHAR(255) NOT NULL,
          head_sha VARCHAR(100),
          is_default BOOLEAN NOT NULL DEFAULT FALSE,
          is_protected BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(repository_id, name)
        );
        CREATE INDEX IF NOT EXISTS idx_branches_repository_id ON branches(repository_id);
        CREATE INDEX IF NOT EXISTS idx_branches_organization_id ON branches(organization_id);
      `);
      this.schemaChecked = true;
    } catch (err: any) {
      // Table creation handled gracefully
    }
  }

  async upsert(data: {
    id: string;
    repositoryId: string;
    organizationId?: string | null;
    name: string;
    headSha?: string | null;
    isDefault?: boolean;
    isProtected?: boolean;
  }): Promise<BranchRow> {
    await this.ensureTable();
    const query = `
      INSERT INTO branches (
        id, repository_id, organization_id, name, head_sha, is_default, is_protected, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      )
      ON CONFLICT (repository_id, name) DO UPDATE SET
        organization_id = COALESCE(EXCLUDED.organization_id, branches.organization_id),
        head_sha = EXCLUDED.head_sha,
        is_default = EXCLUDED.is_default,
        is_protected = EXCLUDED.is_protected,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      data.id,
      data.repositoryId,
      data.organizationId || null,
      data.name,
      data.headSha || null,
      data.isDefault || false,
      data.isProtected || false,
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  }

  async findByRepositoryId(repositoryId: string, organizationId?: string): Promise<BranchRow[]> {
    await this.ensureTable();
    if (organizationId) {
      const res = await pool.query(
        'SELECT * FROM branches WHERE repository_id = $1 AND (organization_id = $2 OR organization_id IS NULL) ORDER BY is_default DESC, name ASC',
        [repositoryId, organizationId]
      );
      return res.rows;
    }
    const res = await pool.query(
      'SELECT * FROM branches WHERE repository_id = $1 ORDER BY is_default DESC, name ASC',
      [repositoryId]
    );
    return res.rows;
  }
}

export const branchRepository = new BranchRepository();
