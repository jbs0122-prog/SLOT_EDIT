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
  { key: "outer", label: "Outer", subCategories: [
    "puffer", "coat", "blazer", "jacket", "trench", "bomber", "parka", "peacoat",
    "anorak", "windbreaker", "biker_jacket", "denim_jacket", "coach_jacket",
    "varsity_jacket", "shearling", "field_jacket", "harrington", "quilted_jacket",
    "cape", "poncho", "kimono", "noragi", "chore_coat", "safari_jacket",
    "utility_jacket", "gilet", "faux_fur", "track_jacket", "shacket", "tweed_jacket",
  ]},
  { key: "mid", label: "Mid-layer", subCategories: [
    "knit", "cardigan", "sweater", "vest", "fleece", "hoodie", "sweatshirt",
    "half_zip", "cable_knit", "argyle_sweater", "fair_isle", "cricket_jumper",
    "mock_neck", "quilted_vest", "down_vest", "fleece_vest", "knitted_vest",
    "cashmere_sweater", "boucle_knit", "mohair_knit", "crochet_cardigan",
  ]},
  { key: "top", label: "Top", subCategories: [
    "tshirt", "shirt", "polo", "turtleneck", "tank", "blouse", "oxford_shirt",
    "linen_shirt", "silk_blouse", "graphic_tee", "rugby_shirt", "henley",
    "crop_top", "camisole", "bodysuit", "tunic", "breton_stripe", "band_tee",
    "jersey", "wrap_top", "peasant_blouse", "flannel_shirt", "denim_shirt",
    "chambray", "western_shirt", "performance_tee", "compression_top",
    "mesh_top", "lace_top", "embroidered_blouse", "halter_top",
  ]},
  { key: "bottom", label: "Bottom", subCategories: [
    "denim", "slacks", "chinos", "jogger", "cargo", "shorts", "wide_leg",
    "culottes", "pleated_trousers", "leather_pants", "corduroy_pants",
    "parachute_pants", "track_pants", "linen_trousers", "maxi_skirt",
    "midi_skirt", "mini_skirt", "pencil_skirt", "pleated_skirt", "wrap_skirt",
    "flared_jeans", "baggy_jeans", "carpenter_pants", "overalls",
    "bermuda_shorts", "biker_shorts", "leggings", "sweatpants",
    "harem_pants", "tiered_skirt", "tennis_skirt",
  ]},
  { key: "shoes", label: "Shoes", subCategories: [
    "sneaker", "derby", "loafer", "boot", "runner", "chelsea_boot",
    "combat_boot", "ankle_boot", "knee_boot", "hiking_boot", "desert_boot",
    "work_boot", "mule", "slide", "sandal", "espadrille", "clog",
    "mary_jane", "ballet_flat", "oxford", "brogue", "monk_strap",
    "platform", "kitten_heel", "block_heel", "slingback", "boat_shoe",
    "moccasin", "western_boot", "tabi", "trail_runner", "training_shoe",
    "high_top", "creeper",
  ]},
  { key: "bag", label: "Bag", subCategories: [
    "tote", "backpack", "crossbody", "duffle", "clutch", "shoulder_bag",
    "satchel", "messenger", "bucket_bag", "hobo", "belt_bag", "sling",
    "baguette", "box_bag", "frame_bag", "saddle_bag", "doctor_bag",
    "wristlet", "briefcase", "gym_bag", "camera_bag", "weekender",
    "straw_bag", "woven_bag", "canvas_tote", "chain_bag", "sacoche",
  ]},
  { key: "accessory", label: "Accessory", subCategories: [
    "necktie", "belt", "cap", "scarf", "glove", "watch", "sunglasses",
    "beanie", "bucket_hat", "beret", "headband", "choker", "chain_necklace",
    "pendant", "pearl_necklace", "hoop_earring", "ring", "bracelet",
    "bangle", "brooch", "hair_clip", "bow_tie", "suspenders", "silk_scarf",
    "bandana", "anklet", "ear_cuff", "wide_brim_hat", "visor",
  ]},
];

