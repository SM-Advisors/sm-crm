# GCal Sync — n8n Build Guide (Step by Step)

> Reference spec: `gcal-sync-spec.md`
> Edge Function: `supabase/functions/gcal-sync/index.ts`
> Estimated build time: 25–35 minutes (assumes OAuth client + webhook secret already exist from Gmail sync)

---

## Architecture

Same pattern as Gmail sync: n8n handles Google Calendar API calls and orchestration. All Supabase reads/writes go through the `gcal-sync` Edge Function.

**Edge Function endpoints** (all POST):
| Action | Path | Purpose |
|--------|------|---------|
| `mark-sync-status` | `/gcal-sync/mark-sync-status` | Update sync_status table |
| `get-last-sync` | `/gcal-sync/get-last-sync` | Get last sync timestamp |
| `lookup-contacts-by-emails` | `/gcal-sync/lookup-contacts-by-emails` | Match attendee emails to contacts (batch) |
| `upsert-interaction` | `/gcal-sync/upsert-interaction` | Write one interaction row |
| `bulk-upsert-interactions` | `/gcal-sync/bulk-upsert-interactions` | Write many interactions at once |

---

## Prerequisites

### 1. Deploy the Edge Function

Push the repo to GitHub. Deploy in Lovable — this deploys `supabase/functions/gcal-sync/index.ts`.

Your Edge Function URL:
```
https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/gcal-sync/<action>
```

The `N8N_WEBHOOK_SECRET` you set for Gmail sync is shared across all Edge Functions — no need to set it again.

### 2. Set up Google Calendar OAuth credentials in n8n

You already have a Google Cloud OAuth client from the Gmail setup. Just enable the Calendar API:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → your project.
2. **APIs & Services → Library** → search **Google Calendar API** → enable it.
3. In n8n, go to **Credentials → Add Credential → Google Calendar OAuth2 API**.
   - Use the same Client ID and Client Secret from the Gmail setup.
   - Click **Sign in with Google** and authorize with `coryk@smaiadvisors.com`.
   - Grant access to read calendar events.
4. Name the credential `Google Calendar - SM Advisors` and save.

---

## Build the Workflow

Open n8n → **New Workflow** → Name it `GCal Sync`.

---

### Node 1: Schedule Trigger

- **Node type**: Schedule Trigger
- **Settings**:
  - Rule: Cron
  - Expression: `0 6 * * 1` (every Monday at 6:00 AM)
  - Timezone: `America/Chicago`

---

### Node 2: Mark Sync In Progress

- **Node type**: HTTP Request
- **Method**: POST
- **URL**: `https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/gcal-sync/mark-sync-status`
- **Headers**:
  - `x-webhook-secret`: your webhook secret
  - `Content-Type`: `application/json`
- **Body (JSON)**:
```json
{
  "status": "in_progress"
}
```

Connect: **Schedule Trigger → Mark Sync In Progress**

---

### Node 3: Get Last Sync Timestamp

- **Node type**: HTTP Request
- **Method**: POST
- **URL**: `https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/gcal-sync/get-last-sync`
- **Headers**: `x-webhook-secret` header
- **Body**: `{}`

Connect: **Mark Sync In Progress → Get Last Sync Timestamp**

---

### Node 4: Compute Time Window (Code node)

- **Node type**: Code
- **Language**: JavaScript
- **Code**:

```javascript
const lastSyncAt = $input.first().json.last_sync_at;
// GCal uses RFC3339 timestamps
const timeMin = lastSyncAt;
const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
return [{ json: { timeMin, timeMax } }];
```

Connect: **Get Last Sync Timestamp → Compute Time Window**

---

### Node 5: Fetch Calendar Events

- **Node type**: Google Calendar
- **Credential**: `Google Calendar - SM Advisors`
- **Operation**: Get Many
- **Resource**: Event
- **Calendar**: Primary (or select `coryk@smaiadvisors.com`)
- **Return All**: No
- **Limit**: 200
- **Options**:
  - **Time Min**: `{{ $json.timeMin }}`
  - **Time Max**: `{{ $json.timeMax }}`
  - **Single Events**: true
  - **Order By**: startTime

Connect: **Compute Time Window → Fetch Calendar Events**

---

### Node 6: Filter Out Cancelled Events

- **Node type**: IF
- **Conditions**: `{{ $json.status }}` is not equal to `cancelled`

Connect: **Fetch Calendar Events → Filter Out Cancelled**

---

### Node 7: Loop Over Each Event

- **Node type**: SplitInBatches
- **Batch Size**: 1

Connect: **Filter Out Cancelled (true) → Loop Over Each Event**

---

### Node 8: Extract Attendees + Look Up Contacts (Code node)

This node extracts attendees, removes your email, and prepares the lookup request.

- **Node type**: Code
- **Language**: JavaScript
- **Code**:

```javascript
const event = $input.first().json;
const myEmail = 'coryk@smaiadvisors.com';

const attendees = (event.attendees || [])
  .map(a => (a.email || '').toLowerCase().trim())
  .filter(email => email && email !== myEmail);

if (attendees.length === 0) {
  // No external attendees — skip
  return [];
}

return [{
  json: {
    eventId: event.id,
    subject: event.summary || '(no title)',
    description: (event.description || '').substring(0, 500),
    occurredAt: event.start?.dateTime || event.start?.date || event.start,
    attendeeEmails: attendees
  }
}];
```

Connect: **Loop Over Each Event (main output) → Extract Attendees**

---

### Node 9: Look Up Contacts by Email (batch)

- **Node type**: HTTP Request
- **Method**: POST
- **URL**: `https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/gcal-sync/lookup-contacts-by-emails`
- **Headers**: `x-webhook-secret` header
- **Body (JSON)**:
```json
{
  "emails": {{ $json.attendeeEmails }}
}
```

> Make sure `attendeeEmails` is sent as an array, not a string. In n8n's expression editor, `{{ $json.attendeeEmails }}` should pass the array directly. If it stringifies, use `{{ JSON.stringify($json.attendeeEmails) }}` or switch to "Expression" body mode.

Returns:
```json
{
  "matches": {
    "john@bank.com": { "contact_id": "...", "company_id": "..." }
  },
  "matched_count": 1
}
```

Connect: **Extract Attendees → Look Up Contacts**

---

### Node 10: Build Interaction Rows (Code node)

- **Node type**: Code
- **Language**: JavaScript
- **Code**:

```javascript
const eventData = $('Extract Attendees').first().json;
const lookupResult = $input.first().json;
const matches = lookupResult.matches || {};

if (Object.keys(matches).length === 0) {
  // No contacts matched — skip
  return [];
}

// One interaction per matched contact
const interactions = Object.entries(matches).map(([email, contact]) => ({
  json: {
    contact_id: contact.contact_id,
    company_id: contact.company_id,
    type: 'meeting',
    subject: eventData.subject,
    summary: eventData.description,
    occurred_at: eventData.occurredAt,
    external_id: `${eventData.eventId}_${contact.contact_id}`
  }
}));

return interactions;
```

Connect: **Look Up Contacts → Build Interaction Rows**

---

### Node 11: Upsert Each Interaction

- **Node type**: HTTP Request
- **Method**: POST
- **URL**: `https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/gcal-sync/upsert-interaction`
- **Headers**: `x-webhook-secret` header
- **Body (JSON)**:
```json
{
  "contact_id": "{{ $json.contact_id }}",
  "company_id": "{{ $json.company_id }}",
  "type": "{{ $json.type }}",
  "subject": "{{ $json.subject }}",
  "summary": "{{ $json.summary }}",
  "occurred_at": "{{ $json.occurred_at }}",
  "external_id": "{{ $json.external_id }}"
}
```

> Since Build Interaction Rows can output multiple items (one per matched attendee), n8n will automatically execute this HTTP Request once per item.

Connect: **Build Interaction Rows → Upsert Each Interaction**

---

### Node 12: Loop Back

Connect: **Upsert Each Interaction → Loop Over Each Event** (back to SplitInBatches)

If Extract Attendees returns empty (no attendees), n8n should skip downstream nodes and loop back automatically.

---

### Node 13: Count Records (Code node)

- **Node type**: Code
- **Code**:

```javascript
const items = $input.all();
return [{ json: { totalUpserted: items.length } }];
```

Connect: **SplitInBatches (done output) → Count Records**

---

### Node 14: Mark Sync Complete

- **Node type**: HTTP Request
- **Method**: POST
- **URL**: `https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/gcal-sync/mark-sync-status`
- **Headers**: `x-webhook-secret` header
- **Body (JSON)**:
```json
{
  "status": "success",
  "records_synced": {{ $json.totalUpserted }}
}
```

Connect: **Count Records → Mark Sync Complete**

---

## Error Handling

Same as Gmail sync — create an Error Trigger workflow or add an error branch:

1. **Node 1**: Error Trigger
2. **Node 2**: HTTP Request → POST to `/gcal-sync/mark-sync-status`
   - Body: `{ "status": "error", "error_message": "{{ $json.execution.error.message }}" }`

---

## "Sync Now" Button

Same pattern as Gmail. The CRM upserts `sync_status` with `requested` for `service = 'gcal'`. Wire up a webhook or skip for now and use n8n's manual test button.

---

## Testing Checklist

- [ ] Deploy Edge Function via Lovable
- [ ] Test Edge Function: `curl -X POST https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/gcal-sync/get-last-sync -H "x-webhook-secret: YOUR_SECRET" -H "Content-Type: application/json" -d '{}'`
- [ ] Run workflow manually — verify meetings appear in `interactions` with `type = 'meeting'`
- [ ] Check `external_id` format: `{eventId}_{contactId}`
- [ ] Multi-attendee meeting creates one row per matched contact
- [ ] Cancelled events are skipped
- [ ] All-day events sync correctly
- [ ] `sync_status` shows `success` with record count
- [ ] Re-run — no duplicate rows
- [ ] Open a contact in the CRM — Timeline shows synced meetings
- [ ] Future scheduled meetings appear on timelines
