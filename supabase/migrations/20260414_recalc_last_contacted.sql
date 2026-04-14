-- Recalculate last_contacted_at and last_contact_type for all contacts
-- based on actual remaining interactions (fixes stale data from deleted events)
UPDATE contacts c
SET
  last_contacted_at = sub.occurred_at,
  last_contact_type = sub.type,
  updated_at = now()
FROM (
  SELECT DISTINCT ON (contact_id)
    contact_id, occurred_at, type
  FROM interactions
  ORDER BY contact_id, occurred_at DESC
) sub
WHERE c.id = sub.contact_id;

-- Clear last_contacted_at for contacts with no remaining interactions
UPDATE contacts c
SET
  last_contacted_at = NULL,
  last_contact_type = NULL,
  updated_at = now()
WHERE NOT EXISTS (
  SELECT 1 FROM interactions i WHERE i.contact_id = c.id
)
AND c.last_contacted_at IS NOT NULL;

-- Add a trigger for DELETE on interactions so this stays accurate going forward
CREATE OR REPLACE FUNCTION recalc_last_contacted_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  latest RECORD;
BEGIN
  SELECT occurred_at, type INTO latest
  FROM interactions
  WHERE contact_id = OLD.contact_id
  ORDER BY occurred_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE contacts
    SET last_contacted_at = latest.occurred_at,
        last_contact_type = latest.type,
        updated_at = now()
    WHERE id = OLD.contact_id;
  ELSE
    UPDATE contacts
    SET last_contacted_at = NULL,
        last_contact_type = NULL,
        updated_at = now()
    WHERE id = OLD.contact_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalc_last_contacted_on_delete
AFTER DELETE ON interactions
FOR EACH ROW EXECUTE FUNCTION recalc_last_contacted_on_delete();
