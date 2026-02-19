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

    const exampleJson = CATEGORY_DEFS.map(cat =>
      `  "${cat.key}": { ${cat.subCategories.map(s => `"${s}": "keyword"`).join(", ")} }`
    ).join(",\n");

    const vibeAdjStr = vibeAdjs.slice(0, 4).join(" / ");
    const seasonFabricStr = seasonMod.fabric.slice(0, 3).join(" / ") || seasonLabel;

    const topFit1 = bodyFit.topFit.split(",")[0].trim();
    const bottomFit1 = bodyFit.bottomFit.split(",")[0].trim();
    const outerFit1 = bodyFit.outerFit.split(",")[0].trim();
    const vibe1 = vibeAdjs[0];
    const vibe2 = vibeAdjs[1] || vibeAdjs[0];
    const fabric1 = seasonMod.fabric[0] || seasonLabel;
    const fabric2 = seasonMod.fabric[1] || fabric1;

    const prompt = `You are an Amazon fashion search keyword expert. Your job is to generate highly targeted Amazon search queries.

=== INPUT PARAMETERS ===
- Gender: ${genderLabel}
- Body type: ${body_type || "regular"} → fit rule: ${bodyFit.rationale}
- Style vibe: "${vibeLabel}" → descriptors: ${vibeAdjStr}
- Season: "${seasonLabel}" → fabrics: ${seasonFabricStr}

=== MANDATORY KEYWORD FORMULA ===
Every single keyword MUST encode ALL 5 parameters:
  [gender] + [body-type fit] + [season fabric] + [vibe adjective] + [item]

The formula ensures every keyword simultaneously reflects:
1. gender (${genderLabel})
2. body-type appropriate fit (${topFit1} / ${bottomFit1} / ${outerFit1})
3. season-appropriate fabric (${fabric1}, ${fabric2})
4. style vibe character (${vibe1}, ${vibe2})
5. item sub-category

=== CONCRETE EXAMPLES (use as template) ===
- top / tshirt   → "${genderLabel} ${topFit1} ${fabric1} ${vibe1} tshirt"
- top / shirt    → "${genderLabel} ${topFit1} ${fabric1} ${vibe2} shirt"
- outer / coat   → "${genderLabel} ${outerFit1} ${fabric1} ${vibe1} coat"
- outer / puffer → "${genderLabel} ${outerFit1} ${fabric2} ${vibe2} puffer jacket"
- bottom / denim → "${genderLabel} ${bottomFit1} ${vibe1} denim jeans"
- bottom / slacks → "${genderLabel} ${bottomFit1} ${fabric1} ${vibe2} slacks"
- shoes / sneaker → "${genderLabel} ${vibe1} ${fabric1} sneaker"
- bag / tote     → "${genderLabel} ${vibe1} ${fabric1} tote bag"

=== CATEGORIES — generate exactly 1 keyword per sub-type ===
${CATEGORY_DEFS.map(cat => {
  const subList = cat.subCategories.map(s => `"${s}"`).join(", ");
  const fit = cat.key === "outer" ? outerFit1 : cat.key === "bottom" ? bottomFit1 : topFit1;
  return `- ${cat.key} [${subList}]: each keyword = "${genderLabel} ${fit} ${fabric1} ${vibe1} [item]" pattern`;
}).join("\n")}

=== NON-NEGOTIABLE RULES ===
1. keyword length: 4–6 words only (Amazon search best practice)
2. must include body-type fit word (${topFit1}, ${bottomFit1}, or ${outerFit1})
3. must include at least one season fabric (${seasonFabricStr})
4. must include at least one vibe adjective (${vibeAdjStr})
5. NEVER output bland generic keywords — every keyword must have style identity
6. Return ONLY valid JSON, no markdown, no explanation, no trailing commas

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

    let cleanedJson = jsonMatch[0]
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/,(\s*[}\]])/g, "$1");

    let parsed: Record<string, Record<string, string> | string[]>;
    try {
      parsed = JSON.parse(cleanedJson) as Record<string, Record<string, string> | string[]>;
    } catch {
      const fallback = getFallbackKeywords(gender, body_type, vibe, season || "");
      return new Response(
        JSON.stringify({ keywords: fallback.keywords, categories: fallback.categories, source: "fallback" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
