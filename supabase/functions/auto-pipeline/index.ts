import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Matching Architecture: Color DNA ─────────────────────────────────────────

const COLOR_TONE_MAP: Record<string, "warm" | "cool" | "neutral"> = {
  black: "neutral", white: "neutral", grey: "neutral", charcoal: "neutral",
  cream: "warm", ivory: "warm", beige: "warm", tan: "warm", camel: "warm",
  brown: "warm", rust: "warm", mustard: "warm", orange: "warm", red: "warm",
  burgundy: "warm", wine: "warm", gold: "warm", metallic: "neutral",
  navy: "cool", blue: "cool", sky_blue: "cool", teal: "cool", sage: "cool",
  olive: "cool", khaki: "neutral", denim: "cool", lavender: "cool",
  green: "cool", pink: "warm", coral: "warm", purple: "cool",
  multi: "neutral",
};

const NEUTRAL_COLORS = new Set(["black", "white", "grey", "charcoal", "cream", "ivory", "beige"]);
const EARTH_TONES = new Set(["tan", "camel", "brown", "khaki", "olive", "sage", "rust", "mustard"]);

function isNeutral(color: string): boolean { return NEUTRAL_COLORS.has(color); }
function isEarth(color: string): boolean { return EARTH_TONES.has(color); }
function colorTone(color: string): string { return COLOR_TONE_MAP[color] || "neutral"; }

const COLOR_HARMONY: Record<string, string[]> = {
  black:    ["white", "grey", "charcoal", "cream", "ivory", "beige", "red", "burgundy", "navy"],
  white:    ["black", "navy", "grey", "blue", "red", "pink", "green", "brown"],
  grey:     ["black", "white", "navy", "burgundy", "charcoal", "cream", "blue"],
  charcoal: ["black", "white", "grey", "cream", "navy", "burgundy", "red"],
  navy:     ["white", "cream", "grey", "red", "burgundy", "camel", "tan", "beige"],
  beige:    ["brown", "tan", "camel", "cream", "white", "navy", "burgundy", "olive", "rust"],
  cream:    ["beige", "tan", "brown", "camel", "navy", "burgundy", "black", "olive"],
  ivory:    ["beige", "tan", "camel", "cream", "black", "brown", "navy"],
  brown:    ["cream", "beige", "tan", "camel", "olive", "rust", "burgundy", "navy", "white"],
  tan:      ["brown", "beige", "cream", "camel", "olive", "navy", "burgundy", "rust"],
  camel:    ["brown", "tan", "beige", "cream", "navy", "burgundy", "rust", "white"],
  olive:    ["cream", "tan", "brown", "beige", "burgundy", "rust", "navy", "khaki"],
  khaki:    ["olive", "tan", "brown", "cream", "beige", "navy", "white"],
  rust:     ["cream", "beige", "tan", "brown", "navy", "olive", "burgundy"],
  mustard:  ["brown", "cream", "tan", "navy", "olive", "burgundy"],
  burgundy: ["cream", "beige", "tan", "camel", "navy", "grey", "charcoal", "black"],
  wine:     ["cream", "beige", "grey", "navy", "black"],
  denim:    ["white", "cream", "grey", "navy", "brown", "tan"],
  blue:     ["white", "grey", "navy", "cream", "tan", "brown"],
  sky_blue: ["white", "cream", "grey", "beige"],
  teal:     ["cream", "beige", "grey", "white", "navy"],
  sage:     ["cream", "beige", "tan", "brown", "white"],
  green:    ["white", "cream", "beige", "brown", "navy"],
  red:      ["white", "grey", "black", "navy", "cream"],
  pink:     ["white", "cream", "grey", "navy"],
  coral:    ["white", "cream", "beige"],
  orange:   ["white", "cream", "navy", "brown"],
  purple:   ["white", "cream", "grey", "black"],
  lavender: ["white", "cream", "grey"],
  metallic: ["black", "white", "navy", "grey", "cream"],
  gold:     ["black", "navy", "cream", "burgundy"],
  multi:    ["black", "white", "grey", "navy"],
};

function getColorHarmonyScore(c1: string, c2: string): number {
  if (c1 === c2) return isNeutral(c1) ? 60 : 40;
  const harmonics = COLOR_HARMONY[c1] || [];
  if (harmonics.includes(c2)) return 80;
  const t1 = colorTone(c1), t2 = colorTone(c2);
  if (t1 === t2) return 55;
  if (t1 === "neutral" || t2 === "neutral") return 60;
  return 30;
}

function getTonalHarmonyScore(colors: string[]): number {
  if (colors.length < 2) return 60;
  let sum = 0, count = 0;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      sum += getColorHarmonyScore(colors[i], colors[j]);
      count++;
    }
  }
  return count > 0 ? sum / count : 60;
}

