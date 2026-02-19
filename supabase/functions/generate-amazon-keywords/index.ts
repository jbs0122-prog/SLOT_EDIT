import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// SILHOUETTE_BALANCE from matchingData.ts:
// oversized/relaxed top → slim/fitted/straight/tapered bottom (and vice versa)
// slim top → wide/relaxed/oversized bottom
// fitted top → wide/relaxed/oversized bottom
// This creates visual balance. slim body type BENEFITS from relaxed/oversized fit
// to add volume. plus-size BENEFITS from structured/straight to streamline.
const BODY_TYPE_SILHOUETTE: Record<string, {
  topFit: string;
  bottomFit: string;
  outerFit: string;
  rationale: string;
}> = {
  slim: {
    topFit: "oversized, relaxed, boxy, loose",
    bottomFit: "wide-leg, relaxed, straight, regular",
    outerFit: "oversized, relaxed",
    rationale: "slim body type — add volume and visual weight with relaxed/oversized fits to balance proportions",
  },
  regular: {
    topFit: "regular, straight, relaxed, fitted",
    bottomFit: "straight, slim, regular, tapered",
    outerFit: "regular, relaxed",
    rationale: "regular body type — most fits work well, prefer balanced regular/straight silhouettes",
  },
  "plus-size": {
    topFit: "straight, regular, A-line, empire",
    bottomFit: "straight, wide-leg, bootcut, relaxed",
    outerFit: "straight, regular, open-front",
    rationale: "plus-size body type — use straight/regular fits that flow naturally over curves without being too tight or too loose",
  },
};

