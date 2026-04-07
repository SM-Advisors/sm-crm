# Gmail Sync — n8n Workflow Spec

## Purpose
Pull emails from Gmail involving known contacts and write them to the `interactions` table in Supabase. This populates the Timeline tab on every contact and company detail page.

## Trigger
- **Schedule**: Every day at 6:00 AM CST
- **Optionally**: Supabase Realtime webhook when `sync_status.last_sync_status = 'requested'` for service = `gmail` (enables the "Sync now" button in Settings)

---

## Workflow Steps

### 1. Mark Sync In Progress
Supabase node — upsert `sync_status`:
```json
{
  "service": "gmail",
  "last_sync_status": "in_progress",
  "updated_at": "{{ $now }}"
}
```
Match on column: `service`

---

### 2. Get Last Sync Timestamp
Supabase node — select from `sync_status`:
```sql
SELECT last_sync_at FROM sync_status WHERE service = 'gmail'
```
Store result as `lastSyncAt`. If null, default to 30 days ago.

---

### 3. Fetch Emails from Gmail
Gmail node — Get Many Messages:
- **After**: `{{ lastSyncAt }}`
- **Max results**: 200
- **Include spam/trash**: No
- **Return fields**: id, threadId, from, to, cc, subject, date, snippet, labelIds

---

### 4. Loop Over Messages
SplitInBatches or forEach over each message.

For each message:

**4a. Determine Direction**
- If `from` contains `coryk@smaiadvisors.com` → `type = email_sent`, counterparty = first address in `to`
- Otherwise → `type = email_received`, counterparty = `from` address

Extract counterparty email (strip display name, keep raw address).

**4b. Look Up Contact in Supabase**
```sql
SELECT id, company_id FROM contacts WHERE LOWER(email) = LOWER('{{ counterparty_email }}') LIMIT 1
```
If no match → skip this message (no contact to link it to).

**4c. Upsert Interaction**
Supabase node — upsert `interactions`:
```json
{
  "contact_id": "{{ contact.id }}",
  "company_id": "{{ contact.company_id }}",
  "type": "{{ direction }}",
  "subject": "{{ message.subject }}",
  "summary": "{{ message.snippet }}",
  "occurred_at": "{{ message.date }}",
  "source": "gmail",
  "external_id": "{{ message.id }}"
}
```
Match on column: `external_id`
(This prevents duplicate inserts on re-runs.)

---

### 5. Mark Sync Complete
After loop finishes — Supabase upsert `sync_status`:
```json
{
  "service": "gmail",
  "last_sync_at": "{{ $now }}",
  "last_sync_status": "success",
  "records_synced": "{{ totalUpserted }}",
  "error_message": null,
  "updated_at": "{{ $now }}"
}
```

---

### 6. Error Handling
Add error branch to every Supabase/Gmail node. On any error, upsert:
```json
{
  "service": "gmail",
  "last_sync_status": "error",
  "error_message": "{{ $error.message }}",
  "updated_at": "{{ $now }}"
}
```

---

## Key Notes

- **Deduplication**: `external_id` = Gmail message ID. Upsert on `external_id` means re-runs are safe.
- **Thread handling**: Index by message, not thread. Each email = one interaction row.
- **Contact matching**: Match on `contacts.email` only. No fuzzy matching — if the email isn't in the CRM it's skipped.
- **Sent items**: Gmail labels `SENT` on outbound. Can alternatively filter by label instead of checking `from`.
- **Rate limits**: Gmail API allows 250 quota units/second. With 200 messages/run you're well within limits.
- **`sync_status` service key**: Must be exactly `gmail` to match the Settings UI.
