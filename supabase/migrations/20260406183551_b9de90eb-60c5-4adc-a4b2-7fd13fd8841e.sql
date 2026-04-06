
-- Function: acquire invoice sync lock (atomic)
CREATE OR REPLACE FUNCTION public.acquire_invoice_lock()
RETURNS TABLE(last_qb_updated_time timestamptz, last_sync_at timestamptz)
LANGUAGE sql
AS $$
  UPDATE qb_sync_state
  SET is_running = true, lock_acquired_at = NOW()
  WHERE sync_type = 'invoice'
    AND (is_running = false OR lock_acquired_at < NOW() - INTERVAL '1 hour')
  RETURNING last_qb_updated_time, last_sync_at;
$$;

-- Function: backfill invoice contacts from customer map
CREATE OR REPLACE FUNCTION public.backfill_invoice_contacts()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE invoices
  SET contact_id = m.contact_id, company_id = m.company_id
  FROM qb_customer_map m
  WHERE invoices.qb_customer_id = m.qb_customer_id
    AND invoices.contact_id IS NULL
    AND m.contact_id IS NOT NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Function: refresh billing summary (handles both view types gracefully)
CREATE OR REPLACE FUNCTION public.refresh_billing_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY billing_summary;
EXCEPTION WHEN others THEN
  -- If it's a regular view, this is a no-op
  NULL;
END;
$$;

-- Ensure qb_invoice_id has a unique constraint for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_qb_invoice_id_key'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_qb_invoice_id_key UNIQUE (qb_invoice_id);
  END IF;
END $$;

-- Ensure qb_customer_id has a unique constraint for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'qb_customer_map_qb_customer_id_key'
  ) THEN
    ALTER TABLE qb_customer_map ADD CONSTRAINT qb_customer_map_qb_customer_id_key UNIQUE (qb_customer_id);
  END IF;
END $$;
