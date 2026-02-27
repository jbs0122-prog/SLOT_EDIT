import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VibeDNA {
  formality_range: [number, number];
  preferred_tonal_strategy: string[];
  silhouette_preference: string[];
  texture_rules: {
    preferred_textures: string[];
    forbidden_textures?: string[];
  };
  color_palette: {
    primary: string[];
    secondary: string[];
    accent: string[];
    max_accent_ratio: number;
  };
  proportion_style: string;
  material_preferences: string[];
  era_mood_tags: string[];
}

interface VibeLook {
  name: string;
  materials: string[];
  dna_overrides?: Partial<VibeDNA>;
}

interface OutfitContext {
  existing_colors?: string[];
  existing_materials?: string[];
  target_slot?: string;
}

const VIBE_DNA: Record<string, VibeDNA> = {
  elevated_cool: {
    formality_range: [5, 9],
    preferred_tonal_strategy: ['tone-on-tone', 'contrast'],
    silhouette_preference: ['I', 'V'],
    texture_rules: { preferred_textures: ['structured', 'matte', 'sheen'] },
    color_palette: {
      primary: ['black', 'charcoal', 'navy', 'white'],
      secondary: ['grey', 'cream', 'camel'],
      accent: ['burgundy', 'metallic', 'wine'],
      max_accent_ratio: 0.10,
    },
    proportion_style: 'column',
    material_preferences: ['structured', 'luxe', 'classic'],
    era_mood_tags: ['minimalist', 'architectural', 'city-noir'],
  },
  effortless_natural: {
    formality_range: [2, 6],
    preferred_tonal_strategy: ['tone-in-tone', 'tone-on-tone'],
    silhouette_preference: ['A', 'H', 'I'],
    texture_rules: { preferred_textures: ['matte', 'rough', 'smooth'], forbidden_textures: ['sheen'] },
    color_palette: {
      primary: ['beige', 'cream', 'ivory', 'white'],
      secondary: ['olive', 'khaki', 'tan', 'sage', 'brown'],
      accent: ['rust', 'mustard', 'burgundy'],
      max_accent_ratio: 0.15,
    },
    proportion_style: 'relaxed',
    material_preferences: ['classic', 'eco', 'knit'],
    era_mood_tags: ['japandi', 'french-casual', 'organic', 'wabi-sabi'],
  },
  artistic_minimal: {
    formality_range: [3, 8],
    preferred_tonal_strategy: ['tone-on-tone', 'contrast'],
    silhouette_preference: ['I', 'A', 'Y'],
    texture_rules: { preferred_textures: ['structured', 'matte', 'rough'] },
    color_palette: {
      primary: ['black', 'white', 'grey', 'charcoal'],
      secondary: ['cream', 'beige', 'navy'],
      accent: ['rust', 'olive', 'burgundy'],
      max_accent_ratio: 0.10,
    },
    proportion_style: 'column',
    material_preferences: ['classic', 'structured', 'eco', 'knit'],
    era_mood_tags: ['avant-garde', 'gallery', 'architectural', 'deconstructed'],
  },
  retro_luxe: {
    formality_range: [3, 8],
    preferred_tonal_strategy: ['tone-in-tone', 'contrast'],
    silhouette_preference: ['A', 'X', 'I'],
    texture_rules: { preferred_textures: ['smooth', 'sheen', 'rough'] },
    color_palette: {
      primary: ['burgundy', 'navy', 'brown', 'cream'],
      secondary: ['camel', 'olive', 'wine', 'beige'],
      accent: ['rust', 'mustard', 'teal', 'gold'],
      max_accent_ratio: 0.20,
    },
    proportion_style: 'balanced',
    material_preferences: ['luxe', 'structured', 'classic', 'knit'],
    era_mood_tags: ['70s', 'heritage', 'cinematic', 'old-money'],
  },
  sport_modern: {
    formality_range: [0, 4],
    preferred_tonal_strategy: ['contrast', 'tone-on-tone'],
    silhouette_preference: ['I', 'V'],
    texture_rules: { preferred_textures: ['smooth', 'matte', 'structured'] },
    color_palette: {
      primary: ['black', 'grey', 'white', 'navy'],
      secondary: ['olive', 'khaki', 'charcoal'],
      accent: ['orange', 'teal', 'red', 'green'],
      max_accent_ratio: 0.15,
    },
    proportion_style: 'balanced',
    material_preferences: ['technical', 'casual', 'blend'],
    era_mood_tags: ['gorpcore', 'athleisure', 'tech-wear', 'sport'],
  },
  creative_layered: {
    formality_range: [0, 5],
    preferred_tonal_strategy: ['contrast', 'tone-in-tone'],
    silhouette_preference: ['V', 'A', 'Y'],
    texture_rules: { preferred_textures: ['rough', 'matte', 'sheen'] },
    color_palette: {
      primary: ['black', 'grey', 'white', 'denim'],
      secondary: ['burgundy', 'brown', 'olive', 'navy'],
      accent: ['red', 'purple', 'orange', 'pink', 'yellow'],
      max_accent_ratio: 0.25,
    },
    proportion_style: 'top-heavy',
    material_preferences: ['structured', 'casual', 'classic', 'sheer'],
    era_mood_tags: ['grunge', 'punk', 'DIY', 'eclectic', 'vintage'],
  },
};

