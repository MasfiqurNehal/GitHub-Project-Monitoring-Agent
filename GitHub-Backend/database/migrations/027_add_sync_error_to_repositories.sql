-- Migration 027: Add sync_error column to repositories table
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS sync_error TEXT;
