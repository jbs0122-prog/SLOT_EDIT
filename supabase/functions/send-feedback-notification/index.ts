import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FeedbackPayload {
  occasion: string;
  email?: string;
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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const notificationEmail = Deno.env.get("NOTIFICATION_EMAIL");

    if (!resendApiKey || !notificationEmail) {
      console.log("Email notification not configured");
      return new Response(
        JSON.stringify({ success: true, emailSent: false }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const emailBody = {
      from: "Occasion Feedback <onboarding@resend.dev>",
      to: [notificationEmail],
      subject: `New Occasion Suggestion: ${occasion}`,
      html: `
        <h2>New Occasion Feedback</h2>
        <p><strong>Suggested Occasion:</strong> ${occasion}</p>
        ${email ? `<p><strong>User Email:</strong> ${email}</p>` : "<p><em>No email provided</em></p>"}
        <p><strong>Submitted at:</strong> ${new Date().toLocaleString()}</p>
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
      const error = await resendResponse.text();
      console.error("Failed to send email:", error);
      return new Response(
        JSON.stringify({ success: true, emailSent: false, error }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, emailSent: true }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing feedback:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