const VIBE_LOOKS: Record<string, Record<string, VibeLook>> = {
  elevated_cool: {
    A: { name: 'Downtown Tailoring', materials: ['fine wool', 'stiff cotton', 'smooth leather', 'cashmere', 'silk', 'gabardine', 'poplin', 'neoprene', 'satin', 'silver'] },
    B: { name: 'Neo-Prep Edge', materials: ['tweed', 'corduroy', 'denim', 'cable-knit', 'velvet', 'waxed cotton', 'suede', 'quilted nylon', 'wool', 'leather'], dna_overrides: { formality_range: [3, 7], silhouette_preference: ['I', 'H'], proportion_style: 'balanced', era_mood_tags: ['ivy-league', 'neo-prep', 'dark-academia'] } },
    C: { name: 'High-End Street', materials: ['nylon', 'leather', 'tech-fleece', 'mesh', 'neoprene', 'denim', 'jersey', 'rubber', 'reflective', 'faux fur'], dna_overrides: { formality_range: [2, 6], silhouette_preference: ['V', 'Y'], proportion_style: 'top-heavy', era_mood_tags: ['streetwear', 'tech', 'urban'] } },
  },
  effortless_natural: {
    A: { name: 'Japandi Flow', materials: ['linen', 'cotton', 'raw silk', 'cashmere', 'gauze', 'hemp', 'wool', 'canvas', 'knit', 'waffle'], dna_overrides: { formality_range: [1, 5], era_mood_tags: ['japandi', 'wabi-sabi', 'zen'] } },
    B: { name: 'French Casual', materials: ['cotton', 'silk', 'wool', 'cashmere', 'linen', 'denim', 'boucle', 'tweed', 'leather', 'velvet'], dna_overrides: { formality_range: [3, 7], proportion_style: 'balanced', era_mood_tags: ['french-casual', 'parisian', 'effortless-chic'] } },
    C: { name: 'Soft Amekaji', materials: ['denim', 'flannel', 'canvas', 'waxed cotton', 'wool', 'corduroy', 'heavy cotton', 'leather', 'fleece', 'chambray'], dna_overrides: { formality_range: [1, 5], silhouette_preference: ['H', 'A'], era_mood_tags: ['amekaji', 'workwear', 'heritage'] } },
  },
  artistic_minimal: {
    A: { name: 'Gallery Mono', materials: ['wool', 'cotton', 'linen', 'silk', 'neoprene', 'organza', 'jersey', 'canvas', 'felt', 'rubber'] },
    B: { name: 'Wabi-Sabi Craft', materials: ['linen', 'hemp', 'raw silk', 'wool', 'cotton', 'gauze', 'paper', 'ceramic', 'stone', 'leather'], dna_overrides: { formality_range: [2, 6], era_mood_tags: ['wabi-sabi', 'craft', 'handmade'] } },
    C: { name: 'Avant-Garde Edge', materials: ['leather', 'neoprene', 'mesh', 'vinyl', 'silk', 'wool', 'rubber', 'metal', 'denim', 'jersey'], dna_overrides: { formality_range: [3, 8], silhouette_preference: ['V', 'Y'], era_mood_tags: ['avant-garde', 'deconstructed', 'experimental'] } },
  },
  retro_luxe: {
    A: { name: '70s Bohemian', materials: ['suede', 'velvet', 'crochet', 'silk', 'leather', 'denim', 'cotton', 'macrame', 'lace', 'embroidery'] },
    B: { name: 'Heritage Classic', materials: ['tweed', 'wool', 'cashmere', 'leather', 'silk', 'corduroy', 'denim', 'flannel', 'cotton', 'linen'], dna_overrides: { formality_range: [4, 8], era_mood_tags: ['heritage', 'old-money', 'ivy-league'] } },
    C: { name: 'Cinematic Glam', materials: ['satin', 'velvet', 'silk', 'leather', 'brocade', 'sequin', 'fur', 'cashmere', 'organza', 'gold'], dna_overrides: { formality_range: [5, 9], silhouette_preference: ['X', 'A'], era_mood_tags: ['cinematic', 'glamour', 'hollywood'] } },
  },
  sport_modern: {
    A: { name: 'Gorpcore', materials: ['gore-tex', 'ripstop', 'fleece', 'nylon', 'cordura', 'mesh', 'rubber', 'softshell', 'recycled polyester', 'merino'] },
    B: { name: 'Athleisure Minimal', materials: ['jersey', 'cotton', 'nylon', 'spandex', 'mesh', 'fleece', 'modal', 'tencel', 'bamboo', 'silk'], dna_overrides: { formality_range: [1, 5], era_mood_tags: ['athleisure', 'minimal-sport', 'clean'] } },
    C: { name: 'Tech Urban', materials: ['nylon', 'gore-tex', 'leather', 'mesh', 'rubber', 'reflective', 'cordura', 'kevlar', 'carbon', 'titanium'], dna_overrides: { formality_range: [1, 5], silhouette_preference: ['V', 'I'], era_mood_tags: ['techwear', 'cyberpunk', 'urban-utility'] } },
  },
  creative_layered: {
    A: { name: 'Grunge Revival', materials: ['denim', 'flannel', 'leather', 'jersey', 'mesh', 'lace', 'velvet', 'cotton', 'plaid', 'studs'] },
    B: { name: 'Vintage Eclectic', materials: ['velvet', 'silk', 'crochet', 'denim', 'corduroy', 'leather', 'brocade', 'tapestry', 'lace', 'embroidery'], dna_overrides: { formality_range: [1, 6], era_mood_tags: ['vintage', 'eclectic', 'boho-mix'] } },
    C: { name: 'Art Punk', materials: ['leather', 'vinyl', 'mesh', 'rubber', 'denim', 'metal', 'canvas', 'nylon', 'fishnet', 'chain'], dna_overrides: { formality_range: [0, 4], silhouette_preference: ['V', 'I'], era_mood_tags: ['punk', 'DIY', 'anti-fashion'] } },
  },
};

function getLookDNA(vibeKey: string, lookKey: string): VibeDNA {
  const baseDna = VIBE_DNA[vibeKey];
  if (!baseDna) return baseDna;
  const look = VIBE_LOOKS[vibeKey]?.[lookKey];
  if (!look?.dna_overrides) return baseDna;
  return {
    ...baseDna,
    ...look.dna_overrides,
    color_palette: look.dna_overrides.color_palette
      ? { ...baseDna.color_palette, ...look.dna_overrides.color_palette }
      : baseDna.color_palette,
  };
}

function getLookMaterials(vibeKey: string): string[] {
  const looks = VIBE_LOOKS[vibeKey];
  if (!looks) return [];
  const allMats = new Set<string>();
  for (const look of Object.values(looks)) {
    for (const mat of look.materials) allMats.add(mat);
  }
  return [...allMats];
}

