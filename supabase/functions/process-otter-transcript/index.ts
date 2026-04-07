import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OtterPayload {
  transcript_text: string;
  title?: string;
  duration?: string;
  date?: string;
  source_url?: string;
}

interface ExtractedDeal {
  is_deal: boolean;
  company_name: string | null;
  contact_name: string | null;
  contact_title: string | null;
  service_type: string | null;
  estimated_value: number | null;
  description: string | null;
  key_notes: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");

    if (webhookSecret) {
      const providedSecret = req.headers.get("x-webhook-secret");
      if (
        providedSecret !== webhookSecret &&
        !authHeader?.includes(
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
        )
      ) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload: OtterPayload = await req.json();

    if (!payload.transcript_text || payload.transcript_text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "transcript_text is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const claudeApiKey = Deno.env.get("CLAUDE_API_KEY");
    if (!claudeApiKey) {
      throw new Error("CLAUDE_API_KEY not configured");
    }

    const extractionPrompt = `You are analyzing a voice transcript from Cory Kunz, founder of SM Advisors, an AI enablement advisory firm. He records voice memos and flags deal-related ones by saying "engagement letter" somewhere in the recording. This transcript has already been filtered to only include ones containing that phrase.

Analyze the transcript and extract deal information. Even though this was flagged as deal-related, verify it actually describes a prospective client engagement. If the mention of "engagement letter" was incidental or the transcript isn't actually about a specific deal, return {"is_deal": false} and nothing else.

If it IS about a prospective engagement, extract:
- company_name: The prospect company/organization name
- contact_name: The primary contact person's name
- contact_title: Their role/title if mentioned
- service_type: The type of engagement (e.g., "AI Enablement", "Board Training", "Speaking Engagement", "Fractional CAIO", "AI Strategy")
- estimated_value: Dollar amount if mentioned (number only, no $ sign), or null if not mentioned
- description: A 2-3 sentence summary of the engagement opportunity
- key_notes: Any specific pain points, concerns, timelines, or follow-up items mentioned

Return ONLY valid JSON, no markdown formatting, no code blocks.

TRANSCRIPT:
${payload.transcript_text}`;

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
          max_tokens: 1024,
          messages: [{ role: "user", content: extractionPrompt }],
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
    const extractedText = claudeData.content[0].text;

    let extracted: ExtractedDeal;
    try {
      extracted = JSON.parse(extractedText);
    } catch {
      throw new Error(
        `Failed to parse Claude response as JSON: ${extractedText}`
      );
    }

    if (!extracted.is_deal) {
      return new Response(
        JSON.stringify({
          success: true,
          is_deal: false,
          message:
            "Transcript is not about a prospective engagement. No deal created.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let companyId: string | null = null;
    if (extracted.company_name) {
      const { data: matchingCompanies } = await supabase
        .from("companies")
        .select("id, name")
        .ilike("name", `%${extracted.company_name}%`)
        .limit(5);

      if (matchingCompanies && matchingCompanies.length > 0) {
        companyId = matchingCompanies[0].id;
      } else {
        const { data: newCompany, error: companyError } = await supabase
          .from("companies")
          .insert({ name: extracted.company_name })
          .select("id")
          .single();

        if (companyError) {
          console.error("Error creating company:", companyError);
        } else {
          companyId = newCompany.id;
        }
      }
    }

    let contactId: string | null = null;
    if (extracted.contact_name) {
      const { data: matchingContacts } = await supabase
        .from("contacts")
        .select("id, first_name, last_name")
        .or(
          `first_name.ilike.%${extracted.contact_name.split(" ")[0]}%,` +
            `last_name.ilike.%${extracted.contact_name.split(" ").slice(-1)[0]}%`
        )
        .limit(5);

      if (matchingContacts && matchingContacts.length > 0) {
        contactId = matchingContacts[0].id;
      } else {
        const nameParts = extracted.contact_name.split(" ");
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || "";

        const { data: newContact, error: contactError } = await supabase
          .from("contacts")
          .insert({
            first_name: firstName,
            last_name: lastName,
            title: extracted.contact_title,
            company_id: companyId,
          })
          .select("id")
          .single();

        if (contactError) {
          console.error("Error creating contact:", contactError);
        } else {
          contactId = newContact.id;
        }
      }
    }

    const dealTitle = extracted.company_name
      ? `${extracted.company_name} - ${extracted.service_type || "AI Enablement"}`
      : payload.title || "New Deal from Voice Memo";

    const { data: newDeal, error: dealError } = await supabase
      .from("sales_deals")
      .insert({
        title: dealTitle,
        company_id: companyId,
        contact_id: contactId,
        stage: "proposal",
        value: extracted.estimated_value,
        probability: 60,
        description: extracted.description,
        notes: extracted.key_notes,
      })
      .select("id")
      .single();

    if (dealError) {
      throw new Error(`Failed to create deal: ${dealError.message}`);
    }

    const { error: transcriptError } = await supabase
      .from("deal_transcripts")
      .insert({
        deal_id: newDeal.id,
        transcript_text: payload.transcript_text,
        transcript_title: payload.title,
        transcript_duration: payload.duration,
        transcript_date: payload.date
          ? new Date(payload.date).toISOString()
          : new Date().toISOString(),
        source_url: payload.source_url,
      });

    if (transcriptError) {
      console.error("Error storing transcript:", transcriptError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        is_deal: true,
        deal_id: newDeal.id,
        deal_title: dealTitle,
        company_id: companyId,
        contact_id: contactId,
        message: `Deal "${dealTitle}" created in Proposal stage.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing transcript:", error);
    return new Response(
      JSON.stringify({
        error: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
