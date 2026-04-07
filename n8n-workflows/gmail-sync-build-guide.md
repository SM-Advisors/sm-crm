# Gmail Sync — n8n Build Guide (Step by Step)

> Reference spec: `gmail-sync-spec.md`
> Edge Function: `supabase/functions/gmail-sync/index.ts`
> Estimated build time: 30–45 minutes (plus OAuth setup)

---

## Architecture

n8n handles Gmail API calls and orchestration. All Supabase reads/writes go through the `gmail-sync` Edge Function (deployed via Lovable). n8n never touches Supabase directly.

**Edge Function endpoints** (all POST):
| Action | Path | Purpose |
|--------|------|---------|
| `mark-sync-status` | `/gmail-sync/mark-sync-status` | Update sync_status table |
| `get-last-sync` | `/gmail-sync/get-last-sync` | Get last sync timestamp |
| `lookup-contact` | `/gmail-sync/lookup-contact` | Match email to CRM contact |
| `upsert-interaction` | `/gmail-sync/upsert-interaction` | Write one interaction row |
| `bulk-upsert-interactions` | `/gmail-sync/bulk-upsert-interactions` | Write many interactions at once |

---

## Prerequisites

### 1. Deploy the Edge Function

Push the repo to GitHub. In Lovable, deploy the project — this will deploy `supabase/functions/gmail-sync/index.ts` as an Edge Function.

Your Edge Function URL will be:
```
https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/gmail-sync/<action>
```

### 2. Set the webhook secret

In Lovable's Supabase secrets/environment, add:
- `N8N_WEBHOOK_SECRET` = a random string you generate (e.g., `openssl rand -hex 32` in a terminal)

Save this value — you'll also put it in n8n.

### 3. Set up Gmail OAuth credentials in n8n

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → select or create the project you use for SM Advisors.
2. Navigate to **APIs & Services → Library**. Search for **Gmail API** and enable it.
3. Navigate to **APIs & Services → Credentials** → **Create Credentials → OAuth client ID**.
   - Application type: **Web application**
   - Name: `n8n Gmail Sync`
   - Authorized redirect URIs: Add your n8n OAuth callback URL. The pattern is: `https://<your-n8n-domain>/rest/oauth2-credential/callback`
   - If running n8n locally: `http://localhost:5678/rest/oauth2-credential/callback`
4. Copy the **Client ID** and **Client Secret**.
5. In n8n, go to **Credentials → Add Credential → Gmail OAuth2 API**.
   - Paste Client ID and Client Secret.
   - Click **Sign in with Google** and authorize with `coryk@smaiadvisors.com`.
   - Grant access to read Gmail messages.
6. Name the credential `Gmail - SM Advisors` and save.

### 4. UNIQUE constraint on `interactions.external_id`

If you haven't already run this migration, do it through Lovable's SQL interface:
```sql
ALTER TABLE interactions ADD CONSTRAINT interactions_external_id_unique UNIQUE (external_id);
```

---

## Build the Workflow

Open n8n → **New Workflow** → Name it `Gmail Sync`.

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
- **URL**: `https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/gmail-sync/mark-sync-status`
- **Authentication**: None (we use a custom header)
- **Headers**:
  - `x-webhook-secret`: your webhook secret value
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
- **URL**: `https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/gmail-sync/get-last-sync`
- **Headers**: same `x-webhook-secret` header
- **Body**: `{}` (empty JSON)

This returns `{ "last_sync_at": "2026-04-01T06:00:00Z" }`.

Connect: **Mark Sync In Progress → Get Last Sync Timestamp**

---

### Node 4: Compute Gmail Search Window (Code node)

- **Node type**: Code
- **Language**: JavaScript
- **Code**:

```javascript
const lastSyncAt = $input.first().json.last_sync_at;
// Gmail "after:" filter uses epoch seconds
const afterEpoch = Math.floor(new Date(lastSyncAt).getTime() / 1000);
return [{ json: { lastSyncAt, afterEpoch } }];
```

Connect: **Get Last Sync Timestamp → Compute Gmail Search Window**

---

### Node 5: Fetch Gmail Messages

- **Node type**: Gmail
- **Credential**: `Gmail - SM Advisors`
- **Operation**: Get Many
- **Resource**: Message
- **Return All**: No
- **Limit**: 200
- **Filters**:
  - **Received After**: expression `{{ $json.afterEpoch }}`
- **Options**:
  - Include Spam/Trash: No

Connect: **Compute Gmail Search Window → Fetch Gmail Messages**

---

### Node 6: Loop Over Each Message

- **Node type**: SplitInBatches
- **Batch Size**: 1

Connect: **Fetch Gmail Messages → Loop Over Each Message**

---

### Node 7: Determine Direction + Extract Counterparty (Code node)

- **Node type**: Code
- **Language**: JavaScript
- **Code**:

