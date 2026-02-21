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
  source: "lens" | "lens_crop" | "lens_chain" | "keyword";
  category?: string;
  crop_zone?: string;
}

interface CropBox {
  zone: string;
  x: number;
  y: number;
  width: number;
  height: number;
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

function resolveUsAmazonLink(link: string): string | null {
  if (!link) return null;
  try {
    const url = new URL(link);
    const host = url.hostname.toLowerCase();

    if (host === "www.amazon.com" || host === "amazon.com") {
      return link;
    }

    if (host === "www.google.com" || host === "google.com") {
      const q = url.searchParams.get("q") ||
        url.searchParams.get("url") ||
        url.searchParams.get("adurl");
      if (q) return resolveUsAmazonLink(decodeURIComponent(q));

      const pathname = url.pathname;
      if (pathname.startsWith("/shopping/product/")) {
        const destUrl = url.searchParams.get("prds");
        if (destUrl) return resolveUsAmazonLink(decodeURIComponent(destUrl));
      }

      const fullUrl = link;
      const amazonMatch = fullUrl.match(/https?:\/\/(?:www\.)?amazon\.com[^\s&"']*/);
      if (amazonMatch) return resolveUsAmazonLink(decodeURIComponent(amazonMatch[0]));
    }

    return null;
  } catch {
    return null;
  }
}

function parseAmazonResultsFromLens(
  visualMatches: LensProduct[],
  sourceType: AmazonResult["source"],
  cropZone?: string
): { results: AmazonResult[]; stats: { total: number; amazon: number; withAsin: number } } {
  const results: AmazonResult[] = [];
  let amazonCount = 0;
  let withAsinCount = 0;

  for (const item of visualMatches) {
    if (!item.link) continue;

    const resolvedLink = resolveUsAmazonLink(item.link);
    if (!resolvedLink) continue;
    amazonCount++;

    const asin = extractAsin(resolvedLink);
    if (!asin) continue;
    withAsinCount++;

    const canonicalUrl = `https://www.amazon.com/dp/${asin}`;
    const rawImage = item.image || item.thumbnail || "";
    const upgradedImage = upgradeImageResolution(rawImage);
    results.push({
      asin,
      title: item.title || "",
      brand: "",
      price: item.price?.extracted_value ?? null,
      currency: item.price?.currency || "USD",
      image: upgradedImage,
      rating: item.rating ?? null,
      reviews_count: item.reviews ?? null,
      url: canonicalUrl,
      is_prime: false,
      source: sourceType,
      crop_zone: cropZone,
    });
  }

  return {
    results,
    stats: { total: visualMatches.length, amazon: amazonCount, withAsin: withAsinCount },
  };
}

async function searchViaLens(
  imageUrl: string,
  sourceType: AmazonResult["source"] = "lens",
  cropZone?: string
): Promise<{ results: AmazonResult[]; error: string | null; stats?: any }> {
  try {
    const params = new URLSearchParams({
      engine: "google_lens",
      url: imageUrl,
      type: "products",
      hl: "en",
      country: "us",
      api_key: SERPAPI_KEY,
    });

    const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
    const data = await res.json();

    if (!res.ok || data.error) {
      const errMsg = typeof data.error === "string" ? data.error : JSON.stringify(data.error || data);
      return { results: [], error: errMsg };
    }

    const visualMatches: LensProduct[] = data.visual_matches || [];

    const sample = visualMatches.slice(0, 10).map(m => ({
      link: m.link,
      source: m.source,
      title: (m.title || "").slice(0, 40),
    }));
    console.log(`[Lens raw] total=${visualMatches.length} links=${JSON.stringify(sample)}`);

    const amazonLinks = visualMatches.filter(m => m.link && m.link.includes("amazon.com"));
    console.log(`[Lens filter] total=${visualMatches.length} amazon_links=${amazonLinks.length}`);

    const { results, stats } = parseAmazonResultsFromLens(visualMatches, sourceType, cropZone);
    console.log(`[Lens parsed] total=${stats.total} amazon=${stats.amazon} withAsin=${stats.withAsin} final=${results.length}`);

    return { results, error: null, stats };
  } catch (e) {
    return { results: [], error: (e as Error).message };
  }
}

async function fetchImageAsBase64(
  imageUrl: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
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

async function getCropBoxesViaGemini(
  imageUrl: string,
  gender: string,
  bodyType: string,
  vibe: string,
  season: string
): Promise<{
  cropBoxes: CropBox[];
  imgWidth: number;
  imgHeight: number;
  imageBase64: string;
  mimeType: string;
  error: string | null;
}> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    return { cropBoxes: [], imgWidth: 0, imgHeight: 0, imageBase64: "", mimeType: "", error: "GEMINI_API_KEY not configured" };
  }

  const imageData = await fetchImageAsBase64(imageUrl);
  if (!imageData) {
    return { cropBoxes: [], imgWidth: 0, imgHeight: 0, imageBase64: "", mimeType: "", error: "Failed to fetch image" };
  }

  const genderLabel = gender === "MALE" ? "men" : gender === "FEMALE" ? "women" : "unisex";

  const prompt = `You are analyzing a fashion outfit image to identify bounding boxes for each distinct clothing/accessory item.

Context:
- Target gender: ${genderLabel}
- Body type: ${bodyType || "regular"}
- Style vibe: ${vibe ? vibe.replace(/_/g, " ").toLowerCase() : "general"}
- Season: ${season || "all season"}

TASK: Return bounding boxes for each VISIBLE clothing item in the image.
Use normalized coordinates (0.0 to 1.0) relative to image dimensions.

Return ONLY a JSON object with:
- "img_width": estimated pixel width of image (e.g. 800)
- "img_height": estimated pixel height of image (e.g. 1200)
- "boxes": array of {zone, x, y, width, height} where x,y is top-left corner

Zone names: "top" (shirt/blouse/top), "bottom" (pants/skirt), "outer" (jacket/coat), "shoes", "bag", "accessory"

Example:
{
  "img_width": 800,
  "img_height": 1200,
  "boxes": [
    {"zone":"outer","x":0.1,"y":0.05,"width":0.8,"height":0.45},
    {"zone":"bottom","x":0.2,"y":0.5,"width":0.6,"height":0.35},
    {"zone":"shoes","x":0.25,"y":0.85,"width":0.5,"height":0.12}
  ]
}

Only include zones clearly visible. Limit to 4 most prominent items.`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ inline_data: { mime_type: imageData.mimeType, data: imageData.base64 } }, { text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024, responseMimeType: "application/json" },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return { cropBoxes: [], imgWidth: 0, imgHeight: 0, imageBase64: imageData.base64, mimeType: imageData.mimeType, error: `Gemini error: ${errText.slice(0, 200)}` };
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    const objMatch = rawText.match(/\{[\s\S]*\}/);
    if (!objMatch) {
      return { cropBoxes: [], imgWidth: 0, imgHeight: 0, imageBase64: imageData.base64, mimeType: imageData.mimeType, error: "No JSON found in Gemini response" };
    }

    const parsed = JSON.parse(objMatch[0]);
    const cropBoxes: CropBox[] = (parsed.boxes || []).filter(
      (b: any) =>
        b &&
        typeof b.zone === "string" &&
        typeof b.x === "number" &&
        typeof b.y === "number" &&
        typeof b.width === "number" &&
        typeof b.height === "number"
    );

    return {
      cropBoxes,
      imgWidth: parsed.img_width || 800,
      imgHeight: parsed.img_height || 1200,
      imageBase64: imageData.base64,
      mimeType: imageData.mimeType,
      error: null,
    };
  } catch (e) {
    return { cropBoxes: [], imgWidth: 0, imgHeight: 0, imageBase64: imageData.base64, mimeType: imageData.mimeType, error: (e as Error).message };
  }
}

