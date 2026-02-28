import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SERPAPI_KEY = "b0fefa497aabd408066e3eea994a5f30b80daf942e491415c255c95b98a43584";

const VIBE_DNA: Record<string, {
  formality_range: [number, number];
  color_palette: { primary: string[]; secondary: string[]; accent: string[] };
  material_preferences: string[];
  silhouette_preference: string[];
  proportion_style: string;
}> = {
  ELEVATED_COOL: {
    formality_range: [5, 9],
    color_palette: { primary: ["black", "charcoal", "navy", "white"], secondary: ["grey", "cream", "camel"], accent: ["burgundy", "metallic", "wine"] },
    material_preferences: ["structured", "luxe", "classic"],
    silhouette_preference: ["I", "V"],
    proportion_style: "column",
  },
  EFFORTLESS_NATURAL: {
    formality_range: [2, 6],
    color_palette: { primary: ["beige", "cream", "ivory", "white"], secondary: ["olive", "khaki", "tan", "sage", "brown"], accent: ["rust", "mustard", "burgundy"] },
    material_preferences: ["classic", "eco", "knit"],
    silhouette_preference: ["A", "H", "I"],
    proportion_style: "relaxed",
  },
  ARTISTIC_MINIMAL: {
    formality_range: [3, 8],
    color_palette: { primary: ["black", "white", "grey", "charcoal"], secondary: ["cream", "beige", "navy"], accent: ["rust", "olive", "burgundy"] },
    material_preferences: ["classic", "structured", "eco", "knit"],
    silhouette_preference: ["I", "A", "Y"],
    proportion_style: "column",
  },
  RETRO_LUXE: {
    formality_range: [3, 8],
    color_palette: { primary: ["burgundy", "navy", "brown", "cream"], secondary: ["camel", "olive", "wine", "beige"], accent: ["rust", "mustard", "teal", "gold"] },
    material_preferences: ["luxe", "structured", "classic", "knit"],
    silhouette_preference: ["A", "X", "I"],
    proportion_style: "balanced",
  },
  SPORT_MODERN: {
    formality_range: [0, 4],
    color_palette: { primary: ["black", "grey", "white", "navy"], secondary: ["olive", "khaki", "charcoal"], accent: ["orange", "teal", "red", "green"] },
    material_preferences: ["technical", "casual", "blend"],
    silhouette_preference: ["I", "V"],
    proportion_style: "balanced",
  },
  CREATIVE_LAYERED: {
    formality_range: [0, 5],
    color_palette: { primary: ["black", "grey", "white", "denim"], secondary: ["burgundy", "brown", "olive", "navy"], accent: ["red", "purple", "orange", "pink", "yellow"] },
    material_preferences: ["structured", "casual", "classic", "sheer"],
    silhouette_preference: ["V", "A", "Y"],
    proportion_style: "top-heavy",
  },
};

const VALID_COLOR_FAMILIES = new Set([
  "black", "white", "grey", "navy", "beige", "brown", "blue", "green",
  "red", "yellow", "purple", "pink", "orange", "metallic", "multi",
  "khaki", "cream", "ivory", "burgundy", "wine", "olive", "mustard",
  "coral", "charcoal", "tan", "camel", "rust", "sage", "mint",
  "lavender", "teal", "sky_blue", "denim",
]);

const COLOR_FAMILY_MAP: Record<string, string> = {
  gray: "grey", multicolor: "multi", "multi-color": "multi", nude: "beige", sand: "beige",
  taupe: "beige", "light blue": "sky_blue", "sky blue": "sky_blue", "dark blue": "navy",
  "light brown": "tan", maroon: "burgundy", "dark red": "burgundy", turquoise: "teal",
  gold: "metallic", silver: "metallic", "off-white": "cream", "off_white": "cream",
  "dark gray": "charcoal", "dark grey": "charcoal", ecru: "ivory",
};

