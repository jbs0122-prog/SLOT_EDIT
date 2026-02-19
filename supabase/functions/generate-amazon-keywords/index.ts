import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

const VIBE_ADJECTIVES: Record<string, string[]> = {
  elevated_cool:     ["edgy", "structured", "dark", "sharp", "monochrome", "sleek"],
  effortless_natural: ["earthy", "soft", "natural", "organic", "muted", "linen"],
  artistic_minimal:  ["minimal", "clean", "tonal", "architectural", "understated", "neutral"],
  retro_luxe:        ["vintage", "rich", "retro", "classic", "luxe", "heritage"],
  sport_modern:      ["athletic", "technical", "performance", "sporty", "utility", "active"],
  creative_layered:  ["layered", "eclectic", "textured", "mixed", "bold", "expressive"],
};

const SEASON_MODIFIERS: Record<string, { fabric: string[]; keywords: string[] }> = {
  spring: { fabric: ["cotton", "linen", "light"], keywords: ["spring", "lightweight", "fresh"] },
  summer: { fabric: ["linen", "mesh", "breathable", "lightweight"], keywords: ["summer", "breathable", "sleeveless"] },
  fall:   { fabric: ["wool", "flannel", "corduroy", "tweed"], keywords: ["fall", "layering", "warm-tone"] },
  winter: { fabric: ["wool", "cashmere", "fleece", "thermal", "down"], keywords: ["winter", "warm", "insulated"] },
};

