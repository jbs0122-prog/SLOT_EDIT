import { VibeDefinition } from './types';

export const EFFORTLESS_NATURAL: VibeDefinition = {
  keywords: ['soft', 'organic', 'zen', 'timeless'],
  props: ['ceramic matcha bowl', 'wooden comb', 'dried eucalyptus', 'linen napkin', 'open book (novel)', 'herbal tea cup', 'woven coaster', 'scented candle (soy)', 'round reading glasses', 'small succulent plant', 'beige notebook', 'fountain pen', 'knitting needles', 'natural sponge', 'wooden bowl', 'fresh loaf of bread', 'cotton tote bag (folded)', 'beeswax wrap', 'ceramic vase (earthy)', 'incense holder', 'seashells', 'pebble stones', 'wooden spoon', 'film photos', 'straw hat', 'glass of water with lemon', 'flower petals', 'yoga block', 'essential oil bottle', 'bamboo tray'],
  dna: {
    formality_range: [2, 6],
    preferred_tonal_strategy: ['tone-in-tone', 'tone-on-tone'],
    silhouette_preference: ['A', 'H', 'I'],
    texture_rules: {
      required_variety: 2,
      preferred_textures: ['matte', 'rough', 'smooth'],
      forbidden_textures: ['sheen'],
      sheen_tolerance: 0.2,
    },
    color_palette: {
      primary: ['beige', 'cream', 'ivory', 'white'],
      secondary: ['olive', 'khaki', 'tan', 'sage', 'brown'],
      accent: ['rust', 'mustard', 'burgundy'],
      max_accent_ratio: 0.15,
    },
    proportion_style: 'relaxed',
    mixing_tolerance: 0.5,
    material_preferences: ['classic', 'eco', 'knit'],
    era_mood_tags: ['japandi', 'french-casual', 'organic', 'wabi-sabi'],
  },
  looks: {
    A: {
      name: 'Japandi Flow',
      materials: ['linen', 'cotton', 'raw silk', 'cashmere', 'gauze', 'hemp', 'wool', 'canvas', 'knit', 'waffle'],
      dna_overrides: {
        formality_range: [1, 5],
        proportion_style: 'relaxed',
        era_mood_tags: ['japandi', 'wabi-sabi', 'zen'],
      },
      slots: {
        outer: ['collarless liner', 'soft blazer', 'kimono cardigan', 'noragi', 'robe coat', 'chore coat', 'linen jacket', 'poncho', 'quilted vest', 'oversized cardigan', 'wrap coat', 'haori jacket', 'knitted vest', 'linen duster', 'textured coat', 'shawl collar jacket', 'cocoon coat', 'boiled wool jacket', 'canvas jacket', 'capelet', 'blanket coat', 'asymmetrical jacket', 'tunic coat', 'padded liner', 'waffle robe', 'soft trench', 'gauze jacket', 'open front cardigan', 'wool cape', 'shrug'],
        top: ['linen tunic', 'waffle henley', 'organic tee', 'wrap top', 'boat neck knit', 'linen shirt', 'grandad shirt', 'gauze blouse', 'raw silk top', 'drop-shoulder tee', 'knit tank', 'cashmere sweater', 'dolman sleeve top', 'tunic shirt', 'ribbed tank', 'kimono top', 'oversized tee', 'layered tank', 'hemp shirt', 'boxy knit', 'cowl neck top', 'sleeveless tunic', 'pointelle knit', 'silk cami', 'thermal top', 'raglan tee', 'crop linen top', 'asymmetrical blouse', 'soft cotton shirt', 'boat neck tee'],
        bottom: ['wide linen trousers', 'drawstring pants', 'maxi skirt', 'culottes', 'balloon pants', 'midi skirt', 'relaxed trousers', 'wrap pants', 'gauze pants', 'knit pants', 'harem pants', 'sarouel pants', 'cotton slacks', 'raw silk pants', 'pleated skirt', 'wide leg jeans (white)', 'bermuda shorts', 'tiered skirt', 'lounge pants', 'ribbed leggings', 'hakama pants', 'dhoti pants', 'soft shorts', 'pajama style pants', 'cropped wide pants', 'elastic waist skirt', 'linen shorts', 'fluid trousers', 'canvas pants', 'knitted skirt'],
        shoes: ['suede mules', 'leather slides', 'tabi flats', 'babouche', 'canvas sneakers', 'leather sandals', 'clogs', 'soft loafers', 'espadrilles', 'bare-foot shoes', 'woven flats', 'cork sandals', 'velvet slippers', 'moccasins', 'knit sneakers', 'gladiator sandals', 'ballet flats', 'toe-ring sandals', 'wooden clogs', 'straw sandals', 'canvas slip-ons', 'leather flip-flops', 'suede booties', 'sheepskin slippers', 'minimal boots', 'rope sandals', 'mesh flats', 'soft derby', 'mary janes (flat)', 'huaraches'],
        bag: ['soft hobo', 'canvas bucket', 'knot bag', 'net bag', 'market tote', 'linen shopper', 'woven bag', 'drawstring pouch', 'straw bag', 'slouchy shoulder bag', 'basket bag', 'cotton tote', 'macrame bag', 'bamboo handle bag', 'leather sack', 'furoshiki bag', 'crochet bag', 'wooden cage bag', 'jute bag', 'oversized canvas bag', 'wristlet', 'soft clutch', 'bucket tote', 'round rattan bag', 'raffia bag', 'knitted bag', 'suede pouch', 'phone sling', 'vegetable tanned leather bag', 'folded clutch'],
        accessory: ['ceramic jewelry', 'cotton scarf', 'bucket hat', 'wooden beads', 'linen hair tie', 'silver bangle', 'round glasses', 'leather cord', 'wooden bangle', 'hair stick', 'simple ring', 'matte earrings', 'pearl studs', 'canvas belt', 'straw hat', 'turban', 'silk scrunchie', 'anklet', 'pendant', 'stone necklace', 'woven bracelet', 'minimalist watch', 'tote charm', 'glass beads', 'bone ring', 'leather cuff', 'head wrap', 'shawl'],
      },
    },
    B: {
      name: 'French Casual',
      materials: ['cotton', 'silk', 'wool', 'cashmere', 'linen', 'denim', 'boucle', 'tweed', 'leather', 'velvet'],
      dna_overrides: {
        formality_range: [3, 7],
        proportion_style: 'balanced',
        era_mood_tags: ['french-casual', 'parisian', 'effortless-chic'],
      },
      slots: {
        outer: ['trench coat', 'wool blazer', 'cardigan coat', 'boucle jacket', 'peacoat', 'clean denim jacket', 'soft biker', 'tweed jacket', 'camel coat', 'oversized blazer', 'rain mac', 'houndstooth jacket', 'utility jacket', 'cape', 'shearling coat', 'navy blazer', 'corduroy jacket', 'wrap coat', 'gilet', 'duster coat', 'quilted jacket', 'leather blazer', 'boxy jacket', 'velvet blazer', 'linen blazer', 'chore jacket', 'bomber (silk)', 'poncho', 'shacket', 'knitted coat'],
        top: ['breton stripe tee', 'cashmere crew', 'silk blouse', 'boat neck', 'ribbed knit', 'button-down', 'camisole', 'v-neck sweater', 'polo knit', 'lace trim top', 'blue shirt', 'ringer tee', 'wrap blouse', 'sleeveless turtleneck', 'polka dot top', 'gingham shirt', 'white tee', 'muscle tank', 'cropped cardigan', 'silk tank', 'puff sleeve blouse', 'square neck top', 'graphic tee (vintage)', 'linen shirt', 'poplin top', 'sheer blouse', 'mock neck', 'tie-front shirt', 'corset top', 'thermal'],
        bottom: ['vintage denim', 'silk skirt', 'white jeans', 'corduroy pants', 'button skirt', 'cigarette pants', 'cropped flare', 'mini skirt', 'tailored shorts', 'slip skirt', 'straight leg jeans', 'wide leg jeans', 'linen trousers', 'culottes', 'midi skirt', 'pencil skirt', 'bermuda shorts', 'sailor pants', 'check trousers', 'wrap skirt', 'overall dress', 'velvet pants', 'knit skirt', 'denim shorts', 'high-waisted shorts', 'pleated trousers', 'leather skirt', 'cargo pants (refined)', 'joggers (silk)', 'tiered skirt'],
        shoes: ['ballet flats', 'minimal sneakers', 'suede loafers', 'ankle boots', 'espadrilles', 'mary janes', 'strappy sandals', 'knee boots', 'kitten heels', 'driving shoes', 'court shoes', 'block heels', 'mules', 'canvas shoes', 'clogs', 'derby shoes', 'brogues', 'slingbacks', "d'orsay pumps", 'woven flats', 'velvet slippers', 'rain boots', 'riding boots', 'gladiator sandals', 'wedge espadrilles', 'patent loafers', 'metallic sandals', 'pointed flats', 'chelsea boots', 'slide sandals'],
        bag: ['straw basket', 'canvas tote', 'leather shoulder bag', 'baguette', 'bucket bag', 'clasp purse', 'mini handbag', 'woven tote', 'saddle bag', 'clutch', 'frame bag', 'box bag', 'chain bag', 'wicker bag', 'crossbody', 'shopper', 'tote', 'vanity case', 'drawstring bag', 'bowling bag', 'messenger', 'nylon bag', 'beaded bag', 'bamboo bag', 'doctor bag', 'phone bag', 'wristlet', 'camera bag', 'satchel', 'coin purse'],
        accessory: ['silk scarf', 'gold hoops', 'beret', 'thin belt', 'cat-eye glasses', 'gold necklace', 'hair clip', 'watch', 'scrunchie', 'pearl necklace', 'ribbon', 'headband', 'sunglasses', 'signet ring', 'anklet', 'bracelet stack', 'vintage watch', 'hair bow', 'cameo', 'locket', 'bangle', 'ear cuff', 'lapel pin', 'chain belt', 'leather gloves', 'reading glasses', 'hat pin', 'bobby pins', 'tote scarf'],
      },
    },
    C: {
      name: 'Soft Amekaji',
      materials: ['denim', 'flannel', 'canvas', 'waxed cotton', 'wool', 'corduroy', 'heavy cotton', 'leather', 'fleece', 'chambray'],
      dna_overrides: {
        formality_range: [1, 5],
        silhouette_preference: ['H', 'A'],
        proportion_style: 'relaxed',
        era_mood_tags: ['amekaji', 'workwear', 'heritage'],
      },
      slots: {
        outer: ['quilted liner', 'field jacket', 'duffle coat', 'barn jacket', 'coverall', 'down vest', 'chore coat', 'flannel shirt-jacket', 'corduroy jacket', 'hunting jacket', 'heavy cardigan', 'denim jacket', 'parka', 'wool vest', 'shop coat', 'fleece jacket', 'rain parka', 'engineers jacket', 'utility vest', 'deck jacket', 'mountain parka', 'souvenir jacket', 'canvas coat', 'blanket coat', 'shawl collar cardigan', 'waxed jacket', 'varsity jacket', 'anorak', 'pilot jacket', 'ranch coat'],
        top: ['chambray shirt', 'fair isle knit', 'layered turtle', 'flannel shirt', 'sweatshirt', 'thermal henley', 'denim shirt', 'ringer tee', 'raglan tee', 'waffle knit', 'cable sweater', 'work shirt', 'pocket tee', 'hoodie', 'baseball tee', 'grandad shirt', 'striped tee', 'logger shirt', 'wool shirt', 'mechanic shirt', 'vintage tee', 'mock neck', 'sleeveless hoodie', 'patchwork shirt', 'knitted vest', 'half-zip', 'heavy cotton tee', 'polo shirt', 'western shirt', 'oversized knit'],
        bottom: ['fatigue pants', 'wide chinos', 'maxi skirt', 'carpenter jeans', 'corduroy trousers', 'painter pants', 'overalls', 'raw denim', 'cargo skirt', 'bermuda shorts', 'denim skirt', 'work pants', 'baker pants', 'climbing pants', 'patch jeans', 'dungarees', 'sweatpants', 'canvas shorts', 'utility skirt', 'gurkha shorts', 'balloon pants', 'pleated chinos', 'wide denim', 'hickory stripe pants', 'camo pants', 'linen shorts', 'wool trousers', 'culottes', 'button fly jeans', 'cargo shorts'],
        shoes: ['desert boots', 'work boots', 'deck shoes', 'wallabees', 'hiking boots', 'moccasins', 'leather sandals', 'canvas high-tops', 'service boots', 'rain boots', 'duck boots', 'engineer boots', 'slip-ons', 'clogs', 'gum sole sneakers', 'trail runners', 'suede boots', 'mountain boots', 'low-top sneakers', 'sandals with socks', 'logger boots', 'monkey boots', 'saddle shoes', 'derby shoes', 'chelsea boots (rugged)', 'canvas oxfords', 'hiking sandals', 'retro runners', 'garden boots', 'felt shoes'],
        bag: ['helmet bag', 'backpack', 'tote', 'tool bag', 'messenger', 'satchel', 'duffle', 'waist pouch', 'canvas crossbody', 'rucksack', 'newspaper bag', 'market bag', 'dry bag', 'sling bag', 'bucket bag', 'gym bag', 'camera bag', 'utility tote', 'kit bag', 'barrel bag', 'lunch bag', 'field bag', 'phone pouch', 'map case', 'holster', 'nylon tote', 'drawstring sack', 'leather pouch', 'vintage suitcase', 'basket'],
        accessory: ['beanie', 'bandana', 'thick belt', 'wool socks', 'vintage cap', 'tortoiseshell glasses', 'field watch', 'suspenders', 'wool scarf', 'gloves', 'key clip', 'wallet chain', 'silver ring', 'feather necklace', 'paracord bracelet', 'hiking socks', 'leather bracelet', 'cap', 'badge', 'enamel pin', 'neck warmer', 'fingerless gloves', 'brass ring', 'leather lanyard', 'boot laces', 'carabiner', 'compass', 'handkerchief', 'lighter'],
      },
    },
  },
};
