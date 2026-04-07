

# Add Edge Function Secrets

## What
Add three new secrets to the project's backend so Edge Functions can access them at runtime:
1. **CLAUDE_API_KEY** — for Claude API calls (BD agent via edge functions)
2. **RESEND_API_KEY** — for sending emails via Resend
3. **WEBHOOK_SECRET** — for authenticating inbound webhook requests

## How
Use the `add_secret` tool three times to prompt you for each value. You'll paste each key when prompted — values are stored securely and never visible in code.

## Notes
- These are **runtime secrets** available to Edge Functions only (not build-time)
- Existing secrets (N8N_WEBHOOK_SECRET, SUPABASE_*, LOVABLE_API_KEY) are unchanged
- No code or migration changes needed — just secret storage

