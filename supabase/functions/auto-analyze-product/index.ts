import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VIBE_DNA: Record<string, {
  formality_range: [number, number];
  color_palette: { primary: string[]; secondary: string[]; accent: string[] };
  material_preferences: string[];
}> = {
  ELEVATED_COOL: {
    formality_range: [5, 9],
    color_palette: { primary: ["black", "charcoal", "navy", "white"], secondary: ["grey", "cream", "camel"], accent: ["burgundy", "metallic", "wine"] },
    material_preferences: ["structured", "luxe", "classic"],
  },
  EFFORTLESS_NATURAL: {
    formality_range: [2, 6],
    color_palette: { primary: ["beige", "cream", "ivory", "white"], secondary: ["olive", "khaki", "tan", "sage", "brown"], accent: ["rust", "mustard", "burgundy"] },
    material_preferences: ["classic", "eco", "knit"],
  },
  ARTISTIC_MINIMAL: {
    formality_range: [3, 8],
    color_palette: { primary: ["black", "white", "grey", "charcoal"], secondary: ["cream", "beige", "navy"], accent: ["rust", "olive", "burgundy"] },
    material_preferences: ["classic", "structured", "eco", "knit"],
  },
  RETRO_LUXE: {
    formality_range: [3, 8],
    color_palette: { primary: ["burgundy", "navy", "brown", "cream"], secondary: ["camel", "olive", "wine", "beige"], accent: ["rust", "mustard", "teal", "gold"] },
    material_preferences: ["luxe", "structured", "classic", "knit"],
  },
  SPORT_MODERN: {
    formality_range: [0, 4],
    color_palette: { primary: ["black", "grey", "white", "navy"], secondary: ["olive", "khaki", "charcoal"], accent: ["orange", "teal", "red", "green"] },
    material_preferences: ["technical", "casual", "blend"],
  },
  CREATIVE_LAYERED: {
    formality_range: [0, 5],
    color_palette: { primary: ["black", "grey", "white", "denim"], secondary: ["burgundy", "brown", "olive", "navy"], accent: ["red", "purple", "orange", "pink", "yellow"] },
    material_preferences: ["structured", "casual", "classic", "sheer"],
  },
};

const COLOR_FAMILY_MAP: Record<string, string> = {
  gray: "grey", "light gray": "grey", "dark gray": "charcoal", "dark grey": "charcoal",
  multicolor: "multi", "multi-color": "multi", nude: "beige", sand: "beige", taupe: "beige",
  "light blue": "sky_blue", "sky blue": "sky_blue", "dark blue": "navy",
  "light brown": "tan", maroon: "burgundy", "dark red": "burgundy",
  turquoise: "teal", cyan: "teal", "light green": "sage", gold: "metallic", silver: "metallic",
  copper: "metallic", "off-white": "cream", ecru: "ivory", "off white": "cream",
};

const VALID_COLOR_FAMILIES = new Set([
  "black", "white", "grey", "navy", "beige", "brown", "blue", "green",
  "red", "yellow", "purple", "pink", "orange", "metallic", "multi",
  "khaki", "cream", "ivory", "burgundy", "wine", "olive", "mustard",
  "coral", "charcoal", "tan", "camel", "rust", "sage", "mint",
  "lavender", "teal", "sky_blue", "denim",
]);

function normalizeColorFamily(raw: string): string {
  if (!raw) return "black";
  const lower = raw.toLowerCase().trim();
  if (VALID_COLOR_FAMILIES.has(lower)) return lower;
  if (COLOR_FAMILY_MAP[lower]) return COLOR_FAMILY_MAP[lower];
  for (const [key, val] of Object.entries(COLOR_FAMILY_MAP)) {
    if (lower.includes(key)) return val;
  }
  for (const valid of VALID_COLOR_FAMILIES) {
    if (lower.includes(valid)) return valid;
  }
  return "black";
}