const VIBE_LOOK_ITEMS: Record<string, Record<string, string[]>> = {
  elevated_cool: {
    outer: ['oversized wool coat', 'structured trench', 'boxy leather blazer', 'cropped tailored jacket', 'tuxedo jacket', 'cape blazer', 'biker jacket', 'coach jacket', 'technical bomber', 'shearling jacket', 'nylon trench', 'varsity jacket', 'cropped bomber', 'wool peacoat', 'harrington jacket', 'puffer vest', 'heavy hoodie', 'anorak', 'windbreaker', 'track jacket'],
    top: ['high-neck knit', 'crisp poplin shirt', 'silk button-down', 'structured tee', 'satin blouse', 'mock-neck sweat', 'boxy tee', 'cashmere hoodie', 'oxford shirt', 'polo shirt', 'cable vest', 'rugby shirt', 'argyle sweater', 'v-neck jumper', 'mesh tee', 'thermal', 'graphic tee', 'crewneck', 'muscle tank', 'neoprene top'],
    bottom: ['wide-leg wool trousers', 'leather pants', 'pleated trousers', 'cigarette pants', 'cargo sweats', 'parachute pants', 'track pants', 'tailored joggers', 'raw denim', 'chinos', 'pleated mini skirt', 'straight jeans', 'wide chinos', 'tartan trousers', 'corduroy pants', 'grey denim', 'cargo jeans', 'biker jeans', 'nylon pants', 'baggy jeans'],
    shoes: ['square-toe boots', 'chunky loafers', 'chelsea boots', 'combat boots', 'sock boots', 'dad sneakers', 'high-top sneakers', 'tabi boots', 'leather sneakers', 'platform loafers', 'loafers with socks', 'derby', 'retro sneakers', 'mary janes', 'boat shoes'],
    bag: ['geometric tote', 'box bag', 'metal clutch', 'sling bag', 'chest rig', 'belt bag', 'cassette bag', 'briefcase', 'tech backpack', 'crossbody box', 'satchel', 'canvas tote', 'bowling bag', 'messenger bag'],
    accessory: ['silver chain', 'metal sunglasses', 'leather gloves', 'chain necklace', 'beanie', 'bucket hat', 'shield sunglasses', 'industrial belt', 'wallet chain', 'smart watch', 'skinny tie', 'baseball cap', 'crest brooch', 'glasses chain'],
  },
  effortless_natural: {
    outer: ['collarless liner', 'kimono cardigan', 'robe coat', 'chore coat', 'linen jacket', 'trench coat', 'wool blazer', 'field jacket', 'duffle coat', 'barn jacket', 'quilted liner', 'soft blazer', 'noragi', 'poncho', 'oversized cardigan', 'boucle jacket', 'peacoat', 'clean denim jacket', 'flannel shirt-jacket', 'corduroy jacket'],
    top: ['linen tunic', 'organic tee', 'wrap top', 'breton stripe tee', 'cashmere crew', 'silk blouse', 'chambray shirt', 'flannel shirt', 'grandad shirt', 'boat neck tee', 'waffle henley', 'boat neck knit', 'gauze blouse', 'raw silk top', 'drop-shoulder tee', 'knit tank', 'cashmere sweater', 'fair isle knit', 'layered turtle', 'sweatshirt'],
    bottom: ['wide linen trousers', 'drawstring pants', 'culottes', 'midi skirt', 'vintage denim', 'white jeans', 'fatigue pants', 'corduroy trousers', 'wide chinos', 'slip skirt', 'maxi skirt', 'balloon pants', 'relaxed trousers', 'wrap pants', 'carpenter jeans', 'raw denim', 'bermuda shorts', 'tiered skirt', 'denim skirt', 'work pants'],
    shoes: ['suede mules', 'leather slides', 'canvas sneakers', 'clogs', 'espadrilles', 'ballet flats', 'desert boots', 'wallabees', 'mary janes', 'moccasins', 'tabi flats', 'babouche', 'leather sandals', 'soft loafers', 'woven flats'],
    bag: ['soft hobo', 'canvas tote', 'straw bag', 'woven bag', 'basket bag', 'satchel', 'backpack', 'messenger', 'bucket bag', 'market tote', 'canvas bucket', 'knot bag', 'net bag', 'linen shopper'],
    accessory: ['silk scarf', 'gold hoops', 'beret', 'straw hat', 'wooden beads', 'leather belt', 'cotton scarf', 'pearl studs', 'minimalist watch', 'canvas belt', 'beanie', 'bandana', 'thick belt', 'tortoiseshell glasses'],
  },
  artistic_minimal: {
    outer: ['collarless coat', 'kimono jacket', 'longline blazer', 'cocoon coat', 'cape coat', 'asymmetric jacket', 'boucle coat', 'shearling jacket', 'crushed velvet jacket', 'draped cardigan', 'wrap jacket', 'cape', 'asymmetric jacket', 'shawl coat', 'blanket coat', 'fluid trench'],
    top: ['tunic shirt', 'asymmetric knit', 'pleated top', 'cowl neck', 'sheer mesh top', 'mohair knit', 'ribbed tank', 'organza blouse', 'structured tee', 'bias cut top', 'uneven hem shirt', 'layered tunic', 'ruched top', 'draped jersey'],
    bottom: ['culottes', 'wide cropped trousers', 'barrel pants', 'hakama', 'pleated skirt', 'satin pants', 'leather skirt', 'balloon pants', 'sarouel pants', 'jersey pants', 'wrapped skirt', 'dhoti pants', 'asymmetric skirt'],
    shoes: ['tabi boots', 'architectural mules', 'derby', 'square flats', 'platform sandals', 'sock boots', 'minimal sneakers', 'sculptural heels', 'velvet slippers', 'glove shoes', 'soft boots'],
    bag: ['pleated tote', 'geometric bag', 'origami bag', 'circle bag', 'slouchy sack', 'knot bag', 'portfolio', 'soft tote', 'dumpling bag', 'envelope bag'],
    accessory: ['sculptural bangle', 'bold eyewear', 'single earring', 'geometric necklace', 'velvet choker', 'crystal earrings', 'layered bangles', 'long necklace', 'statement ring', 'head wrap'],
  },
  retro_luxe: {
    outer: ['shearling coat', 'velvet blazer', 'cape', 'afghan coat', 'tapestry jacket', 'suede jacket', 'tweed jacket', 'quilted jacket', 'barbour jacket', 'camel coat', 'gold button blazer', 'cable cardigan', 'polo coat', 'faux fur', 'leather trench', 'safari jacket'],
    top: ['embroidered blouse', 'lace top', 'peasant blouse', 'corset top', 'pussy-bow blouse', 'cable sweater', 'printed shirt', 'silk blouse', 'cashmere turtle', 'halter top', 'crochet vest', 'floral shirt', 'turtleneck', 'ringer tee'],
    bottom: ['wool maxi skirt', 'velvet trousers', 'corduroy pants', 'flared jeans', 'suede skirt', 'pleated skirt', 'riding pants', 'wool skirt', 'culottes', 'tiered skirt', 'bell-bottoms', 'button skirt', 'gaucho pants'],
    shoes: ['lace-up boots', 'mary janes', 'western boots', 'clogs', 'riding boots', 'horsebit loafers', 'platform boots', 'kitten heels', 'penny loafers', 'slingbacks'],
    bag: ['tapestry bag', 'frame bag', 'saddle bag', 'structured handbag', 'bucket bag', 'vintage handbag', 'wicker bag', 'doctor bag', 'canvas tote', 'box bag'],
    accessory: ['headscarf', 'pearl earrings', 'pearl necklace', 'tinted sunglasses', 'wide brim hat', 'silk scarf', 'cameo', 'gold hoops', 'leather belt', 'bangle stack'],
  },
  sport_modern: {
    outer: ['3-layer shell', 'windbreaker', 'puffer', 'fleece', 'anorak', 'track jacket', 'cropped puffer', 'coach jacket', 'softshell', 'rain jacket', 'hoodie', 'bolero', 'zip fleece', 'bomber', 'stadium parka', 'varsity bomber'],
    top: ['performance tee', 'compression top', 'mock neck', 'half-zip', 'graphic tee', 'sports bra', 'soccer jersey', 'training top', 'rugby shirt', 'mesh top', 'merino base', 'tech-fleece', 'seamless top', 'ringer tee', 'polo'],
    bottom: ['cargo pants', 'joggers', 'hiking shorts', 'leggings', 'track pants', 'biker shorts', 'running shorts', 'yoga pants', 'nylon pants', 'tennis skirt', 'waterproof trousers', 'convertible pants', 'parachute pants', 'jorts', 'nylon shorts'],
    shoes: ['trail runners', 'running shoes', 'hiking boots', 'training shoes', 'slides', 'chunky sneakers', 'high-tops', 'sock sneakers', 'terrace sneakers', 'platform sneakers', 'gore-tex sneakers', 'retro runners'],
    bag: ['sacoche', 'backpack', 'chest rig', 'gym bag', 'sling', 'belt bag', 'duffle', 'hydration pack', 'crossbody', 'drawstring bag'],
    accessory: ['bucket hat', 'sunglasses', 'beanie', 'cap', 'headband', 'visor', 'sweatband', 'fitness tracker', 'carabiner', 'utility belt'],
  },
  creative_layered: {
    outer: ['leather biker', 'denim jacket', 'leopard coat', 'vinyl trench', 'patchwork jacket', 'faux fur coat', 'military jacket', 'fleece', 'tapestry coat', 'field jacket', 'windbreaker', 'cardigan', 'kimono', 'tapestry coat', 'blazer', 'embroidered jacket'],
    top: ['corset', 'band tee', 'mesh bodysuit', 'fishnet top', 'graphic tee', 'lace blouse', 'crochet top', 'floral shirt', 'hawaiian shirt', 'animal print top', 'knit', 'polka dot blouse', 'tie-dye', 'striped shirt'],
    bottom: ['ripped jeans', 'cargo mini', 'plaid skirt', 'leather pants', 'tulle skirt', 'checkered pants', 'patchwork jeans', 'velvet skirt', 'colored denim', 'floral skirt', 'striped skirt', 'cargo pants', 'suspender skirt'],
    shoes: ['combat boots', 'mary janes', 'creepers', 'platform boots', 'cowboy boots', 'studded boots', 'high-tops', 'sneakers', 'chelsea boots', 'loafers'],
    bag: ['backpack', 'chain bag', 'studded bag', 'guitar strap bag', 'tapestry bag', 'patchwork bag', 'novelty bag', 'fringe bag', 'beaded bag', 'sequin bag'],
    accessory: ['choker', 'safety pins', 'beret', 'brooch', 'bandana', 'chain necklace', 'hair clips', 'arm warmer', 'tights', 'wide belt'],
  },
};

