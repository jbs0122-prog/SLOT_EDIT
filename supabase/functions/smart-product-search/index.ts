import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SERPAPI_KEY =
  "b0fefa497aabd408066e3eea994a5f30b80daf942e491415c255c95b98a43584";

const VIBE_COLOR_VOCABULARY: Record<string, { primary: string[]; secondary: string[]; accent: string[]; keywords: string[] }> = {
  ELEVATED_COOL: {
    primary: ['black', 'charcoal', 'navy', 'white'],
    secondary: ['grey', 'cream', 'camel'],
    accent: ['burgundy', 'teal', 'metallic'],
    keywords: ['monochrome', 'tonal', 'dark neutrals', 'high contrast'],
  },
  EFFORTLESS_NATURAL: {
    primary: ['beige', 'cream', 'ivory', 'white'],
    secondary: ['olive', 'khaki', 'tan', 'sage', 'brown'],
    accent: ['rust', 'mustard', 'burgundy'],
    keywords: ['earthy', 'warm neutrals', 'muted', 'organic tones'],
  },
  ARTISTIC_MINIMAL: {
    primary: ['black', 'white', 'grey'],
    secondary: ['navy', 'charcoal', 'cream'],
    accent: ['red', 'mustard'],
    keywords: ['achromatic', 'stark contrast', 'desaturated', 'sculptural'],
  },
  RETRO_LUXE: {
    primary: ['brown', 'camel', 'cream', 'burgundy'],
    secondary: ['gold', 'ivory', 'navy', 'olive'],
    accent: ['mustard', 'rust', 'teal'],
    keywords: ['rich', 'vintage tones', 'warm luxe', 'jewel-adjacent'],
  },
  SPORT_MODERN: {
    primary: ['black', 'white', 'grey', 'navy'],
    secondary: ['olive', 'khaki', 'charcoal'],
    accent: ['orange', 'teal', 'red'],
    keywords: ['technical', 'bold accent', 'high-vis', 'utility neutral'],
  },
  CREATIVE_LAYERED: {
    primary: ['black', 'denim', 'brown', 'burgundy'],
    secondary: ['grey', 'olive', 'navy', 'cream'],
    accent: ['mustard', 'rust', 'red', 'orange'],
    keywords: ['eclectic', 'pattern-rich', 'mixed tones', 'vintage-warm'],
  },
};

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
  source: "gemini_keyword" | "lens" | "lens_crop" | "lens_chain" | "keyword";
  category?: string;
  crop_zone?: string;
  keyword_used?: string;
}

interface CategoryKeyword {
  zone: string;
  brand: string;
  keywords: string[];
  description: string;
}

function extractAsin(url: string): string | null {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/ASIN\/([A-Z0-9]{10})/i,
    /[?&]asin=([A-Z0-9]{10})/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

function isAmazonImageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.includes("media-amazon.com") ||
      host.includes("images-amazon.com") ||
      host.includes("ssl-images-amazon.com")
    );
  } catch {
    return false;
  }
}

function upgradeImageResolution(url: string): string {
  if (!url) return url;
  if (!isAmazonImageUrl(url)) return url;
  return url
    .replace(/_AC_U[A-Z0-9]+_\./g, "_AC_SL1500_.")
    .replace(/_AC_SR\d+,\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_SY\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_SX\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_UL\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_SS\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_AA\d+_\./g, "_AC_SL1500_.")
    .replace(/\._[A-Z0-9,_]+_\./g, "._AC_SL1500_.");
}

