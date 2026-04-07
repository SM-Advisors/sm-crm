# Google Calendar Sync — n8n Workflow Spec

## Purpose
Pull calendar events from Google Calendar that include known contacts as attendees and write them to the `interactions` table as `meeting` type. This populates meeting history on contact timelines.

## Trigger
- **Schedule**: Every day at 6:00 AM CST (same run window as Gmail sync, can chain them)
- **Optionally**: Supabase Realtime webhook when `sync_status.last_sync_status = 'requested'` for service = `gcal`

---

## Workflow Steps

### 1. Mark Sync In Progress
Supabase upsert `sync_status`:
```json
{
  "service": "gcal",
  "last_sync_status": "in_progress",
  "updated_at": "{{ $now }}"
}
```

---

### 2. Get Last Sync Timestamp
```sql
SELECT last_sync_at FROM sync_status WHERE service = 'gcal'
```
Default to 30 days ago if null.

---

### 3. Fetch Calendar Events
Google Calendar node — Get Many Events:
- **Calendar**: Primary (coryk@smaiadvisors.com)
- **Time Min**: `{{ lastSyncAt }}`
- **Time Max**: 30 days from now (capture upcoming scheduled meetings too)
- **Max Results**: 200
- **Single Events**: Yes (expand recurring events)
- **Return fields**: id, summary, description, start, end, attendees, status

Filter out: events where `status = 'cancelled'`

---

### 4. Loop Over Events
For each event:

**4a. Extract Attendees**
Get the list of attendees. Remove `coryk@smaiadvisors.com` from the list (we don't want to create a self-referencing interaction).

If no attendees remain → skip.

**4b. Look Up Each Attendee in Supabase**
For each attendee email:
```sql
SELECT id, company_id FROM contacts WHERE LOWER(email) = LOWER('{{ attendee.email }}') LIMIT 1
```

**4c. Upsert Interaction Per Matched Contact**
For each contact found, upsert `interactions`:
```json
{
  "contact_id": "{{ contact.id }}",
  "company_id": "{{ contact.company_id }}",
  "type": "meeting",
  "subject": "{{ event.summary }}",
  "summary": "{{ event.description | truncate(500) }}",
  "occurred_at": "{{ event.start.dateTime ?? event.start.date }}",
  "source": "gcal",
  "external_id": "{{ event.id }}_{{ contact.id }}"
}
```
`external_id` = `eventId_contactId` — this allows the same meeting to create one row per attendee without collision.

---

### 5. Mark Sync Complete
```json
{
  "service": "gcal",
  "last_sync_at": "{{ $now }}",
  "last_sync_status": "success",
  "records_synced": "{{ totalUpserted }}",
  "error_message": null,
  "updated_at": "{{ $now }}"
}
```

---

### 6. Error Handling
On any error:
```json
{
  "service": "gcal",
  "last_sync_status": "error",
  "error_message": "{{ $error.message }}",
  "updated_at": "{{ $now }}"
}
```

---

## Key Notes

- **external_id format**: `{gcal_event_id}_{contact_id}` — unique per event+contact pair. Safe to re-run.
- **All-day events**: `event.start.date` (no time component) vs `event.start.dateTime`. Use whichever is present, default time to `00:00:00` if all-day.
- **Recurring events**: With `singleEvents: true`, each occurrence gets its own event ID. Each sync naturally picks up new occurrences.
- **Future meetings**: Sync 30 days forward so upcoming meetings appear on timelines. When they occur, they'll already be in the DB.
- **Multi-attendee meetings**: One interaction row per contact. If a meeting has 3 contacts, you get 3 rows — one on each contact's timeline. This is intentional.
- **`sync_status` service key**: Must be exactly `gcal` to match the Settings UI.

---

## Chaining Gmail + GCal in One Workflow

You can build this as one n8n workflow with two branches off the schedule trigger:
1. Branch A → Gmail sync (steps 1-6 above)
2. Branch B → GCal sync (steps 1-6 above)

Both branches run in parallel. The final node merges outputs and writes a single combined `sync_status` update (or keep them separate — either works).
