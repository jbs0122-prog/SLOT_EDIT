import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { product, gender, body_type, vibe, season } = await req.json();

    if (!product || !product.title) {
      return new Response(JSON.stringify({ error: "product.title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bodyTypeMap: Record<string, string> = {
      slim: "slim — recommend slim fit, tapered, skinny, slim-cut styles",
      regular: "regular — recommend regular fit, straight fit, classic styles",
      "plus-size": "plus-size — recommend relaxed fit, loose, plus-size friendly styles",
    };
    const bodyDesc = bodyTypeMap[body_type] || "regular";

    const prompt = `You are a fashion product data specialist. Analyze this Amazon product and return structured metadata.

Product:
- Title: ${product.title}
- Brand: ${product.brand || "unknown"}
- Price: ${product.price ? `$${product.price}` : "unknown"}
- Search context — Gender: ${gender}, Body type: ${bodyDesc}, Vibe: ${vibe}, Season: ${season || "all"}

IMPORTANT: The body type is "${body_type}". The silhouette MUST match:
- slim → use "slim" or "fitted"
- regular → use "regular" or "straight"
- plus-size → use "relaxed" or "oversized"

Extract and return ONLY a valid JSON object with these exact fields:
{
  "brand": "brand name (extract from title if not given)",
  "name": "clean product name without brand (max 80 chars)",
  "category": "one of: outer|mid|top|bottom|shoes|bag|accessory",
  "sub_category": "Pick the MOST SPECIFIC value from the list below based on the detected category:
    outer: puffer|coat|blazer|jacket|trench|bomber|parka|peacoat|anorak|windbreaker|duffle_coat|biker_jacket|denim_jacket|coach_jacket|varsity_jacket|shearling|field_jacket|harrington|quilted_jacket|corduroy_jacket|cape|poncho|kimono|noragi|chore_coat|safari_jacket|utility_jacket|shell|gilet|faux_fur|rain_jacket|track_jacket|shacket|leather_trench|tweed_jacket
    mid: knit|cardigan|sweater|vest|fleece|hoodie|sweatshirt|half_zip|turtleneck_knit|cable_knit|argyle_sweater|fair_isle|cricket_jumper|mock_neck|zip_knit|quilted_vest|down_vest|fleece_vest|knitted_vest|cashmere_sweater|boucle_knit|mohair_knit|crochet_cardigan
    top: tshirt|shirt|polo|turtleneck|tank|blouse|oxford_shirt|linen_shirt|silk_blouse|graphic_tee|rugby_shirt|henley|crop_top|camisole|bodysuit|tunic|corset|breton_stripe|band_tee|jersey|wrap_top|peasant_blouse|puff_sleeve|flannel_shirt|denim_shirt|chambray|western_shirt|sports_bra|performance_tee|compression_top|mesh_top|lace_top|embroidered_blouse|halter_top
    bottom: denim|slacks|chinos|jogger|cargo|shorts|wide_leg|culottes|pleated_trousers|leather_pants|corduroy_pants|parachute_pants|track_pants|linen_trousers|maxi_skirt|midi_skirt|mini_skirt|pencil_skirt|pleated_skirt|wrap_skirt|flared_jeans|baggy_jeans|carpenter_pants|overalls|bermuda_shorts|biker_shorts|leggings|yoga_pants|sweatpants|sailor_pants|harem_pants|velvet_skirt|silk_skirt|tiered_skirt|tennis_skirt
    shoes: sneaker|derby|loafer|boot|runner|chelsea_boot|combat_boot|ankle_boot|knee_boot|hiking_boot|desert_boot|work_boot|mule|slide|sandal|espadrille|clog|mary_jane|ballet_flat|oxford|brogue|monk_strap|platform|kitten_heel|block_heel|slingback|boat_shoe|moccasin|western_boot|tabi|driving_shoe|trail_runner|training_shoe|high_top|creeper
    bag: tote|backpack|crossbody|duffle|clutch|shoulder_bag|satchel|messenger|bucket_bag|hobo|belt_bag|sling|baguette|box_bag|frame_bag|saddle_bag|doctor_bag|wristlet|briefcase|gym_bag|camera_bag|weekender|straw_bag|woven_bag|canvas_tote|chain_bag|phone_pouch|sacoche|vanity_case
    accessory: necktie|belt|cap|scarf|glove|watch|sunglasses|beanie|bucket_hat|beret|headband|choker|chain_necklace|pendant|pearl_necklace|hoop_earring|stud_earring|ring|bracelet|bangle|brooch|hair_clip|bow_tie|suspenders|silk_scarf|bandana|anklet|ear_cuff|hair_stick|tights|wide_brim_hat|visor|wallet_chain",
  "gender": "MALE|FEMALE|UNISEX",
  "color": "primary color name e.g. 'Navy Blue', 'Cream White'",
  "color_family": "one of: black|white|gray|navy|blue|green|red|pink|yellow|orange|brown|beige|purple|multicolor",
  "color_tone": "one of: warm|cool|neutral",
  "silhouette": "one of: slim|regular|oversized|relaxed|fitted|wide-leg|straight|cropped",
  "material": "primary material e.g. '100% Cotton', 'Polyester Blend'",
  "pattern": "one of: solid|stripe|check|graphic|print|other",
  "vibe": ["array of matching vibes from: ELEVATED_COOL, EFFORTLESS_NATURAL, ARTISTIC_MINIMAL, RETRO_LUXE, SPORT_MODERN, CREATIVE_LAYERED"],
  "body_type": ["array from: slim, regular, plus-size"],
  "season": ["array from: spring, summer, fall, winter"],
  "formality": 3,
  "warmth": 3,
  "stock_status": "in_stock"
}

Rules:
- formality: 1=very casual, 5=formal (integer 1-5)
- warmth: 1=very light, 5=very warm (integer 1-5)
- body_type array MUST include "${body_type || "regular"}"
- For sub_category, always prefer the MOST SPECIFIC type from the list. For example, use "bomber" instead of generic "jacket", "chelsea_boot" instead of generic "boot", "oxford_shirt" instead of generic "shirt"
- Return ONLY the JSON object, no markdown, no explanation`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(JSON.stringify({ error: "Gemini API error", detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Failed to parse product data", raw: rawText.slice(0, 500) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let analyzed: any;
    try {
      analyzed = JSON.parse(jsonMatch[0]);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON from Gemini", raw: jsonMatch[0].slice(0, 500) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const VALID_COLOR_FAMILIES = new Set([
      "black", "white", "grey", "navy", "beige", "brown", "blue", "green",
      "red", "yellow", "purple", "pink", "orange", "metallic", "multi",
      "khaki", "cream", "ivory", "burgundy", "wine", "olive", "mustard",
      "coral", "charcoal", "tan", "camel", "rust", "sage", "mint",
      "lavender", "teal", "sky_blue", "denim",
    ]);

    const COLOR_FAMILY_MAP: Record<string, string> = {
      gray: "grey",
      multicolor: "multi",
      "multi-color": "multi",
      "multi color": "multi",
      nude: "beige",
      sand: "beige",
      taupe: "beige",
      "light blue": "sky_blue",
      "sky blue": "sky_blue",
      "dark blue": "navy",
      "light brown": "tan",
      maroon: "burgundy",
      "dark red": "burgundy",
      turquoise: "teal",
      cyan: "teal",
      "light green": "sage",
      "light pink": "pink",
      gold: "metallic",
      silver: "metallic",
      copper: "metallic",
      "light gray": "grey",
      "dark gray": "charcoal",
      "dark grey": "charcoal",
      off_white: "cream",
      "off-white": "cream",
      ecru: "ivory",
    };

    const normalizeColorFamily = (raw: string): string => {
      if (!raw) return "black";
      const lower = raw.toLowerCase().trim();
      if (VALID_COLOR_FAMILIES.has(lower)) return lower;
      if (COLOR_FAMILY_MAP[lower]) return COLOR_FAMILY_MAP[lower];
      for (const key of Object.keys(COLOR_FAMILY_MAP)) {
        if (lower.includes(key)) return COLOR_FAMILY_MAP[key];
      }
      for (const valid of VALID_COLOR_FAMILIES) {
        if (lower.includes(valid)) return valid;
      }
      return "black";
    };

    const VALID_CATEGORIES = new Set(["outer", "mid", "top", "bottom", "shoes", "bag", "accessory"]);
    const VALID_SILHOUETTES = new Set(["slim", "regular", "oversized", "relaxed", "fitted", "wide-leg", "straight", "cropped"]);
    const VALID_PATTERNS = new Set(["solid", "stripe", "check", "graphic", "print", "other"]);
    const PATTERN_MAP: Record<string, string> = {
      plaid: "check",
      floral: "print",
      animal: "print",
      geometric: "graphic",
      abstract: "graphic",
      camo: "print",
      camouflage: "print",
      tie_dye: "print",
      "tie-dye": "print",
      paisley: "print",
      houndstooth: "check",
      tartan: "check",
      argyle: "check",
    };
    const normalizePattern = (raw: string): string => {
      if (!raw) return "solid";
      const lower = raw.toLowerCase().trim();
      if (VALID_PATTERNS.has(lower)) return lower;
      if (PATTERN_MAP[lower]) return PATTERN_MAP[lower];
      for (const key of Object.keys(PATTERN_MAP)) {
        if (lower.includes(key)) return PATTERN_MAP[key];
      }
      return "other";
    };
    const VALID_COLOR_TONES = new Set(["warm", "cool", "neutral"]);

    const result = {
      brand: analyzed.brand || product.brand || "",
      name: analyzed.name || product.title,
      category: VALID_CATEGORIES.has(analyzed.category) ? analyzed.category : "top",
      sub_category: analyzed.sub_category || "",
      gender: ["MALE", "FEMALE", "UNISEX"].includes(analyzed.gender) ? analyzed.gender : (gender || "UNISEX"),
      color: analyzed.color || "",
      color_family: normalizeColorFamily(analyzed.color_family),
      color_tone: VALID_COLOR_TONES.has(analyzed.color_tone) ? analyzed.color_tone : "neutral",
      silhouette: VALID_SILHOUETTES.has(analyzed.silhouette) ? analyzed.silhouette : "regular",
      material: analyzed.material || "",
      pattern: normalizePattern(analyzed.pattern),
      vibe: Array.isArray(analyzed.vibe) ? analyzed.vibe : [vibe],
      body_type: Array.isArray(analyzed.body_type) ? analyzed.body_type : [body_type || "regular"],
      season: Array.isArray(analyzed.season) ? analyzed.season : [season || "all"],
      formality: typeof analyzed.formality === "number" ? Math.min(5, Math.max(1, analyzed.formality)) : 3,
      warmth: typeof analyzed.warmth === "number" ? Math.min(5, Math.max(1, analyzed.warmth)) : 3,
      stock_status: "in_stock",
      image_url: upgradeImageResolution(product.image || ""),
      product_link: product.url || "",
      price: product.price != null ? Math.round(product.price) : null,
    };

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: insertError } = await adminClient.from("products").insert(result);

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message, detail: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
