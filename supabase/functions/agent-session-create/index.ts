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
  const agentId = Deno.env.get("AGENT_ID");
  const environmentId = Deno.env.get("ENVIRONMENT_ID");

  if (!apiKey || !agentId || !environmentId) {
    return err("Missing Anthropic configuration", 500);
  }

  try {
    const resp = await fetch("https://api.anthropic.com/v1/sessions", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "managed-agents-2026-04-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent: agentId,
        environment_id: environmentId,
        title: "CRM Session",
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Anthropic error:", JSON.stringify(data));
      return err(data.error?.message || "Failed to create session", resp.status);
    }

    return json({ session_id: data.id });
  } catch (e) {
    console.error("Error:", e);
    return err(e instanceof Error ? e.message : String(e), 500);
  }
});
