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
      k: String(query),
      i: "fashion",
      api_key: SERPAPI_KEY,
    });

    if (page > 1) {
      params.set("page", String(page));
    }

    const serpUrl = `https://serpapi.com/search.json?${params.toString()}`;
    const serpResponse = await fetch(serpUrl);
    const responseText = await serpResponse.text();

    let serpData: any;
    try {
      serpData = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse SerpApi response", detail: responseText.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!serpResponse.ok || serpData.error) {
      return new Response(
        JSON.stringify({ error: serpData.error || `SerpApi HTTP ${serpResponse.status}`, detail: serpData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const upgradeImageResolution = (url: string): string => {
      if (!url) return url;
      return url
        .replace(/_AC_U[A-Z0-9]+_\./g, "_AC_SL1500_.")
        .replace(/_AC_SR\d+,\d+_\./g, "_AC_SL1500_.")
        .replace(/_AC_SY\d+_\./g, "_AC_SL1500_.")
        .replace(/_AC_SX\d+_\./g, "_AC_SL1500_.")
        .replace(/_AC_UL\d+_\./g, "_AC_SL1500_.");
    };

    const results = (serpData.organic_results || []).map((item: any) => ({
      asin: item.asin || "",
      title: item.title || "",
      brand: item.brand || "",
      price: item.extracted_price ?? item.price?.value ?? null,
      currency: item.price?.currency ?? "USD",
      image: upgradeImageResolution(item.thumbnail || item.image || ""),
      rating: item.rating ?? null,
      reviews_count: item.reviews ?? item.reviews_count ?? null,
      url: item.link || (item.asin ? `https://www.amazon.com/dp/${item.asin}` : ""),
      is_prime: item.is_prime ?? item.prime ?? false,
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
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