// ── Matching Architecture: Scoring Rules ─────────────────────────────────────

interface Product {
  id: string;
  category: string;
  sub_category?: string;
  color?: string;
  color_family?: string;
  color_tone?: string;
  silhouette?: string;
  material?: string;
  pattern?: string;
  vibe?: string[];
  body_type?: string[];
  season?: string[];
  formality?: number;
  warmth?: number;
  name?: string;
  image_url?: string;
  nobg_image_url?: string;
  price?: number;
}

function normalizeColorFamily(raw: string): string {
  if (!raw) return "black";
  const VALID = new Set(["black","white","grey","navy","beige","brown","blue","green","red","yellow","purple","pink","orange","metallic","multi","khaki","cream","ivory","burgundy","wine","olive","mustard","coral","charcoal","tan","camel","rust","sage","mint","lavender","teal","sky_blue","denim"]);
  const MAP: Record<string, string> = {
    gray:"grey", multicolor:"multi", "multi-color":"multi", "multi color":"multi",
    nude:"beige", sand:"beige", taupe:"beige", "light blue":"sky_blue", "sky blue":"sky_blue",
    "dark blue":"navy", "light brown":"tan", maroon:"burgundy", "dark red":"burgundy",
    turquoise:"teal", cyan:"teal", gold:"metallic", silver:"metallic", "off-white":"cream",
    "dark gray":"charcoal", "dark grey":"charcoal", ecru:"ivory",
  };
  const lower = raw.toLowerCase().trim();
  if (VALID.has(lower)) return lower;
  if (MAP[lower]) return MAP[lower];
  for (const [k, v] of Object.entries(MAP)) { if (lower.includes(k)) return v; }
  for (const valid of VALID) { if (lower.includes(valid)) return valid; }
  return "black";
}

function resolveColor(product: Product): string {
  if (product.color_family) return normalizeColorFamily(product.color_family);
  if (product.color) return normalizeColorFamily(product.color);
  return "black";
}