const CATEGORY_DEFS = [
  { key: "outer", label: "Outerwear", count: 2 },
  { key: "top", label: "Tops", count: 3 },
  { key: "bottom", label: "Bottoms", count: 2 },
  { key: "shoes", label: "Shoes", count: 2 },
  { key: "bag", label: "Bags", count: 1 },
  { key: "accessory", label: "Accessories", count: 2 },
];

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
    const genderLabel = gender === "MALE" ? "men" : gender === "FEMALE" ? "women" : "unisex";
    const vibeLabel = vibe.replace(/_/g, " ").toLowerCase();
    const seasonLabel = season || "all season";
    const bodyFit = BODY_TYPE_SILHOUETTE[body_type] || BODY_TYPE_SILHOUETTE["regular"];

    if (!GEMINI_API_KEY) {
      const fallback = getFallbackKeywords(gender, body_type, vibe, season || "");
      return new Response(
        JSON.stringify({ keywords: fallback.keywords, categories: fallback.categories, source: "fallback" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categoryInstructions = CATEGORY_DEFS.map(cat => {
      if (cat.key === "top") return `- Tops (${cat.count} keywords): use fit "${bodyFit.topFit}"`;
      if (cat.key === "bottom") return `- Bottoms (${cat.count} keywords): use fit "${bodyFit.bottomFit}"`;
      if (cat.key === "outer") return `- Outerwear (${cat.count} keywords): use fit "${bodyFit.outerFit}"`;
      if (cat.key === "shoes") return `- Shoes (${cat.count} keywords): specific style matching "${vibeLabel}" vibe`;
      if (cat.key === "bag") return `- Bags (${cat.count} keyword): matching "${vibeLabel}" vibe`;
      return `- Accessories (${cat.count} keywords): matching "${vibeLabel}" vibe`;
    }).join("\n");

    const prompt = `You are a fashion search expert for Amazon. Generate search keywords for a ${genderLabel} with ${body_type || "regular"} body type.

Body type styling principle: ${bodyFit.rationale}

Style vibe: ${vibeLabel}
Season: ${seasonLabel}

Generate exactly 12 keywords organized by category:
${categoryInstructions}

IMPORTANT silhouette rules based on body type "${body_type || "regular"}":
- Top keywords MUST describe fit: ${bodyFit.topFit}
- Bottom keywords MUST describe fit: ${bodyFit.bottomFit}
- Outerwear keywords MUST describe fit: ${bodyFit.outerFit}
- This creates visual balance, not just matching body shape

Return ONLY a valid JSON object, no markdown, no explanation:
{
  "outer": ["keyword1", "keyword2"],
  "top": ["keyword1", "keyword2", "keyword3"],
  "bottom": ["keyword1", "keyword2"],
  "shoes": ["keyword1", "keyword2"],
  "bag": ["keyword1"],
  "accessory": ["keyword1", "keyword2"]
}

Each keyword: ${genderLabel} + fit descriptor + item name (e.g., "${genderLabel} oversized linen shirt", "${genderLabel} wide leg trousers")`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 800 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const fallback = getFallbackKeywords(gender, body_type, vibe, season || "");
      return new Response(
        JSON.stringify({ keywords: fallback.keywords, categories: fallback.categories, source: "fallback" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const fallback = getFallbackKeywords(gender, body_type, vibe, season || "");
      return new Response(
        JSON.stringify({ keywords: fallback.keywords, categories: fallback.categories, source: "fallback" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, string[]>;

    const categories: Record<string, string[]> = {};
    const allKeywords: string[] = [];

    for (const cat of CATEGORY_DEFS) {
      const kws = Array.isArray(parsed[cat.key]) ? parsed[cat.key] : [];
      categories[cat.key] = kws;
      allKeywords.push(...kws);
    }

    return new Response(
      JSON.stringify({ keywords: allKeywords, categories, source: "gemini" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getFallbackKeywords(
  gender: string,
  body_type: string,
  vibe: string,
  season: string
): { keywords: string[]; categories: Record<string, string[]> } {
  const g = gender === "MALE" ? "men" : gender === "FEMALE" ? "women" : "unisex";
  const bodyFit = BODY_TYPE_SILHOUETTE[body_type] || BODY_TYPE_SILHOUETTE["regular"];
  const topFit = bodyFit.topFit.split(",")[0].trim();
  const bottomFit = bodyFit.bottomFit.split(",")[0].trim();

  const vibeItems: Record<string, { outer: string[]; top: string[]; bottom: string[]; shoes: string[]; bag: string[]; accessory: string[] }> = {
    ELEVATED_COOL: {
      outer: [`${g} ${bodyFit.outerFit.split(",")[0].trim()} wool overcoat`, `${g} tailored blazer`],
      top: [`${g} ${topFit} turtleneck`, `${g} ${topFit} cotton shirt`, `${g} ${topFit} minimalist t-shirt`],
      bottom: [`${g} ${bottomFit} chino pants`, `${g} ${bottomFit} trousers`],
      shoes: [`${g} leather chelsea boots`, `${g} suede loafers`],
      bag: [`${g} leather crossbody bag`],
      accessory: [`${g} silver watch`, `${g} minimalist belt`],
    },
    EFFORTLESS_NATURAL: {
      outer: [`${g} ${bodyFit.outerFit.split(",")[0].trim()} linen jacket`, `${g} lightweight knit cardigan`],
      top: [`${g} ${topFit} linen shirt`, `${g} ${topFit} organic cotton tee`, `${g} ${topFit} knit sweater`],
      bottom: [`${g} ${bottomFit} linen pants`, `${g} ${bottomFit} chinos`],
      shoes: [`${g} canvas sneakers`, `${g} leather sandals`],
      bag: [`${g} canvas tote bag`],
      accessory: [`${g} woven belt`, `${g} straw hat`],
    },
    ARTISTIC_MINIMAL: {
      outer: [`${g} ${bodyFit.outerFit.split(",")[0].trim()} structured coat`, `${g} minimalist blazer`],
      top: [`${g} ${topFit} boxy t-shirt`, `${g} ${topFit} monochrome shirt`, `${g} ${topFit} long cardigan`],
      bottom: [`${g} ${bottomFit} wide leg pants black`, `${g} ${bottomFit} pleated trousers`],
      shoes: [`${g} minimalist white sneakers`, `${g} slip-on loafers`],
      bag: [`${g} structured minimal bag`],
      accessory: [`${g} geometric earrings`, `${g} simple silver necklace`],
    },
    RETRO_LUXE: {
      outer: [`${g} ${bodyFit.outerFit.split(",")[0].trim()} corduroy jacket`, `${g} heritage wool coat`],
      top: [`${g} ${topFit} retro polo shirt`, `${g} ${topFit} silk shirt`, `${g} ${topFit} turtleneck knit`],
      bottom: [`${g} ${bottomFit} plaid trousers`, `${g} ${bottomFit} corduroy pants`],
      shoes: [`${g} leather penny loafers`, `${g} suede chelsea boots`],
      bag: [`${g} vintage leather bag`],
      accessory: [`${g} retro watch`, `${g} vintage scarf`],
    },
    SPORT_MODERN: {
      outer: [`${g} ${bodyFit.outerFit.split(",")[0].trim()} windbreaker jacket`, `${g} technical zip-up jacket`],
      top: [`${g} ${topFit} performance hoodie`, `${g} ${topFit} mesh polo`, `${g} ${topFit} compression shirt`],
      bottom: [`${g} ${bottomFit} athletic joggers`, `${g} ${bottomFit} track pants`],
      shoes: [`${g} running sneakers`, `${g} training shoes`],
      bag: [`${g} sport crossbody bag`],
      accessory: [`${g} sport watch`, `${g} athletic cap`],
    },
    CREATIVE_LAYERED: {
      outer: [`${g} ${bodyFit.outerFit.split(",")[0].trim()} patchwork jacket`, `${g} oversized bomber jacket`],
      top: [`${g} ${topFit} graphic tee`, `${g} ${topFit} colorblock hoodie`, `${g} ${topFit} printed shirt`],
      bottom: [`${g} ${bottomFit} cargo pants`, `${g} ${bottomFit} patchwork jeans`],
      shoes: [`${g} chunky sneakers`, `${g} platform boots`],
      bag: [`${g} streetwear crossbody bag`],
      accessory: [`${g} bucket hat`, `${g} layered necklace`],
    },
  };

  const items = vibeItems[vibe] || vibeItems["ELEVATED_COOL"];

  if (season === "winter") {
    items.outer[0] = `${g} ${bodyFit.outerFit.split(",")[0].trim()} winter coat warm`;
    items.accessory.push(`${g} warm knit scarf`);
  } else if (season === "summer") {
    items.top[0] = `${g} ${topFit} lightweight summer top`;
    items.bottom[0] = `${g} ${bottomFit} linen summer pants`;
  }

  const categories: Record<string, string[]> = {
    outer: items.outer,
    top: items.top,
    bottom: items.bottom,
    shoes: items.shoes,
    bag: items.bag,
    accessory: items.accessory,
  };

  const keywords = [...items.outer, ...items.top, ...items.bottom, ...items.shoes, ...items.bag, ...items.accessory];

  return { keywords: keywords.slice(0, 12), categories };
}