async function fetchImageAsBase64(
  imageUrl: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": "https://www.pinterest.com/",
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

async function analyzeImageWithGemini(
  imageData: { base64: string; mimeType: string },
  gender: string,
  bodyType: string,
  vibe: string,
  season: string
): Promise<{ categories: CategoryKeyword[]; error: string | null }> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    return { categories: [], error: "GEMINI_API_KEY not configured" };
  }

  const genderLabel =
    gender === "MALE" ? "men" : gender === "FEMALE" ? "women" : "unisex";

  const vibeColorSection = vibe && VIBE_COLOR_VOCABULARY[vibe]
    ? `\n\nVIBE COLOR GUIDANCE (${vibe.replace(/_/g, " ")}):
- Primary palette: ${VIBE_COLOR_VOCABULARY[vibe].primary.join(", ")}
- Secondary palette: ${VIBE_COLOR_VOCABULARY[vibe].secondary.join(", ")}
- Accent colors: ${VIBE_COLOR_VOCABULARY[vibe].accent.join(", ")}
- Color mood: ${VIBE_COLOR_VOCABULARY[vibe].keywords.join(", ")}
When generating keywords, PREFER color terms from this palette. Use the vibe's color vocabulary (e.g., "${VIBE_COLOR_VOCABULARY[vibe].keywords[0]}") instead of generic color words when describing items.`
    : "";

  const prompt = `You are a fashion expert analyzing a reference outfit image to find similar products on Amazon USA.

Context:
- Target gender: ${genderLabel}
- Body type: ${bodyType || "regular"}
- Style vibe: ${vibe ? vibe.replace(/_/g, " ").toLowerCase() : "general"}
- Season: ${season || "all season"}${vibeColorSection}

TASK: Identify EVERY clothing and accessory item visible in this image. For each item, detect brands and generate highly specific Amazon USA search keywords.

Return a JSON array of objects with this structure:
[
  {
    "zone": "outer|mid|top|bottom|shoes|bag|accessory",
    "brand": "BrandName or empty string",
    "description": "brief description of the specific item (e.g., 'navy slim fit blazer with notch lapel')",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  }
]

BRAND FIELD RULES:
- "brand" MUST be a separate field — NOT mixed into keywords
- If a brand logo, label, tag, or name is clearly visible (e.g., Nike swoosh, Adidas three stripes, Supreme box logo, Carhartt label, New Balance "N", Polo Ralph Lauren horse, Converse star, The North Face, etc.), set "brand" to the exact brand name (e.g., "Nike", "Adidas", "New Balance")
- If NO brand is visible, set "brand" to "" (empty string)
- Do NOT guess brands — only set brand if you are confident from visible logos/labels/text

Zone definitions:
- "outer": jacket, coat, blazer, cardigan (outermost layer)
- "mid": hoodie, sweater, sweatshirt (middle layer)
- "top": shirt, t-shirt, blouse, tank top (inner top)
- "bottom": pants, jeans, trousers, skirt, shorts
- "shoes": all footwear
- "bag": bag, backpack, tote, purse
- "accessory": hat, belt, scarf, glasses, watch, jewelry

KEYWORD RULES:
- Each keyword must be a complete Amazon search query (3-7 words)
- Include: item type + specific style features + color + material (if visible)
- For ${genderLabel}: always include gender in keywords (e.g., "mens", "womens")
- Generate 3 different keyword variations per item (broad → specific)
- Do NOT include the brand name in keywords — the brand field handles that separately
- Example for a navy slim blazer (no brand): ["mens navy slim fit blazer", "mens navy suit jacket office", "mens navy blazer single breasted"]

WHEN NO BRAND IS VISIBLE (CRITICAL):
- Compensate with MORE descriptive detail in keywords
- Include: color + material + silhouette + style detail + item type
- Add texture, finish, or distinguishing features (e.g., "ribbed", "cropped", "oversized", "distressed", "quilted")
- Example: ["mens charcoal wool oversized overcoat", "mens dark grey long heavy coat belted", "mens charcoal double breasted wool topcoat"]

IMPORTANT:
- Include ALL visible items, even partially visible ones
- If layered (jacket over shirt), list BOTH as separate items
- Focus on Amazon USA product naming conventions`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: imageData.mimeType,
                    data: imageData.base64,
                  },
                },
                { text: prompt },
              ],
            },
          ],
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
      return {
        categories: [],
        error: `Gemini error: ${errText.slice(0, 200)}`,
      };
    }

    const geminiData = await geminiRes.json();
    const rawText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    let parsed: any[] = [];
    try {
      const arrMatch = rawText.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        parsed = JSON.parse(arrMatch[0]);
      } else {
        parsed = JSON.parse(rawText);
      }
    } catch {
      return { categories: [], error: "Failed to parse Gemini JSON response" };
    }

    const categories: CategoryKeyword[] = parsed
      .filter(
        (item: any) =>
          item &&
          typeof item.zone === "string" &&
          Array.isArray(item.keywords) &&
          item.keywords.length > 0
      )
      .map((item: any) => ({
        zone: item.zone.toLowerCase(),
        brand: typeof item.brand === "string" ? item.brand.trim() : "",
        keywords: item.keywords.filter(
          (k: any) => typeof k === "string" && k.trim().length > 0
        ),
        description: item.description || item.zone,
      }));

    return { categories, error: null };
  } catch (e) {
    return { categories: [], error: (e as Error).message };
  }
}