const BODY_TYPE_SILHOUETTE: Record<string, {
  topFit: string;
  bottomFit: string;
  outerFit: string;
  rationale: string;
}> = {
  slim: {
    topFit: "oversized, relaxed, boxy, loose",
    bottomFit: "wide-leg, relaxed, straight, regular",
    outerFit: "oversized, relaxed",
    rationale: "slim body type — add volume and visual weight with relaxed/oversized fits to balance proportions",
  },
  regular: {
    topFit: "regular, straight, relaxed, fitted",
    bottomFit: "straight, slim, regular, tapered",
    outerFit: "regular, relaxed",
    rationale: "regular body type — most fits work well, prefer balanced regular/straight silhouettes",
  },
  "plus-size": {
    topFit: "straight, regular, A-line, empire",
    bottomFit: "straight, wide-leg, bootcut, relaxed",
    outerFit: "straight, regular, open-front",
    rationale: "plus-size body type — use straight/regular fits that flow naturally over curves without being too tight or too loose",
  },
};

const SILHOUETTE_BODY_CROSSOVER: Record<string, Record<string, string>> = {
  I: { slim: "oversized or boxy to add volume", regular: "straight and clean lines", "plus-size": "straight structured silhouettes" },
  V: { slim: "wide shoulders narrow bottom — balance with wider pants", regular: "strong shoulders tapered bottoms", "plus-size": "open structure top with streamlined bottom" },
  A: { slim: "volume on bottom, fitted top", regular: "fitted top with full skirts or wide pants", "plus-size": "empire waist with A-line flow" },
  Y: { slim: "structured oversized top with slim bottom", regular: "volume on top, tapered bottom", "plus-size": "structured jacket with slim pant" },
  X: { slim: "cinched waist with volume both top and bottom", regular: "balanced hourglass proportions", "plus-size": "defined waist with structured pieces" },
  H: { slim: "relaxed uniform proportions", regular: "column dressing, same width top to bottom", "plus-size": "loose tunic over relaxed pant" },
};

const VIBE_ADJECTIVES: Record<string, string[]> = {
  elevated_cool:     ["edgy", "structured", "dark", "sharp", "monochrome", "sleek"],
  effortless_natural: ["earthy", "soft", "natural", "organic", "muted", "linen"],
  artistic_minimal:  ["minimal", "clean", "tonal", "architectural", "understated", "neutral"],
  retro_luxe:        ["vintage", "rich", "retro", "classic", "luxe", "heritage"],
  sport_modern:      ["athletic", "technical", "performance", "sporty", "utility", "active"],
  creative_layered:  ["layered", "eclectic", "textured", "mixed", "bold", "expressive"],
};

