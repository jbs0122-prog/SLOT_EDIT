import { VibeDefinition } from './types';

export const RETRO_LUXE: VibeDefinition = {
  keywords: ['heritage', 'rich', 'cinematic', 'nostalgia'],
  props: ['vintage pearl necklace tray', 'crystal whiskey glass', 'old vogue magazine', 'gold fountain pen', 'red lipstick (open)', 'ornate hand mirror', 'leather bound book', 'velvet jewelry box', 'antique key', 'dried rose', 'opera glasses', 'silk handkerchief', 'brass candlestick', 'feather quill', 'vintage postcard', 'pocket watch', 'lace fan', 'gold compact mirror', 'tea cup with saucer', 'playing cards', 'cigar box (wooden)', 'perfume atomizer', 'cameo brooch', 'magnifying glass (gold)', 'embroidery hoop', 'film reel', 'opera gloves', 'wax seal stamp', 'silver tray', 'violin bow'],
  dna: {
    formality_range: [3, 8],
    preferred_tonal_strategy: ['tone-in-tone', 'contrast'],
    silhouette_preference: ['A', 'X', 'I'],
    texture_rules: {
      required_variety: 2,
      preferred_textures: ['smooth', 'sheen', 'rough'],
      sheen_tolerance: 0.7,
    },
    color_palette: {
      primary: ['burgundy', 'navy', 'brown', 'cream'],
      secondary: ['camel', 'olive', 'wine', 'beige'],
      accent: ['rust', 'mustard', 'teal', 'gold'],
      max_accent_ratio: 0.20,
    },
    proportion_style: 'balanced',
    mixing_tolerance: 0.5,
    material_preferences: ['luxe', 'structured', 'classic', 'knit'],
    era_mood_tags: ['70s', 'heritage', 'cinematic', 'old-money'],
  },
  looks: {
    A: {
      name: 'Opulent Folklore',
      materials: ['velvet', 'brocade', 'embroidered', 'suede', 'tapestry', 'lace', 'silk', 'wool', 'crochet', 'shearling'],
      dna_overrides: {
        formality_range: [4, 8],
        preferred_tonal_strategy: ['tone-in-tone', 'contrast'],
        era_mood_tags: ['folklore', 'bohemian', 'opulent'],
        mixing_tolerance: 0.6,
      },
      slots: {
        outer: ['shearling coat', 'velvet blazer', 'cape', 'embroidered vest', 'afghan coat', 'tapestry jacket', 'fur-trim coat', 'quilted jacket', 'folk cardigan', 'suede coat', 'brocade coat', 'embroidered jacket', 'peasant coat', 'shawl', 'velvet cape', 'corset jacket', 'printed kimono', 'fringed jacket', 'bolero', 'patchwork coat', 'fur stole', 'wool coat', 'military jacket', 'paisley coat', 'knit coat', 'tapestry vest', 'lace jacket', 'faux fur coat', 'embellished blazer', 'satin jacket'],
        top: ['embroidered blouse', 'lace top', 'crochet vest', 'peasant blouse', 'smocked top', 'floral shirt', 'corset top', 'ruffled blouse', 'balloon sleeve', 'velvet bodice', 'high neck blouse', 'broderie top', 'folk shirt', 'tunic', 'puff sleeve top', 'sheer blouse', 'victorian shirt', 'lace cami', 'printed top', 'embroidered corset', 'bib shirt', 'tie-front blouse', 'gathered top', 'knit bodice', 'floral corset', 'lace bodysuit', 'square neck top', 'fringed top', 'bell sleeve top', 'gypsy top'],
        bottom: ['wool maxi skirt', 'velvet trousers', 'corduroy pants', 'embroidered jeans', 'tiered skirt', 'paisley skirt', 'floral maxi', 'velvet pants', 'tapestry skirt', 'dark denim', 'ruffle skirt', 'brocade pants', 'lace skirt', 'peasant skirt', 'wide leg pants', 'patchwork skirt', 'embroidered skirt', 'bloomers', 'suede skirt', 'printed trousers', 'folk skirt', 'jacquard pants', 'gathered skirt', 'wool shorts', 'velvet skirt', 'layered skirt', 'fringe skirt', 'high-waisted trousers', 'floral pants', 'culottes'],
        shoes: ['lace-up boots', 'mary janes', 'clogs', 'embroidered slippers', 'velvet boots', 'western boots', 'platform sandals', 'lace-up flats', 'kitten heels', 'brocade pumps', 'suede boots', 'granny boots', 'embroidered boots', 'velvet flats', 'mules', 'tassel boots', 'wooden sandals', 'victorian boots', 'strappy heels', 'patterned pumps', 'fur trim boots', 'moccasins', 'ballet flats', 't-strap shoes', 'oxford heels', 'embellished sandals', 'woven boots', 'tapestry shoes', 'satin heels', 'leather boots'],
        bag: ['tapestry bag', 'frame bag', 'beaded pouch', 'velvet bag', 'embroidered clutch', 'fringe bag', 'basket', 'coin purse', 'vintage handbag', 'carpet bag', 'drawstring pouch', 'brocade bag', 'lace bag', 'tassel bag', 'patchwork bag', 'round bag', 'saddle bag', 'bucket bag', 'wicker bag', 'metal mesh bag', 'box bag', 'kiss-lock purse', 'fabric tote', 'needlepoint bag', 'silk pouch', 'wooden bag', 'leather satchel', 'floral bag', 'fur bag', 'wristlet'],
        accessory: ['headscarf', 'pearl earrings', 'beads', 'floral headband', 'cameo', 'gold hoops', 'lace tights', 'statement belt', 'corset belt', 'ribbons', 'hair flowers', 'brooch', 'choker', 'layered necklaces', 'dangle earrings', 'velvet ribbon', 'hair comb', 'bangle stack', 'locket', 'fan', 'embroidered collar', 'lace gloves', 'coin belt', 'tassel earrings', 'hair pins', 'shawl', 'arm cuff', 'ring set', 'anklet'],
      },
    },
    B: {
      name: '70s Vintage Chic',
      materials: ['suede', 'corduroy', 'denim', 'leather', 'crochet', 'velvet', 'patchwork', 'faux fur', 'satin', 'fringe'],
      dna_overrides: {
        formality_range: [2, 6],
        silhouette_preference: ['A', 'Y'],
        era_mood_tags: ['70s', 'vintage', 'boho-chic', 'disco'],
      },
      slots: {
        outer: ['suede jacket', 'shearling coat', 'faux fur', 'leather trench', 'safari jacket', 'denim blazer', 'patchwork jacket', 'corduroy blazer', 'poncho', 'crochet cardigan', 'fringe vest', 'western jacket', 'denim vest', 'velvet coat', 'cape', 'duster', 'knitted coat', 'bomber', 'leather vest', 'wool poncho', 'shacket', 'patterned blazer', 'suede vest', 'trench cape', 'fur vest', 'knit vest', 'blanket coat', 'shawl collar coat', 'retro windbreaker', 'mac coat'],
        top: ['printed shirt', 'turtleneck', 'crochet vest', 'halter top', 'ringer tee', 'pussy-bow blouse', 'ribbed knit', 'tie-dye', 'western shirt', 'tunic', 'peasant top', 'disco top', 'satin shirt', 'bell sleeve top', 'graphic tee', 'wrap top', 'knitted polo', 'tank top', 'striped shirt', 'paisley top', 'sheer shirt', 'lace-up top', 'butterfly top', 'tube top', 'off-shoulder top', 'smocked top', 'embroidered shirt', 'denim shirt', 'lurex top', 'vest top'],
        bottom: ['flared jeans', 'corduroy skirt', 'bell-bottoms', 'suede skirt', 'pattern pants', 'patchwork jeans', 'button skirt', 'gaucho pants', 'maxi skirt', 'denim shorts', 'wide leg jeans', 'bootcut jeans', 'velvet pants', 'printed skirt', 'high-waisted shorts', 'culottes', 'overalls', 'jumpsuit', 'knit pants', 'fringe skirt', 'suede pants', 'tiered skirt', 'wrap skirt', 'wide leg trousers', 'disco pants', 'leather pants', 'pleated skirt', 'cargo pants', 'stirrup pants', 'hot pants'],
        shoes: ['platform boots', 'suede boots', 'clogs', 'knee boots', 'western boots', 'wedge sandals', 'platform sneakers', 'moccasins', 'loafers', 'strappy sandals', 'wooden heels', 'chunky heels', 'cork wedges', 'fringe boots', 'cowboy boots', 'desert boots', 'retro sneakers', 'mules', 'velvet boots', 't-strap sandals', 'espadrilles', 'leather slides', 'mary janes', 'peep toe heels', 'block heels', 'gladiator sandals', 'suede loafers', 'earth shoes', 'oxfords'],
        bag: ['saddle bag', 'suede hobo', 'fringe bag', 'tooled bag', 'macrame bag', 'canvas messenger', 'leather tote', 'bucket bag', 'patchwork bag', 'soft clutch', 'basket', 'woven bag', 'denim bag', 'crochet bag', 'camera bag', 'satchel', 'bowling bag', 'duffle', 'wristlet', 'beaded bag', 'drawstring bag', 'suede pouch', 'flap bag', 'doctor bag', 'frame bag', 'straw tote', 'mesh bag', 'guitar strap bag', 'canvas tote', 'leather pouch'],
        accessory: ['tinted sunglasses', 'wide brim hat', 'silk scarf', 'turquoise', 'leather belt', 'layered necklaces', 'hoop earrings', 'bangles', 'feather earring', 'headband', 'bandana', 'choker', 'large rings', 'wooden jewelry', 'peace sign necklace', 'aviators', 'oversized glasses', 'hair flower', 'arm band', 'anklet', 'scarf belt', 'mood ring', 'beaded necklace', 'floppy hat', 'tassel necklace', 'leather cuff', 'woven belt', 'hair pick', 'brooch', 'medallion'],
      },
    },
    C: {
      name: 'Old Money / Ivy League',
      materials: ['cashmere', 'tweed', 'wool', 'silk', 'cotton', 'linen', 'leather', 'cable-knit', 'houndstooth', 'herringbone'],
      dna_overrides: {
        formality_range: [5, 9],
        preferred_tonal_strategy: ['tone-on-tone', 'tone-in-tone'],
        silhouette_preference: ['I', 'H'],
        proportion_style: 'column',
        era_mood_tags: ['old-money', 'ivy-league', 'preppy', 'classic'],
      },
      slots: {
        outer: ['tweed jacket', 'quilted jacket', 'camel coat', 'trench', 'gold button blazer', 'cable cardigan', 'barbour jacket', 'cape', 'navy blazer', 'cashmere coat', 'polo coat', 'waxed jacket', 'houndstooth blazer', 'wool vest', 'sweater vest', 'windbreaker', 'varsity jacket', 'harrington', 'field jacket', 'pea coat', 'duffle coat', 'gilet', 'linen blazer', 'silk bomber', 'knitted jacket', 'velvet blazer', 'wrap coat', 'herringbone coat', 'shawl cardigan', 'rain coat'],
        top: ['cable sweater', 'pussy-bow blouse', 'polo shirt', 'cricket jumper', 'white shirt', 'cashmere turtle', 'striped shirt', 'silk blouse', 'argyle vest', 'twin-set', 'oxford shirt', 'button-down', 'ringer tee', 'ribbed tank', 'boat neck top', 'linen shirt', 'sleeveless knit', 'v-neck sweater', 'mock neck', 'collared knit', 'wrap top', 'tie-neck blouse', 'sleeveless blouse', 'rugby shirt', 'fitted tee', 'cardigan', 'shell top', 'lace blouse', 'silk cami', 'tunic'],
        bottom: ['white jeans', 'riding pants', 'wool skirt', 'chinos', 'tailored shorts', 'wool trousers', 'straight jeans', 'tennis skirt', 'cigarette pants', 'linen trousers', 'pleated skirt', 'bermuda shorts', 'wide leg pants', 'plaid skirt', 'corduroy pants', 'capri pants', 'silk skirt', 'culottes', 'midi skirt', 'velvet skirt', 'tailored slacks', 'tweed skirt', 'cuffed shorts', 'straight skirt', 'high-waisted pants', 'check trousers', 'bootcut pants', 'sailor pants', 'wrap skirt', 'skort'],
        shoes: ['riding boots', 'horsebit loafers', 'ballet flats', 'driving shoes', 'court heels', 'slingbacks', 'tennis sneakers', 'oxfords', 'knee boots', 'velvet slippers', 'penny loafers', 'pumps', 'kitten heels', 'espadrilles', 'mules', 'mary janes', 'brogues', 'deck shoes', 'sandals', 'rain boots', 'patent flats', 'wedge heels', 'strappy sandals', 'cap-toe shoes', 'spectators', 'woven flats', 'ankle boots', 'slides', 'block heels', "d'orsay flats"],
        bag: ['structured handbag', 'canvas tote', 'bucket bag', 'box bag', 'vanity case', 'monogram bag', 'clutch', 'doctor bag', 'kelly bag', 'tote', 'saddle bag', 'top handle bag', 'frame bag', 'envelope clutch', 'leather satchel', 'wicker bag', 'crossbody', 'shoulder bag', 'baguette', 'bowling bag', 'wristlet', 'travel bag', 'trunk', 'mini bag', 'chain bag', 'flap bag', 'briefcase', 'shopper', 'camera bag', 'coin purse'],
        accessory: ['pearl necklace', 'headscarf', 'headband', 'leather belt', 'watch', 'stud earrings', 'signet ring', 'gloves', 'sunglasses', 'cardigan (shoulders)', 'brooch', 'hair clip', 'silk scarf', 'gold bangle', 'tennis bracelet', 'ribbon', 'hat', 'tote scarf', 'minimal ring', 'chain necklace', 'hoop earrings', 'leather watch', 'hair bow', 'glasses', 'crest pin', 'knee socks', 'tights', 'anklet', 'collar bar', 'compact'],
      },
    },
  },
};
