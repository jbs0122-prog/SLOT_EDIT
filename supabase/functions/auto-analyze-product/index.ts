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

function inferWarmth(material: string, category: string, season?: string): number {
  const mat = (material || "").toLowerCase();
  for (const [key, warmth] of Object.entries(MATERIAL_WARMTH)) {
    if (mat.includes(key)) return warmth;
  }

  const base = CATEGORY_WARMTH_DEFAULT[category] || 3;
  if (season === "summer") return Math.max(1, base - 1);
  if (season === "winter") return Math.min(5, base + 1);
  return base;
}

function inferFormality(subCategory: string, category: string, vibe: string): number {
  const sub = (subCategory || "").toLowerCase().replace(/[\s-]/g, "_");
  if (SUB_CAT_FORMALITY[sub] !== undefined) return SUB_CAT_FORMALITY[sub];

  const dna = VIBE_DNA[vibe];
  if (dna) {
    const [min, max] = dna.formality_range;
    const scaledMin = Math.ceil(min / 2);
    const scaledMax = Math.ceil(max / 2);
    return Math.min(scaledMax, Math.max(scaledMin, 3));
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

function inferSilhouette(title: string, bodyType: string): string {
  const t = title.toLowerCase();
  if (/slim.?fit|skinny|slim.?cut|tapered/.test(t)) return "slim";
  if (/fitted|form.?fitting|bodycon/.test(t)) return "fitted";
  if (/straight.?leg|straight.?fit|straight.?cut/.test(t)) return "straight";
  if (/relaxed.?fit|easy.?fit|comfort.?fit|loose/.test(t)) return "relaxed";
  if (/oversized|boxy|drop.?shoulder/.test(t)) return "oversized";
  if (/wide.?leg|palazzo|flare/.test(t)) return "wide-leg";
  if (/cropped|crop/.test(t)) return "cropped";
  return "regular";
}

function inferVibes(category: string, subCategory: string, material: string, colorFamily: string, contextVibe: string): string[] {
  const vibes = new Set<string>();
  vibes.add(contextVibe);

  const sub = (subCategory || "").toLowerCase();
  const mat = (material || "").toLowerCase();

  if (/blazer|trench|leather|tailored|silk/.test(sub + " " + mat)) vibes.add("ELEVATED_COOL");
  if (/linen|cotton|organic|waffle|chambray/.test(sub + " " + mat)) vibes.add("EFFORTLESS_NATURAL");
  if (/asymmetric|drape|cocoon|tabi|cape/.test(sub)) vibes.add("ARTISTIC_MINIMAL");
  if (/corduroy|tweed|velvet|suede|crochet|vintage/.test(sub + " " + mat)) vibes.add("RETRO_LUXE");
  if (/track|jogger|hoodie|performance|technical|fleece|puffer/.test(sub + " " + mat)) vibes.add("SPORT_MODERN");
  if (/band|combat|cargo|ripped|flannel|patchwork/.test(sub)) vibes.add("CREATIVE_LAYERED");

  return Array.from(vibes).slice(0, 3);
}

function inferSeason(material: string, category: string, subCategory: string, contextSeason?: string): string[] {
  const mat = (material || "").toLowerCase();
  const sub = (subCategory || "").toLowerCase();

  if (/down|cashmere|fleece|sherpa|shearling|wool|heavy/.test(mat) || /puffer|parka|duffle/.test(sub)) {
    return contextSeason === "fall" ? ["fall", "winter"] : ["winter"];
  }
  if (/tweed|flannel|corduroy/.test(mat)) return ["fall", "winter"];
  if (/linen|gauze|mesh/.test(mat) || /sandal|slide|tank|shorts/.test(sub)) {
    return contextSeason === "spring" ? ["spring", "summer"] : ["summer"];
  }
  if (/cotton|denim|jersey/.test(mat) && /tshirt|sneaker|jeans|denim/.test(sub)) {
    return ["spring", "summer", "fall"];
  }

  if (contextSeason) {
    const adjacent: Record<string, string[]> = {
      spring: ["spring", "summer"], summer: ["summer"],
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

    const lightPrompt = `Analyze this fashion product and return JSON only.
Product: "${product.title}" | Brand: ${product.brand || "unknown"} | Gender hint: ${genderLabel}

Return ONLY valid JSON:
{
  "brand": "brand name",
  "name": "clean product name (max 80 chars)",
  "category": "outer|mid|top|bottom|shoes|bag|accessory",
  "sub_category": "specific type (e.g. blazer, tshirt, sneaker, tote)",
  "color": "specific color name",
  "color_family": "black|white|grey|navy|beige|brown|blue|green|red|cream|denim|olive|burgundy|charcoal|khaki|camel|tan|pink|mustard|rust|wine|coral|sage|teal|mint|lavender|sky_blue|ivory|purple|yellow|orange|metallic|multi",
  "material": "primary material"
}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: lightPrompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(JSON.stringify({ error: "Gemini API error", detail: errText.slice(0, 300) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Failed to parse Gemini response" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let core: any;
    try {
      core = JSON.parse(jsonMatch[0]);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON from Gemini" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const VALID_CATEGORIES = new Set(["outer", "mid", "top", "bottom", "shoes", "bag", "accessory"]);
    const normalizedCategory = VALID_CATEGORIES.has(core.category) ? core.category : "top";
    const normalizedColorFamily = normalizeColorFamily(core.color_family);
    const colorTone = COLOR_TONE_MAP[normalizedColorFamily] || "neutral";
    const title = product.title || "";
    const materialStr = core.material || "";
    const subCat = core.sub_category || "";

    const pattern = inferPattern(title);
    const silhouette = inferSilhouette(title, body_type || "regular");
    const formality = inferFormality(subCat, normalizedCategory, vibe);
    const warmth = inferWarmth(materialStr, normalizedCategory, season);
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
