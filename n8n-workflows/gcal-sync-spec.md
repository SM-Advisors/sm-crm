# Google Calendar Sync — n8n Workflow Spec

## Purpose
Pull calendar events from Google Calendar that include known contacts as attendees and write them to the `interactions` table as `meeting` type. This populates meeting history on contact timelines.

## Prerequisites

1. **Google Calendar credential** in n8n — OAuth2 connection for `coryk@smaiadvisors.com`
2. **Supabase credential** in n8n — use the **service_role** key (bypasses RLS)
3. **Database migration** — run this in Supabase SQL Editor:
   ```sql
   DROP INDEX IF EXISTS idx_interactions_external_id;
   CREATE UNIQUE INDEX idx_interactions_external_id_unique
     ON interactions(external_id)
     WHERE external_id IS NOT NULL;
   ```
   This enables safe upsert deduplication so re-runs don't create duplicates.

## Trigger
- **Schedule**: Every day at 6:00 AM CST (same run window as Gmail sync, can chain them)
- **Optionally**: Supabase Realtime webhook when `sync_status.last_sync_status = 'requested'` for service = `gcal` (enables the "Sync now" button in Settings)

---

## Workflow Steps — Node by Node

### Node 1: Schedule Trigger
- **Type**: Schedule Trigger
- **Interval**: Daily at 6:00 AM CST (or combined with Gmail sync)

---

### Node 2: Mark Sync In Progress
- **Type**: Supabase
- **Operation**: Upsert
- **Table**: `sync_status`
- **Match on**: `service`
- **Row data**:
```json
{
  "service": "gcal",
  "last_sync_status": "in_progress",
  "updated_at": "{{ $now }}"
}
```

---

### Node 3: Get Last Sync Timestamp
- **Type**: Supabase
- **Operation**: Select
- **Table**: `sync_status`
- **Filter**: `service` equals `gcal`
- **Limit**: 1

In the next node, reference this as:
```
{{ $json.last_sync_at ?? new Date(Date.now() - 30*24*60*60*1000).toISOString() }}
```
(Default to 30 days ago if null.)

---

### Node 4: Fetch Calendar Events
- **Type**: Google Calendar
- **Operation**: Get Many Events
- **Calendar**: Primary (`coryk@smaiadvisors.com`)
- **Time Min**: `{{ $json.last_sync_at ?? new Date(Date.now() - 30*24*60*60*1000).toISOString() }}`
- **Time Max**: `{{ new Date(Date.now() + 30*24*60*60*1000).toISOString() }}` (30 days forward)
- **Max Results**: 200
- **Single Events**: Yes (expand recurring events)
- **Return fields**: id, summary, description, start, end, attendees, status

---

### Node 5: Filter Out Cancelled
- **Type**: IF
- **Condition**: `{{ $json.status }}` is not equal to `cancelled`
- Pass matching items to Node 6.

---

### Node 6: Extract Attendees
- **Type**: Code (JavaScript)
- **Code**:
```javascript
const results = [];
const ownerEmail = 'coryk@smaiadvisors.com';

for (const item of $input.all()) {
  const event = item.json;
  const attendees = (event.attendees || [])
    .filter(a => a.email && a.email.toLowerCase() !== ownerEmail.toLowerCase())
    .map(a => a.email.toLowerCase());

  if (attendees.length === 0) continue;

  for (const email of attendees) {
    results.push({
      json: {
        event_id: event.id,
        event_summary: event.summary || '(No title)',
        event_description: (event.description || '').substring(0, 500),
        event_start: event.start?.dateTime || event.start?.date || null,
        attendee_email: email,
      }
    });
  }
}

return results;
```

---

### Node 7: Look Up Contact in Supabase
- **Type**: Supabase
- **Operation**: Select
- **Table**: `contacts`
- **Filter**: `email` equals `{{ $json.attendee_email }}` (case insensitive — the column should be lowercase)
- **Columns**: `id, company_id`
- **Limit**: 1

