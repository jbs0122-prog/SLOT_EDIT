import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SERPAPI_KEY =
  "b0fefa497aabd408066e3eea994a5f30b80daf942e491415c255c95b98a43584";

interface LensProduct {
  position: number;
  title: string;
  link: string;
  source: string;
  source_icon?: string;
  price?: { value: string; extracted_value: number; currency: string };
  rating?: number;
  reviews?: number;
  in_stock?: boolean;
  thumbnail: string;
  image?: string;
}

interface VisualMatch {
  title: string;
  source: string;
  link: string;
  price: string | null;
  image: string;
  is_amazon: boolean;
}

interface AmazonResult {
  asin: string;
  title: string;
  brand: string;
  price: number | null;
  currency: string;
  image: string;
  rating: number | null;
  reviews_count: number | null;
  url: string;
  is_prime: boolean;
  source: "lens" | "keyword" | "visual_title";
  category?: string;
}

interface CategoryKeywords {
  category: string;
  keywords: string[];
}

function extractAsin(url: string): string | null {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/,
    /\/gp\/product\/([A-Z0-9]{10})/,
    /\/ASIN\/([A-Z0-9]{10})/,
    /[?&]asin=([A-Z0-9]{10})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function upgradeImageResolution(url: string): string {
  if (!url) return url;
  return url.replace(/_AC_U[A-Z0-9]+_\./g, "_AC_SL1500_.");
}

function extractSearchableTitle(title: string): string {
  return title
    .replace(/\b(from|by|on|at|in|for|the|a|an)\b/gi, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 6)
    .join(" ");
}

interface VisualSearchResult {
  amazonResults: AmazonResult[];
  allMatches: VisualMatch[];
  nonAmazonTopTitles: string[];
}

async function searchViaVisual(imageUrl: string): Promise<VisualSearchResult> {
  const params = new URLSearchParams({
    engine: "google_lens",
    url: imageUrl,
    type: "products",
    hl: "en",
    country: "us",
    api_key: SERPAPI_KEY,
  });

  const res = await fetch(
    `https://serpapi.com/search.json?${params.toString()}`
  );
  const data = await res.json();

  if (!res.ok || data.error) {
    const errMsg =
      typeof data.error === "string"
        ? data.error
        : JSON.stringify(data.error || data);
    throw new Error(errMsg);
  }

  const visualMatches: LensProduct[] = data.visual_matches || [];

  const amazonResults: AmazonResult[] = [];
  const allMatches: VisualMatch[] = [];
  const nonAmazonTopTitles: string[] = [];

  for (const item of visualMatches) {
    if (!item.link) continue;

    const isAmazon =
      item.link.includes("amazon.com") ||
      item.source?.toLowerCase().includes("amazon");

    allMatches.push({
      title: item.title || "",
      source: item.source || "",
      link: item.link,
      price: item.price?.value ?? null,
      image: item.image || item.thumbnail || "",
      is_amazon: isAmazon,
    });

    if (isAmazon) {
      const asin = extractAsin(item.link);
      if (!asin) continue;

      amazonResults.push({
        asin,
        title: item.title || "",
        brand: "",
        price: item.price?.extracted_value ?? null,
        currency: item.price?.currency || "USD",
        image: upgradeImageResolution(item.image || item.thumbnail || ""),
        rating: item.rating ?? null,
        reviews_count: item.reviews ?? null,
        url: item.link,
        is_prime: false,
        source: "lens",
      });
    } else if (item.title && nonAmazonTopTitles.length < 3) {
      const cleaned = extractSearchableTitle(item.title);
      if (cleaned.split(" ").length >= 2) {
        nonAmazonTopTitles.push(cleaned);
      }
    }
  }

  return { amazonResults, allMatches, nonAmazonTopTitles };
}

async function searchViaKeyword(
  query: string,
  page = 1,
  category?: string,
  sourceTag: "keyword" | "visual_title" = "keyword"
): Promise<AmazonResult[]> {
  const params = new URLSearchParams({
    engine: "amazon",
    k: query,
    i: "fashion",
    api_key: SERPAPI_KEY,
  });
  if (page > 1) params.set("page", String(page));

  const res = await fetch(
    `https://serpapi.com/search.json?${params.toString()}`
  );
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error || `Amazon Search API HTTP ${res.status}`);
  }

  return (data.organic_results || []).map((item: any) => ({
    asin: item.asin || "",
    title: item.title || "",
    brand: item.brand || "",
    price: item.extracted_price ?? item.price?.value ?? null,
    currency: item.price?.currency ?? "USD",
    image: upgradeImageResolution(item.thumbnail || item.image || ""),
    rating: item.rating ?? null,
    reviews_count: item.reviews ?? item.reviews_count ?? null,
    url:
      item.link ||
      (item.asin ? `https://www.amazon.com/dp/${item.asin}` : ""),
    is_prime: item.is_prime ?? item.prime ?? false,
    source: sourceTag,
    category,
  }));
}

