import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "GEMINI_API_KEY is not configured in Edge Function secrets",
          instructions: [
            "1. Go to Supabase Dashboard",
            "2. Navigate to Edge Functions → Secrets",
            "3. Add secret: GEMINI_API_KEY = your_api_key",
            "4. Get your API key from: https://aistudio.google.com/apikey"
          ]
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const keyPreview = `${GEMINI_API_KEY.substring(0, 10)}...${GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 4)}`;

    const testResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: "Hello, this is a test. Please respond with 'API key is working'." }
              ],
            },
          ],
        }),
      }
    );

    const responseData = await testResponse.json();

    if (!testResponse.ok) {
      let errorMessage = "Unknown error";
      let billingIssue = false;

      if (responseData.error) {
        errorMessage = responseData.error.message || JSON.stringify(responseData.error);

        if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Invalid API Key",
              details: errorMessage,
              apiKeyPreview: keyPreview,
              instructions: [
                "Your API key is invalid or has been revoked.",
                "1. Go to: https://aistudio.google.com/apikey",
                "2. Create a new API key",
                "3. Update it in Supabase Edge Functions Secrets"
              ]
            }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        if (errorMessage.includes("billing") ||
            errorMessage.includes("quota") ||
            errorMessage.includes("RESOURCE_EXHAUSTED") ||
            errorMessage.includes("exceeded")) {
          billingIssue = true;
          return new Response(
            JSON.stringify({
              success: false,
              error: "Billing or Quota Issue",
              details: errorMessage,
              apiKeyPreview: keyPreview,
              instructions: [
                "Your API key has billing or quota issues:",
                "1. Check if you've enabled billing: https://console.cloud.google.com/billing",
                "2. Verify your quota limits: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas",
                "3. Free tier limits: 15 requests per minute, 1500 requests per day",
                "4. You may need to upgrade to a paid plan for higher limits"
              ]
            }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        if (errorMessage.includes("not found") || errorMessage.includes("NOT_FOUND")) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Model Not Found",
              details: errorMessage,
              instructions: [
                "The model 'gemini-2.5-flash-image' might not be available yet or your API key doesn't have access.",
                "Try one of these alternatives:",
                "- gemini-1.5-flash (standard model)",
                "- gemini-1.5-pro (more capable)",
                "Check available models at: https://ai.google.dev/models"
              ]
            }),
            {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: "API Request Failed",
          status: testResponse.status,
          details: errorMessage,
          apiKeyPreview: keyPreview,
          fullResponse: responseData
        }),
        {
          status: testResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "GEMINI_API_KEY is configured correctly and working!",
        apiKeyPreview: keyPreview,
        testResponse: responseData.candidates?.[0]?.content?.parts?.[0]?.text || "Model responded successfully",
        model: "gemini-2.5-flash-image",
        billingStatus: "Active (no issues detected)"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in test-gemini-key:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
