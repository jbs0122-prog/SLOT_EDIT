import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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
  "sub_category": "specific type e.g. 'crewneck sweatshirt', 'chino pants', 'sneakers', 'tote bag'",
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
      image_url: product.image || "",
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
