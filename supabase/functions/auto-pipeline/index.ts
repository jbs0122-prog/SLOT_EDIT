import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR DNA
// ═══════════════════════════════════════════════════════════════════════════════

interface ColorEntry {
  hue: number; saturation: number; lightness: number;
  tone: "warm" | "cool" | "neutral"; type: "neutral" | "earth" | "accent" | "special";
}

const COLOR_HSL_MAP: Record<string, ColorEntry> = {
  black: { hue: 0, saturation: 0, lightness: 5, tone: "neutral", type: "neutral" },
  white: { hue: 0, saturation: 0, lightness: 98, tone: "neutral", type: "neutral" },
  grey: { hue: 0, saturation: 0, lightness: 50, tone: "cool", type: "neutral" },
  charcoal: { hue: 0, saturation: 0, lightness: 25, tone: "cool", type: "neutral" },
  navy: { hue: 225, saturation: 60, lightness: 22, tone: "cool", type: "neutral" },
  beige: { hue: 38, saturation: 36, lightness: 80, tone: "warm", type: "neutral" },
  cream: { hue: 42, saturation: 50, lightness: 90, tone: "warm", type: "neutral" },
  ivory: { hue: 48, saturation: 60, lightness: 93, tone: "warm", type: "neutral" },
  denim: { hue: 215, saturation: 35, lightness: 45, tone: "cool", type: "neutral" },
  brown: { hue: 25, saturation: 50, lightness: 30, tone: "warm", type: "earth" },
  tan: { hue: 30, saturation: 40, lightness: 60, tone: "warm", type: "earth" },
  camel: { hue: 32, saturation: 45, lightness: 55, tone: "warm", type: "earth" },
  olive: { hue: 80, saturation: 35, lightness: 38, tone: "warm", type: "earth" },
  khaki: { hue: 50, saturation: 30, lightness: 55, tone: "warm", type: "earth" },
  sage: { hue: 100, saturation: 20, lightness: 55, tone: "cool", type: "earth" },
  rust: { hue: 15, saturation: 65, lightness: 40, tone: "warm", type: "earth" },
  mustard: { hue: 45, saturation: 70, lightness: 50, tone: "warm", type: "earth" },
  burgundy: { hue: 345, saturation: 55, lightness: 25, tone: "warm", type: "earth" },
  wine: { hue: 340, saturation: 50, lightness: 28, tone: "warm", type: "earth" },
  red: { hue: 0, saturation: 80, lightness: 48, tone: "warm", type: "accent" },
  blue: { hue: 215, saturation: 65, lightness: 50, tone: "cool", type: "accent" },
  green: { hue: 140, saturation: 50, lightness: 40, tone: "cool", type: "accent" },
  yellow: { hue: 50, saturation: 85, lightness: 60, tone: "warm", type: "accent" },
  orange: { hue: 25, saturation: 85, lightness: 55, tone: "warm", type: "accent" },
  pink: { hue: 340, saturation: 60, lightness: 70, tone: "warm", type: "accent" },
  purple: { hue: 275, saturation: 50, lightness: 42, tone: "cool", type: "accent" },
  coral: { hue: 10, saturation: 65, lightness: 60, tone: "warm", type: "accent" },
  teal: { hue: 180, saturation: 55, lightness: 38, tone: "cool", type: "accent" },
  mint: { hue: 160, saturation: 40, lightness: 72, tone: "cool", type: "accent" },
  sky_blue: { hue: 200, saturation: 55, lightness: 70, tone: "cool", type: "accent" },
  lavender: { hue: 270, saturation: 40, lightness: 72, tone: "cool", type: "accent" },
  metallic: { hue: 0, saturation: 5, lightness: 65, tone: "neutral", type: "special" },
  multi: { hue: 0, saturation: 50, lightness: 50, tone: "neutral", type: "special" },
  gold: { hue: 42, saturation: 70, lightness: 50, tone: "warm", type: "special" },
  silver: { hue: 0, saturation: 0, lightness: 72, tone: "cool", type: "special" },
};

const COLOR_NAME_TO_FAMILY: Record<string, string> = {
  black: "black", white: "white", grey: "grey", gray: "grey",
  navy: "navy", beige: "beige", brown: "brown", blue: "blue",
  green: "green", red: "red", yellow: "yellow", purple: "purple",
  pink: "pink", orange: "orange", khaki: "khaki", cream: "cream",
  ivory: "ivory", burgundy: "burgundy", wine: "wine", olive: "olive",
  mustard: "mustard", coral: "coral", charcoal: "charcoal",
  tan: "tan", camel: "camel", rust: "rust", sage: "sage",
  mint: "mint", lavender: "lavender", teal: "teal",
  denim: "denim", metallic: "metallic", silver: "silver", gold: "gold",
  maroon: "burgundy", "off-white": "cream", "dark grey": "charcoal",
  "light blue": "sky_blue", "sky blue": "sky_blue",
};

function resolveColorFamily(colorStr: string, colorFamily?: string): string {
  if (colorFamily) return colorFamily;
  if (!colorStr) return "";
  const c = colorStr.toLowerCase().trim();
  if (COLOR_NAME_TO_FAMILY[c]) return COLOR_NAME_TO_FAMILY[c];
  for (const [name, family] of Object.entries(COLOR_NAME_TO_FAMILY)) {
    if (name.length >= 2 && (c.includes(name) || name.includes(c))) return family;
  }
  return "";
}

function isNeutralColor(family: string): boolean {
  return COLOR_HSL_MAP[family]?.type === "neutral";
}

const HARMONY_OVERRIDES = new Map<string, number>();
function h(c1: string, c2: string, val: number) {
  HARMONY_OVERRIDES.set([c1, c2].sort().join("-"), val);
}
h("black","white",95);h("navy","white",95);h("navy","beige",92);h("navy","cream",92);
h("black","grey",90);h("black","beige",88);h("charcoal","white",92);h("charcoal","beige",88);
h("black","red",90);h("navy","red",85);h("black","cream",88);h("black","ivory",88);
h("navy","ivory",90);h("grey","white",88);h("grey","navy",82);h("grey","beige",80);
h("denim","white",90);h("denim","beige",85);h("denim","black",88);h("denim","cream",85);
h("beige","brown",92);h("cream","brown",90);h("beige","olive",85);h("camel","navy",90);
h("camel","white",88);h("tan","navy",88);h("burgundy","navy",85);h("burgundy","beige",88);
h("burgundy","cream",86);h("burgundy","grey",82);h("rust","navy",82);h("mustard","navy",84);
h("khaki","white",82);h("sage","beige",82);h("wine","beige",85);h("olive","beige",84);
h("camel","black",85);h("burgundy","black",84);h("wine","navy",82);
h("blue","white",90);h("blue","beige",82);h("green","beige",82);h("red","grey",78);
h("yellow","navy",85);h("pink","grey",80);h("pink","white",82);h("coral","navy",80);
h("teal","white",82);h("mint","white",80);h("sky_blue","white",82);h("lavender","white",80);
h("red","orange",35);h("red","pink",40);h("orange","pink",35);h("green","red",38);
h("purple","yellow",35);h("purple","orange",32);h("metallic","black",90);h("metallic","white",85);

