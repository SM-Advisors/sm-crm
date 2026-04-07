-- ============================================
-- Update sales_stage enum to match Bigin stages
-- ============================================

-- Step 1: Create the new enum
CREATE TYPE sales_stage_new AS ENUM (
  'qualification',
  'needs_analysis',
  'proposal',
  'cold_deal',
  'closed_won',
  'closed_lost',
  'service_complete'
);

-- Step 2: Migrate existing data
-- Map old stage values to new ones
UPDATE sales_deals SET stage = 'qualification' WHERE stage = 'qualified';
UPDATE sales_deals SET stage = 'needs_analysis' WHERE stage = 'discovery';
UPDATE sales_deals SET stage = 'cold_deal' WHERE stage = 'lead';
UPDATE sales_deals SET stage = 'service_complete' WHERE stage = 'closed_won' AND actual_close_date IS NOT NULL AND expected_close_date < NOW() - INTERVAL '30 days';
-- 'proposal', 'closed_won', 'closed_lost' stay the same
-- 'negotiation' -> 'proposal' (closest match)
UPDATE sales_deals SET stage = 'proposal' WHERE stage = 'negotiation';

-- Step 3: Alter the column to use new enum
ALTER TABLE sales_deals
  ALTER COLUMN stage TYPE sales_stage_new
  USING stage::text::sales_stage_new;

-- Step 4: Drop old enum, rename new
DROP TYPE IF EXISTS sales_stage;
ALTER TYPE sales_stage_new RENAME TO sales_stage;

-- Step 5: Set default
ALTER TABLE sales_deals ALTER COLUMN stage SET DEFAULT 'qualification';
