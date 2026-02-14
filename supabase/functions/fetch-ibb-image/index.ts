import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_DOMAINS = [
  "i.ibb.co",
  "ibb.co",
  "image.ibb.co",
  "preview.ibb.co",
];

function isAllowedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (supabaseUrl) {
      const supabaseHost = new URL(supabaseUrl).hostname;
      if (parsed.hostname === supabaseHost) return true;
    }

    return ALLOWED_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`)
    );
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get("url");

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "URL parameter is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!isAllowedImageUrl(imageUrl)) {
      return new Response(
        JSON.stringify({ error: "URL domain not allowed" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch image" }),
        {
          status: imageResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const contentType =
      imageResponse.headers.get("content-type") || "image/jpeg";

    if (!contentType.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "URL does not point to an image" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const imageBlob = await imageResponse.blob();

    return new Response(imageBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to proxy image" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
