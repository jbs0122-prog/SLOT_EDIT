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
  silhouette_preference: string[];
  proportion_style: string;
}> = {
  ELEVATED_COOL: {
    formality_range: [5, 9],
    color_palette: {
      primary: ['black', 'charcoal', 'navy', 'white'],
      secondary: ['grey', 'cream', 'camel'],
      accent: ['burgundy', 'metallic', 'wine'],
    },
    material_preferences: ['structured', 'luxe', 'classic'],
    silhouette_preference: ['I', 'V'],
    proportion_style: 'column',
  },
  EFFORTLESS_NATURAL: {
    formality_range: [2, 6],
    color_palette: {
      primary: ['beige', 'cream', 'ivory', 'white'],
      secondary: ['olive', 'khaki', 'tan', 'sage', 'brown'],
      accent: ['rust', 'mustard', 'burgundy'],
    },
    material_preferences: ['classic', 'eco', 'knit'],
    silhouette_preference: ['A', 'H', 'I'],
    proportion_style: 'relaxed',
  },
  ARTISTIC_MINIMAL: {
    formality_range: [3, 8],
    color_palette: {
      primary: ['black', 'white', 'grey', 'charcoal'],
      secondary: ['cream', 'beige', 'navy'],
      accent: ['rust', 'olive', 'burgundy'],
    },
    material_preferences: ['classic', 'structured', 'eco', 'knit'],
    silhouette_preference: ['I', 'A', 'Y'],
    proportion_style: 'column',
  },
  RETRO_LUXE: {
    formality_range: [3, 8],
    color_palette: {
      primary: ['burgundy', 'navy', 'brown', 'cream'],
      secondary: ['camel', 'olive', 'wine', 'beige'],
      accent: ['rust', 'mustard', 'teal', 'gold'],
    },
    material_preferences: ['luxe', 'structured', 'classic', 'knit'],
    silhouette_preference: ['A', 'X', 'I'],
    proportion_style: 'balanced',
  },
  SPORT_MODERN: {
    formality_range: [0, 4],
    color_palette: {
      primary: ['black', 'grey', 'white', 'navy'],
      secondary: ['olive', 'khaki', 'charcoal'],
      accent: ['orange', 'teal', 'red', 'green'],
    },
    material_preferences: ['technical', 'casual', 'blend'],
    silhouette_preference: ['I', 'V'],
    proportion_style: 'balanced',
  },
  CREATIVE_LAYERED: {
    formality_range: [0, 5],
    color_palette: {
      primary: ['black', 'grey', 'white', 'denim'],
      secondary: ['burgundy', 'brown', 'olive', 'navy'],
      accent: ['red', 'purple', 'orange', 'pink', 'yellow'],
    },
    material_preferences: ['structured', 'casual', 'classic', 'sheer'],
    silhouette_preference: ['V', 'A', 'Y'],
    proportion_style: 'top-heavy',
  },
};

const VIBE_ITEM_POOLS: Record<string, Record<string, string[]>> = {
  ELEVATED_COOL: {
    outer: ['oversized wool coat', 'structured trench', 'leather blazer', 'varsity jacket', 'cropped bomber', 'puffer vest', 'technical bomber', 'biker jacket', 'tuxedo jacket'],
    top: ['high-neck knit', 'crisp poplin shirt', 'silk button-down', 'cable vest', 'polo shirt', 'cashmere hoodie', 'boxy tee', 'mock-neck sweat'],
    bottom: ['wide-leg wool trousers', 'leather pants', 'cigarette pants', 'chinos', 'raw denim', 'cargo sweats', 'parachute pants'],
    shoes: ['square-toe boots', 'chunky loafers', 'architectural heels', 'loafers with socks', 'retro sneakers', 'high-top sneakers', 'combat boots'],
    bag: ['geometric tote', 'metal clutch', 'box bag', 'satchel', 'canvas tote', 'mini leather bag', 'sling bag'],
    accessory: ['silver chain', 'metal sunglasses', 'leather gloves', 'skinny tie', 'baseball cap', 'beanie', 'silver rings'],
  },
  EFFORTLESS_NATURAL: {
    outer: ['collarless liner', 'soft blazer', 'kimono cardigan', 'trench coat', 'wool blazer', 'quilted liner', 'field jacket'],
    top: ['linen tunic', 'waffle henley', 'organic tee', 'breton stripe tee', 'cashmere crew', 'chambray shirt', 'fair isle knit'],
    bottom: ['wide linen trousers', 'drawstring pants', 'maxi skirt', 'vintage denim', 'silk skirt', 'fatigue pants', 'wide chinos'],
    shoes: ['suede mules', 'leather slides', 'tabi flats', 'ballet flats', 'minimal sneakers', 'desert boots', 'work boots'],
    bag: ['soft hobo', 'canvas bucket', 'knot bag', 'straw basket', 'canvas tote', 'helmet bag', 'backpack'],
    accessory: ['ceramic jewelry', 'cotton scarf', 'bucket hat', 'silk scarf', 'gold hoops', 'beanie', 'bandana'],
  },
  ARTISTIC_MINIMAL: {
    outer: ['collarless coat', 'kimono jacket', 'longline blazer', 'boucle coat', 'cape', 'draped cardigan', 'asymmetric jacket'],
    top: ['tunic shirt', 'asymmetric knit', 'stiff mock neck', 'sheer mesh top', 'mohair knit', 'cowl neck', 'uneven hem shirt'],
    bottom: ['culottes', 'wide cropped trousers', 'pleated skirt', 'satin pants', 'leather skirt', 'balloon pants', 'sarouel pants'],
    shoes: ['tabi boots', 'architectural mules', 'derby', 'velvet slippers', 'pony-hair boots', 'leather sandals', 'soft boots'],
    bag: ['pleated tote', 'geometric bag', 'oversized clutch', 'fur bag', 'wrinkled pouch', 'slouchy sack', 'knot bag'],
    accessory: ['sculptural bangle', 'bold eyewear', 'single earring', 'pearl necklace', 'velvet choker', 'long necklace', 'layered bangles'],
  },
  RETRO_LUXE: {
    outer: ['shearling coat', 'velvet blazer', 'cape', 'suede jacket', 'faux fur', 'tweed jacket', 'quilted jacket'],
    top: ['embroidered blouse', 'lace top', 'crochet vest', 'printed shirt', 'turtleneck', 'cable sweater', 'pussy-bow blouse'],
    bottom: ['wool maxi skirt', 'velvet trousers', 'corduroy pants', 'flared jeans', 'corduroy skirt', 'white jeans', 'riding pants'],
    shoes: ['lace-up boots', 'mary janes', 'clogs', 'platform boots', 'suede boots', 'riding boots', 'horsebit loafers'],
    bag: ['tapestry bag', 'frame bag', 'beaded pouch', 'saddle bag', 'suede hobo', 'structured handbag', 'canvas tote'],
    accessory: ['headscarf', 'pearl earrings', 'beads', 'tinted sunglasses', 'wide brim hat', 'pearl necklace', 'headband'],
  },
  SPORT_MODERN: {
    outer: ['3-layer shell', 'tech trench', 'windbreaker', 'cropped puffer', 'track jacket', 'hoodie', 'coach jacket'],
    top: ['merino base', 'tech-fleece', 'performance tee', 'sports bra', 'compression tee', 'soccer jersey', 'ringer tee'],
    bottom: ['cargo pants', 'waterproof trousers', 'leggings', 'joggers', 'biker shorts', 'track pants', 'jorts'],
    shoes: ['gore-tex sneakers', 'trail runners', 'running shoes', 'slides', 'terrace sneakers', 'retro runners', 'chunky sneakers'],
    bag: ['sacoche', 'backpack', 'chest rig', 'gym bag', 'belt bag', 'crossbody', 'duffle'],
    accessory: ['bucket hat', 'sunglasses', 'carabiner', 'cap', 'headphones', 'scarf', 'beanie'],
  },
  CREATIVE_LAYERED: {
    outer: ['leather biker', 'denim jacket', 'fleece', 'windbreaker', 'field jacket', 'fur coat', 'patchwork jacket'],
    top: ['corset', 'lace blouse', 'band tee', 'knit', 'floral shirt', 'lace blouse', 'crochet top'],
    bottom: ['tulle skirt', 'ripped jeans', 'cargo mini', 'checkered pants', 'striped skirt', 'velvet skirt', 'corduroy pants'],
    shoes: ['combat boots', 'loafers', 'mary janes', 'sneakers', 'boots', 'cowboy boots', 'platforms'],
    bag: ['backpack', 'chain bag', 'heart bag', 'beaded bag', 'tote', 'tapestry bag', 'frame bag'],
    accessory: ['choker', 'necklaces', 'safety pins', 'earrings', 'beads', 'brooch', 'chain'],
  },
};

