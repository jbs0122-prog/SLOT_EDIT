import { VibeDefinition } from './types';

export const CREATIVE_LAYERED: VibeDefinition = {
  keywords: ['mix', 'grunge', 'art', 'diy'],
  props: ['vinyl record (7-inch)', 'paint brushes (used)', 'sticker sheet', 'cassette tape', 'polaroid camera', 'guitar pick', 'spray paint can (prop)', 'sketchbook with doodles', 'safety pins (loose)', 'zine or indie magazine', 'skateboard wheel', 'patches', 'button pins', 'glitter jar', 'charcoal pencil', 'tattoo machine (prop)', 'dried flower bouquet', 'tarot cards', 'incense stick', 'burning sage', 'crystals (amethyst)', 'vintage lighter', 'chain link', 'studded choker (prop)', 'film negative strip', 'marker pen', 'collage scraps', 'lace ribbon spool', 'velvet pincushion', 'diary with lock'],
  dna: {
    formality_range: [0, 5],
    preferred_tonal_strategy: ['contrast', 'tone-in-tone'],
    silhouette_preference: ['V', 'A', 'Y'],
    texture_rules: {
      required_variety: 3,
      preferred_textures: ['rough', 'matte', 'sheen'],
      sheen_tolerance: 0.7,
    },
    color_palette: {
      primary: ['black', 'grey', 'white', 'denim'],
      secondary: ['burgundy', 'brown', 'olive', 'navy'],
      accent: ['red', 'purple', 'orange', 'pink', 'yellow'],
      max_accent_ratio: 0.25,
    },
    proportion_style: 'top-heavy',
    mixing_tolerance: 0.9,
    material_preferences: ['structured', 'casual', 'classic', 'sheer'],
    era_mood_tags: ['grunge', 'punk', 'DIY', 'eclectic', 'vintage'],
  },
  looks: {
    A: {
      name: 'Rock & Rebellion',
      materials: ['leather', 'denim', 'mesh', 'vinyl', 'lace', 'fishnet', 'studs', 'cotton', 'faux fur', 'velvet'],
      dna_overrides: {
        formality_range: [0, 4],
        preferred_tonal_strategy: ['contrast'],
        era_mood_tags: ['punk', 'rock', 'rebellion', 'grunge'],
      },
      slots: {
        outer: ['leather biker', 'denim jacket', 'corset belt', 'vinyl trench', 'cropped hoodie', 'leopard coat', 'studs jacket', 'blazer', 'flannel shirt', 'faux fur coat', 'bomber', 'military jacket', 'vest', 'trench', 'shearling', 'parka', 'cape', 'poncho', 'cardigan', 'kimono', 'windbreaker', 'raincoat', 'puffer', 'track jacket', 'shacket', 'varsity', 'bolero', 'duster', 'gilet', 'shawl'],
        top: ['corset', 'lace blouse', 'band tee', 'sweater', 'mesh bodysuit', 'fishnet top', 'slogan tee', 'tank', 'slip top', 'bustier', 'graphic tee', 'hoodie', 'crop top', 'shirt', 'blouse', 'camisole', 'turtleneck', 'bodysuit', 'tunic', 'vest', 'thermal', 'halter', 'tube top', 'off-shoulder', 'bralette', 'sheer top', 'layered top', 'ripped tee', 'vintage tee', 'muscle tank'],
        bottom: ['tulle skirt', 'ripped jeans', 'cargo mini', 'plaid skirt', 'leather pants', 'vinyl skirt', 'shorts', 'denim', 'skinny jeans', 'parachute pants', 'leggings', 'cargo pants', 'mini skirt', 'maxi skirt', 'midi skirt', 'trousers', 'shorts over tights', 'fishnet tights', 'biker shorts', 'sweatpants', 'joggers', 'wide leg jeans', 'bootcut jeans', 'flare jeans', 'skirt over pants', 'tiered skirt', 'bustle skirt', 'kilt', 'velvet pants', 'lace pants'],
        shoes: ['combat boots', 'loafers', 'mary janes', 'creepers', 'platform boots', 'high-tops', 'studded boots', 'buckle shoes', 'moto boots', 'heels', 'sneakers', 'boots', 'sandals', 'flats', 'platforms', 'wedges', 'clogs', 'mules', 'slides', 'oxfords', 'brogues', 'derby', 'monk straps', 'chelsea boots', 'winklepickers', 'knee boots', 'thigh boots', 'ankle boots', 'rain boots', 'skate shoes'],
        bag: ['backpack', 'chain bag', 'heart bag', 'studded bag', 'guitar strap bag', 'pouch', 'tote', 'velvet bag', 'box clutch', 'safety pin bag', 'crossbody', 'messenger', 'satchel', 'duffle', 'bucket bag', 'shoulder bag', 'fanny pack', 'sling', 'clutch', 'wristlet', 'coffin bag', 'bat bag', 'skull bag', 'mini bag', 'phone bag', 'coin purse', 'waist bag', 'camera bag', 'barrel bag', 'sack'],
        accessory: ['choker', 'necklaces', 'safety pins', 'tights', 'gloves', 'lock necklace', 'rings', 'nose ring', 'cuff', 'sunglasses', 'belt', 'chain', 'wristband', 'earrings', 'studs', 'spikes', 'bandana', 'scarf', 'hat', 'beanie', 'socks', 'arm warmer', 'leg warmer', 'harness', 'garter', 'collar', 'patch', 'pin', 'clip'],
      },
    },
    B: {
      name: 'Pattern Clash',
      materials: ['printed cotton', 'knit', 'denim', 'silk', 'patchwork', 'tapestry', 'wool', 'fleece', 'nylon', 'polyester'],
      dna_overrides: {
        formality_range: [1, 5],
        preferred_tonal_strategy: ['contrast', 'tone-in-tone'],
        mixing_tolerance: 1.0,
        era_mood_tags: ['pattern-clash', 'maximalist', 'playful'],
      },
      slots: {
        outer: ['fleece', 'windbreaker', 'patchwork jacket', 'cardigan', 'denim jacket', 'kimono', 'tapestry coat', 'blazer', 'striped jacket', 'bomber', 'trench', 'parka', 'raincoat', 'vest', 'poncho', 'cape', 'shawl', 'coat', 'jacket', 'hoodie', 'sweatshirt', 'shacket', 'gilet', 'bolero', 'duster', 'anorak', 'puffer', 'varsity', 'track jacket', 'shirt jacket'],
        top: ['knit', 'floral shirt', 'polka dot blouse', 'tie-dye', 'striped shirt', 'argyle vest', 'animal print', 'geometric shirt', 'sweater', 'hawaiian shirt', 'graphic tee', 'tank', 'crop top', 'blouse', 'shirt', 'tunic', 'camisole', 'turtleneck', 'bodysuit', 'vest', 'thermal', 'halter', 'tube top', 'off-shoulder', 'bralette', 'sheer top', 'layered top', 'ringer tee', 'vintage tee', 'muscle tank'],
        bottom: ['checkered pants', 'striped skirt', 'colored denim', 'patchwork jeans', 'floral skirt', 'plaid trousers', 'animal skirt', 'chinos', 'print pants', 'shorts', 'jeans', 'trousers', 'skirt', 'leggings', 'sweatpants', 'joggers', 'cargo pants', 'culottes', 'overalls', 'jumpsuit', 'wide leg', 'bootcut', 'flare', 'mini', 'midi', 'maxi', 'skort', 'bermuda', 'bike shorts', 'bloomers'],
        shoes: ['sneakers', 'boots', 'socks with sandals', 'cowboy boots', 'platforms', 'loafers', 'heels', 'printed boots', 'mary janes', 'mules', 'clogs', 'slides', 'flats', 'wedges', 'oxfords', 'brogues', 'derby', 'monk straps', 'chelsea boots', 'rain boots', 'skate shoes', 'high-tops', 'jellies', 'crocs', 'slippers', 'running shoes', 'hiking boots', 'espadrilles', 'moccasins', 'boat shoes'],
        bag: ['beaded bag', 'tote', 'patchwork bag', 'novelty bag', 'woven bag', 'fringe bag', 'shoulder bag', 'neon bag', 'sequin bag', 'backpack', 'crossbody', 'messenger', 'satchel', 'duffle', 'bucket bag', 'fanny pack', 'sling', 'clutch', 'wristlet', 'mini bag', 'phone bag', 'coin purse', 'waist bag', 'camera bag', 'barrel bag', 'sack', 'basket', 'net bag', 'jelly bag', 'plastic bag'],
        accessory: ['earrings', 'beads', 'rings', 'scarf', 'clips', 'tights', 'sunglasses', 'bandana', 'jewelry', 'bracelets', 'necklace', 'watch', 'belt', 'hat', 'beanie', 'socks', 'arm warmer', 'leg warmer', 'hair tie', 'scrunchie', 'pin', 'patch', 'brooch', 'glasses', 'headband', 'turban', 'gloves', 'lanyard', 'charm', 'sticker'],
      },
    },
    C: {
      name: 'Vintage Eclectic',
      materials: ['velvet', 'lace', 'crochet', 'suede', 'corduroy', 'denim', 'silk', 'wool', 'tapestry', 'embroidered'],
      dna_overrides: {
        formality_range: [1, 6],
        preferred_tonal_strategy: ['tone-in-tone', 'contrast'],
        era_mood_tags: ['vintage', 'eclectic', 'thrift', 'romantic'],
      },
      slots: {
        outer: ['field jacket', 'fur coat', 'embroidered jacket', 'liner', 'cardigan', 'blazer', 'jacket', 'shawl', 'capelet', 'trench', 'coat', 'parka', 'raincoat', 'vest', 'poncho', 'cape', 'hoodie', 'sweatshirt', 'shacket', 'gilet', 'bolero', 'duster', 'anorak', 'puffer', 'varsity', 'track jacket', 'shirt jacket', 'shearling', 'suede', 'velvet'],
        top: ['lace blouse', 'crochet top', 'vest', 'slip dress', 'thermal', 'shirt', 'blouse', 'knit', 'cami', 'tunic', 'tank', 'crop top', 'turtleneck', 'bodysuit', 'halter', 'tube top', 'off-shoulder', 'bralette', 'sheer top', 'layered top', 'ringer tee', 'vintage tee', 'muscle tank', 'sweater', 'cardigan', 'corset', 'bodice', 'peasant top', 'smock'],
        bottom: ['velvet skirt', 'corduroy pants', 'trousers', 'skirt', 'shorts', 'bloomers', 'pants', 'suspender skirt', 'maxi', 'culottes', 'jeans', 'leggings', 'sweatpants', 'joggers', 'cargo pants', 'overalls', 'jumpsuit', 'wide leg', 'bootcut', 'flare', 'mini', 'midi', 'skort', 'bermuda', 'bike shorts', 'knickers', 'petticoat', 'tiered skirt', 'ruffle skirt', 'pleated skirt'],
        shoes: ['mary janes', 'cowboy boots', 'loafers', 't-strap', 'oxfords', 'boots', 'lace-up', 'clogs', 'heels', 'brogues', 'flats', 'mules', 'slides', 'wedges', 'sandals', 'sneakers', 'platforms', 'espadrilles', 'moccasins', 'boat shoes', 'rain boots', 'skate shoes', 'high-tops', 'jellies', 'slippers', 'running shoes', 'hiking boots', 'derby', 'monk straps', 'chelsea boots'],
        bag: ['tapestry bag', 'frame bag', 'doctor bag', 'purse', 'pouch', 'basket', 'satchel', 'drawstring', 'coin purse', 'needlepoint bag', 'tote', 'backpack', 'crossbody', 'messenger', 'duffle', 'bucket bag', 'fanny pack', 'sling', 'clutch', 'wristlet', 'mini bag', 'phone bag', 'waist bag', 'camera bag', 'barrel bag', 'sack', 'net bag', 'jelly bag', 'plastic bag', 'suitcase'],
        accessory: ['brooch', 'chain', 'beret', 'collar', 'necklace', 'watch', 'gloves', 'knee highs', 'ribbon', 'scarf', 'earrings', 'rings', 'bracelet', 'belt', 'hat', 'beanie', 'socks', 'arm warmer', 'leg warmer', 'hair tie', 'scrunchie', 'pin', 'patch', 'glasses', 'headband', 'turban', 'locket', 'fan', 'cameo', 'hat pin'],
      },
    },
  },
};