function getColorHarmonyScore(c1: string, c2: string): number {
  if (c1 === c2) {
    const entry = COLOR_HSL_MAP[c1];
    return entry ? (entry.type === "neutral" ? 82 : 45) : 50;
  }
  const key = [c1, c2].sort().join("-");
  const override = HARMONY_OVERRIDES.get(key);
  if (override !== undefined) return override;
  const a = COLOR_HSL_MAP[c1], b = COLOR_HSL_MAP[c2];
  if (!a || !b) return 50;
  if (a.type === "neutral" && b.type === "neutral") return 85;
  if (a.type === "neutral" || b.type === "neutral") return 78;
  if (a.type === "earth" && b.type === "earth") return a.tone === b.tone ? 80 : 72;
  if (a.type === "special" || b.type === "special") return 70;
  let s = 40;
  if (a.tone === b.tone) s += 15; else s -= 5;
  if (Math.abs(a.lightness - b.lightness) > 20) s += 8;
  return Math.max(25, Math.min(100, s));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATERIAL DNA
// ═══════════════════════════════════════════════════════════════════════════════

const MATERIAL_GROUPS: Record<string, string[]> = {
  luxe: ["silk", "satin", "velvet", "cashmere", "chiffon", "organza"],
  structured: ["denim", "leather", "tweed", "suede", "corduroy"],
  classic: ["wool", "cotton", "linen"],
  casual: ["jersey", "fleece", "sweatshirt", "terry"],
  knit: ["knit", "crochet", "ribbed", "cable-knit", "mohair"],
  technical: ["nylon", "polyester", "gore-tex", "spandex", "mesh"],
  blend: ["blend"],
  eco: ["tencel", "modal", "bamboo"],
  down: ["padding", "down", "puffer"],
};

const MATERIAL_COMPAT: Record<string, number> = {
  "luxe-luxe": 1.0, "luxe-classic": 0.85, "luxe-structured": 0.65, "luxe-casual": 0.3,
  "structured-structured": 1.0, "structured-classic": 0.9, "structured-casual": 0.65,
  "classic-classic": 1.0, "classic-casual": 0.8, "classic-knit": 0.85,
  "casual-casual": 1.0, "casual-knit": 0.9, "casual-technical": 0.75,
  "knit-knit": 1.0, "technical-technical": 1.0, "technical-down": 0.8,
  "blend-blend": 1.0, "eco-eco": 1.0, "down-down": 0.9,
  "casual-down": 0.7, "classic-down": 0.55, "structured-down": 0.6,
};

function inferMaterialGroup(material: string, name?: string): string {
  const check = (text: string) => {
    const m = text.toLowerCase();
    for (const [group, materials] of Object.entries(MATERIAL_GROUPS)) {
      if (materials.some(mat => m.includes(mat))) return group;
    }
    return null;
  };
  return check(material || "") || check(name || "") || "blend";
}

function getMaterialCompatScore(g1: string, g2: string): number {
  return MATERIAL_COMPAT[`${g1}-${g2}`] ?? MATERIAL_COMPAT[`${g2}-${g1}`] ?? 0.5;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMALITY
// ═══════════════════════════════════════════════════════════════════════════════

const FORMALITY_BY_SUB: Record<string, number> = {
  blazer: 7, suit_jacket: 8, dress_shirt: 7, slacks: 7, trench: 7,
  oxford: 7, loafer: 6, heel: 7, necktie: 8,
  blouse: 5, cardigan: 4, polo: 4, chinos: 4, shirt: 5, turtleneck: 5,
  sweater: 4, coat: 6, boot: 4, tote: 4,
  tshirt: 2, hoodie: 2, sweatshirt: 2, jeans: 2, denim: 2,
  shorts: 2, sneaker: 2, sandal: 1, backpack: 2,
  windbreaker: 1, puffer: 2, leggings: 1, track_pants: 1,
};

const STYLE_COMPAT: Record<string, Record<string, number>> = {
  formal: { formal: 1.0, smart_casual: 0.75, casual: 0.35, sporty: 0.1 },
  smart_casual: { formal: 0.75, smart_casual: 1.0, casual: 0.8, sporty: 0.4 },
  casual: { formal: 0.35, smart_casual: 0.8, casual: 1.0, sporty: 0.7 },
  sporty: { formal: 0.1, smart_casual: 0.4, casual: 0.7, sporty: 1.0 },
};

function formalityToStyle(f: number): string {
  if (f >= 7) return "formal";
  if (f >= 4) return "smart_casual";
  if (f >= 2) return "casual";
  return "sporty";
}

function getFormality(p: any): number {
  if (typeof p.formality === "number") return p.formality;
  const sub = (p.sub_category || "").toLowerCase().replace(/[\s-]/g, "_");
  return FORMALITY_BY_SUB[sub] ?? 3;
}

function inferStyle(p: any): string {
  const sub = (p.sub_category || "").toLowerCase().replace(/[\s-]/g, "_");
  const styleMap: Record<string, string> = {
    blazer: "formal", trench: "formal", loafer: "formal",
    blouse: "smart_casual", cardigan: "smart_casual", polo: "smart_casual",
    chinos: "smart_casual", sweater: "smart_casual",
    tshirt: "casual", hoodie: "casual", jeans: "casual", denim: "casual",
    sneaker: "casual", shorts: "casual", backpack: "casual",
    windbreaker: "sporty", puffer: "sporty", leggings: "sporty", track_pants: "sporty",
  };
  if (styleMap[sub]) return styleMap[sub];
  return formalityToStyle(getFormality(p));
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIBE ITEM AFFINITY (ported from src/utils/matching/vibeAffinity.ts)
// Fuzzy matching between product sub_category/name and vibe item pools
// ═══════════════════════════════════════════════════════════════════════════════

const VIBE_ITEM_POOLS: Record<string, Record<string, string[]>> = {
  ELEVATED_COOL: {
    outer: ["oversized wool coat", "structured trench", "leather blazer", "tailored jacket", "technical bomber", "nylon windbreaker", "biker jacket", "puffer jacket", "tweed blazer", "wool peacoat", "denim jacket"],
    top: ["high-neck knit", "poplin shirt", "silk button-down", "cashmere turtleneck", "oxford shirt", "cable-knit sweater", "graphic tee", "oversized long sleeve", "logo sweatshirt", "crew-neck sweat"],
    bottom: ["wide-leg wool trousers", "cigarette pants", "pleated trousers", "leather pants", "straight-leg jeans", "chinos", "corduroy pants", "cargo pants", "parachute pants", "track pants", "baggy jeans"],
    shoes: ["square-toe ankle boots", "chunky loafers", "pointed-toe flats", "chelsea boots", "derby shoes", "brogue loafers", "leather sneakers", "chunky sneakers", "high-top sneakers", "combat boots"],
    bag: ["geometric tote", "box bag", "structured clutch", "briefcase", "satchel", "canvas tote", "chest rig", "belt bag", "tech backpack"],
    accessory: ["silver chain necklace", "metal-frame sunglasses", "leather gloves", "minimalist watch", "bucket hat", "baseball cap", "shield sunglasses"],
    mid: ["cashmere turtleneck", "cable-knit sweater", "oxford shirt", "argyle sweater"],
  },
  EFFORTLESS_NATURAL: {
    outer: ["collarless linen coat", "robe coat", "noragi", "kimono cardigan", "wool blazer", "trench coat", "chore coat", "field jacket", "barn jacket"],
    top: ["linen tunic", "gauze blouse", "organic cotton tee", "breton stripe tee", "cashmere crew-neck", "silk blouse", "linen shirt", "flannel shirt", "waffle henley", "chambray shirt"],
    bottom: ["wide linen trousers", "drawstring linen pants", "culottes", "straight-leg jeans", "wide-leg trousers", "midi skirt", "vintage denim", "fatigue pants", "corduroy trousers"],
    shoes: ["leather slides", "tabi flats", "wooden clogs", "ballet flats", "loafers", "espadrilles", "suede ankle boots", "desert boots", "moccasins", "canvas sneakers"],
    bag: ["natural canvas tote", "woven basket bag", "soft leather tote", "mini shoulder bag", "canvas messenger", "backpack"],
    accessory: ["wooden bead bracelet", "linen headband", "straw hat", "silk scarf", "gold hoops", "pearl studs", "leather belt", "bandana"],
    mid: ["cashmere crew-neck", "waffle henley", "cardigan"],
  },
  ARTISTIC_MINIMAL: {
    outer: ["collarless long coat", "cocoon coat", "longline blazer", "wrap coat", "asymmetric jacket", "linen duster", "draped cardigan"],
    top: ["structured tee", "ribbed tank", "mock-neck top", "silk shell", "asymmetric knit", "pleated linen top", "cowl-neck top", "sheer mesh top", "organza blouse", "mohair knit"],
    bottom: ["wide cropped trousers", "pleated wide pants", "maxi pencil skirt", "barrel leg pants", "wrap skirt", "hakama pants", "leather skirt", "satin wide pants"],
    shoes: ["square-toe flats", "architectural mules", "derby shoes", "minimal sneakers", "suede tabi", "leather clog", "tabi boots", "sculptural heels"],
    bag: ["geometric tote", "origami bag", "structured clutch", "portfolio bag", "pleated tote", "sculptural shoulder bag"],
    accessory: ["sculptural bangle", "bold geometric earrings", "minimalist choker", "oversized sunglasses", "ceramic bead necklace", "metal cuff"],
    mid: ["ribbed tank", "mock-neck top", "turtleneck"],
  },
  RETRO_LUXE: {
    outer: ["suede fringe jacket", "velvet blazer", "crochet cardigan", "tweed blazer", "camel overcoat", "polo coat", "corduroy blazer", "faux fur coat", "gold button blazer"],
    top: ["peasant blouse", "embroidered tunic", "lace top", "cashmere turtleneck", "cable-knit sweater", "silk blouse", "oxford shirt", "satin blouse", "velvet halter", "corset top"],
    bottom: ["flared jeans", "maxi boho skirt", "tiered skirt", "wool trousers", "riding pants", "corduroy pants", "plaid skirt", "velvet trousers", "satin midi skirt", "leather pants"],
    shoes: ["platform sandals", "suede knee boots", "wedge espadrilles", "leather loafers", "penny loafers", "riding boots", "oxford shoes", "kitten heel mules", "strappy sandals", "velvet pumps"],
    bag: ["tapestry bag", "fringe suede bag", "wicker bag", "frame bag", "structured handbag", "leather satchel", "satin clutch", "metallic evening bag"],
    accessory: ["headscarf", "layered necklace", "turquoise jewelry", "pearl earrings", "gold signet ring", "silk scarf", "chandelier earrings", "statement necklace"],
    mid: ["cable-knit sweater", "cashmere turtleneck", "crochet vest"],
  },
  SPORT_MODERN: {
    outer: ["gore-tex shell", "technical anorak", "fleece jacket", "insulated parka", "zip-up hoodie", "lightweight bomber", "cropped track jacket", "tactical jacket", "nylon field jacket"],
    top: ["merino base layer", "half-zip fleece", "technical quarter-zip", "performance tee", "sports bra", "fitted tank", "ribbed crop tee", "seamless top", "mesh layer top", "compression long sleeve"],
    bottom: ["hiking pants", "convertible pants", "trail shorts", "high-waist leggings", "bike shorts", "yoga pants", "wide-leg sweatpants", "cargo trousers", "tactical pants", "jogger cargo"],
    shoes: ["trail running shoes", "hiking boots", "retro running shoes", "platform sneakers", "court shoes", "training shoes", "chunky platform sneakers", "tactical boots", "tech runners"],
    bag: ["hiking backpack", "hydration pack", "utility sling", "gym tote", "canvas duffel", "mini backpack", "chest harness bag", "tactical sling"],
    accessory: ["bucket hat", "sun visor", "sports visor", "minimalist watch", "sport headband", "smart watch", "tactical cap"],
    mid: ["half-zip fleece", "technical quarter-zip", "ribbed crop tee"],
  },
  CREATIVE_LAYERED: {
    outer: ["oversized flannel shirt", "leather biker jacket", "denim jacket", "velvet blazer", "tapestry coat", "patchwork denim jacket", "chain-detail blazer"],
    top: ["band tee", "ripped tee", "mesh top", "graphic tee", "floral print blouse", "lace top", "vintage graphic tee", "crochet vest", "corset top", "fishnet top"],
    bottom: ["ripped jeans", "plaid mini skirt", "cargo pants", "baggy jeans", "corduroy wide-leg", "velvet midi skirt", "patchwork jeans", "leather pants", "tartan trousers"],
    shoes: ["combat boots", "chunky platform boots", "mary janes", "vintage loafers", "platform boots", "platform combat boots", "studded ankle boots", "creepers"],
    bag: ["canvas backpack", "guitar strap bag", "tapestry bag", "vintage frame bag", "studded backpack", "chain shoulder bag"],
    accessory: ["choker necklace", "safety pin set", "layered chain necklace", "brooch collection", "oversized retro glasses", "spike choker", "chain belt"],
    mid: ["crochet vest", "denim jacket", "flannel shirt"],
  },
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function fuzzyMatchScore(productTerms: string[], itemPool: string[]): number {
  let bestScore = 0;
  const normalizedPool = itemPool.map(normalizeText);

  for (const rawTerm of productTerms) {
    const term = normalizeText(rawTerm);
    if (!term) continue;

    for (const poolItem of normalizedPool) {
      if (term === poolItem) { bestScore = Math.max(bestScore, 1.0); continue; }
      if (term.includes(poolItem) || poolItem.includes(term)) {
        const shorter = term.length < poolItem.length ? term : poolItem;
        const longer = term.length >= poolItem.length ? term : poolItem;
        bestScore = Math.max(bestScore, 0.6 + (shorter.length / longer.length) * 0.3);
        continue;
      }
      const termWords = term.split(/\s+/).filter(w => w.length >= 3);
      const poolWords = poolItem.split(/\s+/).filter(w => w.length >= 3);
      let matchedWords = 0;
      for (const tw of termWords) {
        for (const pw of poolWords) {
          if (tw === pw || tw.includes(pw) || pw.includes(tw)) { matchedWords++; break; }
        }
      }
      if (matchedWords > 0) {
        const total = Math.max(termWords.length, poolWords.length, 1);
        bestScore = Math.max(bestScore, 0.3 + (matchedWords / total) * 0.5);
      }
    }
  }

  return bestScore;
}

function getVibeItemAffinity(product: any, vibe: string): number {
  const pool = VIBE_ITEM_POOLS[vibe];
  if (!pool) return 0;
  const category = product.category as string;
  const slotKey = category === "mid" ? "top" : category;
  const itemPool = pool[slotKey];
  if (!itemPool?.length) return 0;
  const terms: string[] = [];
  if (product.sub_category) terms.push(product.sub_category);
  if (product.name) terms.push(product.name);
  if (!terms.length) return 0;
  return fuzzyMatchScore(terms, itemPool);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING ENGINE (8 dimensions + Pattern Balance + Accessory Harmony)
// ═══════════════════════════════════════════════════════════════════════════════

function scoreTonalHarmony(items: Record<string, any>): number {
  const all = Object.values(items).filter(Boolean);
  const families = all.map((p: any) => resolveColorFamily(p.color || "", p.color_family)).filter(Boolean);
  if (families.length < 2) return 50;

  let pairHarmony = 0, pairCount = 0;
  for (let i = 0; i < families.length; i++) {
    for (let j = i + 1; j < families.length; j++) {
      pairHarmony += getColorHarmonyScore(families[i], families[j]);
      pairCount++;
    }
  }
  let score = pairCount > 0 ? pairHarmony / pairCount : 50;

  const blackCount = families.filter(f => f === "black").length;
  if (blackCount >= 4) score -= 15;
  if (blackCount >= 3) score -= 8;

  const accents = families.filter(f => !isNeutralColor(f));
  if (new Set(accents).size > 2) score -= 12;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreFormalityCoherence(items: Record<string, any>): number {
  const all = Object.values(items).filter(Boolean);
  if (all.length < 3) return 50;

  const formalities = all.map(getFormality);
  const styles = all.map(inferStyle);
  let score = 70;

  const fRange = Math.max(...formalities) - Math.min(...formalities);
  if (fRange <= 2) score += 15;
  else if (fRange <= 3) score += 5;
  else if (fRange > 5) score -= 20;

  let compatSum = 0, compatCount = 0;
  for (let i = 0; i < styles.length; i++) {
    for (let j = i + 1; j < styles.length; j++) {
      compatSum += STYLE_COMPAT[styles[i]]?.[styles[j]] ?? 0.5;
      compatCount++;
    }
  }
  const avgCompat = compatCount > 0 ? compatSum / compatCount : 0.5;
  score += (avgCompat - 0.5) * 40;

  const coreStyles = ["top", "bottom", "shoes"]
    .map(k => items[k]).filter(Boolean).map(inferStyle);
  if (coreStyles.includes("formal") && coreStyles.includes("sporty")) score -= 15;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreMaterialCompat(items: Record<string, any>): number {
  const coreKeys = ["outer", "mid", "top", "bottom", "shoes"];
  const coreItems = coreKeys.map(k => items[k]).filter(Boolean);
  if (coreItems.length < 2) return 50;

  const groups = coreItems.map((p: any) => inferMaterialGroup(p.material || "", p.name));
  let compatTotal = 0, compatCount = 0;
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      compatTotal += getMaterialCompatScore(groups[i], groups[j]);
      compatCount++;
    }
  }
  return Math.max(0, Math.min(100, Math.round((compatCount > 0 ? compatTotal / compatCount : 0.5) * 100)));
}

// [Issue 2] Vibe Match now uses fuzzy affinity instead of simple array includes
function scoreVibeMatch(items: Record<string, any>, vibe: string): number {
  const all = Object.values(items).filter(Boolean);
  if (all.length === 0) return 50;

  let totalAffinity = 0;
  for (const p of all) {
    const affinity = getVibeItemAffinity(p, vibe);
    if (affinity >= 0.8) totalAffinity += 1.0;
    else if (affinity >= 0.5) totalAffinity += 0.75;
    else if (affinity >= 0.3) totalAffinity += 0.5;
    else if (Array.isArray(p.vibe) && p.vibe.includes(vibe)) totalAffinity += 0.4;
    else totalAffinity += 0.1;
  }
  const avgAffinity = totalAffinity / all.length;
  return Math.max(0, Math.min(100, Math.round(30 + avgAffinity * 70)));
}

function scoreSeasonFit(items: Record<string, any>, season: string): number {
  if (!season) return 50;
  const coreKeys = ["outer", "mid", "top", "bottom", "shoes"];
  const coreItems = coreKeys.map(k => items[k]).filter(Boolean);
  if (coreItems.length < 2) return 50;

  let score = 100, matchCount = 0, mismatchCount = 0;
  for (const item of coreItems) {
    const seasons = (item as any).season || [];
    if (seasons.includes(season)) { matchCount++; score += 8; }
    else if (seasons.length === 0) score -= 5;
    else { mismatchCount++; score -= 18; }
  }
  if (matchCount === coreItems.length) score += 20;
  if (mismatchCount >= Math.ceil(coreItems.length * 0.5)) score -= 25;
  return Math.max(0, Math.min(100, score));
}

function scoreWarmthFit(items: Record<string, any>, season: string): number {
  const SEASON_WARMTH: Record<string, { min: number; max: number; ideal: number }> = {
    spring: { min: 1.5, max: 3.5, ideal: 2.5 },
    summer: { min: 1, max: 2.5, ideal: 1.5 },
    fall: { min: 2.5, max: 4, ideal: 3.2 },
    winter: { min: 3.5, max: 5, ideal: 4.2 },
  };

  const coreKeys = ["outer", "mid", "top", "bottom", "shoes"];
  const warmths = coreKeys.map(k => items[k]).filter(Boolean)
    .map((i: any) => i.warmth).filter((w: any): w is number => typeof w === "number");
  if (warmths.length < 2 || !season) return 50;

  let score = 100;
  const avg = warmths.reduce((s: number, w: number) => s + w, 0) / warmths.length;
  const bounds = SEASON_WARMTH[season];
  if (bounds) {
    const diff = Math.abs(avg - bounds.ideal);
    if (diff <= 0.5) score += 15;
    else if (diff <= 1) score += 5;
    else if (diff > 2) score -= 45;
    else if (diff > 1.5) score -= 30;

    if (avg < bounds.min) score -= Math.min(30, (bounds.min - avg) * 20);
    if (avg > bounds.max) score -= Math.min(30, (avg - bounds.max) * 20);
  }
  return Math.max(0, Math.min(100, score));
}

function scoreColorDepth(items: Record<string, any>): number {
  const coreKeys = ["outer", "mid", "top", "bottom", "shoes"];
  const colors = coreKeys.map(k => items[k]).filter(Boolean)
    .map((p: any) => resolveColorFamily(p.color || "", p.color_family)).filter(Boolean);
  if (colors.length < 3) return 50;

  let score = 70;
  const unique = new Set(colors);
  const blackCount = colors.filter((c: string) => c === "black").length;
  if (blackCount >= 3) score -= 15;
  if (blackCount >= 4) score -= 15;
  if (unique.size >= 2 && !colors.every((c: string) => isNeutralColor(c))) score += 10;
  if (unique.size >= 3) score += 10;
  if (unique.size > 4) score -= 15;
  if (unique.size === 1 && isNeutralColor(colors[0])) score -= 20;

  return Math.max(0, Math.min(100, score));
}

function scoreProportionBalance(items: Record<string, any>): number {
  const top = items.top, bottom = items.bottom;
  if (!top || !bottom) return 50;

  const BALANCE: Record<string, string[]> = {
    oversized: ["slim", "fitted", "straight", "tapered"],
    relaxed: ["slim", "fitted", "straight"],
    wide: ["fitted", "slim"],
    fitted: ["wide", "relaxed", "oversized"],
    slim: ["wide", "relaxed", "oversized", "regular"],
    regular: ["slim", "fitted", "wide", "relaxed", "oversized"],
    straight: ["fitted", "slim", "oversized"],
  };

  let score = 60;
  const topSil = (top.silhouette || "regular").toLowerCase();
  const bottomSil = (bottom.silhouette || "regular").toLowerCase();

  if (BALANCE[topSil]?.includes(bottomSil)) score += 25;
  else if (topSil === bottomSil) {
    if (topSil === "oversized" || topSil === "wide") score -= 18;
    else score -= 5;
  }

  const outer = items.outer;
  if (outer) {
    const outerSil = (outer.silhouette || "regular").toLowerCase();
    if (outerSil === "oversized" && topSil === "oversized") score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

// [Issue 3] Pattern Balance: penalizes clashing prints
function scorePatternBalance(items: Record<string, any>): number {
  const coreKeys = ["outer", "top", "bottom"];
  const patterns = coreKeys.map(k => items[k]).filter(Boolean)
    .map((p: any) => (p.pattern || "solid").toLowerCase());

  if (patterns.length < 2) return 75;

  const LOUD = new Set(["stripe", "check", "graphic", "print"]);
  const loudPatterns = patterns.filter(p => LOUD.has(p));
  const uniqueLoud = new Set(loudPatterns);

  let score = 80;
  if (loudPatterns.length >= 3) score -= 30;
  else if (loudPatterns.length === 2 && uniqueLoud.size === 2) score -= 20;
  else if (loudPatterns.length === 2 && uniqueLoud.size === 1) score -= 10;
  else if (loudPatterns.length === 1) score += 10;

  if (loudPatterns.includes("stripe") && loudPatterns.includes("check")) score -= 15;
  if (loudPatterns.includes("print") && loudPatterns.length > 1) score -= 10;

  return Math.max(0, Math.min(100, score));
}

// [Issue 3] Accessory Harmony: bag/accessory should harmonize with core palette
function scoreAccessoryHarmony(items: Record<string, any>): number {
  const coreFamilies = ["top", "bottom", "shoes"]
    .map(k => items[k]).filter(Boolean)
    .map((p: any) => resolveColorFamily(p.color || "", p.color_family)).filter(Boolean);

  if (coreFamilies.length === 0) return 75;

  const accItems = ["bag", "accessory"].map(k => items[k]).filter(Boolean);
  if (accItems.length === 0) return 75;

  let totalHarmony = 0, count = 0;
  for (const acc of accItems) {
    const accFamily = resolveColorFamily(acc.color || "", acc.color_family);
    if (!accFamily) continue;
    let best = 0;
    for (const cf of coreFamilies) {
      best = Math.max(best, getColorHarmonyScore(accFamily, cf));
    }
    totalHarmony += best;
    count++;
  }

  if (count === 0) return 75;
  return Math.max(0, Math.min(100, Math.round(totalHarmony / count)));
}

// [Issue 5] Dynamic maxProductRepeat: scales with productsPerSlot via context
const SCORE_WEIGHTS = {
  tonalHarmony: 0.15,
  formalityCoherence: 0.12,
  materialCompat: 0.09,
  vibeMatch: 0.16,
  seasonFit: 0.13,
  warmthFit: 0.09,
  colorDepth: 0.08,
  proportionBalance: 0.07,
  patternBalance: 0.07,
  accessoryHarmony: 0.04,
};

function scoreComposition(items: Record<string, any>, vibe: string, season: string): {
  total: number;
  breakdown: Record<string, number>;
} {
  const breakdown = {
    tonalHarmony: scoreTonalHarmony(items),
    formalityCoherence: scoreFormalityCoherence(items),
    materialCompat: scoreMaterialCompat(items),
    vibeMatch: scoreVibeMatch(items, vibe),
    seasonFit: scoreSeasonFit(items, season),
    warmthFit: scoreWarmthFit(items, season),
    colorDepth: scoreColorDepth(items),
    proportionBalance: scoreProportionBalance(items),
    patternBalance: scorePatternBalance(items),
    accessoryHarmony: scoreAccessoryHarmony(items),
  };

  let total = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    total += (breakdown[key as keyof typeof breakdown] || 50) * weight;
  }

  return { total: Math.round(total), breakdown };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BEAM SEARCH + DIVERSITY FILTER
// ═══════════════════════════════════════════════════════════════════════════════

function quickColorCheck(product: any, existingFamilies: string[]): boolean {
  if (existingFamilies.length === 0) return true;
  const cf = resolveColorFamily(product.color || "", product.color_family);
  if (!cf) return true;
  for (const existing of existingFamilies) {
    if (getColorHarmonyScore(cf, existing) < 25) return false;
  }
  return true;
}

function isSeasonAppropriateOuter(product: any, season: string): boolean {
  const warmth = typeof product.warmth === "number" ? product.warmth : 3;
  if (season === "summer") return false;
  if (season === "winter" && warmth < 3) return false;
  if (season === "spring" && warmth > 4) return false;
  return true;
}

interface ScoredOutfit {
  items: Record<string, any>;
  score: number;
  breakdown: Record<string, number>;
}

function assembleAndScore(
  products: any[],
  vibe: string,
  season: string,
  outfitCount: number
): ScoredOutfit[] {
  const slots = ["top", "bottom", "shoes", "bag", "accessory", "outer", "mid"];
  const bySlot: Record<string, any[]> = {};
  for (const slot of slots) bySlot[slot] = products.filter((p: any) => p.category === slot);

  bySlot["outer"] = bySlot["outer"].filter((p: any) => isSeasonAppropriateOuter(p, season));
  if (season === "summer") bySlot["mid"] = [];

  if (!bySlot["top"]?.length || !bySlot["bottom"]?.length) return [];

  const MAX_PER_CORE = 10;
  for (const slot of ["top", "bottom", "shoes"]) {
    if (bySlot[slot].length > MAX_PER_CORE) {
      bySlot[slot] = bySlot[slot].slice(0, MAX_PER_CORE);
    }
  }
  const MAX_OPT = 6;
  for (const slot of ["outer", "mid", "bag", "accessory"]) {
    if (bySlot[slot].length > MAX_OPT) {
      bySlot[slot] = bySlot[slot].slice(0, MAX_OPT);
    }
  }

  const combos: ScoredOutfit[] = [];
  const MAX_COMBOS = 3000;

  for (const top of bySlot["top"]) {
    const topCF = resolveColorFamily(top.color || "", top.color_family);
    for (const bottom of bySlot["bottom"]) {
      const bottomCF = resolveColorFamily(bottom.color || "", bottom.color_family);
      if (topCF && bottomCF && getColorHarmonyScore(topCF, bottomCF) < 30) continue;

      const shoesPool = bySlot["shoes"].filter((s: any) =>
        quickColorCheck(s, [topCF, bottomCF].filter(Boolean))
      );

      for (const shoes of (shoesPool.length > 0 ? shoesPool : bySlot["shoes"].slice(0, 2))) {
        const coreItems: Record<string, any> = { top, bottom, shoes };
        const coreFamilies = [topCF, bottomCF, resolveColorFamily(shoes.color || "", shoes.color_family)].filter(Boolean);

        const outerPool = bySlot["outer"].filter((o: any) => quickColorCheck(o, coreFamilies));
        const outerCandidates = outerPool.length > 0 ? [null, outerPool[0]] : [null];

        for (const outer of outerCandidates) {
          const items: Record<string, any> = { ...coreItems };
          if (outer) items.outer = outer;

          const midPool = bySlot["mid"].filter((m: any) => quickColorCheck(m, coreFamilies));
          if (midPool.length > 0 && !items.outer) items.mid = midPool[0];

          if (bySlot["bag"]?.length) {
            const bagIdx = Math.abs(
              Object.values(items).filter(Boolean).map((p: any) => p.id).join("").length
            ) % bySlot["bag"].length;
            items.bag = bySlot["bag"][bagIdx];
          }
          if (bySlot["accessory"]?.length) {
            const accIdx = Math.abs(
              Object.values(items).filter(Boolean).map((p: any) => p.id).join("").length * 31
            ) % bySlot["accessory"].length;
            items.accessory = bySlot["accessory"][accIdx];
          }

          const allItems = Object.values(items).filter(Boolean);
          const blackCount = allItems
            .map((p: any) => resolveColorFamily(p.color || "", p.color_family))
            .filter(c => c === "black").length;
          if (blackCount >= 4 && allItems.length >= 5) continue;

          const { total, breakdown } = scoreComposition(items, vibe, season);

          if (total >= 40) {
            combos.push({ items, score: total, breakdown });
          }

          if (combos.length >= MAX_COMBOS) break;
        }
        if (combos.length >= MAX_COMBOS) break;
      }
      if (combos.length >= MAX_COMBOS) break;
    }
    if (combos.length >= MAX_COMBOS) break;
  }

  combos.sort((a, b) => b.score - a.score);

  return selectDiverseOutfits(combos, outfitCount);
}

// [Issue 5] Dynamic maxProductRepeat: based on available products per slot
function selectDiverseOutfits(scored: ScoredOutfit[], topN: number): ScoredOutfit[] {
  if (scored.length <= topN) return scored;

  const pool = scored.slice(0, Math.min(scored.length, topN * 30));
  const selected: ScoredOutfit[] = [];
  const productCounts = new Map<string, number>();
  const paletteCounts = new Map<string, number>();

  // Dynamic: allow repeat if pool is limited relative to target
  const maxProductRepeat = pool.length < topN * 3 ? 2 : 1;
  const maxPaletteRepeat = Math.max(1, Math.ceil(topN / 4));

  const getAllIds = (items: Record<string, any>) =>
    Object.values(items).filter(Boolean).map((p: any) => p.id);
  const getPaletteKey = (items: Record<string, any>) =>
    Object.values(items).filter(Boolean)
      .map((p: any) => resolveColorFamily(p.color || "", p.color_family) || "")
      .filter(Boolean).sort().join("-");

  const trySelect = (enforceProduct: boolean) => {
    for (const candidate of pool) {
      if (selected.length >= topN) break;
      if (selected.includes(candidate)) continue;

      const paletteKey = getPaletteKey(candidate.items);
      if ((paletteCounts.get(paletteKey) || 0) >= maxPaletteRepeat) continue;

      if (enforceProduct) {
        const ids = getAllIds(candidate.items);
        if (ids.some(id => (productCounts.get(id) || 0) >= maxProductRepeat)) continue;
      }

      selected.push(candidate);
      paletteCounts.set(paletteKey, (paletteCounts.get(paletteKey) || 0) + 1);
      for (const id of getAllIds(candidate.items)) {
        productCounts.set(id, (productCounts.get(id) || 0) + 1);
      }
    }
  };

  trySelect(true);
  if (selected.length < topN) trySelect(false);
  if (selected.length < topN) {
    for (const candidate of pool) {
      if (selected.length >= topN) break;
      if (!selected.includes(candidate)) selected.push(candidate);
    }
  }

  return selected;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SERVER
// ═══════════════════════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text && text.trim().length > 0) body = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = body as { action?: string };

    if (action === "generate-outfits") {
      const { batchId, gender, body_type, vibe, season, outfit_count = 3 } = body as {
        batchId: string; gender: string; body_type: string; vibe: string; season: string; outfit_count?: number;
      };
      if (!batchId || !gender || !body_type || !vibe) {
        return new Response(JSON.stringify({ error: "batchId, gender, body_type, vibe required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: batchProducts } = await adminClient
        .from("products")
        .select("id, name, category, sub_category, color, color_family, color_tone, vibe, season, warmth, formality, silhouette, material, pattern, image_url, nobg_image_url, price, body_type")
        .eq("batch_id", batchId);

      if (!batchProducts || batchProducts.length === 0) {
        return new Response(JSON.stringify({ error: "No products found for batch" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const selectedCombos = assembleAndScore(
        batchProducts,
        vibe,
        season || "all",
        outfit_count as number
      );

      if (selectedCombos.length === 0) {
        const catCount: Record<string, number> = {};
        for (const p of batchProducts) catCount[p.category] = (catCount[p.category] || 0) + 1;
        return new Response(JSON.stringify({
          error: `Could not assemble outfits meeting quality threshold. Available: ${JSON.stringify(catCount)}`,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const outfitIds: string[] = [];
      const outfitCandidates: any[] = [];

      for (const { items: outfitItems, score, breakdown } of selectedCombos) {
        const { data: newOutfit, error: outfitErr } = await adminClient.from("outfits").insert({
          gender, body_type, vibe,
          season: season ? [season] : [],
          status: "draft", tpo: "",
          "AI insight": `Auto-pipeline (v3) | Score: ${score}`,
          image_url_flatlay: "", image_url_on_model: "",
          flatlay_pins: [], on_model_pins: [], prompt_flatlay: "",
        }).select().single();

        if (outfitErr || !newOutfit) continue;

        const itemsToInsert: any[] = [];
        const candidateItems: any[] = [];
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
        }
        await adminClient.from("outfit_items").insert(itemsToInsert);
        outfitIds.push(newOutfit.id);
        outfitCandidates.push({
          outfitId: newOutfit.id,
          matchScore: score,
          items: candidateItems,
          scoreBreakdown: {
            tonalHarmony: breakdown.tonalHarmony,
            formalityCoherence: breakdown.formalityCoherence,
            materialCompat: breakdown.materialCompat,
            vibeMatch: breakdown.vibeMatch,
            seasonFit: breakdown.seasonFit,
            colorDepth: breakdown.colorDepth,
            patternBalance: breakdown.patternBalance,
            accessoryHarmony: breakdown.accessoryHarmony,
          },
        });
      }

      if (outfitIds.length === 0) {
        return new Response(JSON.stringify({ error: "Could not assemble any complete outfits" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const insightHeaders = { "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" };
      EdgeRuntime.waitUntil(Promise.allSettled(outfitIds.map(async (outfitId) => {
        const { data: items } = await adminClient.from("outfit_items").select("slot_type, products(*)").eq("outfit_id", outfitId);
        if (!items || items.length === 0) return;
        const itemList = items.map((i: any) => ({
          slot_type: i.slot_type, brand: i.products?.brand || "", name: i.products?.name || "",
          category: i.products?.category || "", color: i.products?.color || "",
          color_family: i.products?.color_family || "", material: i.products?.material || "",
          pattern: i.products?.pattern || "", silhouette: i.products?.silhouette || "",
          sub_category: i.products?.sub_category || "", vibe: i.products?.vibe || [],
        }));
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-outfit-insight`, {
            method: "POST", headers: insightHeaders,
            body: JSON.stringify({ items: itemList, gender, bodyType: body_type, vibe, season, matchScore: Math.round(75 + Math.random() * 15) }),
          });
          if (res.ok) {
            const d = await res.json();
            if (d.success && d.insight) await adminClient.from("outfits").update({ "AI insight": d.insight }).eq("id", outfitId);
          }
        } catch { /* silent */ }
      })));

      return new Response(JSON.stringify({ success: true, outfitIds, outfitCandidates }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "register-product") {
      const { product, gender, body_type, vibe, season, batchId, slotHint } = body as {
        product: any; gender: string; body_type: string; vibe: string; season: string; batchId: string; slotHint?: string;
      };

      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const productLink = product.url || "";

      if (productLink) {
        const { data: existing } = await adminClient
          .from("products")
          .select("id")
          .eq("product_link", productLink)
          .limit(1)
          .maybeSingle();
        if (existing) {
          await adminClient.from("products").update({ batch_id: batchId }).eq("id", existing.id);
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
          .eq("asin", asinMatch[1])
          .limit(1)
          .maybeSingle();
        if (existingByAsin) {
          await adminClient.from("products").update({ batch_id: batchId }).eq("id", existingByAsin.id);
          return new Response(JSON.stringify({ success: true, productId: existingByAsin.id, skipped: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/auto-analyze-product`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ product, gender, body_type, vibe, season, batchId, slotHint }),
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ success: false, error: "Analysis failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await res.json();
      if (data.error) {
        return new Response(JSON.stringify({ success: false, error: data.error }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        productId: data.productId,
        skipped: data.skipped || false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "extract-nobg") {
      const { productId, imageUrl, category, subCategory } = body as {
        productId: string; imageUrl: string; category: string; subCategory: string;
      };

      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const headers = { "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" };
      const slot = ["outer", "mid", "top", "bottom", "shoes", "bag", "accessory"].includes(category) ? category : "top";
      const label = subCategory || category;
      let nobgUrl: string | null = null;
      let isModelShot = false;

      try {
        const detectRes = await fetch(`${SUPABASE_URL}/functions/v1/extract-products`, {
          method: "POST", headers, body: JSON.stringify({ mode: "detect", imageUrl }),
        });
        if (detectRes.ok) {
          const detectData = await detectRes.json();
          if (detectData.success && detectData.items?.length) {
            isModelShot = true;
            const targetItem = detectData.items.find((i: any) => i.slot === slot) ?? detectData.items[0];
            const extractRes = await fetch(`${SUPABASE_URL}/functions/v1/extract-products`, {
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
          const pixianRes = await fetch(`${SUPABASE_URL}/functions/v1/remove-bg`, {
            method: "POST", headers, body: JSON.stringify({ imageUrl: pixianSourceUrl, productId }),
          });
          if (pixianRes.ok) {
            const pixianData = await pixianRes.json();
            if (pixianData.success && (pixianData.url || pixianData.image)) nobgUrl = pixianData.url || pixianData.image;
          }
        } catch { /* silent */ }
      }

      if (nobgUrl && !nobgUrl.startsWith("data:")) {
        await adminClient.from("products").update({ nobg_image_url: nobgUrl }).eq("id", productId);
      }

      return new Response(JSON.stringify({ success: true, nobgUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "submit-feedback") {
      const { batchId, outfitId, accepted, vibe: feedbackVibe, season: feedbackSeason, matchScore, keywordsUsed } = body as {
        batchId: string; outfitId: string; accepted: boolean; vibe: string; season: string;
        matchScore?: number; keywordsUsed?: Array<{ keyword: string; slot: string }>;
      };

      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      await adminClient.from("pipeline_feedback").insert({
        batch_id: batchId,
        outfit_id: outfitId,
        accepted,
        match_score: matchScore || null,
        vibe: feedbackVibe,
        season: feedbackSeason,
      });

      if (accepted) {
        const { data: outfitItems } = await adminClient
          .from("outfit_items")
          .select("slot_type, products(id, name, sub_category, category)")
          .eq("outfit_id", outfitId);

        if (outfitItems) {
          for (const item of outfitItems) {
            const product = (item as any).products;
            if (!product) continue;

            const { data: existing } = await adminClient
              .from("vibe_item_expansions")
              .select("id, usage_count")
              .eq("vibe", feedbackVibe)
              .eq("slot", product.category)
              .eq("item_name", product.sub_category || product.name)
              .maybeSingle();

            if (existing) {
              const newCount = existing.usage_count + 1;
              await adminClient
                .from("vibe_item_expansions")
                .update({ usage_count: newCount, score: Math.min(1.0, newCount * 0.1) })
                .eq("id", existing.id);
            } else {
              await adminClient.from("vibe_item_expansions").insert({
                vibe: feedbackVibe,
                slot: product.category,
                item_name: product.sub_category || product.name,
                source_batch: batchId,
                score: 0.1,
                usage_count: 1,
              });
            }
          }
        }

        // [Issue 1] Track keyword performance: record which keywords led to accepted outfits
        if (keywordsUsed && keywordsUsed.length > 0) {
          for (const { keyword, slot } of keywordsUsed) {
            if (!keyword || !slot) continue;

            const vibeKey = feedbackVibe.toLowerCase().replace(/\s+/g, "_");
            const { data: existingKw } = await adminClient
              .from("keyword_performance")
              .select("id, accepted_count, total_count, score")
              .eq("keyword", keyword)
              .eq("slot", slot)
              .eq("vibe", vibeKey)
              .eq("season", (feedbackSeason || "").toLowerCase())
              .maybeSingle();

            if (existingKw) {
              const newAccepted = existingKw.accepted_count + 1;
              const newTotal = existingKw.total_count + 1;
              await adminClient
                .from("keyword_performance")
                .update({
                  accepted_count: newAccepted,
                  total_count: newTotal,
                  score: newTotal > 0 ? newAccepted / newTotal : 0,
                })
                .eq("id", existingKw.id);
            } else {
              await adminClient.from("keyword_performance").insert({
                keyword,
                slot,
                vibe: vibeKey,
                season: (feedbackSeason || "").toLowerCase(),
                accepted_count: 1,
                total_count: 1,
                score: 1.0,
              });
            }
          }
        }
      } else {
        // Track rejected outfits' keywords to decrease their score
        if (keywordsUsed && keywordsUsed.length > 0) {
          for (const { keyword, slot } of keywordsUsed) {
            if (!keyword || !slot) continue;

            const vibeKey = feedbackVibe.toLowerCase().replace(/\s+/g, "_");
            const { data: existingKw } = await adminClient
              .from("keyword_performance")
              .select("id, accepted_count, total_count, score")
              .eq("keyword", keyword)
              .eq("slot", slot)
              .eq("vibe", vibeKey)
              .eq("season", (feedbackSeason || "").toLowerCase())
              .maybeSingle();

            if (existingKw) {
              const newTotal = existingKw.total_count + 1;
              await adminClient
                .from("keyword_performance")
                .update({
                  total_count: newTotal,
                  score: newTotal > 0 ? existingKw.accepted_count / newTotal : 0,
                })
                .eq("id", existingKw.id);
            } else {
              await adminClient.from("keyword_performance").insert({
                keyword,
                slot,
                vibe: vibeKey,
                season: (feedbackSeason || "").toLowerCase(),
                accepted_count: 0,
                total_count: 1,
                score: 0.0,
              });
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
