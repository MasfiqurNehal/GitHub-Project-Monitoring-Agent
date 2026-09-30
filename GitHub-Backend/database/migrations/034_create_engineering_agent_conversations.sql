-- Migration 034: Create Dedicated Engineering Agent Conversations and Messages Tables
-- Enforces SaaS tenant isolation (organization_id), user ownership (user_id), and rich multi-agent telemetry storage.

-- 1. Create engineering_conversations table
CREATE TABLE IF NOT EXISTS engineering_conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id VARCHAR(36) NOT NULL REFERENCES saas_organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'New Engineering Analysis',
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE SET NULL,
    repository_id VARCHAR(36) REFERENCES repositories(id) ON DELETE SET NULL,
    developer_id VARCHAR(36) REFERENCES developers(id) ON DELETE SET NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Performance & Tenant Isolation Indexes for engineering_conversations
CREATE INDEX IF NOT EXISTS idx_eng_conv_org_user ON engineering_conversations(organization_id, user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_eng_conv_user_updated ON engineering_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_eng_conv_deleted ON engineering_conversations(is_deleted);
CREATE INDEX IF NOT EXISTS idx_eng_conv_project ON engineering_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_eng_conv_repository ON engineering_conversations(repository_id);
CREATE INDEX IF NOT EXISTS idx_eng_conv_developer ON engineering_conversations(developer_id);

-- 3. Create engineering_messages table
CREATE TABLE IF NOT EXISTS engineering_messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL REFERENCES engineering_conversations(id) ON DELETE CASCADE,
    organization_id VARCHAR(36) NOT NULL REFERENCES saas_organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    detected_intent VARCHAR(100),
    selected_agent VARCHAR(100),
    metrics_json JSONB,
    artifacts_json JSONB,
    actions_json JSONB,
    tools_executed_json JSONB,
    execution_time_ms NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Performance & Tenant Isolation Indexes for engineering_messages
CREATE INDEX IF NOT EXISTS idx_eng_msg_conv_created ON engineering_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_eng_msg_org_user ON engineering_messages(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_eng_msg_created_at ON engineering_messages(created_at ASC);
