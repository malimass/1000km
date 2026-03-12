-- Add reminded_at column to track when a pending-donation reminder was sent
ALTER TABLE donazioni ADD COLUMN IF NOT EXISTS reminded_at timestamptz;
