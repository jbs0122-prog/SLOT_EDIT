import { VibeDefinition } from './types';

export const ARTISTIC_MINIMAL: VibeDefinition = {
  keywords: ['avant-garde', 'gallery', 'texture', 'structure'],
  props: ['sculptural vase', 'charcoal stick', 'museum ticket', 'wire sculpture', 'black coffee in glass', 'architect scale ruler', 'heavy art book', 'palette knife', 'white stone', 'crumpled paper art', 'minimal silver ring (prop)', 'acetate glasses', 'magnifying glass', 'ink pot', 'calligraphy brush', 'limestone block', 'polaroid photo (abstract)', 'metal bookmark', 'geometric candle', 'clear acrylic block', 'dried branch', 'leather portfolio', 'matte black coaster', 'swatch book', 'pantone chips', 'ceramic shard', 'steel clips', 'glass sphere', 'measuring tape', 'sketch pad'],
  dna: {
    formality_range: [3, 8],
    preferred_tonal_strategy: ['tone-on-tone', 'contrast'],
    silhouette_preference: ['I', 'A', 'Y'],
    texture_rules: {
      required_variety: 3,
      preferred_textures: ['structured', 'matte', 'rough'],
      sheen_tolerance: 0.4,
    },
    color_palette: {
      primary: ['black', 'white', 'grey', 'charcoal'],
      secondary: ['cream', 'beige', 'navy'],
      accent: ['rust', 'olive', 'burgundy'],
      max_accent_ratio: 0.10,
    },
    proportion_style: 'column',
    mixing_tolerance: 0.4,
    material_preferences: ['classic', 'structured', 'eco', 'knit'],
    era_mood_tags: ['avant-garde', 'gallery', 'architectural', 'deconstructed'],
  },
  looks: {
    A: {
      name: 'Gallery Uniform',
      materials: ['wool', 'stiff cotton', 'linen', 'neoprene', 'gabardine', 'poplin', 'canvas', 'shell', 'organza', 'leather'],
      dna_overrides: {
        formality_range: [4, 8],
        proportion_style: 'column',
      },
      slots: {
        outer: ['collarless coat', 'kimono jacket', 'longline blazer', 'stand-collar jacket', 'cocoon coat', 'structured vest', 'cape coat', 'asymmetric jacket', 'minimal trench', 'geometric coat', 'wrap jacket', 'architectural blazer', 'stiff wool coat', 'neoprene coat', 'sleeveless coat', 'boxy jacket', 'cropped blazer', 'tunic coat', 'wool cape', 'linen duster', 'oversized vest', 'tailored coat', 'shell jacket', 'bolero', 'draped jacket', 'shawl coat', 'zip-front coat', 'panelled jacket', 'funnel neck coat', 'minimalist parka'],
        top: ['tunic shirt', 'asymmetric knit', 'stiff mock neck', 'pleated top', 'oversized shirt', 'poplin tunic', 'boxy blouse', 'high-neck shell', 'sleeveless top', 'drape top', 'cowl neck', 'architectural shirt', 'crisp tee', 'structured tank', 'funnel neck', 'raw edge top', 'panelled shirt', 'stiff cotton top', 'wrap blouse', 'longline vest', 'geometric top', 'cut-out top', 'layered shirt', 'mesh top', 'neoprene blouse', 'ribbed sweater', 'cold shoulder top', 'minimalist tunic', 'bias cut top', 'sheer shirt'],
        bottom: ['culottes', 'wide cropped trousers', 'pleated skirt', 'barrel pants', 'hakama', 'balloon skirt', 'wide slacks', 'tapered ankle pants', 'asymmetric skirt', 'structured shorts', 'geometric skirt', 'wrap pants', 'cigarette pants', 'voluminous skirt', 'tailored shorts', 'raw hem pants', 'drop crotch pants', 'pleated trousers', 'structured joggers', 'midi skirt', 'panelled skirt', 'wide leg jeans', 'sarouel pants', 'stiff cotton skirt', 'straight leg pants', 'wool trousers', 'origami skirt', 'architectural pants', 'cuffed pants', 'split hem pants'],
        shoes: ['tabi boots', 'architectural mules', 'derby', 'square flats', 'platform sandals', 'sock boots', 'minimal sneakers', 'oxfords', 'wedges', 'geometric heels', 'split-toe shoes', 'block heels', 'glove shoes', 'loafer mules', 'platform boots', 'sculptural heels', "d'orsay flats", 'monk straps', 'chelsea boots', 'leather slides', 'structured sandals', 'ballet flats', 'wedge boots', 'kitten heels', 'cutout boots', 'slingbacks', 'ankle strap shoes', 'matte boots', 'rubber boots', 'slip-ons'],
        bag: ['pleated tote', 'geometric bag', 'oversized clutch', 'wristlet', 'architectural bag', 'box bag', 'portfolio', 'minimal shopper', 'circle bag', 'origami bag', 'triangle bag', 'frame bag', 'cylinder bag', 'structured tote', 'hard case', 'clutch', 'clear bag', 'matte leather bag', 'bucket bag', 'envelope bag', 'handle bag', 'sling bag', 'sculptural bag', 'phone pouch', 'vertical tote', 'neck bag', 'belt bag', 'folder bag', 'acrylic bag', 'mesh bag'],
        accessory: ['sculptural bangle', 'bold eyewear', 'single earring', 'cuff', 'geometric necklace', 'brooch', 'matte ring', 'glasses chain', 'wide headband', 'minimal belt', 'silver choker', 'ear cuff', 'knuckle ring', 'statement earrings', 'hair stick', 'collar', 'arm band', 'abstract pin', 'leather choker', 'acrylic ring', 'metal belt', 'watch', 'hair clip', 'anklet', 'silver bar', 'neck wire', 'pendant', 'brooch set', 'chain link'],
      },
    },
    B: {
      name: 'Texture Mix',
      materials: ['boucle', 'velvet', 'mohair', 'patent leather', 'satin', 'organza', 'mesh', 'sequin', 'faux fur', 'metallic'],
      dna_overrides: {
        texture_rules: {
          required_variety: 3,
          preferred_textures: ['rough', 'sheen', 'smooth'],
          sheen_tolerance: 0.9,
        },
        mixing_tolerance: 0.6,
        era_mood_tags: ['texture-play', 'art-house', 'maximalist-minimal'],
      },
      slots: {
        outer: ['boucle coat', 'hairy cardigan', 'crushed velvet jacket', 'faux fur vest', 'shaggy jacket', 'patent coat', 'shearling jacket', 'quilted velvet coat', 'feather trim jacket', 'teddy coat', 'mohair cardigan', 'fringe jacket', 'jacquard coat', 'embossed leather jacket', 'silk bomber', 'organza coat', 'tweed blazer', 'pony hair jacket', 'metallic jacket', 'crinkled coat', 'laser cut jacket', 'wool boucle', 'knit coat', 'vinyl trench', 'suede jacket', 'embroidered coat', 'mesh jacket', 'crochet cardigan', 'distressed jacket', 'tufted coat'],
        top: ['sheer mesh top', 'mohair knit', 'ribbed tank', 'crushed satin', 'fringe top', 'organza blouse', 'velvet top', 'lace bodysuit', 'angora sweater', 'metallic knit', 'sequin top', 'feather top', 'boucle knit', 'silk cami', 'pleated top', 'burnout tee', 'distressed knit', 'waffle top', 'crochet top', 'tulle blouse', 'pearl embellished top', 'embroidered shirt', 'ruched top', 'smocked top', 'leather top', 'latex top', 'lurex sweater', 'ladder knit', 'fishnet top', 'ribbon top'],
        bottom: ['satin pants', 'leather skirt', 'wool slacks', 'pleated velvet skirt', 'metallic pants', 'sequin skirt', 'corduroy pants', 'silk trousers', 'faux fur skirt', 'patent pants', 'lace skirt', 'fringe skirt', 'jacquard pants', 'organza skirt', 'vinyl skirt', 'embossed pants', 'suede skirt', 'crushed velvet pants', 'tulle skirt', 'brocade pants', 'mesh skirt', 'feather skirt', 'knit pants', 'crochet skirt', 'distressed denim', 'cargo pants (satin)', 'wide leg velvet', 'laser cut skirt', 'pleated pants', 'ruched skirt'],
        shoes: ['velvet slippers', 'pony-hair boots', 'patent loafers', 'metallic boots', 'satin mules', 'fur slides', 'mesh boots', 'embellished flats', 'textured pumps', 'glitter boots', 'shearling boots', 'crocodile embossed boots', 'snake print shoes', 'feather sandals', 'clear heels', 'lucite boots', 'suede pumps', 'embroidered boots', 'pearl heels', 'sequin shoes', 'brocade boots', 'lace-up heels', 'velvet boots', 'satin sneakers', 'metallic slides', 'fur loafers', 'woven shoes', 'textured leather boots', 'glitter sneakers', 'patent mules'],
        bag: ['fur bag', 'wrinkled pouch', 'metallic bag', 'beaded bag', 'velvet clutch', 'chain mail bag', 'feather bag', 'patent tote', 'woven satin bag', 'shearling tote', 'embossed bag', 'crocodile bag', 'pearl bag', 'sequin bag', 'crystal bag', 'mesh tote', 'tulle bag', 'suede bag', 'fuzzy bag', 'lucite clutch', 'mirror bag', 'embroidered bag', 'fringe bag', 'rope bag', 'metallic clutch', 'snakeskin bag', 'quilted bag', 'padded bag', 'ruched bag', 'textured leather bag'],
        accessory: ['pearl necklace', 'velvet choker', 'crystal earrings', 'textured ring', 'hair bow', 'fur stole', 'lace gloves', 'metallic belt', 'layered chains', 'brooch', 'feather earring', 'rhinestone choker', 'hair pearl', 'velvet headband', 'mesh gloves', 'statement ring', 'ear climber', 'crystal headband', 'sequin scarf', 'metallic cuff', 'chain belt', 'anklet', 'body chain', 'hair slide', 'cameo', 'tassle earrings', 'beaded necklace', 'velvet ribbon', 'satin scarf'],
      },
    },
    C: {
      name: 'Soft Avant-Garde',
      materials: ['jersey', 'draped wool', 'silk', 'mesh', 'knit', 'linen', 'cotton', 'sheer', 'gauze', 'parachute nylon'],
      dna_overrides: {
        silhouette_preference: ['A', 'Y'],
        proportion_style: 'relaxed',
        era_mood_tags: ['deconstructed', 'draped', 'fluid'],
      },
      slots: {
        outer: ['cape', 'draped cardigan', 'asymmetric jacket', 'shawl coat', 'blanket coat', 'wrap jacket', 'fluid trench', 'bolero', 'scarf-coat', 'waterfall cardigan', 'poncho', 'kimono', 'oversized shirt-jacket', 'slouchy blazer', 'knit coat', 'ruched jacket', 'tie-waist coat', 'sheer jacket', 'layered coat', 'parachute coat', 'soft parka', 'cocoon jacket', 'duster', 'gathered coat', 'balloon sleeve jacket', 'twist front jacket', 'mesh cardigan', 'hooded cape', 'distressed coat', 'fluid blazer'],
        top: ['cowl neck', 'uneven hem shirt', 'layered tunic', 'ruched top', 'draped jersey', 'bias blouse', 'wrap top', 'asymmetric tank', 'oversized knit', 'sheer overlay', 'twist top', 'waterfall top', 'batwing sleeve', 'gathered blouse', 'cold shoulder top', 'slouchy tee', 'knot front top', 'layered tank', 'fluid shirt', 'off-shoulder knit', 'mesh tunic', 'halter top', 'balloon sleeve top', 'corset tee', 'distressed top', 'longline shirt', 'strappy top', 'open back top', 'soft corset', 'jersey tunic'],
        bottom: ['balloon pants', 'sarouel pants', 'wrapped skirt', 'dhoti pants', 'asymmetric skirt', 'harem pants', 'jersey pants', 'gathered skirt', 'layered trousers', 'fluid maxi', 'wide leg drapes', 'parachute skirt', 'tulip skirt', 'ruched skirt', 'drop crotch trousers', 'bias cut skirt', 'split leg pants', 'tie-waist pants', 'oversized trousers', 'knitted skirt', 'sheer skirt over pants', 'joggers', 'bubble skirt', 'layered skirt', 'culottes', 'soft cargo', 'wrap trousers', 'pleated maxi', 'harem shorts', 'jersey skirt'],
        shoes: ['leather sandals', 'soft boots', 'sock boots', 'flat mules', 'gladiator sandals', 'soft flats', 'tabi ballet', 'slouchy boots', 'slipper shoes', 'wedges', 'wrap sandals', 'ballet wraps', 'foot glove', 'knit shoes', 'minimalist sandals', 'toe loop sandals', 'soft loafers', 'canvas boots', 'bandage shoes', 'platform flip-flops', 'split sole shoes', 'ruched boots', 'sheer boots', 'leather slippers', 'monk strap flats', 'soft pumps', 'ankle tie shoes', 'woven sandals', 'minimal clogs'],
        bag: ['slouchy sack', 'knot bag', 'drawstring pouch', 'soft tote', 'hobo bag', 'oversized shoulder bag', 'ruched clutch', 'net bag', 'wrist bag', 'fabric tote', 'leather shopper', 'soft backpack', 'bucket bag', 'folded bag', 'dumpling bag', 'scarf bag', 'mesh shopper', 'canvas sack', 'nylon tote', 'crossbody pouch', 'soft leather clutch', 'wristlet', 'macrame bag', 'woven leather bag', 'pleat bag', 'round bag', 'tie-handle bag', 'oversized clutch', 'soft briefcase', 'jersey bag'],
        accessory: ['long necklace', 'layered bangles', 'scarf', 'rings', 'head wrap', 'pendant', 'irregular earrings', 'soft belt', 'arm cuff', 'anklet', 'leather cord', 'silver jewelry', 'wooden bangle', 'hair tie', 'fabric belt', 'brooch', 'body chain', 'toe ring', 'fabric choker', 'knot bracelet', 'minimalist watch', 'raw stone', 'leather cuff', 'glasses', 'ear cuff', 'hand chain', 'arm band', 'turban', 'snood'],
      },
    },
  },
};