const SEASON_MODIFIERS: Record<string, { fabric: string[]; keywords: string[] }> = {
  spring: { fabric: ["cotton", "linen", "light"], keywords: ["spring", "lightweight", "fresh"] },
  summer: { fabric: ["linen", "mesh", "breathable", "lightweight"], keywords: ["summer", "breathable", "sleeveless"] },
  fall:   { fabric: ["wool", "flannel", "corduroy", "tweed"], keywords: ["fall", "layering", "warm-tone"] },
  winter: { fabric: ["wool", "cashmere", "fleece", "thermal", "down"], keywords: ["winter", "warm", "insulated"] },
};

const MATERIAL_PREF_MAP: Record<string, string[]> = {
  structured: ['wool', 'gabardine', 'neoprene', 'stiff cotton', 'poplin', 'canvas'],
  luxe: ['cashmere', 'silk', 'satin', 'fine wool', 'leather', 'suede'],
  classic: ['cotton', 'wool', 'linen', 'denim', 'leather', 'tweed'],
  eco: ['organic cotton', 'linen', 'hemp', 'raw silk', 'bamboo'],
  knit: ['cashmere', 'cable-knit', 'ribbed', 'waffle', 'merino', 'mohair'],
  technical: ['nylon', 'gore-tex', 'ripstop', 'mesh', 'fleece', 'softshell'],
  casual: ['cotton', 'denim', 'jersey', 'fleece', 'canvas', 'flannel'],
  blend: ['cotton blend', 'polyester blend', 'spandex', 'nylon blend'],
  sheer: ['mesh', 'organza', 'tulle', 'lace', 'chiffon', 'gauze'],
};

const TONAL_STRATEGY_GUIDANCE: Record<string, string> = {
  'tone-on-tone': "Use similar shades of a single color family (e.g., different browns, layered greys). Keywords should suggest tonal, monochromatic, or same-color-family combinations.",
  'tone-in-tone': "Use colors from the same warmth/coolness spectrum with subtle variation (e.g., cream + beige + tan). Keywords should lean toward earthy, muted, or warm/cool unified palettes.",
  'contrast': "Use deliberate high-contrast color pairings (e.g., black + white, navy + cream). Keywords can include bold color names and contrasting descriptors.",
};

const CATEGORY_DEFS = [
  { key: "outer", label: "Outer", subCategories: [
    "puffer", "coat", "blazer", "jacket", "trench", "bomber", "parka", "peacoat",
    "anorak", "windbreaker", "duffle_coat", "biker_jacket", "denim_jacket", "coach_jacket",
    "varsity_jacket", "shearling", "field_jacket", "harrington", "quilted_jacket",
    "corduroy_jacket", "cape", "poncho", "kimono", "noragi", "chore_coat", "safari_jacket",
    "utility_jacket", "shell", "gilet", "faux_fur", "rain_jacket", "track_jacket",
    "shacket", "leather_trench", "tweed_jacket",
  ]},
  { key: "mid", label: "Mid-layer", subCategories: [
    "knit", "cardigan", "sweater", "vest", "fleece", "hoodie", "sweatshirt",
    "half_zip", "turtleneck_knit", "cable_knit", "argyle_sweater", "fair_isle",
    "cricket_jumper", "mock_neck", "zip_knit", "quilted_vest", "down_vest",
    "fleece_vest", "knitted_vest", "cashmere_sweater", "boucle_knit",
    "mohair_knit", "crochet_cardigan",
  ]},
  { key: "top", label: "Top", subCategories: [
    "tshirt", "shirt", "polo", "turtleneck", "tank", "blouse", "oxford_shirt",
    "linen_shirt", "silk_blouse", "graphic_tee", "rugby_shirt", "henley",
    "crop_top", "camisole", "bodysuit", "tunic", "corset", "breton_stripe",
    "band_tee", "jersey", "wrap_top", "peasant_blouse", "puff_sleeve",
    "flannel_shirt", "denim_shirt", "chambray", "western_shirt", "sports_bra",
    "performance_tee", "compression_top", "mesh_top", "lace_top",
    "embroidered_blouse", "halter_top",
  ]},
  { key: "bottom", label: "Bottom", subCategories: [
    "denim", "slacks", "chinos", "jogger", "cargo", "shorts", "wide_leg",
    "culottes", "pleated_trousers", "leather_pants", "corduroy_pants",
    "parachute_pants", "track_pants", "linen_trousers", "maxi_skirt",
    "midi_skirt", "mini_skirt", "pencil_skirt", "pleated_skirt", "wrap_skirt",
    "flared_jeans", "baggy_jeans", "carpenter_pants", "overalls",
    "bermuda_shorts", "biker_shorts", "leggings", "yoga_pants", "sweatpants",
    "sailor_pants", "harem_pants", "velvet_skirt", "silk_skirt",
    "tiered_skirt", "tennis_skirt",
  ]},
  { key: "shoes", label: "Shoes", subCategories: [
    "sneaker", "derby", "loafer", "boot", "runner", "chelsea_boot",
    "combat_boot", "ankle_boot", "knee_boot", "hiking_boot", "desert_boot",
    "work_boot", "mule", "slide", "sandal", "espadrille", "clog",
    "mary_jane", "ballet_flat", "oxford", "brogue", "monk_strap",
    "platform", "kitten_heel", "block_heel", "slingback", "boat_shoe",
    "moccasin", "western_boot", "tabi", "driving_shoe", "trail_runner",
    "training_shoe", "high_top", "creeper",
  ]},
  { key: "bag", label: "Bag", subCategories: [
    "tote", "backpack", "crossbody", "duffle", "clutch", "shoulder_bag",
    "satchel", "messenger", "bucket_bag", "hobo", "belt_bag", "sling",
    "baguette", "box_bag", "frame_bag", "saddle_bag", "doctor_bag",
    "wristlet", "briefcase", "gym_bag", "camera_bag", "weekender",
    "straw_bag", "woven_bag", "canvas_tote", "chain_bag", "phone_pouch",
    "sacoche", "vanity_case",
  ]},
  { key: "accessory", label: "Accessory", subCategories: [
    "necktie", "belt", "cap", "scarf", "glove", "watch", "sunglasses",
    "beanie", "bucket_hat", "beret", "headband", "choker", "chain_necklace",
    "pendant", "pearl_necklace", "hoop_earring", "stud_earring", "ring",
    "bracelet", "bangle", "brooch", "hair_clip", "bow_tie", "suspenders",
    "silk_scarf", "bandana", "anklet", "ear_cuff", "hair_stick", "tights",
    "wide_brim_hat", "visor", "wallet_chain",
  ]},
];

