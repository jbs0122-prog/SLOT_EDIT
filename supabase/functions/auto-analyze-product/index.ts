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
  down: 5, sherpa: 5, shearling: 5,
  cashmere: 4.5, "heavy wool": 4.5,
  wool: 4, fleece: 4, tweed: 4, "faux fur": 4.5,
  flannel: 3.5, corduroy: 3, velvet: 3, leather: 3, suede: 3,
  denim: 2.5, cotton: 2, jersey: 2, polyester: 2, nylon: 2, canvas: 2,
  silk: 1.5, satin: 1.5, technical: 2,
  linen: 1, chiffon: 1, mesh: 1, gauze: 1,
};

const SUB_CAT_WARMTH: Record<string, number> = {
  puffer: 5, parka: 5, duffle_coat: 5, shearling: 5,
  overcoat: 4.5, peacoat: 4.5, quilted_jacket: 4,
  coat: 4, trench: 3, blazer: 3, biker_jacket: 3, bomber: 3, varsity_jacket: 3,
  cable_knit: 4, cashmere_sweater: 4.5, turtleneck_knit: 4, mock_neck: 3.5,
  sweater: 3.5, cardigan: 3, hoodie: 3, sweatshirt: 3, half_zip: 3.5, knit_vest: 3,
  denim_jacket: 2.5, field_jacket: 2.5, windbreaker: 2, track_jacket: 2, coach_jacket: 2,
  oxford_shirt: 2, shirt: 2, blouse: 2, polo: 2, henley: 2, flannel_shirt: 3,
  tshirt: 1.5, graphic_tee: 1.5, tank: 1, camisole: 1, crop_top: 1.5,
  sports_bra: 1, mesh_top: 1, performance_tee: 1.5,
  jeans: 2.5, denim: 2.5, chinos: 2, dress_pants: 2, slacks: 2,
  wide_leg: 2, cargo: 2, shorts: 1, biker_shorts: 1,
  jogger: 2, sweatpants: 2.5, track_pants: 2, leggings: 2,
  chelsea_boot: 3.5, ankle_boot: 3, boot: 3.5, knee_boot: 4, combat_boot: 3,
  sneaker: 2, runner: 2, loafer: 2, derby: 2.5, oxford: 2.5,
  sandal: 1, slide: 1, mule: 1.5, ballet_flat: 1.5, espadrille: 1.5,
  scarf: 3.5, beanie: 4, gloves: 4, hat: 2, sunglasses: 1,
};

const CATEGORY_WARMTH_DEFAULT: Record<string, number> = {
  outer: 3.5, mid: 3, top: 2, bottom: 2, shoes: 2.5, bag: 2, accessory: 2,
};

function inferWarmth(material: string, category: string, subCategory: string, season?: string): number {
  const mat = (material || "").toLowerCase();
  const sub = (subCategory || "").toLowerCase().replace(/[\s-]/g, "_");
  let materialW: number | null = null;
  for (const [key, warmth] of Object.entries(MATERIAL_WARMTH)) {
    if (mat.includes(key)) { materialW = warmth; break; }
  }
  const subCatW: number | null = SUB_CAT_WARMTH[sub] ?? null;

  if (materialW !== null && subCatW !== null) {
    const catWeight = category === "outer" || category === "mid" ? 0.4 : 0.5;
    return Math.round((materialW * (1 - catWeight) + subCatW * catWeight) * 2) / 2;
  }
  if (materialW !== null) return materialW;
  if (subCatW !== null) return subCatW;

  const base = CATEGORY_WARMTH_DEFAULT[category] || 2;
  if (season === "summer") return Math.max(1, base - 0.5);
  if (season === "winter") return Math.min(5, base + 0.5);
  return base;
}

function crossValidateSeasonWarmth(season: string[], warmth: number, category: string): string[] {
  const validated = [...season];
  if (warmth >= 4 && validated.includes("summer")) {
    const idx = validated.indexOf("summer");
    validated.splice(idx, 1);
  }
  if (warmth <= 1.5 && validated.includes("winter") && category !== "accessory" && category !== "bag") {
    const idx = validated.indexOf("winter");
    validated.splice(idx, 1);
  }
  if (warmth >= 4.5 && !validated.includes("winter") && (category === "outer" || category === "mid")) {
    validated.push("winter");
  }
  if (warmth <= 1 && !validated.includes("summer") && category !== "outer" && category !== "mid") {
    validated.push("summer");
  }
  if (validated.length === 0) return season;
  return validated;
}

