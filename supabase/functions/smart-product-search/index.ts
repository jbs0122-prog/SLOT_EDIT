import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

async function searchViaLens(
  imageUrl: string
): Promise<{ results: AmazonResult[]; allResults: LensProduct[] }> {
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
    throw new Error(data.error || `Lens API HTTP ${res.status}`);
  }

  const visualMatches: LensProduct[] = data.visual_matches || [];

  const amazonResults: AmazonResult[] = [];
  for (const item of visualMatches) {
    if (!item.link) continue;

    const isAmazon =
      item.link.includes("amazon.com") ||
      item.source?.toLowerCase().includes("amazon");
    if (!isAmazon) continue;

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
  }

  return { results: amazonResults, allResults: visualMatches };
}

async function searchViaKeyword(
  query: string,
  page = 1
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
  }));
}

async function generateKeywordsViaGemini(
  imageUrl: string,
  gender: string,
  bodyType: string,
  vibe: string,
  season: string
): Promise<string[]> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

  const genderLabel =
    gender === "MALE" ? "men" : gender === "FEMALE" ? "women" : "unisex";
  const vibeLabel = vibe.replace(/_/g, " ").toLowerCase();
  const seasonLabel = (season || "all season").toLowerCase();

  const prompt = `You are a fashion product search expert. Look at this fashion product image and generate Amazon search keywords.

Image URL: ${imageUrl}

Context:
- Gender: ${genderLabel}
- Body type: ${bodyType || "regular"}
- Style vibe: ${vibeLabel}
- Season: ${seasonLabel}

Generate 3 specific Amazon search keywords that would find this exact product or very similar ones.
Each keyword should be 4-6 words, include the gender, and describe the specific item type, color, style, and material visible in the image.

Return ONLY a JSON array of 3 strings. Example: ["men black slim wool coat", "men tailored dark overcoat", "men fitted black topcoat"]`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: "placeholder",
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 512,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!geminiRes.ok) {
    const textPromptOnly = await fetchGeminiTextOnly(
      GEMINI_API_KEY,
      prompt.replace(`Image URL: ${imageUrl}\n\n`, "")
    );
    return textPromptOnly;
  }

  const geminiData = await geminiRes.json();
  const rawText =
    geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const arrMatch = rawText.match(/\[[\s\S]*\]/);
  if (!arrMatch) return [];

  try {
    const arr = JSON.parse(arrMatch[0]);
    return Array.isArray(arr) ? arr.filter((s: any) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

async function fetchGeminiTextOnly(
  apiKey: string,
  prompt: string
): Promise<string[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 512,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) return [];
  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const arrMatch = rawText.match(/\[[\s\S]*\]/);
  if (!arrMatch) return [];

  try {
    const arr = JSON.parse(arrMatch[0]);
    return Array.isArray(arr) ? arr.filter((s: any) => typeof s === "string") : [];
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
    } = body;

    if (action === "lens_search") {
      if (!image_url) {
        return new Response(
          JSON.stringify({ error: "image_url is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { results: lensResults, allResults } =
        await searchViaLens(image_url);

      return new Response(
        JSON.stringify({
          method: "lens",
          amazon_results: lensResults,
          all_visual_matches: allResults.length,
          amazon_match_count: lensResults.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

      const results = await searchViaKeyword(keyword, page || 1);
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

    if (action === "generate_keywords") {
      if (!image_url) {
        return new Response(
          JSON.stringify({ error: "image_url is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const keywords = await generateKeywordsViaGemini(
        image_url,
        gender || "UNISEX",
        body_type || "regular",
        vibe || "",
        season || ""
      );

      return new Response(JSON.stringify({ keywords }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

      let lensResults: AmazonResult[] = [];
      let lensError: string | null = null;
      let allVisualMatches = 0;

      try {
        const lensData = await searchViaLens(image_url);
        lensResults = lensData.results;
        allVisualMatches = lensData.allResults.length;
      } catch (err) {
        lensError = (err as Error).message;
      }

      let keywordResults: AmazonResult[] = [];
      let usedKeywords: string[] = [];
      let keywordError: string | null = null;

      if (lensResults.length < 3) {
        try {
          const keywords = await generateKeywordsViaGemini(
            image_url,
            gender || "UNISEX",
            body_type || "regular",
            vibe || "",
            season || ""
          );
          usedKeywords = keywords;

          for (const kw of keywords.slice(0, 2)) {
            const kwResults = await searchViaKeyword(kw, 1);
            keywordResults.push(...kwResults.slice(0, 5));
          }
        } catch (err) {
          keywordError = (err as Error).message;
        }
      }

      const seenAsins = new Set<string>();
      const merged: AmazonResult[] = [];

      for (const r of lensResults) {
        if (r.asin && !seenAsins.has(r.asin)) {
          seenAsins.add(r.asin);
          merged.push(r);
        }
      }
      for (const r of keywordResults) {
        if (r.asin && !seenAsins.has(r.asin)) {
          seenAsins.add(r.asin);
          merged.push(r);
        }
      }

      return new Response(
        JSON.stringify({
          method: "smart",
          results: merged,
          lens_count: lensResults.length,
          keyword_count: keywordResults.length,
          total: merged.length,
          all_visual_matches: allVisualMatches,
          lens_error: lensError,
          keyword_error: keywordError,
          used_keywords: usedKeywords,
          fallback_used: lensResults.length < 3,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        error:
          "Invalid action. Use: lens_search, keyword_search, generate_keywords, or smart_search",
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
