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
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If it's already a direct image URL, return it
    if (url.includes('i.ibb.co') || url.includes('i.postimg.cc') || url.includes('images.pexels.com')) {
      return new Response(
        JSON.stringify({ imageUrl: url }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch the ibb.co page
    const response = await fetch(url);
    const html = await response.text();

    // Extract the direct image URL from the page
    // ibb.co puts the direct image URL in meta tags
    const ogImageRegex = new RegExp('<meta property="og:image" content="([^"]+)"');
    const ogImageMatch = html.match(ogImageRegex);

    if (ogImageMatch && ogImageMatch[1]) {
      return new Response(
        JSON.stringify({ imageUrl: ogImageMatch[1] }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Try to find image in the page
    const imgRegex = new RegExp('<img[^>]+src="(https://i\\.ibb\\.co/[^"]+)"');
    const imgMatch = html.match(imgRegex);

    if (imgMatch && imgMatch[1]) {
      return new Response(
        JSON.stringify({ imageUrl: imgMatch[1] }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Could not extract image URL", originalUrl: url }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});