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
      "suede jacket", "faux fur", "leather trench", "safari jacket",
      "patchwork jacket", "corduroy blazer", "poncho", "crochet cardigan", "fringe vest",
      "tweed jacket", "camel coat", "gold button blazer", "cable cardigan",
      "barbour jacket", "navy blazer", "cashmere coat", "polo coat", "harrington",
      "shearling vest", "velvet coat",
    ],
    mid: [
      "cable-knit sweater", "cashmere turtleneck", "crochet vest", "argyle vest", "twin-set",
      "v-neck sweater", "ribbed knit", "embroidered corset", "knit bodice", "velvet bodice",
      "cricket jumper", "cable sweater", "cashmere turtle", "collared knit", "sleeveless knit",
      "fair isle knit", "heavy cardigan", "shawl collar cardigan", "folk cardigan", "corset top",
      "cardigan", "mock neck", "wrap top", "tie-neck blouse", "shell top",
      "peasant blouse", "lace top", "smocked top", "puff sleeve top", "knit vest",
    ],
    top: [
      "embroidered blouse", "lace top", "peasant blouse", "smocked top", "floral shirt",
      "corset top", "ruffled blouse", "balloon sleeve", "high neck blouse", "broderie top",
      "printed shirt", "turtleneck", "halter top", "ringer tee", "pussy-bow blouse",
      "western shirt", "tunic", "disco top", "satin shirt", "bell sleeve top",
      "cable sweater", "polo shirt", "white shirt", "silk blouse",
      "oxford shirt", "button-down", "striped shirt", "boat neck top", "linen shirt",
      "folk embroidered top",
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
      "platform boots", "knee boots", "wedge sandals",
      "platform sneakers", "moccasins", "loafers", "strappy sandals", "wooden heels",
      "riding boots", "horsebit loafers", "ballet flats", "driving shoes", "penny loafers",
      "chelsea boots",
    ],
    bag: [
      "tapestry bag", "frame bag", "beaded pouch", "velvet bag", "embroidered clutch",
      "fringe bag", "basket", "coin purse", "vintage handbag", "carpet bag",
      "brocade bag", "tassel bag", "patchwork bag", "saddle bag", "bucket bag",
      "suede hobo", "macrame bag", "canvas messenger",
      "leather tote", "woven bag", "crochet bag", "camera bag", "satchel",
      "structured handbag", "canvas tote", "box bag", "vanity case", "monogram bag",
      "fringe clutch", "wicker basket bag",
    ],
    accessory: [
      "headscarf", "pearl earrings", "beads", "floral headband", "cameo",
      "gold hoops", "statement belt", "corset belt", "hair flowers",
      "brooch", "choker", "layered necklaces", "dangle earrings", "velvet ribbon",
      "tinted sunglasses", "wide brim hat", "silk scarf", "turquoise jewelry", "leather belt",
      "hoop earrings", "bangles", "feather earring", "headband", "bandana",
      "pearl necklace", "watch", "stud earrings", "comb hair accessory",
      "signet ring", "chain necklace",
    ],
  },
  SPORT_MODERN: {
    outer: [
      "3-layer shell", "tech trench", "windbreaker", "utility vest", "anorak",
      "rain poncho", "puffer", "fleece", "tactical vest", "convertible jacket",
      "softshell", "parka", "down jacket", "mountain parka", "gilet",
      "cropped puffer", "track jacket", "hoodie", "bolero", "zip fleece",
      "bomber", "wrap cardigan", "yoga jacket", "running jacket", "teddy jacket",
      "coach jacket", "stadium parka", "varsity bomber", "training jacket", "shell jacket",
    ],
    mid: [
      "half-zip fleece", "technical quarter-zip", "ribbed crop tee", "compression top", "zip polo",
      "grid fleece", "sun hoodie", "baselayer", "sports bra", "seamless top",
      "racerback", "wrap top", "mesh top", "crop top", "yoga top",
      "half-zip", "sweatshirt", "bralette", "corset top", "thermal",
      "warm-up top", "drill top", "hoodie", "knitted polo",
      "zip neck", "long sleeve jersey", "crewneck", "v-neck jersey", "collared shirt",
      "performance shirt",
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
      "jorts", "nylon shorts", "jeans", "warm-up pants", "performance shorts",
    ],
    shoes: [
      "gore-tex sneakers", "trail runners", "trekking boots", "chunky sneakers", "waterproof boots",
      "approach shoes", "hiking boots", "running shoes", "recovery slides", "tech boots",
      "sock shoes", "mountain boots", "trail sandals", "winter boots", "hybrid shoes",
      "slides", "sock sneakers", "platform sneakers", "training shoes", "high-tops",
      "casual runners", "white sneakers", "fashion trainers", "chunky soles", "retro runners",
      "terrace sneakers", "indoor soccer shoes", "canvas sneakers", "gum soles", "cross trainers",
    ],
    bag: [
      "sacoche", "backpack", "chest rig", "waist bag", "dry bag",
      "sling", "hydration pack", "utility pouch", "carabiner bag", "duffle",
      "roll-top bag", "messenger", "hip pack", "camera bag", "phone holder",
      "gym bag", "belt bag", "bottle bag", "crossbody", "running vest",
      "tote", "mini backpack", "yoga bag", "sackpack", "wristlet",
      "drawstring bag", "shoebox bag", "tech crossbody", "modular bag", "waterproof pouch",
    ],
    accessory: [
      "bucket hat", "sunglasses", "carabiner", "gaiter", "gloves",
      "beanie", "watch", "utility belt", "cap", "headband",
      "socks", "lanyard", "bandana", "visor", "ear muffs",
      "neck warmer", "gps watch", "sweatband", "headphones", "fitness tracker",
      "scrunchie", "hair clip", "necklace",
      "scarf", "wristband", "chain", "rings", "earring",
      "sport socks", "smart watch",
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
      "crochet top", "vest", "slip dress", "thermal",
      "cardigan", "bodice", "peasant top", "smock", "layered tee", "sheer blouse",
    ],
    top: [
      "band tee", "lace blouse", "corset", "mesh bodysuit", "fishnet top",
      "slogan tee", "tank", "slip top", "bustier", "graphic tee",
      "crop top", "vintage tee", "muscle tank", "ripped tee", "tube top",
      "knit", "floral shirt", "polka dot blouse", "tie-dye", "striped shirt",
      "animal print", "hawaiian shirt", "off-shoulder", "bralette", "sheer top",
      "crochet top", "thermal", "peasant top", "smock top", "lace insert tee",
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
      "cowboy boots", "printed boots", "socks with sandals",
      "jellies", "espadrilles", "moccasins", "oxfords", "brogues",
      "chunky platform boots", "vintage loafers",
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
      "choker", "layered necklaces", "safety pins", "tights", "gloves",
      "lock necklace", "rings", "nose ring", "cuff", "sunglasses",
      "belt", "chain", "wristband", "earrings", "studs",
      "beads", "scarf", "clips", "bandana",
      "glasses", "headband", "turban", "pin", "patch",
      "brooch", "beret", "collar", "locket", "chain belt", "hair bow",
    ],
  },
};

