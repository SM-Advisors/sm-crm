-- Add meeting detail fields to interactions
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS meeting_type TEXT;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS meeting_location TEXT;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS attendees TEXT;

-- Add deal_id to invoices for direct deal association
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES sales_deals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_deal ON invoices(deal_id);
