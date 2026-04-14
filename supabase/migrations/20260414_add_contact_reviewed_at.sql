-- Add reviewed_at timestamp to contacts for 30-day review cycle tracking
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
