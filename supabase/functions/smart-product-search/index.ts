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
    .replace(
      /\b(from|by|on|at|in|for|the|a|an|with|and|or|of|to|is|it|this|that|these|those|www|com|net|org|shop|store|buy|sale|free|shipping|new|arrival|hot|best|seller)\b/gi,
      " "
    )
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 5)
    .join(" ");
}

interface VisualSearchResult {
  amazonResults: AmazonResult[];
  allMatches: VisualMatch[];
  nonAmazonTopTitles: string[];
}

async function searchViaVisual(
  imageUrl: string
): Promise<VisualSearchResult> {
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
    } else if (item.title && nonAmazonTopTitles.length < 5) {
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

async function fetchImageAsBase64(
  imageUrl: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!res.ok) return null;

    const contentType =
      res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const mimeType = contentType.split(";")[0].trim();
    return { base64, mimeType };
  } catch {
    return null;
  }
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

  const prompt = `You are a fashion product search expert. Analyze this outfit image very carefully.

Context:
- Target gender: ${genderLabel}
- Body type: ${bodyType || "regular"}
- Style vibe: ${vibeLabel || "general"}
- Season: ${seasonLabel}

TASK: Look at each clothing item in the image and generate PRECISE Amazon search keywords for each.

RULES:
1. Describe EXACTLY what you see - specific color (not just "dark" but "charcoal grey" or "navy blue"), specific material (cotton, denim, leather, wool), specific style (slim fit, relaxed, cropped, oversized)
2. Include the gender prefix (${genderLabel}) in each keyword
3. Generate 3 keywords per category - each from a different angle (style-focused, material-focused, brand-style-focused)
4. Keywords should be 4-7 words, like real Amazon searches

Categories: outer, mid, top, bottom, shoes, bag, accessory

Example output for a man wearing a grey wool overcoat, white oxford shirt, black slim chinos, and brown leather chelsea boots:
[
  {"category":"outer","keywords":["${genderLabel} grey wool overcoat classic","${genderLabel} charcoal long wool coat","${genderLabel} tailored grey topcoat winter"]},
  {"category":"top","keywords":["${genderLabel} white oxford button shirt","${genderLabel} white cotton dress shirt slim","${genderLabel} white formal button down shirt"]},
  {"category":"bottom","keywords":["${genderLabel} black slim fit chino pants","${genderLabel} black tapered cotton trousers","${genderLabel} slim black dress pants stretch"]},
  {"category":"shoes","keywords":["${genderLabel} brown leather chelsea boots","${genderLabel} tan suede chelsea ankle boots","${genderLabel} brown pull on leather boots"]}
]

Only include categories clearly visible. Return ONLY the JSON array.`;

  const imageData = await fetchImageAsBase64(imageUrl);

  const parts: any[] = [];
  if (imageData) {
    parts.push({
      inline_data: {
        mime_type: imageData.mimeType,
        data: imageData.base64,
      },
    });
  }
  parts.push({ text: prompt });

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
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
        const { amazonResults, allMatches } =
          await searchViaVisual(image_url);

        return new Response(
          JSON.stringify({
            method: "visual",
            amazon_results: amazonResults,
            all_visual_matches: allMatches.length,
            amazon_match_count: amazonResults.length,
            visual_matches_preview: allMatches.slice(0, 10),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
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
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
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
          JSON.stringify({
            error: "image_url is required for smart search",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Step 1: Visual (Google Lens) + AI category analysis in parallel
      let lensAmazonResults: AmazonResult[] = [];
      let visualError: string | null = null;
      let allVisualMatches: VisualMatch[] = [];
      let nonAmazonTitles: string[] = [];

      let usedCategoryKeywords: CategoryKeywords[] = [];
      let keywordError: string | null = null;

      const [visualResult, geminiResult] = await Promise.allSettled([
        searchViaVisual(image_url),
        generateCategoryKeywordsViaGemini(
          image_url,
          gender || "UNISEX",
          body_type || "regular",
          vibe || "",
          season || ""
        ),
      ]);

      if (visualResult.status === "fulfilled") {
        lensAmazonResults = visualResult.value.amazonResults;
        allVisualMatches = visualResult.value.allMatches;
        nonAmazonTitles = visualResult.value.nonAmazonTopTitles;
      } else {
        visualError = visualResult.reason?.message || "Visual search failed";
      }

      if (geminiResult.status === "fulfilled") {
        usedCategoryKeywords = geminiResult.value;
      } else {
        keywordError =
          geminiResult.reason?.message || "Gemini analysis failed";
      }

      // Step 2: If Lens found matches but no Amazon results, use top visual titles
      let visualTitleResults: AmazonResult[] = [];
      let visualTitleKeywords: string[] = [];

      if (lensAmazonResults.length === 0 && nonAmazonTitles.length > 0) {
        visualTitleKeywords = nonAmazonTitles.slice(0, 3);
        const titleSearchPromises = visualTitleKeywords.map(
          async (title) => {
            try {
              const results = await searchViaKeyword(
                title,
                1,
                undefined,
                "visual_title"
              );
              return results.slice(0, 4);
            } catch {
              return [];
            }
          }
        );
        const titleResults = await Promise.all(titleSearchPromises);
        visualTitleResults = titleResults.flat();
      }

      // Step 3: AI category keyword search — search all keywords (not just first)
      let categoryKeywordResults: AmazonResult[] = [];

      if (usedCategoryKeywords.length > 0) {
        const searchPromises = usedCategoryKeywords
          .slice(0, 5)
          .flatMap((ck) =>
            ck.keywords.slice(0, 2).map(async (kw) => {
              if (!kw) return [];
              try {
                const kwResults = await searchViaKeyword(
                  kw,
                  1,
                  ck.category
                );
                return kwResults.slice(0, 3);
              } catch {
                return [];
              }
            })
          );

        const allKwResults = await Promise.all(searchPromises);
        categoryKeywordResults = allKwResults.flat();
      }

      // Merge & deduplicate
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