const COLOR_TONE_MAP: Record<string, string> = {
  black: "neutral", white: "neutral", grey: "cool", charcoal: "cool",
  navy: "cool", beige: "warm", cream: "warm", ivory: "warm",
  brown: "warm", tan: "warm", camel: "warm", olive: "warm",
  khaki: "warm", sage: "cool", rust: "warm", mustard: "warm",
  burgundy: "warm", wine: "warm", denim: "cool",
  red: "warm", blue: "cool", green: "cool", yellow: "warm",
  orange: "warm", pink: "warm", purple: "cool", coral: "warm",
  teal: "cool", mint: "cool", sky_blue: "cool", lavender: "cool",
  metallic: "neutral", multi: "neutral",
};

const SUB_CAT_FORMALITY: Record<string, number> = {
  blazer: 4, suit_jacket: 5, dress_shirt: 4, slacks: 4, dress_pants: 4,
  pencil_skirt: 4, trench: 4, oxford_shirt: 4, loafer: 4, heel: 4, derby: 4,
  necktie: 5, tuxedo_jacket: 5,
  blouse: 3, cardigan: 3, polo: 3, chinos: 3, turtleneck: 3,
  sweater: 3, coat: 4, boot: 3, midi_skirt: 3,
  tshirt: 2, hoodie: 2, sweatshirt: 2, denim_jacket: 2, jeans: 2, denim: 2,
  jogger: 1, shorts: 2, cargo: 2, sneaker: 2, sandal: 1, backpack: 2,
  track_jacket: 1, windbreaker: 1, puffer: 2, leggings: 1, track_pants: 1,
  sports_bra: 1, performance_tee: 1,
};

const MATERIAL_WARMTH: Record<string, number> = {
  down: 5, wool: 4, cashmere: 4, fleece: 4, sherpa: 5, shearling: 5,
  tweed: 4, corduroy: 3, flannel: 3, denim: 3, cotton: 2,
  linen: 1, silk: 2, satin: 2, chiffon: 1, mesh: 1, nylon: 2,
  polyester: 2, jersey: 2, leather: 3, suede: 3, velvet: 3,
  technical: 2, canvas: 2,
};

const CATEGORY_WARMTH_DEFAULT: Record<string, number> = {
  outer: 4, mid: 3, top: 2, bottom: 2, shoes: 3, bag: 3, accessory: 3,
};

function inferWarmth(material: string, category: string, subCategory: string, season?: string): number {
  const mat = (material || "").toLowerCase();
  for (const [key, warmth] of Object.entries(MATERIAL_WARMTH)) {
    if (mat.includes(key)) return warmth;
  }

  const sub = (subCategory || "").toLowerCase();
  if (/puffer|parka|duffle|shearling|sherpa/.test(sub)) return 5;
  if (/coat|trench|blazer|biker|bomber|varsity/.test(sub)) return 4;
  if (/sweater|cardigan|cable_knit|turtleneck|hoodie|sweatshirt|fleece/.test(sub)) return 4;
  if (/denim_jacket|field_jacket|windbreaker|track_jacket/.test(sub)) return 3;
  if (/tshirt|tank|camisole|sports_bra|mesh_top|shorts|sandal|slide|mule/.test(sub)) return 1;
  if (/polo|henley|blouse|shirt|linen/.test(sub)) return 2;
  if (/chinos|jogger|leggings|sneaker|runner|loafer/.test(sub)) return 2;

  const base = CATEGORY_WARMTH_DEFAULT[category] || 3;
  if (season === "summer") return Math.max(1, base - 1);
  if (season === "winter") return Math.min(5, base + 1);
  return base;
}

