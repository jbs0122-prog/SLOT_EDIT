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

    const prompt = `You are a fashion product data specialist. Analyze this Amazon product and return structured metadata.

Product:
- Title: ${product.title}
- Brand: ${product.brand || "unknown"}
- Price: ${product.price ? `$${product.price}` : "unknown"}
- Search context — Gender: ${gender}, Body type: ${bodyDesc}, Vibe: ${vibe}, Season: ${season || "all"}
${vibeGuidanceSection}
IMPORTANT: The body type is "${body_type}". The silhouette MUST match:
- slim → use "slim" or "fitted"
- regular → use "regular" or "straight"
- plus-size → use "relaxed" or "oversized"

Extract and return ONLY a valid JSON object with these exact fields:
{
  "brand": "brand name (extract from title if not given)",
  "name": "clean product name without brand (max 80 chars)",
  "category": "one of: outer|mid|top|bottom|shoes|bag|accessory",
  "sub_category": "Pick the MOST SPECIFIC value from the list below based on the detected category:
    outer: puffer|coat|blazer|jacket|trench|bomber|parka|peacoat|anorak|windbreaker|duffle_coat|biker_jacket|denim_jacket|coach_jacket|varsity_jacket|shearling|field_jacket|harrington|quilted_jacket|corduroy_jacket|cape|poncho|kimono|noragi|chore_coat|safari_jacket|utility_jacket|shell|gilet|faux_fur|rain_jacket|track_jacket|shacket|leather_trench|tweed_jacket
    mid: knit|cardigan|sweater|vest|fleece|hoodie|sweatshirt|half_zip|turtleneck_knit|cable_knit|argyle_sweater|fair_isle|cricket_jumper|mock_neck|zip_knit|quilted_vest|down_vest|fleece_vest|knitted_vest|cashmere_sweater|boucle_knit|mohair_knit|crochet_cardigan
    top: tshirt|shirt|polo|turtleneck|tank|blouse|oxford_shirt|linen_shirt|silk_blouse|graphic_tee|rugby_shirt|henley|crop_top|camisole|bodysuit|tunic|corset|breton_stripe|band_tee|jersey|wrap_top|peasant_blouse|puff_sleeve|flannel_shirt|denim_shirt|chambray|western_shirt|sports_bra|performance_tee|compression_top|mesh_top|lace_top|embroidered_blouse|halter_top
    bottom: denim|slacks|chinos|jogger|cargo|shorts|wide_leg|culottes|pleated_trousers|leather_pants|corduroy_pants|parachute_pants|track_pants|linen_trousers|maxi_skirt|midi_skirt|mini_skirt|pencil_skirt|pleated_skirt|wrap_skirt|flared_jeans|baggy_jeans|carpenter_pants|overalls|bermuda_shorts|biker_shorts|leggings|yoga_pants|sweatpants|sailor_pants|harem_pants|velvet_skirt|silk_skirt|tiered_skirt|tennis_skirt
    shoes: sneaker|derby|loafer|boot|runner|chelsea_boot|combat_boot|ankle_boot|knee_boot|hiking_boot|desert_boot|work_boot|mule|slide|sandal|espadrille|clog|mary_jane|ballet_flat|oxford|brogue|monk_strap|platform|kitten_heel|block_heel|slingback|boat_shoe|moccasin|western_boot|tabi|driving_shoe|trail_runner|training_shoe|high_top|creeper
    bag: tote|backpack|crossbody|duffle|clutch|shoulder_bag|satchel|messenger|bucket_bag|hobo|belt_bag|sling|baguette|box_bag|frame_bag|saddle_bag|doctor_bag|wristlet|briefcase|gym_bag|camera_bag|weekender|straw_bag|woven_bag|canvas_tote|chain_bag|phone_pouch|sacoche|vanity_case
    accessory: necktie|belt|cap|scarf|glove|watch|sunglasses|beanie|bucket_hat|beret|headband|choker|chain_necklace|pendant|pearl_necklace|hoop_earring|stud_earring|ring|bracelet|bangle|brooch|hair_clip|bow_tie|suspenders|silk_scarf|bandana|anklet|ear_cuff|hair_stick|tights|wide_brim_hat|visor|wallet_chain",
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
- For sub_category, always prefer the MOST SPECIFIC type from the list. For example, use "bomber" instead of generic "jacket", "chelsea_boot" instead of generic "boot", "oxford_shirt" instead of generic "shirt"
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

    const normalizedCategory = VALID_CATEGORIES.has(analyzed.category) ? analyzed.category : "top";
    const normalizedColorFamily = normalizeColorFamily(analyzed.color_family);

    let vibeArray: string[] = Array.isArray(analyzed.vibe) ? analyzed.vibe : [vibe];

    // #7: Cross-validate vibe tags against VIBE_ITEM_DATABASE pools
    const VALID_VIBES = new Set(Object.keys(VIBE_DNA));
    vibeArray = vibeArray.filter(v => VALID_VIBES.has(v));
    if (vibeArray.length === 0) vibeArray = [vibe || 'EFFORTLESS_NATURAL'];

    const validatedVibes: string[] = [];
    for (const v of vibeArray) {
      const isValid = validateVibeTag(v, normalizedCategory, analyzed.sub_category || '');
      if (isValid) {
        validatedVibes.push(v);
      }
    }
    if (validatedVibes.length === 0) {
      validatedVibes.push(vibe || vibeArray[0]);
    }

    // #8: Validate color_family against vibe color palette
    const primaryVibe = validatedVibes[0];
    const colorValidation = validateColorForVibe(normalizedColorFamily, primaryVibe);
    if (!colorValidation.valid) {
      const vibeColorFamilies = getVibeColorFamilies(primaryVibe);
      const allVibeColors = Array.from(vibeColorFamilies);
      const closestColor = allVibeColors.find(c =>
        normalizedColorFamily.includes(c) || c.includes(normalizedColorFamily)
      );
      if (closestColor && VALID_COLOR_FAMILIES.has(closestColor)) {
        // intentionally not overriding — we keep original but flag it
      }
    }

    // #9: Clamp formality to vibe's range
    let formality = typeof analyzed.formality === "number" ? Math.min(5, Math.max(1, analyzed.formality)) : 3;
    formality = clampFormality(formality, primaryVibe);

    const result = {
      brand: analyzed.brand || product.brand || "",
      name: analyzed.name || product.title,
      category: normalizedCategory,
      sub_category: analyzed.sub_category || "",
      gender: ["MALE", "FEMALE", "UNISEX"].includes(analyzed.gender) ? analyzed.gender : (gender || "UNISEX"),
      color: analyzed.color || "",
      color_family: normalizedColorFamily,
      color_tone: VALID_COLOR_TONES.has(analyzed.color_tone) ? analyzed.color_tone : "neutral",
      silhouette: VALID_SILHOUETTES.has(analyzed.silhouette) ? analyzed.silhouette : "regular",
      material: analyzed.material || "",
      pattern: normalizePattern(analyzed.pattern),
      vibe: validatedVibes,
      body_type: Array.isArray(analyzed.body_type) ? analyzed.body_type : [body_type || "regular"],
      season: Array.isArray(analyzed.season) ? analyzed.season : [season || "all"],
      formality,
      warmth: typeof analyzed.warmth === "number" ? Math.min(5, Math.max(1, analyzed.warmth)) : 3,
      stock_status: "in_stock",
      image_url: upgradeImageResolution(product.image || ""),
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
      JSON.stringify({
        result,
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
