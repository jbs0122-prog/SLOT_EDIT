import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ── Color DNA (ported from src/utils/matching/colorDna.ts) ───────────────────

interface ColorEntry {
  hue: number;
  saturation: number;
  lightness: number;
  tone: "warm" | "cool" | "neutral";
  type: "neutral" | "earth" | "accent" | "special";
}

const COLOR_HSL_MAP: Record<string, ColorEntry> = {
  black:    { hue: 0,   saturation: 0,  lightness: 5,  tone: "neutral", type: "neutral" },
  white:    { hue: 0,   saturation: 0,  lightness: 98, tone: "neutral", type: "neutral" },
  grey:     { hue: 0,   saturation: 0,  lightness: 50, tone: "cool",    type: "neutral" },
  charcoal: { hue: 0,   saturation: 0,  lightness: 25, tone: "cool",    type: "neutral" },
  navy:     { hue: 225, saturation: 60, lightness: 22, tone: "cool",    type: "neutral" },
  beige:    { hue: 38,  saturation: 36, lightness: 80, tone: "warm",    type: "neutral" },
  cream:    { hue: 42,  saturation: 50, lightness: 90, tone: "warm",    type: "neutral" },
  ivory:    { hue: 48,  saturation: 60, lightness: 93, tone: "warm",    type: "neutral" },
  denim:    { hue: 215, saturation: 35, lightness: 45, tone: "cool",    type: "neutral" },
  brown:    { hue: 25,  saturation: 50, lightness: 30, tone: "warm",    type: "earth" },
  tan:      { hue: 30,  saturation: 40, lightness: 60, tone: "warm",    type: "earth" },
  camel:    { hue: 32,  saturation: 45, lightness: 55, tone: "warm",    type: "earth" },
  olive:    { hue: 80,  saturation: 35, lightness: 38, tone: "warm",    type: "earth" },
  khaki:    { hue: 50,  saturation: 30, lightness: 55, tone: "warm",    type: "earth" },
  sage:     { hue: 100, saturation: 20, lightness: 55, tone: "cool",    type: "earth" },
  rust:     { hue: 15,  saturation: 65, lightness: 40, tone: "warm",    type: "earth" },
  mustard:  { hue: 45,  saturation: 70, lightness: 50, tone: "warm",    type: "earth" },
  burgundy: { hue: 345, saturation: 55, lightness: 25, tone: "warm",    type: "earth" },
  wine:     { hue: 340, saturation: 50, lightness: 28, tone: "warm",    type: "earth" },
  red:      { hue: 0,   saturation: 80, lightness: 48, tone: "warm",    type: "accent" },
  blue:     { hue: 215, saturation: 65, lightness: 50, tone: "cool",    type: "accent" },
  green:    { hue: 140, saturation: 50, lightness: 40, tone: "cool",    type: "accent" },
  yellow:   { hue: 50,  saturation: 85, lightness: 60, tone: "warm",    type: "accent" },
  orange:   { hue: 25,  saturation: 85, lightness: 55, tone: "warm",    type: "accent" },
  pink:     { hue: 340, saturation: 60, lightness: 70, tone: "warm",    type: "accent" },
  purple:   { hue: 275, saturation: 50, lightness: 42, tone: "cool",    type: "accent" },
  coral:    { hue: 10,  saturation: 65, lightness: 60, tone: "warm",    type: "accent" },
  teal:     { hue: 180, saturation: 55, lightness: 38, tone: "cool",    type: "accent" },
  mint:     { hue: 160, saturation: 40, lightness: 72, tone: "cool",    type: "accent" },
  sky_blue: { hue: 200, saturation: 55, lightness: 70, tone: "cool",    type: "accent" },
  lavender: { hue: 270, saturation: 40, lightness: 72, tone: "cool",    type: "accent" },
  metallic: { hue: 0,   saturation: 5,  lightness: 65, tone: "neutral", type: "special" },
  multi:    { hue: 0,   saturation: 50, lightness: 50, tone: "neutral", type: "special" },
  gold:     { hue: 42,  saturation: 70, lightness: 50, tone: "warm",    type: "special" },
  silver:   { hue: 0,   saturation: 0,  lightness: 72, tone: "cool",    type: "special" },
};

