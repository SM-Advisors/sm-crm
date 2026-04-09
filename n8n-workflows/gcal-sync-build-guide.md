# Google Calendar Sync — n8n Build Guide (Step by Step)

Follow every step exactly. Each section = one node in the workflow.

---

## Step 0: Create the Workflow

1. Open your n8n instance
2. Click **+ Add Workflow** (top right)
3. Name it: `GCal Sync`
4. You'll see the canvas with a **Start** node. Delete it — we'll add our own trigger.

---

## Step 0.5: Set Up Google Calendar Credential (if you haven't already)

1. In the left sidebar, click **Credentials**
2. Click **+ Add Credential**
3. Search for **Google Calendar OAuth2 API**
4. Click it
5. You'll see fields for:
   - **Client ID**: Get this from Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client
   - **Client Secret**: Same place
6. Click **Sign in with Google** — authorize with `coryk@smaiadvisors.com`
7. Once connected, name the credential `Google Calendar - Cory`
8. Click **Save**

> If you already have a Google credential from Gmail sync, you may be able to reuse it — Google Calendar and Gmail can share the same OAuth app. Just make sure the Calendar API is enabled in your Google Cloud project (APIs & Services > Library > Google Calendar API > Enable).

---

## Step 1: Schedule Trigger

This runs the workflow daily.

1. Click the **+** button on the canvas (or press Tab)
2. Search for **Schedule Trigger**
3. Click it to add it
4. In the node settings panel on the right:
   - **Trigger Interval**: `Days`
   - **Days Between Triggers**: `1`
   - **Trigger at Hour**: `6`
   - **Trigger at Minute**: `0`
   - **Timezone**: `America/Chicago`
5. Click **Back to canvas** (or press Escape)

This node fires once per day at 6:00 AM Central.

---

## Step 2: Mark Sync In Progress

This updates the CRM's sync status so the Settings page shows "In Progress".

1. Click the **+** to the right of the Schedule Trigger node
2. Search for **Supabase**
3. Click it to add it
4. **Rename the node**: Double-click the node title and rename it to `Mark In Progress`
5. In the settings panel:
   - **Credential**: Select your Supabase credential (service_role key)
   - **Resource**: `Row`
   - **Operation**: `Upsert`
   - **Table Name**: Select `sync_status` from the dropdown
   - Under **Columns to Match On** (this tells Supabase which column to match for the upsert):
     - Click **Add Column**
     - Select `service`
   - Under **Fields to Send**:
     - Click **Define below** (manual mode)
     - Click **Add Field** three times to add these:
       1. **Name**: `service` — **Value**: `gcal`
       2. **Name**: `last_sync_status` — **Value**: `in_progress`
       3. **Name**: `updated_at` — **Value**: `{{ $now.toISO() }}`
6. Click **Back to canvas**

---

## Step 3: Get Last Sync Timestamp

We need to know when we last synced so we only fetch new events.

1. Click the **+** to the right of `Mark In Progress`
2. Search for **Supabase**
3. Add it and **rename** to `Get Last Sync`
4. Settings:
   - **Credential**: Same Supabase credential
   - **Resource**: `Row`
   - **Operation**: `Get Many`
   - **Table Name**: `sync_status`
   - **Return All**: No
   - **Limit**: `1`
   - Under **Filters** (or **Options > Filters**):
     - Click **Add Filter**
     - **Column**: `service`
     - **Operator**: `equals`  (or `equal` depending on n8n version)
     - **Value**: `gcal`
5. Click **Back to canvas**

---

## Step 4: Fetch Calendar Events

This pulls events from Google Calendar.

