import { VibeDefinition } from './types';

export const ELEVATED_COOL: VibeDefinition = {
  keywords: ['sharp', 'minimal', 'city noir', 'architectural'],
  props: ['black espresso cup', 'architectural magazine', 'silver macbook', 'metal pen', 'wireframe glasses', 'minimal concrete coaster', 'leica camera', 'black leather notebook', 'glass water bottle', 'silver business card holder', 'slate stone tray', 'monochrome art print', 'ceramic vase (black)', 'steel ruler', 'bluetooth heavy headphones', 'car keys (modern)', 'black sunglasses case', 'design sketchbook', 'graphite pencils', 'geometrical paperweight', 'white orchid (single stem)', 'marble tray', 'silver wrist watch', 'tablet with stylus', 'black umbrella', 'passport (black cover)', 'chrome lighter', 'glass prism', 'minimal candle', 'limestone rock'],
  dna: {
    formality_range: [5, 9],
    preferred_tonal_strategy: ['tone-on-tone', 'contrast'],
    silhouette_preference: ['I', 'V'],
    texture_rules: {
      required_variety: 2,
      preferred_textures: ['structured', 'matte', 'sheen'],
      sheen_tolerance: 0.8,
    },
    color_palette: {
      primary: ['black', 'charcoal', 'navy', 'white'],
      secondary: ['grey', 'cream', 'camel'],
      accent: ['burgundy', 'metallic', 'wine'],
      max_accent_ratio: 0.10,
    },
    proportion_style: 'column',
    mixing_tolerance: 0.3,
    material_preferences: ['structured', 'luxe', 'classic'],
    era_mood_tags: ['minimalist', 'architectural', 'city-noir'],
  },
  looks: {
    A: {
      name: 'Downtown Tailoring',
      materials: ['fine wool', 'stiff cotton', 'smooth leather', 'cashmere', 'silk', 'gabardine', 'poplin', 'neoprene', 'satin', 'silver'],
      slots: {
        outer: ['oversized wool coat', 'structured trench', 'boxy leather blazer', 'double-breasted maxi coat', 'cropped tailored jacket', 'collarless wool blazer', 'pinstripe blazer', 'hourglass coat', 'cashmere wrap coat', 'structured gilet', 'tuxedo jacket', 'cape blazer', 'wool trench', 'leather trench', 'belted blazer', 'boyfriend blazer', 'shawl collar coat', 'masculine overcoat', 'sharp shoulder coat', 'asymmetrical jacket', 'minimalist parka', 'wool bomber', 'cropped trench', 'longline vest', 'split-sleeve blazer', 'granddad coat', 'textured wool coat', 'neoprene coat', 'raw-edge blazer', 'archival coat'],
        top: ['high-neck knit', 'crisp poplin shirt', 'sheer layering top', 'asymmetric drape top', 'silk button-down', 'structured bustier', 'fine turtleneck', 'sleeveless vest', 'ribbed mock neck', 'satin blouse', 'architectural shirt', 'cotton tunic', 'cutout bodysuit', 'stiff collar shirt', 'deep v-neck knit', 'wool polo', 'oversized cuff shirt', 'backless top', 'harness detail top', 'mesh long sleeve', 'cold shoulder top', 'cropped white shirt', 'silk camisole', 'structured tee', 'layered shirt', 'wrap blouse', 'metallic thread knit', 'bandage top', 'organza shirt', 'minimalist tee'],
        bottom: ['wide-leg wool trousers', 'tailored bermuda shorts', 'leather pants', 'maxi pencil skirt', 'pleated trousers', 'cigarette pants', 'high-waisted slacks', 'wool culottes', 'bootcut trousers', 'stirrup pants', 'straight leg jeans (black)', 'satin midi skirt', 'puddle hem pants', 'cargo trousers (refined)', 'split hem leggings', 'wool mini skirt', 'tailored joggers', 'draped skirt', 'tuxedo pants', 'leather midi skirt', 'pinstripe slacks', 'barrel leg pants', 'asymmetric skirt', 'silk trousers', 'raw hem denim', 'wide cuff pants', 'pleated shorts', 'wrap skirt', 'neoprene pants', 'structured skort'],
        shoes: ['square-toe boots', 'chunky loafers', 'architectural heels', 'pointed mules', 'ankle boots', 'slingbacks', 'minimal slides', 'chelsea boots', 'oxfords', 'knee-high boots', 'tabi boots', 'platform loafers', 'strappy sandals', 'leather sneakers (clean)', 'derby shoes', 'sock boots', 'kitten heels', 'wedge mules', 'combat boots (sleek)', 'ballerina flats', 'metallic heels', 'patent boots', 'driving shoes', 'brogues', 'thigh-high boots', "d'orsay flats", 'structured sandals', 'rain boots (matte)', 'velvet slippers', 'monk straps'],
        bag: ['geometric tote', 'metal clutch', 'box bag', 'oversized clutch', 'doctor bag', 'baguette', 'accordion bag', 'rigid shopper', 'envelope clutch', 'structured bucket bag', 'briefcase', 'top handle bag', 'cylinder bag', 'triangular bag', 'phone pouch', 'wristlet', 'architectural shoulder bag', 'hard-shell clutch', 'minimal backpack', 'silver tote', 'patent leather bag', 'frame bag', 'belt bag (leather)', 'saddle bag', 'crossbody box', 'portfolio', 'vertical tote', 'chain strap bag', 'lucite clutch', 'knot bag'],
        accessory: ['silver chain', 'metal sunglasses', 'leather gloves', 'wide belt', 'sculptural ring', 'minimal watch', 'pocket square', 'silver hoops', 'leather harness', 'cuff bracelet', 'geometric earrings', 'glasses chain', 'choker', 'signet ring', 'ear cuff', 'hair stick', 'brooch (modern)', 'tie bar', 'collar pin', 'leather bracelet', 'silver bangle', 'knuckle ring', 'matte hair clip', 'chain belt', 'neck scarf (silk)', 'anklet', 'arm band', 'pendant necklace', 'stacked rings'],
      },
    },
    B: {
      name: 'Neo-Prep Edge (Ivy Dark)',
      materials: ['tweed', 'corduroy', 'denim', 'cable-knit', 'velvet', 'waxed cotton', 'suede', 'quilted nylon', 'wool', 'leather'],
      dna_overrides: {
        formality_range: [3, 7],
        proportion_style: 'balanced',
        mixing_tolerance: 0.5,
        era_mood_tags: ['ivy-league', 'neo-prep', 'dark-academia'],
      },
      slots: {
        outer: ['varsity jacket', 'cropped bomber', 'wool peacoat', 'harrington jacket', 'oversized cardigan', 'duffle coat', 'navy blazer', 'cricket sweater', 'denim jacket', 'biker jacket', 'trench coat (short)', 'cable knit cardigan', 'corduroy jacket', 'quilted jacket', 'velvet blazer', 'stadium jumper', 'waxed jacket', 'shearling aviator', 'check blazer', 'windbreaker (retro)', 'fleece vest', 'suede bomber', 'track jacket', 'hooded duffle', 'leather blazer', 'utility jacket', 'cape coat', 'patchwork jacket', 'tweed jacket', 'coach jacket'],
        top: ['cable vest', 'polo shirt', 'oxford shirt', 'rugby shirt', 'argyle sweater', 'v-neck jumper', 'white shirt', 'striped boat neck', 'crest sweatshirt', 'turtleneck', 'button-down', 'ringer tee', 'thermal henley', 'cropped knit', 'logo tee (university)', 'layered hoodie', 'fair isle knit', 'mesh polo', 'oversized shirt', 'graphic sweater', 'zip-up knit', 'sleeveless hoodie', 'waffle top', 'tie-dye shirt (subtle)', 'check shirt', 'ribbed tank', 'mock neck tee', 'corset shirt', 'vintage sweat', 'cropped polo'],
        bottom: ['pleated mini skirt', 'chinos', 'raw denim', 'wool check skirt', 'tailored shorts', 'wide chinos', 'tartan trousers', 'corduroy pants', 'skort', 'straight jeans', 'bermuda shorts', 'cargo skirt', 'sweatpants (structured)', 'plaid pants', 'leather shorts', 'kilt', 'tennis skirt', 'carpenter pants', 'velvet skirt', 'track pants', 'wide denim', 'suspender skirt', 'culottes', 'stirrup leggings', 'patchwork jeans', 'button skirt', 'cuffed shorts', 'biking shorts', 'cargo jeans', 'relaxed slacks'],
        shoes: ['loafers with socks', 'derby', 'retro sneakers', 'mary janes', 'boat shoes', 'brogues', 'desert boots', 'saddle shoes', 'leather sneakers', 'canvas high-tops', 'platform loafers', 'rain boots', 'wallabees', 'gum sole shoes', 'hiking boots (low)', 'clogs', 'slip-ons', 'oxford heels', 'knee boots', 'combat boots', 'tassel loafers', 'driving shoes', 'court shoes', 'velcro sneakers', 'slide sandals (with socks)', 'monk straps', 'creepers', 'ballet flats', 'spectator shoes', 'vintage runners'],
        bag: ['satchel', 'canvas tote', 'bowling bag', 'backpack', 'messenger bag', 'saddle bag', 'book bag', 'briefcase', 'nylon backpack', 'drawstring bag', 'duffle', 'waist bag', 'crossbody camera bag', 'tote (logo)', 'school bag', 'mini trunk', 'gym sack', 'helmet bag', 'tool bag', 'vintage purse', 'barrel bag', 'laptop case', 'lunch box style bag', 'plaid tote', 'bucket bag', 'phone sling', 'flap bag', 'weekender', 'coin pouch', 'utility bag'],
        accessory: ['skinny tie', 'baseball cap', 'knee socks', 'crest brooch', 'glasses chain', 'headband', 'school scarf', 'signet ring', 'leather belt', 'tie clip', 'scrunchie', 'bow tie', 'enamel pin', 'whistle necklace', 'wristband', 'sport socks', 'beanie', 'lanyard', 'friendship bracelet', 'watch (nato strap)', 'bandana', 'hair bow', 'pearl choker', 'id bracelet', 'collar tips', 'backpack charm', 'suspenders', 'striped socks', 'bucket hat', 'reading glasses'],
      },
    },
    C: {
      name: 'High-End Street',
      materials: ['nylon', 'leather', 'tech-fleece', 'mesh', 'neoprene', 'denim', 'jersey', 'rubber', 'reflective', 'faux fur'],
      dna_overrides: {
        formality_range: [2, 6],
        preferred_tonal_strategy: ['contrast', 'tone-on-tone'],
        silhouette_preference: ['V', 'Y'],
        proportion_style: 'top-heavy',
        mixing_tolerance: 0.6,
        era_mood_tags: ['streetwear', 'tech', 'urban'],
      },
      slots: {
        outer: ['puffer vest', 'technical bomber', 'shearling jacket', 'biker jacket', 'coach jacket', 'denim jacket', 'heavy hoodie', 'anorak', 'windbreaker', 'track jacket', 'fleece jacket', 'oversized parka', 'tactical vest', 'rain poncho', 'utility jacket', 'cargo jacket', 'varsity bomber', 'nylon trench', 'reflective jacket', 'down jacket', 'shell jacket', 'gilet', 'moto jacket', 'souvenir jacket', 'cropped puffer', 'flannel shirt-jacket', 'faux fur coat', 'stadium jacket', 'hooded cape', 'convertible jacket'],
        top: ['cashmere hoodie', 'boxy tee', 'mock-neck sweat', 'half-zip', 'mesh tee', 'thermal', 'graphic tee', 'crewneck', 'muscle tank', 'neoprene top', 'tech-fleece', 'longline tee', 'football jersey', 'crop top', 'racerback tank', 'oversized shirt', 'corset hoodie', 'cutout top', 'tie-dye tee', 'band tee', 'layered long sleeve', 'zip polo', 'asymmetrical top', 'sleeveless hoodie', 'vintage wash tee', 'ribbed body', 'distressed sweater', 'logo knit', 'turtleneck (tight)', 'sports jersey'],
        bottom: ['cargo sweats', 'parachute pants', 'leather joggers', 'track pants', 'grey denim', 'sweatshorts', 'cargo jeans', 'biker jeans', 'chinos', 'tech shorts', 'drawstring trousers', 'nylon pants', 'baggy jeans', 'ripstop cargos', 'utility skirt', 'shorts over pants', 'wide sweatpants', 'carpenter jeans', 'tear-away pants', 'moto pants', 'camo pants', 'distressed shorts', 'reflective pants', 'double-knee pants', 'jogger shorts', 'oversized shorts', 'stacked denim', 'vinyl pants', 'basketball shorts', 'tactical pants'],
        shoes: ['high-top sneakers', 'combat boots', 'chelsea boots', 'tech slides', 'dad sneakers', 'sock sneakers', 'luxury runners', 'hiking sneakers', 'rubber boots', 'slip-ons', 'retro basketball shoes', 'platform boots', 'future slides', 'foam runners', 'tactical boots', 'skate shoes', 'canvas low-tops', 'reflective sneakers', 'chunky sandals', 'tabi sneakers', 'moon boots', 'work boots', 'moto boots', 'velcro sneakers', 'air-bubble sneakers', 'dip-dye shoes', 'trail runners', 'wedge sneakers', 'industrial boots', 'minimal trainers'],
        bag: ['mini leather bag', 'sling bag', 'cassette bag', 'utility crossbody', 'chest rig', 'oversized tote', 'belt bag', 'gym bag', 'phone pouch', 'tech backpack', 'duffle', 'shoebox bag', 'nylon tote', 'carabiner bag', 'waist pouch', 'hydration pack', 'camera bag', 'mini backpack', 'vertical shopper', 'padded tote', 'chain bag', 'industrial bag', 'transparent bag', 'reflective bag', 'modular bag', 'neck pouch', 'drawstring sack', 'weekender', 'holster bag', 'tactical pouch'],
        accessory: ['beanie', 'silver rings', 'headphones', 'chain necklace', 'bucket hat', 'shield sunglasses', 'baseball cap', 'bandana', 'industrial belt', 'wristbands', 'ear pods', 'paracord bracelet', 'face mask', 'carabiner', 'heavy chain', 'knuckle duster ring', 'visor', 'logo socks', 'lighter case', 'multiple earrings', 'tech gloves', 'wallet chain', 'choker', 'smart watch', 'fingerless gloves', 'hair clips', 'sweatband', 'neck gaiter'],
      },
    },
  },
};
