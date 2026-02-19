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

// Matches the 7 product.category values + their sub_categories from ProductForm.tsx
const CATEGORY_DEFS = [
  { key: "outer",     label: "Outer",     count: 2, subCategories: ["puffer", "coat", "blazer", "jacket", "trench"] },
  { key: "mid",       label: "Mid-layer", count: 1, subCategories: ["knit", "cardigan", "sweater", "vest", "fleece", "hoodie", "sweatshirt"] },
  { key: "top",       label: "Top",       count: 2, subCategories: ["tshirt", "shirt", "polo", "turtleneck", "tank"] },
  { key: "bottom",    label: "Bottom",    count: 2, subCategories: ["denim", "slacks", "chinos", "jogger", "cargo", "shorts"] },
  { key: "shoes",     label: "Shoes",     count: 2, subCategories: ["sneaker", "derby", "loafer", "boot", "runner"] },
  { key: "bag",       label: "Bag",       count: 1, subCategories: ["tote", "backpack", "crossbody", "duffle"] },
  { key: "accessory", label: "Accessory", count: 2, subCategories: ["necktie", "belt", "cap", "scarf", "glove", "watch"] },
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
      const subs = cat.subCategories.join(", ");
      if (cat.key === "outer") return `- outer (${cat.count} keywords): pick ${cat.count} sub-types from [${subs}], fit "${bodyFit.outerFit}"`;
      if (cat.key === "mid") return `- mid (${cat.count} keyword): pick 1 sub-type from [${subs}] — worn as mid-layer`;
      if (cat.key === "top") return `- top (${cat.count} keywords): pick ${cat.count} sub-types from [${subs}], fit "${bodyFit.topFit}"`;
      if (cat.key === "bottom") return `- bottom (${cat.count} keywords): pick ${cat.count} sub-types from [${subs}], fit "${bodyFit.bottomFit}"`;
      if (cat.key === "shoes") return `- shoes (${cat.count} keywords): pick ${cat.count} sub-types from [${subs}] matching "${vibeLabel}"`;
      if (cat.key === "bag") return `- bag (${cat.count} keyword): pick 1 sub-type from [${subs}] matching "${vibeLabel}"`;
      return `- accessory (${cat.count} keywords): pick ${cat.count} sub-types from [${subs}] matching "${vibeLabel}"`;
    }).join("\n");

    const totalCount = CATEGORY_DEFS.reduce((s, c) => s + c.count, 0);

    const prompt = `You are a fashion search expert for Amazon. Generate search keywords for a ${genderLabel} with ${body_type || "regular"} body type.

Body type styling principle: ${bodyFit.rationale}

Style vibe: ${vibeLabel}
Season: ${seasonLabel}

Generate exactly ${totalCount} keywords organized by these 7 categories:
${categoryInstructions}

IMPORTANT silhouette rules (body type "${body_type || "regular"}"):
- outer/top fit: ${bodyFit.outerFit} / ${bodyFit.topFit}
- bottom fit: ${bodyFit.bottomFit}
- mid-layer: knit, cardigan, or hoodie that layers well

Return ONLY a valid JSON object with exactly these 7 keys, no markdown, no explanation:
{
  "outer": ["keyword1", "keyword2"],
  "mid": ["keyword1"],
  "top": ["keyword1", "keyword2"],
  "bottom": ["keyword1", "keyword2"],
  "shoes": ["keyword1", "keyword2"],
  "bag": ["keyword1"],
  "accessory": ["keyword1", "keyword2"]
}

Each keyword format: ${genderLabel} + style/fit descriptor + item name`;

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

  const outerFit = bodyFit.outerFit.split(",")[0].trim();

  const vibeItems: Record<string, { outer: string[]; mid: string[]; top: string[]; bottom: string[]; shoes: string[]; bag: string[]; accessory: string[] }> = {
    ELEVATED_COOL: {
      outer: [`${g} ${outerFit} wool overcoat`, `${g} tailored blazer`],
      mid: [`${g} merino wool crewneck sweater`],
      top: [`${g} ${topFit} turtleneck shirt`, `${g} ${topFit} cotton dress shirt`],
      bottom: [`${g} ${bottomFit} chino pants`, `${g} ${bottomFit} tailored trousers`],
      shoes: [`${g} leather chelsea boots`, `${g} suede loafers`],
      bag: [`${g} leather crossbody bag`],
      accessory: [`${g} silver watch`, `${g} minimalist leather belt`],
    },
    EFFORTLESS_NATURAL: {
      outer: [`${g} ${outerFit} linen jacket`, `${g} ${outerFit} cotton field jacket`],
      mid: [`${g} lightweight knit cardigan`],
      top: [`${g} ${topFit} linen shirt`, `${g} ${topFit} organic cotton tee`],
      bottom: [`${g} ${bottomFit} linen pants`, `${g} ${bottomFit} chinos`],
      shoes: [`${g} canvas sneakers`, `${g} leather sandals`],
      bag: [`${g} canvas tote bag`],
      accessory: [`${g} woven belt`, `${g} straw hat`],
    },
    ARTISTIC_MINIMAL: {
      outer: [`${g} ${outerFit} structured wool coat`, `${g} ${outerFit} minimalist blazer`],
      mid: [`${g} fine knit long cardigan`],
      top: [`${g} ${topFit} boxy t-shirt`, `${g} ${topFit} monochrome shirt`],
      bottom: [`${g} ${bottomFit} wide leg pants black`, `${g} ${bottomFit} pleated trousers`],
      shoes: [`${g} minimalist white sneakers`, `${g} slip-on loafers`],
      bag: [`${g} structured minimal tote bag`],
      accessory: [`${g} geometric earrings`, `${g} simple silver necklace`],
    },
    RETRO_LUXE: {
      outer: [`${g} ${outerFit} corduroy jacket`, `${g} ${outerFit} heritage wool coat`],
      mid: [`${g} ribbed knit polo sweater`],
      top: [`${g} ${topFit} retro polo shirt`, `${g} ${topFit} silk shirt`],
      bottom: [`${g} ${bottomFit} plaid trousers`, `${g} ${bottomFit} corduroy pants`],
      shoes: [`${g} leather penny loafers`, `${g} suede chelsea boots`],
      bag: [`${g} vintage leather bag`],
      accessory: [`${g} retro watch`, `${g} vintage silk scarf`],
    },
    SPORT_MODERN: {
      outer: [`${g} ${outerFit} windbreaker jacket`, `${g} ${outerFit} technical shell jacket`],
      mid: [`${g} zip-up fleece hoodie`],
      top: [`${g} ${topFit} performance t-shirt`, `${g} ${topFit} mesh polo`],
      bottom: [`${g} ${bottomFit} athletic joggers`, `${g} ${bottomFit} track pants`],
      shoes: [`${g} running sneakers`, `${g} training shoes`],
      bag: [`${g} sport crossbody bag`],
      accessory: [`${g} sport watch`, `${g} athletic cap`],
    },
    CREATIVE_LAYERED: {
      outer: [`${g} ${outerFit} oversized bomber jacket`, `${g} ${outerFit} patchwork jacket`],
      mid: [`${g} colorblock zip-up hoodie`],
      top: [`${g} ${topFit} graphic tee`, `${g} ${topFit} printed shirt`],
      bottom: [`${g} ${bottomFit} cargo pants`, `${g} ${bottomFit} wide leg jeans`],
      shoes: [`${g} chunky sneakers`, `${g} platform boots`],
      bag: [`${g} streetwear crossbody bag`],
      accessory: [`${g} bucket hat`, `${g} layered chain necklace`],
    },
  };

  const items = vibeItems[vibe] || vibeItems["ELEVATED_COOL"];

  if (season === "winter") {
    items.outer[0] = `${g} ${outerFit} warm winter coat`;
    items.mid[0] = `${g} thermal knit sweater`;
  } else if (season === "summer") {
    items.top[0] = `${g} ${topFit} lightweight summer shirt`;
    items.bottom[0] = `${g} ${bottomFit} linen summer pants`;
    items.mid[0] = `${g} lightweight open-front cardigan`;
  }

  const categories: Record<string, string[]> = {
    outer: items.outer,
    mid: items.mid,
    top: items.top,
    bottom: items.bottom,
    shoes: items.shoes,
    bag: items.bag,
    accessory: items.accessory,
  };

  const keywords = [...items.outer, ...items.mid, ...items.top, ...items.bottom, ...items.shoes, ...items.bag, ...items.accessory];

  return { keywords: keywords.slice(0, 12), categories };
}