const VIBE_ITEM_POOLS_ANALYZE: Record<string, Record<string, string[]>> = {
  ELEVATED_COOL: {
    outer: ["oversized wool coat", "structured trench", "leather blazer", "tailored jacket", "technical bomber", "biker jacket", "puffer jacket", "tweed blazer", "wool peacoat"],
    top: ["high-neck knit", "poplin shirt", "silk button-down", "cashmere turtleneck", "oxford shirt", "cable-knit sweater", "crew-neck sweat"],
    bottom: ["wide-leg wool trousers", "cigarette pants", "pleated trousers", "leather pants", "straight-leg jeans", "chinos"],
    shoes: ["square-toe ankle boots", "chunky loafers", "chelsea boots", "derby shoes", "leather sneakers"],
    bag: ["geometric tote", "box bag", "structured clutch", "briefcase", "satchel"],
    accessory: ["silver chain necklace", "metal-frame sunglasses", "leather gloves", "minimalist watch"],
  },
  EFFORTLESS_NATURAL: {
    outer: ["collarless linen coat", "robe coat", "kimono cardigan", "wool blazer", "trench coat", "chore coat", "field jacket"],
    top: ["linen tunic", "gauze blouse", "organic cotton tee", "breton stripe tee", "cashmere crew-neck", "silk blouse", "linen shirt", "waffle henley"],
    bottom: ["wide linen trousers", "drawstring linen pants", "culottes", "straight-leg jeans", "midi skirt"],
    shoes: ["leather slides", "ballet flats", "loafers", "espadrilles", "suede ankle boots", "canvas sneakers"],
    bag: ["natural canvas tote", "woven basket bag", "soft leather tote", "canvas messenger"],
    accessory: ["wooden bead bracelet", "linen headband", "straw hat", "silk scarf", "gold hoops"],
  },
  ARTISTIC_MINIMAL: {
    outer: ["collarless long coat", "cocoon coat", "longline blazer", "wrap coat", "asymmetric jacket", "draped cardigan"],
    top: ["structured tee", "ribbed tank", "mock-neck top", "silk shell", "asymmetric knit", "cowl-neck top", "mohair knit"],
    bottom: ["wide cropped trousers", "pleated wide pants", "maxi pencil skirt", "barrel leg pants", "wrap skirt"],
    shoes: ["square-toe flats", "architectural mules", "derby shoes", "minimal sneakers", "tabi boots"],
    bag: ["geometric tote", "origami bag", "structured clutch", "portfolio bag"],
    accessory: ["sculptural bangle", "bold geometric earrings", "minimalist choker", "oversized sunglasses"],
  },
  RETRO_LUXE: {
    outer: ["suede fringe jacket", "velvet blazer", "crochet cardigan", "tweed blazer", "camel overcoat", "corduroy blazer", "faux fur coat"],
    top: ["peasant blouse", "embroidered tunic", "lace top", "cashmere turtleneck", "cable-knit sweater", "silk blouse", "satin blouse"],
    bottom: ["flared jeans", "maxi boho skirt", "tiered skirt", "wool trousers", "corduroy pants", "velvet trousers"],
    shoes: ["platform sandals", "suede knee boots", "leather loafers", "penny loafers", "riding boots", "kitten heel mules"],
    bag: ["tapestry bag", "fringe suede bag", "wicker bag", "frame bag", "leather satchel"],
    accessory: ["headscarf", "layered necklace", "turquoise jewelry", "pearl earrings", "gold signet ring"],
  },
  SPORT_MODERN: {
    outer: ["gore-tex shell", "technical anorak", "fleece jacket", "insulated parka", "zip-up hoodie", "cropped track jacket", "tactical jacket"],
    top: ["merino base layer", "half-zip fleece", "technical quarter-zip", "performance tee", "sports bra", "fitted tank"],
    bottom: ["hiking pants", "trail shorts", "high-waist leggings", "bike shorts", "wide-leg sweatpants", "cargo trousers", "jogger cargo"],
    shoes: ["trail running shoes", "hiking boots", "retro running shoes", "platform sneakers", "training shoes"],
    bag: ["hiking backpack", "utility sling", "gym tote", "canvas duffel", "chest harness bag"],
    accessory: ["bucket hat", "sports visor", "minimalist watch", "sport headband", "smart watch"],
  },
  CREATIVE_LAYERED: {
    outer: ["oversized flannel shirt", "leather biker jacket", "denim jacket", "velvet blazer", "tapestry coat", "patchwork denim jacket"],
    top: ["band tee", "ripped tee", "mesh top", "graphic tee", "floral print blouse", "lace top", "crochet vest"],
    bottom: ["ripped jeans", "plaid mini skirt", "cargo pants", "baggy jeans", "corduroy wide-leg", "patchwork jeans"],
    shoes: ["combat boots", "chunky platform boots", "mary janes", "vintage loafers", "platform boots", "creepers"],
    bag: ["canvas backpack", "guitar strap bag", "tapestry bag", "studded backpack"],
    accessory: ["choker necklace", "safety pin set", "layered chain necklace", "brooch collection", "chain belt"],
  },
};