async function buildCropSearchUrl(imageUrl: string, box: CropBox): Promise<string> {
  const x1 = Math.round(box.x * 1000);
  const y1 = Math.round(box.y * 1000);
  const x2 = Math.round((box.x + box.width) * 1000);
  const y2 = Math.round((box.y + box.height) * 1000);

  const params = new URLSearchParams({
    engine: "google_lens",
    url: imageUrl,
    type: "products",
    hl: "en",
    country: "us",
    api_key: SERPAPI_KEY,
    lns_surface: "1",
    crop_x1: String(x1),
    crop_y1: String(y1),
    crop_x2: String(x2),
    crop_y2: String(y2),
  });

  return `https://serpapi.com/search.json?${params.toString()}`;
}

async function searchCroppedLens(
  imageUrl: string,
  box: CropBox
): Promise<{ results: AmazonResult[]; error: string | null }> {
  try {
    const serpUrl = await buildCropSearchUrl(imageUrl, box);
    const res = await fetch(serpUrl);
    const data = await res.json();

    if (!res.ok || data.error) {
      const errMsg = typeof data.error === "string" ? data.error : JSON.stringify(data.error || data);
      return { results: [], error: errMsg };
    }

    const visualMatches: LensProduct[] = data.visual_matches || [];
    const amazonLinks = visualMatches.filter(m => m.link && m.link.includes("amazon.com"));
    console.log(`[Crop ${box.zone}] total=${visualMatches.length} amazon_links=${amazonLinks.length}`);

    const { results, stats } = parseAmazonResultsFromLens(visualMatches, "lens_crop", box.zone);
    console.log(`[Crop ${box.zone} parsed] amazon=${stats.amazon} withAsin=${stats.withAsin} final=${results.length}`);

    return { results, error: null };
  } catch (e) {
    return { results: [], error: (e as Error).message };
  }
}

