-- Migration 023: Alter users.avatar_url column type to TEXT
ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;