1. Click the **+** to the right of `Get Last Sync`
2. Search for **Google Calendar**
3. Click it and **rename** to `Fetch Events`
4. Settings:
   - **Credential**: Select `Google Calendar - Cory` (or whatever you named it)
   - **Resource**: `Event`
   - **Operation**: `Get Many`
   - **Calendar**: Select your primary calendar (should show `coryk@smaiadvisors.com` or "Primary")
   - **Return All**: No
   - **Limit**: `200`
   - Under **Options** (click "Add Option" or expand Options):
     - **Single Events**: `true` (this expands recurring events into individual occurrences)
     - **Time Min**: Click the expression editor (the `fx` icon to the right of the field) and paste:
       ```
       {{ $('Get Last Sync').first().json.last_sync_at ? $('Get Last Sync').first().json.last_sync_at : new Date(Date.now() - 30*24*60*60*1000).toISOString() }}
       ```
       This says: use last sync time, or 30 days ago if never synced.
     - **Time Max**: Click the expression editor and paste:
       ```
       {{ new Date(Date.now() + 30*24*60*60*1000).toISOString() }}
       ```
       This fetches 30 days into the future (so upcoming meetings appear on timelines).
5. Click **Back to canvas**

---

## Step 5: Filter Cancelled Events

Skip events that were cancelled.

1. Click **+** to the right of `Fetch Events`
2. Search for **Filter** (not "IF" — use the Filter node)
3. Add it and **rename** to `Remove Cancelled`
4. Settings:
   - **Conditions**: 
     - Click **Add Condition**
     - **Value 1** (left side): Click expression editor, type `{{ $json.status }}`
     - **Operation**: `is not equal to`
     - **Value 2** (right side): `cancelled`
5. Click **Back to canvas**

---

## Step 6: Extract Attendees (Code Node)

This is the most important node. It takes each calendar event and produces one output row per attendee (excluding you), with the event details attached.

1. Click **+** to the right of `Remove Cancelled`
2. Search for **Code**
3. Add it and **rename** to `Extract Attendees`
4. Settings:
   - **Mode**: `Run Once for All Items`
   - **Language**: `JavaScript`
   - Delete whatever is in the code box and paste this EXACTLY:

```javascript
const results = [];
const ownerEmail = 'coryk@smaiadvisors.com';

for (const item of $input.all()) {
  const event = item.json;
  
  // Get attendees, skip if none
  const attendees = (event.attendees || [])
    .filter(a => a.email && a.email.toLowerCase() !== ownerEmail.toLowerCase())
    .map(a => a.email.toLowerCase());

  // Skip events with no external attendees
  if (attendees.length === 0) continue;

  // Create one output row per attendee
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

// If no results, return a single item with a flag so we can handle it downstream
if (results.length === 0) {
  return [{ json: { _no_attendees: true } }];
}

return results;
```

5. Click **Back to canvas**

---

## Step 7: Check If Any Attendees Found

We need to stop the flow if there were no attendees to look up.

1. Click **+** to the right of `Extract Attendees`
2. Search for **IF**
3. Add it and **rename** to `Has Attendees?`
4. Settings:
   - **Conditions**:
     - **Value 1**: Click expression editor → `{{ $json._no_attendees }}`
     - **Operation**: `is not equal to`  (or `does not exist`)
     - **Value 2**: `true`