```javascript
const message = $input.first().json;
const from = (message.from || '').toLowerCase();
const to = (message.to || '').toLowerCase();
const myEmail = 'coryk@smaiadvisors.com';

let type, counterpartyRaw;

if (from.includes(myEmail)) {
  type = 'email_sent';
  counterpartyRaw = to;
} else {
  type = 'email_received';
  counterpartyRaw = from;
}

// Extract just the email address (strip "Display Name <email>" format)
const emailMatch = counterpartyRaw.match(/<([^>]+)>/);
const counterpartyEmail = emailMatch ? emailMatch[1] : counterpartyRaw.trim();

// Clean up — handle multiple recipients by taking first
const cleanEmail = counterpartyEmail.split(',')[0].trim().toLowerCase();

return [{
  json: {
    messageId: message.id,
    subject: message.subject || '(no subject)',
    snippet: message.snippet || '',
    date: message.date,
    type,
    counterpartyEmail: cleanEmail
  }
}];
```

Connect: **Loop Over Each Message (main output) → Determine Direction**

---

### Node 8: Look Up Contact

- **Node type**: HTTP Request
- **Method**: POST
- **URL**: `https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/gmail-sync/lookup-contact`
- **Headers**: `x-webhook-secret` header
- **Body (JSON)**: expression mode:
```json
{
  "email": "{{ $json.counterpartyEmail }}"
}
```

Returns `{ "found": true, "contact_id": "...", "company_id": "..." }` or `{ "found": false }`.

Connect: **Determine Direction → Look Up Contact**

---

### Node 9: IF — Contact Found?

- **Node type**: IF
- **Conditions**: `{{ $json.found }}` equals `true`

Connect: **Look Up Contact → IF Contact Found**

---

### Node 10: Upsert Interaction

- **Node type**: HTTP Request
- **Method**: POST
- **URL**: `https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/gmail-sync/upsert-interaction`
- **Headers**: `x-webhook-secret` header
- **Body (JSON)**: Use expression mode to build the body. Reference upstream nodes by name:
```json
{
  "contact_id": "{{ $('IF Contact Found').first().json.contact_id }}",
  "company_id": "{{ $('IF Contact Found').first().json.company_id }}",
  "type": "{{ $('Determine Direction').first().json.type }}",
  "subject": "{{ $('Determine Direction').first().json.subject }}",
  "summary": "{{ $('Determine Direction').first().json.snippet }}",
  "occurred_at": "{{ $('Determine Direction').first().json.date }}",
  "external_id": "{{ $('Determine Direction').first().json.messageId }}"
}
```

> Note: The `contact_id` and `company_id` come from the Look Up Contact response, which is passed through the IF node. Depending on how n8n names the passthrough, you may need to adjust the node reference to `$('Look Up Contact')` instead. Test and check which node has the data.

Connect: **IF Contact Found (true) → Upsert Interaction**

---

### Node 11: Loop Back

Connect: **Upsert Interaction → Loop Over Each Message** (back to SplitInBatches)

Also connect: **IF Contact Found (false) → Loop Over Each Message** (skip unmatched)

---

### Node 12: Count Records (Code node)

After the loop completes (SplitInBatches "done" output):

- **Node type**: Code
- **Code**:

```javascript
const items = $input.all();
return [{ json: { totalUpserted: items.length } }];
```

Connect: **SplitInBatches (done output) → Count Records**

---

### Node 13: Mark Sync Complete

- **Node type**: HTTP Request
- **Method**: POST
- **URL**: `https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/gmail-sync/mark-sync-status`
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

Create a separate **Error Trigger** workflow (or add an error branch):

1. **Node 1**: Error Trigger
2. **Node 2**: HTTP Request → POST to `/gmail-sync/mark-sync-status`
   - Body: `{ "status": "error", "error_message": "{{ $json.execution.error.message }}" }`

---

## Enabling the "Sync Now" Button

The CRM Settings page upserts `sync_status` with `last_sync_status = 'requested'`. Two options:

**Option A — Webhook trigger**: Add a second Webhook trigger node to this workflow. Then create a small Edge Function or database webhook in Lovable that fires an HTTP call to your n8n webhook URL when `sync_status` is updated to `requested` for `service = 'gmail'`.

**Option B — Skip for now**: The weekly schedule handles regular syncing. You can always click "Test Workflow" in n8n for an ad-hoc sync.

---

## Testing Checklist

- [ ] Deploy Edge Function via Lovable (push to GitHub, deploy in Lovable)
- [ ] Test Edge Function directly: `curl -X POST https://gzznvkcaaceysdtxaptz.supabase.co/functions/v1/gmail-sync/get-last-sync -H "x-webhook-secret: YOUR_SECRET" -H "Content-Type: application/json" -d '{}'`
- [ ] Run workflow manually in n8n — verify messages appear in `interactions`
- [ ] Check `type` is `email_sent` for outbound and `email_received` for inbound
- [ ] Verify `external_id` = Gmail message ID (no duplicates on re-run)
- [ ] Confirm `contact_id` and `company_id` populated for matched contacts
- [ ] Check `sync_status` row shows `success` with a record count
- [ ] Re-run — confirm no duplicate rows (upsert working)
- [ ] Open a contact in the CRM — verify Timeline tab shows synced emails
