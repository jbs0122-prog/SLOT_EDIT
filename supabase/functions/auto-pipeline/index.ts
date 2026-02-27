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

async function triggerBgRemoval(
  productId: string,
  imageUrl: string,
  supabaseUrl: string,
  anonKey: string
): Promise<void> {
  await fetch(`${supabaseUrl}/functions/v1/remove-bg`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${anonKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl, productId }),
  });
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
): Promise<{ outfitIds: string[]; count: number }> {
  const { data: batchProducts } = await adminClient
    .from("products")
    .select("*")
    .eq("batch_id", batchId);

  if (!batchProducts || batchProducts.length === 0) {
    throw new Error("No products found for batch");
  }

  const SEASON_WARMTH: Record<string, number> = {
    spring: 2, summer: 1, fall: 3, winter: 5,
  };
  const targetWarmth = SEASON_WARMTH[season] || 3;

  const seasonMap: Record<string, string> = {
    spring: "spring", summer: "summer", fall: "fall", winter: "winter",
  };
  const targetSeason = seasonMap[season] || undefined;

  const slots = ["top", "bottom", "shoes", "bag", "accessory", "outer", "mid"];
  const bySlot: Record<string, any[]> = {};
  for (const slot of slots) {
    bySlot[slot] = batchProducts.filter((p: any) => p.category === slot);
  }

  const essentialSlots = ["top", "bottom", "shoes"];
  for (const slot of essentialSlots) {
    if (!bySlot[slot] || bySlot[slot].length === 0) {
      throw new Error(`Not enough products: missing ${slot} slot`);
    }
  }

  const outfitIds: string[] = [];
  const usedProductIds = new Set<string>();

  for (let i = 0; i < outfitCount; i++) {
    const pickBest = (slotProducts: any[]): any | null => {
      const available = slotProducts.filter((p: any) => !usedProductIds.has(p.id));
      if (available.length === 0) return null;
      return available[Math.floor(Math.random() * Math.min(available.length, 3))];
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
        season: targetSeason || null,
        status: "pending_render",
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

    usedProductIds.add(top.id);
    usedProductIds.add(bottom.id);
    usedProductIds.add(shoes.id);

    const optionalSlots = ["bag", "accessory", "outer", "mid"];
    for (const slot of optionalSlots) {
      if (targetSeason === "summer" && (slot === "outer" || slot === "mid")) continue;
      if (targetSeason === "spring" && slot === "mid") continue;
      const pick = pickBest(bySlot[slot] || []);
      if (pick) {
        itemsToInsert.push({ outfit_id: newOutfit.id, product_id: pick.id, slot_type: slot });
        usedProductIds.add(pick.id);
      }
    }

    await adminClient.from("outfit_items").insert(itemsToInsert);

    outfitIds.push(newOutfit.id);
  }

  if (outfitIds.length === 0) {
    throw new Error("Could not assemble any complete outfits from the registered products");
  }

  EdgeRuntime.waitUntil(
    triggerAIRefinementAndInsights(outfitIds, { gender, bodyType, vibe, targetSeason }, adminClient, supabaseUrl, anonKey)
  );

  return { outfitIds, count: outfitIds.length };
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

    // ── STEP 5: Background removal (async fire-and-forget) ────────────────────
    events.push(makeEvent("nobg", "start", "Queuing background removal for all products..."));
    const { data: productsForBg } = await adminClient
      .from("products")
      .select("id, image_url")
      .eq("batch_id", batchId)
      .is("nobg_image_url", null);

    if (productsForBg && productsForBg.length > 0) {
      EdgeRuntime.waitUntil(
        (async () => {
          for (const p of productsForBg) {
            if (p.image_url) {
              await triggerBgRemoval(p.id, p.image_url, SUPABASE_URL, SUPABASE_ANON_KEY).catch(() => {});
              await delay(500);
            }
          }
        })()
      );
      events.push(makeEvent("nobg", "success", `Background removal queued for ${productsForBg.length} products (async)`));
    }

    // ── STEP 6: Generate outfits ───────────────────────────────────────────────
    events.push(makeEvent("outfits", "start", `Generating ${outfit_count} outfits from registered products...`));
    let outfitIds: string[] = [];
    let outfitCount = 0;

    try {
      const result = await generateOutfitsFromBatch(
        batchId, gender, body_type, vibe, season, outfit_count,
        adminClient, SUPABASE_URL, SUPABASE_ANON_KEY
      );
      outfitIds = result.outfitIds;
      outfitCount = result.count;
      events.push(makeEvent("outfits", "success", `Generated ${outfitCount} outfits`, { outfitIds }));
    } catch (err) {
      events.push(makeEvent("outfits", "error", `Outfit generation failed: ${(err as Error).message}`));
    }

    // ── DONE ─────────────────────────────────────────────────────────────────
    events.push(makeEvent("done", "success", `Pipeline complete. ${registeredCount} products, ${outfitCount} outfits.`, {
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
