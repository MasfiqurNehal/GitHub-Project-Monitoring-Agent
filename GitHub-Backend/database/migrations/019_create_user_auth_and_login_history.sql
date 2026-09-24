-- 019_create_user_auth_and_login_history.sql
-- Add password authentication fields to users and create login history audit table

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin';

CREATE TABLE IF NOT EXISTS user_login_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'SUCCESS', 'FAILED'
  ip_address VARCHAR(100),
  user_agent TEXT,
  login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON user_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_email ON user_login_logs(email);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_login_at ON user_login_logs(login_at DESC);
