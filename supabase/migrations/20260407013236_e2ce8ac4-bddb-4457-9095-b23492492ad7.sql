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

    PERFORM net.http_post(
      url    := 'https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/proposal-notification',
      body   := jsonb_build_object('deal_id', NEW.id),
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6em52a2NhYWNleXNkdHhhcHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NzgwMjQsImV4cCI6MjA5MTA1NDAyNH0.A8ufIBTkjCQhfVOdGt-daf-vbjEK9__bpDtsOyzdVH4'
      ),
      timeout_milliseconds := 5000
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure the trigger exists on sales_deals
DROP TRIGGER IF EXISTS trg_notify_proposal_stage ON sales_deals;
CREATE TRIGGER trg_notify_proposal_stage
  AFTER INSERT OR UPDATE ON sales_deals
  FOR EACH ROW
  EXECUTE FUNCTION notify_proposal_stage();