const VIBE_LOOK_SIGNATURES: Record<string, Record<string, { keywords: string[]; materials: string[]; formality: [number, number] }>> = {
  ELEVATED_COOL: {
    A: { keywords: ["wool coat", "structured trench", "leather blazer", "tailored", "poplin shirt", "silk blouse", "wide-leg trousers", "pleated trousers", "cigarette pants", "square-toe boots", "chunky loafers", "architectural heels", "geometric tote", "box bag"], materials: ["fine wool", "smooth leather", "cashmere", "silk", "gabardine", "poplin", "satin"], formality: [5, 9] },
    B: { keywords: ["varsity jacket", "bomber", "peacoat", "harrington", "polo shirt", "oxford shirt", "rugby shirt", "argyle", "cable vest", "chinos", "raw denim", "loafers with socks", "derby", "retro sneakers", "satchel", "canvas tote"], materials: ["tweed", "corduroy", "denim", "cable-knit", "velvet", "waxed cotton", "suede"], formality: [3, 7] },
    C: { keywords: ["puffer vest", "technical bomber", "coach jacket", "anorak", "windbreaker", "track jacket", "hoodie", "graphic tee", "cargo sweats", "parachute pants", "leather joggers", "high-top sneakers", "dad sneakers", "foam runners", "sling bag", "chest rig"], materials: ["nylon", "tech-fleece", "mesh", "neoprene", "jersey", "rubber", "reflective"], formality: [2, 6] },
  },
  EFFORTLESS_NATURAL: {
    A: { keywords: ["collarless liner", "noragi", "kimono cardigan", "linen tunic", "waffle henley", "wrap top", "wide linen trousers", "drawstring pants", "culottes", "suede mules", "tabi flats", "babouche", "canvas sneakers", "soft hobo", "knot bag"], materials: ["linen", "raw silk", "organic cotton", "gauze", "hemp", "tencel"], formality: [2, 5] },
    B: { keywords: ["soft blazer", "chore coat", "linen jacket", "breton stripe tee", "chambray shirt", "boat neck", "vintage denim", "white jeans", "corduroy pants", "ballet flats", "mary janes", "desert boots", "leather shoulder bag", "baguette"], materials: ["cotton", "chambray", "jersey", "denim", "wool blend"], formality: [3, 6] },
    C: { keywords: ["field jacket", "barn jacket", "waxed jacket", "flannel shirt", "logger shirt", "baseball tee", "fatigue pants", "carpenter jeans", "overalls", "work boots", "hiking boots", "wallabees", "backpack", "tool bag", "satchel"], materials: ["waxed cotton", "flannel", "canvas", "heavy cotton", "suede", "thick denim"], formality: [1, 4] },
  },
  ARTISTIC_MINIMAL: {
    A: { keywords: ["collarless coat", "kimono jacket", "stand-collar", "tunic shirt", "asymmetric knit", "mock neck", "culottes", "wide cropped trousers", "pleated skirt", "tabi boots", "derby", "square flats", "pleated tote", "geometric bag", "portfolio"], materials: ["structured cotton", "Japanese denim", "stiff linen", "technical wool"], formality: [4, 8] },
    B: { keywords: ["crushed velvet jacket", "faux fur vest", "shaggy jacket", "mohair knit", "crushed satin", "organza blouse", "velvet top", "satin pants", "leather skirt", "metallic pants", "velvet slippers", "patent loafers", "metallic boots", "fur bag", "velvet clutch", "beaded bag"], materials: ["mohair", "organza", "velvet", "satin", "boucle", "angora"], formality: [3, 7] },
    C: { keywords: ["cape", "draped cardigan", "shawl coat", "blanket coat", "cowl neck", "wrap top", "draped jersey", "balloon pants", "sarouel pants", "jersey pants", "soft boots", "flat mules", "gladiator sandals", "slouchy sack", "knot bag", "hobo bag"], materials: ["jersey", "soft knit", "flowing wool", "modal", "bamboo"], formality: [2, 5] },
  },
  RETRO_LUXE: {
    A: { keywords: ["shearling coat", "velvet blazer", "cape", "afghan coat", "tapestry jacket", "embroidered blouse", "lace top", "peasant blouse", "velvet trousers", "tiered skirt", "embroidered jeans", "lace-up boots", "mary janes", "clogs", "tapestry bag", "beaded pouch"], materials: ["velvet", "tapestry", "embroidered", "lace", "brocade", "shearling"], formality: [3, 7] },
    B: { keywords: ["suede jacket", "faux fur", "leather trench", "safari jacket", "halter top", "ringer tee", "disco top", "flared jeans", "bell-bottoms", "patchwork jeans", "platform boots", "knee boots", "wedge sandals", "suede hobo", "fringe bag"], materials: ["suede", "faux fur", "patent leather", "denim", "crochet", "macrame"], formality: [2, 6] },
    C: { keywords: ["tweed jacket", "camel coat", "gold button blazer", "navy blazer", "oxford shirt", "white shirt", "striped shirt", "wool trousers", "chinos", "riding pants", "horsebit loafers", "penny loafers", "ballet flats", "structured handbag", "monogram bag"], materials: ["tweed", "cashmere", "fine wool", "cotton broadcloth", "silk", "leather"], formality: [5, 8] },
  },
  SPORT_MODERN: {
    A: { keywords: ["3-layer shell", "tech trench", "anorak", "utility vest", "merino base layer", "performance tee", "cargo pants", "waterproof trousers", "convertible pants", "gore-tex sneakers", "trail runners", "trekking boots", "sacoche", "chest rig", "dry bag"], materials: ["gore-tex", "merino", "ripstop", "cordura", "technical nylon", "softshell"], formality: [1, 3] },
    B: { keywords: ["cropped puffer", "yoga jacket", "teddy jacket", "ribbed crop tee", "sports bra", "seamless top", "leggings", "biker shorts", "yoga pants", "flare leggings", "sock sneakers", "platform sneakers", "fashion trainers", "belt bag", "gym bag", "yoga bag"], materials: ["stretch fabric", "neoprene", "compression", "seamless knit", "scuba"], formality: [1, 4] },
    C: { keywords: ["varsity bomber", "stadium parka", "training jacket", "soccer jersey", "rugby shirt", "polo", "jorts", "nylon shorts", "warm-up pants", "track pants", "terrace sneakers", "indoor soccer shoes", "gum soles", "drawstring bag", "shoebox bag"], materials: ["jersey", "mesh", "polyester", "cotton blend", "nylon"], formality: [1, 3] },
  },
  CREATIVE_LAYERED: {
    A: { keywords: ["leather biker", "studs jacket", "vinyl trench", "band tee", "corset", "mesh bodysuit", "fishnet", "ripped jeans", "leather pants", "vinyl skirt", "combat boots", "platform boots", "studded boots", "chain bag", "studded bag", "safety pin bag"], materials: ["leather", "vinyl", "mesh", "metal", "studded", "distressed denim"], formality: [1, 4] },
    B: { keywords: ["leopard coat", "patchwork jacket", "flannel shirt", "floral shirt", "polka dot", "hawaiian shirt", "tie-dye", "animal print", "plaid skirt", "checkered pants", "colored denim", "creepers", "clogs", "printed boots", "patchwork bag", "novelty bag"], materials: ["printed cotton", "patchwork", "crochet", "plaid wool", "corduroy", "faux fur"], formality: [1, 4] },
    C: { keywords: ["kimono", "tapestry coat", "poncho", "cape", "vintage tee", "peasant top", "crochet top", "overalls", "tiered skirt", "velvet skirt", "corduroy pants", "moccasins", "espadrilles", "vintage loafers", "tapestry bag", "wicker basket bag"], materials: ["vintage fabric", "crochet", "tapestry", "velvet", "corduroy", "embroidered"], formality: [1, 5] },
  },
};

