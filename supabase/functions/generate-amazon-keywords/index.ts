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

const CATEGORY_DEFS = [
  { key: "outer",     label: "Outer",     subCategories: ["puffer", "coat", "blazer", "jacket", "trench"] },
  { key: "mid",       label: "Mid-layer", subCategories: ["knit", "cardigan", "sweater", "vest", "fleece", "hoodie", "sweatshirt"] },
  { key: "top",       label: "Top",       subCategories: ["tshirt", "shirt", "polo", "turtleneck", "tank"] },
  { key: "bottom",    label: "Bottom",    subCategories: ["denim", "slacks", "chinos", "jogger", "cargo", "shorts"] },
  { key: "shoes",     label: "Shoes",     subCategories: ["sneaker", "derby", "loafer", "boot", "runner"] },
  { key: "bag",       label: "Bag",       subCategories: ["tote", "backpack", "crossbody", "duffle"] },
  { key: "accessory", label: "Accessory", subCategories: ["necktie", "belt", "cap", "scarf", "glove", "watch"] },
];

const GENDER_SUB_EXCLUDE: Record<string, string[]> = {
  MALE:   ["tote"],
  FEMALE: ["polo", "derby", "necktie", "cargo"],
};

const VIBE_SUB_EXCLUDE: Record<string, string[]> = {
  elevated_cool:      ["jogger", "runner", "hoodie", "sweatshirt", "cap", "duffle", "cargo"],
  effortless_natural: ["puffer", "blazer", "derby", "necktie", "runner"],
  artistic_minimal:   ["puffer", "hoodie", "sweatshirt", "jogger", "cargo", "runner", "cap", "duffle"],
  retro_luxe:         ["jogger", "runner", "hoodie", "sweatshirt", "puffer", "cargo"],
  sport_modern:       ["blazer", "trench", "coat", "slacks", "necktie", "derby", "loafer", "tote"],
  creative_layered:   ["necktie", "derby"],
};

const VIBE_SUB_ADD: Record<string, Record<string, string[]>> = {
  elevated_cool: {
    shoes: ["chelsea-boot", "combat-boot"],
    outer: ["leather-jacket", "moto-jacket"],
  },
  effortless_natural: {
    shoes: ["sandal", "espadrille"],
    accessory: ["straw-hat", "woven-bracelet"],
  },
  artistic_minimal: {
    shoes: ["minimal-sneaker", "mule"],
  },
  retro_luxe: {
    shoes: ["oxford", "penny-loafer"],
    outer: ["peacoat", "overcoat"],
    accessory: ["pocket-square", "tie-bar"],
  },
  sport_modern: {
    top: ["jersey", "performance-tee"],
    bottom: ["track-pant", "athletic-short"],
    shoes: ["trail-runner", "training-shoe"],
    bag: ["gym-bag", "sling-bag"],
  },
  creative_layered: {
    outer: ["kimono", "poncho"],
    accessory: ["beret", "statement-ring"],
  },
};

const SEASON_SUB_EXCLUDE: Record<string, string[]> = {
  summer: ["puffer", "coat", "trench", "fleece", "sweater", "knit", "cardigan", "turtleneck", "boot", "scarf", "glove"],
  spring: ["puffer", "fleece", "turtleneck", "glove"],
  fall:   ["tank", "shorts", "sandal", "espadrille"],
  winter: ["tank", "shorts", "sandal", "espadrille", "mesh"],
};

const SEASON_CATEGORY_EXCLUDE: Record<string, string[]> = {
  summer: ["outer", "mid"],
};

type CategoryDef = { key: string; label: string; subCategories: string[] };

