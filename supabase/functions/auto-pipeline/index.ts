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
    outer: [
      "oversized wool coat", "structured trench", "boxy leather blazer", "double-breasted maxi coat", "cropped tailored jacket",
      "pinstripe blazer", "cashmere wrap coat", "tuxedo jacket", "wool trench", "leather trench", "belted blazer",
      "varsity jacket", "cropped bomber", "wool peacoat", "harrington jacket", "denim jacket", "biker jacket",
      "quilted jacket", "velvet blazer", "shearling aviator", "coach jacket", "windbreaker",
      "puffer vest", "technical bomber", "anorak", "track jacket", "fleece jacket", "oversized parka",
      "nylon trench", "moto jacket",
    ],
    mid: [
      "cashmere turtleneck", "cable-knit sweater", "oxford shirt", "argyle sweater", "v-neck jumper",
      "fine turtleneck", "ribbed mock neck", "wool polo", "cropped knit", "zip-up knit",
      "cable vest", "cricket sweater", "fair isle knit", "oversized cardigan", "thermal henley",
      "half-zip", "waffle knit", "layered hoodie", "mesh long sleeve", "metallic thread knit",
      "sleeveless vest", "deep v-neck knit", "wrap blouse", "structured bustier", "graphic sweater",
      "ringer tee", "mock neck tee", "vintage sweat", "sleeveless hoodie", "cropped polo",
    ],
    top: [
      "high-neck knit", "crisp poplin shirt", "sheer layering top", "silk button-down", "satin blouse",
      "asymmetric drape top", "architectural shirt", "cutout bodysuit", "minimalist tee", "silk camisole",
      "cashmere hoodie", "boxy tee", "mock-neck sweat", "mesh tee", "graphic tee",
      "crewneck", "neoprene top", "longline tee", "crop top", "oversized shirt",
      "band tee", "sports jersey", "distressed sweater", "logo knit", "ribbed body",
      "polo shirt", "rugby shirt", "crest sweatshirt", "striped boat neck", "white shirt",
    ],
    bottom: [
      "wide-leg wool trousers", "tailored bermuda shorts", "leather pants", "pleated trousers", "cigarette pants",
      "high-waisted slacks", "bootcut trousers", "stirrup pants", "straight leg jeans", "satin midi skirt",
      "cargo trousers", "tuxedo pants", "barrel leg pants", "raw hem denim", "pleated shorts",
      "cargo sweats", "parachute pants", "leather joggers", "track pants", "baggy jeans",
      "biker jeans", "chinos", "nylon pants", "ripstop cargos", "stacked denim",
      "pleated mini skirt", "raw denim", "corduroy pants", "wide chinos", "sweatpants",
    ],
    shoes: [
      "square-toe boots", "chunky loafers", "architectural heels", "pointed mules", "ankle boots",
      "chelsea boots", "oxfords", "knee-high boots", "platform loafers", "leather sneakers",
      "derby shoes", "sock boots", "kitten heels", "combat boots", "ballerina flats",
      "high-top sneakers", "dad sneakers", "luxury runners", "retro basketball shoes", "platform boots",
      "foam runners", "tactical boots", "skate shoes", "canvas low-tops", "minimal trainers",
      "loafers with socks", "retro sneakers", "mary janes", "brogues", "desert boots",
    ],
    bag: [
      "geometric tote", "metal clutch", "box bag", "oversized clutch", "doctor bag",
      "baguette", "structured bucket bag", "briefcase", "top handle bag", "envelope clutch",
      "minimal backpack", "belt bag", "chain strap bag", "satchel", "crossbody box",
      "mini leather bag", "sling bag", "cassette bag", "utility crossbody", "chest rig",
      "tech backpack", "phone pouch", "padded tote", "chain bag", "holster bag",
      "canvas tote", "bowling bag", "messenger bag", "nylon backpack", "duffle",
    ],
    accessory: [
      "silver chain necklace", "metal-frame sunglasses", "leather gloves", "wide belt", "sculptural ring",
      "minimalist watch", "silver hoops", "cuff bracelet", "geometric earrings", "choker",
      "ear cuff", "brooch", "chain belt", "pendant necklace", "stacked rings",
      "beanie", "bucket hat", "baseball cap", "shield sunglasses", "headphones",
      "bandana", "industrial belt", "wallet chain", "tech gloves", "smart watch",
      "skinny tie", "knee socks", "glasses chain", "signet ring", "leather bracelet",
    ],
  },
  EFFORTLESS_NATURAL: {
    outer: [
      "collarless liner", "soft blazer", "kimono cardigan", "noragi", "robe coat",
      "chore coat", "linen jacket", "quilted vest", "oversized cardigan", "wrap coat",
      "haori jacket", "linen duster", "cocoon coat", "boiled wool jacket", "blanket coat",
      "trench coat", "wool blazer", "boucle jacket", "peacoat", "denim jacket",
      "tweed jacket", "camel coat", "shearling coat", "corduroy jacket", "rain mac",
      "field jacket", "barn jacket", "duffle coat", "flannel shirt-jacket", "waxed jacket",
    ],
    mid: [
      "cashmere crew-neck", "waffle henley", "cardigan", "fine turtleneck", "v-neck sweater",
      "boat neck knit", "ribbed knit", "cropped cardigan", "cable sweater", "fair isle knit",
      "heavy cardigan", "shawl collar cardigan", "knitted vest", "thermal henley", "wrap top",
      "half-zip", "chambray shirt", "flannel shirt", "grandad shirt", "denim shirt",
      "wool shirt", "knit tank", "cashmere sweater", "dolman sleeve top", "raglan tee",
      "silk cami", "pointelle knit", "sleeveless tunic", "soft cotton shirt", "boxy knit",
    ],
    top: [
      "linen tunic", "waffle henley", "organic tee", "wrap top", "linen shirt",
      "gauze blouse", "raw silk top", "drop-shoulder tee", "breton stripe tee", "cashmere crew",
      "silk blouse", "boat neck", "chambray shirt", "flannel shirt", "oversized tee",
      "pocket tee", "baseball tee", "vintage tee", "ringer tee", "logger shirt",
      "poplin top", "puff sleeve blouse", "square neck top", "graphic tee", "tie-front shirt",
      "polka dot top", "gingham shirt", "white tee", "button-down", "camisole",
    ],
    bottom: [
      "wide linen trousers", "drawstring pants", "maxi skirt", "culottes", "balloon pants",
      "midi skirt", "relaxed trousers", "wrap pants", "gauze pants", "harem pants",
      "vintage denim", "white jeans", "corduroy pants", "cigarette pants", "cropped flare",
      "straight leg jeans", "wide leg jeans", "linen trousers", "bermuda shorts", "slip skirt",
      "fatigue pants", "wide chinos", "carpenter jeans", "corduroy trousers", "raw denim",
      "cargo skirt", "painter pants", "overalls", "button fly jeans", "canvas pants",
    ],
    shoes: [
      "suede mules", "leather slides", "tabi flats", "babouche", "canvas sneakers",
      "leather sandals", "clogs", "soft loafers", "espadrilles", "woven flats",
      "ballet flats", "moccasins", "knit sneakers", "mary janes", "suede booties",
      "desert boots", "work boots", "deck shoes", "wallabees", "hiking boots",
      "rain boots", "duck boots", "engineer boots", "gum sole sneakers", "trail runners",
      "chelsea boots", "canvas high-tops", "service boots", "garden boots", "felt shoes",
    ],
    bag: [
      "soft hobo", "canvas bucket", "knot bag", "net bag", "market tote",
      "linen shopper", "woven bag", "drawstring pouch", "straw bag", "basket bag",
      "cotton tote", "crochet bag", "bamboo handle bag", "leather sack", "furoshiki bag",
      "straw basket", "canvas tote", "leather shoulder bag", "baguette", "bucket bag",
      "saddle bag", "crossbody", "wicker bag", "messenger", "nylon bag",
      "helmet bag", "backpack", "tool bag", "satchel", "duffle",
    ],
    accessory: [
      "ceramic jewelry", "cotton scarf", "bucket hat", "wooden beads", "linen hair tie",
      "silver bangle", "round glasses", "leather cord", "wooden bangle", "pearl studs",
      "canvas belt", "straw hat", "silk scrunchie", "anklet", "pendant",
      "silk scarf", "gold hoops", "beret", "thin belt", "cat-eye glasses",
      "gold necklace", "hair clip", "watch", "pearl necklace", "headband",
      "beanie", "bandana", "thick belt", "vintage cap", "tortoiseshell glasses",
    ],
  },
  ARTISTIC_MINIMAL: {
    outer: [
      "collarless coat", "kimono jacket", "longline blazer", "stand-collar jacket", "cocoon coat",
      "structured vest", "cape coat", "asymmetric jacket", "minimal trench", "wrap jacket",
      "architectural blazer", "neoprene coat", "sleeveless coat", "linen duster", "funnel neck coat",
      "boucle coat", "crushed velvet jacket", "faux fur vest", "shaggy jacket", "patent coat",
      "shearling jacket", "mohair cardigan", "jacquard coat", "silk bomber", "organza coat",
      "cape", "draped cardigan", "shawl coat", "blanket coat", "fluid trench",
    ],
    mid: [
      "ribbed tank", "mock-neck top", "turtleneck", "fine mock neck", "cashmere layer",
      "structured tank", "funnel neck", "longline vest", "raw edge top", "panelled shirt",
      "sheer mesh top", "mohair knit", "crushed satin", "organza blouse", "velvet top",
      "angora sweater", "metallic knit", "boucle knit", "silk cami", "pleated top",
      "cowl neck", "asymmetric knit", "draped jersey", "bias blouse", "wrap top",
      "oversized knit", "sheer overlay", "twist top", "waterfall top", "batwing sleeve",
    ],
    top: [
      "tunic shirt", "asymmetric knit", "stiff mock neck", "pleated top", "oversized shirt",
      "poplin tunic", "boxy blouse", "high-neck shell", "drape top", "cowl neck",
      "crisp tee", "structured tank", "geometric top", "cut-out top", "mesh top",
      "sheer mesh top", "mohair knit", "ribbed tank", "fringe top", "velvet top",
      "lace bodysuit", "metallic knit", "burnout tee", "crochet top", "embroidered shirt",
      "cowl neck", "uneven hem shirt", "layered tunic", "ruched top", "draped jersey",
    ],
    bottom: [
      "culottes", "wide cropped trousers", "pleated skirt", "barrel pants", "hakama",
      "balloon skirt", "wide slacks", "tapered ankle pants", "asymmetric skirt", "structured shorts",
      "wrap pants", "cigarette pants", "voluminous skirt", "pleated trousers", "midi skirt",
      "satin pants", "leather skirt", "metallic pants", "sequin skirt", "corduroy pants",
      "silk trousers", "faux fur skirt", "jacquard pants", "suede skirt", "tulle skirt",
      "balloon pants", "sarouel pants", "wrapped skirt", "dhoti pants", "jersey pants",
    ],
    shoes: [
      "tabi boots", "architectural mules", "derby", "square flats", "platform sandals",
      "sock boots", "minimal sneakers", "oxfords", "geometric heels", "glove shoes",
      "loafer mules", "platform boots", "sculptural heels", "monk straps", "chelsea boots",
      "velvet slippers", "patent loafers", "metallic boots", "satin mules", "embellished flats",
      "textured pumps", "shearling boots", "clear heels", "suede pumps", "pearl heels",
      "leather sandals", "soft boots", "flat mules", "gladiator sandals", "soft flats",
    ],
    bag: [
      "pleated tote", "geometric bag", "oversized clutch", "wristlet", "architectural bag",
      "box bag", "portfolio", "minimal shopper", "circle bag", "origami bag",
      "triangle bag", "frame bag", "cylinder bag", "structured tote", "envelope bag",
      "fur bag", "wrinkled pouch", "metallic bag", "beaded bag", "velvet clutch",
      "chain mail bag", "patent tote", "embossed bag", "mesh tote", "suede bag",
      "slouchy sack", "knot bag", "drawstring pouch", "soft tote", "hobo bag",
    ],
    accessory: [
      "sculptural bangle", "bold eyewear", "single earring", "cuff", "geometric necklace",
      "brooch", "matte ring", "glasses chain", "wide headband", "minimal belt",
      "silver choker", "ear cuff", "knuckle ring", "statement earrings", "hair stick",
      "pearl necklace", "velvet choker", "crystal earrings", "textured ring", "hair bow",
      "metallic belt", "layered chains", "rhinestone choker", "velvet headband", "chain belt",
      "long necklace", "layered bangles", "scarf", "head wrap", "pendant",
    ],
  },
  RETRO_LUXE: {
    outer: [
      "shearling coat", "velvet blazer", "cape", "embroidered vest", "afghan coat",
      "tapestry jacket", "fur-trim coat", "quilted jacket", "suede coat", "brocade coat",
      "suede jacket", "shearling coat", "faux fur", "leather trench", "safari jacket",
      "patchwork jacket", "corduroy blazer", "poncho", "crochet cardigan", "fringe vest",
      "tweed jacket", "quilted jacket", "camel coat", "gold button blazer", "cable cardigan",
      "barbour jacket", "navy blazer", "cashmere coat", "polo coat", "harrington",
    ],
    mid: [
      "cable-knit sweater", "cashmere turtleneck", "crochet vest", "argyle vest", "twin-set",
      "v-neck sweater", "ribbed knit", "embroidered corset", "knit bodice", "velvet bodice",
      "cricket jumper", "cable sweater", "cashmere turtle", "collared knit", "sleeveless knit",
      "fair isle knit", "heavy cardigan", "shawl collar cardigan", "folk cardigan", "corset top",
      "cardigan", "mock neck", "wrap top", "tie-neck blouse", "shell top",
      "peasant blouse", "lace top", "crochet vest", "smocked top", "puff sleeve top",
    ],
    top: [
      "embroidered blouse", "lace top", "peasant blouse", "smocked top", "floral shirt",
      "corset top", "ruffled blouse", "balloon sleeve", "high neck blouse", "broderie top",
      "printed shirt", "turtleneck", "halter top", "ringer tee", "pussy-bow blouse",
      "western shirt", "tunic", "disco top", "satin shirt", "bell sleeve top",
      "cable sweater", "pussy-bow blouse", "polo shirt", "white shirt", "silk blouse",
      "oxford shirt", "button-down", "striped shirt", "boat neck top", "linen shirt",
    ],
    bottom: [
      "wool maxi skirt", "velvet trousers", "corduroy pants", "embroidered jeans", "tiered skirt",
      "paisley skirt", "floral maxi", "tapestry skirt", "dark denim", "brocade pants",
      "flared jeans", "corduroy skirt", "bell-bottoms", "suede skirt", "patchwork jeans",
      "gaucho pants", "maxi skirt", "wide leg jeans", "velvet pants", "printed skirt",
      "white jeans", "riding pants", "wool skirt", "chinos", "tailored shorts",
      "wool trousers", "straight jeans", "tennis skirt", "cigarette pants", "plaid skirt",
    ],
    shoes: [
      "lace-up boots", "mary janes", "clogs", "embroidered slippers", "velvet boots",
      "western boots", "platform sandals", "kitten heels", "brocade pumps", "suede boots",
      "granny boots", "velvet flats", "mules", "tassel boots", "victorian boots",
      "platform boots", "suede boots", "clogs", "knee boots", "wedge sandals",
      "platform sneakers", "moccasins", "loafers", "strappy sandals", "wooden heels",
      "riding boots", "horsebit loafers", "ballet flats", "driving shoes", "penny loafers",
    ],
    bag: [
      "tapestry bag", "frame bag", "beaded pouch", "velvet bag", "embroidered clutch",
      "fringe bag", "basket", "coin purse", "vintage handbag", "carpet bag",
      "brocade bag", "tassel bag", "patchwork bag", "saddle bag", "bucket bag",
      "saddle bag", "suede hobo", "fringe bag", "macrame bag", "canvas messenger",
      "leather tote", "woven bag", "crochet bag", "camera bag", "satchel",
      "structured handbag", "canvas tote", "box bag", "vanity case", "monogram bag",
    ],
    accessory: [
      "headscarf", "pearl earrings", "beads", "floral headband", "cameo",
      "gold hoops", "statement belt", "corset belt", "ribbons", "hair flowers",
      "brooch", "choker", "layered necklaces", "dangle earrings", "velvet ribbon",
      "tinted sunglasses", "wide brim hat", "silk scarf", "turquoise", "leather belt",
      "hoop earrings", "bangles", "feather earring", "headband", "bandana",
      "pearl necklace", "headscarf", "leather belt", "watch", "stud earrings",
    ],
  },
  SPORT_MODERN: {
    outer: [
      "3-layer shell", "tech trench", "windbreaker", "utility vest", "anorak",
      "rain poncho", "puffer", "fleece", "tactical vest", "convertible jacket",
      "softshell", "parka", "down jacket", "mountain parka", "gilet",
      "cropped puffer", "track jacket", "hoodie", "bolero", "zip fleece",
      "bomber", "wrap cardigan", "yoga jacket", "running jacket", "teddy jacket",
      "track jacket", "coach jacket", "stadium parka", "varsity bomber", "training jacket",
    ],
    mid: [
      "half-zip fleece", "technical quarter-zip", "ribbed crop tee", "compression top", "zip polo",
      "grid fleece", "sun hoodie", "baselayer", "sports bra", "seamless top",
      "racerback", "wrap top", "mesh top", "crop top", "yoga top",
      "half-zip", "sweatshirt", "bralette", "corset top", "thermal",
      "warm-up top", "drill top", "hoodie", "knitted polo", "mesh top",
      "zip neck", "long sleeve jersey", "crewneck", "v-neck jersey", "collared shirt",
    ],
    top: [
      "merino base layer", "tech-fleece", "performance tee", "mesh layer", "compression top",
      "mock neck", "zip polo", "graphic tee", "thermal top", "running shirt",
      "seamless top", "tank top", "jersey", "sun hoodie", "vented shirt",
      "sports bra", "bodysuit", "off-shoulder sweat", "hoodie", "racerback",
      "muscle tank", "yoga top", "long sleeve tee", "ribbed top", "half-zip",
      "soccer jersey", "ringer tee", "polo", "rugby shirt", "training top",
    ],
    bottom: [
      "cargo pants", "waterproof trousers", "convertible pants", "parachute pants", "hiking shorts",
      "joggers", "nylon pants", "climbing pants", "wind pants", "leggings",
      "tech shorts", "softshell pants", "utility pants", "baggy shorts", "articulated pants",
      "biker shorts", "split-hem leggings", "yoga pants", "track pants", "running shorts",
      "flare leggings", "sweatshorts", "tennis skirt", "cycling shorts", "cargo joggers",
      "track pants", "jorts", "nylon shorts", "jeans", "warm-up pants",
    ],
    shoes: [
      "gore-tex sneakers", "trail runners", "trekking boots", "chunky sneakers", "waterproof boots",
      "approach shoes", "hiking boots", "running shoes", "recovery slides", "tech boots",
      "sock shoes", "mountain boots", "trail sandals", "winter boots", "hybrid shoes",
      "slides", "sock sneakers", "platform sneakers", "training shoes", "high-tops",
      "casual runners", "white sneakers", "fashion trainers", "chunky soles", "retro runners",
      "terrace sneakers", "retro runners", "indoor soccer shoes", "canvas sneakers", "gum soles",
    ],
    bag: [
      "sacoche", "backpack", "chest rig", "waist bag", "dry bag",
      "sling", "hydration pack", "utility pouch", "carabiner bag", "duffle",
      "roll-top bag", "messenger", "hip pack", "camera bag", "phone holder",
      "gym bag", "belt bag", "bottle bag", "crossbody", "running vest",
      "tote", "mini backpack", "yoga bag", "sackpack", "wristlet",
      "crossbody", "duffle", "drawstring bag", "shoebox bag", "messenger",
    ],
    accessory: [
      "bucket hat", "sunglasses", "carabiner", "gaiter", "gloves",
      "beanie", "watch", "utility belt", "cap", "headband",
      "socks", "lanyard", "bandana", "visor", "ear muffs",
      "neck warmer", "gps watch", "sweatband", "cap", "headphones",
      "scrunchie", "towel", "hair clip", "fitness tracker", "necklace",
      "scarf", "wristband", "chain", "rings", "earring",
    ],
  },
  CREATIVE_LAYERED: {
    outer: [
      "leather biker", "denim jacket", "vinyl trench", "cropped hoodie", "leopard coat",
      "studs jacket", "blazer", "flannel shirt", "faux fur coat", "bomber",
      "military jacket", "parka", "shearling", "varsity", "bolero",
      "fleece", "windbreaker", "patchwork jacket", "cardigan", "kimono",
      "tapestry coat", "striped jacket", "poncho", "cape", "shawl",
      "field jacket", "fur coat", "embroidered jacket", "suede jacket", "velvet blazer",
    ],
    mid: [
      "crochet vest", "denim jacket", "flannel shirt", "corset", "lace blouse",
      "sweater", "mesh bodysuit", "fishnet top", "bustier", "hoodie",
      "knit", "floral shirt", "polka dot blouse", "tie-dye", "argyle vest",
      "animal print", "geometric shirt", "hawaiian shirt", "graphic tee", "vintage tee",
      "lace blouse", "crochet top", "vest", "slip dress", "thermal",
      "cardigan", "corset", "bodice", "peasant top", "smock",
    ],
    top: [
      "band tee", "lace blouse", "corset", "mesh bodysuit", "fishnet top",
      "slogan tee", "tank", "slip top", "bustier", "graphic tee",
      "crop top", "vintage tee", "muscle tank", "ripped tee", "tube top",
      "knit", "floral shirt", "polka dot blouse", "tie-dye", "striped shirt",
      "animal print", "hawaiian shirt", "off-shoulder", "bralette", "sheer top",
      "lace blouse", "crochet top", "thermal", "peasant top", "smock top",
    ],
    bottom: [
      "tulle skirt", "ripped jeans", "cargo mini", "plaid skirt", "leather pants",
      "vinyl skirt", "denim", "skinny jeans", "parachute pants", "leggings",
      "cargo pants", "mini skirt", "maxi skirt", "wide leg jeans", "flare jeans",
      "checkered pants", "striped skirt", "colored denim", "patchwork jeans", "floral skirt",
      "plaid trousers", "animal skirt", "chinos", "print pants", "overalls",
      "velvet skirt", "corduroy pants", "suspender skirt", "tiered skirt", "culottes",
    ],
    shoes: [
      "combat boots", "loafers", "mary janes", "creepers", "platform boots",
      "high-tops", "studded boots", "buckle shoes", "moto boots", "sneakers",
      "platforms", "wedges", "clogs", "mules", "chelsea boots",
      "winklepickers", "knee boots", "thigh boots", "ankle boots", "skate shoes",
      "sneakers", "cowboy boots", "platforms", "printed boots", "socks with sandals",
      "jellies", "espadrilles", "moccasins", "oxfords", "brogues",
    ],
    bag: [
      "backpack", "chain bag", "heart bag", "studded bag", "guitar strap bag",
      "pouch", "tote", "velvet bag", "box clutch", "safety pin bag",
      "crossbody", "messenger", "satchel", "duffle", "bucket bag",
      "beaded bag", "patchwork bag", "novelty bag", "woven bag", "fringe bag",
      "neon bag", "sequin bag", "shoulder bag", "mini bag", "phone bag",
      "tapestry bag", "frame bag", "doctor bag", "needlepoint bag", "basket",
    ],
    accessory: [
      "choker", "necklaces", "safety pins", "tights", "gloves",
      "lock necklace", "rings", "nose ring", "cuff", "sunglasses",
      "belt", "chain", "wristband", "earrings", "studs",
      "earrings", "beads", "scarf", "clips", "bandana",
      "glasses", "headband", "turban", "pin", "patch",
      "brooch", "chain", "beret", "collar", "locket",
    ],
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
  if (families.length < 2) return 20;

  let pairHarmony = 0, pairCount = 0;
  for (let i = 0; i < families.length; i++) {
    for (let j = i + 1; j < families.length; j++) {
      pairHarmony += getColorHarmonyScore(families[i], families[j]);
      pairCount++;
    }
  }
  let score = pairCount > 0 ? pairHarmony / pairCount : 20;

  const blackCount = families.filter(f => f === "black").length;
  if (blackCount >= 4) score -= 15;
  if (blackCount >= 3) score -= 8;

  const accents = families.filter(f => !isNeutralColor(f));
  if (new Set(accents).size > 2) score -= 12;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreFormalityCoherence(items: Record<string, any>): number {
  const all = Object.values(items).filter(Boolean);
  if (all.length < 3) return 20;

  const formalities = all.map(getFormality);
  const styles = all.map(inferStyle);
  let score = 70;

  const fRange = Math.max(...formalities) - Math.min(...formalities);
  if (fRange <= 1) score += 20;
  else if (fRange <= 2) score += 10;
  else if (fRange <= 3) score += 0;
  else if (fRange <= 4) score -= 20;
  else if (fRange <= 5) score -= 35;
  else score -= 50;

  let compatSum = 0, compatCount = 0;
  for (let i = 0; i < styles.length; i++) {
    for (let j = i + 1; j < styles.length; j++) {
      compatSum += STYLE_COMPAT[styles[i]]?.[styles[j]] ?? 0.5;
      compatCount++;
    }
  }
  const avgCompat = compatCount > 0 ? compatSum / compatCount : 0.5;
  score += (avgCompat - 0.5) * 50;

  const coreStyles = ["top", "bottom", "shoes"]
    .map(k => items[k]).filter(Boolean).map(inferStyle);
  if (coreStyles.includes("formal") && coreStyles.includes("sporty")) score -= 25;
  if (coreStyles.includes("formal") && coreStyles.includes("casual")) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreMaterialCompat(items: Record<string, any>): number {
  const coreKeys = ["outer", "mid", "top", "bottom", "shoes"];
  const coreItems = coreKeys.map(k => items[k]).filter(Boolean);
  if (coreItems.length < 2) return 20;

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

function getLookAffinityScore(product: any, vibe: string, lookKey: string): number {
  if (product.look_affinity?.[vibe]?.[lookKey] !== undefined) {
    return product.look_affinity[vibe][lookKey] / 100;
  }
  const category = product.category as string;
  const slotKey = category === "mid" ? "top" : category;
  const pool = VIBE_ITEM_POOLS[vibe];
  if (!pool) return 0;
  const itemPool = pool[slotKey];
  if (!itemPool?.length) return 0;
  const terms: string[] = [];
  if (product.sub_category) terms.push(product.sub_category);
  if (product.name) terms.push(product.name);
  if (!terms.length) return 0;
  return fuzzyMatchScore(terms, itemPool);
}

function scoreVibeMatch(items: Record<string, any>, vibe: string, lookKey?: string): number {
  const all = Object.values(items).filter(Boolean);
  if (all.length === 0) return 15;

  let totalAffinity = 0;
  for (const p of all) {
    const affinity = getVibeItemAffinity(p, vibe);
    const isVibeFirst = Array.isArray(p.vibe) && p.vibe[0] === vibe;
    const isVibeSecondary = Array.isArray(p.vibe) && p.vibe.includes(vibe);
    if (affinity >= 0.8) totalAffinity += isVibeFirst ? 1.0 : 0.9;
    else if (affinity >= 0.5) totalAffinity += isVibeFirst ? 0.85 : 0.7;
    else if (affinity >= 0.3) totalAffinity += isVibeFirst ? 0.65 : 0.5;
    else if (isVibeFirst) totalAffinity += 0.55;
    else if (isVibeSecondary) totalAffinity += 0.3;
    else totalAffinity += 0.05;
  }
  let avgAffinity = totalAffinity / all.length;

  if (lookKey) {
    const coreKeys = ["outer", "mid", "top", "bottom", "shoes"];
    const coreItems = coreKeys.map(k => items[k]).filter(Boolean);
    if (coreItems.length >= 2) {
      const lookScores = coreItems.map((p: any) => getLookAffinityScore(p, vibe, lookKey));
      const avgLookScore = lookScores.reduce((s: number, a: number) => s + a, 0) / lookScores.length;
      const lookHighCount = lookScores.filter((s: number) => s >= 0.5).length;
      avgAffinity += avgLookScore * 0.15;
      if (lookHighCount >= coreItems.length * 0.6) avgAffinity += 0.05;
    }
  }

  return Math.max(0, Math.min(100, Math.round(avgAffinity * 100)));
}

function scoreSeasonFit(items: Record<string, any>, season: string): number {
  if (!season) return 30;
  const coreKeys = ["outer", "mid", "top", "bottom", "shoes"];
  const coreItems = coreKeys.map(k => items[k]).filter(Boolean);
  if (coreItems.length < 2) return 20;

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
  if (warmths.length < 2 || !season) return 20;

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
  if (colors.length < 3) return 20;

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
  if (!top || !bottom) return 20;

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

  if (patterns.length < 2) return 40;

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

  if (coreFamilies.length === 0) return 30;

  const accItems = ["bag", "accessory"].map(k => items[k]).filter(Boolean);
  if (accItems.length === 0) return 50;

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

  if (count === 0) return 40;
  return Math.max(0, Math.min(100, Math.round(totalHarmony / count)));
}

const SCORE_WEIGHTS = {
  tonalHarmony: 0.18,
  formalityCoherence: 0.12,
  materialCompat: 0.09,
  vibeMatch: 0.18,
  seasonFit: 0.12,
  warmthFit: 0.10,
  colorDepth: 0.07,
  proportionBalance: 0.07,
  patternBalance: 0.05,
  accessoryHarmony: 0.02,
};

const SEASONAL_SLOT_CONFIG: Record<string, { required: string[]; excluded: string[]; optional: string[] }> = {
  spring: { required: ["top", "bottom", "shoes"], excluded: ["mid"], optional: ["outer", "bag", "accessory"] },
  summer: { required: ["top", "bottom", "shoes"], excluded: ["outer", "mid"], optional: ["bag", "accessory"] },
  fall:   { required: ["top", "bottom", "shoes"], excluded: ["mid"], optional: ["outer", "bag", "accessory"] },
  winter: { required: ["top", "bottom", "shoes", "outer", "mid"], excluded: [], optional: ["bag", "accessory"] },
};

const MID_TOP_COMPAT: Record<string, { good: string[]; bad: string[] }> = {
  cardigan:         { good: ["turtleneck", "shirt", "blouse", "t_shirt", "tshirt", "tee", "oxford_shirt", "button_down_shirt"], bad: ["hoodie", "sweatshirt"] },
  knit_vest:        { good: ["turtleneck", "shirt", "blouse", "t_shirt", "tshirt", "oxford_shirt"], bad: ["hoodie", "sweatshirt"] },
  knitted_vest:     { good: ["turtleneck", "shirt", "blouse", "t_shirt", "tshirt", "oxford_shirt"], bad: ["hoodie", "sweatshirt"] },
  half_zip:         { good: ["t_shirt", "tshirt", "tee", "shirt", "graphic_tee"], bad: ["turtleneck", "turtleneck_knit"] },
  sweater:          { good: ["t_shirt", "tshirt", "tee", "shirt", "graphic_tee"], bad: ["turtleneck", "hoodie"] },
  cable_knit:       { good: ["t_shirt", "tshirt", "tee", "shirt"], bad: ["turtleneck", "hoodie", "sweatshirt"] },
  cashmere_sweater: { good: ["t_shirt", "tshirt", "tee", "shirt", "blouse"], bad: ["turtleneck", "hoodie"] },
  hoodie:           { good: ["t_shirt", "tshirt", "tee", "graphic_tee"], bad: ["hoodie", "sweatshirt", "turtleneck"] },
  turtleneck_knit:  { good: ["shirt", "blouse", "t_shirt"], bad: ["turtleneck", "mock_neck"] },
  mock_neck:        { good: ["shirt", "blouse", "t_shirt", "tshirt"], bad: ["turtleneck", "turtleneck_knit", "mock_neck"] },
  sweatshirt:       { good: ["t_shirt", "tshirt", "tee"], bad: ["hoodie", "sweatshirt"] },
};

const VIBE_COLOR_PALETTES: Record<string, { primary: string[]; secondary: string[]; accent: string[] }> = {
  ELEVATED_COOL:     { primary: ["black", "charcoal", "navy", "white"], secondary: ["grey", "cream", "camel"], accent: ["burgundy", "metallic", "wine"] },
  EFFORTLESS_NATURAL:{ primary: ["beige", "cream", "ivory", "white"], secondary: ["olive", "khaki", "tan", "sage", "brown"], accent: ["rust", "mustard", "burgundy"] },
  ARTISTIC_MINIMAL:  { primary: ["black", "white", "grey", "charcoal"], secondary: ["cream", "beige", "navy"], accent: ["rust", "olive", "burgundy"] },
  RETRO_LUXE:        { primary: ["burgundy", "navy", "brown", "cream"], secondary: ["camel", "olive", "wine", "beige"], accent: ["rust", "mustard", "teal", "gold"] },
  SPORT_MODERN:      { primary: ["black", "grey", "white", "navy"], secondary: ["olive", "khaki", "charcoal"], accent: ["orange", "teal", "red", "green"] },
  CREATIVE_LAYERED:  { primary: ["black", "grey", "white", "denim"], secondary: ["burgundy", "brown", "olive", "navy"], accent: ["red", "orange", "pink", "yellow"] },
};

const WARMTH_BUDGET: Record<string, { min: number; max: number }> = {
  spring: { min: 9, max: 16 },
  summer: { min: 5, max: 11 },
  fall:   { min: 12, max: 20 },
  winter: { min: 16, max: 25 },
};

interface DnaLabRules {
  color_palette?: { dominant_colors?: string[]; primary_strategy?: string };
  material_combo?: { primary_materials?: string[] };
  silhouette?: { preferred?: string[] };
  formality?: { average?: number; range?: [number, number] };
}

function applyDnaBonus(items: Record<string, any>, dna: DnaLabRules | null): number {
  if (!dna) return 0;
  let bonus = 0;
  const all = Object.values(items).filter(Boolean);

  if (dna.color_palette?.dominant_colors?.length) {
    const learned = dna.color_palette.dominant_colors.map((c: string) => c.toLowerCase());
    const itemColors = all.map((p: any) => resolveColorFamily(p.color || "", p.color_family).toLowerCase()).filter(Boolean);
    const matches = itemColors.filter((c: string) => learned.includes(c)).length;
    const matchRatio = matches / Math.max(1, itemColors.length);
    bonus += Math.min(12, matchRatio * 15);
    if (matchRatio >= 0.7) bonus += 3;
  }

  if (dna.color_palette?.primary_strategy) {
    const strategy = dna.color_palette.primary_strategy.toLowerCase();
    const itemColors = all.map((p: any) => resolveColorFamily(p.color || "", p.color_family)).filter(Boolean);
    const neutralCount = itemColors.filter((c: string) => isNeutralColor(c)).length;
    const neutralRatio = neutralCount / Math.max(1, itemColors.length);
    if (strategy.includes("neutral") && neutralRatio >= 0.6) bonus += 4;
    if (strategy.includes("monochrome")) {
      const unique = new Set(itemColors);
      if (unique.size <= 2) bonus += 4;
    }
    if (strategy.includes("earth") || strategy.includes("warm")) {
      const earthColors = new Set(["brown", "tan", "camel", "olive", "khaki", "sage", "rust", "mustard", "burgundy", "wine"]);
      const earthCount = itemColors.filter((c: string) => earthColors.has(c)).length;
      if (earthCount >= 2) bonus += 3;
    }
  }

  if (dna.material_combo?.primary_materials?.length) {
    const learned = dna.material_combo.primary_materials.map((m: string) => m.toLowerCase());
    const itemMats = all.map((p: any) => (p.material || "").toLowerCase()).filter(Boolean);
    const matches = itemMats.filter((m: string) => learned.some((l: string) => m.includes(l))).length;
    const matchRatio = matches / Math.max(1, itemMats.length);
    bonus += Math.min(10, matchRatio * 12);
    if (matchRatio >= 0.6) bonus += 3;
  }

  if (dna.silhouette?.preferred?.length) {
    const preferred = dna.silhouette.preferred.map((s: string) => s.toLowerCase());
    const itemSils = all.map((p: any) => (p.silhouette || "").toLowerCase()).filter(Boolean);
    const matches = itemSils.filter((s: string) => preferred.some((pref: string) => s.includes(pref) || pref.includes(s))).length;
    bonus += Math.min(6, (matches / Math.max(1, itemSils.length)) * 8);
  }

  if (dna.formality?.average) {
    const formalities = all.map(getFormality);
    const avg = formalities.reduce((a: number, b: number) => a + b, 0) / Math.max(1, formalities.length);
    const diff = Math.abs(avg - dna.formality.average);
    if (diff <= 0.5) bonus += 6;
    else if (diff <= 1) bonus += 4;
    else if (diff <= 2) bonus += 2;
    else bonus -= 3;

    if (dna.formality.range) {
      const [lo, hi] = dna.formality.range;
      const outOfRange = formalities.filter((f: number) => f < lo || f > hi).length;
      if (outOfRange > 0) bonus -= outOfRange * 2;
    }
  }

  return bonus;
}

function scoreComposition(items: Record<string, any>, vibe: string, season: string, dnaRules?: DnaLabRules | null, lookKey?: string): {
  total: number;
  breakdown: Record<string, number>;
} {
  const breakdown = {
    tonalHarmony: scoreTonalHarmony(items),
    formalityCoherence: scoreFormalityCoherence(items),
    materialCompat: scoreMaterialCompat(items),
    vibeMatch: scoreVibeMatch(items, vibe, lookKey),
    seasonFit: scoreSeasonFit(items, season),
    warmthFit: scoreWarmthFit(items, season),
    colorDepth: scoreColorDepth(items),
    proportionBalance: scoreProportionBalance(items),
    patternBalance: scorePatternBalance(items),
    accessoryHarmony: scoreAccessoryHarmony(items),
  };

  let total = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    total += (breakdown[key as keyof typeof breakdown] || 0) * weight;
  }

  total += applyDnaBonus(items, dnaRules || null);

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
    if (getColorHarmonyScore(cf, existing) < 40) return false;
  }
  return true;
}

function isSeasonAppropriateOuter(product: any, season: string): boolean {
  const warmth = typeof product.warmth === "number" ? product.warmth : 3;
  const sub = (product.sub_category || "").toLowerCase();
  if (season === "summer") return false;
  if (season === "winter" && warmth < 3) return false;
  if (season === "spring") {
    if (warmth > 3.5) return false;
    if (/parka|puffer|duffle|shearling|sherpa|heavy.?wool|down/.test(sub)) return false;
  }
  if (season === "fall" && warmth < 2) return false;
  return true;
}

interface ScoredOutfit {
  items: Record<string, any>;
  score: number;
  breakdown: Record<string, number>;
  lookKey?: string;
}

function isColorInPalette(colorFamily: string, vibe: string): boolean {
  const palette = VIBE_COLOR_PALETTES[vibe];
  if (!palette) return true;
  const allColors = [...palette.primary, ...palette.secondary, ...palette.accent];
  if (allColors.includes(colorFamily)) return true;
  if (isNeutralColor(colorFamily)) return true;
  return false;
}

function paletteHarmonyScore(colorFamily: string, vibe: string): number {
  const palette = VIBE_COLOR_PALETTES[vibe];
  if (!palette) return 70;
  if (palette.primary.includes(colorFamily)) return 100;
  if (palette.secondary.includes(colorFamily)) return 85;
  if (palette.accent.includes(colorFamily)) return 70;
  if (isNeutralColor(colorFamily)) return 75;
  return 40;
}

function checkMidTopCompat(midSub: string, topSub: string): { ok: boolean; bonus: number } {
  const midKey = (midSub || "").toLowerCase().replace(/[\s-]/g, "_");
  const topKey = (topSub || "").toLowerCase().replace(/[\s-]/g, "_");
  const compat = MID_TOP_COMPAT[midKey];
  if (!compat) return { ok: true, bonus: 0 };
  if (compat.bad.some(b => topKey.includes(b) || b.includes(topKey))) return { ok: false, bonus: -20 };
  if (compat.good.some(g => topKey.includes(g) || g.includes(topKey))) return { ok: true, bonus: 10 };
  return { ok: true, bonus: 0 };
}

function checkWarmthBudget(items: Record<string, any>, season: string): boolean {
  const budget = WARMTH_BUDGET[season];
  if (!budget) return true;
  const slotKeys = Object.keys(items);
  let totalWarmth = 0;
  for (const key of slotKeys) {
    const p = items[key];
    if (!p) continue;
    if (key === "bag" || key === "accessory") continue;
    totalWarmth += typeof p.warmth === "number" ? p.warmth : 2.5;
  }
  return totalWarmth >= budget.min && totalWarmth <= budget.max;
}

function filterByVibeScore(products: any[], vibe: string, minScore: number, isCore: boolean): any[] {
  return products.filter((p: any) => {
    const scores = p.vibe_scores;
    if (scores && typeof scores === "object" && typeof scores[vibe] === "number") {
      return scores[vibe] >= minScore;
    }
    const vibeArr = Array.isArray(p.vibe) ? p.vibe : [];
    if (isCore) return vibeArr[0] === vibe;
    return vibeArr.includes(vibe);
  });
}

function filterByPalette(products: any[], vibe: string): any[] {
  return products.filter((p: any) => {
    const cf = resolveColorFamily(p.color || "", p.color_family);
    if (!cf) return true;
    return paletteHarmonyScore(cf, vibe) >= 60;
  });
}

function sortByVibeAndPalette(products: any[], vibe: string): any[] {
  return [...products].sort((a, b) => {
    const aVibeScore = a.vibe_scores?.[vibe] ?? 0;
    const bVibeScore = b.vibe_scores?.[vibe] ?? 0;
    if (bVibeScore !== aVibeScore) return bVibeScore - aVibeScore;
    const aCF = resolveColorFamily(a.color || "", a.color_family);
    const bCF = resolveColorFamily(b.color || "", b.color_family);
    return paletteHarmonyScore(bCF, vibe) - paletteHarmonyScore(aCF, vibe);
  });
}

function assembleForLook(
  products: any[],
  vibe: string,
  season: string,
  lookKey: string,
  dnaRules?: DnaLabRules | null
): ScoredOutfit | null {
  const slotConfig = SEASONAL_SLOT_CONFIG[season] || SEASONAL_SLOT_CONFIG["fall"];
  const activeSlots = [...slotConfig.required, ...slotConfig.optional];
  const excludedSet = new Set(slotConfig.excluded);

  const bySlot: Record<string, any[]> = {};
  for (const slot of activeSlots) {
    if (excludedSet.has(slot)) { bySlot[slot] = []; continue; }
    let pool = products.filter((p: any) => p.category === slot);
    if (slot === "outer") pool = pool.filter((p: any) => isSeasonAppropriateOuter(p, season));

    const vibeFiltered = filterByVibeScore(pool, vibe, slot === "top" || slot === "bottom" || slot === "shoes" ? 30 : 20, slotConfig.required.includes(slot));
    const paletteFiltered = filterByPalette(vibeFiltered.length >= 2 ? vibeFiltered : pool, vibe);
    const sorted = sortByVibeAndPalette(paletteFiltered.length >= 2 ? paletteFiltered : (vibeFiltered.length >= 2 ? vibeFiltered : pool), vibe);

    const MAX = slotConfig.required.includes(slot) ? 10 : 6;
    bySlot[slot] = sorted.slice(0, MAX);
  }

  if (!bySlot["top"]?.length || !bySlot["bottom"]?.length) return null;
  if (!bySlot["shoes"]?.length) return null;
  for (const req of slotConfig.required) {
    if (req !== "top" && req !== "bottom" && req !== "shoes" && (!bySlot[req] || bySlot[req].length === 0)) {
      if (season === "winter" && (req === "outer" || req === "mid")) return null;
    }
  }

  const combos: ScoredOutfit[] = [];
  const MAX_COMBOS = 2000;
  const isWinter = season === "winter";

  for (const top of bySlot["top"]) {
    const topCF = resolveColorFamily(top.color || "", top.color_family);
    for (const bottom of bySlot["bottom"]) {
      const bottomCF = resolveColorFamily(bottom.color || "", bottom.color_family);
      if (topCF && bottomCF && getColorHarmonyScore(topCF, bottomCF) < 40) continue;

      const shoesPool = bySlot["shoes"].filter((s: any) => quickColorCheck(s, [topCF, bottomCF].filter(Boolean)));
      for (const shoes of (shoesPool.length > 0 ? shoesPool : bySlot["shoes"].slice(0, 2))) {
        const coreItems: Record<string, any> = { top, bottom, shoes };
        const coreFamilies = [topCF, bottomCF, resolveColorFamily(shoes.color || "", shoes.color_family)].filter(Boolean);

        const outerPool = excludedSet.has("outer") ? [] : (bySlot["outer"] || []).filter((o: any) => quickColorCheck(o, coreFamilies));
        const outerRequired = slotConfig.required.includes("outer");
        // For optional outer: try with outer first (preferred), then without as fallback.
        // This ensures outer-included outfits are explored before outer-less ones.
        const outerCandidates = outerPool.length > 0
          ? (outerRequired ? outerPool.slice(0, 3) : [...outerPool.slice(0, 2), null])
          : (outerRequired ? [] : [null]);
        if (outerRequired && outerCandidates.length === 0) continue;

        for (const outer of outerCandidates) {
          const items: Record<string, any> = { ...coreItems };
          if (outer) items.outer = outer;

          if (!excludedSet.has("mid") && bySlot["mid"]?.length) {
            const midRequired = slotConfig.required.includes("mid");
            const midPool = bySlot["mid"].filter((m: any) => {
              if (!quickColorCheck(m, coreFamilies)) return false;
              if (isWinter) {
                const { ok } = checkMidTopCompat(m.sub_category, top.sub_category);
                return ok;
              }
              return true;
            });
            if (midPool.length > 0) {
              let bestMid = midPool[0];
              if (isWinter) {
                let bestBonus = -Infinity;
                for (const m of midPool.slice(0, 3)) {
                  const { bonus } = checkMidTopCompat(m.sub_category, top.sub_category);
                  if (bonus > bestBonus) { bestBonus = bonus; bestMid = m; }
                }
              }
              items.mid = bestMid;
            } else if (midRequired) continue;
          }

          if (bySlot["bag"]?.length) {
            const bagPool = bySlot["bag"].filter((b: any) => quickColorCheck(b, coreFamilies));
            if (bagPool.length > 0) {
              const idx = Math.abs(Object.values(items).filter(Boolean).length * 7) % bagPool.length;
              items.bag = bagPool[idx];
            } else {
              items.bag = bySlot["bag"][0];
            }
          }
          if (bySlot["accessory"]?.length) {
            const accPool = bySlot["accessory"].filter((a: any) => quickColorCheck(a, coreFamilies));
            if (accPool.length > 0) {
              const idx = Math.abs(Object.values(items).filter(Boolean).length * 13) % accPool.length;
              items.accessory = accPool[idx];
            } else {
              items.accessory = bySlot["accessory"][0];
            }
          }

          const allItems = Object.values(items).filter(Boolean);
          const blackCount = allItems.map((p: any) => resolveColorFamily(p.color || "", p.color_family)).filter(c => c === "black").length;
          if (blackCount >= 4 && allItems.length >= 5) continue;

          if (!checkWarmthBudget(items, season)) continue;

          const { total, breakdown } = scoreComposition(items, vibe, season, dnaRules, lookKey);

          if (total >= 75 && breakdown.tonalHarmony >= 65 && breakdown.vibeMatch >= 55 && breakdown.formalityCoherence >= 55) {
            combos.push({ items, score: total, breakdown, lookKey });
          }

          if (combos.length >= MAX_COMBOS) break;
        }
        if (combos.length >= MAX_COMBOS) break;
      }
      if (combos.length >= MAX_COMBOS) break;
    }
    if (combos.length >= MAX_COMBOS) break;
  }

  if (combos.length === 0) {
    const tryFallback = (minTotal: number, minTonal: number, minVibe: number, minFormality: number): ScoredOutfit | null => {
      const fb: ScoredOutfit[] = [];
      for (const top of bySlot["top"].slice(0, 6)) {
        const topCF = resolveColorFamily(top.color || "", top.color_family);
        for (const bottom of bySlot["bottom"].slice(0, 6)) {
          const bottomCF = resolveColorFamily(bottom.color || "", bottom.color_family);
          if (topCF && bottomCF && getColorHarmonyScore(topCF, bottomCF) < 25) continue;
          for (const shoes of bySlot["shoes"].slice(0, 4)) {
            const items: Record<string, any> = { top, bottom, shoes };
            const coreFamilies = [topCF, bottomCF, resolveColorFamily(shoes.color || "", shoes.color_family)].filter(Boolean);
            if (!excludedSet.has("outer") && bySlot["outer"]?.length) {
              const oPool = bySlot["outer"].filter((o: any) => quickColorCheck(o, coreFamilies));
              if (oPool.length > 0) items.outer = oPool[0];
              else if (slotConfig.required.includes("outer")) continue;
            }
            if (!excludedSet.has("mid") && bySlot["mid"]?.length) {
              const mPool = bySlot["mid"].filter((m: any) => quickColorCheck(m, coreFamilies));
              if (mPool.length > 0) items.mid = mPool[0];
              else if (slotConfig.required.includes("mid")) continue;
            }
            if (bySlot["bag"]?.length) items.bag = bySlot["bag"][0];
            if (bySlot["accessory"]?.length) items.accessory = bySlot["accessory"][0];
            const { total, breakdown } = scoreComposition(items, vibe, season, dnaRules, lookKey);
            if (total >= minTotal && breakdown.tonalHarmony >= minTonal && breakdown.vibeMatch >= minVibe && breakdown.formalityCoherence >= minFormality) {
              fb.push({ items, score: total, breakdown, lookKey });
            }
            if (fb.length >= 20) break;
          }
          if (fb.length >= 20) break;
        }
        if (fb.length >= 20) break;
      }
      if (fb.length > 0) { fb.sort((a, b) => b.score - a.score); return fb[0]; }
      return null;
    };

    return tryFallback(65, 50, 40, 45)
      ?? tryFallback(55, 40, 30, 35)
      ?? tryFallback(45, 30, 20, 25)
      ?? null;
  }

  combos.sort((a, b) => b.score - a.score);
  return combos[0];
}

function assembleLookIsolated(
  allProducts: any[],
  vibe: string,
  season: string,
  lookBatchIds: { lookKey: string; batchId: string }[],
  dnaRulesMap?: Record<string, DnaLabRules>
): ScoredOutfit[] {
  const results: ScoredOutfit[] = [];
  const usedProductIds = new Set<string>();

  const sortedLooks = [...lookBatchIds];

  for (const { lookKey, batchId } of sortedLooks) {
    const lookProducts = allProducts.filter((p: any) => p.batch_id === batchId);
    const filtered = lookProducts.filter((p: any) => !usedProductIds.has(p.id));

    const slotConfig = SEASONAL_SLOT_CONFIG[season] || SEASONAL_SLOT_CONFIG["fall"];
    const hasShoes = lookProducts.some((p: any) => p.category === "shoes");
    const hasTop = lookProducts.some((p: any) => p.category === "top");
    const hasBottom = lookProducts.some((p: any) => p.category === "bottom");
    const minRequiredMet = hasTop && hasBottom && hasShoes;

    let toUse = filtered.length >= 3 ? filtered : lookProducts;

    if (!minRequiredMet) {
      const batchPrefix = batchId.replace(/-[A-C]$/, "");
      const supplementPool = allProducts.filter((p: any) =>
        p.batch_id?.startsWith(batchPrefix) && p.batch_id !== batchId
      );
      const supplementByCategory: Record<string, any[]> = {};
      for (const p of supplementPool) {
        if (!supplementByCategory[p.category]) supplementByCategory[p.category] = [];
        supplementByCategory[p.category].push(p);
      }
      const merged = [...toUse];
      for (const reqSlot of ["top", "bottom", "shoes"]) {
        const inPool = toUse.some((p: any) => p.category === reqSlot);
        if (!inPool && supplementByCategory[reqSlot]?.length) {
          merged.push(...supplementByCategory[reqSlot].slice(0, 2));
        }
      }
      toUse = merged;
    }

    const lookDna = dnaRulesMap?.[lookKey] || null;
    const outfit = assembleForLook(toUse, vibe, season, lookKey, lookDna);
    if (outfit) {
      results.push(outfit);
      const ids = Object.values(outfit.items).filter(Boolean).map((p: any) => p.id);
      for (const id of ids) usedProductIds.add(id);
    }
  }

  return results;
}

function validateCrossLookDiversity(outfits: ScoredOutfit[]): boolean {
  if (outfits.length <= 1) return true;
  for (let i = 0; i < outfits.length; i++) {
    for (let j = i + 1; j < outfits.length; j++) {
      const idsA = new Set(Object.values(outfits[i].items).filter(Boolean).map((p: any) => p.id));
      const idsB = Object.values(outfits[j].items).filter(Boolean).map((p: any) => p.id);
      const overlap = idsB.filter(id => idsA.has(id)).length;
      if (overlap > 1) return false;
    }
  }
  return true;
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
      const { batchId, gender, body_type, vibe, season, outfit_count = 1, lookBatchIds } = body as {
        batchId: string; gender: string; body_type: string; vibe: string; season: string; outfit_count?: number;
        lookBatchIds?: { lookKey: string; batchId: string }[];
      };
      if (!batchId || !gender || !body_type || !vibe) {
        return new Response(JSON.stringify({ error: "batchId, gender, body_type, vibe required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      const batchPrefix = batchId.replace(/-[A-C]$/, "");
      const { data: batchProducts } = await adminClient
        .from("products")
        .select("id, name, category, sub_category, color, color_family, color_tone, vibe, season, warmth, formality, silhouette, material, pattern, image_url, nobg_image_url, price, body_type, batch_id, vibe_scores, look_affinity")
        .like("batch_id", `${batchPrefix}%`);

      if (!batchProducts || batchProducts.length === 0) {
        return new Response(JSON.stringify({ error: "No products found for batch" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let dnaRulesMap: Record<string, DnaLabRules> = {};
      try {
        const lookKeys = lookBatchIds?.map((l: any) => l.lookKey) || ["A"];
        for (const lk of lookKeys) {
          const { data: rules } = await adminClient
            .from("style_dna_learned_rules")
            .select("rule_type, rule_data")
            .eq("cell_id", (
              await adminClient.from("style_dna_cells")
                .select("id")
                .eq("gender", gender)
                .eq("body_type", body_type)
                .eq("vibe", vibe)
                .eq("look_key", lk)
                .eq("season", season || "fall")
                .eq("status", "ready")
                .maybeSingle()
            ).data?.id || "00000000-0000-0000-0000-000000000000");
          if (rules && rules.length > 0) {
            const merged: DnaLabRules = {};
            for (const r of rules) {
              (merged as any)[r.rule_type] = r.rule_data;
            }
            dnaRulesMap[lk] = merged;
          }
        }
      } catch { /* DNA rules optional */ }

      let selectedCombos: ScoredOutfit[] = [];

      if (lookBatchIds && lookBatchIds.length > 0) {
        selectedCombos = assembleLookIsolated(batchProducts, vibe, season || "fall", lookBatchIds, dnaRulesMap);
      } else {
        const result = assembleForLook(batchProducts, vibe, season || "fall", "A", dnaRulesMap["A"] || null);
        if (result) selectedCombos = [result];
      }

      if (selectedCombos.length === 0) {
        const catCount: Record<string, number> = {};
        for (const p of batchProducts) catCount[p.category] = (catCount[p.category] || 0) + 1;
        const slotConfig = SEASONAL_SLOT_CONFIG[season] || SEASONAL_SLOT_CONFIG["fall"];
        return new Response(JSON.stringify({
          error: `Could not assemble outfits meeting quality threshold. Season: ${season}, Required slots: ${slotConfig.required.join(",")}, Excluded: ${slotConfig.excluded.join(",") || "none"}, Available: ${JSON.stringify(catCount)}`,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const diversityOk = validateCrossLookDiversity(selectedCombos);

      const outfitIds: string[] = [];
      const outfitCandidates: any[] = [];

      for (const { items: outfitItems, score, breakdown, lookKey } of selectedCombos) {
        const { data: newOutfit, error: outfitErr } = await adminClient.from("outfits").insert({
          gender, body_type, vibe,
          season: season ? [season] : [],
          look_key: lookKey || null,
          status: "draft", tpo: "",
          "AI insight": `Auto-pipeline (v4) | Look ${lookKey || "?"} | Score: ${score}${!diversityOk ? " | Low diversity" : ""}${dnaRulesMap[lookKey || ""] ? " | DNA-enhanced" : ""}`,
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
          lookKey: lookKey || undefined,
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

      const outfitScoreMap = new Map<string, number>();
      for (const c of outfitCandidates) outfitScoreMap.set(c.outfitId, c.matchScore);

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
            body: JSON.stringify({ items: itemList, gender, bodyType: body_type, vibe, season, matchScore: outfitScoreMap.get(outfitId) || 0 }),
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
        let errDetail = `Analysis failed (HTTP ${res.status})`;
        try { const errBody = await res.json(); errDetail = errBody.error || errDetail; } catch {}
        return new Response(JSON.stringify({ success: false, error: errDetail, warmth_rejected: res.status === 422 }), {
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
      let nobgUrl: string | null = null;

      const fetchWithTimeout = (url: string, opts: RequestInit, ms = 25000): Promise<Response> => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), ms);
        return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
      };

      try {
        const pixianRes = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/remove-bg`, {
          method: "POST", headers, body: JSON.stringify({ imageUrl, productId }),
        }, 30000);
        if (pixianRes.ok) {
          const pixianData = await pixianRes.json();
          if (pixianData.success && (pixianData.url || pixianData.image)) nobgUrl = pixianData.url || pixianData.image;
        }
      } catch { /* silent */ }

      if (nobgUrl && !nobgUrl.startsWith("data:")) {
        await adminClient.from("products").update({ nobg_image_url: nobgUrl }).eq("id", productId);
      }

      const visionUrl = nobgUrl && !nobgUrl.startsWith("data:") ? nobgUrl : null;
      if (visionUrl) {
        try {
          const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
          if (GEMINI_API_KEY) {
            const imgRes = await fetch(visionUrl);
            if (imgRes.ok) {
              const contentType = imgRes.headers.get("content-type") || "image/webp";
              const mimeType = contentType.split(";")[0].trim();
              const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
              const chunks: string[] = [];
              for (let i = 0; i < imgBytes.length; i += 32768) {
                chunks.push(String.fromCharCode(...imgBytes.subarray(i, i + 32768)));
              }
              const base64Image = btoa(chunks.join(""));

              const visionPrompt = `Analyze this fashion product image (transparent background). Return ONLY valid JSON with no markdown:
{
  "color": "exact color in Korean e.g. 올리브, 카키, 네이비, 베이지, 차콜, 버건디",
  "color_family": "black|white|grey|charcoal|navy|beige|cream|ivory|brown|tan|camel|olive|khaki|sage|rust|mustard|burgundy|wine|blue|sky_blue|denim|teal|green|mint|red|coral|yellow|orange|pink|lavender|purple|metallic|multi",
  "color_tone": "warm|cool|neutral",
  "pattern": "solid|stripe|check|floral|graphic|print|other",
  "silhouette": "oversized|relaxed|wide|regular|straight|fitted|slim|tapered",
  "sub_category": "most specific type e.g. cable_knit|turtleneck|blazer|puffer|trench|chelsea_boot|tote|crossbody",
  "formality": 1-5,
  "warmth": 1-5,
  "season": ["spring","summer","fall","winter"],
  "vibe": ["ELEVATED_COOL","EFFORTLESS_NATURAL","ARTISTIC_MINIMAL","RETRO_LUXE","SPORT_MODERN","CREATIVE_LAYERED"],
  "body_type": ["slim","regular","plus-size"]
}
formality: 1=very casual, 3=smart casual, 5=formal. warmth: 1=summer, 3=spring/fall, 5=heavy winter.`;

              const geminiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [
                      { text: visionPrompt },
                      { inline_data: { mime_type: mimeType, data: base64Image } },
                    ]}],
                    generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
                  }),
                }
              );

              if (geminiRes.ok) {
                const geminiData = await geminiRes.json();
                const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
                const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
                const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const vis = JSON.parse(jsonMatch[0]);
                  const VALID_COLOR_FAMILIES = new Set(["black","white","grey","charcoal","navy","beige","cream","ivory","brown","tan","camel","olive","khaki","sage","rust","mustard","burgundy","wine","blue","sky_blue","denim","teal","green","mint","red","coral","yellow","orange","pink","lavender","purple","metallic","multi"]);
                  const VALID_SILHOUETTES = new Set(["oversized","relaxed","wide","regular","straight","fitted","slim","tapered"]);
                  const VALID_PATTERNS = new Set(["solid","stripe","check","floral","graphic","print","other"]);
                  const VALID_COLOR_TONES = new Set(["warm","cool","neutral"]);
                  const VALID_VIBES = new Set(["ELEVATED_COOL","EFFORTLESS_NATURAL","ARTISTIC_MINIMAL","RETRO_LUXE","SPORT_MODERN","CREATIVE_LAYERED"]);
                  const VALID_SEASONS = new Set(["spring","summer","fall","winter"]);
                  const VALID_BODY_TYPES = new Set(["slim","regular","plus-size"]);

                  const patch: Record<string, any> = {};
                  if (vis.color) patch.color = vis.color;
                  if (VALID_COLOR_FAMILIES.has(vis.color_family)) patch.color_family = vis.color_family;
                  if (VALID_COLOR_TONES.has(vis.color_tone)) patch.color_tone = vis.color_tone;
                  if (VALID_PATTERNS.has(vis.pattern)) patch.pattern = vis.pattern;
                  if (VALID_SILHOUETTES.has(vis.silhouette)) patch.silhouette = vis.silhouette;
                  if (vis.sub_category) patch.sub_category = vis.sub_category;
                  if (vis.formality && vis.formality >= 1 && vis.formality <= 5) patch.formality = Math.round(vis.formality);
                  if (vis.warmth && vis.warmth >= 1 && vis.warmth <= 5) patch.warmth = Math.round(vis.warmth);
                  const seasons = Array.isArray(vis.season) ? vis.season.filter((s: string) => VALID_SEASONS.has(s)) : [];
                  if (seasons.length > 0) patch.season = seasons;
                  const vibes = Array.isArray(vis.vibe) ? vis.vibe.filter((v: string) => VALID_VIBES.has(v)) : [];
                  if (vibes.length > 0) {
                    const { data: currentProduct } = await adminClient.from("products").select("vibe").eq("id", productId).maybeSingle();
                    const contextVibe = Array.isArray(currentProduct?.vibe) && currentProduct.vibe.length > 0 ? currentProduct.vibe[0] : null;
                    if (contextVibe && vibes[0] !== contextVibe) {
                      patch.vibe = [contextVibe, ...vibes.filter((v: string) => v !== contextVibe)].slice(0, 3);
                    } else {
                      patch.vibe = vibes;
                    }
                  }
                  const bodyTypes = Array.isArray(vis.body_type) ? vis.body_type.filter((b: string) => VALID_BODY_TYPES.has(b)) : [];
                  if (bodyTypes.length > 0) patch.body_type = bodyTypes;

                  if (Object.keys(patch).length > 0) {
                    await adminClient.from("products").update(patch).eq("id", productId);
                  }
                }
              }
            }
          }
        } catch { /* silent — vision refinement is best-effort */ }
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

    return new Response(JSON.stringify({ error: `Unknown action: ${action ?? "(none)"}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