const GENDER_SUB_EXCLUDE: Record<string, string[]> = {
  MALE:   ["clutch", "baguette", "wristlet", "kitten_heel", "slingback", "ballet_flat", "mary_jane", "camisole", "crop_top", "halter_top", "pearl_necklace", "anklet", "hair_clip", "tiered_skirt", "tennis_skirt"],
  FEMALE: ["necktie", "bow_tie", "suspenders"],
};

const SEASON_SUB_EXCLUDE: Record<string, string[]> = {
  summer: [
    "puffer", "coat", "trench", "fleece", "sweater", "knit", "cardigan",
    "turtleneck", "boot", "chelsea_boot", "combat_boot", "ankle_boot",
    "knee_boot", "hiking_boot", "desert_boot", "work_boot", "western_boot",
    "scarf", "glove", "beanie", "down_vest", "fleece_vest", "shearling",
    "cable_knit", "fair_isle", "cashmere_sweater", "mohair_knit",
    "leather_pants", "corduroy_pants", "sweatpants", "velvet_skirt",
  ],
  spring: [
    "puffer", "fleece", "turtleneck", "glove", "down_vest", "shearling",
    "cashmere_sweater", "fair_isle", "cable_knit",
  ],
  fall: [
    "tank", "shorts", "sandal", "espadrille", "slide", "bermuda_shorts",
    "biker_shorts", "crop_top", "halter_top", "sports_bra", "camisole",
    "straw_bag", "straw_hat",
  ],
  winter: [
    "tank", "shorts", "sandal", "espadrille", "slide", "bermuda_shorts",
    "biker_shorts", "crop_top", "halter_top", "sports_bra", "camisole",
    "straw_bag", "straw_hat", "linen_shirt", "linen_trousers",
  ],
};

const SEASON_CATEGORY_EXCLUDE: Record<string, string[]> = {
  summer: ["outer", "mid"],
};

function buildFormalityFilteredSubs(vibeKey: string, subCategories: string[]): string[] {
  const dna = VIBE_DNA[vibeKey];
  if (!dna) return subCategories;

  const formalityExclude: Record<string, [number, number]> = {
    jogger: [0, 3], sweatpants: [0, 2], hoodie: [0, 3], sweatshirt: [0, 3],
    track_pants: [0, 3], biker_shorts: [0, 2], yoga_pants: [0, 2],
    leggings: [0, 3], sports_bra: [0, 1], compression_top: [0, 2],
    performance_tee: [0, 2], training_shoe: [0, 3], trail_runner: [0, 3],
    gym_bag: [0, 2], slide: [0, 2], flip_flop: [0, 1],
    tuxedo_jacket: [8, 10], monk_strap: [6, 9], bow_tie: [7, 10],
    necktie: [6, 9], briefcase: [6, 9], pencil_skirt: [5, 8],
    blazer: [4, 8], slacks: [4, 8], derby: [4, 8], oxford: [5, 8],
    brogue: [5, 8], loafer: [3, 7],
  };

  const [low, high] = dna.formality_range;

  return subCategories.filter(sub => {
    const fRange = formalityExclude[sub];
    if (!fRange) return true;
    const [subLow, subHigh] = fRange;
    return subLow <= high && subHigh >= low;
  });
}

type CategoryDef = { key: string; label: string; subCategories: string[] };

function buildFilteredCategories(
  gender: string,
  vibeKey: string,
  seasonLabel: string,
): CategoryDef[] {
  const excludedCategories = new Set(SEASON_CATEGORY_EXCLUDE[seasonLabel] || []);
  const genderExclude = new Set(GENDER_SUB_EXCLUDE[gender] || []);
  const seasonExclude = new Set(SEASON_SUB_EXCLUDE[seasonLabel] || []);

  const result: CategoryDef[] = [];

  for (const cat of CATEGORY_DEFS) {
    if (excludedCategories.has(cat.key)) continue;

    let filtered = cat.subCategories.filter(sub =>
      !genderExclude.has(sub) && !seasonExclude.has(sub)
    );

    filtered = buildFormalityFilteredSubs(vibeKey, filtered);

    if (filtered.length > 0) {
      result.push({ key: cat.key, label: cat.label, subCategories: filtered });
    }
  }

  return result;
}

function getVibeItemPoolSection(vibeKey: string): string {
  const pool = VIBE_LOOK_ITEMS[vibeKey];
  if (!pool) return "";

  const lines: string[] = [];
  for (const [cat, items] of Object.entries(pool)) {
    lines.push(`  ${cat}: ${items.join(", ")}`);
  }
  return lines.join("\n");
}

function getVibeMaterialSection(vibeKey: string, seasonLabel: string): string {
  const dna = VIBE_DNA[vibeKey];
  if (!dna) return "";

  const seasonMod = SEASON_MODIFIERS[seasonLabel];
  const seasonFabrics = new Set(seasonMod?.fabric || []);

  const lookMats = getLookMaterials(vibeKey);

  const vibeMaterials: string[] = [];
  for (const pref of dna.material_preferences) {
    const mats = MATERIAL_PREF_MAP[pref] || [];
    vibeMaterials.push(...mats);
  }
  vibeMaterials.push(...lookMats);

  const uniqueMats = [...new Set(vibeMaterials)];
  const seasonalMats = uniqueMats.filter(m => {
    if (seasonFabrics.size === 0) return true;
    return seasonFabrics.has(m) || !['wool', 'cashmere', 'fleece', 'thermal', 'down', 'linen', 'mesh', 'breathable'].includes(m);
  });

  return seasonalMats.slice(0, 18).join(", ");
}

function getLookVariantsSection(vibeKey: string): string {
  const looks = VIBE_LOOKS[vibeKey];
  if (!looks) return "";

  const lines: string[] = [];
  for (const [key, look] of Object.entries(looks)) {
    const overrides = look.dna_overrides;
    let desc = `  Look ${key} "${look.name}": materials=[${look.materials.slice(0, 6).join(", ")}]`;
    if (overrides?.formality_range) desc += ` formality=${overrides.formality_range[0]}-${overrides.formality_range[1]}`;
    if (overrides?.silhouette_preference) desc += ` silhouettes=[${overrides.silhouette_preference.join(",")}]`;
    if (overrides?.era_mood_tags) desc += ` mood=[${overrides.era_mood_tags.join(", ")}]`;
    lines.push(desc);
  }
  return lines.join("\n");
}

