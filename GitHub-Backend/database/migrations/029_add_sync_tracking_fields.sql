-- Migration 029: Add synchronization tracking columns to repositories
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS last_sync_started_at TIMESTAMPTZ;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS last_sync_completed_at TIMESTAMPTZ;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS last_sync_status VARCHAR(50);
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS last_sync_error TEXT;