const HARMONY_OVERRIDES = new Map<string, number>();
function h(c1: string, c2: string, val: number) {
  HARMONY_OVERRIDES.set([c1, c2].sort().join("-"), val);
}
h("black","white",95); h("navy","white",95); h("navy","beige",92);
h("navy","cream",92); h("black","grey",90); h("black","beige",88);
h("charcoal","white",92); h("charcoal","beige",88); h("charcoal","cream",87);
h("black","red",90); h("navy","red",85); h("black","cream",88);
h("black","ivory",88); h("navy","ivory",90); h("grey","white",88);
h("grey","navy",82); h("grey","beige",80); h("denim","white",90);
h("denim","beige",85); h("denim","black",88); h("denim","cream",85);
h("beige","brown",92); h("cream","brown",90); h("beige","olive",85);
h("brown","olive",82); h("camel","navy",90); h("camel","white",88);
h("tan","navy",88); h("tan","white",86); h("burgundy","navy",85);
h("burgundy","beige",88); h("burgundy","cream",86); h("burgundy","grey",82);
h("rust","navy",82); h("rust","beige",84); h("rust","cream",82);
h("mustard","navy",84); h("mustard","brown",78); h("mustard","grey",76);
h("khaki","white",82); h("khaki","navy",80); h("khaki","brown",78);
h("sage","beige",82); h("sage","cream",80); h("sage","white",80);
h("wine","beige",85); h("wine","grey",82); h("wine","cream",84);
h("olive","beige",84); h("olive","cream",82); h("olive","white",80);
h("camel","black",85); h("camel","brown",80); h("tan","brown",82);
h("burgundy","black",84); h("wine","navy",82); h("wine","black",83);
h("rust","black",78); h("rust","brown",75); h("mustard","black",78);
h("blue","white",90); h("blue","beige",82); h("blue","grey",80);
h("green","beige",82); h("green","white",80); h("green","brown",78);
h("green","cream",80); h("green","navy",72);
h("red","grey",78); h("red","beige",75); h("red","cream",76);
h("yellow","navy",85); h("yellow","grey",78); h("yellow","black",80);
h("pink","grey",80); h("pink","navy",78); h("pink","white",82);
h("pink","beige",78); h("pink","cream",80);
h("purple","grey",78); h("purple","white",76); h("purple","black",80);
h("orange","navy",82); h("orange","black",78); h("orange","beige",75);
h("coral","navy",80); h("coral","beige",78); h("coral","white",80);
h("teal","beige",80); h("teal","white",82); h("teal","cream",80);
h("mint","white",80); h("mint","beige",76); h("mint","navy",78);
h("sky_blue","white",82); h("sky_blue","beige",78); h("sky_blue","navy",75);
h("lavender","white",80); h("lavender","grey",78); h("lavender","beige",75);
h("red","orange",35); h("red","pink",40); h("red","purple",38);
h("orange","pink",35); h("green","red",38); h("blue","orange",42);
h("purple","yellow",35); h("purple","orange",32); h("green","purple",38);
h("pink","orange",40); h("yellow","purple",35); h("red","green",38);
h("yellow","pink",42); h("coral","red",45); h("orange","red",35);
h("metallic","black",90); h("metallic","white",85); h("metallic","navy",82);
h("metallic","grey",80); h("metallic","beige",75);
h("multi","black",82); h("multi","white",80); h("multi","grey",78);
h("multi","navy",76); h("multi","beige",74);

function getColorHarmonyScore(c1: string, c2: string): number {
  if (c1 === c2) {
    const entry = COLOR_HSL_MAP[c1];
    if (!entry) return 50;
    return entry.type === "neutral" ? 82 : 45;
  }
  const key = [c1, c2].sort().join("-");
  const override = HARMONY_OVERRIDES.get(key);
  if (override !== undefined) return override;
  const a = COLOR_HSL_MAP[c1];
  const b = COLOR_HSL_MAP[c2];
  if (!a || !b) return 50;
  if (a.type === "neutral" && b.type === "neutral") return 85;
  if (a.type === "neutral" || b.type === "neutral") return 78;
  if (a.type === "earth" && b.type === "earth") {
    let s = 72;
    if (a.tone === b.tone) s += 8;
    if (a.lightness !== b.lightness) s += 5;
    return Math.min(100, s);
  }
  if (a.type === "special" || b.type === "special") return 70;
  if ((a.type === "earth") !== (b.type === "earth")) {
    let s = 58;
    if (a.tone === b.tone) s += 12;
    else if (a.tone === "neutral" || b.tone === "neutral") s += 6;
    if (Math.abs(a.lightness - b.lightness) > 20) s += 5;
    return Math.min(100, s);
  }
  let s = 40;
  if (a.tone === b.tone) s += 15;
  else s -= 5;
  if (Math.abs(a.lightness - b.lightness) > 20) s += 8;
  return Math.max(25, Math.min(100, s));
}

function getTonalHarmonyScore(families: string[]): number {
  const valid = families.filter(f => COLOR_HSL_MAP[f]);
  if (valid.length < 2) return 70;
  const neutralCount = valid.filter(f => COLOR_HSL_MAP[f].type === "neutral").length;
  const earthCount = valid.filter(f => COLOR_HSL_MAP[f].type === "earth").length;
  const accentFamilies = valid.filter(f => COLOR_HSL_MAP[f].type === "accent");
  const uniqueAccents = new Set(accentFamilies);
  const warmCount = valid.filter(f => COLOR_HSL_MAP[f].tone === "warm").length;
  const coolCount = valid.filter(f => COLOR_HSL_MAP[f].tone === "cool").length;
  let score = 70;
  const totalDir = warmCount + coolCount;
  if (totalDir > 0) {
    const domRatio = Math.max(warmCount, coolCount) / totalDir;
    if (domRatio >= 0.8) score += 15;
    else if (domRatio >= 0.6) score += 8;
    else score -= 10;
  }
  if (neutralCount >= valid.length - 1 && uniqueAccents.size <= 1) score += 12;
  if (uniqueAccents.size > 2) score -= 15;
  if (uniqueAccents.size === 1 && neutralCount >= 1) score += 8;
  if (earthCount >= 2 && neutralCount >= 1) score += 6;
  if (valid.length >= 2) {
    const lights = valid.map(f => COLOR_HSL_MAP[f].lightness);
    const lightRange = Math.max(...lights) - Math.min(...lights);
    if (lightRange >= 30 && lightRange <= 60) score += 8;
    else if (lightRange < 15 && valid.length >= 3) score -= 5;
  }
  return Math.max(0, Math.min(100, score));
}