const COLOR_TO_FAMILY: Record<string, string[]> = {
  black: ['black'],
  charcoal: ['charcoal', 'grey'],
  navy: ['navy'],
  white: ['white', 'ivory'],
  grey: ['grey', 'charcoal'],
  cream: ['cream', 'ivory', 'beige'],
  camel: ['camel', 'tan', 'brown'],
  beige: ['beige', 'cream', 'tan'],
  ivory: ['ivory', 'cream', 'white'],
  olive: ['olive', 'sage', 'green'],
  khaki: ['khaki', 'tan', 'beige'],
  tan: ['tan', 'camel', 'brown'],
  sage: ['sage', 'olive', 'green'],
  brown: ['brown', 'camel', 'tan'],
  burgundy: ['burgundy', 'wine'],
  wine: ['wine', 'burgundy'],
  metallic: ['metallic', 'gold', 'silver'],
  rust: ['rust', 'orange', 'brown'],
  mustard: ['mustard', 'yellow'],
  teal: ['teal'],
  gold: ['gold', 'metallic'],
  denim: ['denim', 'blue'],
  orange: ['orange', 'rust'],
  red: ['red'],
  purple: ['purple', 'lavender'],
  pink: ['pink', 'coral'],
  yellow: ['yellow', 'mustard'],
  green: ['green', 'olive', 'sage'],
  blue: ['blue', 'navy', 'denim', 'sky_blue'],
};

function getVibeColorFamilies(vibeKey: string): Set<string> {
  const dna = VIBE_DNA[vibeKey];
  if (!dna) return new Set();
  const allColors = [...dna.color_palette.primary, ...dna.color_palette.secondary, ...dna.color_palette.accent];
  const families = new Set<string>();
  for (const color of allColors) {
    const mapped = COLOR_TO_FAMILY[color];
    if (mapped) mapped.forEach(f => families.add(f));
    families.add(color);
  }
  return families;
}

function validateVibeTag(vibeTag: string, category: string, subCategory: string): boolean {
  const pool = VIBE_ITEM_POOLS[vibeTag];
  if (!pool) return true;
  const items = pool[category];
  if (!items || items.length === 0) return true;
  const lcSub = (subCategory || '').toLowerCase().replace(/_/g, ' ');
  return items.some(item => {
    const lcItem = item.toLowerCase();
    return lcItem.includes(lcSub) || lcSub.includes(lcItem.split(' ')[0]);
  });
}

function validateColorForVibe(colorFamily: string, vibeKey: string): { valid: boolean; tier: 'primary' | 'secondary' | 'accent' | 'outside' } {
  const dna = VIBE_DNA[vibeKey];
  if (!dna) return { valid: true, tier: 'primary' };
  const lc = (colorFamily || '').toLowerCase();
  const palette = dna.color_palette;
  const matchesTier = (colors: string[]) =>
    colors.some(c => {
      const mapped = COLOR_TO_FAMILY[c] || [c];
      return mapped.includes(lc) || lc === c;
    });
  if (matchesTier(palette.primary)) return { valid: true, tier: 'primary' };
  if (matchesTier(palette.secondary)) return { valid: true, tier: 'secondary' };
  if (matchesTier(palette.accent)) return { valid: true, tier: 'accent' };
  return { valid: false, tier: 'outside' };
}

function clampFormality(formality: number, vibeKey: string): number {
  const dna = VIBE_DNA[vibeKey];
  if (!dna) return formality;
  const [min, max] = dna.formality_range;
  const scaledMin = Math.ceil(min / 2);
  const scaledMax = Math.ceil(max / 2);
  return Math.min(scaledMax, Math.max(scaledMin, formality));
}

