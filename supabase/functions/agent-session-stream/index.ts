import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-agent-secret",
};

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
  if (req.method !== "GET") {
    return err("Method not allowed", 405);
  }

  if (!(await isAuthorized(req))) {
    return err("Unauthorized", 401);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return err("Missing ANTHROPIC_API_KEY", 500);
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) {
    return err("session_id query param required");
  }

  try {
    const resp = await fetch(
      `https://api.anthropic.com/v1/sessions/${sessionId}/events/stream`,
      {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "managed-agents-2026-04-01",
        },
      }
    );

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Anthropic stream error:", text);
      return err("Failed to connect to stream", resp.status);
    }

    return new Response(resp.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    console.error("Error:", e);
    return err(e instanceof Error ? e.message : String(e), 500);
  }
});