async function generateCategoryKeywordsViaGemini(
  imageUrl: string,
  gender: string,
  bodyType: string,
  vibe: string,
  season: string
): Promise<CategoryKeywords[]> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

  const genderLabel =
    gender === "MALE" ? "men" : gender === "FEMALE" ? "women" : "unisex";
  const vibeLabel = vibe ? vibe.replace(/_/g, " ").toLowerCase() : "";
  const seasonLabel = season || "all season";

  const prompt = `You are a fashion product search expert analyzing a fashion outfit image.

Image URL: ${imageUrl}

Context:
- Gender: ${genderLabel}
- Body type: ${bodyType || "regular"}
- Style vibe: ${vibeLabel || "general"}
- Season: ${seasonLabel}

TASK: Identify ALL visible clothing/accessory items in the outfit image and generate Amazon search keywords for each one.

Categories to look for: outer (jacket/coat/blazer), mid (sweater/cardigan/hoodie), top (shirt/tshirt/blouse), bottom (pants/jeans/skirt), shoes (sneakers/boots/loafers), bag (tote/backpack/crossbody), accessory (watch/belt/hat/scarf)

For each visible item, generate 2 specific Amazon search keywords (4-6 words each) that describe the exact item's style, color, and material.

Return ONLY a JSON array. Example for an outfit with jacket + jeans + sneakers:
[
  {"category": "outer", "keywords": ["men black leather biker jacket", "men slim leather moto jacket"]},
  {"category": "bottom", "keywords": ["men slim dark wash denim jeans", "men skinny black jeans"]},
  {"category": "shoes", "keywords": ["men white leather low top sneakers", "men minimalist white sneakers"]}
]

Only include categories that are clearly visible in the image. Return only the JSON array, nothing else.`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    throw new Error(`Gemini API error: ${errText.slice(0, 200)}`);
  }

  const geminiData = await geminiRes.json();
  const rawText =
    geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const arrMatch = rawText.match(/\[[\s\S]*\]/);
  if (!arrMatch) return [];

  try {
    const arr = JSON.parse(arrMatch[0]);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (item: any) =>
        item &&
        typeof item.category === "string" &&
        Array.isArray(item.keywords)
    );
  } catch {
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      action,
      image_url,
      keyword,
      gender,
      body_type,
      vibe,
      season,
      page,
      category,
    } = body;

    if (action === "visual_search") {
      if (!image_url) {
        return new Response(
          JSON.stringify({ error: "image_url is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        const { amazonResults, allMatches } = await searchViaVisual(image_url);

        return new Response(
          JSON.stringify({
            method: "visual",
            amazon_results: amazonResults,
            all_visual_matches: allMatches.length,
            amazon_match_count: amazonResults.length,
            visual_matches_preview: allMatches.slice(0, 10),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            method: "visual",
            amazon_results: [],
            all_visual_matches: 0,
            amazon_match_count: 0,
            visual_matches_preview: [],
            error: (err as Error).message,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (action === "keyword_search") {
      if (!keyword) {
        return new Response(
          JSON.stringify({ error: "keyword is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const results = await searchViaKeyword(keyword, page || 1, category);
      return new Response(
        JSON.stringify({
          method: "keyword",
          results,
          total: results.length,
          keyword,
          page: page || 1,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate_category_keywords") {
      if (!image_url) {
        return new Response(
          JSON.stringify({ error: "image_url is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const categoryKeywords = await generateCategoryKeywordsViaGemini(
        image_url,
        gender || "UNISEX",
        body_type || "regular",
        vibe || "",
        season || ""
      );

      return new Response(
        JSON.stringify({ category_keywords: categoryKeywords }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "smart_search") {
      if (!image_url) {
        return new Response(
          JSON.stringify({ error: "image_url is required for smart search" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Step 1: Visual (Google Lens) search
      let lensAmazonResults: AmazonResult[] = [];
      let visualError: string | null = null;
      let allVisualMatches: VisualMatch[] = [];
      let nonAmazonTitles: string[] = [];

      try {
        const visualData = await searchViaVisual(image_url);
        lensAmazonResults = visualData.amazonResults;
        allVisualMatches = visualData.allMatches;
        nonAmazonTitles = visualData.nonAmazonTopTitles;
      } catch (err) {
        visualError = (err as Error).message;
      }

      // Step 2: If Lens found matches but no Amazon results, use top visual titles as Amazon search keywords
      let visualTitleResults: AmazonResult[] = [];
      let visualTitleKeywords: string[] = [];

      if (
        lensAmazonResults.length === 0 &&
        nonAmazonTitles.length > 0
      ) {
        visualTitleKeywords = nonAmazonTitles;
        const titleSearchPromises = nonAmazonTitles.slice(0, 2).map(
          async (title) => {
            try {
              const results = await searchViaKeyword(
                title,
                1,
                undefined,
                "visual_title"
              );
              return results.slice(0, 5);
            } catch {
              return [];
            }
          }
        );
        const titleResults = await Promise.all(titleSearchPromises);
        visualTitleResults = titleResults.flat();
      }

      // Step 3: AI category keyword search — always run for multi-category coverage
      let categoryKeywordResults: AmazonResult[] = [];
      let usedCategoryKeywords: CategoryKeywords[] = [];
      let keywordError: string | null = null;

      try {
        const catKeywords = await generateCategoryKeywordsViaGemini(
          image_url,
          gender || "UNISEX",
          body_type || "regular",
          vibe || "",
          season || ""
        );
        usedCategoryKeywords = catKeywords;

        const searchPromises = catKeywords.slice(0, 5).map(async (ck) => {
          if (!ck.keywords[0]) return [];
          try {
            const kwResults = await searchViaKeyword(
              ck.keywords[0],
              1,
              ck.category
            );
            return kwResults.slice(0, 4);
          } catch {
            return [];
          }
        });

        const allKwResults = await Promise.all(searchPromises);
        categoryKeywordResults = allKwResults.flat();
      } catch (err) {
        keywordError = (err as Error).message;
      }

      // Merge & deduplicate: lens amazon > visual title amazon > AI keyword amazon
      const seenAsins = new Set<string>();
      const merged: AmazonResult[] = [];

      for (const r of lensAmazonResults) {
        if (r.asin && !seenAsins.has(r.asin)) {
          seenAsins.add(r.asin);
          merged.push(r);
        }
      }
      for (const r of visualTitleResults) {
        if (r.asin && !seenAsins.has(r.asin)) {
          seenAsins.add(r.asin);
          merged.push(r);
        }
      }
      for (const r of categoryKeywordResults) {
        if (r.asin && !seenAsins.has(r.asin)) {
          seenAsins.add(r.asin);
          merged.push(r);
        }
      }

      return new Response(
        JSON.stringify({
          method: "smart",
          results: merged,
          lens_amazon_count: lensAmazonResults.length,
          visual_title_count: visualTitleResults.length,
          keyword_count: categoryKeywordResults.length,
          total: merged.length,
          all_visual_matches: allVisualMatches.length,
          visual_matches_preview: allVisualMatches.slice(0, 8),
          visual_error: visualError,
          keyword_error: keywordError,
          category_keywords: usedCategoryKeywords,
          visual_title_keywords: visualTitleKeywords,
          fallback_used: lensAmazonResults.length < 3,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        error:
          "Invalid action. Use: visual_search, keyword_search, generate_category_keywords, or smart_search",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