function computeLookAffinity(
  category: string,
  subCategory: string,
  name: string,
  material: string,
  colorFamily: string,
  formality: number,
  vibeScores: Record<string, number>
): Record<string, Record<string, number>> {
  const ALL_VIBES = ["ELEVATED_COOL", "EFFORTLESS_NATURAL", "ARTISTIC_MINIMAL", "RETRO_LUXE", "SPORT_MODERN", "CREATIVE_LAYERED"];
  const LOOKS: string[] = ["A", "B", "C"];
  const result: Record<string, Record<string, number>> = {};
  const terms: string[] = [];
  if (subCategory) terms.push(subCategory);
  if (name) terms.push(name);
  const matLower = (material || "").toLowerCase();

  for (const vibe of ALL_VIBES) {
    const vibeScore = vibeScores[vibe] || 0;
    if (vibeScore < 10) {
      result[vibe] = { A: 0, B: 0, C: 0 };
      continue;
    }

    const lookSigs = VIBE_LOOK_SIGNATURES[vibe];
    if (!lookSigs) { result[vibe] = { A: 0, B: 0, C: 0 }; continue; }

    const lookScores: Record<string, number> = {};
    for (const look of LOOKS) {
      const sig = lookSigs[look];
      if (!sig) { lookScores[look] = 0; continue; }

      const keywordScore = terms.length > 0 ? fuzzyMatchScoreAnalyze(terms, sig.keywords) : 0;

      let materialBonus = 0;
      if (matLower) {
        for (const pref of sig.materials) {
          if (matLower.includes(pref) || pref.includes(matLower)) {
            materialBonus = 12;
            break;
          }
        }
      }

      let formalityFit = 0;
      if (typeof formality === "number") {
        const [fMin, fMax] = sig.formality;
        if (formality >= fMin && formality <= fMax) formalityFit = 10;
        else if (formality >= fMin - 1 && formality <= fMax + 1) formalityFit = 5;
      }

      const raw = Math.round(keywordScore * 68 + materialBonus + formalityFit + vibeScore * 0.1);
      lookScores[look] = Math.min(100, Math.max(0, raw));
    }

    result[vibe] = lookScores;
  }

  return result;
}

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
    const lookAffinity = computeLookAffinity(normalizedCategory, subCat, core.name || product.title, materialStr, normalizedColorFamily, formality, vibeScores);
    const bodyTypes = [body_type || "regular"];
    if (!bodyTypes.includes("regular") && body_type !== "regular") bodyTypes.push("regular");

    const productLink = product.url || "";
    const extractedAsin = (productLink.match(/\/dp\/([A-Z0-9]{10})/)?.[1]) || null;

    const SEASON_WARMTH_GATE: Record<string, { maxWarmth: number; allowedSlots: string[] }> = {
      spring: { maxWarmth: 3.5, allowedSlots: ["top", "bottom", "shoes", "bag", "accessory"] },
      summer: { maxWarmth: 2.5, allowedSlots: ["top", "bottom", "shoes", "bag", "accessory"] },
    };
    const gate = season ? SEASON_WARMTH_GATE[season] : null;
    if (gate && gate.allowedSlots.includes(normalizedCategory) && warmth > gate.maxWarmth) {
      return new Response(JSON.stringify({
        error: `Product warmth (${warmth}) too high for ${season} season (max ${gate.maxWarmth}) in slot '${normalizedCategory}'. Skipping registration.`,
        warmth_rejected: true,
      }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      look_affinity: lookAffinity,
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
