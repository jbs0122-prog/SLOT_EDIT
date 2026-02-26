import { VibeDefinition } from './types';

export const SPORT_MODERN: VibeDefinition = {
  keywords: ['tech', 'speed', 'future', 'gym'],
  props: ['matte black water bottle', 'protein shaker', 'wireless earbuds case', 'gym towel (rolled)', 'smart watch on stand', 'resistance band', 'yoga mat strap', 'energy gel packet', 'futuristic sunglasses', 'digital stopwatch', 'carabiner keychain', 'electrolyte powder stick', 'sleek dumbbell', 'jump rope', 'visor cap', 'sweatband', 'running socks (packaged)', 'action camera', 'sneaker cleaning kit', 'mesh laundry bag', 'vitamin case', 'heart rate monitor', 'reusable straw', 'locker key', 'gym pass', 'phone armband', 'cooling towel', 'massage ball', 'blister patches', 'tech pouch'],
  dna: {
    formality_range: [0, 4],
    preferred_tonal_strategy: ['contrast', 'tone-on-tone'],
    silhouette_preference: ['I', 'V'],
    texture_rules: {
      required_variety: 2,
      preferred_textures: ['smooth', 'matte', 'structured'],
      sheen_tolerance: 0.5,
    },
    color_palette: {
      primary: ['black', 'grey', 'white', 'navy'],
      secondary: ['olive', 'khaki', 'charcoal'],
      accent: ['orange', 'teal', 'red', 'green'],
      max_accent_ratio: 0.15,
    },
    proportion_style: 'balanced',
    mixing_tolerance: 0.4,
    material_preferences: ['technical', 'casual', 'blend'],
    era_mood_tags: ['gorpcore', 'athleisure', 'tech-wear', 'sport'],
  },
  looks: {
    A: {
      name: 'City Tech (Gorpcore)',
      materials: ['gore-tex', 'nylon', 'fleece', 'ripstop', 'merino', 'mesh', 'softshell', 'insulated', 'waterproof', 'technical'],
      dna_overrides: {
        formality_range: [0, 3],
        proportion_style: 'top-heavy',
        era_mood_tags: ['gorpcore', 'tech-wear', 'outdoor-urban'],
      },
      slots: {
        outer: ['3-layer shell', 'tech trench', 'windbreaker', 'utility vest', 'anorak', 'rain poncho', 'puffer', 'fleece', 'tactical vest', 'convertible jacket', 'softshell', 'parka', 'down jacket', 'rain jacket', 'mountain parka', 'gilet', 'coach jacket', 'bomber', 'track jacket', 'hooded jacket', 'tech blazer', 'nylon coat', 'insulated jacket', 'storm coat', 'field jacket', 'cargo vest', 'running jacket', 'cycling jacket', 'ski jacket', 'cape'],
        top: ['merino base', 'tech-fleece', 'performance tee', 'tactical vest', 'mesh layer', 'compression top', 'mock neck', 'zip polo', 'hooded sleeve', 'graphic tee', 'thermal top', 'running shirt', 'seamless top', 'tank top', 'rash guard', 'jersey', 'hiking shirt', 'grid fleece', 'sun hoodie', 'vented shirt', 'ripstop shirt', 'nylon top', 'half-zip', 'crewneck', 'muscle tee', 'baselayer', 'dry-fit tee', 'logo top', 'crop top', 'bodysuit'],
        bottom: ['cargo pants', 'waterproof trousers', 'convertible pants', 'parachute pants', 'hiking shorts', 'joggers', 'nylon pants', 'climbing pants', 'wind pants', 'leggings', 'tech shorts', 'trek pants', 'rain pants', 'softshell pants', 'utility pants', 'baggy shorts', 'ripstop pants', 'articulated pants', 'fleece pants', 'ski pants', 'tights', 'biker shorts', 'split hem pants', 'drawstring pants', 'cargo shorts', 'board shorts', 'running tights', 'insulated pants', 'hybrid shorts', 'cropped pants'],
        shoes: ['gore-tex sneakers', 'trail runners', 'sandals', 'trekking boots', 'chunky sneakers', 'vibram shoes', 'waterproof boots', 'slip-ons', 'approach shoes', 'hiking boots', 'running shoes', 'recovery slides', 'water shoes', 'tech boots', 'sock shoes', 'climacool shoes', 'mountain boots', 'gaiter shoes', 'trail sandals', 'winter boots', 'rubber boots', 'hybrid shoes', 'aqua shoes', 'speedcross shoes', 'minimalist runners', 'heavy tread boots', 'moccasins (tech)', 'high-tops', 'mules', 'clogs'],
        bag: ['sacoche', 'backpack', 'chest rig', 'waist bag', 'dry bag', 'sling', 'hydration pack', 'utility pouch', 'carabiner bag', 'duffle', 'roll-top bag', 'messenger', 'hip pack', 'camera bag', 'phone holder', 'tote', 'gym bag', 'harness bag', 'cross-body', 'running vest', 'map case', 'tool bag', 'waterproof bag', 'frame bag', 'saddle bag', 'modular bag', 'belt bag', 'bottle bag', 'laptop bag', 'stuff sack'],
        accessory: ['bucket hat', 'sunglasses', 'carabiner', 'bracelet', 'gaiter', 'gloves', 'beanie', 'watch', 'utility belt', 'armbands', 'cap', 'headband', 'socks', 'lanyard', 'bandana', 'compass', 'whistle', 'key clip', 'paracord', 'face mask', 'visor', 'ear muffs', 'neck warmer', 'gps watch', 'sweatband', 'laces', 'pins', 'patch'],
      },
    },
    B: {
      name: 'Athleisure Luxe',
      materials: ['jersey', 'spandex', 'mesh', 'neoprene', 'seamless knit', 'fleece', 'satin', 'compression', 'ribbed', 'cotton blend'],
      dna_overrides: {
        formality_range: [1, 5],
        proportion_style: 'balanced',
        era_mood_tags: ['athleisure', 'studio', 'wellness'],
      },
      slots: {
        outer: ['cropped puffer', 'track jacket', 'hoodie', 'bolero', 'zip fleece', 'bomber', 'windbreaker', 'wrap cardigan', 'shearling slide', 'glossy vest', 'yoga jacket', 'running jacket', 'shrug', 'sweatshirt', 'rain jacket', 'longline hoodie', 'teddy jacket', 'quilted vest', 'cape', 'poncho', 'oversized sweat', 'softshell', 'mesh jacket', 'kimono', 'blazer (jersey)', 'anorak', 'down vest', 'training jacket', 'fleece pullover', 'varsity jacket'],
        top: ['sports bra', 'compression tee', 'bodysuit', 'tank', 'off-shoulder sweat', 'seamless top', 'hoodie', 'racerback', 'wrap top', 'mesh top', 'crop top', 'yoga top', 'long sleeve tee', 'muscle tank', 'ribbed top', 'camisole', 'half-zip', 'sweatshirt', 'graphic tee', 'bralette', 'corset top', 'thermal', 'halter top', 'cut-out top', 'asymmetrical top', 'tube top', 'tunic', 'twisted top', 'performance tee', 'layered top'],
        bottom: ['leggings', 'joggers', 'biker shorts', 'split-hem leggings', 'sweat skirt', 'yoga pants', 'track pants', 'running shorts', 'unitard', 'stirrup leggings', 'flare leggings', 'sweatshorts', 'dance pants', 'harem pants', 'wide leg sweats', 'cargo joggers', 'skirt over leggings', 'compression shorts', 'tennis skirt', 'cycling shorts', 'nylon pants', 'mesh shorts', 'ribbed pants', 'bootcut leggings', 'capri pants', 'knitted pants', 'drawstring shorts', 'palazzo pants', 'utility leggings', 'soft pants'],
        shoes: ['running shoes', 'slides', 'sock sneakers', 'platform sneakers', 'training shoes', 'sandals', 'high-tops', 'casual runners', 'white sneakers', 'yoga shoes', 'dance shoes', 'slip-ons', 'mules', 'flip-flops', 'ballet sneakers', 'canvas shoes', 'wedge sneakers', 'knit shoes', 'fashion trainers', 'chunky soles', 'retro runners', 'futuristic shoes', 'recovery shoes', 'mesh sneakers', 'velcro shoes', 'split sole shoes', 'minimal sneakers', 'gym shoes', 'studio wraps', 'barefoot shoes'],
        bag: ['gym bag', 'backpack', 'tote', 'belt bag', 'phone holder', 'bottle bag', 'crossbody', 'shopper', 'duffle', 'mini backpack', 'yoga bag', 'mat bag', 'sackpack', 'wristlet', 'waist pack', 'barrel bag', 'mesh tote', 'sling bag', 'bucket bag', 'cosmetic bag', 'shoe bag', 'drawstring bag', 'clutch', 'lanyard bag', 'tech pouch', 'oversized tote', 'structured gym bag', 'wet bag', 'laundry bag', 'card holder'],
        accessory: ['cap', 'headphones', 'scrunchie', 'socks', 'sunglasses', 'sweatband', 'watch', 'towel', 'jewelry', 'hair clip', 'headband', 'visor', 'hair tie', 'phone case', 'gloves', 'mat strap', 'leg warmers', 'arm band', 'hat', 'hair band', 'fitness tracker', 'necklace', 'earrings', 'rings', 'bracelet'],
      },
    },
    C: {
      name: 'Blokecore / Jersey',
      materials: ['polyester', 'mesh', 'nylon', 'jersey', 'denim', 'fleece', 'cotton', 'drill', 'shell', 'satin'],
      dna_overrides: {
        formality_range: [0, 4],
        silhouette_preference: ['H', 'I'],
        proportion_style: 'balanced',
        era_mood_tags: ['blokecore', 'terrace', 'retro-sport'],
      },
      slots: {
        outer: ['track jacket', 'coach jacket', 'stadium parka', 'varsity bomber', 'windbreaker', 'training jacket', 'bench coat', 'warm-up top', 'anorak', 'denim jacket', 'drill top', 'rain jacket', 'puffer', 'fleece', 'gilet', 'nylon vest', 'souvenir jacket', 'retro jacket', 'shell suit top', 'half-zip', 'hoodie', 'sweatshirt', 'poncho', 'bomber', 'terrace jacket', 'harrington', 'cagoule', 'manager coat', 'sideline jacket', 'anthem jacket'],
        top: ['soccer jersey', 'ringer tee', 'polo', 'goalkeeper jersey', 'graphic tee', 'rugby shirt', 'sweatshirt', 'training top', 'half-zip', 'tank', 'vintage kit', 'long sleeve jersey', 'oversized tee', 'striped shirt', 'basketball jersey', 'hockey jersey', 'baseball shirt', 'referee shirt', 'retro tee', 'slogan tee', 'knitted polo', 'mesh top', 'warm-up shirt', 'muscle tee', 'crewneck', 'v-neck jersey', 'collared shirt', 'zip neck', 'drill top', 'sleeveless jersey'],
        bottom: ['track pants', 'jorts', 'nylon shorts', 'jeans', 'warm-up pants', 'cargo shorts', 'soccer shorts', 'straight denim', 'sweatpants', 'windbreaker pants', 'basketball shorts', 'running shorts', 'cargo pants', 'chinos', 'bermuda shorts', 'swim shorts', 'cycling shorts', 'tear-away pants', 'fleece shorts', 'wide leg jeans', 'corduroy shorts', 'training pants', 'joggers', 'retro shorts', 'goalie pants', 'technical shorts', 'baggy jeans', 'dungarees', 'tapered pants', 'shell pants'],
        shoes: ['terrace sneakers', 'retro runners', 'slides', 'indoor soccer shoes', 'canvas sneakers', 'chunky trainers', 'high-tops', 'gum soles', 'leather trainers', 'casual boots', 'skate shoes', 'classic sneakers', 'low-tops', 'dad shoes', 'football trainers', 'velcro shoes', 'slip-ons', 'suede sneakers', 'court shoes', 'ugly sneakers', 'futsal shoes', 'hiking hybrids', 'basketball shoes', 'vulcanized shoes', 'deck shoes', 'driving shoes', 'plimsolls', 'clogs', 'mules', 'limited edition kicks'],
        bag: ['crossbody', 'duffle', 'drawstring bag', 'shoebox bag', 'messenger', 'waist bag', 'tote', 'nylon bag', 'sacoche', 'gym sack', 'backpack', 'sling', 'boot bag', 'kit bag', 'barrel bag', 'shoulder bag', 'holdall', 'mini bag', 'phone bag', 'bum bag', 'record bag', 'flight bag', 'retro bag', 'vinyl bag', 'canvas tote', 'reporter bag', 'camera bag', 'utility bag', 'pouch', 'wash bag'],
        accessory: ['scarf', 'beanie', 'bucket hat', 'sunglasses', 'socks', 'chain', 'rings', 'wristband', 'cap', 'whistle', 'sweatband', 'gloves', 'badge', 'pin', 'lanyard', 'lighter', 'bandana', 'hair band', 'watch', 'necklace', 'bracelet', 'earring', 'phone case', 'key ring', 'bottle opener', 'patches'],
      },
    },
  },
};
