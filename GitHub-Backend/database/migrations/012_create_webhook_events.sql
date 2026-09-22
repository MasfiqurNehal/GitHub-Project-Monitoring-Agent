CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(36) PRIMARY KEY,
  github_delivery_id VARCHAR(255) UNIQUE,
  event_name VARCHAR(100) NOT NULL,
  repository_id VARCHAR(36) REFERENCES repositories(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processing_status VARCHAR(50) DEFAULT 'PENDING',
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_delivery_id ON webhook_events(github_delivery_id);