// ── Material DNA (ported from src/utils/matching/itemDna.ts) ─────────────────

const MATERIAL_GROUPS: Record<string, string[]> = {
  luxe:       ["silk","satin","velvet","cashmere","chiffon","organza"],
  structured: ["denim","leather","tweed","suede","corduroy"],
  classic:    ["wool","cotton","linen"],
  casual:     ["jersey","fleece","sweatshirt","terry"],
  knit:       ["knit","crochet","ribbed","cable-knit","mohair"],
  technical:  ["nylon","polyester","gore-tex","spandex","mesh"],
  blend:      ["blend"],
  eco:        ["tencel","modal","bamboo"],
  sheer:      ["lace","tulle","voile"],
  fur:        ["fur","faux fur","shearling"],
  down:       ["padding","down","puffer"],
  waxed:      ["waxed","coated"],
};

const MATERIAL_COMPAT: Record<string, number> = {
  "luxe-luxe":1.0,"luxe-classic":0.85,"luxe-structured":0.65,"luxe-knit":0.55,
  "luxe-casual":0.3,"luxe-technical":0.2,"luxe-blend":0.6,"luxe-eco":0.7,
  "luxe-sheer":0.85,"luxe-waxed":0.3,"luxe-fur":0.8,"luxe-down":0.3,
  "structured-structured":1.0,"structured-classic":0.9,"structured-casual":0.65,
  "structured-knit":0.65,"structured-technical":0.55,"structured-blend":0.75,
  "structured-eco":0.7,"structured-sheer":0.4,"structured-waxed":0.8,
  "structured-fur":0.7,"structured-down":0.6,
  "classic-classic":1.0,"classic-casual":0.8,"classic-knit":0.85,"classic-technical":0.55,
  "classic-blend":0.9,"classic-eco":0.9,"classic-sheer":0.6,"classic-waxed":0.5,
  "classic-fur":0.6,"classic-down":0.55,
  "casual-casual":1.0,"casual-knit":0.9,"casual-technical":0.75,"casual-blend":0.85,
  "casual-eco":0.85,"casual-sheer":0.3,"casual-waxed":0.5,"casual-fur":0.55,"casual-down":0.7,
  "knit-knit":1.0,"knit-technical":0.5,"knit-blend":0.85,"knit-eco":0.8,
  "knit-sheer":0.5,"knit-waxed":0.35,"knit-fur":0.7,"knit-down":0.6,
  "technical-technical":1.0,"technical-blend":0.7,"technical-eco":0.6,
  "technical-sheer":0.2,"technical-waxed":0.8,"technical-fur":0.4,"technical-down":0.8,
  "blend-blend":1.0,"blend-eco":0.85,"blend-sheer":0.5,"blend-waxed":0.55,
  "blend-fur":0.6,"blend-down":0.65,
  "eco-eco":1.0,"eco-sheer":0.6,"eco-waxed":0.4,"eco-fur":0.3,"eco-down":0.5,
  "sheer-sheer":0.8,"sheer-waxed":0.15,"sheer-fur":0.5,"sheer-down":0.2,
  "waxed-waxed":0.9,"waxed-fur":0.6,"waxed-down":0.7,
  "fur-fur":0.7,"fur-down":0.8,
  "down-down":0.9,
};

function inferMaterialGroup(material: string, name?: string): string {
  if (material) {
    const m = material.toLowerCase().trim();
    for (const [group, mats] of Object.entries(MATERIAL_GROUPS)) {
      if (mats.some(mat => mat.length <= 4
        ? new RegExp(`(^|[\\s,/])${mat}($|[\\s,/])`, "i").test(m)
        : m.includes(mat)
      )) return group;
    }
  }
  if (name) {
    const n = name.toLowerCase();
    for (const [grp, mats] of Object.entries(MATERIAL_GROUPS)) {
      if (mats.some(mat => mat.length <= 4
        ? new RegExp(`(^|[\\s,/])${mat}($|[\\s,/])`, "i").test(n)
        : n.includes(mat)
      )) return grp;
    }
  }
  return "blend";
}

function getMaterialCompatScore(g1: string, g2: string): number {
  return MATERIAL_COMPAT[`${g1}-${g2}`] ?? MATERIAL_COMPAT[`${g2}-${g1}`] ?? 0.5;
}

// ── Pattern Balance (ported from src/utils/matching/contextLayer.ts) ──────────

const PATTERN_COMPAT: Record<string, Record<string, number>> = {
  solid:   { solid: 85, stripe: 90, check: 88, graphic: 80, print: 78, floral: 82, other: 75 },
  stripe:  { solid: 90, stripe: 30, check: 25, graphic: 35, print: 40, floral: 35, other: 45 },
  check:   { solid: 88, stripe: 25, check: 25, graphic: 35, print: 38, floral: 30, other: 40 },
  graphic: { solid: 80, stripe: 35, check: 35, graphic: 30, print: 35, floral: 30, other: 40 },
  print:   { solid: 78, stripe: 40, check: 38, graphic: 35, print: 28, floral: 30, other: 40 },
  floral:  { solid: 82, stripe: 35, check: 30, graphic: 30, print: 30, floral: 25, other: 35 },
  other:   { solid: 75, stripe: 45, check: 40, graphic: 40, print: 40, floral: 35, other: 50 },
};