// Each sub-category gets exactly 1 keyword — total = sum of all sub-categories per category
const CATEGORY_DEFS = [
  { key: "outer",     label: "Outer",     subCategories: ["puffer", "coat", "blazer", "jacket", "trench"] },
  { key: "mid",       label: "Mid-layer", subCategories: ["knit", "cardigan", "sweater", "vest", "fleece", "hoodie", "sweatshirt"] },
  { key: "top",       label: "Top",       subCategories: ["tshirt", "shirt", "polo", "turtleneck", "tank"] },
  { key: "bottom",    label: "Bottom",    subCategories: ["denim", "slacks", "chinos", "jogger", "cargo", "shorts"] },
  { key: "shoes",     label: "Shoes",     subCategories: ["sneaker", "derby", "loafer", "boot", "runner"] },
  { key: "bag",       label: "Bag",       subCategories: ["tote", "backpack", "crossbody", "duffle"] },
  { key: "accessory", label: "Accessory", subCategories: ["necktie", "belt", "cap", "scarf", "glove", "watch"] },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    let gender: string, body_type: string, vibe: string, season: string;
    try {
      const rawText = await req.text();
      const cleaned = rawText.trim();
      if (!cleaned) throw new Error("empty body");
      const body = JSON.parse(cleaned);
      gender = body.gender;
      body_type = body.body_type;
      vibe = body.vibe;
      season = body.season;
    } catch (parseErr) {
      return new Response(JSON.stringify({ error: "Invalid or empty request body", detail: (parseErr as Error).message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!gender || !vibe) {
      return new Response(JSON.stringify({ error: "gender and vibe are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const genderLabel = gender === "MALE" ? "men" : gender === "FEMALE" ? "women" : "unisex";
    const vibeKey = vibe.toLowerCase().replace(/\s+/g, "_");
    const vibeLabel = vibe.replace(/_/g, " ").toLowerCase();
    const seasonLabel = (season || "all season").toLowerCase();
    const bodyFit = BODY_TYPE_SILHOUETTE[body_type] || BODY_TYPE_SILHOUETTE["regular"];
    const vibeAdjs = VIBE_ADJECTIVES[vibeKey] || [vibeLabel];
    const seasonMod = SEASON_MODIFIERS[seasonLabel] || { fabric: [], keywords: [] };

    if (!GEMINI_API_KEY) {
      const fallback = getFallbackKeywords(gender, body_type, vibe, season || "");
      return new Response(
        JSON.stringify({ keywords: fallback.keywords, categories: fallback.categories, source: "fallback" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalCount = CATEGORY_DEFS.reduce((s, c) => s + c.subCategories.length, 0);

    const categoryInstructions = CATEGORY_DEFS.map(cat => {
      const subList = cat.subCategories.map(sub => `"${sub}"`).join(", ");
      if (cat.key === "outer") return `- outer: generate 1 keyword per sub-type [${subList}] — fit "${bodyFit.outerFit}", "${vibeLabel}" vibe, season "${seasonLabel}"`;
      if (cat.key === "mid")   return `- mid: generate 1 keyword per sub-type [${subList}] — mid-layer, "${vibeLabel}" vibe, season "${seasonLabel}"`;
      if (cat.key === "top")   return `- top: generate 1 keyword per sub-type [${subList}] — fit "${bodyFit.topFit}", "${vibeLabel}" vibe, season "${seasonLabel}"`;
      if (cat.key === "bottom") return `- bottom: generate 1 keyword per sub-type [${subList}] — fit "${bodyFit.bottomFit}", "${vibeLabel}" vibe, season "${seasonLabel}"`;
      if (cat.key === "shoes") return `- shoes: generate 1 keyword per sub-type [${subList}] — "${vibeLabel}" vibe, season "${seasonLabel}"`;
      if (cat.key === "bag")   return `- bag: generate 1 keyword per sub-type [${subList}] — "${vibeLabel}" vibe, season "${seasonLabel}"`;
      return                          `- accessory: generate 1 keyword per sub-type [${subList}] — "${vibeLabel}" vibe, season "${seasonLabel}"`;
    }).join("\n");

    const exampleJson = CATEGORY_DEFS.map(cat =>
      `  "${cat.key}": { ${cat.subCategories.map(s => `"${s}": "keyword"`).join(", ")} }`
    ).join(",\n");

    const vibeAdjStr = vibeAdjs.slice(0, 3).join(", ");
    const seasonFabricStr = seasonMod.fabric.slice(0, 3).join(", ") || seasonLabel;
    const seasonKwStr = seasonMod.keywords.slice(0, 2).join(", ") || seasonLabel;

    const prompt = `You are a fashion search expert for Amazon. Generate Amazon search keywords for a ${genderLabel} with ${body_type || "regular"} body type.

=== STYLE REQUIREMENTS (MANDATORY) ===
Body type fit principle: ${bodyFit.rationale}
Style vibe: "${vibeLabel}" → use adjectives like: ${vibeAdjStr}
Season: "${seasonLabel}" → prefer fabrics like: ${seasonFabricStr} | season keywords: ${seasonKwStr}

=== KEYWORD FORMAT ===
Each keyword MUST follow this pattern:
  "${genderLabel} [FIT] [VIBE-ADJECTIVE or SEASON-FABRIC] [item]"

Examples for "${vibeLabel}" vibe + "${seasonLabel}" season:
- top/tshirt → "${genderLabel} ${bodyFit.topFit.split(",")[0].trim()} ${vibeAdjs[0]} tshirt"
- outer/coat → "${genderLabel} ${bodyFit.outerFit.split(",")[0].trim()} ${seasonFabricStr.split(",")[0].trim()} coat"
- bottom/denim → "${genderLabel} ${bodyFit.bottomFit.split(",")[0].trim()} ${vibeAdjs[1] || vibeAdjs[0]} denim jeans"

=== CATEGORIES (generate exactly 1 keyword per sub-type) ===
${categoryInstructions}

=== STRICT RULES ===
1. EVERY keyword MUST contain at least one vibe adjective (${vibeAdjStr}) OR season fabric (${seasonFabricStr})
2. Fit MUST match body type rules
3. Do NOT output generic keywords like "men cotton tshirt" — they must have style character
4. Return ONLY valid JSON, no markdown, no explanation

{
${exampleJson}
}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 2000 },
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

    // parsed shape: { outer: { puffer: "kw", coat: "kw", ... }, top: { ... }, ... }
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, Record<string, string> | string[]>;

    const categories: Record<string, string[]> = {};
    const allKeywords: string[] = [];

    for (const cat of CATEGORY_DEFS) {
      const catData = parsed[cat.key];
      let kws: string[] = [];
      if (catData && !Array.isArray(catData) && typeof catData === "object") {
        kws = cat.subCategories.map(sub => (catData as Record<string, string>)[sub]).filter(Boolean);
      } else if (Array.isArray(catData)) {
        kws = catData.filter(Boolean);
      }
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

  const isWinter = season === "winter";
  const isSummer = season === "summer";

  const categories: Record<string, string[]> = {
    outer: [
      `${g} ${outerFit} puffer jacket`,
      `${g} ${outerFit} ${isWinter ? "warm wool" : "classic"} coat`,
      `${g} ${outerFit} tailored blazer`,
      `${g} ${outerFit} casual jacket`,
      `${g} ${outerFit} trench coat`,
    ],
    mid: [
      `${g} ribbed knit sweater`,
      `${g} open-front cardigan`,
      `${g} crewneck sweater`,
      `${g} knit vest`,
      `${g} ${isWinter ? "sherpa" : "lightweight"} fleece`,
      `${g} ${outerFit} hoodie`,
      `${g} pullover sweatshirt`,
    ],
    top: [
      `${g} ${topFit} ${isSummer ? "lightweight" : "cotton"} tshirt`,
      `${g} ${topFit} ${isSummer ? "linen" : "oxford"} shirt`,
      `${g} ${topFit} polo shirt`,
      `${g} ${topFit} turtleneck`,
      `${g} ${isSummer ? "sleeveless" : topFit} tank top`,
    ],
    bottom: [
      `${g} ${bottomFit} ${isSummer ? "light wash" : "dark wash"} denim jeans`,
      `${g} ${bottomFit} tailored slacks`,
      `${g} ${bottomFit} chino pants`,
      `${g} ${bottomFit} jogger pants`,
      `${g} ${bottomFit} cargo pants`,
      `${g} ${isSummer ? "linen" : bottomFit} shorts`,
    ],
    shoes: [
      `${g} casual sneakers`,
      `${g} leather derby shoes`,
      `${g} slip-on loafers`,
      `${g} ${isWinter ? "waterproof" : "leather"} boots`,
      `${g} running shoes`,
    ],
    bag: [
      `${g} canvas tote bag`,
      `${g} casual backpack`,
      `${g} leather crossbody bag`,
      `${g} duffle bag`,
    ],
    accessory: [
      `${g} woven necktie`,
      `${g} leather belt`,
      `${g} ${isSummer ? "baseball" : "wool"} cap`,
      `${g} ${isWinter ? "cashmere" : "light"} scarf`,
      `${g} ${isWinter ? "knit" : "leather"} gloves`,
      `${g} classic watch`,
    ],
  };

  const keywords = Object.values(categories).flat();
  return { keywords, categories };
}