const VIBE_ITEM_POOL: Record<string, Record<string, string[]>> = {
  elevated_cool: {
    outer: ["oversized wool coat", "structured trench", "leather blazer", "cropped tailored jacket", "tuxedo jacket", "cape blazer", "biker jacket", "coach jacket", "technical bomber", "shearling jacket", "nylon trench"],
    top: ["high-neck knit", "crisp poplin shirt", "silk button-down", "structured tee", "satin blouse", "mock-neck sweat", "boxy tee", "cashmere hoodie", "oxford shirt", "polo shirt"],
    bottom: ["wide-leg wool trousers", "leather pants", "pleated trousers", "cigarette pants", "cargo sweats", "parachute pants", "track pants", "tailored joggers", "raw denim", "chinos"],
    shoes: ["square-toe boots", "chunky loafers", "chelsea boots", "combat boots", "sock boots", "dad sneakers", "high-top sneakers", "tabi boots", "leather sneakers", "platform loafers"],
    bag: ["geometric tote", "box bag", "metal clutch", "sling bag", "chest rig", "belt bag", "cassette bag", "briefcase", "tech backpack", "crossbody box"],
    accessory: ["silver chain", "metal sunglasses", "leather gloves", "chain necklace", "beanie", "bucket hat", "shield sunglasses", "industrial belt", "wallet chain", "smart watch"],
  },
  effortless_natural: {
    outer: ["collarless liner", "kimono cardigan", "robe coat", "chore coat", "linen jacket", "trench coat", "wool blazer", "field jacket", "duffle coat", "barn jacket"],
    top: ["linen tunic", "organic tee", "wrap top", "breton stripe tee", "cashmere crew", "silk blouse", "chambray shirt", "flannel shirt", "grandad shirt", "boat neck tee"],
    bottom: ["wide linen trousers", "drawstring pants", "culottes", "midi skirt", "vintage denim", "white jeans", "fatigue pants", "corduroy trousers", "wide chinos", "slip skirt"],
    shoes: ["suede mules", "leather slides", "canvas sneakers", "clogs", "espadrilles", "ballet flats", "desert boots", "wallabees", "mary janes", "moccasins"],
    bag: ["soft hobo", "canvas tote", "straw bag", "woven bag", "basket bag", "satchel", "backpack", "messenger", "bucket bag", "market tote"],
    accessory: ["silk scarf", "gold hoops", "beret", "straw hat", "wooden beads", "leather belt", "cotton scarf", "pearl studs", "minimalist watch", "canvas belt"],
  },
  artistic_minimal: {
    outer: ["collarless coat", "cocoon coat", "kimono jacket", "cape coat", "asymmetric jacket", "boucle coat", "shearling jacket", "crushed velvet jacket", "draped cardigan", "wrap jacket"],
    top: ["tunic shirt", "asymmetric knit", "pleated top", "cowl neck", "sheer mesh top", "mohair knit", "ribbed tank", "organza blouse", "structured tee", "bias cut top"],
    bottom: ["culottes", "wide cropped trousers", "barrel pants", "hakama", "pleated skirt", "satin pants", "leather skirt", "balloon pants", "sarouel pants", "jersey pants"],
    shoes: ["tabi boots", "architectural mules", "square flats", "sock boots", "minimal sneakers", "sculptural heels", "velvet slippers", "platform sandals", "glove shoes", "soft boots"],
    bag: ["pleated tote", "geometric bag", "origami bag", "circle bag", "slouchy sack", "knot bag", "portfolio", "soft tote", "dumpling bag", "envelope bag"],
    accessory: ["sculptural bangle", "bold eyewear", "single earring", "geometric necklace", "velvet choker", "crystal earrings", "layered bangles", "long necklace", "statement ring", "head wrap"],
  },
  retro_luxe: {
    outer: ["shearling coat", "velvet blazer", "cape", "afghan coat", "tapestry jacket", "suede jacket", "tweed jacket", "quilted jacket", "barbour jacket", "camel coat"],
    top: ["embroidered blouse", "lace top", "peasant blouse", "corset top", "pussy-bow blouse", "cable sweater", "printed shirt", "silk blouse", "cashmere turtle", "halter top"],
    bottom: ["wool maxi skirt", "velvet trousers", "corduroy pants", "flared jeans", "suede skirt", "pleated skirt", "riding pants", "wool skirt", "culottes", "tiered skirt"],
    shoes: ["lace-up boots", "mary janes", "western boots", "clogs", "riding boots", "horsebit loafers", "platform boots", "kitten heels", "penny loafers", "slingbacks"],
    bag: ["tapestry bag", "frame bag", "saddle bag", "structured handbag", "bucket bag", "vintage handbag", "wicker bag", "doctor bag", "canvas tote", "box bag"],
    accessory: ["headscarf", "pearl earrings", "pearl necklace", "tinted sunglasses", "wide brim hat", "silk scarf", "cameo", "gold hoops", "leather belt", "bangle stack"],
  },
  sport_modern: {
    outer: ["3-layer shell", "windbreaker", "puffer", "fleece", "anorak", "track jacket", "cropped puffer", "coach jacket", "softshell", "rain jacket"],
    top: ["performance tee", "compression top", "mock neck", "half-zip", "graphic tee", "sports bra", "soccer jersey", "training top", "rugby shirt", "mesh top"],
    bottom: ["cargo pants", "joggers", "hiking shorts", "leggings", "track pants", "biker shorts", "running shorts", "yoga pants", "nylon pants", "tennis skirt"],
    shoes: ["trail runners", "running shoes", "hiking boots", "training shoes", "slides", "chunky sneakers", "high-tops", "sock sneakers", "terrace sneakers", "platform sneakers"],
    bag: ["sacoche", "backpack", "chest rig", "gym bag", "sling", "belt bag", "duffle", "hydration pack", "crossbody", "drawstring bag"],
    accessory: ["bucket hat", "sunglasses", "beanie", "cap", "headband", "visor", "sweatband", "fitness tracker", "carabiner", "utility belt"],
  },
  creative_layered: {
    outer: ["leather biker", "denim jacket", "leopard coat", "vinyl trench", "patchwork jacket", "faux fur coat", "military jacket", "fleece", "tapestry coat", "field jacket"],
    top: ["corset", "band tee", "mesh bodysuit", "fishnet top", "graphic tee", "lace blouse", "crochet top", "floral shirt", "hawaiian shirt", "animal print top"],
    bottom: ["ripped jeans", "cargo mini", "plaid skirt", "leather pants", "tulle skirt", "checkered pants", "patchwork jeans", "velvet skirt", "colored denim", "floral skirt"],
    shoes: ["combat boots", "mary janes", "creepers", "platform boots", "cowboy boots", "studded boots", "high-tops", "sneakers", "chelsea boots", "loafers"],
    bag: ["backpack", "chain bag", "studded bag", "guitar strap bag", "tapestry bag", "patchwork bag", "novelty bag", "fringe bag", "beaded bag", "sequin bag"],
    accessory: ["choker", "safety pins", "beret", "brooch", "bandana", "chain necklace", "hair clips", "arm warmer", "tights", "wide belt"],
  },
};