function getOutfitContextSection(ctx: OutfitContext | undefined): string {
  if (!ctx) return "";

  const lines: string[] = [];
  if (ctx.existing_colors && ctx.existing_colors.length > 0) {
    lines.push(`  Existing colors in outfit: ${ctx.existing_colors.join(", ")}`);
    lines.push(`  -> Generate keywords with colors that HARMONIZE with these existing colors (tone-on-tone or complementary).`);
    lines.push(`  -> AVOID repeating the exact same colors unless it creates a deliberate tonal effect.`);
  }
  if (ctx.existing_materials && ctx.existing_materials.length > 0) {
    lines.push(`  Existing materials in outfit: ${ctx.existing_materials.join(", ")}`);
    lines.push(`  -> Choose materials that create interesting TEXTURE CONTRAST with the existing materials.`);
  }
  if (ctx.target_slot) {
    lines.push(`  Target slot: ${ctx.target_slot}`);
    lines.push(`  -> Focus keywords on items appropriate for the "${ctx.target_slot}" category.`);
  }
  return lines.length > 0 ? lines.join("\n") : "";
}

function getColorPaletteSection(vibeKey: string): string {
  const dna = VIBE_DNA[vibeKey];
  if (!dna) return "";

  const p = dna.color_palette;
  return `Primary colors (use most): ${p.primary.join(", ")}
  Secondary colors (complement): ${p.secondary.join(", ")}
  Accent colors (use sparingly, max ${Math.round(p.max_accent_ratio * 100)}%): ${p.accent.join(", ")}`;
}

function getSilhouetteCrossover(vibeKey: string, bodyType: string): string {
  const dna = VIBE_DNA[vibeKey];
  if (!dna) return "";

  const lines: string[] = [];
  for (const sil of dna.silhouette_preference) {
    const guidance = SILHOUETTE_BODY_CROSSOVER[sil]?.[bodyType];
    if (guidance) {
      lines.push(`  ${sil}-silhouette for ${bodyType}: ${guidance}`);
    }
  }
  return lines.join("\n");
}