const EXTENDED_SUB_CAT_FORMALITY: Record<string, number> = {
  blazer: 4, suit_jacket: 5, tuxedo_jacket: 5, dress_shirt: 4, slacks: 4,
  dress_pants: 4, pleated_trousers: 4, silk_blouse: 4, wide_leg: 3,
  pencil_skirt: 4, trench: 3, oxford_shirt: 3, loafer: 3, heel: 4,
  derby: 3, oxford: 4, monk_strap: 4, necktie: 5, bow_tie: 5,
  blouse: 3, cardigan: 3, polo: 3, chinos: 3, turtleneck: 3,
  turtleneck_knit: 3, cable_knit: 3, cashmere_sweater: 3, mock_neck: 3,
  half_zip: 3, zip_knit: 3, knitted_vest: 3, sweater: 3,
  coat: 3, boot: 3, ankle_boot: 3, chelsea_boot: 3, midi_skirt: 3,
  biker_jacket: 2, bomber: 2, denim_jacket: 2, varsity_jacket: 2,
  field_jacket: 2, windbreaker: 2, track_jacket: 2, coach_jacket: 2,
  tshirt: 2, graphic_tee: 2, crop_top: 2, tank: 1, camisole: 1,
  hoodie: 2, sweatshirt: 2, jeans: 2, denim: 2, flared_jeans: 2,
  baggy_jeans: 2, carpenter_pants: 2, cargo: 2, shorts: 2,
  bermuda_shorts: 2, sneaker: 2, runner: 2, trail_runner: 2, sandal: 1,
  slide: 1, mule: 1, ballet_flat: 2, backpack: 2,
  jogger: 1, track_pants: 1, sweatpants: 1, leggings: 1, biker_shorts: 1,
  sports_bra: 1, performance_tee: 1, yoga_pants: 1, track: 1,
  puffer: 2, parka: 2, shearling: 3, duffle_coat: 3,
};

function inferFormality(subCategory: string, category: string, vibe: string): number {
  const sub = (subCategory || "").toLowerCase().replace(/[\s-]/g, "_");
  if (EXTENDED_SUB_CAT_FORMALITY[sub] !== undefined) return EXTENDED_SUB_CAT_FORMALITY[sub];
  if (SUB_CAT_FORMALITY[sub] !== undefined) return SUB_CAT_FORMALITY[sub];

  const dna = VIBE_DNA[vibe];
  if (dna) {
    const [min, max] = dna.formality_range;
    const scaledMin = Math.ceil(min / 2);
    const scaledMax = Math.ceil(max / 2);
    const mid = Math.round((scaledMin + scaledMax) / 2);
    return Math.min(scaledMax, Math.max(scaledMin, mid));
  }

  return 3;
}

function inferPattern(title: string): string {
  const t = title.toLowerCase();
  if (/stripe|breton|pinstripe/.test(t)) return "stripe";
  if (/plaid|tartan|houndstooth|gingham|argyle|check|windowpane/.test(t)) return "check";
  if (/graphic|logo|text|slogan|art print|geometric/.test(t)) return "graphic";
  if (/floral|flower|animal|leopard|zebra|snake|camo|tie.?dye|paisley|tropical|all.?over/.test(t)) return "print";
  return "solid";
}

function inferSilhouette(title: string, bodyType: string, subCategory: string): string {
  const t = title.toLowerCase();
  if (/slim.?fit|skinny|slim.?cut|tapered/.test(t)) return "slim";
  if (/fitted|form.?fitting|bodycon/.test(t)) return "fitted";
  if (/straight.?leg|straight.?fit|straight.?cut/.test(t)) return "straight";
  if (/relaxed.?fit|easy.?fit|comfort.?fit|\bloose\b/.test(t)) return "relaxed";
  if (/oversized|boxy|drop.?shoulder/.test(t)) return "oversized";
  if (/wide.?leg|palazzo|flare|bell.?bottom/.test(t)) return "wide-leg";
  if (/\bcropped\b|\bcrop\b/.test(t)) return "cropped";

  const sub = (subCategory || "").toLowerCase();
  if (/leggings|biker_shorts|sports_bra|compression/.test(sub)) return "fitted";
  if (/jogger|sweatpants|track_pants|wide_leg|palazzo|culottes|baggy_jeans/.test(sub)) return "relaxed";
  if (/oversized/.test(sub)) return "oversized";
  if (/pencil_skirt|slim/.test(sub)) return "slim";
  if (/straight/.test(sub)) return "straight";

  return "regular";
}

