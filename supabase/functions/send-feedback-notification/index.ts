import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FeedbackPayload {
  occasion: string;
  email?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { occasion, email }: FeedbackPayload = await req.json();

    if (
      !occasion ||
      typeof occasion !== "string" ||
      occasion.trim().length === 0 ||
      occasion.trim().length > 200
    ) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid occasion value" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (email && (typeof email !== "string" || email.trim().length > 100)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email value" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const notificationEmail = Deno.env.get("NOTIFICATION_EMAIL");

    if (!resendApiKey || !notificationEmail) {
      return new Response(
        JSON.stringify({ success: true, emailSent: false }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const safeOccasion = escapeHtml(occasion.trim());
    const safeEmail = email ? escapeHtml(email.trim()) : null;

    const emailBody = {
      from: "Occasion Feedback <onboarding@resend.dev>",
      to: [notificationEmail],
      subject: `New Occasion Suggestion`,
      html: `
        <h2>New Occasion Feedback</h2>
        <p><strong>Suggested Occasion:</strong> ${safeOccasion}</p>
        ${safeEmail ? `<p><strong>User Email:</strong> ${safeEmail}</p>` : "<p><em>No email provided</em></p>"}
        <p><strong>Submitted at:</strong> ${new Date().toISOString()}</p>
      `,
    };

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(emailBody),
    });

    if (!resendResponse.ok) {
      console.error("Failed to send email");
      return new Response(
        JSON.stringify({ success: true, emailSent: false }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, emailSent: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
