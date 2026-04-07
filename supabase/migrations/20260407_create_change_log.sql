-- Change log / audit trail for tracking modifications
CREATE TABLE IF NOT EXISTS change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  changed_by UUID REFERENCES auth.users(id),
  changes JSONB,           -- { field: { old: ..., new: ... } } for updates; full row for insert/delete
  summary TEXT,            -- human-readable summary e.g. "Updated stage from Qualification to Proposal"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_change_log_table_record ON change_log(table_name, record_id);
CREATE INDEX idx_change_log_created ON change_log(created_at DESC);
CREATE INDEX idx_change_log_user ON change_log(changed_by);

-- Trigger function: logs changes for any table it's attached to
CREATE OR REPLACE FUNCTION fn_log_changes() RETURNS trigger AS $$
DECLARE
  changes_json JSONB := '{}'::jsonb;
  col TEXT;
  old_val TEXT;
  new_val TEXT;
  summary_text TEXT := '';
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO change_log (table_name, record_id, action, changed_by, changes, summary)
    VALUES (TG_TABLE_NAME, NEW.id, 'insert', auth.uid(), to_jsonb(NEW), 'Created ' || TG_TABLE_NAME);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO change_log (table_name, record_id, action, changed_by, changes, summary)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', auth.uid(), to_jsonb(OLD), 'Deleted from ' || TG_TABLE_NAME);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Compare each column
    FOR col IN SELECT column_name FROM information_schema.columns
      WHERE table_schema = TG_TABLE_SCHEMA AND table_name = TG_TABLE_NAME
        AND column_name NOT IN ('updated_at', 'created_at')
    LOOP
      EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', col, col)
        INTO old_val, new_val USING OLD, NEW;
      IF old_val IS DISTINCT FROM new_val THEN
        changes_json := changes_json || jsonb_build_object(
          col, jsonb_build_object('old', old_val, 'new', new_val)
        );
        IF summary_text != '' THEN summary_text := summary_text || ', '; END IF;
        summary_text := summary_text || col || ': ' || COALESCE(old_val, 'null') || ' → ' || COALESCE(new_val, 'null');
      END IF;
    END LOOP;

    -- Only log if something actually changed
    IF changes_json != '{}'::jsonb THEN
      INSERT INTO change_log (table_name, record_id, action, changed_by, changes, summary)
      VALUES (TG_TABLE_NAME, NEW.id, 'update', auth.uid(), changes_json,
        'Updated ' || TG_TABLE_NAME || ': ' || LEFT(summary_text, 500));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to key tables
CREATE TRIGGER trg_change_log_contacts
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW EXECUTE FUNCTION fn_log_changes();

CREATE TRIGGER trg_change_log_companies
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION fn_log_changes();

CREATE TRIGGER trg_change_log_sales_deals
  AFTER INSERT OR UPDATE OR DELETE ON sales_deals
  FOR EACH ROW EXECUTE FUNCTION fn_log_changes();

CREATE TRIGGER trg_change_log_delivery_engagements
  AFTER INSERT OR UPDATE OR DELETE ON delivery_engagements
  FOR EACH ROW EXECUTE FUNCTION fn_log_changes();

CREATE TRIGGER trg_change_log_invoices
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION fn_log_changes();

-- RLS: only authenticated users can read their org's change log
ALTER TABLE change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read change_log"
  ON change_log FOR SELECT
  TO authenticated
  USING (true);