function buildFilteredCategories(
  gender: string,
  vibeKey: string,
  seasonLabel: string,
): CategoryDef[] {
  const excludedCategories = new Set(SEASON_CATEGORY_EXCLUDE[seasonLabel] || []);
  const genderExclude = new Set(GENDER_SUB_EXCLUDE[gender] || []);
  const vibeExclude = new Set(VIBE_SUB_EXCLUDE[vibeKey] || []);
  const seasonExclude = new Set(SEASON_SUB_EXCLUDE[seasonLabel] || []);
  const vibeAdd = VIBE_SUB_ADD[vibeKey] || {};

  const result: CategoryDef[] = [];

  for (const cat of CATEGORY_DEFS) {
    if (excludedCategories.has(cat.key)) continue;

    const filtered = cat.subCategories.filter(sub =>
      !genderExclude.has(sub) && !vibeExclude.has(sub) && !seasonExclude.has(sub)
    );

    const additions = vibeAdd[cat.key] || [];
    const additionsFiltered = additions.filter(sub =>
      !genderExclude.has(sub) && !seasonExclude.has(sub)
    );

    const merged = [...filtered, ...additionsFiltered];

    if (merged.length > 0) {
      result.push({ key: cat.key, label: cat.label, subCategories: merged });
    }
  }

  return result;
}

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
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const filteredCategoryDefs = buildFilteredCategories(gender, vibeKey, seasonLabel);

    const vibeAdjStr = vibeAdjs.join(", ");
    const seasonFabrics = seasonMod.fabric.join(", ") || "any";
    const seasonKws = seasonMod.keywords.join(", ") || seasonLabel;

    const prompt = `You are a creative fashion stylist who shops on Amazon daily. Generate Amazon search keywords that a real person would type.

STYLING PROFILE:
- Gender: ${genderLabel}
- Body type: ${body_type || "regular"} — ${bodyFit.rationale}
  Recommended fits: tops(${bodyFit.topFit}), bottoms(${bodyFit.bottomFit}), outerwear(${bodyFit.outerFit})
- Style vibe: "${vibeLabel}" — mood words: ${vibeAdjStr}
- Season: ${seasonLabel} — fabrics: ${seasonFabrics} — seasonal cues: ${seasonKws}

INSTRUCTIONS:
Generate one Amazon search keyword per sub-category. Each keyword should:
1. Always start with "${genderLabel}" or "${genderLabel}'s"
2. Reflect the style vibe ("${vibeLabel}") through descriptive words, trend terms, aesthetic references, or specific style names — NOT by repeating the same adjective in every keyword
3. Consider the season (${seasonLabel}) — use season-appropriate fabrics, weights, or styling cues naturally where relevant
4. For tops/bottoms/outerwear, incorporate a fit word that suits the ${body_type || "regular"} body type — but vary which fit word you pick from the recommended list
5. Be 3-6 words long
6. Sound like something a real shopper would search — natural, specific, and varied

DIVERSITY RULES (critical):
- Do NOT use the same adjective or descriptor more than twice across all keywords
- Mix up keyword structures: some can lead with fabric, some with style, some with fit, some with color mood
- Use specific fashion vocabulary: texture names, garment details, style subcultures, color tones
- Think about what makes each sub-category item unique within the "${vibeLabel}" aesthetic
- Avoid formulaic patterns — each keyword should feel like a different person searching

GOOD examples for "elevated cool" + winter + slim:
- "men oversized wool mock neck sweater"
- "men dark structured puffer jacket"
- "men slim tapered black cargo pants"
- "men minimalist leather chelsea boot"
- "men monochrome knit beanie"

BAD examples (too repetitive / formulaic):
- "men oversized wool edgy tshirt" / "men oversized wool edgy polo" / "men oversized wool edgy tank"

OUTPUT: Return ONLY a valid JSON object with this exact structure:
${JSON.stringify(
  Object.fromEntries(filteredCategoryDefs.map(cat => [
    cat.key,
    Object.fromEntries(cat.subCategories.map(s => [s, ""]))
  ])),
  null, 2
)}

Fill every empty string with a keyword. Return only JSON, nothing else.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1.0, maxOutputTokens: 2000, responseMimeType: "application/json" },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(
        JSON.stringify({ error: "Gemini API error", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Gemini returned no valid JSON", raw: rawText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanedJson = jsonMatch[0]
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/,(\s*[}\]])/g, "$1");

    let parsed: Record<string, Record<string, string> | string[]>;
    try {
      parsed = JSON.parse(cleanedJson) as Record<string, Record<string, string> | string[]>;
    } catch (parseErr) {
      return new Response(
        JSON.stringify({ error: "Failed to parse Gemini JSON", detail: (parseErr as Error).message, raw: rawText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categories: Record<string, string[]> = {};
    const allKeywords: string[] = [];

    for (const cat of filteredCategoryDefs) {
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
