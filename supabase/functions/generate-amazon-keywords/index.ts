import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FALLBACK_KEYWORDS: Record<string, Record<string, string[]>> = {
  MALE: {
    ELEVATED_COOL: ["men slim fit chino pants", "men minimalist white t-shirt", "men leather chelsea boots", "men wool overcoat", "men structured blazer", "men raw denim jeans", "men leather crossbody bag", "men silver watch", "men turtleneck sweater", "men suede loafers", "men slim fit trousers", "men leather belt"],
    EFFORTLESS_NATURAL: ["men linen shirt", "men relaxed fit chinos", "men canvas sneakers", "men organic cotton t-shirt", "men knit sweater", "men earth tone hoodie", "men tote bag canvas", "men casual slip-on shoes", "men wide leg trousers", "men lightweight jacket", "men woven belt", "men straw hat"],
    ARTISTIC_MINIMAL: ["men oversized shirt", "men monochrome outfit", "men wide leg pants black", "men minimalist sneakers white", "men boxy t-shirt", "men structured bag", "men geometric print shirt", "men wool blend trousers", "men slip-on loafers", "men long cardigan", "men statement sunglasses", "men clean aesthetic clothes"],
    RETRO_LUXE: ["men vintage corduroy jacket", "men retro polo shirt", "men bootcut jeans", "men leather penny loafers", "men plaid trousers", "men varsity bomber jacket", "men suede boots", "men vintage denim jacket", "men retro sneakers", "men silk shirt", "men fitted turtleneck", "men heritage wool coat"],
    SPORT_MODERN: ["men athletic joggers", "men performance hoodie", "men running sneakers", "men technical zip-up jacket", "men athletic shorts", "men compression shirt", "men crossbody sport bag", "men track pants", "men mesh polo shirt", "men training shoes", "men lightweight windbreaker", "men sport watch"],
    CREATIVE_LAYERED: ["men printed graphic tee", "men patchwork jacket", "men layered outfit streetwear", "men cargo pants", "men chunky sneakers", "men bucket hat", "men utility vest", "men oversized bomber jacket", "men colorblock hoodie", "men statement sneakers", "men crossbody bag streetwear", "men workwear pants"],
  },
  FEMALE: {
    ELEVATED_COOL: ["women slim fit trousers", "women minimalist silk blouse", "women ankle boots leather", "women structured blazer", "women tailored coat", "women high waist jeans", "women leather shoulder bag", "women pearl earrings", "women cashmere turtleneck", "women pointed toe flats", "women midi skirt", "women gold necklace"],
    EFFORTLESS_NATURAL: ["women linen wide leg pants", "women relaxed cotton blouse", "women canvas tote bag", "women slip-on sandals", "women organic cotton dress", "women knit cardigan", "women neutral tone outfit", "women bohemian maxi dress", "women flat sandals", "women woven crossbody bag", "women floral midi dress", "women straw hat women"],
    ARTISTIC_MINIMAL: ["women oversized blazer", "women monochrome minimalist dress", "women wide leg black pants", "women minimalist white sneakers", "women architectural bag", "women asymmetric top", "women clean aesthetic dress", "women structured midi skirt", "women simple gold jewelry", "women slip dress minimal", "women boxy crop top", "women geometric earrings"],
    RETRO_LUXE: ["women vintage midi skirt", "women retro floral dress", "women high waist flare jeans", "women kitten heel mules", "women silk slip dress", "women vintage blouse", "women patent leather bag", "women vintage inspired coat", "women 70s style outfit", "women block heel boots", "women vintage jewelry set", "women wrap dress"],
    SPORT_MODERN: ["women athletic leggings", "women sports bra", "women running shoes women", "women zip-up hoodie", "women athletic shorts", "women technical jacket", "women gym bag", "women track suit women", "women performance tank top", "women chunky sneakers women", "women lightweight puffer jacket", "women crossbody sport bag"],
    CREATIVE_LAYERED: ["women printed wrap skirt", "women statement crop top", "women layered necklace set", "women cargo pants women", "women platform shoes", "women bucket hat women", "women patchwork denim jacket", "women colorful knit sweater", "women mix print outfit", "women oversized cardigan", "women vintage band tee", "women statement earrings"],
  },
  UNISEX: {
    ELEVATED_COOL: ["unisex minimalist sneakers", "unisex oversized blazer", "unisex wide leg trousers", "unisex leather bag", "unisex turtleneck sweater", "unisex slim fit jeans", "unisex wool coat", "unisex chelsea boots", "unisex silver jewelry", "unisex linen shirt", "unisex cotton trousers", "unisex canvas tote"],
    EFFORTLESS_NATURAL: ["unisex linen pants", "unisex organic tshirt", "unisex canvas sneakers", "unisex tote bag", "unisex knit sweater", "unisex relaxed hoodie", "unisex neutral palette outfit", "unisex slip on shoes", "unisex woven accessories", "unisex earth tone clothes", "unisex simple dress shirt", "unisex casual loafers"],
    ARTISTIC_MINIMAL: ["unisex oversized tshirt", "unisex monochrome outfit", "unisex minimalist shoes", "unisex geometric accessory", "unisex clean aesthetic wear", "unisex wide leg pants", "unisex boxy shirt", "unisex structured bag", "unisex simple jewelry", "unisex avant garde clothing", "unisex statement sneakers", "unisex architectural clothes"],
    RETRO_LUXE: ["unisex vintage denim jacket", "unisex retro sneakers", "unisex corduroy pants", "unisex varsity jacket", "unisex vintage tshirt", "unisex heritage wool sweater", "unisex leather belt vintage", "unisex throwback outfit", "unisex silk shirt", "unisex plaid flannel shirt", "unisex vintage accessories", "unisex retro cap"],
    SPORT_MODERN: ["unisex athletic joggers", "unisex performance hoodie", "unisex running shoes", "unisex track jacket", "unisex sport shorts", "unisex athletic tshirt", "unisex gym bag", "unisex windbreaker jacket", "unisex sport cap", "unisex training shoes", "unisex zip-up sweatshirt", "unisex sport crossbody"],
    CREATIVE_LAYERED: ["unisex graphic tee", "unisex cargo pants", "unisex chunky sneakers", "unisex oversized jacket", "unisex bucket hat", "unisex colorblock hoodie", "unisex patchwork clothing", "unisex streetwear outfit", "unisex statement bag", "unisex utility vest", "unisex layered outfit pieces", "unisex bold print shirt"],
  },
};