function normalizeTextForMatch(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function fuzzyMatchScoreAnalyze(productTerms: string[], itemPool: string[]): number {
  let bestScore = 0;
  const normalizedPool = itemPool.map(normalizeTextForMatch);
  for (const rawTerm of productTerms) {
    const term = normalizeTextForMatch(rawTerm);
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

function computeVibeScores(
  category: string,
  subCategory: string,
  name: string,
  material: string,
  colorFamily: string,
  contextVibe: string
): Record<string, number> {
  const ALL_VIBES = ["ELEVATED_COOL", "EFFORTLESS_NATURAL", "ARTISTIC_MINIMAL", "RETRO_LUXE", "SPORT_MODERN", "CREATIVE_LAYERED"];
  const scores: Record<string, number> = {};
  const slotKey = category === "mid" ? "top" : category;
  const terms: string[] = [];
  if (subCategory) terms.push(subCategory);
  if (name) terms.push(name);
  const matLower = (material || "").toLowerCase();

  for (const vibe of ALL_VIBES) {
    const pool = VIBE_ITEM_POOLS_ANALYZE[vibe];
    if (!pool) { scores[vibe] = 0; continue; }
    const itemPool = pool[slotKey] || pool["top"] || [];
    const affinityScore = terms.length > 0 ? fuzzyMatchScoreAnalyze(terms, itemPool) : 0;

    const dna = VIBE_DNA[vibe];
    let materialBonus = 0;
    if (dna && matLower) {
      for (const pref of dna.material_preferences) {
        if (matLower.includes(pref)) { materialBonus = 10; break; }
      }
    }

    let colorBonus = 0;
    if (dna && colorFamily) {
      const allPaletteColors = [...dna.color_palette.primary, ...dna.color_palette.secondary, ...dna.color_palette.accent];
      if (allPaletteColors.includes(colorFamily)) colorBonus = 8;
    }

    const isContext = vibe === contextVibe ? 10 : 0;
    const rawScore = Math.round(affinityScore * 72 + materialBonus + colorBonus + isContext);
    scores[vibe] = Math.min(100, Math.max(0, rawScore));
  }

  return scores;
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
  const detected = new Set<string>();
  const sub = (subCategory || "").toLowerCase();
  const mat = (material || "").toLowerCase();
  const combined = sub + " " + mat;

  if (/blazer|trench|leather_pant|silk|tailored|structured|tuxedo/.test(combined)) detected.add("ELEVATED_COOL");
  if (/linen|waffle|organic|chambray|chore|canvas_tote|suede_mule|straw/.test(combined)) detected.add("EFFORTLESS_NATURAL");
  if (/asymmetric|drape|cocoon|tabi|cape|mohair|boucle|culottes/.test(combined)) detected.add("ARTISTIC_MINIMAL");
  if (/corduroy|tweed|velvet|suede|crochet|shearling|flared_jeans|platform|saddle/.test(combined)) detected.add("RETRO_LUXE");
  if (/track|jogger|performance|technical|fleece|sports_bra|biker_short/.test(combined)) detected.add("SPORT_MODERN");
  if (/band_tee|combat|ripped|denim_jacket|patchwork/.test(combined)) detected.add("CREATIVE_LAYERED");

  const others = Array.from(detected).filter(v => v !== contextVibe).slice(0, 2);
  return [contextVibe, ...others];
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

    const { product, gender, body_type, vibe, season, batchId, slotHint } = await req.json();

    if (!product || !product.title) {
      return new Response(JSON.stringify({ error: "product.title is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const VALID_CATEGORIES = new Set(["outer", "mid", "top", "bottom", "shoes", "bag", "accessory"]);
    const validatedSlotHint = slotHint && VALID_CATEGORIES.has(slotHint) ? slotHint : null;

    const genderLabel = gender === "MALE" ? "men's" : gender === "FEMALE" ? "women's" : "unisex";
    const slotContext = validatedSlotHint
      ? `\nSearch slot context: this product was found while searching for a "${validatedSlotHint}" item — use this as a strong hint for the category field if the title is ambiguous.`
      : "";

    const VIBE_STYLE_CONTEXT: Record<string, string> = {
      ELEVATED_COOL: "minimal, city-noir, sharp tailoring — blazers, structured coats, wide-leg trousers, leather pieces, clean knits, chelsea boots, geometric bags",
      EFFORTLESS_NATURAL: "organic, relaxed, japandi — linen shirts, wide trousers, soft cardigans, canvas totes, leather slides, natural textures",
      ARTISTIC_MINIMAL: "avant-garde, deconstructed — asymmetric cuts, cocoon shapes, tabi shoes, sculptural accessories, muted tones",
      RETRO_LUXE: "heritage, cinematic, old-money — tweed blazers, flared jeans, velvet pieces, platform shoes, tapestry bags, silk blouses",
      SPORT_MODERN: "technical, functional — track jackets, joggers, performance tops, hiking boots, utility slings, athletic pieces",
      CREATIVE_LAYERED: "eclectic, expressive — band tees, cargo pants, combat boots, ripped denim, layered chains, patchwork pieces",
    };
    const vibeContext = VIBE_STYLE_CONTEXT[vibe] ? `\nTarget style vibe: ${vibe} (${VIBE_STYLE_CONTEXT[vibe]}). Classify sub_category to best match this vibe's aesthetic.` : "";

    const lightPrompt = `Analyze this fashion product and return JSON only. ALL values must be in ENGLISH only.
Product: "${product.title}" | Brand: ${product.brand || "unknown"} | Gender hint: ${genderLabel}${slotContext}${vibeContext}

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

    const normalizedCategory = VALID_CATEGORIES.has(core.category)
      ? core.category
      : (validatedSlotHint || "top");
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
    const rawSeasonArray = inferSeason(materialStr, normalizedCategory, subCat, season);
    const seasonArray = crossValidateSeasonWarmth(rawSeasonArray, warmth, normalizedCategory);
    const vibeScores = computeVibeScores(normalizedCategory, subCat, core.name || product.title, materialStr, normalizedColorFamily, vibe);
    const bodyTypes = [body_type || "regular"];
    if (!bodyTypes.includes("regular") && body_type !== "regular") bodyTypes.push("regular");

    const productLink = product.url || "";
    const extractedAsin = (productLink.match(/\/dp\/([A-Z0-9]{10})/)?.[1]) || null;

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
      vibe_scores: vibeScores,
      stock_status: "in_stock",
      image_url: upgradeImageResolution(product.image || ""),
      product_link: productLink,
      price: product.price != null ? Math.round(product.price) : null,
      batch_id: batchId || null,
      asin: extractedAsin,
    };

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    if (extractedAsin) {
      const { data: existingByAsin } = await adminClient
        .from("products")
        .select("id")
        .eq("asin", extractedAsin)
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
