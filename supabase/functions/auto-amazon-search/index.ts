import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SERPAPI_KEY = "b0fefa497aabd408066e3eea994a5f30b80daf942e491415c255c95b98a43584";

const upgradeImageResolution = (url: string): string => {
  if (!url) return url;
  return url
    .replace(/_AC_U[A-Z0-9]+_\./g, "_AC_SL1500_.")
    .replace(/_AC_SR\d+,\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_SY\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_SX\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_UL\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_SS\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_AA\d+_\./g, "_AC_SL1500_.")
    .replace(/\._[A-Z0-9,_]+_\./g, "._AC_SL1500_.");
};

interface QualityFilter {
  minRating: number;
  minReviews: number;
  maxPriceUsd?: number;
  minPriceUsd?: number;
}

const DEFAULT_FILTER: QualityFilter = {
  minRating: 4.0,
  minReviews: 10,
  minPriceUsd: 5,
  maxPriceUsd: 500,
};

function passesQualityFilter(item: any, filter: QualityFilter): boolean {
  const rating = item.rating ?? 0;
  const reviews = item.reviews ?? item.reviews_count ?? 0;
  const price = item.extracted_price ?? item.price?.value ?? null;

  if (rating > 0 && rating < filter.minRating) return false;
  if (reviews > 0 && reviews < filter.minReviews) return false;
  if (price !== null && filter.minPriceUsd && price < filter.minPriceUsd) return false;
  if (price !== null && filter.maxPriceUsd && price > filter.maxPriceUsd) return false;

  const title = (item.title || "").toLowerCase();
  const EXCLUDE_TERMS = [
    "costume", "cosplay", "halloween", "party dress-up",
    "phone case", "sticker", "poster", "keychain", "patch",
    "dog", "pet", "cat", "infant", "toddler", "baby",
    "set of", "pack of", "10 pcs", "5 pcs", "bulk",
  ];
  if (EXCLUDE_TERMS.some(term => title.includes(term))) return false;

  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { query, page = 1, filter: customFilter } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filter: QualityFilter = { ...DEFAULT_FILTER, ...customFilter };

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
        JSON.stringify({ error: serpData.error || `SerpApi HTTP ${serpResponse.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawResults = (serpData.organic_results || []).map((item: any) => ({
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
    }));

    const filteredResults = rawResults.filter((item: any) =>
      passesQualityFilter(item, filter)
    );

    return new Response(
      JSON.stringify({
        results: filteredResults,
        total_raw: rawResults.length,
        total_filtered: filteredResults.length,
        page,
        query,
        filter_applied: filter,
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
