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

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return err("Method not allowed", 405);
  }

  // Verify shared secret
  const agentSecret = req.headers.get("x-agent-secret");
  const expectedSecret = Deno.env.get("AGENT_API_SECRET");
  if (!expectedSecret || !agentSecret || agentSecret !== expectedSecret) {
    return err("Unauthorized", 401);
  }

  const sb = supabaseAdmin();
  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return err("Invalid JSON body");
  }

  try {
    const lastActivityBefore = body.last_activity_before as string | undefined;
    const companyId = body.company_id as string | undefined;
    const limit = Math.min(Math.max(parseInt(String(body.limit ?? 50), 10) || 50, 1), 500);

    // Build query — fetch contacts with company name
    let query = sb
      .from("contacts")
      .select("id, first_name, last_name, email, company_id, last_contacted_at, company:companies(name)")
      .order("last_name", { ascending: true })
      .limit(limit);

    // Filter by company
    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    // Filter by last activity before date
    if (lastActivityBefore) {
      query = query.or(
        `last_contacted_at.is.null,last_contacted_at.lt.${lastActivityBefore}`
      );
    }

    const { data: contacts, error: contactsErr } = await query;
    if (contactsErr) return err(contactsErr.message, 500);
    if (!contacts || contacts.length === 0) return json([]);

    // Fetch pipeline stage for each contact's most recent open deal
    const contactIds = contacts.map((c) => c.id);
    const { data: deals } = await sb
      .from("sales_deals")
      .select("contact_id, stage")
      .in("contact_id", contactIds)
      .not("stage", "in", '("closed_lost","service_complete")')
      .order("updated_at", { ascending: false });

    // Build a map of contact_id -> most recent open deal stage
    const stageMap: Record<string, string> = {};
    if (deals) {
      for (const d of deals) {
        if (d.contact_id && !stageMap[d.contact_id]) {
          stageMap[d.contact_id] = d.stage;
        }
      }
    }

    // Shape response
    const result = contacts.map((c) => ({
      id: c.id,
      full_name: [c.first_name, c.last_name].filter(Boolean).join(" "),
      email: c.email ?? null,
      company_name: (c.company as { name: string } | null)?.name ?? null,
      last_activity_at: c.last_contacted_at ?? null,
      pipeline_stage: stageMap[c.id] ?? null,
    }));

    return json(result);
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 500);
  }
});