// ── Season / Warmth (ported from src/utils/matching/beamSearch.ts) ────────────

const SEASON_WARMTH: Record<string, { min: number; max: number; ideal: number }> = {
  spring: { min: 1.5, max: 3.5, ideal: 2.5 },
  summer: { min: 1,   max: 2.5, ideal: 1.5 },
  fall:   { min: 2.5, max: 4,   ideal: 3.2 },
  winter: { min: 3.5, max: 5,   ideal: 4.2 },
};

// ── Scoring Rules ─────────────────────────────────────────────────────────────

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
  gender?: string;
}

const VALID_COLOR_FAMILIES = new Set(["black","white","grey","navy","beige","brown","blue","green","red","yellow","purple","pink","orange","metallic","multi","khaki","cream","ivory","burgundy","wine","olive","mustard","coral","charcoal","tan","camel","rust","sage","mint","lavender","teal","sky_blue","denim","silver","gold"]);
const COLOR_ALIAS: Record<string, string> = {
  gray:"grey", multicolor:"multi","multi-color":"multi","multi color":"multi",
  nude:"beige",sand:"beige",taupe:"beige","light blue":"sky_blue","sky blue":"sky_blue",
  "dark blue":"navy","light brown":"tan",maroon:"burgundy","dark red":"burgundy",
  turquoise:"teal",cyan:"teal","off-white":"cream","dark gray":"charcoal","dark grey":"charcoal",
  ecru:"ivory","dark green":"olive","light grey":"grey","light green":"mint",
};

function resolveColor(product: Product): string {
  const raw = product.color_family || product.color || "";
  if (!raw) return "black";
  const lower = raw.toLowerCase().trim();
  if (VALID_COLOR_FAMILIES.has(lower)) return lower;
  if (COLOR_ALIAS[lower]) return COLOR_ALIAS[lower];
  for (const [k, v] of Object.entries(COLOR_ALIAS)) {
    if (lower.includes(k)) return v;
  }
  for (const valid of VALID_COLOR_FAMILIES) {
    if (lower.includes(valid)) return valid;
  }
  return "black";
}

// Tonal Harmony: HSL getTonalHarmonyScore (50%) + pairwise getColorHarmonyScore (50%)
function scoreTonalHarmonyRule(items: Record<string, Product>): number {
  const coreKeys = ["outer","mid","top","bottom","shoes"];
  const coreItems = coreKeys.map(k => items[k]).filter(Boolean) as Product[];
  if (coreItems.length < 2) return 50;
  const colors = coreItems.map(p => resolveColor(p));

  const hslScore = getTonalHarmonyScore(colors);

  let pairSum = 0, pairCount = 0;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      pairSum += getColorHarmonyScore(colors[i], colors[j]);
      pairCount++;
    }
  }
  const pairScore = pairCount > 0 ? pairSum / pairCount : 70;

  let score = hslScore * 0.5 + pairScore * 0.5;

  const accessoryColors = [items.bag, items.accessory].filter(Boolean).map(p => resolveColor(p!));
  if (accessoryColors.length > 0) {
    let accSum = 0, accCount = 0;
    for (const ac of accessoryColors) {
      for (const mc of colors) {
        accSum += getColorHarmonyScore(mc, ac);
        accCount++;
      }
    }
    const accScore = accCount > 0 ? accSum / accCount : 70;
    score = score * 0.85 + accScore * 0.15;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// Proportion: silhouette balance + body type prefs
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
  slim:        { top: ["regular","relaxed","oversized"], outer: ["regular","relaxed","oversized"], bottom: ["wide","straight","relaxed"] },
  regular:     { top: ["regular","fitted","relaxed"], outer: ["regular","relaxed"], bottom: ["wide","straight","tapered"] },
  "plus-size": { top: ["regular","relaxed"], outer: ["regular","relaxed"], bottom: ["wide","straight","relaxed"] },
};

