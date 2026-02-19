import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SERPAPI_KEY = "b0fefa497aabd408066e3eea994a5f30b80daf942e491415c255c95b98a43584";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { query, page = 1 } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams({
      engine: "amazon",
      k: query,
      api_key: SERPAPI_KEY,
    });

    if (page > 1) {
      params.set("page", String(page));
    }

    const serpUrl = `https://serpapi.com/search.json?${params.toString()}`;
    const serpResponse = await fetch(serpUrl);

    if (!serpResponse.ok) {
      const errText = await serpResponse.text();
      return new Response(JSON.stringify({ error: "SerpApi error", detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serpData = await serpResponse.json();

    if (serpData.error) {
      return new Response(JSON.stringify({ error: serpData.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = (serpData.organic_results || []).map((item: any) => ({
      asin: item.asin || "",
      title: item.title || "",
      brand: item.brand || "",
      price: item.price?.value ?? item.extracted_price ?? null,
      currency: item.price?.currency ?? "USD",
      image: item.thumbnail || item.image || "",
      rating: item.rating ?? null,
      reviews_count: item.reviews ?? item.reviews_count ?? null,
      url: item.link || (item.asin ? `https://www.amazon.com/dp/${item.asin}` : ""),
      is_prime: item.is_prime ?? false,
      delivery: item.delivery ?? "",
    }));

    return new Response(
      JSON.stringify({
        results,
        total: serpData.search_information?.total_results ?? results.length,
        page,
        query,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