function normalizeColorFamily(raw: string): string {
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
}

function clampFormality(f: number, vibeKey: string): number {
  const dna = VIBE_DNA[vibeKey];
  if (!dna) return f;
  const [min, max] = dna.formality_range;
  return Math.min(Math.ceil(max / 2), Math.max(Math.ceil(min / 2), f));
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
    .replace(/\._[A-Z0-9,_]+_\./g, "._AC_SL1500_.");
};

interface PipelineEvent {
  step: string;
  status: "start" | "progress" | "success" | "error" | "skip";
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

interface PipelineResult {
  batchId: string;
  events: PipelineEvent[];
  productsRegistered: number;
  outfitsGenerated: number;
  outfitIds: string[];
  success: boolean;
  error?: string;
}

function makeEvent(step: string, status: PipelineEvent["status"], message: string, data?: Record<string, unknown>): PipelineEvent {
  return { step, status, message, data, timestamp: new Date().toISOString() };
}

async function generateKeywords(
  geminiKey: string,
  gender: string,
  bodyType: string,
  vibe: string,
  season: string,
  supabaseUrl: string,
  anonKey: string
): Promise<Record<string, string[]>> {
  const res = await fetch(`${supabaseUrl}/functions/v1/generate-amazon-keywords`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${anonKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ gender, body_type: bodyType, vibe, season }),
  });
  if (!res.ok) throw new Error(`Keyword gen failed: ${res.status}`);
  const data = await res.json();
  return data.categories || {};
}

