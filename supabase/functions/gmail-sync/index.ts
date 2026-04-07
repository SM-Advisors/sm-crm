import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
  const authHeader = req.headers.get("x-webhook-secret");
  const webhookSecret = Deno.env.get("N8N_WEBHOOK_SECRET");
  if (webhookSecret && authHeader !== webhookSecret) {
    return err("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const action = segments[segments.length - 1];

  const sb = supabaseAdmin();
  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return err("Invalid JSON body");
  }

  try {
    switch (action) {
      // ── mark-sync-status ──
      // Used at start (in_progress), end (success), and on error
      case "mark-sync-status": {
        const status = body.status as string;
        if (!status) return err("status required");

        const upsertData: Record<string, unknown> = {
          service: "gmail",
          last_sync_status: status,
          updated_at: new Date().toISOString(),
        };

        if (status === "success") {
          upsertData.last_sync_at = new Date().toISOString();
          upsertData.records_synced = body.records_synced ?? 0;
          upsertData.error_message = null;
        }

        if (status === "error") {
          upsertData.error_message = body.error_message ?? "Unknown error";
        }

        const { error } = await sb
          .from("sync_status")
          .upsert(upsertData as never, { onConflict: "service" });
        if (error) return err(error.message, 500);
        return json({ success: true });
      }

      // ── get-last-sync ──
      // Returns the last sync timestamp so n8n knows how far back to fetch
      case "get-last-sync": {
        const { data, error } = await sb
          .from("sync_status")
          .select("last_sync_at")
          .eq("service", "gmail")
          .single();
        if (error) return err(error.message, 500);

        const lastSyncAt =
          data?.last_sync_at ??
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        return json({ last_sync_at: lastSyncAt });
      }

      // ── lookup-contact ──
      // Matches a counterparty email to a CRM contact
      case "lookup-contact": {
        const email = (body.email as string)?.trim().toLowerCase();
        if (!email) return err("email required");

        const { data, error } = await sb
          .from("contacts")
          .select("id, company_id")
          .ilike("email", email)
          .limit(1)
          .maybeSingle();
        if (error) return err(error.message, 500);

        if (!data) return json({ found: false });
        return json({ found: true, contact_id: data.id, company_id: data.company_id });
      }

      // ── upsert-interaction ──
      // Writes a single email interaction, deduped on external_id
      case "upsert-interaction": {
        const required = ["contact_id", "type", "occurred_at", "external_id"];
        for (const field of required) {
          if (!body[field]) return err(`${field} required`);
        }

        const row = {
          contact_id: body.contact_id,
          company_id: body.company_id || null,
          type: body.type,
          subject: body.subject || null,
          summary: body.summary || null,
          occurred_at: body.occurred_at,
          source: "gmail",
          external_id: body.external_id,
        };

        const { data, error } = await sb
          .from("interactions")
          .upsert(row as never, { onConflict: "external_id" })
          .select()
          .single();
        if (error) return err(error.message, 500);
        return json({ success: true, interaction: data });
      }

      // ── bulk-upsert-interactions ──
      // Writes multiple interactions in one call (more efficient for large syncs)
      case "bulk-upsert-interactions": {
        const interactions = body.interactions as Record<string, unknown>[];
        if (!interactions || !Array.isArray(interactions)) {
          return err("interactions array required");
        }

        const rows = interactions.map((i) => ({
          contact_id: i.contact_id,
          company_id: i.company_id || null,
          type: i.type,
          subject: i.subject || null,
          summary: i.summary || null,
          occurred_at: i.occurred_at,
          source: "gmail",
          external_id: i.external_id,
        }));

        const { error } = await sb
          .from("interactions")
          .upsert(rows as never, { onConflict: "external_id" });
        if (error) return err(error.message, 500);
        return json({ success: true, count: rows.length });
      }

      default:
        return err("Unknown action: " + action, 404);
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 500);
  }
});
