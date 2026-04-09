-- Add location fields to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS state TEXT;

-- Add contract tracking fields to sales_deals
ALTER TABLE sales_deals ADD COLUMN IF NOT EXISTS contract_sent_date DATE;
ALTER TABLE sales_deals ADD COLUMN IF NOT EXISTS countersigned_date DATE;
ALTER TABLE sales_deals ADD COLUMN IF NOT EXISTS contract_status TEXT DEFAULT 'none'
  CHECK (contract_status IN ('none', 'sent', 'countersigned', 'fulfilled'));
