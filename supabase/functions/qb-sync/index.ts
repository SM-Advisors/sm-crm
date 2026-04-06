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
  // Path: /qb-sync/<action>
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
      // ── acquire-invoice-lock ──
      case "acquire-invoice-lock": {
        const { data, error } = await sb.rpc("acquire_invoice_lock");
        if (error) return err(error.message, 500);
        if (!data || (Array.isArray(data) && data.length === 0)) {
          return json({ locked: false, message: "Could not acquire lock" });
        }
        return json({ locked: true, ...(Array.isArray(data) ? data[0] : data) });
      }

      // ── release-invoice-lock ──
      case "release-invoice-lock": {
        const lastQbTime = body.last_qb_updated_time as string | undefined;
        const { error } = await sb
          .from("qb_sync_state")
          .update({
            is_running: false,
            last_sync_at: new Date().toISOString(),
            last_qb_updated_time: lastQbTime ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("sync_type", "invoice");
        if (error) return err(error.message, 500);
        return json({ success: true });
      }

      // ── release-invoice-lock-on-error ──
      case "release-invoice-lock-on-error": {
        const { error } = await sb
          .from("qb_sync_state")
          .update({ is_running: false })
          .eq("sync_type", "invoice");
        if (error) return err(error.message, 500);
        return json({ success: true });
      }

      // ── upsert-invoice ──
      case "upsert-invoice": {
        const inv = body as Record<string, unknown>;
        if (!inv.qb_invoice_id) return err("qb_invoice_id required");
        const { data, error } = await sb
          .from("invoices")
          .upsert(inv as never, { onConflict: "qb_invoice_id" })
          .select()
          .single();
        if (error) return err(error.message, 500);
        return json({ success: true, invoice: data });
      }

      // ── upsert-line-items ──
      case "upsert-line-items": {
        const qbInvoiceId = body.qb_invoice_id as string;
        const lineItems = body.line_items as Record<string, unknown>[];
        if (!qbInvoiceId || !lineItems) return err("qb_invoice_id and line_items required");

        // Find the invoice id
        const { data: inv, error: invErr } = await sb
          .from("invoices")
          .select("id")
          .eq("qb_invoice_id", qbInvoiceId)
          .single();
        if (invErr || !inv) return err("Invoice not found for qb_invoice_id: " + qbInvoiceId, 404);

        // Delete existing line items
        const { error: delErr } = await sb
          .from("invoice_line_items")
          .delete()
          .eq("invoice_id", inv.id);
        if (delErr) return err(delErr.message, 500);

        // Insert new ones
        const rows = lineItems.map((li) => ({ ...li, invoice_id: inv.id }));
        const { error: insErr } = await sb
          .from("invoice_line_items")
          .insert(rows as never);
        if (insErr) return err(insErr.message, 500);

        return json({ success: true, count: rows.length });
      }

      // ── lookup-customer-map ──
      case "lookup-customer-map": {
        const qbCustId = body.qb_customer_id as string;
        if (!qbCustId) return err("qb_customer_id required");
        const { data, error } = await sb
          .from("qb_customer_map")
          .select("contact_id, company_id")
          .eq("qb_customer_id", qbCustId)
          .maybeSingle();
        if (error) return err(error.message, 500);
        if (!data) return json({ found: false });
        return json({ found: true, ...data });
      }

      // ── match-customer-to-crm ──
      case "match-customer-to-crm": {
        const email = (body.email as string)?.trim().toLowerCase();
        const companyName = (body.company_name as string)?.trim();

        // Try email match first
        if (email) {
          const { data: contact } = await sb
            .from("contacts")
            .select("id, company_id")
            .ilike("email", email)
            .limit(1)
            .maybeSingle();
          if (contact) {
            return json({
              contact_id: contact.id,
              company_id: contact.company_id,
              match_method: "email",
              confidence: "high",
            });
          }
        }

        // Try company name match
        if (companyName) {
          const { data: company } = await sb
            .from("companies")
            .select("id")
            .ilike("name", companyName)
            .limit(1)
            .maybeSingle();
          if (company) {
            return json({
              contact_id: null,
              company_id: company.id,
              match_method: "company_name",
              confidence: "medium",
            });
          }
        }

        return json({
          contact_id: null,
          company_id: null,
          match_method: null,
          confidence: "none",
        });
      }

      // ── upsert-customer-map ──
      case "upsert-customer-map": {
        const map = body as Record<string, unknown>;
        if (!map.qb_customer_id) return err("qb_customer_id required");

        // Check if manual match exists — preserve it
        const { data: existing } = await sb
          .from("qb_customer_map")
          .select("match_method")
          .eq("qb_customer_id", map.qb_customer_id as string)
          .maybeSingle();

        if (existing?.match_method === "manual") {
          // Only update non-match fields
          const { error } = await sb
            .from("qb_customer_map")
            .update({
              qb_display_name: map.qb_display_name,
              qb_company_name: map.qb_company_name,
              qb_email: map.qb_email,
              updated_at: new Date().toISOString(),
            } as never)
            .eq("qb_customer_id", map.qb_customer_id as string);
          if (error) return err(error.message, 500);
          return json({ success: true, preserved_manual: true });
        }

        const { data, error } = await sb
          .from("qb_customer_map")
          .upsert(
            { ...map, updated_at: new Date().toISOString() } as never,
            { onConflict: "qb_customer_id" }
          )
          .select()
          .single();
        if (error) return err(error.message, 500);
        return json({ success: true, record: data });
      }

      // ── backfill-invoice-contacts ──
      case "backfill-invoice-contacts": {
        const { data, error } = await sb.rpc("backfill_invoice_contacts");
        if (error) return err(error.message, 500);
        return json({ success: true, updated: data });
      }

      // ── refresh-billing-summary ──
      case "refresh-billing-summary": {
        const { error } = await sb.rpc("refresh_billing_summary");
        if (error) return err(error.message, 500);
        return json({ success: true });
      }

      default:
        return err("Unknown action: " + action, 404);
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e), 500);
  }
});
