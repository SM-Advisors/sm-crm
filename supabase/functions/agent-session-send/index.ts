import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-agent-secret",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(msg: string, status = 400) {
  return json({ error: msg }, status);
}

async function isAuthorized(req: Request): Promise<boolean> {
  const agentSecret = req.headers.get("x-agent-secret");
  const expectedSecret = Deno.env.get("AGENT_API_SECRET");
  if (expectedSecret && agentSecret && agentSecret === expectedSecret) {
    return true;
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { data } = await sb.auth.getUser(token);
    if (data?.user) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return err("Method not allowed", 405);
  }

  if (!(await isAuthorized(req))) {
    return err("Unauthorized", 401);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return err("Missing ANTHROPIC_API_KEY", 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body");
  }

  const sessionId = body.session_id as string;
  const message = body.message as string;
  if (!sessionId || !message) {
    return err("session_id and message are required");
  }

  try {
    const resp = await fetch(
      `https://api.anthropic.com/v1/sessions/${sessionId}/events`,
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "managed-agents-2026-04-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          events: [
            {
              type: "user.message",
              content: [{ type: "text", text: message }],
            },
          ],
        }),
      }
    );

    const data = await resp.text();
    if (!resp.ok) {
      console.error("Anthropic error:", data);
      return err("Failed to send message", resp.status);
    }

    return json({ ok: true });
  } catch (e) {
    console.error("Error:", e);
    return err(e instanceof Error ? e.message : String(e), 500);
  }
});
