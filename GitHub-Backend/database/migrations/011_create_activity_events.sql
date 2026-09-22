CREATE TABLE IF NOT EXISTS activity_events (
  id VARCHAR(36) PRIMARY KEY,
  repository_id VARCHAR(36) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  developer_id VARCHAR(36) REFERENCES developers(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  occurred_at TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  source VARCHAR(50) DEFAULT 'sync',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_repository_id ON activity_events(repository_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_developer_id ON activity_events(developer_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_occurred_at ON activity_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_activity_events_event_type ON activity_events(event_type);
