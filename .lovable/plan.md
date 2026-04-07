

# Database Webhook for Proposal Notifications

## Problem
The `pg_net` approach failed because `app.settings` for the service role key aren't configured, and vault.secrets isn't directly readable. We need the trigger to call the `proposal-notification` Edge Function when a deal enters the proposal stage.

## Key Finding
The `proposal-notification` Edge Function deploys with `verify_jwt = false` (Lovable Cloud default). It uses the service role key internally (from `Deno.env`) but does **not** require authenticated inbound requests. This means we can call it via `pg_net` using just the public anon key in the Authorization header.

The existing `notify_proposal_stage` function already has the `pg_net` call removed and correctly logs to `deal_events`. It just needs the HTTP call added back with the correct approach.

## Plan

### Single Migration
Update `notify_proposal_stage` to add a `net.http_post` call using:
- **URL**: `https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/proposal-notification` (hardcoded from project ref)
- **Auth header**: `Bearer <anon_key>` (the public anon key, which is safe to embed — it's already in the client-side `.env`)
- **Body**: `{"deal_id": NEW.id}`

The function remains `SECURITY DEFINER` and keeps the existing `deal_events` logging logic unchanged.

### Technical Details
```sql
-- After the INSERT INTO deal_events block, add:
PERFORM net.http_post(
  url    := 'https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/proposal-notification',
  body   := jsonb_build_object('deal_id', NEW.id),
  params := '{}'::jsonb,
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer <anon_key>'
  ),
  timeout_milliseconds := 5000
);
```

No new tables, no vault access, no config.toml changes needed.

