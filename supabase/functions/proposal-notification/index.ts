import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const JAMIE_EMAIL = "jamiek@smaiadvisors.com";
const FROM_EMAIL = "notifications@mail.smaiadvisors.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { deal_id } = await req.json();
    if (!deal_id) {
      return new Response(
        JSON.stringify({ error: "deal_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: deal, error: dealError } = await supabase
      .from("sales_deals")
      .select(
        `
        *,
        companies:company_id (id, name),
        contacts:contact_id (id, first_name, last_name, title, email, phone)
      `
      )
      .eq("id", deal_id)
      .single();

    if (dealError || !deal) {
      throw new Error(`Deal not found: ${dealError?.message || "No data"}`);
    }

    const { data: transcripts } = await supabase
      .from("deal_transcripts")
      .select("*")
      .eq("deal_id", deal_id)
      .order("created_at", { ascending: false })
      .limit(1);

    const transcript =
      transcripts && transcripts.length > 0 ? transcripts[0] : null;

    const claudeApiKey = Deno.env.get("CLAUDE_API_KEY");
    if (!claudeApiKey) {
      throw new Error("CLAUDE_API_KEY not configured");
    }

    const companyName = deal.companies?.name || "the prospective client";
    const contactName = deal.contacts
      ? `${deal.contacts.first_name} ${deal.contacts.last_name}`
      : "the primary contact";
    const contactTitle = deal.contacts?.title || "";
    const contactEmail = deal.contacts?.email || "";
    const dealValue = deal.value
      ? `$${Number(deal.value).toLocaleString()}`
      : "TBD";

    const letterPrompt = `You are filling in SM Advisors' standard AI Enablement engagement letter template for a new prospective client. Do NOT rewrite or regenerate the legal terms -- they are standardized. Your job is to:

1. Fill in all placeholders with the correct deal information
2. Customize Attachment A based on what was discussed (which phases apply, fee amount)
3. Mark anything you're inferring or guessing with [REVIEW: reason]

PLACEHOLDERS TO FILL:
- <Date> = today's date
- <Addressee> = ${contactName}${contactTitle ? ", " + contactTitle : ""}
- <Address Address> = [REVIEW: Client address needed]
- <Client Name> and <Client> = ${companyName}

DEAL INFORMATION:
- Company: ${companyName}
- Contact: ${contactName}${contactTitle ? ", " + contactTitle : ""}
- Service Type: ${deal.title}
- Estimated Value: ${dealValue}
- Description: ${deal.description || "Not specified"}
- Notes: ${deal.notes || "None"}

${
      transcript
        ? `ORIGINAL TRANSCRIPT FROM CORY'S VOICE MEMO:\n${transcript.transcript_text}`
        : "No transcript available."
    }

INSTRUCTIONS:
- Return the COMPLETE filled-in engagement letter starting from the date line through the end of Attachment A
- Keep ALL standard legal language exactly as-is (Scope of Services intro, Acceptance of Formal Deliverables, Definition of Engagement Completion, Fees section, Contract Termination, Miscellaneous, Acceptance block, and all SM Advisors Engagement Terms)
- For Attachment A: Based on the transcript and deal info, determine which of the 8 phases are relevant. Include only the phases discussed or implied. If unclear, include Phases 0-2 as a starting point and mark with [REVIEW: confirm which phases apply]
- For the fee in Attachment A: Use the deal value if provided. If the deal seems like a Phase 0 only, set Phase 0 fee to the deal value. If multi-phase, set Phase 0 at $10,000 and note the remaining phases fee as [REVIEW: confirm fee for Phases 1-7 based on scope]
- Do NOT include the SM Advisors Engagement Terms section in your output (that lengthy legal section from "SM Advisors wants Client to understand..." through the end). Jamie will append that separately since it never changes.
- Return clean text, no markdown formatting`;

    const claudeResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [{ role: "user", content: letterPrompt }],
        }),
      }
    );

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(
        `Claude API error: ${claudeResponse.status} - ${errorText}`
      );
    }

    const claudeData = await claudeResponse.json();
    const engagementLetter = claudeData.content[0].text;

    const dealSummaryHtml = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0;">New Proposal: ${escapeHtml(deal.title)}</h1>
    <p style="margin: 8px 0 0;">Created ${new Date().toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    )}</p>
  </div>

  <div style="border: 1px solid #e5e7eb; padding: 20px;">
    <h2>Deal Summary</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Company</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(
        companyName
      )}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Contact</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(
        contactName
      )}${contactTitle ? ` (${escapeHtml(contactTitle)})` : ""}${
      contactEmail ? ` - ${escapeHtml(contactEmail)}` : ""
    }</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Engagement</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(
        deal.title
      )}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Estimated Value</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${dealValue}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Probability</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${
        deal.probability || 60
      }%</td></tr>
      ${
        deal.description
          ? `<tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Description</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(
              deal.description
            )}</td></tr>`
          : ""
      }
      ${
        deal.notes
          ? `<tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Key Notes</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(
              deal.notes
            )}</td></tr>`
          : ""
      }
    </table>
  </div>

  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px;">
    <h2>Draft Engagement Letter</h2>
    <pre style="white-space: pre-wrap; font-family: Georgia, serif; line-height: 1.6; background: #f9fafb; padding: 20px; border-radius: 4px;">${escapeHtml(
      engagementLetter
    )}</pre>
    <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 4px; margin-top: 12px;">
      <strong>Note:</strong> Sections marked with [REVIEW: ...] need your attention before sending to the client.
    </div>
  </div>

  ${
    transcript
      ? `
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px;">
    <h2>Cory's Original Transcript</h2>
    <p style="color: #6b7280;">${escapeHtml(
      transcript.transcript_title || "Voice Memo"
    )} | ${escapeHtml(transcript.transcript_duration || "Duration unknown")}${
          transcript.source_url
            ? ` | <a href="${escapeHtml(
                transcript.source_url
              )}">View in Otter</a>`
            : ""
        }</p>
    <pre style="white-space: pre-wrap; background: #f9fafb; padding: 16px; border-radius: 4px; font-size: 14px;">${escapeHtml(
      transcript.transcript_text
    )}</pre>
  </div>
  `
      : `
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; color: #6b7280;">
    <p>No transcript attached to this deal. The engagement letter was generated from deal information only.</p>
  </div>
  `
  }

  <div style="text-align: center; padding: 16px; color: #9ca3af; font-size: 12px;">
    SM Advisors CRM | Automated notification
  </div>
</body>
</html>`;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [JAMIE_EMAIL],
        subject: `New Proposal: ${deal.title}`,
        html: dealSummaryHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(
        `Resend API error: ${emailResponse.status} - ${errorText}`
      );
    }

    const emailResult = await emailResponse.json();

    await supabase
      .from("deal_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq("deal_id", deal_id)
      .eq("event_type", "proposal_entered")
      .eq("processed", false);

    return new Response(
      JSON.stringify({
        success: true,
        deal_id,
        email_id: emailResult.id,
        message: `Notification sent to ${JAMIE_EMAIL}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending proposal notification:", error);

    try {
      const { deal_id } = await req.clone().json();
      if (deal_id) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase
          .from("deal_events")
          .update({ error_message: (error as Error).message })
          .eq("deal_id", deal_id)
          .eq("event_type", "proposal_entered")
          .eq("processed", false);
      }
    } catch {
      // Ignore logging errors
    }

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