5. The **true** output (has attendees) continues to the next node
6. The **false** output (no attendees) should connect to the `Mark Sync Complete` node (we'll create that later — for now just leave it disconnected)
7. Click **Back to canvas**

---

## Step 8: Look Up Contact in Supabase

For each attendee email, look them up in the contacts table.

1. From the **true** output of `Has Attendees?`, click **+**
2. Search for **Supabase**
3. Add it and **rename** to `Find Contact`
4. Settings:
   - **Credential**: Supabase credential
   - **Resource**: `Row`
   - **Operation**: `Get Many`
   - **Table Name**: `contacts`
   - **Return All**: No
   - **Limit**: `1`
   - Under **Filters**:
     - Click **Add Filter**
     - **Column**: `email`
     - **Operator**: `equals`
     - **Value**: Click expression editor → `{{ $json.attendee_email }}`

   > **Important**: This node runs once per item coming in. So if Extract Attendees outputs 15 rows, this runs 15 times — one lookup per attendee.

5. Click **Back to canvas**

---

## Step 9: Filter — Contact Found?

Skip attendees who aren't in the CRM.

1. Click **+** to the right of `Find Contact`
2. Search for **IF**
3. Add it and **rename** to `Contact Found?`
4. Settings:
   - **Conditions**:
     - **Value 1**: Click expression editor → `{{ $json.id }}`
     - **Operation**: `exists` (or `is not empty`)

   > If your n8n version doesn't have "exists", use:
   > - **Value 1**: `{{ $json.id }}`
   > - **Operation**: `is not equal to`
   > - **Value 2**: (leave empty) or `undefined`

5. **true** output = contact found, continues to upsert
6. **false** output = no match, goes nowhere (dead end — that's fine)
7. Click **Back to canvas**

---

## Step 10: Upsert Interaction

This is where the meeting gets written to the database.

1. From the **true** output of `Contact Found?`, click **+**
2. Search for **Supabase**
3. Add it and **rename** to `Upsert Meeting`
4. Settings:
   - **Credential**: Supabase credential
   - **Resource**: `Row`
   - **Operation**: `Upsert`
   - **Table Name**: `interactions`
   - Under **Columns to Match On**:
     - Click **Add Column**
     - Select `external_id`
   - Under **Fields to Send**:
     - Click **Define below** (manual mode)
     - Click **Add Field** seven times:

| # | Name | Value (use expression editor for all) |
|---|------|-------|
| 1 | `contact_id` | `{{ $('Find Contact').item.json.id }}` |
| 2 | `company_id` | `{{ $('Find Contact').item.json.company_id }}` |
| 3 | `type` | `meeting` (plain text, not an expression) |
| 4 | `subject` | `{{ $('Extract Attendees').item.json.event_summary }}` |
| 5 | `summary` | `{{ $('Extract Attendees').item.json.event_description }}` |
| 6 | `occurred_at` | `{{ $('Extract Attendees').item.json.event_start }}` |
| 7 | `source` | `gcal` (plain text) |
| 8 | `external_id` | `{{ $('Extract Attendees').item.json.event_id }}_{{ $('Find Contact').item.json.id }}` |

   > **Why this external_id format?** If a meeting has 3 CRM contacts as attendees, each gets their own interaction row. The `eventId_contactId` combo is unique per attendee per event.

5. Click **Back to canvas**

---

## Step 11: Count Results

Count how many meetings were synced for the status update.

1. Click **+** to the right of `Upsert Meeting`
2. Search for **Code**
3. Add it and **rename** to `Count Results`
4. Settings:
   - **Mode**: `Run Once for All Items`
   - **Language**: `JavaScript`
   - **Code**:
```javascript
return [{ json: { count: $input.all().length } }];
```
5. Click **Back to canvas**

---

## Step 12: Mark Sync Complete

Update sync status to show success in the CRM.

1. Click **+** to the right of `Count Results`
2. Search for **Supabase**
3. Add it and **rename** to `Mark Complete`
4. Settings:
   - **Credential**: Supabase credential
   - **Resource**: `Row`
   - **Operation**: `Upsert`
   - **Table Name**: `sync_status`
   - Under **Columns to Match On**:
     - Click **Add Column**
     - Select `service`
   - Under **Fields to Send** (manual mode, 5 fields):

| # | Name | Value |
|---|------|-------|
| 1 | `service` | `gcal` |
| 2 | `last_sync_at` | `{{ $now.toISO() }}` |
| 3 | `last_sync_status` | `success` |
| 4 | `records_synced` | `{{ $json.count }}` |
| 5 | `updated_at` | `{{ $now.toISO() }}` |

5. Click **Back to canvas**

---

## Step 13: Connect the "No Attendees" Path

Remember in Step 7, the **false** output of `Has Attendees?` was disconnected.

1. Drag a connection from the **false** output of `Has Attendees?` to the `Mark Complete` node
2. This way, even if there are no attendee matches, the sync status still gets updated to "success" with `records_synced = 0`

> **But wait** — the `Count Results` node won't have run on this path. To handle this, change the `records_synced` value in `Mark Complete` to:
> ```
> {{ $json.count ?? 0 }}
> ```

---

## Step 14: Add Error Handling

1. Click the **+** on the canvas (not connected to anything)
2. Search for **Error Trigger**
3. Add it and **rename** to `On Error`
4. Click **+** to the right of `On Error`
5. Search for **Supabase**
6. Add it and **rename** to `Mark Error`
7. Settings:
   - **Credential**: Supabase credential
   - **Resource**: `Row`
   - **Operation**: `Upsert`
   - **Table Name**: `sync_status`
   - Under **Columns to Match On**:
     - Select `service`
   - Under **Fields to Send** (manual mode, 4 fields):

| # | Name | Value |
|---|------|-------|
| 1 | `service` | `gcal` |
| 2 | `last_sync_status` | `error` |
| 3 | `error_message` | `{{ $json.error?.message ?? 'Unknown error' }}` |
| 4 | `updated_at` | `{{ $now.toISO() }}` |

---

## Step 15: Activate the Workflow

1. In the top right corner, toggle the **Active** switch ON
2. The workflow is now live and will run daily at 6 AM CST

---

## Testing

### Manual Test Run
1. Click **Test Workflow** (the play button at the bottom of the canvas)
2. Watch each node light up green as it executes
3. Click on each node to see its output data
4. Common issues:
   - **Fetch Events returns empty**: Check Time Min/Time Max expressions. Try widening the range.
   - **Find Contact returns empty for all**: Check that your contacts have email addresses that match calendar attendee emails exactly.
   - **Upsert fails**: Make sure you ran the unique index migration in Supabase.

### Verify in the CRM
1. Open the CRM and go to **Settings**
2. Under Integrations, Google Calendar should show:
   - Status: **Success** (green)
   - "Last sync: just now — X records"
3. Open a contact who you've had meetings with
4. Click the **Timeline** tab
5. You should see meeting interactions with the calendar event titles

### Test Deduplication
1. Run the workflow again manually
2. Check the `interactions` table — the count should NOT increase
3. The upsert on `external_id` ensures existing meetings are updated, not duplicated

---

## Final Workflow Layout

Your canvas should look like this:

```
[Schedule Trigger]
       |
[Mark In Progress]
       |
[Get Last Sync]
       |
[Fetch Events]
       |
[Remove Cancelled]
       |
[Extract Attendees]
       |
[Has Attendees?]
  |  true    |  false
  v           \--------\
[Find Contact]         |
  |                    |
[Contact Found?]       |
  | true               |
  v                    |
[Upsert Meeting]       |
  |                    |
[Count Results]        |
  |                    |
[Mark Complete] <------/

[On Error] --> [Mark Error]    (separate error branch)
```

---

## Optional: "Sync Now" Button Support

To make the CRM's "Sync now" button trigger this workflow:

1. Add a second trigger node: **Supabase Trigger** (or **Webhook**)
2. If using Supabase Trigger:
   - **Table**: `sync_status`
   - **Event**: `UPDATE`
   - Add a filter: `service = 'gcal'` AND `last_sync_status = 'requested'`
3. Connect this trigger to the same `Mark In Progress` node
4. Now both the daily schedule AND the manual button trigger the same workflow

Alternatively, if Supabase Trigger isn't available in your n8n version:
1. Add a **Webhook** trigger node instead
2. Copy the webhook URL
3. Create a Supabase Database Webhook (Database > Webhooks in Supabase dashboard):
   - **Table**: `sync_status`
   - **Events**: `UPDATE`
   - **URL**: paste the n8n webhook URL
   - **Filter**: add a condition for `service = 'gcal'` and `last_sync_status = 'requested'`