function scoreTonalHarmony(items: Record<string, Product>): number {
  const all = Object.values(items).filter(Boolean);
  if (all.length < 2) return 60;
  const colors = all.map(p => resolveColor(p));
  let score = getTonalHarmonyScore(colors);

  const neutralCount = colors.filter(isNeutral).length;
  const accents = colors.filter(c => !isNeutral(c) && !isEarth(c));
  const accentRatio = accents.length / colors.length;
  const uniqueAccents = new Set(accents);

  if (accentRatio <= 0.10 && neutralCount >= 2) score += 5;
  else if (accentRatio <= 0.30 && uniqueAccents.size <= 1) score += 3;
  else if (accentRatio > 0.50) score -= 8;
  if (uniqueAccents.size > 2) score -= 12;

  const tones = all.map(p => p.color_tone).filter(Boolean);
  if (tones.length >= 2) {
    const warm = tones.filter(t => t === "warm").length;
    const cool = tones.filter(t => t === "cool").length;
    if (warm > 0 && cool > 0) {
      const mix = Math.min(warm, cool) / Math.max(warm, cool);
      if (mix > 0.5) score -= 10;
    }
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

const SILHOUETTE_BALANCE: Record<string, string[]> = {
  oversized: ["slim","fitted","straight","tapered"],
  relaxed:   ["slim","fitted","straight","tapered"],
  wide:      ["fitted","slim"],
  fitted:    ["wide","relaxed","oversized","straight"],
  slim:      ["wide","relaxed","oversized","regular"],
  regular:   ["slim","fitted","wide","relaxed","oversized"],
  straight:  ["fitted","slim","oversized","relaxed"],
  tapered:   ["relaxed","oversized","regular","wide"],
};

const BODY_TYPE_SIL_PREFS: Record<string, Record<string, string[]>> = {
  slim:       { top: ["regular","relaxed","oversized"], outer: ["regular","relaxed","oversized"], bottom: ["wide","straight","relaxed"] },
  regular:    { top: ["regular","fitted","relaxed"], outer: ["regular","relaxed"], bottom: ["wide","straight","tapered"] },
  "plus-size":{ top: ["regular","relaxed"], outer: ["regular","relaxed"], bottom: ["wide","straight","relaxed"] },
};

function scoreProportion(items: Record<string, Product>, bodyType?: string): number {
  const top = items.top, bottom = items.bottom, outer = items.outer;
  if (!top || !bottom) return 60;
  const topSil = top.silhouette || "regular";
  const bottomSil = bottom.silhouette || "regular";
  const outerSil = outer?.silhouette || "";
  let score = 60;

  const evalPair = (s1: string, s2: string, w: number) => {
    if (!s1 || !s2) return;
    const good = SILHOUETTE_BALANCE[s1] || [];
    if (good.includes(s2)) { score += 25 * w; return; }
    if (s1 === s2) {
      if (s1 === "oversized" || s1 === "wide") score -= 18 * w;
      else if (s1 === "fitted" || s1 === "slim") score -= 5 * w;
    }
  };
  evalPair(topSil, bottomSil, 1.0);
  if (outerSil) {
    evalPair(outerSil, bottomSil, 0.7);
    evalPair(outerSil, topSil, 0.5);
    if (outerSil === "oversized" && topSil === "oversized") score -= 15;
  }

  if (bodyType) {
    const prefs = BODY_TYPE_SIL_PREFS[bodyType];
    if (prefs) {
      for (const [cat, sil, _prod] of [["top", topSil, top], ["bottom", bottomSil, bottom]] as [string, string, Product][]) {
        const preferred = prefs[cat];
        if (!preferred) continue;
        const idx = preferred.indexOf(sil);
        if (idx === 0) score += 12;
        else if (idx === 1) score += 6;
        else if (idx === -1) score -= 8;
      }
      if (outerSil && outer) {
        const preferred = prefs["outer"];
        if (preferred) {
          const idx = preferred.indexOf(outerSil);
          if (idx === 0) score += 12;
          else if (idx === 1) score += 6;
          else if (idx === -1) score -= 8;
        }
      }
    }
    if (bottomSil === "wide") score += 6;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

const STYLE_COMPAT: Record<string, Record<string, number>> = {
  formal:       { formal: 1.0, smart_casual: 0.75, casual: 0.35, sporty: 0.1 },
  smart_casual: { formal: 0.75, smart_casual: 1.0, casual: 0.8, sporty: 0.4 },
  casual:       { formal: 0.35, smart_casual: 0.8, casual: 1.0, sporty: 0.7 },
  sporty:       { formal: 0.1, smart_casual: 0.4, casual: 0.7, sporty: 1.0 },
};

const SUB_CATEGORY_STYLE: Record<string, string> = {
  blazer:"formal", slacks:"formal", pencil_skirt:"formal", trench:"formal",
  oxford:"formal", loafer:"formal", derby:"formal", necktie:"formal", tuxedo_jacket:"formal",
  blouse:"smart_casual", cardigan:"smart_casual", polo:"smart_casual", chinos:"smart_casual",
  knit:"smart_casual", shirt:"smart_casual", turtleneck:"smart_casual", sweater:"smart_casual",
  coat:"smart_casual", boot:"smart_casual", tote:"smart_casual",
  tshirt:"casual", hoodie:"casual", sweatshirt:"casual", denim_jacket:"casual",
  denim:"casual", jogger:"casual", shorts:"casual", cargo:"casual",
  sneaker:"casual", sandal:"casual", backpack:"casual", cap:"casual", beanie:"casual",
  track_jacket:"sporty", windbreaker:"sporty", puffer:"sporty", leggings:"sporty",
  track_pants:"sporty", training_shoe:"sporty",
};

function formalityToStyle(f: number): string {
  if (f >= 7) return "formal";
  if (f >= 4) return "smart_casual";
  if (f >= 2) return "casual";
  return "sporty";
}

function inferStyle(product: Product): string {
  const sub = (product.sub_category || "").toLowerCase().replace(/[\s-]/g, "_");
  if (SUB_CATEGORY_STYLE[sub]) return SUB_CATEGORY_STYLE[sub];
  const name = (product.name || "").toLowerCase();
  for (const [cat, style] of Object.entries(SUB_CATEGORY_STYLE)) {
    if (name.includes(cat.replace(/_/g, " ")) || name.includes(cat)) return style;
  }
  const f = typeof product.formality === "number" ? product.formality * 2 : 6;
  return formalityToStyle(f);
}

function scoreFormalityCoherence(items: Record<string, Product>, vibeDna?: typeof VIBE_DNA[string]): number {
  const all = Object.values(items).filter(Boolean);
  if (all.length < 2) return 60;
  const formalities = all.map(p => (typeof p.formality === "number" ? p.formality * 2 : 6));
  const styles = all.map(p => inferStyle(p));
  let score = 70;

  const fRange = Math.max(...formalities) - Math.min(...formalities);
  if (fRange <= 2) score += 15;
  else if (fRange <= 3) score += 5;
  else if (fRange > 5) score -= 20;
  else if (fRange > 4) score -= 10;

  let compatSum = 0, compatCount = 0;
  for (let i = 0; i < styles.length; i++) {
    for (let j = i + 1; j < styles.length; j++) {
      compatSum += STYLE_COMPAT[styles[i]]?.[styles[j]] ?? 0.5;
      compatCount++;
    }
  }
  const avgCompat = compatCount > 0 ? compatSum / compatCount : 0.5;
  score += (avgCompat - 0.5) * 40;

  if (vibeDna) {
    const [fMin, fMax] = vibeDna.formality_range;
    const avgF = formalities.reduce((s, f) => s + f, 0) / formalities.length;
    if (avgF >= fMin && avgF <= fMax) score += 10;
    else {
      const overshoot = avgF < fMin ? fMin - avgF : avgF - fMax;
      score -= overshoot * 6;
    }
  }

  const coreStyles = ["top","bottom","shoes"].map(k => items[k]).filter(Boolean).map(p => inferStyle(p));
  if (coreStyles.length >= 3 && coreStyles.includes("formal") && coreStyles.includes("sporty")) score -= 15;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreVibeAffinity(items: Record<string, Product>, vibe: string): number {
  const coreKeys = ["outer","mid","top","bottom","shoes"];
  const coreItems = coreKeys.map(k => items[k]).filter(Boolean) as Product[];
  if (coreItems.length < 2) return 50;

  const matchCount = coreItems.filter(p => (p.vibe || []).includes(vibe)).length;
  const ratio = matchCount / coreItems.length;
  let score = 40 + ratio * 50;
  if (ratio >= 0.8) score += 10;
  else if (ratio <= 0.3) score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreSeasonFit(items: Record<string, Product>, season: string): number {
  if (!season) return 60;
  const all = Object.values(items).filter(Boolean);
  if (all.length === 0) return 60;
  const matchCount = all.filter(p => (p.season || []).includes(season)).length;
  const ratio = matchCount / all.length;
  return Math.max(0, Math.min(100, Math.round(40 + ratio * 60)));
}

const SCORE_WEIGHTS = {
  tonalHarmony: 0.20,
  proportion: 0.15,
  formalityCoherence: 0.15,
  vibeAffinity: 0.20,
  seasonFit: 0.15,
  genderMatch: 0.15,
};

function scoreOutfitComposition(
  items: Record<string, Product>,
  vibe: string,
  gender: string,
  bodyType: string,
  season: string,
): number {
  const vibeDna = VIBE_DNA[vibe];
  const tonal = scoreTonalHarmony(items);
  const proportion = scoreProportion(items, bodyType);
  const formality = scoreFormalityCoherence(items, vibeDna);
  const vibeAff = scoreVibeAffinity(items, vibe);
  const seasonFit = scoreSeasonFit(items, season);

  const allItems = Object.values(items).filter(Boolean) as Product[];
  let genderScore = 50;
  if (allItems.length > 0) {
    const matchCount = allItems.filter(p =>
      p.gender === gender || p.gender === "UNISEX"
    ).length;
    genderScore = Math.round((matchCount / allItems.length) * 100);
  }

  return Math.round(
    tonal * SCORE_WEIGHTS.tonalHarmony +
    proportion * SCORE_WEIGHTS.proportion +
    formality * SCORE_WEIGHTS.formalityCoherence +
    vibeAff * SCORE_WEIGHTS.vibeAffinity +
    seasonFit * SCORE_WEIGHTS.seasonFit +
    genderScore * SCORE_WEIGHTS.genderMatch
  );
}

// ── VIBE DNA ─────────────────────────────────────────────────────────────────

const VIBE_DNA: Record<string, {
  formality_range: [number, number];
  color_palette: { primary: string[]; secondary: string[]; accent: string[] };
  material_preferences: string[];
  silhouette_preference: string[];
  proportion_style: string;
}> = {
  ELEVATED_COOL: {
    formality_range: [5, 9],
    color_palette: { primary: ["black","charcoal","navy","white"], secondary: ["grey","cream","camel"], accent: ["burgundy","metallic","wine"] },
    material_preferences: ["structured","luxe","classic"],
    silhouette_preference: ["I","V"],
    proportion_style: "column",
  },
  EFFORTLESS_NATURAL: {
    formality_range: [2, 6],
    color_palette: { primary: ["beige","cream","ivory","white"], secondary: ["olive","khaki","tan","sage","brown"], accent: ["rust","mustard","burgundy"] },
    material_preferences: ["classic","eco","knit"],
    silhouette_preference: ["A","H","I"],
    proportion_style: "relaxed",
  },
  ARTISTIC_MINIMAL: {
    formality_range: [3, 8],
    color_palette: { primary: ["black","white","grey","charcoal"], secondary: ["cream","beige","navy"], accent: ["rust","olive","burgundy"] },
    material_preferences: ["classic","structured","eco","knit"],
    silhouette_preference: ["I","A","Y"],
    proportion_style: "column",
  },
  RETRO_LUXE: {
    formality_range: [3, 8],
    color_palette: { primary: ["burgundy","navy","brown","cream"], secondary: ["camel","olive","wine","beige"], accent: ["rust","mustard","teal","gold"] },
    material_preferences: ["luxe","structured","classic","knit"],
    silhouette_preference: ["A","X","I"],
    proportion_style: "balanced",
  },
  SPORT_MODERN: {
    formality_range: [0, 4],
    color_palette: { primary: ["black","grey","white","navy"], secondary: ["olive","khaki","charcoal"], accent: ["orange","teal","red","green"] },
    material_preferences: ["technical","casual","blend"],
    silhouette_preference: ["I","V"],
    proportion_style: "balanced",
  },
  CREATIVE_LAYERED: {
    formality_range: [0, 5],
    color_palette: { primary: ["black","grey","white","denim"], secondary: ["burgundy","brown","olive","navy"], accent: ["red","purple","orange","pink","yellow"] },
    material_preferences: ["structured","casual","classic","sheer"],
    silhouette_preference: ["V","A","Y"],
    proportion_style: "top-heavy",
  },
};

// ── Season / Warmth helpers ───────────────────────────────────────────────────

const SEASON_WARMTH_RANGE: Record<string, { min: number; max: number }> = {
  summer: { min: 1, max: 2 },
  spring: { min: 1, max: 3 },
  fall:   { min: 2, max: 4 },
  winter: { min: 3, max: 5 },
};

const OUTER_VEST_SUBCATS = new Set([
  "vest","down_vest","quilted_vest","fleece_vest","knitted_vest","gilet",
]);

function isSeasonAppropriateOuter(product: Product, season: string): boolean {
  const sub = (product.sub_category || "").toLowerCase().replace(/[\s-]/g, "_");
  const warmth = typeof product.warmth === "number" ? product.warmth : 3;
  if (season === "winter") {
    if (OUTER_VEST_SUBCATS.has(sub)) return false;
    if (warmth < 3) return false;
  }
  if (season === "summer") return false;
  if (season === "spring") { if (warmth > 4) return false; }
  return true;
}

function upgradeImageResolution(url: string): string {
  if (!url) return url;
  return url
    .replace(/_AC_U[A-Z0-9]+_\./g, "_AC_SL1500_.")
    .replace(/_AC_SR\d+,\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_SY\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_SX\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_UL\d+_\./g, "_AC_SL1500_.")
    .replace(/_AC_SS\d+_\./g, "_AC_SL1500_.")
    .replace(/\._[A-Z0-9,_]+_\./g, "._AC_SL1500_.");
}

// ── Pipeline types ────────────────────────────────────────────────────────────

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

// ── Step 1: Generate keywords ─────────────────────────────────────────────────

async function generateKeywords(
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

// ── Step 2: Amazon search ─────────────────────────────────────────────────────

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

// ── Step 3: Analyze & register via analyze-amazon-product Edge Function ───────
// Delegates to the same Edge Function used by AdminAmazonSearch,
// ensuring identical Gemini prompt, vibe validation, and normalization logic.
// After insert, we update batch_id by matching on product_link (ASIN).

async function analyzeAndRegisterProduct(
  product: any,
  gender: string,
  bodyType: string,
  vibe: string,
  season: string,
  batchId: string,
  supabaseUrl: string,
  serviceKey: string,
  adminClient: ReturnType<typeof createClient>
): Promise<{ success: boolean; productId?: string; name?: string }> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/analyze-amazon-product`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ product, gender, body_type: bodyType, vibe, season }),
    });

    if (!res.ok) return { success: false };

    const data = await res.json();
    if (data.error) return { success: false };

    const productLink = product.url || "";
    if (!productLink) return { success: false };

    const { data: inserted, error: findErr } = await adminClient
      .from("products")
      .select("id, name")
      .eq("product_link", productLink)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findErr || !inserted) return { success: false };

    await adminClient
      .from("products")
      .update({ batch_id: batchId })
      .eq("id", inserted.id);

    return { success: true, productId: inserted.id, name: inserted.name };
  } catch {
    return { success: false };
  }
}

// ── Step 4: Flatlay extraction ────────────────────────────────────────────────

async function triggerExtractProduct(
  productId: string,
  imageUrl: string,
  category: string,
  subCategory: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<void> {
  const headers = { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const adminClient = createClient(supabaseUrl, serviceKey);

  const slot = ["outer","mid","top","bottom","shoes","bag","accessory"].includes(category) ? category : "top";
  const label = subCategory || category;

  let nobgUrl: string | null = null;
  let isModelShot = false;

  try {
    const detectRes = await fetch(`${supabaseUrl}/functions/v1/extract-products`, {
      method: "POST",
      headers,
      body: JSON.stringify({ mode: "detect", imageUrl }),
    });
    if (detectRes.ok) {
      const detectData = await detectRes.json();
      if (detectData.success && detectData.items?.length) {
        isModelShot = true;
        const targetItem = detectData.items.find((i: any) => i.slot === slot) ?? detectData.items[0];
        const extractRes = await fetch(`${supabaseUrl}/functions/v1/extract-products`, {
          method: "POST",
          headers,
          body: JSON.stringify({ mode: "extract", imageUrl, slot: targetItem.slot, label: targetItem.label || label }),
        });
        if (extractRes.ok) {
          const extractData = await extractRes.json();
          if (extractData.success && extractData.imageUrl) nobgUrl = extractData.imageUrl;
        }
      }
    }
  } catch { /* fall through */ }

  const pixianSourceUrl = nobgUrl || (!isModelShot ? imageUrl : null);
  if (pixianSourceUrl) {
    try {
      const pixianRes = await fetch(`${supabaseUrl}/functions/v1/remove-bg`, {
        method: "POST",
        headers,
        body: JSON.stringify({ imageUrl: pixianSourceUrl, productId }),
      });
      if (pixianRes.ok) {
        const pixianData = await pixianRes.json();
        if (pixianData.success && (pixianData.url || pixianData.image)) {
          nobgUrl = pixianData.url || pixianData.image;
        }
      }
    } catch { /* silent */ }
  }

  if (nobgUrl && !nobgUrl.startsWith("data:")) {
    try {
      await adminClient.from("products").update({ nobg_image_url: nobgUrl }).eq("id", productId);
    } catch { /* silent */ }
  }
}

// ── Step 5: Generate outfit candidates using full matching scoring ─────────────
// Replicates the matching architecture (tonalHarmony, proportion,
// formalityCoherence, vibeAffinity, seasonFit, genderMatch) from the
// frontend matchingEngine / scorer, ensuring Auto Pipeline produces
// the same outfit quality as the manual outfit generation flow.

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

  const slots = ["top","bottom","shoes","bag","accessory","outer","mid"];
  const bySlot: Record<string, Product[]> = {};
  for (const slot of slots) {
    bySlot[slot] = batchProducts.filter((p: any) => p.category === slot);
  }

  bySlot["outer"] = bySlot["outer"].filter((p: Product) => isSeasonAppropriateOuter(p, season));
  if (season === "summer") bySlot["mid"] = [];

  const missingHard = ["top","bottom"].filter(s => !bySlot[s] || bySlot[s].length === 0);
  if (missingHard.length > 0) {
    const catCount: Record<string, number> = {};
    for (const p of batchProducts) catCount[p.category] = (catCount[p.category] || 0) + 1;
    throw new Error(`Missing essential slots: ${missingHard.join(", ")}. Available: ${JSON.stringify(catCount)}`);
  }

  const outfitIds: string[] = [];
  const outfitCandidates: Array<{
    outfitId: string;
    matchScore: number;
    items: Array<{ slot: string; productId: string; name: string; imageUrl: string; price?: number }>;
  }> = [];

  const usedProductIds = new Set<string>();

  const optionalSlots = season === "winter"
    ? ["outer","mid","shoes","bag","accessory"]
    : season === "fall"
    ? ["outer","shoes","mid","bag","accessory"]
    : season === "spring"
    ? ["shoes","bag","accessory","outer","mid"]
    : ["shoes","bag","accessory"];

  // Generate candidate pool by scoring all possible top+bottom combinations
  // then greedily pick optional slots to maximize composition score.
  const tops = bySlot["top"];
  const bottoms = bySlot["bottom"];

  interface CandidateCombo {
    items: Record<string, Product>;
    score: number;
  }

  const combos: CandidateCombo[] = [];
  for (const top of tops) {
    for (const bottom of bottoms) {
      const baseItems: Record<string, Product> = { top, bottom };

      // Greedily add best optional slot item using composition scoring
      for (const slot of optionalSlots) {
        const pool = bySlot[slot] || [];
        if (pool.length === 0) continue;

        let bestScore = -Infinity;
        let bestPick: Product | null = null;
        for (const candidate of pool) {
          const testItems = { ...baseItems, [slot]: candidate };
          const s = scoreOutfitComposition(testItems, vibe, gender, bodyType, season);
          if (s > bestScore) { bestScore = s; bestPick = candidate; }
        }
        if (bestPick) baseItems[slot] = bestPick;
      }

      const score = scoreOutfitComposition(baseItems, vibe, gender, bodyType, season);
      combos.push({ items: baseItems, score });
    }
  }

  // Sort by score descending
  combos.sort((a, b) => b.score - a.score);

  // Pick top N diverse combos (avoid reusing same top or bottom)
  const usedTops = new Set<string>();
  const usedBottoms = new Set<string>();
  const selectedCombos: CandidateCombo[] = [];

  for (const combo of combos) {
    if (selectedCombos.length >= outfitCount) break;
    const topId = combo.items.top?.id;
    const bottomId = combo.items.bottom?.id;
    if (!topId || !bottomId) continue;
    if (usedTops.has(topId) && usedBottoms.has(bottomId)) continue;
    selectedCombos.push(combo);
    usedTops.add(topId);
    usedBottoms.add(bottomId);
  }

  // If not enough diverse combos, fill with remaining highest scored
  if (selectedCombos.length < outfitCount) {
    for (const combo of combos) {
      if (selectedCombos.length >= outfitCount) break;
      if (!selectedCombos.includes(combo)) selectedCombos.push(combo);
    }
  }

  for (const { items: outfitItems, score } of selectedCombos) {
    const { data: newOutfit, error: outfitErr } = await adminClient
      .from("outfits")
      .insert({
        gender,
        body_type: bodyType,
        vibe,
        season: season ? [season] : [],
        status: "draft",
        tpo: "",
        "AI insight": `Auto-pipeline batch: ${batchId} | Match Score: ${score}`,
        image_url_flatlay: "",
        image_url_on_model: "",
        flatlay_pins: [],
        on_model_pins: [],
        prompt_flatlay: "",
      })
      .select()
      .single();

    if (outfitErr || !newOutfit) continue;

    const itemsToInsert: any[] = [];
    const candidateItems: Array<{ slot: string; productId: string; name: string; imageUrl: string; price?: number }> = [];

    for (const [slot, product] of Object.entries(outfitItems)) {
      if (!product) continue;
      itemsToInsert.push({ outfit_id: newOutfit.id, product_id: product.id, slot_type: slot });
      candidateItems.push({
        slot,
        productId: product.id,
        name: product.name || "",
        imageUrl: product.nobg_image_url || product.image_url || "",
        price: product.price,
      });
      usedProductIds.add(product.id);
    }

    await adminClient.from("outfit_items").insert(itemsToInsert);

    outfitIds.push(newOutfit.id);
    outfitCandidates.push({ outfitId: newOutfit.id, matchScore: score, items: candidateItems });
  }

  if (outfitIds.length === 0) {
    throw new Error("Could not assemble any complete outfits from the registered products");
  }

  return { outfitIds, count: outfitIds.length, outfitCandidates };
}

// ── Step 6: AI Refinement / Insights ─────────────────────────────────────────

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

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text && text.trim().length > 0) body = JSON.parse(text);
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

    events.push(makeEvent("init", "start", "Pipeline started", { batchId, gender, body_type, vibe, season }));

    // ── STEP 1: Generate keywords ─────────────────────────────────────────────
    events.push(makeEvent("keywords", "start", "Generating style keywords via Gemini AI..."));
    let categories: Record<string, string[]> = {};
    try {
      categories = await generateKeywords(gender!, body_type!, vibe!, season!, SUPABASE_URL, SUPABASE_ANON_KEY);
      const totalKw = Object.values(categories).reduce((acc, arr) => acc + arr.length, 0);
      events.push(makeEvent("keywords", "success", `Generated ${totalKw} keywords across ${Object.keys(categories).length} categories`, { categories }));
    } catch (err) {
      events.push(makeEvent("keywords", "error", `Keyword generation failed: ${(err as Error).message}`));
      return new Response(JSON.stringify({ success: false, events, error: "Keyword generation failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── STEP 2: Amazon search per slot ────────────────────────────────────────
    // Uses same amazon-search Edge Function as AdminAmazonSearch.
    // Increased result limit to match the manual search experience.
    events.push(makeEvent("search", "start", "Searching Amazon for products per slot..."));

    const PRIORITY_SLOTS = ["top","bottom","shoes","outer","bag","accessory","mid"];
    const MAX_KW_PER_SLOT = 2;
    const MAX_RESULTS_PER_KW = 15;

    const genderLabel = gender === "MALE" ? "men's" : "women's";

    const SLOT_FALLBACK_KEYWORDS: Record<string, Record<string, string[]>> = {
      bottom: {
        winter: [`${genderLabel} slim fit jeans winter`, `${genderLabel} straight leg pants warm`],
        fall:   [`${genderLabel} high waist jeans fall`, `${genderLabel} wide leg trousers autumn`],
        spring: [`${genderLabel} straight jeans spring`, `${genderLabel} casual trousers`],
        summer: [`${genderLabel} linen wide leg pants`, `${genderLabel} flowy midi skirt summer`],
        all:    [`${genderLabel} straight leg jeans`, `${genderLabel} high waist trousers`],
      },
      top: {
        winter: [`${genderLabel} crewneck sweater winter`, `${genderLabel} long sleeve knit top`],
        fall:   [`${genderLabel} casual button down shirt fall`, `${genderLabel} knit pullover`],
        spring: [`${genderLabel} light blouse spring`, `${genderLabel} cotton tee shirt`],
        summer: [`${genderLabel} sleeveless top summer`, `${genderLabel} linen blouse`],
        all:    [`${genderLabel} casual top shirt`, `${genderLabel} basic tee`],
      },
      mid: {
        winter: [`${genderLabel} cable knit turtleneck sweater`, `${genderLabel} fleece zip hoodie warm`],
        fall:   [`${genderLabel} lightweight knit sweater fall`, `${genderLabel} cardigan layering`],
        spring: [`${genderLabel} thin cardigan spring`, `${genderLabel} zip knit layering`],
        summer: [],
        all:    [`${genderLabel} cardigan sweater`, `${genderLabel} knit pullover`],
      },
    };

    const slotSearchResults = await Promise.all(
      PRIORITY_SLOTS.map(async (slot) => {
        let keywords = categories[slot] || [];
        if (keywords.length === 0 && SLOT_FALLBACK_KEYWORDS[slot]) {
          const seasonKey = (season || "all").toLowerCase();
          keywords = SLOT_FALLBACK_KEYWORDS[slot][seasonKey] || SLOT_FALLBACK_KEYWORDS[slot]["all"] || [];
        }
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

    // Deduplicate against existing DB products by ASIN
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

    // ── STEP 4: Analyze & register via analyze-amazon-product (same as AdminAmazonSearch) ──
    events.push(makeEvent("register", "start", "Analyzing and registering products via analyze-amazon-product..."));

    const registerResults = await Promise.all(
      PRIORITY_SLOTS.map(async (slot) => {
        const candidates = bySlotCandidates[slot] || [];
        const registered: string[] = [];
        for (const { product } of candidates) {
          const asin = product.asin;
          if (asin && existingAsins.has(asin)) continue;
          const result = await analyzeAndRegisterProduct(
            product, gender!, body_type!, vibe!, season!, batchId,
            SUPABASE_URL, SUPABASE_SERVICE_KEY, adminClient
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
    for (const { slot, registered } of registerResults) {
      registeredCount += registered.length;
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

    // ── STEP 5: Flatlay extraction ────────────────────────────────────────────
    events.push(makeEvent("nobg", "start", "Starting AI flatlay extraction for registered products..."));
    const { data: productsForBg } = await adminClient
      .from("products")
      .select("id, image_url, category, sub_category, name")
      .eq("batch_id", batchId)
      .is("nobg_image_url", null);

    if (productsForBg && productsForBg.length > 0) {
      const PARALLEL = 5;
      let extractedCount = 0;
      const validProducts = productsForBg.filter((p: any) => !!p.image_url);
      for (let i = 0; i < validProducts.length; i += PARALLEL) {
        const batch = validProducts.slice(i, i + PARALLEL);
        events.push(makeEvent("nobg", "progress", `Extracting batch ${Math.floor(i / PARALLEL) + 1}/${Math.ceil(validProducts.length / PARALLEL)} (${batch.length} products)...`));
        const results = await Promise.allSettled(
          batch.map((p: any) => triggerExtractProduct(
            p.id, p.image_url, p.category || "top", p.sub_category || "",
            SUPABASE_URL, SUPABASE_SERVICE_KEY
          ))
        );
        extractedCount += results.filter(r => r.status === "fulfilled").length;
        if (i + PARALLEL < validProducts.length) await delay(200);
      }
      events.push(makeEvent("nobg", "success", `Flatlay extraction complete: ${extractedCount}/${validProducts.length} processed`));
    } else {
      events.push(makeEvent("nobg", "skip", "All products already have flatlay images"));
    }

    // ── STEP 6: Generate outfit candidates using full matching scoring ─────────
    events.push(makeEvent("outfits", "start", `Generating ${outfit_count} outfit candidates using matching architecture...`));
    let outfitIds: string[] = [];
    let outfitCount = 0;
    let outfitCandidates: any[] = [];

    try {
      const outfitResult = await generateOutfitsFromBatch(
        batchId, gender!, body_type!, vibe!, season!, outfit_count!,
        adminClient, SUPABASE_URL, SUPABASE_ANON_KEY
      );
      outfitIds = outfitResult.outfitIds;
      outfitCount = outfitResult.count;
      outfitCandidates = outfitResult.outfitCandidates;
      events.push(makeEvent("outfits", "success", `Generated ${outfitCount} outfit candidates (draft — awaiting review)`, { outfitIds }));
    } catch (err) {
      events.push(makeEvent("outfits", "error", `Outfit generation failed: ${(err as Error).message}`));
    }

    // ── Step 7: AI Insights ───────────────────────────────────────────────────
    if (outfitIds.length > 0) {
      await triggerAIRefinementAndInsights(
        outfitIds,
        { gender: gender!, bodyType: body_type!, vibe: vibe!, targetSeason: season },
        adminClient, SUPABASE_URL, SUPABASE_ANON_KEY
      );
    }

    events.push(makeEvent("done", "success", `Pipeline complete. ${registeredCount} products, ${outfitCount} outfit candidates ready.`, {
      batchId, productsRegistered: registeredCount, outfitsGenerated: outfitCount,
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
