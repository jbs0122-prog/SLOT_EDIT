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
  source: "lens" | "keyword";
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

function cleanTitleForSearch(title: string): string {
  return title
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 8)
    .join(" ");
}

async function searchViaKeyword(
  query: string,
  page = 1,
  category?: string
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
    source: "keyword" as const,
    category,
  }));
}

async function searchViaVisual(imageUrl: string): Promise<{
  directAmazon: AmazonResult[];
  nonAmazonTitles: string[];
  failedAsinTitles: string[];
}> {
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
  const directAmazon: AmazonResult[] = [];
  const nonAmazonTitles: string[] = [];
  const failedAsinTitles: string[] = [];

  for (const item of visualMatches) {
    if (!item.link && !item.title) continue;

    const isAmazon =
      (item.link && item.link.includes("amazon.com")) ||
      item.source?.toLowerCase().includes("amazon");

    if (isAmazon && item.link) {
      const asin = extractAsin(item.link);
      if (asin) {
        directAmazon.push({
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
      } else if (item.title) {
        failedAsinTitles.push(item.title);
      }
    } else if (!isAmazon && item.title) {
      nonAmazonTitles.push(item.title);
    }
  }

  return { directAmazon, nonAmazonTitles, failedAsinTitles };
}

async function recoverLensResultsViaAmazonSearch(
  nonAmazonTitles: string[],
  failedAsinTitles: string[],
  seenAsins: Set<string>
): Promise<AmazonResult[]> {
  const MAX_NON_AMAZON = 5;
  const MAX_FAILED_ASIN = 3;

  const titlesToSearch = [
    ...nonAmazonTitles.slice(0, MAX_NON_AMAZON),
    ...failedAsinTitles.slice(0, MAX_FAILED_ASIN),
  ];

  if (titlesToSearch.length === 0) return [];

  const searchPromises = titlesToSearch.map(async (title) => {
    const cleaned = cleanTitleForSearch(title);
    if (!cleaned) return [];
    try {
      const results = await searchViaKeyword(cleaned, 1);
      return results.slice(0, 3).map((r) => ({ ...r, source: "lens" as const }));
    } catch {
      return [];
    }
  });

  const allResults = await Promise.all(searchPromises);
  const recovered: AmazonResult[] = [];

  for (const batch of allResults) {
    for (const r of batch) {
      if (r.asin && !seenAsins.has(r.asin)) {
        seenAsins.add(r.asin);
        recovered.push(r);
      }
    }
  }

  return recovered;
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

    const contentType = res.headers.get("content-type") || "image/jpeg";
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

  const prompt = `You are a fashion product search expert for Amazon. Analyze this outfit image with extreme precision.

Context:
- Target gender: ${genderLabel}
- Body type: ${bodyType || "regular"}
- Style vibe: ${vibeLabel || "general"}
- Season: ${seasonLabel}

TASK: Identify EACH individual clothing/accessory item visible in the image and generate Amazon-optimized search keywords.

CRITICAL RULES FOR ACCURACY:
1. COLOR: Be extremely specific. Instead of "dark", say "charcoal", "navy", "black", "dark olive". Instead of "light", say "cream", "ivory", "beige", "sky blue". Identify the EXACT color you see.
2. MATERIAL: Identify visible material - leather, denim, cotton, wool, knit, suede, canvas, nylon, polyester, silk, linen, corduroy, tweed, fleece.
3. STYLE: Be precise about fit and style - slim fit, relaxed fit, oversized, cropped, straight leg, tapered, bootcut, regular fit, loose fit.
4. TYPE: Use specific garment names - not just "jacket" but "bomber jacket", "denim jacket", "blazer", "parka", "windbreaker". Not just "shoes" but "chelsea boots", "oxford shoes", "sneakers", "loafers".
5. DETAILS: Note distinctive features - zip-up, button-down, crew neck, v-neck, turtleneck, hooded, collared, pleated, distressed, cuffed.
6. Every keyword MUST start with "${genderLabel}" for gender context.
7. Generate 3 keywords per item, each approaching from a different search angle.

Categories: outer, mid, top, bottom, shoes, bag, accessory

Return ONLY a JSON array. Example:
[
  {"category":"outer","keywords":["${genderLabel} charcoal wool double breasted overcoat","${genderLabel} dark grey long wool coat slim fit","${genderLabel} charcoal formal overcoat winter"]},
  {"category":"top","keywords":["${genderLabel} white slim fit oxford button down shirt","${genderLabel} white cotton poplin dress shirt","${genderLabel} white classic fit button up shirt"]},
  {"category":"bottom","keywords":["${genderLabel} black slim tapered chino pants","${genderLabel} black stretch cotton slim trousers","${genderLabel} black flat front dress pants slim"]},
  {"category":"shoes","keywords":["${genderLabel} cognac brown leather chelsea boots","${genderLabel} brown pull on ankle boots leather","${genderLabel} tan leather elastic side boots"]}
]

Only include categories clearly visible in the image.`;

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
          temperature: 0.15,
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

      let lensDirectResults: AmazonResult[] = [];
      let visualError: string | null = null;
      let nonAmazonTitles: string[] = [];
      let failedAsinTitles: string[] = [];

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
        lensDirectResults = visualResult.value.directAmazon;
        nonAmazonTitles = visualResult.value.nonAmazonTitles;
        failedAsinTitles = visualResult.value.failedAsinTitles;
      } else {
        visualError =
          visualResult.reason?.message || "Visual search failed";
      }

      if (geminiResult.status === "fulfilled") {
        usedCategoryKeywords = geminiResult.value;
      } else {
        keywordError =
          geminiResult.reason?.message || "Gemini analysis failed";
      }

      const seenAsins = new Set<string>();
      const merged: AmazonResult[] = [];

      for (const r of lensDirectResults) {
        if (r.asin && !seenAsins.has(r.asin)) {
          seenAsins.add(r.asin);
          merged.push(r);
        }
      }

      const lensRecovered = await recoverLensResultsViaAmazonSearch(
        nonAmazonTitles,
        failedAsinTitles,
        seenAsins
      );
      for (const r of lensRecovered) {
        merged.push(r);
      }

      const lensAmazonCount = lensDirectResults.length + lensRecovered.length;

      let categoryKeywordResults: AmazonResult[] = [];

      if (usedCategoryKeywords.length > 0) {
        const searchPromises = usedCategoryKeywords
          .slice(0, 6)
          .flatMap((ck) =>
            ck.keywords.slice(0, 2).map(async (kw) => {
              if (!kw) return [];
              try {
                const kwResults = await searchViaKeyword(kw, 1, ck.category);
                return kwResults.slice(0, 4);
              } catch {
                return [];
              }
            })
          );

        const allKwResults = await Promise.all(searchPromises);
        categoryKeywordResults = allKwResults.flat();
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
          lens_amazon_count: lensAmazonCount,
          lens_direct_count: lensDirectResults.length,
          lens_recovered_count: lensRecovered.length,
          lens_non_amazon_titles: nonAmazonTitles.length,
          lens_failed_asin_titles: failedAsinTitles.length,
          keyword_count: categoryKeywordResults.length,
          total: merged.length,
          visual_error: visualError,
          keyword_error: keywordError,
          category_keywords: usedCategoryKeywords,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Invalid action. Use: keyword_search or smart_search",
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