function getTonalStrategySection(vibeKey: string): string {
  const dna = VIBE_DNA[vibeKey];
  if (!dna) return "";

  return dna.preferred_tonal_strategy
    .map(s => `  - ${s}: ${TONAL_STRATEGY_GUIDANCE[s] || ''}`)
    .join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    let gender: string, body_type: string, vibe: string, season: string;
    let outfit_context: OutfitContext | undefined;
    try {
      const rawText = await req.text();
      const cleaned = rawText.trim();
      if (!cleaned) throw new Error("empty body");
      const body = JSON.parse(cleaned);
      gender = body.gender;
      body_type = body.body_type;
      vibe = body.vibe;
      season = body.season;
      outfit_context = body.outfit_context;
    } catch (parseErr) {
      return new Response(JSON.stringify({ error: "Invalid or empty request body", detail: (parseErr as Error).message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!gender || !vibe) {
      return new Response(JSON.stringify({ error: "gender and vibe are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const genderLabel = gender === "MALE" ? "men" : gender === "FEMALE" ? "women" : "unisex";
    const vibeKey = vibe.toLowerCase().replace(/\s+/g, "_");
    const vibeLabel = vibe.replace(/_/g, " ").toLowerCase();
    const seasonLabel = (season || "all season").toLowerCase();
    const bodyFit = BODY_TYPE_SILHOUETTE[body_type] || BODY_TYPE_SILHOUETTE["regular"];
    const vibeAdjs = VIBE_ADJECTIVES[vibeKey] || [vibeLabel];
    const seasonMod = SEASON_MODIFIERS[seasonLabel] || { fabric: [], keywords: [] };
    const dna = VIBE_DNA[vibeKey];

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const filteredCategoryDefs = buildFilteredCategories(gender, vibeKey, seasonLabel);

    const vibeAdjStr = vibeAdjs.join(", ");
    const seasonFabrics = seasonMod.fabric.join(", ") || "any";
    const seasonKws = seasonMod.keywords.join(", ") || seasonLabel;
    const vibeItemPool = getVibeItemPoolSection(vibeKey);
    const vibeMaterials = getVibeMaterialSection(vibeKey, seasonLabel);
    const colorPalette = getColorPaletteSection(vibeKey);
    const silhouetteCross = getSilhouetteCrossover(vibeKey, body_type || "regular");
    const tonalStrategy = getTonalStrategySection(vibeKey);
    const lookVariants = getLookVariantsSection(vibeKey);
    const outfitCtxSection = getOutfitContextSection(outfit_context);

    const prompt = `You are a creative fashion stylist who shops on Amazon daily. Generate Amazon search keywords that a real person would type.

STYLING PROFILE:
- Gender: ${genderLabel}
- Body type: ${body_type || "regular"} — ${bodyFit.rationale}
  Recommended fits: tops(${bodyFit.topFit}), bottoms(${bodyFit.bottomFit}), outerwear(${bodyFit.outerFit})
- Style vibe: "${vibeLabel}" — mood words: ${vibeAdjStr}
  Era/mood tags: ${dna?.era_mood_tags.join(", ") || vibeLabel}
- Season: ${seasonLabel} — fabrics: ${seasonFabrics} — seasonal cues: ${seasonKws}
- Formality range: ${dna ? `${dna.formality_range[0]}-${dna.formality_range[1]} out of 10` : "moderate"}

VIBE DNA COLOR PALETTE (use these colors to guide keyword color terms):
  ${colorPalette}

VIBE DNA MATERIAL PREFERENCES (season-filtered, includes Look-specific materials):
  ${vibeMaterials}

LOOK VARIANTS (each Look has different mood, formality, and material emphasis — distribute keywords across all 3 Looks):
${lookVariants}

VIBE DNA SILHOUETTE × BODY TYPE:
${silhouetteCross}

TONAL STRATEGY (how to combine colors in keywords):
${tonalStrategy}
${outfitCtxSection ? `\nOUTFIT CONTEXT (existing items already in the outfit — use this to generate COMPLEMENTARY keywords):\n${outfitCtxSection}\n` : ""}
VIBE-SPECIFIC ITEM REFERENCE (~20 items per slot from all 3 Look variants):
${vibeItemPool}

INSTRUCTIONS:
Generate one Amazon search keyword per sub-category. Each keyword should:
1. Always start with "${genderLabel}" or "${genderLabel}'s"
2. Reflect the style vibe ("${vibeLabel}") through descriptive words, trend terms, aesthetic references, or specific style names — NOT by repeating the same adjective in every keyword
3. Reference the VIBE-SPECIFIC ITEM REFERENCE above — use specific garment names, details, and vocabulary from the item pool to make keywords more targeted
4. Use colors from the VIBE DNA COLOR PALETTE — prefer primary/secondary colors, use accent colors sparingly
5. Use materials from VIBE DNA MATERIAL PREFERENCES where relevant — also use Look-specific materials (e.g., Look A might prefer "fine wool, gabardine" while Look C prefers "nylon, mesh")
6. Consider the SILHOUETTE × BODY TYPE guidance for fit terms
7. Follow the TONAL STRATEGY when combining color descriptors
8. Consider the season (${seasonLabel}) — use season-appropriate fabrics, weights, or styling cues naturally where relevant
9. For tops/bottoms/outerwear, incorporate a fit word that suits the ${body_type || "regular"} body type — but vary which fit word you pick from the recommended list
10. Be 3-6 words long
11. Sound like something a real shopper would search — natural, specific, and varied
12. DISTRIBUTE keywords across all 3 Look variants — roughly 1/3 per Look mood${outfit_context ? `
13. OUTFIT HARMONY: The outfit already contains items with specific colors/materials. Generate keywords for items that would COMPLEMENT the existing outfit — harmonize colors and create texture contrast` : ""}

DIVERSITY RULES (critical):
- Do NOT use the same adjective or descriptor more than twice across all keywords
- Mix up keyword structures: some can lead with fabric, some with style, some with fit, some with color mood
- Use specific fashion vocabulary: texture names, garment details, style subcultures, color tones
- Think about what makes each sub-category item unique within the "${vibeLabel}" aesthetic
- Avoid formulaic patterns — each keyword should feel like a different person searching
- Distribute materials across the 3 Look variants (e.g., Look A's "cashmere, silk" vs Look C's "nylon, mesh")

OUTPUT: Return ONLY a valid JSON object with this exact structure:
${JSON.stringify(
  Object.fromEntries(filteredCategoryDefs.map(cat => [
    cat.key,
    Object.fromEntries(cat.subCategories.map(s => [s, ""]))
  ])),
  null, 2
)}

Fill every empty string with a keyword. Return only JSON, nothing else.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1.0, maxOutputTokens: 4000, responseMimeType: "application/json" },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(
        JSON.stringify({ error: "Gemini API error", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Gemini returned no valid JSON", raw: rawText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanedJson = jsonMatch[0]
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/,(\s*[}\]])/g, "$1");

    let parsed: Record<string, Record<string, string> | string[]>;
    try {
      parsed = JSON.parse(cleanedJson) as Record<string, Record<string, string> | string[]>;
    } catch (parseErr) {
      return new Response(
        JSON.stringify({ error: "Failed to parse Gemini JSON", detail: (parseErr as Error).message, raw: rawText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categories: Record<string, string[]> = {};
    const allKeywords: string[] = [];

    for (const cat of filteredCategoryDefs) {
      const catData = parsed[cat.key];
      let kws: string[] = [];
      if (catData && !Array.isArray(catData) && typeof catData === "object") {
        kws = cat.subCategories.map(sub => (catData as Record<string, string>)[sub]).filter(Boolean);
      } else if (Array.isArray(catData)) {
        kws = catData.filter(Boolean);
      }
      categories[cat.key] = kws;
      allKeywords.push(...kws);
    }

    const effectiveDna = dna;
    const colorHints = effectiveDna ? {
      primary: effectiveDna.color_palette.primary,
      secondary: effectiveDna.color_palette.secondary,
      accent: effectiveDna.color_palette.accent,
      tonalStrategy: effectiveDna.preferred_tonal_strategy,
    } : null;

    const materialHints = effectiveDna ? {
      preferenceGroups: effectiveDna.material_preferences,
      resolvedMaterials: effectiveDna.material_preferences.flatMap(g => (MATERIAL_PREF_MAP[g] || []).slice(0, 3)),
      lookMaterials: getLookMaterials(vibeKey).slice(0, 12),
      seasonFabrics: seasonMod.fabric,
    } : null;

    const fitHints = effectiveDna ? {
      silhouettePreference: effectiveDna.silhouette_preference,
      formalityRange: effectiveDna.formality_range,
      proportionStyle: effectiveDna.proportion_style,
      bodyTypeFit: bodyFit ? { top: bodyFit.topFit, bottom: bodyFit.bottomFit, outer: bodyFit.outerFit } : null,
      eraMoodTags: effectiveDna.era_mood_tags,
    } : null;

    const keywordMeta: Record<string, {
      category: string;
      subCategory: string;
      colorHint: string | null;
      materialHint: string | null;
      fitHint: string | null;
    }> = {};

    for (const cat of filteredCategoryDefs) {
      const catData = parsed[cat.key];
      if (!catData || Array.isArray(catData)) continue;
      for (const sub of cat.subCategories) {
        const kw = (catData as Record<string, string>)[sub];
        if (!kw) continue;

        const colorMatch = effectiveDna?.color_palette.primary.find(c => kw.toLowerCase().includes(c)) ||
          effectiveDna?.color_palette.secondary.find(c => kw.toLowerCase().includes(c)) || null;

        const matMatch = MATERIAL_PREF_MAP[effectiveDna?.material_preferences[0] || '']?.find(m => kw.toLowerCase().includes(m)) || null;

        const fitMatch = BODY_TYPE_SILHOUETTE[body_type]
          ? [bodyFit.topFit, bodyFit.bottomFit, bodyFit.outerFit]
              .join(' ').split(',').map(f => f.trim())
              .find(f => kw.toLowerCase().includes(f)) || null
          : null;

        keywordMeta[kw] = {
          category: cat.key,
          subCategory: sub,
          colorHint: colorMatch,
          materialHint: matMatch,
          fitHint: fitMatch,
        };
      }
    }

    return new Response(
      JSON.stringify({
        keywords: allKeywords,
        categories,
        source: "gemini",
        vibeKey,
        colorHints,
        materialHints,
        fitHints,
        keywordMeta,
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