async function triggerNobgPipeline(
  productId: string,
  imageUrl: string,
  category: string,
  subCategory: string,
  supabaseUrl: string,
  serviceKey: string,
  adminClient: ReturnType<typeof createClient>
): Promise<void> {
  const headers = { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" };
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

    const vibeDna = VIBE_DNA[vibe];
    let vibeGuidanceSection = "";
    if (vibeDna) {
      const palette = vibeDna.color_palette;
      vibeGuidanceSection = `
VIBE DNA GUIDANCE (${vibe}):
- Formality range: ${vibeDna.formality_range[0]}-${vibeDna.formality_range[1]} (on 0-10 scale; map to 1-5 for output)
- Color palette:
  Primary (preferred): ${palette.primary.join(', ')}
  Secondary (good): ${palette.secondary.join(', ')}
  Accent (sparingly): ${palette.accent.join(', ')}
- Material preferences: ${vibeDna.material_preferences.join(', ')}
- Silhouette preference: ${vibeDna.silhouette_preference.join(', ')}
- Proportion style: ${vibeDna.proportion_style}

Use this DNA to guide your analysis. Ensure the vibe tags you assign actually match the product's aesthetic.
If a product has a very casual silhouette but vibe is ELEVATED_COOL, add other matching vibes too.
`;
    }

    const prompt = `You are a fashion product data specialist with deep expertise in garment classification. Analyze this Amazon product title and return precise structured metadata.

CRITICAL: ALL values in the JSON must be in ENGLISH only. Never use Korean, Japanese, Chinese, or any other non-English language for any field values.

Product:
- Title: ${product.title}
- Brand: ${product.brand || "unknown"}
- Price: ${product.price ? `$${product.price}` : "unknown"}
- Search context — Gender: ${gender}, Body type: ${bodyDesc}, Vibe: ${vibe}, Season: ${season || "all"}
${vibeGuidanceSection}
IMPORTANT: The body type is "${body_type}". The silhouette MUST be determined from the GARMENT CUT described in the title:
- "slim fit", "skinny", "slim-cut", "tapered" → "slim"
- "fitted", "form-fitting", "bodycon" → "fitted"
- "straight leg", "straight fit", "straight cut" → "straight"
- "relaxed fit", "easy fit", "comfort fit", "loose" → "relaxed"
- "oversized", "boxy", "drop shoulder" → "oversized"
- "wide leg", "wide-leg", "palazzo", "flare", "bell bottom" → "wide-leg"
- "cropped", "crop" → "cropped"
- Only use "regular" when NO fit/cut keyword is present in the title

━━━ SUB_CATEGORY DECISION RULES ━━━
Read the product title carefully. Use the MOST SPECIFIC matching value:

outer → Look for keywords:
  puffer: "puffer", "down jacket", "quilted coat", "padded jacket"
  trench: "trench"
  blazer: "blazer", "sport coat", "suit jacket"
  bomber: "bomber"
  biker_jacket: "biker", "moto jacket", "motorcycle jacket"
  denim_jacket: "denim jacket", "jean jacket"
  shearling: "shearling", "sherpa jacket", "fleece-lined coat"
  field_jacket: "field jacket", "M-65", "utility jacket" (with multiple pockets)
  windbreaker: "windbreaker", "wind jacket", "anorak" (if lightweight)
  anorak: "anorak" (pullover style)
  parka: "parka" (long, hood, insulated)
  peacoat: "peacoat", "pea coat"
  trench: "trench coat", "trench"
  track_jacket: "track jacket", "zip-up jacket" (athletic)
  coach_jacket: "coach jacket"
  varsity_jacket: "varsity", "letterman"
  harrington: "harrington"
  chore_coat: "chore coat", "chore jacket"
  tweed_jacket: "tweed jacket", "tweed blazer"
  noragi: "noragi"
  cape: "cape" (no sleeves)
  poncho: "poncho"
  kimono: "kimono jacket", "kimono cardigan"
  gilet: "gilet", "vest" (outer, no sleeves)
  shell: "shell jacket", "hard shell"
  faux_fur: "faux fur coat", "faux fur jacket"
  rain_jacket: "rain jacket", "waterproof jacket"
  safari_jacket: "safari jacket"
  leather_trench: "leather trench"
  quilted_jacket: "quilted jacket" (not puffer)
  corduroy_jacket: "corduroy jacket"
  duffle_coat: "duffle coat", "toggle coat"
  coat: use ONLY if no more specific type matches above

mid → Look for keywords:
  hoodie: "hoodie", "hooded sweatshirt"
  sweatshirt: "sweatshirt", "crewneck sweatshirt" (no hood)
  fleece: "fleece pullover", "fleece top" (not jacket)
  half_zip: "half zip", "quarter zip", "1/4 zip"
  mock_neck: "mock neck sweater", "mock turtleneck sweater"
  turtleneck_knit: "turtleneck sweater", "polo neck sweater"
  cable_knit: "cable knit", "cable-knit sweater"
  argyle_sweater: "argyle sweater"
  fair_isle: "fair isle", "nordic sweater"
  cashmere_sweater: "cashmere sweater"
  mohair_knit: "mohair sweater", "mohair knit"
  boucle_knit: "boucle sweater", "boucle knit"
  crochet_cardigan: "crochet cardigan"
  cardigan: "cardigan" (button-front knit)
  zip_knit: "zip-up sweater", "zip knit"
  cricket_jumper: "cricket sweater"
  quilted_vest: "quilted vest"
  down_vest: "down vest", "puffer vest"
  fleece_vest: "fleece vest"
  knitted_vest: "knit vest", "sweater vest"
  vest: "vest" (if mid-layer, not outer)
  sweater: use ONLY if no more specific type matches above
  knit: use ONLY as last resort for knit tops

top → Look for keywords:
  tshirt: "t-shirt", "tee shirt", "tee" (basic, no collar)
  polo: "polo shirt", "polo tee"
  oxford_shirt: "oxford shirt", "oxford cloth"
  linen_shirt: "linen shirt"
  flannel_shirt: "flannel shirt"
  denim_shirt: "denim shirt"
  chambray: "chambray shirt"
  western_shirt: "western shirt", "cowboy shirt", "snap button shirt"
  silk_blouse: "silk blouse", "satin blouse"
  graphic_tee: "graphic tee", "print tee", "band tee" (with graphic)
  band_tee: "band tee", "band t-shirt", "concert tee"
  rugby_shirt: "rugby shirt", "rugby jersey"
  henley: "henley", "henley shirt" (button placket, no collar)
  crop_top: "crop top", "cropped tee", "cropped shirt"
  camisole: "camisole", "cami top", "spaghetti strap top"
  bodysuit: "bodysuit"
  tunic: "tunic top", "tunic blouse"
  corset: "corset top", "bustier"
  breton_stripe: "breton", "sailor stripe shirt", "striped boat neck"
  wrap_top: "wrap top", "wrap blouse"
  peasant_blouse: "peasant blouse", "peasant top", "smock top"
  puff_sleeve: "puff sleeve top", "balloon sleeve", "puff sleeve blouse"
  embroidered_blouse: "embroidered blouse", "embroidered top"
  lace_top: "lace top", "lace blouse"
  mesh_top: "mesh top", "mesh shirt"
  halter_top: "halter top", "halter neck"
  sports_bra: "sports bra"
  performance_tee: "performance tee", "athletic shirt", "moisture-wicking shirt"
  compression_top: "compression top", "compression shirt"
  turtleneck: "turtleneck top", "turtleneck tee" (non-knit)
  tank: "tank top", "sleeveless top", "muscle tank"
  jersey: "jersey top", "football jersey", "sports jersey"
  blouse: "blouse" (dressy, non-specific)
  shirt: use ONLY if no more specific type matches above

bottom → Look for keywords:
  denim: "jeans", "denim pants" (generic straight)
  flared_jeans: "flare jeans", "flared jeans", "bell bottom jeans"
  baggy_jeans: "baggy jeans", "wide leg jeans", "barrel jeans"
  carpenter_pants: "carpenter pants", "carpenter jeans"
  wide_leg: "wide leg pants", "wide-leg trousers" (non-denim)
  pleated_trousers: "pleated trousers", "pleated pants"
  leather_pants: "leather pants", "faux leather pants"
  corduroy_pants: "corduroy pants", "cord trousers"
  parachute_pants: "parachute pants", "nylon pants"
  track_pants: "track pants", "track bottoms"
  linen_trousers: "linen pants", "linen trousers"
  sailor_pants: "sailor pants", "wide leg sailor"
  harem_pants: "harem pants", "MC hammer pants"
  slacks: "dress pants", "slacks", "trousers" (formal)
  chinos: "chinos", "chino pants", "khaki pants"
  jogger: "jogger pants", "joggers"
  cargo: "cargo pants", "cargo shorts" (if length unclear)
  sweatpants: "sweatpants", "fleece pants"
  overalls: "overalls", "dungarees"
  maxi_skirt: "maxi skirt" (ankle length)
  midi_skirt: "midi skirt" (knee to mid-calf)
  mini_skirt: "mini skirt" (above knee)
  pencil_skirt: "pencil skirt"
  pleated_skirt: "pleated skirt"
  wrap_skirt: "wrap skirt"
  tiered_skirt: "tiered skirt", "ruffle skirt"
  velvet_skirt: "velvet skirt"
  silk_skirt: "silk skirt", "satin skirt"
  tennis_skirt: "tennis skirt", "golf skirt"
  leggings: "leggings", "tights" (athletic)
  biker_shorts: "biker shorts", "cycling shorts"
  bermuda_shorts: "bermuda shorts", "long shorts"
  yoga_pants: "yoga pants", "yoga leggings"
  shorts: "shorts" (generic)
  culottes: "culottes"

shoes → Look for keywords:
  sneaker: "sneaker", "trainers" (generic low-top)
  high_top: "high top", "high-top sneaker"
  runner: "running shoes", "running sneakers"
  trail_runner: "trail running", "trail shoes"
  training_shoe: "training shoes", "cross training", "gym shoes"
  chelsea_boot: "chelsea boot"
  combat_boot: "combat boots", "lace-up boots" (chunky)
  ankle_boot: "ankle boots" (general)
  knee_boot: "knee high boots", "knee-high boots"
  hiking_boot: "hiking boots", "trekking boots"
  desert_boot: "desert boots", "chukka boots"
  work_boot: "work boots", "steel toe boots"
  western_boot: "cowboy boots", "western boots"
  tabi: "tabi boots", "tabi shoes"
  boot: "boots" (generic — use only if no specific type matches)
  loafer: "loafers"
  derby: "derby shoes"
  oxford: "oxford shoes"
  brogue: "brogues"
  monk_strap: "monk strap"
  driving_shoe: "driving shoes", "moccasin loafer"
  moccasin: "moccasins"
  boat_shoe: "boat shoes", "topsiders"
  mule: "mules", "backless shoes"
  slide: "slides", "slip-on sandals"
  sandal: "sandals", "strappy sandals"
  espadrille: "espadrilles"
  clog: "clogs"
  mary_jane: "mary janes", "mary jane shoes"
  ballet_flat: "ballet flats", "ballerina flats"
  platform: "platform shoes", "platform sneakers" (use only when platform is primary feature)
  kitten_heel: "kitten heel"
  block_heel: "block heel"
  slingback: "slingback"
  creeper: "creepers"

bag → Look for keywords:
  tote: "tote bag" (open-top, large)
  canvas_tote: "canvas tote"
  backpack: "backpack", "rucksack"
  crossbody: "crossbody bag"
  shoulder_bag: "shoulder bag"
  clutch: "clutch", "evening bag" (no strap)
  satchel: "satchel"
  messenger: "messenger bag"
  bucket_bag: "bucket bag"
  hobo: "hobo bag"
  belt_bag: "belt bag", "fanny pack"
  sling: "sling bag", "sling pack"
  baguette: "baguette bag"
  box_bag: "box bag", "rigid bag"
  frame_bag: "frame bag"
  saddle_bag: "saddle bag"
  doctor_bag: "doctor bag", "top handle bag" (structured)
  wristlet: "wristlet"
  briefcase: "briefcase"
  gym_bag: "gym bag", "duffel bag" (for gym)
  duffle: "duffel bag", "duffle bag" (large)
  camera_bag: "camera bag"
  weekender: "weekender bag", "overnight bag"
  straw_bag: "straw bag", "rattan bag"
  woven_bag: "woven bag", "raffia bag"
  chain_bag: "chain bag", "chain strap bag"
  phone_pouch: "phone bag", "phone pouch"
  sacoche: "sacoche", "hip bag"
  vanity_case: "vanity case", "vanity bag"

accessory → Look for keywords:
  belt: "belt" (waist)
  watch: "watch", "wristwatch"
  sunglasses: "sunglasses", "shades"
  scarf: "scarf" (generic)
  silk_scarf: "silk scarf"
  bandana: "bandana", "bandanna"
  beanie: "beanie", "knit hat"
  cap: "baseball cap", "snapback", "dad hat"
  bucket_hat: "bucket hat"
  beret: "beret"
  wide_brim_hat: "wide brim hat", "sun hat", "floppy hat"
  visor: "visor hat"
  glove: "gloves", "mittens"
  headband: "headband"
  necktie: "necktie", "tie"
  bow_tie: "bow tie"
  suspenders: "suspenders", "braces"
  choker: "choker"
  chain_necklace: "chain necklace"
  pendant: "pendant necklace", "charm necklace"
  pearl_necklace: "pearl necklace"
  hoop_earring: "hoop earrings"
  stud_earring: "stud earrings"
  ring: "ring", "rings"
  bracelet: "bracelet"
  bangle: "bangle"
  brooch: "brooch", "pin badge"
  hair_clip: "hair clip", "hair barrette", "hair pin"
  hair_stick: "hair stick", "hair chopstick"
  anklet: "anklet"
  ear_cuff: "ear cuff"
  tights: "tights", "stockings", "pantyhose"
  wallet_chain: "wallet chain", "chain wallet"

━━━ SEASON DECISION RULES ━━━
Assign seasons based on material and garment type. Return an ARRAY of season strings.
ALLOWED VALUES: "spring", "summer", "fall", "winter" — ONLY these four words, nothing else.
NEVER return "all four seasons", "all seasons", "year-round", or any phrase — use the individual words only.
- ["winter"] ONLY: "wool", "cashmere", "fleece", "down", "puffer", "thermal", "sherpa", "heavy knit", insulated boots
- ["fall", "winter"]: heavier pieces wearable in both cold seasons — tweed, flannel, corduroy, wool blend
- ["summer"] ONLY: sleeveless, tank, shorts, sandals, breathable mesh, swimwear, clearly summer linen
- ["spring", "summer"]: lightweight warm-weather pieces wearable in both
- ["spring", "fall"]: transitional pieces — light jacket, denim jacket, trench coat, cardigan, chinos
- ["spring", "summer", "fall"]: lightweight basics like plain tee, thin cotton shirt, classic sneaker
- ["spring", "fall", "winter"]: merino/wool sweaters that can layer
- ["spring", "summer", "fall", "winter"]: TRUE year-round basics ONLY — plain accessories (scarf, hat, belt, watch), classic denim jeans
- Context season "${season || "all"}" is a strong hint but verify against material/garment type

━━━ COLOR_FAMILY DECISION RULES ━━━
Map the product's dominant color to EXACTLY ONE of these values:
black | white | grey | navy | beige | brown | blue | green | red | yellow | purple | pink | orange | metallic | multi | khaki | cream | ivory | burgundy | wine | olive | mustard | coral | charcoal | tan | camel | rust | sage | mint | lavender | teal | sky_blue | denim

Color mapping guide:
- "black", "jet black", "onyx" → black
- "white", "bright white" → white
- "gray", "grey", "heather grey", "light grey", "slate" → grey
- "charcoal", "dark grey", "anthracite" → charcoal
- "navy", "navy blue", "dark navy", "midnight blue" → navy
- "blue", "royal blue", "cobalt", "electric blue" → blue
- "sky blue", "light blue", "baby blue", "powder blue", "periwinkle" → sky_blue
- "denim", "indigo" → denim
- "teal", "cyan", "turquoise", "aqua" → teal
- "green", "forest green", "dark green", "hunter green", "emerald" → green
- "sage", "light green", "mint green", "sage green", "eucalyptus" → sage
- "mint", "seafoam" → mint
- "olive", "military green", "army green", "khaki green" → olive
- "khaki", "tan khaki", "stone" → khaki
- "brown", "chocolate", "espresso", "walnut" → brown
- "tan", "light brown", "sand", "wheat" → tan
- "camel", "caramel", "cognac" → camel
- "beige", "nude", "taupe", "warm beige" → beige
- "cream", "off-white", "off white" → cream
- "ivory", "ecru", "eggshell" → ivory
- "red", "tomato", "scarlet", "cherry" → red
- "burgundy", "wine red", "maroon", "oxblood" → burgundy
- "wine", "deep wine", "bordeaux" → wine
- "rust", "terracotta", "burnt orange" → rust
- "coral", "salmon", "peach" → coral
- "orange", "amber", "tangerine" → orange
- "yellow", "lemon", "butter yellow" → yellow
- "mustard", "golden yellow", "ochre" → mustard
- "pink", "hot pink", "rose pink", "blush pink", "fuchsia" → pink
- "lavender", "lilac", "mauve", "light purple" → lavender
- "purple", "violet", "plum", "dark purple", "grape" → purple
- "gold", "silver", "bronze", "metallic" → metallic
- "multicolor", "multi-color", "tie-dye", "printed pattern" → multi

Extract and return ONLY a valid JSON object:
{
  "brand": "brand name (extract from title if not given)",
  "name": "clean product name without brand (max 80 chars)",
  "category": "one of: outer|mid|top|bottom|shoes|bag|accessory",
  "sub_category": "use the decision rules above — pick the MOST SPECIFIC matching value",
  "gender": "MALE|FEMALE|UNISEX",
  "color": "specific color name from title e.g. 'Navy Blue', 'Charcoal Grey'",
  "color_family": "use the color decision rules above — pick EXACTLY ONE value",
  "color_tone": "warm (brown/orange/yellow/red/olive/rust/camel/mustard/coral) | cool (blue/green/purple/grey/navy/teal/sage/mint/lavender) | neutral (black/white/beige/cream/ivory/charcoal/tan)",
  "silhouette": "one of: slim|regular|oversized|relaxed|fitted|wide-leg|straight|cropped",
  "material": "primary material e.g. '100% Cotton', 'Polyester Blend'",
  "pattern": "solid|stripe|check|graphic|print|other",
  "vibe": ["array — pick ALL that genuinely match from: ELEVATED_COOL, EFFORTLESS_NATURAL, ARTISTIC_MINIMAL, RETRO_LUXE, SPORT_MODERN, CREATIVE_LAYERED"],
  "body_type": ["array from: slim, regular, plus-size — MUST include ${body_type || "regular"}"],
  "season": ["array — use the season decision rules above — be precise, do NOT default to all four"],
  "formality": 3,
  "warmth": 3,
  "stock_status": "in_stock"
}

━━━ MATERIAL DECISION RULES ━━━
Extract material from the product title. Use these patterns:
- "cotton", "100% cotton", "pima cotton", "supima" → "100% Cotton"
- "linen", "100% linen" → "100% Linen"
- "wool", "merino wool", "merino", "lambswool", "shetland" → "Wool" or "Merino Wool"
- "cashmere" → "Cashmere"
- "mohair" → "Mohair"
- "silk", "100% silk" → "100% Silk"
- "satin" → "Satin"
- "polyester", "poly" → "Polyester"
- "nylon", "ripstop nylon" → "Nylon"
- "acrylic" → "Acrylic"
- "viscose", "rayon" → "Viscose"
- "spandex", "elastane", "lycra" → include as blend e.g. "Cotton/Spandex"
- "denim" → "Denim"
- "leather", "genuine leather", "real leather" → "Leather"
- "faux leather", "vegan leather", "PU leather" → "Faux Leather"
- "suede", "microsuede" → "Suede"
- "fleece", "polar fleece", "sherpa" → "Fleece"
- "velvet" → "Velvet"
- "tweed" → "Tweed"
- "corduroy" → "Corduroy"
- "canvas" → "Canvas"
- "oxford cloth" → "Oxford Cloth"
- "chambray" → "Chambray"
- "poplin" → "Poplin"
- "jersey", "jersey knit" → "Jersey"
- "tech fabric", "performance fabric", "moisture-wicking", "quick-dry" → "Technical Fabric"
- "down", "goose down", "duck down" → "Down"
- "recycled polyester", "recycled material" → "Recycled Polyester"
- If no material is mentioned in the title, infer from sub_category:
  denim/flared_jeans/baggy_jeans → "Denim"
  leather_pants/biker_jacket → "Faux Leather" (default unless title says genuine)
  hoodie/sweatshirt → "Cotton Fleece"
  tshirt → "Cotton"
  linen_shirt → "Linen"
  silk_blouse → "Silk"
  puffer/down_vest → "Down Fill"
  fleece/fleece_vest → "Fleece"
  corduroy_pants/corduroy_jacket → "Corduroy"
  tweed_jacket → "Tweed"
  cable_knit/cashmere_sweater/knit → "Knit"
  sneaker/runner/trail_runner → "Mesh/Synthetic"
  boot/chelsea_boot/combat_boot → "Leather" or "Synthetic"
  sandal/slide/mule → "Synthetic" or "Leather"

━━━ PATTERN DECISION RULES ━━━
- solid: single color, no visible pattern
- stripe: horizontal, vertical, or diagonal stripes (breton, rugby, striped)
- check: plaid, tartan, houndstooth, argyle, gingham, windowpane
- graphic: logo, artwork, text print, geometric shapes, abstract design
- print: floral, animal print, camouflage, tie-dye, paisley, tropical, all-over pattern
- other: unusual or mixed patterns not fitting above
Keywords:
  "striped", "stripe", "breton" → stripe
  "plaid", "tartan", "houndstooth", "gingham", "argyle", "check", "windowpane" → check
  "graphic", "logo", "text", "slogan", "art print", "geometric" → graphic
  "floral", "flower", "botanical", "animal print", "leopard", "zebra", "snake", "camo", "camouflage", "tie-dye", "paisley", "tropical", "all-over" → print
  "solid", "plain", single color mentioned → solid

━━━ SILHOUETTE DECISION RULES ━━━
Determine from garment cut, NOT from body type (body type affects body_type field only):
- slim: slim-fit jeans, skinny pants, fitted shirts, slim-cut blazers, pencil skirts
- fitted: fitted tops, bodycon, structured bodysuits, performance wear
- straight: straight-leg jeans, straight-cut trousers, classic button-down shirts
- regular: standard fit items without notable silhouette description
- relaxed: relaxed-fit, easy-fit, comfort-fit items
- oversized: oversized tees, boxy cuts, drop-shoulder, oversized hoodies/coats
- wide-leg: wide-leg pants/jeans, palazzo, culottes, wide-leg trousers
- cropped: cropped jackets, cropped tops, cropped blazers (shorter-than-standard length)
Title keywords:
  "slim fit", "skinny", "slim-cut", "tapered" → slim
  "fitted", "form-fitting", "bodycon" → fitted
  "straight leg", "straight-fit", "straight cut" → straight
  "relaxed fit", "easy fit", "comfort fit", "loose" → relaxed
  "oversized", "boxy", "drop shoulder" → oversized
  "wide leg", "wide-leg", "palazzo", "flare" → wide-leg
  "cropped", "crop" → cropped
  No keyword → use "regular"

━━━ GENDER DECISION RULES ━━━
- MALE: "men's", "mens", "for men", "man's", "him", "his", "boys'" in title
- FEMALE: "women's", "womens", "for women", "ladies'", "lady", "girls'", "her", "feminine" in title
- UNISEX: "unisex", no gender keyword, or clearly gender-neutral basics
Context gender is "${gender}" — use it as the default if no title keyword contradicts it.

━━━ VIBE DECISION RULES ━━━
Assign vibe tags based on the ITEM's aesthetic, not just the search context vibe.
Multiple vibes allowed if the item genuinely fits more than one.

ELEVATED_COOL: structured, minimalist luxury items — blazers, trench coats, leather pieces, tailored trousers, sleek sneakers, box bags, silver hardware. Dark palette (black/navy/charcoal/white). Clean lines.
EFFORTLESS_NATURAL: organic, relaxed, earthy items — linen shirts, waffle knits, chore coats, vintage denim, canvas totes, suede mules, straw bags. Neutral/earthy palette.
ARTISTIC_MINIMAL: sculptural, asymmetric, avant-garde items — cape coats, tabi boots, culottes, architectural bags, mohair knits, draped pieces. Monochrome or muted palette.
RETRO_LUXE: vintage-inspired, rich-texture items — corduroy, tweed, velvet, shearling, flared jeans, platform shoes, saddle bags, pearl jewelry. Warm earthy palette (burgundy/camel/brown).
SPORT_MODERN: athletic, technical, utilitarian items — hoodies, joggers, puffer jackets, sneakers, track pants, gym bags, sports bras, technical fabrics. Functional aesthetic.
CREATIVE_LAYERED: eclectic, expressive items — band tees, combat boots, cargo pants, denim jackets, chain bags, layering pieces. Mixing textures/styles. Bold accent colors.

━━━ FORMALITY & WARMTH SCALES ━━━
formality (1-5 integer) — assign the EXACT value based on the sub_category:
  1 = athleisure/loungewear: sports_bra, leggings, jogger, track_pants, hoodie, sweatshirt, slides, biker_shorts, yoga_pants, performance_tee
  2 = casual: tshirt, graphic_tee, jeans, denim, sneaker, runner, casual dress, sweatshirt, tank, crop_top, baggy_jeans, flared_jeans, cargo, shorts
  3 = smart-casual: chinos, blouse, polo, loafer, cardigan, cable_knit, turtleneck_knit, midi_skirt, wrap_top, henley, oxford_shirt, derby, ankle_boot, crossbody, tote, canvas_tote, flannel_shirt
  4 = business-casual: blazer, trench, dress_shirt, slacks, wide_leg, pleated_trousers, silk_blouse, heel, structured_bag, satchel, briefcase, oxford, monk_strap
  5 = formal/evening: tuxedo_jacket, suit_jacket, evening_gown, necktie, bow_tie, formal_shoes, luxury_accessories
  IMPORTANT: Do NOT default to 3 without reading the sub_category. Most casual items are 1-2. Most outerwear is 2-3.

warmth (1-5 integer) — assign based on MATERIAL and GARMENT TYPE:
  1 = very light: sleeveless, tank, shorts, sandal, slide, mule, ballet_flat, linen top, camisole, sports_bra, mesh_top
  2 = light: tshirt, thin_shirt, light_blouse, linen_trousers, chinos, jogger, leggings, sneaker, runner, loafer, canvas_tote
  3 = medium: sweatshirt, hoodie, denim, jeans, cargo_pants, mid-weight cardigan, light_jacket, ankle_boot, medium_knit
  4 = warm: sweater (wool/cashmere/cable_knit), blazer, trench, leather jacket, biker_jacket, bomber, boot, coat (mid-weight), corduroy, velvet
  5 = very warm: puffer, down_jacket, parka, shearling, sherpa, heavy_wool_coat, fleece_jacket, duffle_coat
  IMPORTANT: Do NOT default to 3 without reading the garment. Puffers/parkas = 5. Sweaters = 4. Tshirts = 2. Tanks = 1.

body_type array MUST include "${body_type || "regular"}"
FINAL REMINDER: Return ONLY valid JSON. ALL string values must be in English. No Korean, no markdown, no explanation.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
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

    const VALID_SEASONS = new Set(["spring", "summer", "fall", "winter"]);
    const normalizeSeason = (raw: any): string[] => {
      if (!Array.isArray(raw)) {
        if (typeof raw === "string") {
          const lower = raw.toLowerCase();
          if (lower.includes("all") || lower.includes("year")) return ["spring", "summer", "fall", "winter"];
          const found = ["spring", "summer", "fall", "winter"].filter(s => lower.includes(s));
          return found.length > 0 ? found : ["spring", "fall"];
        }
        return ["spring", "fall"];
      }
      const cleaned: string[] = [];
      for (const item of raw) {
        if (typeof item !== "string") continue;
        const lower = item.toLowerCase().trim();
        if (lower.includes("all") || lower.includes("year") || lower.includes("four") || lower.includes("season")) {
          return ["spring", "summer", "fall", "winter"];
        }
        const matches = ["spring", "summer", "fall", "winter"].filter(s => lower.includes(s));
        for (const m of matches) {
          if (!cleaned.includes(m)) cleaned.push(m);
        }
        if (VALID_SEASONS.has(lower) && !cleaned.includes(lower)) cleaned.push(lower);
      }
      return cleaned.length > 0 ? cleaned : ["spring", "fall"];
    };

    const DETERMINISTIC_COLOR_TONE: Record<string, string> = {
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

    const VAGUE_SUB_CATEGORIES: Record<string, Record<string, string>> = {
      outer: { coat: "coat", jacket: "coat", outer: "coat" },
      mid: { knit: "sweater", sweater: "sweater", mid: "sweater" },
      top: { shirt: "shirt", top: "tshirt" },
      bottom: { bottom: "denim", pants: "denim" },
      shoes: { boot: "boot", shoe: "sneaker", shoes: "sneaker" },
      bag: { bag: "tote" },
    };

    const refineSubCategory = (subCat: string, category: string, title: string): string => {
      const lc = (subCat || "").toLowerCase().trim();
      const t = title.toLowerCase();
      const vagueMap = VAGUE_SUB_CATEGORIES[category];
      if (!vagueMap || !vagueMap[lc]) return subCat;
      if (category === "outer") {
        if (/puffer|down jacket|padded/.test(t)) return "puffer";
        if (/trench/.test(t)) return "trench";
        if (/blazer|sport coat/.test(t)) return "blazer";
        if (/bomber/.test(t)) return "bomber";
        if (/biker|moto/.test(t)) return "biker_jacket";
        if (/denim jacket|jean jacket/.test(t)) return "denim_jacket";
        if (/shearling|sherpa jacket/.test(t)) return "shearling";
        if (/parka/.test(t)) return "parka";
        if (/peacoat|pea coat/.test(t)) return "peacoat";
        if (/windbreaker/.test(t)) return "windbreaker";
        if (/varsity|letterman/.test(t)) return "varsity_jacket";
        if (/track jacket/.test(t)) return "track_jacket";
        if (/leather/.test(t)) return "biker_jacket";
        if (/wool|overcoat/.test(t)) return "coat";
        if (/suede|fringe/.test(t)) return "field_jacket";
      }
      if (category === "mid") {
        if (/quarter.?zip|half.?zip|1\/4 zip/.test(t)) return "half_zip";
        if (/cable.?knit/.test(t)) return "cable_knit";
        if (/mohair/.test(t)) return "mohair_knit";
        if (/crochet/.test(t)) return "crochet_cardigan";
        if (/cardigan/.test(t)) return "cardigan";
        if (/mock.?neck/.test(t)) return "mock_neck";
        if (/turtleneck/.test(t)) return "turtleneck_knit";
        if (/cashmere/.test(t)) return "cashmere_sweater";
        if (/hoodie|hooded/.test(t)) return "hoodie";
        if (/sweatshirt/.test(t)) return "sweatshirt";
      }
      if (category === "top") {
        if (/oxford/.test(t)) return "oxford_shirt";
        if (/flannel/.test(t)) return "flannel_shirt";
        if (/linen shirt/.test(t)) return "linen_shirt";
        if (/henley/.test(t)) return "henley";
        if (/polo/.test(t)) return "polo";
      }
      if (category === "shoes") {
        if (/chelsea/.test(t)) return "chelsea_boot";
        if (/combat/.test(t)) return "combat_boot";
        if (/ankle/.test(t)) return "ankle_boot";
        if (/knee.?high/.test(t)) return "knee_boot";
        if (/hiking/.test(t)) return "hiking_boot";
        if (/western|cowboy/.test(t)) return "western_boot";
      }
      return vagueMap[lc] || subCat;
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
    const normalizedCategory = VALID_CATEGORIES.has(analyzed.category) ? analyzed.category : "top";
    const normalizedColorFamily = normalizeColorFamily(analyzed.color_family);
    const normalizedMaterial = normalizeMaterial(analyzed.material || "");
    const normalizedSeason = normalizeSeason(analyzed.season);
    const refinedSubCategory = refineSubCategory(analyzed.sub_category || "", normalizedCategory, product.title || "");

    // color_tone: always derive deterministically from color_family to prevent Gemini errors
    const colorTone = DETERMINISTIC_COLOR_TONE[normalizedColorFamily] || "neutral";

    // silhouette: re-derive from title if Gemini returned "regular" but title has keywords
    let normalizedSilhouette = VALID_SILHOUETTES.has(analyzed.silhouette) ? analyzed.silhouette : "regular";
    if (normalizedSilhouette === "regular") {
      const t = (product.title || "").toLowerCase();
      if (/slim.?fit|skinny|slim.?cut|tapered/.test(t)) normalizedSilhouette = "slim";
      else if (/fitted|form.?fitting|bodycon/.test(t)) normalizedSilhouette = "fitted";
      else if (/straight.?leg|straight.?fit|straight.?cut/.test(t)) normalizedSilhouette = "straight";
      else if (/relaxed.?fit|easy.?fit|comfort.?fit|\bloose\b/.test(t)) normalizedSilhouette = "relaxed";
      else if (/oversized|boxy|drop.?shoulder/.test(t)) normalizedSilhouette = "oversized";
      else if (/wide.?leg|palazzo|flare|bell.?bottom/.test(t)) normalizedSilhouette = "wide-leg";
      else if (/\bcropped\b|\bcrop\b/.test(t)) normalizedSilhouette = "cropped";
    }

    let vibeArray: string[] = Array.isArray(analyzed.vibe) ? analyzed.vibe : [vibe];

    const VALID_VIBES = new Set(Object.keys(VIBE_DNA));
    vibeArray = vibeArray.filter(v => VALID_VIBES.has(v));
    if (vibeArray.length === 0) vibeArray = [vibe || 'EFFORTLESS_NATURAL'];

    const validatedVibes: string[] = [];
    for (const v of vibeArray) {
      const isValid = validateVibeTag(v, normalizedCategory, refinedSubCategory);
      if (isValid) validatedVibes.push(v);
    }
    if (validatedVibes.length === 0) validatedVibes.push(vibe || vibeArray[0]);

    const primaryVibe = validatedVibes[0];
    const colorValidation = validateColorForVibe(normalizedColorFamily, primaryVibe);

    let formality = typeof analyzed.formality === "number" ? Math.min(5, Math.max(1, analyzed.formality)) : 3;
    formality = clampFormality(formality, primaryVibe);

    let warmth = typeof analyzed.warmth === "number" ? Math.min(5, Math.max(1, analyzed.warmth)) : 3;

    const result = {
      brand: analyzed.brand || product.brand || "",
      name: analyzed.name || product.title,
      category: normalizedCategory,
      sub_category: refinedSubCategory,
      gender: ["MALE", "FEMALE", "UNISEX"].includes(analyzed.gender) ? analyzed.gender : (gender || "UNISEX"),
      color: analyzed.color || "",
      color_family: normalizedColorFamily,
      color_tone: colorTone,
      silhouette: normalizedSilhouette,
      material: normalizedMaterial,
      pattern: normalizePattern(analyzed.pattern),
      vibe: validatedVibes,
      body_type: Array.isArray(analyzed.body_type) ? analyzed.body_type : [body_type || "regular"],
      season: normalizedSeason,
      formality,
      warmth,
      stock_status: "in_stock",
      image_url: upgradeImageResolution(product.image || ""),
      product_link: product.url || "",
      price: product.price != null ? Math.round(product.price) : null,
    };

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: insertedRow, error: insertError } = await adminClient
      .from("products")
      .insert(result)
      .select("id")
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message, detail: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const productId = insertedRow?.id as string | undefined;

    if (productId) {
      EdgeRuntime.waitUntil(
        triggerNobgPipeline(
          productId,
          upgradeImageResolution(product.image || ""),
          result.category,
          result.sub_category,
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          adminClient
        )
      );
    }

    return new Response(
      JSON.stringify({
        result: { ...result, id: productId },
        vibe_validation: {
          original_vibes: Array.isArray(analyzed.vibe) ? analyzed.vibe : [vibe],
          validated_vibes: validatedVibes,
          color_tier: colorValidation.tier,
          formality_clamped: formality !== analyzed.formality,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
