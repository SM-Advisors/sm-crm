

## Add AGENT_API_SECRET and Deploy

**Step 1 — Add the secret**
Use the `add_secret` tool to prompt you to paste in your `AGENT_API_SECRET` value. This makes it available to all edge functions.

**Step 2 — Deploy**
Deploy the `agent-contacts` edge function so it picks up the new secret.

**Step 3 — Test**
Invoke the function to verify it responds correctly with the secret in place.

