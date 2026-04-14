-- Fix last_contacted_at to only reflect interactions on or before today.
-- Future-dated meetings (e.g., calendar syncs) should not count as "last contact".

-- 1. Fix the INSERT trigger: only update last_contacted if occurred_at <= now()
CREATE OR REPLACE FUNCTION update_last_contacted()
RETURNS TRIGGER AS $$
BEGIN
  -- Only consider interactions that have already occurred (not future-dated)
  IF NEW.occurred_at > now() THEN
    RETURN NEW;
  END IF;

  UPDATE contacts
  SET
    last_contacted_at = NEW.occurred_at,
    last_contact_type = NEW.type,
    updated_at = now()
  WHERE id = NEW.contact_id
    AND (last_contacted_at IS NULL OR last_contacted_at < NEW.occurred_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix the DELETE trigger: only consider past/present interactions when recalculating
CREATE OR REPLACE FUNCTION recalc_last_contacted_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  latest RECORD;
BEGIN
  SELECT occurred_at, type INTO latest
  FROM interactions
  WHERE contact_id = OLD.contact_id
    AND occurred_at <= now()
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

-- 3. Recalculate all contacts based on past/present interactions only
UPDATE contacts c
SET
  last_contacted_at = sub.occurred_at,
  last_contact_type = sub.type,
  updated_at = now()
FROM (
  SELECT DISTINCT ON (contact_id)
    contact_id, occurred_at, type
  FROM interactions
  WHERE occurred_at <= now()
  ORDER BY contact_id, occurred_at DESC
) sub
WHERE c.id = sub.contact_id;

-- Clear last_contacted_at for contacts with no past/present interactions
UPDATE contacts c
SET
  last_contacted_at = NULL,
  last_contact_type = NULL,
  updated_at = now()
WHERE NOT EXISTS (
  SELECT 1 FROM interactions i WHERE i.contact_id = c.id AND i.occurred_at <= now()
)
AND c.last_contacted_at IS NOT NULL;