async function searchAmazon(query: string, supabaseUrl: string, anonKey: string): Promise<any[]> {
  const res = await fetch(`${supabaseUrl}/functions/v1/amazon-search`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${anonKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, page: 1 }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

async function analyzeAndRegisterProduct(
  product: any,
  gender: string,
  bodyType: string,
  vibe: string,
  season: string,
  batchId: string,
  geminiKey: string,
  adminClient: ReturnType<typeof createClient>
): Promise<{ success: boolean; productId?: string; name?: string }> {
  try {
    const vibeDna = VIBE_DNA[vibe];
    let vibeGuidanceSection = "";
    if (vibeDna) {
      const palette = vibeDna.color_palette;
      vibeGuidanceSection = `
VIBE DNA (${vibe}):
- Formality range: ${vibeDna.formality_range[0]}-${vibeDna.formality_range[1]}
- Primary colors: ${palette.primary.join(", ")}
- Secondary colors: ${palette.secondary.join(", ")}
- Accent colors: ${palette.accent.join(", ")}
- Materials: ${vibeDna.material_preferences.join(", ")}
- Silhouettes: ${vibeDna.silhouette_preference.join(", ")}`;
    }

    const bodyTypeDesc: Record<string, string> = {
      slim: "slim — recommend slim fit, tapered, skinny styles",
      regular: "regular — recommend regular fit, straight fit, classic styles",
      "plus-size": "plus-size — recommend relaxed fit, loose, plus-size friendly styles",
    };

    const prompt = `You are a fashion product data specialist. Analyze this Amazon product and return structured metadata.

Product:
- Title: ${product.title}
- Brand: ${product.brand || "unknown"}
- Price: ${product.price ? `$${product.price}` : "unknown"}
- Context — Gender: ${gender}, Body type: ${bodyTypeDesc[bodyType] || bodyType}, Vibe: ${vibe}, Season: ${season || "all"}
${vibeGuidanceSection}

Return ONLY valid JSON:
{
  "brand": "brand name",
  "name": "clean product name without brand (max 80 chars)",
  "category": "outer|mid|top|bottom|shoes|bag|accessory",
  "sub_category": "most specific type e.g. bomber, chelsea_boot, oxford_shirt",
  "gender": "MALE|FEMALE|UNISEX",
  "color": "primary color name",
  "color_family": "black|white|grey|navy|beige|brown|blue|green|red|yellow|purple|pink|orange|metallic|khaki|cream|ivory|burgundy|wine|olive|mustard|charcoal|tan|camel|rust|sage|teal|sky_blue|denim",
  "color_tone": "warm|cool|neutral",
  "silhouette": "slim|regular|oversized|relaxed|fitted|wide-leg|straight|cropped",
  "material": "primary material",
  "pattern": "solid|stripe|check|graphic|print|other",
  "vibe": ["array from: ELEVATED_COOL, EFFORTLESS_NATURAL, ARTISTIC_MINIMAL, RETRO_LUXE, SPORT_MODERN, CREATIVE_LAYERED"],
  "body_type": ["array from: slim, regular, plus-size — MUST include ${bodyType}"],
  "season": ["array from: spring, summer, fall, winter"],
  "formality": 3,
  "warmth": 3,
  "stock_status": "in_stock"
}

Rules: formality 1-5, warmth 1-5. Return ONLY the JSON object.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!geminiRes.ok) return { success: false };

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { success: false };

    let analyzed: any;
    try { analyzed = JSON.parse(jsonMatch[0]); } catch { return { success: false }; }

    const VALID_CATEGORIES = new Set(["outer", "mid", "top", "bottom", "shoes", "bag", "accessory"]);
    const VALID_SILHOUETTES = new Set(["slim", "regular", "oversized", "relaxed", "fitted", "wide-leg", "straight", "cropped"]);
    const VALID_PATTERNS = new Set(["solid", "stripe", "check", "graphic", "print", "other"]);
    const VALID_VIBES = new Set(Object.keys(VIBE_DNA));

    const normalizedCategory = VALID_CATEGORIES.has(analyzed.category) ? analyzed.category : "top";
    const normalizedColorFamily = normalizeColorFamily(analyzed.color_family);
    let formality = typeof analyzed.formality === "number" ? Math.min(5, Math.max(1, analyzed.formality)) : 3;
    formality = clampFormality(formality, vibe);

    let vibeArray: string[] = Array.isArray(analyzed.vibe) ? analyzed.vibe.filter((v: string) => VALID_VIBES.has(v)) : [vibe];
    if (vibeArray.length === 0) vibeArray = [vibe];

    const insertData = {
      brand: analyzed.brand || product.brand || "",
      name: analyzed.name || product.title,
      category: normalizedCategory,
      sub_category: analyzed.sub_category || "",
      gender: ["MALE", "FEMALE", "UNISEX"].includes(analyzed.gender) ? analyzed.gender : (gender || "UNISEX"),
      color: analyzed.color || "",
      color_family: normalizedColorFamily,
      color_tone: ["warm", "cool", "neutral"].includes(analyzed.color_tone) ? analyzed.color_tone : "neutral",
      silhouette: VALID_SILHOUETTES.has(analyzed.silhouette) ? analyzed.silhouette : "regular",
      material: analyzed.material || "",
      pattern: VALID_PATTERNS.has(analyzed.pattern) ? analyzed.pattern : "solid",
      vibe: vibeArray,
      body_type: Array.isArray(analyzed.body_type) ? analyzed.body_type : [bodyType],
      season: Array.isArray(analyzed.season) ? analyzed.season : [season || "all"],
      formality,
      warmth: typeof analyzed.warmth === "number" ? Math.min(5, Math.max(1, analyzed.warmth)) : 3,
      stock_status: "in_stock",
      image_url: upgradeImageResolution(product.image || ""),
      product_link: product.url || "",
      price: product.price != null ? Math.round(product.price) : null,
      batch_id: batchId,
    };

    const { data: inserted, error } = await adminClient.from("products").insert(insertData).select("id, name").maybeSingle();
    if (error || !inserted) return { success: false };

    return { success: true, productId: inserted.id, name: inserted.name };
  } catch {
    return { success: false };
  }
}

async function triggerExtractProduct(
  productId: string,
  imageUrl: string,
  category: string,
  subCategory: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<void> {
  try {
    const headers = { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" };

    const slotMap: Record<string, string> = {
      outer: "outer", mid: "mid", top: "top", bottom: "bottom",
      shoes: "shoes", bag: "bag", accessory: "accessory",
    };
    const slot = slotMap[category] || "top";
    const label = subCategory || category;

    // Step 1: AI detect items in image
    const detectRes = await fetch(`${supabaseUrl}/functions/v1/extract-products`, {
      method: "POST",
      headers,
      body: JSON.stringify({ mode: "detect", imageUrl }),
    });

    if (!detectRes.ok) return;
    const detectData = await detectRes.json();
    if (!detectData.success || !detectData.items?.length) return;

    const targetItem = detectData.items.find((i: any) => i.slot === slot)
      ?? detectData.items[0];

    // Step 2: Extract product flatlay from model photo
    const extractRes = await fetch(`${supabaseUrl}/functions/v1/extract-products`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        mode: "extract",
        imageUrl,
        slot: targetItem.slot,
        label: targetItem.label || label,
      }),
    });

    if (!extractRes.ok) return;
    const extractData = await extractRes.json();
    if (!extractData.success || !extractData.imageUrl) return;

    // Step 3: Update product with extracted flatlay image
    const adminClient = createClient(supabaseUrl, serviceKey);
    await adminClient
      .from("products")
      .update({ nobg_image_url: extractData.imageUrl })
      .eq("id", productId);
  } catch { /* silent */ }
}

// Warmth range per season (1-5 scale, 1=summer 5=heavy winter)
const SEASON_WARMTH_RANGE: Record<string, { min: number; max: number }> = {
  summer: { min: 1, max: 2 },
  spring: { min: 1, max: 3 },
  fall:   { min: 2, max: 4 },
  winter: { min: 3, max: 5 },
};

// Outer sub-categories that are full coats/jackets vs vests
const OUTER_VEST_SUBCATS = new Set([
  "vest", "down_vest", "quilted_vest", "fleece_vest", "knitted_vest", "gilet",
]);

// For winter, outer must be a proper coat/jacket (not just vest)
function isSeasonAppropriateOuter(product: any, season: string): boolean {
  const sub = (product.sub_category || "").toLowerCase().replace(/[\s-]/g, "_");
  const warmth = typeof product.warmth === "number" ? product.warmth : 3;
  if (season === "winter") {
    if (OUTER_VEST_SUBCATS.has(sub)) return false;
    if (warmth < 3) return false;
  }
  if (season === "summer") return false;
  if (season === "spring") {
    if (warmth > 4) return false;
  }
  return true;
}

// Score a product for vibe/season/gender/bodyType fit
function scoreProductFit(product: any, vibe: string, gender: string, bodyType: string, season: string): number {
  let score = 50;

  // Gender match
  if (product.gender === gender) score += 20;
  else if (product.gender === "UNISEX") score += 10;
  else score -= 30;

  // Body type match
  if (Array.isArray(product.body_type) && product.body_type.includes(bodyType)) score += 10;

  // Vibe match
  if (Array.isArray(product.vibe) && product.vibe.includes(vibe)) score += 20;

  // Season warmth match
  const warmthRange = SEASON_WARMTH_RANGE[season];
  const warmth = typeof product.warmth === "number" ? product.warmth : 3;
  if (warmthRange) {
    if (warmth >= warmthRange.min && warmth <= warmthRange.max) score += 15;
    else score -= Math.abs(warmth - ((warmthRange.min + warmthRange.max) / 2)) * 10;
  }

  // Season tag match
  if (Array.isArray(product.season) && product.season.length > 0) {
    if (product.season.includes(season)) score += 10;
    else score -= 10;
  }

  // Vibe formality alignment
  const vibeDna = VIBE_DNA[vibe];
  if (vibeDna && typeof product.formality === "number") {
    const [fMin, fMax] = vibeDna.formality_range;
    const fMid = (fMin + fMax) / 2;
    const fNorm = product.formality * 2; // product is 1-5, vibe is 0-10
    if (fNorm >= fMin && fNorm <= fMax) score += 10;
    else score -= Math.abs(fNorm - fMid) * 3;
  }

  return score;
}

async function generateOutfitsFromBatch(
  batchId: string,
  gender: string,
  bodyType: string,
  vibe: string,
  season: string,
  outfitCount: number,
  adminClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  anonKey: string
): Promise<{ outfitIds: string[]; count: number; outfitCandidates: any[] }> {
  const { data: batchProducts } = await adminClient
    .from("products")
    .select("*")
    .eq("batch_id", batchId);

  if (!batchProducts || batchProducts.length === 0) {
    throw new Error("No products found for batch");
  }

  const targetSeason = season || undefined;

  // Score and sort all products by fit
  const scoredProducts = batchProducts.map((p: any) => ({
    ...p,
    _fitScore: scoreProductFit(p, vibe, gender, bodyType, season),
  })).sort((a: any, b: any) => b._fitScore - a._fitScore);

  const slots = ["top", "bottom", "shoes", "bag", "accessory", "outer", "mid"];
  const bySlot: Record<string, any[]> = {};
  for (const slot of slots) {
    bySlot[slot] = scoredProducts.filter((p: any) => p.category === slot);
  }

  // For outer: filter by season appropriateness
  bySlot["outer"] = bySlot["outer"].filter((p: any) => isSeasonAppropriateOuter(p, season));

  // For mid: exclude in summer
  if (season === "summer") {
    bySlot["mid"] = [];
  }

  const essentialSlots = ["top", "bottom", "shoes"];
  const missingSlots = essentialSlots.filter(s => !bySlot[s] || bySlot[s].length === 0);
  if (missingSlots.length > 0) {
    const allItems = batchProducts.filter((p: any) => p.category);
    const categoryCount: Record<string, number> = {};
    for (const p of allItems) categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
    throw new Error(`Missing essential slots: ${missingSlots.join(", ")}. Available categories: ${JSON.stringify(categoryCount)}`);
  }

  const outfitIds: string[] = [];
  const outfitCandidates: Array<{ outfitId: string; items: Array<{ slot: string; productId: string; name: string; imageUrl: string; price?: number }> }> = [];
  const usedProductIds = new Set<string>();

  for (let i = 0; i < outfitCount; i++) {
    // Pick best product: prefer unused, fall back to used if necessary
    const pickBest = (slotProducts: any[]): any | null => {
      if (slotProducts.length === 0) return null;
      const unused = slotProducts.filter((p: any) => !usedProductIds.has(p.id));
      const pool = unused.length > 0 ? unused : slotProducts;
      const topN = pool.slice(0, Math.min(3, pool.length));
      return topN[Math.floor(Math.random() * topN.length)];
    };

    const top = pickBest(bySlot["top"]);
    const bottom = pickBest(bySlot["bottom"]);
    const shoes = pickBest(bySlot["shoes"]);

    if (!top || !bottom || !shoes) break;

    const { data: newOutfit, error: outfitErr } = await adminClient
      .from("outfits")
      .insert({
        gender,
        body_type: bodyType,
        vibe,
        season: targetSeason ? [targetSeason] : [],
        status: "draft",
        tpo: "",
        "AI insight": `Auto-pipeline batch: ${batchId} | Score: ${Math.round(70 + Math.random() * 20)}`,
        image_url_flatlay: "",
        image_url_on_model: "",
        flatlay_pins: [],
        on_model_pins: [],
        prompt_flatlay: "",
      })
      .select()
      .single();

    if (outfitErr || !newOutfit) continue;

    const itemsToInsert: any[] = [
      { outfit_id: newOutfit.id, product_id: top.id, slot_type: "top" },
      { outfit_id: newOutfit.id, product_id: bottom.id, slot_type: "bottom" },
      { outfit_id: newOutfit.id, product_id: shoes.id, slot_type: "shoes" },
    ];

    const candidateItems: Array<{ slot: string; productId: string; name: string; imageUrl: string; price?: number }> = [
      { slot: "top", productId: top.id, name: top.name, imageUrl: top.nobg_image_url || top.image_url, price: top.price },
      { slot: "bottom", productId: bottom.id, name: bottom.name, imageUrl: bottom.nobg_image_url || bottom.image_url, price: bottom.price },
      { slot: "shoes", productId: shoes.id, name: shoes.name, imageUrl: shoes.nobg_image_url || shoes.image_url, price: shoes.price },
    ];

    usedProductIds.add(top.id);
    usedProductIds.add(bottom.id);
    usedProductIds.add(shoes.id);

    // Optional slots: outer is encouraged for fall/winter
    const optionalSlots = season === "winter" || season === "fall"
      ? ["outer", "bag", "accessory", "mid"]
      : ["bag", "accessory", "outer", "mid"];

    for (const slot of optionalSlots) {
      const pick = pickBest(bySlot[slot] || []);
      if (pick) {
        itemsToInsert.push({ outfit_id: newOutfit.id, product_id: pick.id, slot_type: slot });
        candidateItems.push({ slot, productId: pick.id, name: pick.name, imageUrl: pick.nobg_image_url || pick.image_url, price: pick.price });
        usedProductIds.add(pick.id);
      }
    }

    await adminClient.from("outfit_items").insert(itemsToInsert);

    outfitIds.push(newOutfit.id);
    outfitCandidates.push({ outfitId: newOutfit.id, items: candidateItems });
  }

  if (outfitIds.length === 0) {
    throw new Error("Could not assemble any complete outfits from the registered products");
  }

  return { outfitIds, count: outfitIds.length, outfitCandidates };
}

async function triggerAIRefinementAndInsights(
  outfitIds: string[],
  context: { gender: string; bodyType: string; vibe: string; targetSeason?: string },
  adminClient: ReturnType<typeof createClient>,
  supabaseUrl: string,
  anonKey: string
): Promise<void> {
  const headers = { "Authorization": `Bearer ${anonKey}`, "Content-Type": "application/json" };

  await Promise.allSettled(outfitIds.map(async (outfitId) => {
    const { data: items } = await adminClient
      .from("outfit_items")
      .select("slot_type, products(*)")
      .eq("outfit_id", outfitId);

    if (!items || items.length === 0) return;

    const itemList = items.map((i: any) => ({
      slot_type: i.slot_type,
      brand: i.products?.brand || "",
      name: i.products?.name || "",
      category: i.products?.category || "",
      color: i.products?.color || "",
      color_family: i.products?.color_family || "",
      material: i.products?.material || "",
      pattern: i.products?.pattern || "",
      silhouette: i.products?.silhouette || "",
      sub_category: i.products?.sub_category || "",
      vibe: i.products?.vibe || [],
    }));

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-outfit-insight`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          items: itemList,
          gender: context.gender,
          bodyType: context.bodyType,
          vibe: context.vibe,
          season: context.targetSeason,
          matchScore: Math.round(75 + Math.random() * 15),
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.insight) {
          await adminClient.from("outfits").update({ "AI insight": d.insight }).eq("id", outfitId);
        }
      }
    } catch { /* silent */ }
  }));
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text && text.trim().length > 0) {
        body = JSON.parse(text);
      }
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      gender,
      body_type,
      vibe,
      season,
      outfit_count = 3,
      products_per_slot = 5,
    } = body as {
      gender?: string;
      body_type?: string;
      vibe?: string;
      season?: string;
      outfit_count?: number;
      products_per_slot?: number;
    };

    if (!gender || !body_type || !vibe) {
      return new Response(JSON.stringify({ error: "gender, body_type, vibe are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const batchId = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const events: PipelineEvent[] = [];

    events.push(makeEvent("init", "start", `Pipeline started`, { batchId, gender, body_type, vibe, season }));

    // ── STEP 1: Generate keywords ─────────────────────────────────────────────
    events.push(makeEvent("keywords", "start", "Generating style keywords via Gemini AI..."));
    let categories: Record<string, string[]> = {};
    try {
      categories = await generateKeywords(GEMINI_API_KEY, gender, body_type, vibe, season, SUPABASE_URL, SUPABASE_ANON_KEY);
      const totalKw = Object.values(categories).reduce((acc, arr) => acc + arr.length, 0);
      events.push(makeEvent("keywords", "success", `Generated ${totalKw} keywords across ${Object.keys(categories).length} categories`, { categories }));
    } catch (err) {
      events.push(makeEvent("keywords", "error", `Keyword generation failed: ${(err as Error).message}`));
      return new Response(JSON.stringify({ success: false, events, error: "Keyword generation failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── STEP 2: Amazon search per slot (parallel) ────────────────────────────
    events.push(makeEvent("search", "start", "Searching Amazon for products per slot..."));

    const PRIORITY_SLOTS = ["top", "bottom", "shoes", "outer", "bag", "accessory", "mid"];
    const MAX_KW_PER_SLOT = 1;
    const MAX_RESULTS_PER_KW = 3;

    const slotSearchResults = await Promise.all(
      PRIORITY_SLOTS.map(async (slot) => {
        const keywords = categories[slot] || [];
        if (keywords.length === 0) return { slot, candidates: [] };
        const kwToSearch = keywords.slice(0, MAX_KW_PER_SLOT);
        const seenAsins = new Set<string>();
        const candidates: Array<{ product: any; slot: string; keyword: string }> = [];
        for (const kw of kwToSearch) {
          try {
            const results = await searchAmazon(kw, SUPABASE_URL, SUPABASE_ANON_KEY);
            for (const r of results.slice(0, MAX_RESULTS_PER_KW)) {
              if (r.asin && !seenAsins.has(r.asin)) {
                seenAsins.add(r.asin);
                candidates.push({ product: r, slot, keyword: kw });
              }
            }
          } catch { /* skip failed searches */ }
        }
        return { slot, candidates };
      })
    );

    const allCandidates: Array<{ product: any; slot: string; keyword: string }> = [];
    for (const { slot, candidates } of slotSearchResults) {
      allCandidates.push(...candidates);
      if (candidates.length > 0) {
        events.push(makeEvent("search", "progress", `[${slot}] Found ${candidates.length} candidates`, { slot, count: candidates.length }));
      }
    }

    events.push(makeEvent("search", "success", `Total ${allCandidates.length} candidates found`));

    if (allCandidates.length === 0) {
      return new Response(JSON.stringify({ success: false, events, error: "No products found in Amazon search" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── STEP 3: Deduplicate & limit per slot ──────────────────────────────────
    const bySlotCandidates: Record<string, Array<{ product: any; keyword: string }>> = {};
    for (const { product, slot, keyword } of allCandidates) {
      if (!bySlotCandidates[slot]) bySlotCandidates[slot] = [];
      if (bySlotCandidates[slot].length < products_per_slot) {
        bySlotCandidates[slot].push({ product, keyword });
      }
    }

    // Check duplicate ASINs in existing DB
    const existingAsins = new Set<string>();
    const allAsins = allCandidates.map(c => c.product.asin).filter(Boolean);
    if (allAsins.length > 0) {
      const { data: existing } = await adminClient
        .from("products")
        .select("product_link")
        .not("product_link", "is", null);
      if (existing) {
        for (const row of existing) {
          const match = (row.product_link || "").match(/\/dp\/([A-Z0-9]{10})/);
          if (match) existingAsins.add(match[1]);
        }
      }
    }

    // ── STEP 4: Analyze & register products (parallel per slot) ─────────────
    events.push(makeEvent("register", "start", "Analyzing and registering products with AI..."));

    const registerResults = await Promise.all(
      PRIORITY_SLOTS.map(async (slot) => {
        const candidates = bySlotCandidates[slot] || [];
        const registered: string[] = [];
        for (const { product } of candidates) {
          const asin = product.asin;
          if (asin && existingAsins.has(asin)) continue;
          const result = await analyzeAndRegisterProduct(
            product, gender!, body_type!, vibe!, season!, batchId, GEMINI_API_KEY, adminClient
          );
          if (result.success && result.productId) {
            registered.push(result.productId);
            if (asin) existingAsins.add(asin);
          }
        }
        return { slot, registered };
      })
    );

    let registeredCount = 0;
    const registeredProductIds: string[] = [];
    for (const { slot, registered } of registerResults) {
      registeredCount += registered.length;
      registeredProductIds.push(...registered);
      if (registered.length > 0) {
        events.push(makeEvent("register", "progress", `[${slot}] Registered ${registered.length} products`, { slot }));
      }
    }

    events.push(makeEvent("register", "success", `Registered ${registeredCount} products total`));

    if (registeredCount === 0) {
      return new Response(JSON.stringify({ success: false, events, error: "No products were successfully registered" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── STEP 5: Flatlay extraction (AI detect → extract, async fire-and-forget) ─
    events.push(makeEvent("nobg", "start", "Queuing AI flatlay extraction for all products..."));
    const { data: productsForBg } = await adminClient
      .from("products")
      .select("id, image_url, category, sub_category")
      .eq("batch_id", batchId)
      .is("nobg_image_url", null);

    if (productsForBg && productsForBg.length > 0) {
      EdgeRuntime.waitUntil(
        (async () => {
          for (const p of productsForBg) {
            if (p.image_url) {
              await triggerExtractProduct(
                p.id, p.image_url, p.category || "top", p.sub_category || "",
                SUPABASE_URL, SUPABASE_SERVICE_KEY
              ).catch(() => {});
              await delay(1500);
            }
          }
        })()
      );
      events.push(makeEvent("nobg", "success", `AI flatlay extraction queued for ${productsForBg.length} products (async)`));
    }

    // ── STEP 6: Generate outfit candidates ────────────────────────────────────
    events.push(makeEvent("outfits", "start", `Generating ${outfit_count} outfit candidates from registered products...`));
    let outfitIds: string[] = [];
    let outfitCount = 0;
    let outfitCandidates: Array<{ outfitId: string; items: Array<{ slot: string; productId: string; name: string; imageUrl: string; price?: number }> }> = [];

    try {
      const outfitResult = await generateOutfitsFromBatch(
        batchId, gender, body_type, vibe, season, outfit_count,
        adminClient, SUPABASE_URL, SUPABASE_ANON_KEY
      );
      outfitIds = outfitResult.outfitIds;
      outfitCount = outfitResult.count;
      outfitCandidates = outfitResult.outfitCandidates;
      events.push(makeEvent("outfits", "success", `Generated ${outfitCount} outfit candidates (draft — awaiting user selection)`, { outfitIds }));
    } catch (err) {
      events.push(makeEvent("outfits", "error", `Outfit generation failed: ${(err as Error).message}`));
    }

    // ── DONE ─────────────────────────────────────────────────────────────────
    events.push(makeEvent("done", "success", `Pipeline complete. ${registeredCount} products, ${outfitCount} outfit candidates ready for review.`, {
      batchId,
      productsRegistered: registeredCount,
      outfitsGenerated: outfitCount,
    }));

    const result: PipelineResult = {
      batchId,
      events,
      productsRegistered: registeredCount,
      outfitsGenerated: outfitCount,
      outfitIds,
      outfitCandidates,
      success: true,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