const GENDER_SUB_EXCLUDE: Record<string, string[]> = {
  MALE:   ["clutch", "baguette", "wristlet", "kitten_heel", "slingback", "ballet_flat", "mary_jane", "camisole", "crop_top", "halter_top", "pearl_necklace", "anklet", "hair_clip", "tiered_skirt", "tennis_skirt"],
  FEMALE: ["necktie", "bow_tie", "suspenders"],
};

const VIBE_SUB_EXCLUDE: Record<string, string[]> = {
  elevated_cool: [
    "jogger", "hoodie", "sweatshirt", "cap", "duffle", "cargo",
    "espadrille", "moccasin", "boat_shoe", "straw_bag", "woven_bag",
    "peasant_blouse", "western_shirt", "overalls", "bandana", "wide_brim_hat",
  ],
  effortless_natural: [
    "puffer", "biker_jacket", "track_jacket", "necktie", "bomber",
    "combat_boot", "platform", "high_top", "chest_rig", "sacoche",
    "compression_top", "performance_tee", "biker_shorts", "track_pants",
    "chain_necklace", "industrial_belt", "visor",
  ],
  artistic_minimal: [
    "puffer", "hoodie", "sweatshirt", "jogger", "cargo", "cap", "duffle",
    "varsity_jacket", "coach_jacket", "bomber", "denim_jacket",
    "rugby_shirt", "graphic_tee", "band_tee", "western_shirt",
    "sneaker", "runner", "trail_runner", "training_shoe",
    "gym_bag", "backpack", "bandana", "visor",
  ],
  retro_luxe: [
    "jogger", "hoodie", "sweatshirt", "puffer", "cargo",
    "track_jacket", "anorak", "windbreaker", "coach_jacket",
    "compression_top", "performance_tee", "mesh_top", "sports_bra",
    "biker_shorts", "leggings", "track_pants", "parachute_pants",
    "sneaker", "runner", "trail_runner", "training_shoe", "high_top",
    "gym_bag", "sacoche", "chest_rig", "visor", "sweatband",
  ],
  sport_modern: [
    "blazer", "trench", "coat", "peacoat", "tweed_jacket",
    "slacks", "necktie", "bow_tie", "suspenders", "derby", "loafer",
    "oxford", "brogue", "monk_strap", "kitten_heel", "slingback",
    "briefcase", "baguette", "frame_bag", "doctor_bag",
    "silk_blouse", "peasant_blouse", "lace_top", "embroidered_blouse",
    "pencil_skirt", "wrap_skirt", "silk_scarf", "pearl_necklace", "beret",
  ],
  creative_layered: [
    "necktie", "derby", "oxford", "monk_strap",
    "briefcase", "portfolio", "sacoche",
    "compression_top", "performance_tee",
  ],
};