function inferVibes(category: string, subCategory: string, material: string, colorFamily: string, contextVibe: string): string[] {
  const vibes = new Set<string>();
  const sub = (subCategory || "").toLowerCase();
  const mat = (material || "").toLowerCase();
  const combined = sub + " " + mat;

  if (/blazer|trench|leather_pant|silk|tailored|structured|tuxedo/.test(combined)) vibes.add("ELEVATED_COOL");
  if (/linen|waffle|organic|chambray|chore|canvas_tote|suede_mule|straw/.test(combined)) vibes.add("EFFORTLESS_NATURAL");
  if (/asymmetric|drape|cocoon|tabi|cape|mohair|boucle|culottes/.test(combined)) vibes.add("ARTISTIC_MINIMAL");
  if (/corduroy|tweed|velvet|suede|crochet|shearling|flared_jeans|platform|saddle/.test(combined)) vibes.add("RETRO_LUXE");
  if (/track|jogger|hoodie|performance|technical|fleece|puffer|sports_bra|biker_short/.test(combined)) vibes.add("SPORT_MODERN");
  if (/band_tee|combat|cargo|ripped|denim_jacket|patchwork|graphic_tee/.test(combined)) vibes.add("CREATIVE_LAYERED");

  if (vibes.size === 0) vibes.add(contextVibe);

  if (!vibes.has(contextVibe) && vibes.size < 2) vibes.add(contextVibe);

  return Array.from(vibes).slice(0, 3);
}

function inferSeason(material: string, category: string, subCategory: string, contextSeason?: string): string[] {
  const mat = (material || "").toLowerCase();
  const sub = (subCategory || "").toLowerCase();

  if (/down|cashmere|sherpa|shearling/.test(mat) || /puffer|parka|duffle/.test(sub)) return ["winter"];
  if (/fleece|heavy.?wool/.test(mat)) return ["fall", "winter"];
  if (/tweed|flannel|corduroy/.test(mat)) return ["fall", "winter"];
  if (/wool/.test(mat) && !/wool.?blend/.test(mat)) return ["fall", "winter"];
  if (/wool.?blend/.test(mat)) return ["spring", "fall", "winter"];
  if (/linen|gauze/.test(mat) || /sandal|slide|tank|shorts|sports_bra|biker_short/.test(sub)) return ["summer"];
  if (/mesh/.test(mat) && /top|shirt/.test(sub)) return ["spring", "summer"];
  if (/cotton|jersey/.test(mat) && /tshirt|graphic_tee|tank|crop_top/.test(sub)) return ["spring", "summer", "fall"];
  if (/denim/.test(mat) && /jeans|denim/.test(sub)) return ["spring", "summer", "fall", "winter"];
  if (/cardigan|half_zip|sweater|cable_knit|turtleneck/.test(sub)) return ["fall", "winter"];
  if (/trench|blazer|chinos|oxford_shirt|polo/.test(sub)) return ["spring", "fall"];
  if (/denim_jacket|field_jacket/.test(sub)) return ["spring", "fall"];
  if (/sneaker|runner|loafer/.test(sub)) return ["spring", "summer", "fall"];
  if (/boot|chelsea|combat|ankle/.test(sub)) return ["fall", "winter"];
  if (/scarf|hat|beanie|glove|belt|watch|sunglasses|cap|bucket_hat|beret/.test(sub)) return ["spring", "summer", "fall", "winter"];

  if (contextSeason) {
    const adjacent: Record<string, string[]> = {
      spring: ["spring", "fall"], summer: ["spring", "summer"],
      fall: ["fall", "winter"], winter: ["fall", "winter"],
    };
    return adjacent[contextSeason] || [contextSeason];
  }

  return ["spring", "fall"];
}

