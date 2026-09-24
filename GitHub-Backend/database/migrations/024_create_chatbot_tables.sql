-- Migration 024: Create Chatbot Conversations and Messages Tables
-- Scoped with user ownership and organization tenant isolation for multi-tenant SaaS safety.

CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id VARCHAR(36) REFERENCES saas_organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_id ON chatbot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_org_id ON chatbot_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_updated ON chatbot_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS chatbot_messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metrics_json JSONB,
    sources_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conv_id ON chatbot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_created_at ON chatbot_messages(created_at ASC);