const SEASON_SUB_EXCLUDE: Record<string, string[]> = {
  summer: [
    "puffer", "coat", "trench", "fleece", "sweater", "knit", "cardigan",
    "turtleneck", "boot", "chelsea_boot", "combat_boot", "ankle_boot",
    "knee_boot", "hiking_boot", "desert_boot", "work_boot", "western_boot",
    "scarf", "glove", "beanie", "down_vest", "fleece_vest", "shearling",
    "cable_knit", "fair_isle", "cashmere_sweater", "mohair_knit",
    "leather_pants", "corduroy_pants", "sweatpants", "velvet_skirt",
  ],
  spring: [
    "puffer", "fleece", "turtleneck", "glove", "down_vest", "shearling",
    "cashmere_sweater", "fair_isle", "cable_knit",
  ],
  fall: [
    "tank", "shorts", "sandal", "espadrille", "slide", "bermuda_shorts",
    "biker_shorts", "crop_top", "halter_top", "sports_bra", "camisole",
    "straw_bag", "straw_hat",
  ],
  winter: [
    "tank", "shorts", "sandal", "espadrille", "slide", "bermuda_shorts",
    "biker_shorts", "crop_top", "halter_top", "sports_bra", "camisole",
    "straw_bag", "straw_hat", "linen_shirt", "linen_trousers",
  ],
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

  const result: CategoryDef[] = [];

  for (const cat of CATEGORY_DEFS) {
    if (excludedCategories.has(cat.key)) continue;

    const filtered = cat.subCategories.filter(sub =>
      !genderExclude.has(sub) && !vibeExclude.has(sub) && !seasonExclude.has(sub)
    );

    if (filtered.length > 0) {
      result.push({ key: cat.key, label: cat.label, subCategories: filtered });
    }
  }

  return result;
}

function getVibeItemPoolSection(vibeKey: string): string {
  const pool = VIBE_ITEM_POOL[vibeKey];
  if (!pool) return "";

  const lines: string[] = [];
  for (const [cat, items] of Object.entries(pool)) {
    lines.push(`  ${cat}: ${items.join(", ")}`);
  }
  return lines.join("\n");
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
    const vibeItemPool = getVibeItemPoolSection(vibeKey);

    const prompt = `You are a creative fashion stylist who shops on Amazon daily. Generate Amazon search keywords that a real person would type.

STYLING PROFILE:
- Gender: ${genderLabel}
- Body type: ${body_type || "regular"} — ${bodyFit.rationale}
  Recommended fits: tops(${bodyFit.topFit}), bottoms(${bodyFit.bottomFit}), outerwear(${bodyFit.outerFit})
- Style vibe: "${vibeLabel}" — mood words: ${vibeAdjStr}
- Season: ${seasonLabel} — fabrics: ${seasonFabrics} — seasonal cues: ${seasonKws}

VIBE-SPECIFIC ITEM REFERENCE (use these as inspiration for the "${vibeLabel}" aesthetic):
${vibeItemPool}

INSTRUCTIONS:
Generate one Amazon search keyword per sub-category. Each keyword should:
1. Always start with "${genderLabel}" or "${genderLabel}'s"
2. Reflect the style vibe ("${vibeLabel}") through descriptive words, trend terms, aesthetic references, or specific style names — NOT by repeating the same adjective in every keyword
3. Reference the VIBE-SPECIFIC ITEM REFERENCE above — use specific garment names, details, and vocabulary from the item pool to make keywords more targeted
4. Consider the season (${seasonLabel}) — use season-appropriate fabrics, weights, or styling cues naturally where relevant
5. For tops/bottoms/outerwear, incorporate a fit word that suits the ${body_type || "regular"} body type — but vary which fit word you pick from the recommended list
6. Be 3-6 words long
7. Sound like something a real shopper would search — natural, specific, and varied

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
          generationConfig: { temperature: 1.0, maxOutputTokens: 4000, responseMimeType: "application/json" },
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