**Important**: If no match, this node returns empty. Use an IF node after this to filter out unmatched attendees.

---

### Node 8: Filter — Contact Found?
- **Type**: IF
- **Condition**: `{{ $json.id }}` is not empty
- Pass matching items to Node 9.

---

### Node 9: Upsert Interaction
- **Type**: Supabase
- **Operation**: Upsert
- **Table**: `interactions`
- **Match on**: `external_id`
- **Row data**:
```json
{
  "contact_id": "{{ $('Node 7').item.json.id }}",
  "company_id": "{{ $('Node 7').item.json.company_id }}",
  "type": "meeting",
  "subject": "{{ $('Node 6').item.json.event_summary }}",
  "summary": "{{ $('Node 6').item.json.event_description }}",
  "occurred_at": "{{ $('Node 6').item.json.event_start }}",
  "source": "gcal",
  "external_id": "{{ $('Node 6').item.json.event_id }}_{{ $('Node 7').item.json.id }}"
}
```

`external_id` = `{gcal_event_id}_{contact_id}` — unique per event+contact pair. Safe to re-run.

---

### Node 10: Count Results
- **Type**: Code (JavaScript)
- **Code**:
```javascript
return [{ json: { count: $input.all().length } }];
```

---

### Node 11: Mark Sync Complete
- **Type**: Supabase
- **Operation**: Upsert
- **Table**: `sync_status`
- **Match on**: `service`
- **Row data**:
```json
{
  "service": "gcal",
  "last_sync_at": "{{ $now }}",
  "last_sync_status": "success",
  "records_synced": "{{ $json.count }}",
  "error_message": null,
  "updated_at": "{{ $now }}"
}
```

---

### Error Handler
Add an **Error Trigger** node connected to a Supabase upsert:
- **Table**: `sync_status`
- **Match on**: `service`
- **Row data**:
```json
{
  "service": "gcal",
  "last_sync_status": "error",
  "error_message": "{{ $json.error.message }}",
  "updated_at": "{{ $now }}"
}
```

---

## Key Notes

- **external_id format**: `{gcal_event_id}_{contact_id}` — unique per event+contact pair. Safe to re-run.
- **Unique constraint required**: `interactions.external_id` must have a unique partial index (see Prerequisites). Without it, upserts become inserts and create duplicates.
- **All-day events**: `event.start.date` (no time component) vs `event.start.dateTime`. The Code node handles both — it takes whichever is present.
- **Recurring events**: With `singleEvents: true`, each occurrence gets its own event ID. Each sync naturally picks up new occurrences.
- **Future meetings**: Sync 30 days forward so upcoming meetings appear on timelines. When they occur, they'll already be in the DB.
- **Multi-attendee meetings**: One interaction row per contact. If a meeting has 3 contacts, you get 3 rows — one on each contact's timeline. This is intentional.
- **Contact matching**: Matches on `contacts.email` only. If an attendee email isn't in the CRM, it's skipped.
- **`sync_status` service key**: Must be exactly `gcal` to match the Settings UI.
- **Trigger via CRM**: The "Sync now" button sets `last_sync_status = 'requested'` in `sync_status`. To support this, add a Supabase Trigger node watching `sync_status` for updates where `service = 'gcal'` and `last_sync_status = 'requested'`, wired to the same workflow.

---

## Chaining Gmail + GCal in One Workflow

You can build this as one n8n workflow with two branches off the schedule trigger:
1. Branch A -> Gmail sync
2. Branch B -> GCal sync

Both branches run in parallel. Keep separate `sync_status` updates for each service.

---

## Testing Checklist

1. Run manually from n8n — verify `sync_status` shows "in_progress" then "success"
2. Check `interactions` table — meetings should appear with `source = 'gcal'`
3. Open a contact's timeline in the CRM — meetings should show up
4. Re-run the workflow — verify no duplicate interactions (upsert dedup working)
5. Click "Sync now" in CRM Settings — verify it triggers the workflow (if using Supabase Trigger)