function getFallbackKeywords(gender: string, vibe: string, season: string): string[] {
  const g = gender in FALLBACK_KEYWORDS ? gender : "UNISEX";
  const v = vibe in (FALLBACK_KEYWORDS[g] || {}) ? vibe : "ELEVATED_COOL";
  let keywords = [...(FALLBACK_KEYWORDS[g][v] || [])];

  if (season === "winter") {
    keywords = keywords.map(k => k.replace("shirt", "winter shirt").replace("t-shirt", "thermal shirt"));
    keywords.push(`${g === "MALE" ? "men" : g === "FEMALE" ? "women" : "unisex"} winter coat`);
    keywords.push(`${g === "MALE" ? "men" : g === "FEMALE" ? "women" : "unisex"} warm scarf`);
  } else if (season === "summer") {
    keywords.push(`${g === "MALE" ? "men" : g === "FEMALE" ? "women" : "unisex"} summer dress`);
    keywords.push(`${g === "MALE" ? "men" : g === "FEMALE" ? "women" : "unisex"} lightweight shorts`);
  }

  return keywords.slice(0, 12);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { gender, body_type, vibe, season } = await req.json();

    if (!gender || !vibe) {
      return new Response(JSON.stringify({ error: "gender and vibe are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      const fallback = getFallbackKeywords(gender, vibe, season || "");
      return new Response(
        JSON.stringify({ keywords: fallback, source: "fallback" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vibeLabel = vibe.replace(/_/g, " ").toLowerCase();
    const genderLabel = gender === "MALE" ? "men" : gender === "FEMALE" ? "women" : "unisex";
    const seasonLabel = season || "all season";

    const bodyFitMap: Record<string, { label: string; fitTerms: string; avoidTerms: string }> = {
      slim: {
        label: "slim",
        fitTerms: "slim fit, tapered, skinny, slim-cut, fitted",
        avoidTerms: "relaxed, loose, oversized, baggy, wide-leg",
      },
      regular: {
        label: "regular",
        fitTerms: "regular fit, classic fit, straight fit, standard",
        avoidTerms: "oversized, baggy, skinny, skin-tight",
      },
      "plus-size": {
        label: "plus-size",
        fitTerms: "relaxed fit, loose, plus-size, extended size, curvy, oversized",
        avoidTerms: "slim fit, skinny, fitted, tapered",
      },
    };
    const bodyInfo = bodyFitMap[body_type] || bodyFitMap["regular"];

    const prompt = `You are a fashion product search specialist for Amazon.

Generate exactly 12 Amazon search keywords for clothing and accessories:
- Gender: ${genderLabel}
- Body type: ${bodyInfo.label} — MUST use fit terms like: ${bodyInfo.fitTerms}
- Style vibe: ${vibeLabel}
- Season: ${seasonLabel}

CRITICAL FIT RULES for body type "${bodyInfo.label}":
- Every clothing keyword (tops, bottoms, outerwear) MUST include one of these fit descriptors: ${bodyInfo.fitTerms}
- NEVER use: ${bodyInfo.avoidTerms}
- Example for "${bodyInfo.label}": "${genderLabel} ${bodyInfo.fitTerms.split(",")[0].trim()} chino pants", "${genderLabel} ${bodyInfo.fitTerms.split(",")[0].trim()} t-shirt"

Requirements:
- Each keyword: 2-5 words, specific, shoppable on Amazon
- Cover ALL categories (2 tops, 2 bottoms, 1 outerwear, 1 shoes, 1 bag, 1 accessory, 4 more clothing)
- Keywords in English only
- Match style vibe: "${vibeLabel}"

Return ONLY a valid JSON array of 12 strings, no explanation, no markdown:
["keyword1", "keyword2", ...]`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const fallback = getFallbackKeywords(gender, vibe, season || "");
      return new Response(
        JSON.stringify({ keywords: fallback, source: "fallback" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      const fallback = getFallbackKeywords(gender, vibe, season || "");
      return new Response(
        JSON.stringify({ keywords: fallback, source: "fallback" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const keywords: string[] = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ keywords, source: "gemini" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