const upgradeImageResolution = (url: string): string => {
  if (!url) return url;
  return url
    .replace(/_AC_U[A-Z0-9]+_\./g, "_AC_SL1500_.")
    .replace(/_AC_SR\d+,\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_SY\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_SX\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_UL\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_SS\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_AA\d+_\./g, "_AC_SL1500_.")
    .replace(/\._[A-Z0-9,_]+_\./g, "._AC_SL1500_.");
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { product, gender, body_type, vibe, season, batchId } = await req.json();

    if (!product || !product.title) {
      return new Response(JSON.stringify({ error: "product.title is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const genderLabel = gender === "MALE" ? "men's" : gender === "FEMALE" ? "women's" : "unisex";

    const lightPrompt = `Analyze this fashion product and return JSON only. ALL values must be in ENGLISH only.
Product: "${product.title}" | Brand: ${product.brand || "unknown"} | Gender hint: ${genderLabel}

Return ONLY valid JSON with English values:
{
  "brand": "brand name",
  "name": "clean product name (max 80 chars)",
  "category": "outer|mid|top|bottom|shoes|bag|accessory",
  "sub_category": "specific type e.g. blazer|puffer|trench|hoodie|cardigan|cable_knit|tshirt|oxford_shirt|sneaker|loafer|tote|crossbody",
  "color": "specific color name in English",
  "color_family": "black|white|grey|navy|beige|brown|blue|green|red|cream|denim|olive|burgundy|charcoal|khaki|camel|tan|pink|mustard|rust|wine|coral|sage|teal|mint|lavender|sky_blue|ivory|purple|yellow|orange|metallic|multi",
  "material": "primary material in English e.g. Cotton|Wool|Denim|Leather|Knit|Fleece|Linen|Polyester|Cashmere|Silk"
}`;

    let core: any = null;
    let geminiError: string | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: lightPrompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: attempt === 1 ? 600 : 800,
                stopSequences: ["\n\n\n"],
              },
            }),
          }
        );

        if (!geminiRes.ok) {
          geminiError = `Gemini HTTP ${geminiRes.status} (attempt ${attempt})`;
          continue;
        }

        const geminiData = await geminiRes.json();
        const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const finishReason = geminiData.candidates?.[0]?.finishReason;

        const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
          geminiError = `No JSON in response (finishReason: ${finishReason}, attempt ${attempt})`;
          continue;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          if (finishReason === "MAX_TOKENS") {
            geminiError = `JSON truncated due to MAX_TOKENS (attempt ${attempt}) — retrying with higher limit`;
            continue;
          }
          geminiError = `JSON parse error (attempt ${attempt})`;
          continue;
        }

        if (!parsed.category || !parsed.color_family) {
          geminiError = `Incomplete Gemini response: missing required fields (attempt ${attempt})`;
          continue;
        }

        core = parsed;
        break;
      } catch (fetchErr) {
        geminiError = `Fetch error: ${(fetchErr as Error).message} (attempt ${attempt})`;
      }
    }

    if (!core) {
      const adminClientForLog = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminClientForLog.from("pipeline_feedback").insert({
        batch_id: batchId || "unknown",
        outfit_id: null,
        accepted: false,
        match_score: null,
        vibe: vibe || "unknown",
        season: season || "unknown",
      }).catch(() => {});

      return new Response(JSON.stringify({
        error: geminiError || "Failed to analyze product after retries",
        product_title: product.title?.slice(0, 80),
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const KOREAN_MATERIAL_MAP: Record<string, string> = {
      "니트": "Knit", "혼방": "Blend", "울": "Wool", "면": "Cotton",
      "가죽": "Leather", "나일론": "Nylon", "폴리": "Polyester",
      "실크": "Silk", "린넨": "Linen", "데님": "Denim",
      "캐시미어": "Cashmere", "스웨이드": "Suede", "플리스": "Fleece",
      "벨벳": "Velvet", "코듀로이": "Corduroy", "트위드": "Tweed",
    };
    const normalizeMaterial = (raw: string): string => {
      if (!raw) return "";
      const trimmed = raw.trim();
      if (KOREAN_MATERIAL_MAP[trimmed]) return KOREAN_MATERIAL_MAP[trimmed];
      for (const [k, v] of Object.entries(KOREAN_MATERIAL_MAP)) {
        if (trimmed.includes(k)) return v;
      }
      if (/[가-힣]/.test(trimmed)) return "Knit";
      return trimmed;
    };

    const VALID_CATEGORIES = new Set(["outer", "mid", "top", "bottom", "shoes", "bag", "accessory"]);
    const normalizedCategory = VALID_CATEGORIES.has(core.category) ? core.category : "top";
    const normalizedColorFamily = normalizeColorFamily(core.color_family);
    const colorTone = COLOR_TONE_MAP[normalizedColorFamily] || "neutral";
    const title = product.title || "";
    const materialStr = normalizeMaterial(core.material || "");
    const subCat = core.sub_category || "";

    const pattern = inferPattern(title);
    const silhouette = inferSilhouette(title, body_type || "regular", subCat);
    const formality = inferFormality(subCat, normalizedCategory, vibe);
    const warmth = inferWarmth(materialStr, normalizedCategory, subCat, season);
    const vibeArray = inferVibes(normalizedCategory, subCat, materialStr, normalizedColorFamily, vibe);
    const seasonArray = inferSeason(materialStr, normalizedCategory, subCat, season);
    const bodyTypes = [body_type || "regular"];
    if (!bodyTypes.includes("regular") && body_type !== "regular") bodyTypes.push("regular");

    const productData = {
      brand: core.brand || product.brand || "",
      name: core.name || product.title,
      category: normalizedCategory,
      sub_category: subCat,
      gender: ["MALE", "FEMALE", "UNISEX"].includes(gender) ? gender : "UNISEX",
      color: core.color || "",
      color_family: normalizedColorFamily,
      color_tone: colorTone,
      silhouette,
      material: materialStr,
      pattern,
      vibe: vibeArray,
      body_type: bodyTypes,
      season: seasonArray,
      formality,
      warmth,
      stock_status: "in_stock",
      image_url: upgradeImageResolution(product.image || ""),
      product_link: product.url || "",
      price: product.price != null ? Math.round(product.price) : null,
      batch_id: batchId || null,
    };

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const productLink = product.url || "";
    if (productLink) {
      const { data: existing } = await adminClient
        .from("products")
        .select("id")
        .eq("product_link", productLink)
        .limit(1)
        .maybeSingle();
      if (existing) {
        if (batchId) {
          await adminClient.from("products").update({ batch_id: batchId }).eq("id", existing.id);
        }
        return new Response(JSON.stringify({ success: true, productId: existing.id, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const asinMatch = productLink.match(/\/dp\/([A-Z0-9]{10})/);
    if (asinMatch) {
      const { data: existingByAsin } = await adminClient
        .from("products")
        .select("id")
        .ilike("product_link", `%/dp/${asinMatch[1]}%`)
        .limit(1)
        .maybeSingle();
      if (existingByAsin) {
        if (batchId) {
          await adminClient.from("products").update({ batch_id: batchId }).eq("id", existingByAsin.id);
        }
        return new Response(JSON.stringify({ success: true, productId: existingByAsin.id, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: insertedRow, error: insertError } = await adminClient
      .from("products")
      .insert(productData)
      .select("id")
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        productId: insertedRow?.id,
        analysis: {
          gemini_fields: ["brand", "name", "category", "sub_category", "color", "color_family", "material"],
          rule_fields: ["color_tone", "silhouette", "pattern", "vibe", "body_type", "season", "formality", "warmth"],
          token_savings: "~75% vs full analysis",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
