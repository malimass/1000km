-- Add reminder tracking columns for multi-level pending donation reminders
-- reminder_count: 0=none, 1=after 2 days, 2=after 7 days, 3=after 14 days, 4=after 28 days (final)
ALTER TABLE donazioni ADD COLUMN IF NOT EXISTS reminder_count smallint NOT NULL DEFAULT 0;
ALTER TABLE donazioni ADD COLUMN IF NOT EXISTS reminded_at timestamptz;