async function searchAmazonByKeyword(
  keyword: string,
  zone: string
): Promise<AmazonResult[]> {
  try {
    const params = new URLSearchParams({
      engine: "amazon",
      k: keyword,
      amazon_domain: "amazon.com",
      tld: "com",
      hl: "en",
      api_key: SERPAPI_KEY,
    });

    const res = await fetch(
      `https://serpapi.com/search.json?${params.toString()}`
    );
    const data = await res.json();

    if (!res.ok || data.error) return [];

    const organicResults = data.organic_results || data.results || [];

    return organicResults.slice(0, 8).map((item: any) => {
      const asin = item.asin || extractAsin(item.link || "") || "";
      return {
        asin,
        title: item.title || "",
        brand: item.brand || "",
        price:
          item.extracted_price ??
          item.price?.value ??
          item.price_string?.replace(/[^0-9.]/g, "") ??
          null,
        currency: item.price?.currency ?? "USD",
        image: upgradeImageResolution(
          item.thumbnail || item.image || item.primary_image || ""
        ),
        rating: item.rating ?? null,
        reviews_count: item.reviews ?? item.reviews_count ?? null,
        url:
          item.link ||
          (asin ? `https://www.amazon.com/dp/${asin}` : ""),
        is_prime: item.is_prime ?? item.prime ?? false,
        source: "gemini_keyword" as const,
        category: zone,
        crop_zone: zone,
        keyword_used: keyword,
      };
    }).filter((r: AmazonResult) => r.asin);
  } catch {
    return [];
  }
}