function scoreProportionRule(items: Record<string, Product>, bodyType?: string): number {
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
      for (const [cat, sil] of [["top", topSil], ["bottom", bottomSil]] as [string, string][]) {
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

// Texture Contrast (from textureContrastRule.ts logic)
function scoreTextureContrastRule(items: Record<string, Product>): number {
  const coreKeys = ["outer","mid","top","bottom","shoes"];
  const coreItems = coreKeys.map(k => items[k]).filter(Boolean) as Product[];
  if (coreItems.length < 2) return 50;

  const groups = coreItems.map(p => inferMaterialGroup(p.material || "", p.name));

  let compatTotal = 0, compatCount = 0;
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      compatTotal += getMaterialCompatScore(groups[i], groups[j]);
      compatCount++;
    }
  }
  const avgCompat = compatCount > 0 ? compatTotal / compatCount : 0.5;

  let score = avgCompat * 80;
  const uniqueGroups = new Set(groups);
  if (uniqueGroups.size >= 3) score += 15;
  else if (uniqueGroups.size >= 2) score += 8;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// Formality Coherence (ported from formalityCoherenceRule.ts)
const STYLE_COMPAT: Record<string, Record<string, number>> = {
  formal:       { formal: 1.0, smart_casual: 0.75, casual: 0.35, sporty: 0.1 },
  smart_casual: { formal: 0.75, smart_casual: 1.0, casual: 0.8, sporty: 0.4 },
  casual:       { formal: 0.35, smart_casual: 0.8, casual: 1.0, sporty: 0.7 },
  sporty:       { formal: 0.1, smart_casual: 0.4, casual: 0.7, sporty: 1.0 },
};

const SUB_CATEGORY_STYLE: Record<string, string> = {
  blazer:"formal", suit_jacket:"formal", dress_shirt:"formal",
  slacks:"formal", dress_pants:"formal", pencil_skirt:"formal",
  trench_coat:"formal", trench:"formal",
  oxford:"formal", loafer:"formal", heel:"formal", derby:"formal",
  necktie:"formal", bowtie:"formal", tuxedo_jacket:"formal",
  blouse:"smart_casual", cardigan:"smart_casual", polo:"smart_casual",
  chino:"smart_casual", chinos:"smart_casual", knit:"smart_casual",
  shirt:"smart_casual", turtleneck:"smart_casual", sweater:"smart_casual",
  coat:"smart_casual", boot:"smart_casual", tote:"smart_casual",
  t_shirt:"casual", tshirt:"casual", hoodie:"casual", sweatshirt:"casual",
  denim_jacket:"casual", jeans:"casual", denim:"casual", jogger:"casual",
  shorts:"casual", cargo:"casual", sneaker:"casual", sandal:"casual",
  backpack:"casual", cap:"casual", beanie:"casual",
  track_jacket:"sporty", windbreaker:"sporty", puffer:"sporty",
  legging:"sporty", leggings:"sporty", track_pants:"sporty",
  running_shoe:"sporty", training_shoe:"sporty",
  soccer_jersey:"sporty", basketball_jersey:"sporty",
};

const FORMALITY_BY_SUB_CAT: Record<string, number> = {
  blazer:7, suit_jacket:8, dress_shirt:7, slacks:7, dress_pants:7,
  pencil_skirt:7, trench_coat:7, trench:7, oxford:7, loafer:6,
  heel:7, derby:7, clutch:6, structured_bag:6, necktie:8, bowtie:8,
  tuxedo_jacket:9, tuxedo_pants:9,
  blouse:5, cardigan:4, polo:4, chino:4, chinos:4,
  midi_skirt:5, ankle_boot:4, knit:4, shirt:5, turtleneck:5,
  sweater:4, vest:5, coat:6, boot:4,
  tote:4, shoulder_bag:4, watch:5,
  t_shirt:2, tshirt:2, hoodie:2, sweatshirt:2,
  denim_jacket:3, jacket:4, jeans:2, denim:2, jogger:1, shorts:2,
  cargo:2, sneaker:2, sandal:1, canvas:2, runner:2,
  backpack:2, crossbody:3, cap:1, beanie:2,
  track_jacket:1, windbreaker:1, puffer:2, legging:1, leggings:1,
  track_pants:1, biker_shorts:1, running_shoe:1, training_shoe:1,
  soccer_jersey:1, basketball_jersey:1,
};

function inferFormality(product: Product): number {
  if (typeof product.formality === "number") return product.formality;
  const sub = (product.sub_category || "").toLowerCase().replace(/[\s-]/g, "_");
  if (FORMALITY_BY_SUB_CAT[sub] !== undefined) return FORMALITY_BY_SUB_CAT[sub];
  const name = (product.name || "").toLowerCase();
  for (const [cat, f] of Object.entries(FORMALITY_BY_SUB_CAT)) {
    if (name.includes(cat.replace(/_/g, " ")) || name.includes(cat)) return f;
  }
  return 3;
}

function inferStyle(product: Product): string {
  const sub = (product.sub_category || "").toLowerCase().replace(/[\s-]/g, "_");
  if (SUB_CATEGORY_STYLE[sub]) return SUB_CATEGORY_STYLE[sub];
  const name = (product.name || "").toLowerCase();
  for (const [cat, style] of Object.entries(SUB_CATEGORY_STYLE)) {
    if (name.includes(cat.replace(/_/g, " ")) || name.includes(cat)) return style;
  }
  const f = inferFormality(product);
  if (f >= 7) return "formal";
  if (f >= 4) return "smart_casual";
  if (f >= 2) return "casual";
  return "sporty";
}

function scoreFormalityCoherenceRule(items: Record<string, Product>, vibeDna?: typeof VIBE_DNA[string]): number {
  const all = Object.values(items).filter(Boolean);
  if (all.length < 3) return 50;
  const formalities = all.map(p => inferFormality(p));
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

// Vibe Affinity
function scoreVibeAffinityRule(items: Record<string, Product>, vibe?: string): number {
  if (!vibe) return 50;
  const coreKeys = ["outer","mid","top","bottom","shoes"];
  const coreItems = coreKeys.map(k => items[k]).filter(Boolean) as Product[];
  if (coreItems.length < 2) return 50;
  const matchCount = coreItems.filter(p => (p.vibe || []).includes(vibe)).length;
  const ratio = matchCount / coreItems.length;
  const score = 40 + ratio * 50 + (ratio >= 0.8 ? 10 : ratio <= 0.3 ? -10 : 0);
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Color Depth (from scorer.ts scoreColorDepth)
function scoreColorDepthRule(items: Record<string, Product>): number {
  const coreKeys = ["outer","mid","top","bottom","shoes"];
  const colors = coreKeys.map(k => items[k]).filter(Boolean).map(p => resolveColor(p!));
  if (colors.length < 3) return 50;

  let score = 70;
  const uniqueColors = new Set(colors);
  const neutralColors = colors.filter(c => COLOR_HSL_MAP[c]?.type === "neutral");
  const accentColors = colors.filter(c => COLOR_HSL_MAP[c]?.type === "accent");
  const neutralRatio = neutralColors.length / colors.length;
  const uniqueAccents = new Set(accentColors);

  if (uniqueAccents.size <= 1 && neutralRatio >= 0.4) score += 20;
  if (uniqueAccents.size === 2) score += 8;
  if (uniqueAccents.size > 2) score -= 15;
  if (uniqueColors.size > 4) score -= 15;
  if (uniqueColors.size === 1 && COLOR_HSL_MAP[colors[0]]?.type === "neutral") score -= 20;
  if (uniqueColors.size <= 2 && colors.every(c => COLOR_HSL_MAP[c]?.type === "neutral") && colors.length >= 4) score -= 15;
  const blackCount = colors.filter(c => c === "black").length;
  if (blackCount >= 3) score -= 15;
  if (blackCount >= 4) score -= 15;
  if (uniqueColors.size >= 2 && !colors.every(c => COLOR_HSL_MAP[c]?.type === "neutral")) score += 10;

  const colorCounts = new Map<string, number>();
  colors.forEach(c => colorCounts.set(c, (colorCounts.get(c) || 0) + 1));
  const sorted = [...colorCounts.values()].sort((a, b) => b - a);
  if (sorted.length >= 2) {
    const baseRatio = sorted[0] / colors.length;
    if (baseRatio >= 0.4 && baseRatio <= 0.7) score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

// Material Compat (from scorer.ts scoreMaterialCompat)
function scoreMaterialCompatRule(items: Record<string, Product>): number {
  const coreKeys = ["outer","mid","top","bottom","shoes"];
  const coreItems = coreKeys.map(k => items[k]).filter(Boolean) as Product[];
  if (coreItems.length < 2) return 50;
  const groups = coreItems.map(p => inferMaterialGroup(p.material || "", p.name));
  let compatTotal = 0, compatCount = 0;
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      compatTotal += getMaterialCompatScore(groups[i], groups[j]);
      compatCount++;
    }
  }
  const avgCompat = compatCount > 0 ? compatTotal / compatCount : 0.5;
  return Math.max(0, Math.min(100, Math.round(avgCompat * 100)));
}

// Context Fit = seasonFit(30%) + warmthFit(30%) + patternBalance(15%) + accessoryHarmony(10%) + 50(15%)
function computeSeasonFit(items: Record<string, Product>, season?: string): number {
  if (!season) return 50;
  const coreKeys = ["outer","mid","top","bottom","shoes"];
  const coreItems = coreKeys.map(k => items[k]).filter(Boolean) as Product[];
  if (coreItems.length < 2) return 50;
  let score = 100;
  let matchCount = 0, mismatchCount = 0;
  for (const item of coreItems) {
    const seasons = item.season || [];
    if (seasons.includes(season)) { matchCount++; score += 8; }
    else if (seasons.length === 0) { score -= 5; }
    else { mismatchCount++; score -= 18; }
  }
  if (matchCount === coreItems.length) score += 20;
  if (mismatchCount >= Math.ceil(coreItems.length * 0.5)) score -= 25;
  return Math.max(0, Math.min(100, score));
}

function computeWarmthFit(items: Record<string, Product>, season?: string): number {
  const coreKeys = ["outer","mid","top","bottom","shoes"];
  const coreItems = coreKeys.map(k => items[k]).filter(Boolean) as Product[];
  const warmths = coreItems.map(i => i.warmth).filter((w): w is number => typeof w === "number");
  if (warmths.length < 2) return 50;
  let score = 100;
  const avg = warmths.reduce((s, w) => s + w, 0) / warmths.length;
  const effectiveTarget = season ? SEASON_WARMTH[season]?.ideal : undefined;
  if (effectiveTarget !== undefined) {
    const diff = Math.abs(avg - effectiveTarget);
    if (diff <= 0.5) score += 15;
    else if (diff <= 1) score += 5;
    else if (diff > 2) score -= 45;
    else if (diff > 1.5) score -= 30;
    else score -= 15;
  }
  if (season) {
    const bounds = SEASON_WARMTH[season];
    if (bounds) {
      if (avg < bounds.min) score -= Math.min(30, (bounds.min - avg) * 20);
      if (avg > bounds.max) score -= Math.min(30, (avg - bounds.max) * 20);
    }
  }
  const range = Math.max(...warmths) - Math.min(...warmths);
  if (range > 2) score -= 20;
  else if (range <= 1) score += 10;
  return Math.max(0, Math.min(100, score));
}

function computePatternBalance(items: Record<string, Product>): number {
  const all = Object.values(items).filter(Boolean);
  if (all.length < 3) return 50;
  const patterns = all.map(i => i.pattern || "").filter(Boolean);
  if (patterns.length < Math.ceil(all.length * 0.4)) return 50;
  const nonSolid = patterns.filter(p => p !== "solid");
  if (nonSolid.length === 0) return 92;
  if (nonSolid.length === 1) return 95;
  let totalCompat = 0, pairCount = 0;
  for (let i = 0; i < nonSolid.length; i++) {
    for (let j = i + 1; j < nonSolid.length; j++) {
      const p1 = nonSolid[i].toLowerCase();
      const p2 = nonSolid[j].toLowerCase();
      totalCompat += PATTERN_COMPAT[p1]?.[p2] ?? PATTERN_COMPAT[p2]?.[p1] ?? 50;
      pairCount++;
    }
  }
  let score = pairCount > 0 ? totalCompat / pairCount : 70;
  if (nonSolid.length > 2) score -= 15;
  if (nonSolid.length >= 3) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function computeAccessoryHarmony(items: Record<string, Product>): number {
  const accessories = [items.bag, items.accessory].filter(Boolean) as Product[];
  if (accessories.length === 0) return 50;
  const mainKeys = ["outer","mid","top","bottom","shoes"];
  const mainColors = mainKeys.map(k => items[k]).filter(Boolean).map(p => resolveColor(p!));
  if (mainColors.length === 0) return 50;
  let score = 70;
  for (const acc of accessories) {
    const accColor = resolveColor(acc);
    let bestHarmony = 0;
    for (const mc of mainColors) bestHarmony = Math.max(bestHarmony, getColorHarmonyScore(mc, accColor));
    if (bestHarmony >= 85) score += 10;
    else if (bestHarmony >= 70) score += 5;
    else if (bestHarmony < 50) score -= 10;
  }
  return Math.max(0, Math.min(100, score));
}

function computeContextFit(items: Record<string, Product>, season?: string): number {
  const seasonFit = computeSeasonFit(items, season);
  const warmthFit = computeWarmthFit(items, season);
  const patternBalance = computePatternBalance(items);
  const accessoryHarmony = computeAccessoryHarmony(items);
  return Math.round(
    seasonFit * 0.30 +
    warmthFit * 0.30 +
    patternBalance * 0.15 +
    accessoryHarmony * 0.10 +
    50 * 0.15
  );
}

// ── VIBE DNA ─────────────────────────────────────────────────────────────────

const VIBE_DNA: Record<string, {
  formality_range: [number, number];
  color_palette: { primary: string[]; secondary: string[]; accent: string[] };
  material_preferences: string[];
}> = {
  ELEVATED_COOL: {
    formality_range: [5, 9],
    color_palette: { primary: ["black","charcoal","navy","white"], secondary: ["grey","cream","camel"], accent: ["burgundy","metallic","wine"] },
    material_preferences: ["structured","luxe","classic"],
  },
  EFFORTLESS_NATURAL: {
    formality_range: [2, 6],
    color_palette: { primary: ["beige","cream","ivory","white"], secondary: ["olive","khaki","tan","sage","brown"], accent: ["rust","mustard","burgundy"] },
    material_preferences: ["classic","eco","knit"],
  },
  ARTISTIC_MINIMAL: {
    formality_range: [3, 8],
    color_palette: { primary: ["black","white","grey","charcoal"], secondary: ["cream","beige","navy"], accent: ["rust","olive","burgundy"] },
    material_preferences: ["classic","structured","eco","knit"],
  },
  RETRO_LUXE: {
    formality_range: [3, 8],
    color_palette: { primary: ["burgundy","navy","brown","cream"], secondary: ["camel","olive","wine","beige"], accent: ["rust","mustard","teal","gold"] },
    material_preferences: ["luxe","structured","classic","knit"],
  },
  SPORT_MODERN: {
    formality_range: [0, 4],
    color_palette: { primary: ["black","grey","white","navy"], secondary: ["olive","khaki","charcoal"], accent: ["orange","teal","red","green"] },
    material_preferences: ["technical","casual","blend"],
  },
  CREATIVE_LAYERED: {
    formality_range: [0, 5],
    color_palette: { primary: ["black","grey","white","denim"], secondary: ["burgundy","brown","olive","navy"], accent: ["red","purple","orange","pink","yellow"] },
    material_preferences: ["structured","casual","classic","sheer"],
  },
};

// ── Final Scorer: exact weights from src/utils/matching/scorer.ts ─────────────

const SCORER_WEIGHTS = {
  proportion:         0.12,
  tonalHarmony:       0.15,
  textureContrast:    0.10,
  formalityCoherence: 0.12,
  vibeAffinity:       0.13,
  colorDepth:         0.08,
  materialCompat:     0.07,
  contextFit:         0.23,
};

function scoreOutfitComposition(
  items: Record<string, Product>,
  vibe: string,
  bodyType: string,
  season: string,
): number {
  const vibeDna = VIBE_DNA[vibe];
  const proportion         = scoreProportionRule(items, bodyType);
  const tonalHarmony       = scoreTonalHarmonyRule(items);
  const textureContrast    = scoreTextureContrastRule(items);
  const formalityCoherence = scoreFormalityCoherenceRule(items, vibeDna);
  const vibeAffinity       = scoreVibeAffinityRule(items, vibe);
  const colorDepth         = scoreColorDepthRule(items);
  const materialCompat     = scoreMaterialCompatRule(items);
  const contextFit         = computeContextFit(items, season);

  return Math.round(
    proportion         * SCORER_WEIGHTS.proportion +
    tonalHarmony       * SCORER_WEIGHTS.tonalHarmony +
    textureContrast    * SCORER_WEIGHTS.textureContrast +
    formalityCoherence * SCORER_WEIGHTS.formalityCoherence +
    vibeAffinity       * SCORER_WEIGHTS.vibeAffinity +
    colorDepth         * SCORER_WEIGHTS.colorDepth +
    materialCompat     * SCORER_WEIGHTS.materialCompat +
    contextFit         * SCORER_WEIGHTS.contextFit
  );
}

// ── Outer season filter ───────────────────────────────────────────────────────

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
  gender: string, bodyType: string, vibe: string, season: string,
  supabaseUrl: string, anonKey: string
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

// ── Step 3: Analyze & register via analyze-amazon-product ────────────────────

async function analyzeAndRegisterProduct(
  product: any, gender: string, bodyType: string, vibe: string, season: string,
  batchId: string, supabaseUrl: string, serviceKey: string,
  adminClient: ReturnType<typeof createClient>
): Promise<{ success: boolean; productId?: string; name?: string }> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/analyze-amazon-product`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
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

    await adminClient.from("products").update({ batch_id: batchId }).eq("id", inserted.id);

    return { success: true, productId: inserted.id, name: inserted.name };
  } catch {
    return { success: false };
  }
}

// ── Step 4: Flatlay extraction ────────────────────────────────────────────────

async function triggerExtractProduct(
  productId: string, imageUrl: string, category: string, subCategory: string,
  supabaseUrl: string, serviceKey: string
): Promise<void> {
  const headers = { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  const adminClient = createClient(supabaseUrl, serviceKey);
  const slot = ["outer","mid","top","bottom","shoes","bag","accessory"].includes(category) ? category : "top";
  const label = subCategory || category;
  let nobgUrl: string | null = null;
  let isModelShot = false;

  try {
    const detectRes = await fetch(`${supabaseUrl}/functions/v1/extract-products`, {
      method: "POST", headers,
      body: JSON.stringify({ mode: "detect", imageUrl }),
    });
    if (detectRes.ok) {
      const detectData = await detectRes.json();
      if (detectData.success && detectData.items?.length) {
        isModelShot = true;
        const targetItem = detectData.items.find((i: any) => i.slot === slot) ?? detectData.items[0];
        const extractRes = await fetch(`${supabaseUrl}/functions/v1/extract-products`, {
          method: "POST", headers,
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
        method: "POST", headers,
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

// ── Step 5: Generate outfits using full 8-dimension matching scoring ───────────

async function generateOutfitsFromBatch(
  batchId: string, gender: string, bodyType: string, vibe: string, season: string,
  outfitCount: number, adminClient: ReturnType<typeof createClient>,
  supabaseUrl: string, anonKey: string
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

  interface CandidateCombo { items: Record<string, Product>; score: number; }
  const combos: CandidateCombo[] = [];

  for (const top of bySlot["top"]) {
    for (const bottom of bySlot["bottom"]) {
      const baseItems: Record<string, Product> = { top, bottom };

      for (const slot of optionalSlots) {
        const pool = bySlot[slot] || [];
        if (pool.length === 0) continue;
        let bestScore = -Infinity;
        let bestPick: Product | null = null;
        for (const candidate of pool) {
          const testItems = { ...baseItems, [slot]: candidate };
          const s = scoreOutfitComposition(testItems, vibe, bodyType, season);
          if (s > bestScore) { bestScore = s; bestPick = candidate; }
        }
        if (bestPick) baseItems[slot] = bestPick;
      }

      const score = scoreOutfitComposition(baseItems, vibe, bodyType, season);
      combos.push({ items: baseItems, score });
    }
  }

  combos.sort((a, b) => b.score - a.score);

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
        gender, body_type: bodyType, vibe,
        season: season ? [season] : [],
        status: "draft", tpo: "",
        "AI insight": `Auto-pipeline batch: ${batchId} | Match Score: ${score}`,
        image_url_flatlay: "", image_url_on_model: "",
        flatlay_pins: [], on_model_pins: [], prompt_flatlay: "",
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

// ── Step 6: AI Insights ───────────────────────────────────────────────────────

async function triggerAIRefinementAndInsights(
  outfitIds: string[],
  context: { gender: string; bodyType: string; vibe: string; targetSeason?: string },
  adminClient: ReturnType<typeof createClient>,
  supabaseUrl: string, anonKey: string
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
        method: "POST", headers,
        body: JSON.stringify({
          items: itemList,
          gender: context.gender, bodyType: context.bodyType,
          vibe: context.vibe, season: context.targetSeason,
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
      gender, body_type, vibe, season,
      outfit_count = 3,
      products_per_slot = 5,
    } = body as {
      gender?: string; body_type?: string; vibe?: string; season?: string;
      outfit_count?: number; products_per_slot?: number;
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

    const existingAsins = new Set<string>();
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

    // ── STEP 4: Analyze & register via analyze-amazon-product ────────────────
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

    // ── STEP 6: Generate outfit candidates using full 8-dimension scoring ──────
    events.push(makeEvent("outfits", "start", `Generating ${outfit_count} outfit candidates using full matching architecture...`));
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
      batchId, events,
      productsRegistered: registeredCount,
      outfitsGenerated: outfitCount,
      outfitIds, outfitCandidates,
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