async function searchChainLens(
  chainImageUrl: string,
  seenAsins: Set<string>
): Promise<AmazonResult[]> {
  const { results, error } = await searchViaLens(chainImageUrl, "lens_chain");
  if (error || results.length === 0) return [];

  const newResults: AmazonResult[] = [];
  for (const r of results) {
    if (r.asin && !seenAsins.has(r.asin)) {
      seenAsins.add(r.asin);
      newResults.push(r);
    }
  }
  return newResults;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, image_url, keyword, gender, body_type, vibe, season, page, category } = body;

    if (action === "keyword_search") {
      if (!keyword) {
        return new Response(
          JSON.stringify({ error: "keyword is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const params = new URLSearchParams({
        engine: "amazon",
        k: keyword,
        i: "fashion",
        tld: "com",
        api_key: SERPAPI_KEY,
      });
      if (page > 1) params.set("page", String(page));

      const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `Amazon Search API HTTP ${res.status}`);
      }

      const results: AmazonResult[] = (data.organic_results || []).map((item: any) => ({
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
        source: "keyword" as const,
        category,
      }));

      return new Response(
        JSON.stringify({ method: "keyword", results, total: results.length, keyword, page: page || 1 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "smart_search") {
      if (!image_url) {
        return new Response(
          JSON.stringify({ error: "image_url is required for smart search" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const seenAsins = new Set<string>();
      const merged: AmazonResult[] = [];
      const log: string[] = [];

      // Step 1: Lens 원본 검색
      const { results: lensResults, error: visualError } = await searchViaLens(image_url, "lens");

      let lensDirectCount = 0;
      for (const r of lensResults) {
        if (r.asin && !seenAsins.has(r.asin)) {
          seenAsins.add(r.asin);
          merged.push(r);
          lensDirectCount++;
        }
      }
      log.push(`Lens 원본: ${lensDirectCount}개`);

      // Step 2: Gemini로 크롭 좌표 추출
      const { cropBoxes, error: cropError } = await getCropBoxesViaGemini(
        image_url,
        gender || "UNISEX",
        body_type || "regular",
        vibe || "",
        season || ""
      );

      const detectedZones: string[] = cropBoxes.map((b) => b.zone);
      let cropCount = 0;
      const cropErrors: string[] = [];

      if (cropBoxes.length > 0) {
        // Step 3: 크롭 분할 Lens 검색 (최대 4개 존)
        const cropResults = await Promise.all(
          cropBoxes.slice(0, 4).map((box) => searchCroppedLens(image_url, box))
        );

        for (let i = 0; i < cropResults.length; i++) {
          const { results: cr, error: ce } = cropResults[i];
          if (ce) {
            cropErrors.push(`${cropBoxes[i].zone}: ${ce}`);
            continue;
          }
          for (const r of cr) {
            if (r.asin && !seenAsins.has(r.asin)) {
              seenAsins.add(r.asin);
              merged.push(r);
              cropCount++;
            }
          }
        }
        log.push(`크롭 분할(${detectedZones.join("/")}): +${cropCount}개`);
      } else {
        log.push(`크롭 분할: 좌표 추출 실패 (${cropError || "unknown"})`);
      }

      // Step 4: 체인 검색 - lens + lens_crop 중 Amazon CDN 이미지 있는 상위 5개로 재검색
      let chainCount = 0;
      const chainTargets = merged
        .filter((r) =>
          (r.source === "lens" || r.source === "lens_crop") &&
          r.asin &&
          r.image &&
          isAmazonImageUrl(r.image)
        )
        .slice(0, 5);

      if (chainTargets.length > 0) {
        const chainResults = await Promise.all(
          chainTargets.map((r) => searchChainLens(r.image, seenAsins))
        );
        for (const batch of chainResults) {
          for (const r of batch) {
            merged.push(r);
            chainCount++;
          }
        }
        log.push(`체인 검색(${chainTargets.length}개 대상): +${chainCount}개`);
      } else {
        log.push(`체인 검색: 적합한 이미지 없어 스킵`);
      }

      return new Response(
        JSON.stringify({
          method: "smart",
          results: merged,
          lens_direct_count: lensDirectCount,
          lens_crop_count: cropCount,
          lens_chain_count: chainCount,
          lens_amazon_count: lensDirectCount,
          keyword_count: 0,
          total: merged.length,
          visual_error: visualError,
          crop_error: cropError || (cropErrors.length > 0 ? cropErrors.join("; ") : null),
          detected_zones: detectedZones,
          category_keywords: [],
          search_log: log,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: keyword_search or smart_search" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