async function searchViaLens(
  imageUrl: string,
  sourceType: AmazonResult["source"] = "lens",
  cropZone?: string
): Promise<{ results: AmazonResult[]; error: string | null }> {
  try {
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
      return { results: [], error: errMsg };
    }

    const visualMatches = data.visual_matches || [];
    const results: AmazonResult[] = [];

    for (const item of visualMatches) {
      if (!item.link || !item.link.includes("amazon.com")) continue;
      const asin = extractAsin(item.link);
      if (!asin) continue;

      results.push({
        asin,
        title: item.title || "",
        brand: "",
        price: item.price?.extracted_value ?? null,
        currency: item.price?.currency || "USD",
        image: upgradeImageResolution(item.image || item.thumbnail || ""),
        rating: item.rating ?? null,
        reviews_count: item.reviews ?? null,
        url: `https://www.amazon.com/dp/${asin}`,
        is_prime: false,
        source: sourceType,
        crop_zone: cropZone,
        category: cropZone,
      });
    }

    return { results, error: null };
  } catch (e) {
    return { results: [], error: (e as Error).message };
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

      const params = new URLSearchParams({
        engine: "amazon",
        k: keyword,
        amazon_domain: "amazon.com",
        tld: "com",
        hl: "en",
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

      const results: AmazonResult[] = (
        data.organic_results || data.results || []
      ).map((item: any) => ({
        asin: item.asin || "",
        title: item.title || "",
        brand: item.brand || "",
        price:
          item.extracted_price ?? item.price?.value ?? null,
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
          JSON.stringify({ error: "image_url is required for smart search" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const seenAsins = new Set<string>();
      const merged: AmazonResult[] = [];
      const log: string[] = [];
      const detectedZones: string[] = [];

      // Step 1: 이미지를 base64로 다운로드
      log.push("이미지 다운로드 중...");
      const imageData = await fetchImageAsBase64(image_url);

      if (!imageData) {
        return new Response(
          JSON.stringify({
            error: "이미지를 다운로드할 수 없습니다. URL을 확인해주세요.",
            method: "smart",
            results: [],
            total: 0,
            search_log: log,
            detected_zones: [],
            gemini_categories: [],
            lens_direct_count: 0,
            lens_crop_count: 0,
            lens_chain_count: 0,
            keyword_count: 0,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      log.push(`이미지 다운로드 완료 (${imageData.mimeType})`);

      // Step 2: Gemini로 이미지 분석 → 카테고리별 키워드 추출
      log.push("Gemini AI로 아이템 분석 중...");
      const { categories, error: geminiError } = await analyzeImageWithGemini(
        imageData,
        gender || "UNISEX",
        body_type || "regular",
        vibe || "",
        season || ""
      );

      if (geminiError) {
        log.push(`Gemini 분석 오류: ${geminiError}`);
      } else {
        log.push(
          `Gemini 감지: ${categories.map((c) => `${c.zone}(${c.keywords.length}키워드)`).join(", ")}`
        );
        categories.forEach((c) => {
          if (!detectedZones.includes(c.zone)) detectedZones.push(c.zone);
        });
      }

      // Step 3: 브랜드 우선 검색 → 일반 키워드 검색 (카테고리별)
      let keywordCount = 0;
      const categorySearchResults: Record<string, AmazonResult[]> = {};
      const BRAND_QUOTA = 2;
      const GENERIC_QUOTA = 2;
      const MAX_PER_CATEGORY = BRAND_QUOTA + GENERIC_QUOTA;

      if (categories.length > 0) {
        log.push(`Amazon USA 검색 시작 (${categories.length}개 카테고리)...`);

        const searchPromises: Promise<void>[] = [];

        for (const cat of categories) {
          searchPromises.push(
            (async () => {
              if (!categorySearchResults[cat.zone]) {
                categorySearchResults[cat.zone] = [];
              }

              let brandResultCount = 0;
              let genericResultCount = 0;

              // Phase 1: Brand-specific search (if brand detected)
              if (cat.brand) {
                const brandKeyword = `${cat.brand} ${cat.keywords[0] || cat.description}`;
                log.push(`${cat.zone} 브랜드 검색: "${brandKeyword}"`);
                const brandResults = await searchAmazonByKeyword(brandKeyword, cat.zone);
                for (const r of brandResults) {
                  if (brandResultCount >= BRAND_QUOTA) break;
                  if (r.asin && !seenAsins.has(r.asin)) {
                    seenAsins.add(r.asin);
                    categorySearchResults[cat.zone].push(r);
                    merged.push(r);
                    keywordCount++;
                    brandResultCount++;
                  }
                }
                log.push(`${cat.zone} 브랜드 결과: ${brandResultCount}개`);
              }

              // Phase 2: Generic keyword search (fill remaining quota)
              const remainingQuota = cat.brand
                ? GENERIC_QUOTA
                : MAX_PER_CATEGORY;

              for (const kw of cat.keywords) {
                if (genericResultCount >= remainingQuota) break;

                const results = await searchAmazonByKeyword(kw, cat.zone);
                let addedCount = 0;
                for (const r of results) {
                  if (genericResultCount >= remainingQuota) break;
                  if (r.asin && !seenAsins.has(r.asin)) {
                    seenAsins.add(r.asin);
                    categorySearchResults[cat.zone].push(r);
                    merged.push(r);
                    keywordCount++;
                    genericResultCount++;
                    addedCount++;
                  }
                }
                log.push(`${cat.zone} [${kw}]: ${addedCount}개`);
              }

              log.push(
                `${cat.zone} 최종: ${categorySearchResults[cat.zone].length}개 (브랜드:${brandResultCount} + 일반:${genericResultCount})${cat.brand ? ` [${cat.brand}]` : " [브랜드 없음→상세 키워드]"}`
              );
            })()
          );
        }

        await Promise.all(searchPromises);
      }

      // Step 4: Lens 검색도 병렬 시도 (Amazon CDN URL이면 추가 검색)
      let lensDirectCount = 0;
      const isAmazonUrl =
        image_url.includes("media-amazon.com") ||
        image_url.includes("images-amazon.com");

      if (isAmazonUrl) {
        log.push("Amazon URL 감지 → Lens 추가 검색...");
        const { results: lensResults } = await searchViaLens(
          image_url,
          "lens"
        );

        const allBrands = categories
          .filter((c) => c.brand)
          .map((c) => c.brand.toLowerCase());

        for (const r of lensResults) {
          if (r.asin && !seenAsins.has(r.asin)) {
            seenAsins.add(r.asin);
            if (!r.brand && r.title) {
              const titleLower = r.title.toLowerCase();
              const matchedBrand = allBrands.find((b) => titleLower.includes(b));
              if (matchedBrand) {
                r.brand = categories.find(
                  (c) => c.brand.toLowerCase() === matchedBrand
                )?.brand || "";
              }
            }
            merged.push(r);
            lensDirectCount++;
          }
        }
        if (lensDirectCount > 0) {
          log.push(`Lens 원본: +${lensDirectCount}개`);
        }
      }

      log.push(
        `완료! 총 ${merged.length}개 상품 (${detectedZones.length}개 카테고리)`
      );

      return new Response(
        JSON.stringify({
          method: "smart",
          results: merged,
          lens_direct_count: lensDirectCount,
          lens_crop_count: 0,
          lens_chain_count: 0,
          keyword_count: keywordCount,
          total: merged.length,
          detected_zones: detectedZones,
          gemini_categories: categories,
          search_log: log,
          visual_error: null,
          crop_error: geminiError,
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
