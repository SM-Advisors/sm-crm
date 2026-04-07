CREATE OR REPLACE FUNCTION notify_proposal_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _recent_event_exists BOOLEAN;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.stage = 'proposal')
     OR (TG_OP = 'UPDATE'
         AND NEW.stage = 'proposal'
         AND OLD.stage IS DISTINCT FROM 'proposal')
  THEN
    SELECT EXISTS (
      SELECT 1 FROM deal_events
      WHERE deal_id = NEW.id
        AND event_type = 'proposal_entered'
        AND created_at > NOW() - INTERVAL '1 hour'
    ) INTO _recent_event_exists;

    IF _recent_event_exists THEN
      RETURN NEW;
    END IF;

    INSERT INTO deal_events (deal_id, event_type, payload)
    VALUES (
      NEW.id,
      'proposal_entered',
      jsonb_build_object(
        'deal_title', NEW.title,
        'company_id', NEW.company_id,
        'contact_id', NEW.contact_id,
        'value', NEW.value,
        'probability', NEW.probability,
        'description', NEW.description,
        'notes', NEW.notes
      )
    );
  END IF;

  RETURN NEW;
END;
$$;