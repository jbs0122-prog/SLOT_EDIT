import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VIBE_DNA: Record<string, {
  colors: { primary: string[]; secondary: string[]; accent: string[] };
}> = {
  elevated_cool: {
    colors: { primary: ["black", "charcoal", "navy", "white"], secondary: ["grey", "cream", "camel"], accent: ["burgundy", "metallic", "wine"] },
  },
  effortless_natural: {
    colors: { primary: ["beige", "cream", "ivory", "white"], secondary: ["olive", "khaki", "tan", "sage", "brown"], accent: ["rust", "mustard", "burgundy"] },
  },
  artistic_minimal: {
    colors: { primary: ["black", "white", "grey", "charcoal"], secondary: ["cream", "beige", "navy"], accent: ["rust", "olive", "burgundy"] },
  },
  retro_luxe: {
    colors: { primary: ["burgundy", "navy", "brown", "cream"], secondary: ["camel", "olive", "wine", "beige"], accent: ["rust", "mustard", "teal", "gold"] },
  },
  sport_modern: {
    colors: { primary: ["black", "grey", "white", "navy"], secondary: ["olive", "khaki", "charcoal"], accent: ["orange", "teal", "red", "green"] },
  },
  creative_layered: {
    colors: { primary: ["black", "grey", "white", "denim"], secondary: ["burgundy", "brown", "olive", "navy"], accent: ["red", "orange", "pink", "yellow"] },
  },
};

const VIBE_LOOKS: Record<string, Record<string, {
  name: string; materials: string[];
  items: Record<string, string[]>;
}>> = {
  elevated_cool: {
    A: { name: "Downtown Tailoring", materials: ["fine wool", "stiff cotton", "smooth leather", "cashmere", "silk", "gabardine", "poplin", "neoprene", "satin"],
      items: {
        outer: ["oversized wool coat", "structured trench", "boxy leather blazer", "double-breasted maxi coat", "cropped tailored jacket", "collarless wool blazer", "pinstripe blazer", "hourglass coat", "cashmere wrap coat", "structured gilet", "tuxedo jacket", "cape blazer", "wool trench", "leather trench", "belted blazer", "boyfriend blazer", "shawl collar coat", "masculine overcoat", "sharp shoulder coat", "asymmetrical jacket", "minimalist parka", "wool bomber", "cropped trench", "longline vest", "split-sleeve blazer", "granddad coat", "textured wool coat", "neoprene coat", "raw-edge blazer", "archival coat"],
        top: ["high-neck knit", "crisp poplin shirt", "sheer layering top", "asymmetric drape top", "silk button-down", "structured bustier", "fine turtleneck", "sleeveless vest", "ribbed mock neck", "satin blouse", "architectural shirt", "cotton tunic", "cutout bodysuit", "stiff collar shirt", "deep v-neck knit", "wool polo", "oversized cuff shirt", "backless top", "harness detail top", "mesh long sleeve", "cold shoulder top", "cropped white shirt", "silk camisole", "structured tee", "layered shirt", "wrap blouse", "metallic thread knit", "bandage top", "organza shirt", "minimalist tee"],
        bottom: ["wide-leg wool trousers", "tailored Bermuda shorts", "leather pants", "maxi pencil skirt", "pleated trousers", "cigarette pants", "high-waisted slacks", "wool culottes", "bootcut trousers", "stirrup pants", "straight leg black jeans", "satin midi skirt", "puddle hem pants", "refined cargo trousers", "split hem leggings", "wool mini skirt", "tailored joggers", "draped skirt", "tuxedo pants", "leather midi skirt", "pinstripe slacks", "barrel leg pants", "asymmetric skirt", "silk trousers", "raw hem denim", "wide cuff pants", "pleated shorts", "wrap skirt", "neoprene pants", "structured skort"],
        shoes: ["square-toe boots", "chunky loafers", "architectural heels", "pointed mules", "ankle boots", "slingbacks", "minimal slides", "chelsea boots", "oxfords", "knee-high boots", "tabi boots", "platform loafers", "strappy sandals", "clean leather sneakers", "derby shoes", "sock boots", "kitten heels", "wedge mules", "sleek combat boots", "ballerina flats", "metallic heels", "patent boots", "driving shoes", "brogues", "thigh-high boots", "d'orsay flats", "structured sandals", "matte rain boots", "velvet slippers", "monk straps"],
        bag: ["geometric tote", "metal clutch", "box bag", "oversized clutch", "doctor bag", "baguette", "accordion bag", "rigid shopper", "envelope clutch", "structured bucket bag", "briefcase", "top handle bag", "cylinder bag", "triangular bag", "phone pouch", "wristlet", "architectural shoulder bag", "hard-shell clutch", "minimal backpack", "silver tote", "patent leather bag", "frame bag", "leather belt bag", "saddle bag", "crossbody box", "portfolio", "vertical tote", "chain strap bag", "lucite clutch", "knot bag"],
        accessory: ["silver chain necklace", "metal sunglasses", "leather gloves", "wide belt", "sculptural ring", "minimal watch", "pocket square", "silver hoops", "leather harness", "cuff bracelet", "geometric earrings", "glasses chain", "choker", "signet ring", "ear cuff", "hair stick", "modern brooch", "tie bar", "collar pin", "leather bracelet", "silver bangle", "knuckle ring", "matte hair clip", "chain belt", "silk neck scarf", "anklet", "arm band", "pendant necklace", "stacked rings"],
        mid: ["cashmere turtleneck", "ribbed mock-neck top", "fine-knit vest", "silk base layer", "wool polo", "structured bustier", "sleeveless vest"],
      } },
    B: { name: "Neo-Prep Edge", materials: ["tweed", "corduroy", "denim", "cable-knit", "velvet", "wool", "oxford cloth", "flannel"],
      items: {
        outer: ["varsity jacket", "cropped bomber", "wool peacoat", "harrington jacket", "oversized cardigan", "duffle coat", "navy blazer", "cricket sweater", "denim jacket", "biker jacket", "short trench coat", "cable knit cardigan", "corduroy jacket", "quilted jacket", "velvet blazer", "stadium jumper", "waxed jacket", "shearling aviator", "check blazer", "retro windbreaker", "fleece vest", "suede bomber", "track jacket", "hooded duffle", "leather blazer", "utility jacket", "cape coat", "patchwork jacket", "tweed jacket", "coach jacket"],
        top: ["cable vest", "polo shirt", "oxford shirt", "rugby shirt", "argyle sweater", "V-neck jumper", "white shirt", "striped boat neck", "crest sweatshirt", "turtleneck", "button-down", "ringer tee", "thermal henley", "cropped knit", "university logo tee", "layered hoodie", "fair isle knit", "mesh polo", "oversized shirt", "graphic sweater", "zip-up knit", "sleeveless hoodie", "waffle top", "check shirt", "ribbed tank", "mock neck tee", "corset shirt", "vintage sweat", "cropped polo"],
        bottom: ["pleated mini skirt", "chinos", "raw denim", "wool check skirt", "tailored shorts", "wide chinos", "tartan trousers", "corduroy pants", "skort", "straight jeans", "Bermuda shorts", "cargo skirt", "structured sweatpants", "plaid pants", "leather shorts", "kilt", "tennis skirt", "carpenter pants", "velvet skirt", "track pants", "wide denim", "suspender skirt", "culottes", "stirrup leggings", "patchwork jeans", "button skirt", "cuffed shorts", "biking shorts", "cargo jeans", "relaxed slacks"],
        shoes: ["loafers with socks", "derby shoes", "retro sneakers", "mary janes", "boat shoes", "brogues", "desert boots", "saddle shoes", "leather sneakers", "canvas high-tops", "platform loafers", "rain boots", "wallabees", "gum sole shoes", "low hiking boots", "clogs", "slip-ons", "oxford heels", "knee boots", "combat boots", "tassel loafers", "driving shoes", "court shoes", "velcro sneakers", "slide sandals with socks", "monk straps", "creepers", "ballet flats", "spectator shoes", "vintage runners"],
        bag: ["satchel", "canvas tote", "bowling bag", "backpack", "messenger bag", "saddle bag", "book bag", "briefcase", "nylon backpack", "drawstring bag", "duffle", "waist bag", "crossbody camera bag", "logo tote", "school bag", "mini trunk", "gym sack", "helmet bag", "tool bag", "vintage purse", "barrel bag", "laptop case", "lunch box style bag", "plaid tote", "bucket bag", "phone sling", "flap bag", "weekender", "coin pouch", "utility bag"],
        accessory: ["skinny tie", "baseball cap", "knee socks", "crest brooch", "glasses chain", "headband", "school scarf", "signet ring", "leather belt", "tie clip", "scrunchie", "bow tie", "enamel pin", "whistle necklace", "wristband", "sport socks", "beanie", "lanyard", "friendship bracelet", "nato strap watch", "bandana", "hair bow", "pearl choker", "id bracelet", "collar tips", "backpack charm", "suspenders", "striped socks", "bucket hat", "reading glasses"],
        mid: ["cable-knit sweater", "argyle vest", "rollneck knit", "fine cotton cardigan", "cricket sweater", "fair isle knit"],
      } },
    C: { name: "High-End Street", materials: ["nylon", "leather", "tech-fleece", "mesh", "neoprene", "denim", "ripstop", "reflective fabric"],
      items: {
        outer: ["puffer vest", "technical bomber", "shearling jacket", "biker jacket", "coach jacket", "denim jacket", "heavy hoodie", "anorak", "windbreaker", "track jacket", "fleece jacket", "oversized parka", "tactical vest", "rain poncho", "utility jacket", "cargo jacket", "varsity bomber", "nylon trench", "reflective jacket", "down jacket", "shell jacket", "gilet", "moto jacket", "souvenir jacket", "cropped puffer", "flannel shirt-jacket", "faux fur coat", "stadium jacket", "hooded cape", "convertible jacket"],
        top: ["cashmere hoodie", "boxy tee", "mock-neck sweat", "half-zip", "mesh tee", "thermal top", "graphic tee", "crewneck", "muscle tank", "neoprene top", "tech-fleece top", "longline tee", "football jersey", "crop top", "racerback tank", "oversized shirt", "corset hoodie", "cutout top", "tie-dye tee", "band tee", "layered long sleeve", "zip polo", "asymmetrical top", "sleeveless hoodie", "vintage wash tee", "ribbed body", "distressed sweater", "logo knit", "tight turtleneck", "sports jersey"],
        bottom: ["cargo sweats", "parachute pants", "leather joggers", "track pants", "grey denim", "sweatshorts", "cargo jeans", "biker jeans", "chinos", "tech shorts", "drawstring trousers", "nylon pants", "baggy jeans", "ripstop cargos", "utility skirt", "shorts over pants", "wide sweatpants", "carpenter jeans", "tear-away pants", "moto pants", "camo pants", "distressed shorts", "reflective pants", "double-knee pants", "jogger shorts", "oversized shorts", "stacked denim", "vinyl pants", "basketball shorts", "tactical pants"],
        shoes: ["high-top sneakers", "combat boots", "chelsea boots", "tech slides", "dad sneakers", "sock sneakers", "luxury runners", "hiking sneakers", "rubber boots", "slip-ons", "retro basketball shoes", "platform boots", "future slides", "foam runners", "tactical boots", "skate shoes", "canvas low-tops", "reflective sneakers", "chunky sandals", "tabi sneakers", "moon boots", "work boots", "moto boots", "velcro sneakers", "air-bubble sneakers", "trail runners", "wedge sneakers", "industrial boots", "minimal trainers"],
        bag: ["mini leather bag", "sling bag", "cassette bag", "utility crossbody", "chest rig", "oversized tote", "belt bag", "gym bag", "phone pouch", "tech backpack", "duffle", "shoebox bag", "nylon tote", "carabiner bag", "waist pouch", "hydration pack", "camera bag", "mini backpack", "vertical shopper", "padded tote", "chain bag", "industrial bag", "transparent bag", "reflective bag", "modular bag", "neck pouch", "drawstring sack", "weekender", "holster bag", "tactical pouch"],
        accessory: ["beanie", "silver rings", "headphones", "chain necklace", "bucket hat", "shield sunglasses", "baseball cap", "bandana", "industrial belt", "wristbands", "ear pods", "paracord bracelet", "face mask", "carabiner", "heavy chain", "knuckle duster ring", "visor", "logo socks", "multiple earrings", "tech gloves", "wallet chain", "choker", "smart watch", "fingerless gloves", "hair clips", "sweatband", "neck gaiter"],
        mid: ["logo sweatshirt", "zip-up fleece", "cropped hoodie", "tech half-zip", "corset hoodie", "cashmere hoodie"],
      } },
  },
  effortless_natural: {
    A: { name: "Japandi Flow", materials: ["linen", "cotton", "raw silk", "gauze", "hemp", "wool", "bamboo", "organic cotton"],
      items: {
        outer: ["collarless liner", "soft blazer", "kimono cardigan", "noragi", "robe coat", "chore coat", "linen jacket", "poncho", "quilted vest", "oversized cardigan", "wrap coat", "haori jacket", "knitted vest", "linen duster", "textured coat", "shawl collar jacket", "cocoon coat", "boiled wool jacket", "canvas jacket", "capelet", "blanket coat", "asymmetrical jacket", "tunic coat", "padded liner", "waffle robe", "soft trench", "gauze jacket", "open front cardigan", "wool cape", "shrug"],
        top: ["linen tunic", "waffle henley", "organic tee", "wrap top", "boat neck knit", "linen shirt", "grandad shirt", "gauze blouse", "raw silk top", "drop-shoulder tee", "knit tank", "cashmere sweater", "dolman sleeve top", "tunic shirt", "ribbed tank", "kimono top", "oversized tee", "layered tank", "hemp shirt", "boxy knit", "cowl neck top", "sleeveless tunic", "pointelle knit", "silk cami", "thermal top", "raglan tee", "crop linen top", "asymmetrical blouse", "soft cotton shirt", "boat neck tee"],
        bottom: ["wide linen trousers", "drawstring pants", "maxi skirt", "culottes", "balloon pants", "midi skirt", "relaxed trousers", "wrap pants", "gauze pants", "knit pants", "harem pants", "sarouel pants", "cotton slacks", "raw silk pants", "pleated skirt", "wide leg white jeans", "bermuda shorts", "tiered skirt", "lounge pants", "ribbed leggings", "hakama pants", "dhoti pants", "soft shorts", "pajama style pants", "cropped wide pants", "elastic waist skirt", "linen shorts", "fluid trousers", "canvas pants", "knitted skirt"],
        shoes: ["suede mules", "leather slides", "tabi flats", "babouche", "canvas sneakers", "leather sandals", "clogs", "soft loafers", "espadrilles", "barefoot shoes", "woven flats", "cork sandals", "velvet slippers", "moccasins", "knit sneakers", "gladiator sandals", "ballet flats", "toe-ring sandals", "wooden clogs", "straw sandals", "canvas slip-ons", "leather flip-flops", "suede booties", "sheepskin slippers", "minimal boots", "rope sandals", "mesh flats", "soft derby", "flat mary janes", "huaraches"],
        bag: ["soft hobo", "canvas bucket", "knot bag", "net bag", "market tote", "linen shopper", "woven bag", "drawstring pouch", "straw bag", "slouchy shoulder bag", "basket bag", "cotton tote", "macrame bag", "bamboo handle bag", "leather sack", "furoshiki bag", "crochet bag", "wooden cage bag", "jute bag", "oversized canvas bag", "wristlet", "soft clutch", "bucket tote", "round rattan bag", "raffia bag", "knitted bag", "suede pouch", "phone sling", "vegetable tanned leather bag", "folded clutch"],
        accessory: ["ceramic jewelry", "cotton scarf", "bucket hat", "wooden beads", "linen hair tie", "silver bangle", "apron", "round glasses", "leather cord", "wooden bangle", "hair stick", "simple ring", "matte earrings", "pearl studs", "canvas belt", "straw hat", "turban", "silk scrunchie", "anklet", "barefoot sandals", "pendant", "stone necklace", "woven bracelet", "minimalist watch", "tote charm", "glass beads", "bone ring", "leather cuff", "head wrap", "shawl"],
        mid: ["linen cardigan", "waffle-knit top", "cotton ribbed vest", "gauze layer top", "kimono cardigan", "knitted vest"],
      } },
    B: { name: "French Casual", materials: ["cotton", "silk", "wool", "cashmere", "linen", "denim", "boucle", "poplin"],
      items: {
        outer: ["trench coat", "wool blazer", "cardigan coat", "boucle jacket", "peacoat", "clean denim jacket", "soft biker jacket", "tweed jacket", "camel coat", "oversized blazer", "rain mac", "houndstooth jacket", "utility jacket", "cape", "shearling coat", "navy blazer", "corduroy jacket", "wrap coat", "gilet", "duster coat", "quilted jacket", "leather blazer", "boxy jacket", "velvet blazer", "linen blazer", "chore jacket", "silk bomber", "poncho", "shacket", "knitted coat"],
        top: ["Breton stripe tee", "cashmere crew neck", "silk blouse", "boat neck top", "ribbed knit", "button-down", "camisole", "v-neck sweater", "polo knit", "lace trim top", "blue shirt", "ringer tee", "wrap blouse", "sleeveless turtleneck", "polka dot top", "gingham shirt", "white tee", "muscle tank", "cropped cardigan", "silk tank", "puff sleeve blouse", "square neck top", "vintage graphic tee", "linen shirt", "poplin top", "sheer blouse", "mock neck", "tie-front shirt", "corset top", "thermal"],
        bottom: ["vintage denim", "silk skirt", "white jeans", "corduroy pants", "button skirt", "cigarette pants", "cropped flare jeans", "mini skirt", "tailored shorts", "slip skirt", "straight leg jeans", "wide leg jeans", "linen trousers", "culottes", "midi skirt", "pencil skirt", "bermuda shorts", "sailor pants", "check trousers", "wrap skirt", "overall dress", "velvet pants", "knit skirt", "denim shorts", "high-waisted shorts", "pleated trousers", "leather skirt", "refined cargo pants", "silk joggers", "tiered skirt"],
        shoes: ["ballet flats", "minimal sneakers", "suede loafers", "ankle boots", "espadrilles", "mary janes", "strappy sandals", "knee boots", "kitten heels", "driving shoes", "court shoes", "block heels", "mules", "canvas shoes", "clogs", "derby shoes", "brogues", "slingbacks", "d'orsay pumps", "woven flats", "velvet slippers", "rain boots", "riding boots", "gladiator sandals", "wedge espadrilles", "patent loafers", "metallic sandals", "pointed flats", "chelsea boots", "slide sandals"],
        bag: ["straw basket", "canvas tote", "leather shoulder bag", "baguette", "bucket bag", "clasp purse", "mini handbag", "woven tote", "saddle bag", "clutch", "frame bag", "box bag", "chain bag", "wicker bag", "crossbody", "shopper", "tote", "vanity case", "drawstring bag", "bowling bag", "messenger", "nylon bag", "beaded bag", "bamboo bag", "doctor bag", "phone bag", "wristlet", "camera bag", "satchel", "coin purse"],
        accessory: ["silk scarf", "gold hoops", "beret", "thin belt", "cat-eye glasses", "gold necklace", "hair clip", "watch", "scrunchie", "pearl necklace", "ribbon", "headband", "sunglasses", "signet ring", "anklet", "bracelet stack", "vintage watch", "hair bow", "cameo", "locket", "bangle", "ear cuff", "lapel pin", "chain belt", "leather gloves", "reading glasses", "hat pin", "bobby pins", "tote scarf"],
        mid: ["cashmere crew-neck", "cotton cardigan", "fine-knit pullover", "silk layer top", "cropped cardigan", "v-neck sweater"],
      } },
    C: { name: "Soft Amekaji", materials: ["denim", "flannel", "canvas", "waxed cotton", "wool", "corduroy", "chambray", "canvas duck"],
      items: {
        outer: ["quilted liner", "field jacket", "duffle coat", "barn jacket", "coverall", "down vest", "chore coat", "flannel shirt-jacket", "corduroy jacket", "hunting jacket", "heavy cardigan", "denim jacket", "parka", "wool vest", "shop coat", "fleece jacket", "rain parka", "engineers jacket", "utility vest", "deck jacket", "mountain parka", "souvenir jacket", "canvas coat", "blanket coat", "shawl collar cardigan", "waxed jacket", "varsity jacket", "anorak", "pilot jacket", "ranch coat"],
        top: ["chambray shirt", "fair isle knit", "layered turtleneck", "flannel shirt", "sweatshirt", "thermal henley", "denim shirt", "ringer tee", "raglan tee", "waffle knit", "cable sweater", "work shirt", "pocket tee", "hoodie", "baseball tee", "grandad shirt", "striped tee", "logger shirt", "wool shirt", "mechanic shirt", "vintage tee", "mock neck", "sleeveless hoodie", "patchwork shirt", "knitted vest", "half-zip", "heavy cotton tee", "polo shirt", "western shirt", "oversized knit"],
        bottom: ["fatigue pants", "wide chinos", "maxi skirt", "carpenter jeans", "corduroy trousers", "painter pants", "overalls", "raw denim", "cargo skirt", "bermuda shorts", "denim skirt", "work pants", "baker pants", "climbing pants", "patch jeans", "dungarees", "sweatpants", "canvas shorts", "utility skirt", "gurkha shorts", "balloon pants", "pleated chinos", "wide denim", "hickory stripe pants", "camo pants", "linen shorts", "wool trousers", "culottes", "button fly jeans", "cargo shorts"],
        shoes: ["desert boots", "work boots", "deck shoes", "wallabees", "hiking boots", "moccasins", "leather sandals", "canvas high-tops", "service boots", "rain boots", "duck boots", "engineer boots", "slip-ons", "clogs", "gum sole sneakers", "trail runners", "suede boots", "mountain boots", "low-top sneakers", "sandals with socks", "logger boots", "monkey boots", "saddle shoes", "derby shoes", "rugged chelsea boots", "canvas oxfords", "hiking sandals", "retro runners", "garden boots", "felt shoes"],
        bag: ["helmet bag", "backpack", "tote", "tool bag", "messenger", "satchel", "duffle", "waist pouch", "canvas crossbody", "rucksack", "newspaper bag", "market bag", "dry bag", "sling bag", "bucket bag", "gym bag", "camera bag", "utility tote", "kit bag", "barrel bag", "lunch bag", "field bag", "phone pouch", "map case", "holster", "nylon tote", "drawstring sack", "leather pouch", "vintage suitcase", "basket"],
        accessory: ["beanie", "bandana", "thick belt", "wool socks", "vintage cap", "tortoiseshell glasses", "field watch", "suspenders", "wool scarf", "gloves", "key clip", "wallet chain", "silver ring", "feather necklace", "paracord bracelet", "hiking socks", "leather bracelet", "cap", "badge", "enamel pin", "neck warmer", "fingerless gloves", "brass ring", "leather lanyard", "carabiner", "handkerchief", "lighter"],
        mid: ["waffle henley", "cotton cardigan", "flannel overshirt", "sherpa vest", "fair isle knit", "knitted vest"],
      } },
  },
  artistic_minimal: {
    A: { name: "Gallery Uniform", materials: ["wool", "cotton", "linen", "silk", "neoprene", "jersey", "poplin", "gabardine"],
      items: {
        outer: ["collarless coat", "kimono jacket", "longline blazer", "stand-collar jacket", "cocoon coat", "structured vest", "cape coat", "asymmetric jacket", "minimal trench", "geometric coat", "wrap jacket", "architectural blazer", "stiff wool coat", "neoprene coat", "sleeveless coat", "boxy jacket", "cropped blazer", "tunic coat", "wool cape", "linen duster", "oversized vest", "tailored coat", "shell jacket", "bolero", "draped jacket", "shawl coat", "zip-front coat", "panelled jacket", "funnel neck coat", "minimalist parka"],
        top: ["tunic shirt", "asymmetric knit", "stiff mock neck", "pleated top", "oversized shirt", "poplin tunic", "boxy blouse", "high-neck shell", "sleeveless top", "drape top", "cowl neck", "architectural shirt", "crisp tee", "structured tank", "funnel neck top", "raw edge top", "panelled shirt", "stiff cotton top", "wrap blouse", "longline vest", "geometric top", "cut-out top", "layered shirt", "mesh top", "neoprene blouse", "ribbed sweater", "cold shoulder top", "minimalist tunic", "bias cut top", "sheer shirt"],
        bottom: ["culottes", "wide cropped trousers", "pleated skirt", "barrel pants", "hakama", "balloon skirt", "wide slacks", "tapered ankle pants", "asymmetric skirt", "structured shorts", "geometric skirt", "wrap pants", "cigarette pants", "voluminous skirt", "tailored shorts", "raw hem pants", "drop crotch pants", "pleated trousers", "structured joggers", "midi skirt", "panelled skirt", "wide leg jeans", "sarouel pants", "stiff cotton skirt", "straight leg pants", "wool trousers", "origami skirt", "architectural pants", "cuffed pants", "split hem pants"],
        shoes: ["tabi boots", "architectural mules", "derby shoes", "square flats", "platform sandals", "sock boots", "minimal sneakers", "oxfords", "wedges", "geometric heels", "split-toe shoes", "block heels", "glove shoes", "loafer mules", "platform boots", "sculptural heels", "d'orsay flats", "monk straps", "chelsea boots", "leather slides", "structured sandals", "ballet flats", "wedge boots", "kitten heels", "cutout boots", "slingbacks", "ankle strap shoes", "matte boots", "rubber boots", "slip-ons"],
        bag: ["pleated tote", "geometric bag", "oversized clutch", "wristlet", "architectural bag", "box bag", "portfolio", "minimal shopper", "circle bag", "origami bag", "triangle bag", "frame bag", "cylinder bag", "structured tote", "hard case", "clutch", "clear bag", "matte leather bag", "bucket bag", "envelope bag", "handle bag", "sling bag", "sculptural bag", "phone pouch", "vertical tote", "neck bag", "belt bag", "folder bag", "acrylic bag", "mesh bag"],
        accessory: ["sculptural bangle", "bold eyewear", "single earring", "cuff", "geometric necklace", "brooch", "matte ring", "glasses chain", "wide headband", "minimal belt", "silver choker", "ear cuff", "knuckle ring", "statement earrings", "hair stick", "collar", "arm band", "abstract pin", "leather choker", "acrylic ring", "metal belt", "watch", "hair clip", "anklet", "silver bar", "neck wire", "pendant", "brooch set", "chain link"],
        mid: ["ribbed tank top", "mock-neck knit", "fine-gauge turtleneck", "seamless layer top", "structured tank", "longline vest"],
      } },
    B: { name: "Texture Mix", materials: ["boucle", "velvet", "organza", "mohair", "patent leather", "jacquard", "metallic fabric", "lace"],
      items: {
        outer: ["boucle coat", "hairy cardigan", "crushed velvet jacket", "faux fur vest", "shaggy jacket", "patent coat", "shearling jacket", "quilted velvet coat", "feather trim jacket", "teddy coat", "mohair cardigan", "fringe jacket", "jacquard coat", "embossed leather jacket", "silk bomber", "organza coat", "tweed blazer", "pony hair jacket", "metallic jacket", "crinkled coat", "laser cut jacket", "wool boucle jacket", "knit coat", "vinyl trench", "suede jacket", "embroidered coat", "mesh jacket", "crochet cardigan", "distressed jacket", "tufted coat"],
        top: ["sheer mesh top", "mohair knit", "ribbed tank", "crushed satin top", "fringe top", "organza blouse", "velvet top", "lace bodysuit", "angora sweater", "metallic knit", "sequin top", "feather top", "boucle knit top", "silk cami", "pleated top", "burnout tee", "distressed knit", "waffle top", "crochet top", "tulle blouse", "pearl embellished top", "embroidered shirt", "ruched top", "smocked top", "leather top", "lurex sweater", "ladder knit", "fishnet top", "ribbon top"],
        bottom: ["satin pants", "leather skirt", "wool slacks", "pleated velvet skirt", "metallic pants", "sequin skirt", "corduroy pants", "silk trousers", "faux fur skirt", "patent pants", "lace skirt", "fringe skirt", "jacquard pants", "organza skirt", "vinyl skirt", "embossed pants", "suede skirt", "crushed velvet pants", "tulle skirt", "brocade pants", "mesh skirt", "feather skirt", "knit pants", "crochet skirt", "distressed denim", "wide leg velvet pants", "laser cut skirt", "pleated pants", "ruched skirt"],
        shoes: ["velvet slippers", "pony-hair boots", "patent loafers", "metallic boots", "satin mules", "fur slides", "mesh boots", "embellished flats", "textured pumps", "glitter boots", "shearling boots", "crocodile embossed boots", "snake print shoes", "feather sandals", "clear heels", "lucite boots", "suede pumps", "embroidered boots", "pearl heels", "sequin shoes", "brocade boots", "lace-up heels", "velvet boots", "satin sneakers", "metallic slides", "fur loafers", "woven shoes", "textured leather boots", "glitter sneakers", "patent mules"],
        bag: ["fur bag", "wrinkled pouch", "metallic bag", "beaded bag", "velvet clutch", "chain mail bag", "feather bag", "patent tote", "woven satin bag", "shearling tote", "embossed bag", "crocodile bag", "pearl bag", "sequin bag", "crystal bag", "mesh tote", "tulle bag", "suede bag", "fuzzy bag", "lucite clutch", "mirror bag", "embroidered bag", "fringe bag", "rope bag", "metallic clutch", "snakeskin bag", "quilted bag", "padded bag", "ruched bag", "textured leather bag"],
        accessory: ["pearl necklace", "velvet choker", "crystal earrings", "textured ring", "hair bow", "fur stole", "lace gloves", "metallic belt", "layered chains", "brooch", "feather earring", "rhinestone choker", "hair pearl", "velvet headband", "mesh gloves", "statement ring", "ear climber", "crystal headband", "sequin scarf", "metallic cuff", "chain belt", "anklet", "body chain", "hair slide", "cameo", "tassel earrings", "beaded necklace", "velvet ribbon", "satin scarf"],
        mid: ["mohair knit vest", "sheer mesh layer", "bodycon turtleneck", "draped knit top", "boucle knit top", "ribbed tank"],
      } },
    C: { name: "Soft Avant-Garde", materials: ["jersey", "gauze", "chiffon", "knit", "linen", "silk", "cotton voile", "modal"],
      items: {
        outer: ["cape", "draped cardigan", "asymmetric jacket", "shawl coat", "blanket coat", "wrap jacket", "fluid trench", "bolero", "scarf-coat", "waterfall cardigan", "poncho", "kimono", "oversized shirt-jacket", "slouchy blazer", "knit coat", "ruched jacket", "tie-waist coat", "sheer jacket", "layered coat", "parachute coat", "soft parka", "cocoon jacket", "duster", "gathered coat", "balloon sleeve jacket", "twist front jacket", "mesh cardigan", "hooded cape", "distressed coat", "fluid blazer"],
        top: ["cowl neck top", "uneven hem shirt", "layered tunic", "ruched top", "draped jersey", "bias blouse", "wrap top", "asymmetric tank", "oversized knit", "sheer overlay", "twist top", "waterfall top", "batwing sleeve top", "gathered blouse", "cold shoulder top", "slouchy tee", "knot front top", "layered tank", "fluid shirt", "off-shoulder knit", "mesh tunic", "halter top", "balloon sleeve top", "corset tee", "distressed top", "longline shirt", "strappy top", "open back top", "soft corset", "jersey tunic"],
        bottom: ["balloon pants", "sarouel pants", "wrapped skirt", "dhoti pants", "asymmetric skirt", "harem pants", "jersey pants", "gathered skirt", "layered trousers", "fluid maxi skirt", "wide leg drapes", "parachute skirt", "tulip skirt", "ruched skirt", "drop crotch trousers", "bias cut skirt", "split leg pants", "tie-waist pants", "oversized trousers", "knitted skirt", "sheer skirt over pants", "bubble skirt", "layered skirt", "culottes", "soft cargo pants", "wrap trousers", "pleated maxi", "harem shorts", "jersey skirt"],
        shoes: ["leather sandals", "soft boots", "sock boots", "flat mules", "gladiator sandals", "soft flats", "tabi ballet shoes", "slouchy boots", "slipper shoes", "wedges", "wrap sandals", "ballet wraps", "knit shoes", "minimalist sandals", "toe loop sandals", "leather socks", "soft loafers", "canvas boots", "bandage shoes", "platform flip-flops", "split sole shoes", "ruched boots", "sheer boots", "leather slippers", "monk strap flats", "soft pumps", "ankle tie shoes", "woven sandals", "minimal clogs"],
        bag: ["slouchy sack", "knot bag", "drawstring pouch", "soft tote", "hobo bag", "oversized shoulder bag", "ruched clutch", "net bag", "wrist bag", "fabric tote", "leather shopper", "soft backpack", "bucket bag", "folded bag", "dumpling bag", "scarf bag", "mesh shopper", "canvas sack", "nylon tote", "crossbody pouch", "soft leather clutch", "wristlet", "macrame bag", "woven leather bag", "pleat bag", "round bag", "tie-handle bag", "oversized clutch", "soft briefcase", "jersey bag"],
        accessory: ["long necklace", "layered bangles", "scarf", "rings", "head wrap", "pendant", "irregular earrings", "soft belt", "arm cuff", "anklet", "leather cord", "silver jewelry", "wooden bangle", "hair tie", "fabric belt", "brooch", "body chain", "toe ring", "fabric choker", "knot bracelet", "minimalist watch", "raw stone", "leather cuff", "glasses", "ear cuff", "septum ring", "hand chain", "arm band", "turban", "snood"],
        mid: ["ribbed knit vest", "linen layer shirt", "asymmetric knit top", "gauze draped layer", "soft corset", "jersey tunic"],
      } },
  },
  retro_luxe: {
    A: { name: "Opulent Folklore", materials: ["suede", "velvet", "brocade", "embroidered fabric", "tapestry", "silk", "crochet", "lace"],
      items: {
        outer: ["shearling coat", "velvet blazer", "cape", "embroidered vest", "afghan coat", "tapestry jacket", "fur-trim coat", "quilted jacket", "folk cardigan", "suede coat", "brocade coat", "embroidered jacket", "peasant coat", "shawl", "velvet cape", "corset jacket", "printed kimono", "fringed jacket", "bolero", "patchwork coat", "fur stole", "wool coat", "military jacket", "paisley coat", "knit coat", "tapestry vest", "lace jacket", "faux fur coat", "embellished blazer", "satin jacket"],
        top: ["embroidered blouse", "lace top", "crochet vest top", "peasant blouse", "smocked top", "floral shirt", "corset top", "ruffled blouse", "balloon sleeve top", "velvet bodice", "high neck blouse", "broderie top", "folk shirt", "tunic", "puff sleeve top", "sheer blouse", "victorian shirt", "lace cami", "printed top", "embroidered corset", "bib shirt", "tie-front blouse", "gathered top", "knit bodice", "floral corset", "lace bodysuit", "square neck top", "fringed top", "bell sleeve top", "gypsy top"],
        bottom: ["wool maxi skirt", "velvet trousers", "corduroy pants", "embroidered jeans", "tiered skirt", "paisley skirt", "floral maxi skirt", "velvet pants", "tapestry skirt", "dark denim", "ruffle skirt", "brocade pants", "lace skirt", "peasant skirt", "wide leg pants", "patchwork skirt", "embroidered skirt", "bloomers", "suede skirt", "printed trousers", "folk skirt", "jacquard pants", "gathered skirt", "wool shorts", "velvet skirt", "layered skirt", "fringe skirt", "high-waisted trousers", "floral pants", "culottes"],
        shoes: ["lace-up boots", "mary janes", "clogs", "embroidered slippers", "velvet boots", "western boots", "platform sandals", "lace-up flats", "kitten heels", "brocade pumps", "suede boots", "granny boots", "embroidered boots", "velvet flats", "mules", "tassel boots", "wooden sandals", "Victorian boots", "strappy heels", "patterned pumps", "fur trim boots", "moccasins", "ballet flats", "t-strap shoes", "oxford heels", "embellished sandals", "woven boots", "tapestry shoes", "satin heels", "leather boots"],
        bag: ["tapestry bag", "frame bag", "beaded pouch", "velvet bag", "embroidered clutch", "fringe bag", "basket", "coin purse", "vintage handbag", "carpet bag", "drawstring pouch", "brocade bag", "lace bag", "tassel bag", "patchwork bag", "round bag", "saddle bag", "bucket bag", "wicker bag", "metal mesh bag", "box bag", "kiss-lock purse", "fabric tote", "needlepoint bag", "silk pouch", "wooden bag", "leather satchel", "floral bag", "fur bag", "wristlet"],
        accessory: ["headscarf", "pearl earrings", "beads", "floral headband", "cameo", "gold hoops", "lace tights", "statement belt", "corset belt", "ribbons", "hair flowers", "brooch", "choker", "layered necklaces", "dangle earrings", "velvet ribbon", "hair comb", "bangle stack", "locket", "fan", "embroidered collar", "lace gloves", "apron", "coin belt", "tassel earrings", "hair pins", "shawl", "arm cuff", "ring set", "anklet"],
        mid: ["crochet vest", "embroidered cardigan", "suede fringe vest", "printed silk layer", "folk cardigan", "knit bodice"],
      } },
    B: { name: "70s Vintage Chic", materials: ["suede", "corduroy", "crochet", "satin", "velvet", "denim", "lurex", "silk"],
      items: {
        outer: ["suede jacket", "shearling coat", "faux fur coat", "leather trench", "safari jacket", "denim blazer", "patchwork jacket", "corduroy blazer", "poncho", "crochet cardigan", "fringe vest", "western jacket", "denim vest", "velvet coat", "cape", "duster", "knitted coat", "bomber", "leather vest", "wool poncho", "shacket", "patterned blazer", "suede vest", "trench cape", "fur vest", "knit vest", "blanket coat", "shawl collar coat", "retro windbreaker", "mac coat"],
        top: ["printed shirt", "turtleneck", "crochet vest top", "halter top", "ringer tee", "pussy-bow blouse", "ribbed knit", "tie-dye top", "western shirt", "tunic", "peasant top", "disco top", "satin shirt", "bell sleeve top", "graphic tee", "wrap top", "knitted polo", "tank top", "striped shirt", "paisley top", "sheer shirt", "lace-up top", "butterfly top", "tube top", "off-shoulder top", "smocked top", "embroidered shirt", "denim shirt", "lurex top", "vest top"],
        bottom: ["flared jeans", "corduroy skirt", "bell-bottoms", "suede skirt", "pattern pants", "patchwork jeans", "button skirt", "gaucho pants", "maxi skirt", "denim shorts", "wide leg jeans", "bootcut jeans", "velvet pants", "printed skirt", "high-waisted shorts", "culottes", "overalls", "knit pants", "fringe skirt", "suede pants", "tiered skirt", "wrap skirt", "wide leg trousers", "disco pants", "leather pants", "pleated skirt", "cargo pants", "stirrup pants", "hot pants"],
        shoes: ["platform boots", "suede boots", "clogs", "knee boots", "western boots", "wedge sandals", "platform sneakers", "moccasins", "loafers", "strappy sandals", "wooden heels", "chunky heels", "cork wedges", "fringe boots", "cowboy boots", "desert boots", "retro sneakers", "mules", "velvet boots", "t-strap sandals", "espadrilles", "leather slides", "mary janes", "peep toe heels", "block heels", "gladiator sandals", "suede loafers", "earth shoes", "oxfords"],
        bag: ["saddle bag", "suede hobo", "fringe bag", "tooled leather bag", "macrame bag", "canvas messenger", "leather tote", "bucket bag", "patchwork bag", "soft clutch", "basket", "woven bag", "denim bag", "crochet bag", "camera bag", "satchel", "bowling bag", "duffle", "wristlet", "beaded bag", "drawstring bag", "suede pouch", "flap bag", "doctor bag", "frame bag", "straw tote", "mesh bag", "guitar strap bag", "canvas tote", "leather pouch"],
        accessory: ["tinted sunglasses", "wide brim hat", "silk scarf", "turquoise jewelry", "leather belt", "layered necklaces", "hoop earrings", "bangles", "feather earring", "headband", "bandana", "choker", "large rings", "wooden jewelry", "peace sign necklace", "aviators", "oversized glasses", "hair flower", "arm band", "anklet", "scarf belt", "mood ring", "beaded necklace", "floppy hat", "tassel necklace", "leather cuff", "woven belt", "hair pick", "brooch", "medallion"],
        mid: ["crochet vest", "suede fringe vest", "printed silk layer", "corduroy blazer", "knitted polo", "lurex top"],
      } },
    C: { name: "Old Money", materials: ["cashmere", "tweed", "silk", "wool", "leather", "velvet", "brocade", "herringbone"],
      items: {
        outer: ["tweed jacket", "quilted jacket", "camel coat", "trench coat", "gold button blazer", "cable cardigan", "barbour jacket", "cape", "navy blazer", "cashmere coat", "polo coat", "waxed jacket", "houndstooth blazer", "wool vest", "sweater vest", "windbreaker", "varsity jacket", "harrington jacket", "field jacket", "pea coat", "duffle coat", "gilet", "linen blazer", "silk bomber", "knitted jacket", "velvet blazer", "wrap coat", "herringbone coat", "shawl cardigan", "rain coat"],
        top: ["cable sweater", "pussy-bow blouse", "polo shirt", "cricket jumper", "white shirt", "cashmere turtleneck", "striped shirt", "silk blouse", "argyle vest", "twin-set", "oxford shirt", "button-down", "ringer tee", "ribbed tank", "boat neck top", "linen shirt", "sleeveless knit", "v-neck sweater", "mock neck", "collared knit", "wrap top", "tie-neck blouse", "sleeveless blouse", "rugby shirt", "fitted tee", "cardigan", "shell top", "lace blouse", "silk cami", "tunic"],
        bottom: ["white jeans", "riding pants", "wool skirt", "chinos", "tailored shorts", "wool trousers", "straight jeans", "tennis skirt", "cigarette pants", "linen trousers", "pleated skirt", "bermuda shorts", "wide leg pants", "plaid skirt", "corduroy pants", "capri pants", "silk skirt", "culottes", "midi skirt", "velvet skirt", "tailored slacks", "tweed skirt", "cuffed shorts", "straight skirt", "high-waisted pants", "check trousers", "bootcut pants", "sailor pants", "wrap skirt", "skort"],
        shoes: ["riding boots", "horsebit loafers", "ballet flats", "driving shoes", "court heels", "slingbacks", "tennis sneakers", "oxfords", "knee boots", "velvet slippers", "penny loafers", "pumps", "kitten heels", "espadrilles", "mules", "mary janes", "brogues", "deck shoes", "rain boots", "patent flats", "wedge heels", "strappy sandals", "cap-toe shoes", "spectators", "woven flats", "ankle boots", "slides", "block heels", "d'orsay flats"],
        bag: ["structured handbag", "canvas tote", "bucket bag", "box bag", "vanity case", "monogram bag", "clutch", "doctor bag", "kelly bag", "tote", "saddle bag", "top handle bag", "frame bag", "envelope clutch", "leather satchel", "wicker bag", "crossbody", "shoulder bag", "baguette", "bowling bag", "wristlet", "travel bag", "trunk", "mini bag", "chain bag", "flap bag", "briefcase", "shopper", "camera bag", "coin purse"],
        accessory: ["pearl necklace", "headscarf", "headband", "leather belt", "watch", "stud earrings", "signet ring", "gloves", "sunglasses", "brooch", "hair clip", "silk scarf", "gold bangle", "tennis bracelet", "ribbon", "hat", "tote scarf", "minimal ring", "chain necklace", "hoop earrings", "leather watch", "hair bow", "glasses", "crest pin", "knee socks", "tights", "anklet", "collar bar", "compact"],
        mid: ["cashmere turtleneck", "fine-knit vest", "cable-knit cardigan", "argyle sweater", "twin-set", "sleeveless knit"],
      } },
  },
  sport_modern: {
    A: { name: "City Tech Gorpcore", materials: ["gore-tex", "ripstop", "fleece", "nylon", "cordura", "mesh", "softshell", "merino"],
      items: {
        outer: ["3-layer shell jacket", "tech trench", "windbreaker", "utility vest", "anorak", "rain poncho", "puffer jacket", "fleece jacket", "tactical vest", "convertible jacket", "softshell jacket", "parka", "down jacket", "rain jacket", "mountain parka", "gilet", "coach jacket", "bomber", "track jacket", "hooded jacket", "tech blazer", "nylon coat", "insulated jacket", "storm coat", "field jacket", "cargo vest", "running jacket", "cycling jacket", "ski jacket", "cape"],
        top: ["merino base layer", "tech-fleece top", "performance tee", "mesh layer top", "compression top", "mock neck top", "zip polo", "graphic tee", "thermal top", "running shirt", "seamless top", "tank top", "rash guard", "jersey", "hiking shirt", "grid fleece top", "sun hoodie", "vented shirt", "ripstop shirt", "nylon top", "half-zip", "crewneck", "muscle tee", "dry-fit tee", "logo top", "crop top", "bodysuit"],
        bottom: ["cargo pants", "waterproof trousers", "convertible pants", "parachute pants", "hiking shorts", "joggers", "nylon pants", "climbing pants", "wind pants", "leggings", "tech shorts", "trek pants", "rain pants", "softshell pants", "utility pants", "baggy shorts", "ripstop pants", "articulated pants", "fleece pants", "ski pants", "biker shorts", "split hem pants", "drawstring pants", "cargo shorts", "board shorts", "running tights", "insulated pants", "hybrid shorts", "cropped pants"],
        shoes: ["gore-tex sneakers", "trail runners", "trekking boots", "chunky sneakers", "vibram shoes", "waterproof boots", "approach shoes", "hiking boots", "running shoes", "recovery slides", "water shoes", "tech boots", "sock shoes", "mountain boots", "gaiter shoes", "trail sandals", "winter boots", "rubber boots", "hybrid shoes", "aqua shoes", "speedcross shoes", "minimalist runners", "heavy tread boots", "high-tops", "mules", "clogs"],
        bag: ["sacoche", "backpack", "chest rig", "waist bag", "dry bag", "sling bag", "hydration pack", "utility pouch", "carabiner bag", "duffle", "roll-top bag", "messenger", "hip pack", "camera bag", "phone holder", "tote", "gym bag", "harness bag", "crossbody", "running vest", "map case", "tool bag", "waterproof bag", "frame bag", "saddle bag", "modular bag", "belt bag", "bottle bag", "laptop bag", "stuff sack"],
        accessory: ["bucket hat", "sunglasses", "carabiner", "gaiter", "gloves", "beanie", "watch", "utility belt", "armbands", "cap", "headband", "socks", "lanyard", "bandana", "compass", "whistle", "key clip", "paracord", "face mask", "visor", "ear muffs", "neck warmer", "gps watch", "sweatband", "laces", "pins", "patch"],
        mid: ["half-zip fleece", "merino pullover", "grid fleece vest", "base layer long sleeve", "tech-fleece top", "thermal top"],
      } },
    B: { name: "Athleisure Luxe", materials: ["jersey", "cotton", "nylon", "spandex", "mesh", "modal", "cashmere blend", "seamless knit"],
      items: {
        outer: ["cropped puffer", "track jacket", "hoodie", "bolero", "zip fleece", "bomber", "windbreaker", "wrap cardigan", "glossy vest", "yoga jacket", "running jacket", "shrug", "sweatshirt", "rain jacket", "longline hoodie", "teddy jacket", "quilted vest", "cape", "poncho", "oversized sweat", "softshell jacket", "mesh jacket", "jersey blazer", "anorak", "down vest", "training jacket", "fleece pullover", "varsity jacket"],
        top: ["sports bra", "compression tee", "bodysuit", "tank top", "off-shoulder sweat", "seamless top", "hoodie top", "racerback top", "wrap top", "mesh top", "crop top", "yoga top", "long sleeve tee", "muscle tank", "ribbed top", "camisole", "half-zip", "sweatshirt", "graphic tee", "bralette", "corset top", "thermal", "halter top", "cut-out top", "asymmetrical top", "tube top", "tunic", "twisted top", "performance tee", "layered top"],
        bottom: ["leggings", "joggers", "biker shorts", "split-hem leggings", "sweat skirt", "yoga pants", "track pants", "running shorts", "stirrup leggings", "flare leggings", "sweatshorts", "dance pants", "harem pants", "wide leg sweats", "cargo joggers", "skirt over leggings", "compression shorts", "tennis skirt", "cycling shorts", "nylon pants", "mesh shorts", "ribbed pants", "bootcut leggings", "capri pants", "knitted pants", "drawstring shorts", "palazzo pants", "utility leggings", "soft pants"],
        shoes: ["running shoes", "slides", "sock sneakers", "platform sneakers", "training shoes", "sandals", "high-tops", "casual runners", "white sneakers", "yoga shoes", "dance shoes", "slip-ons", "mules", "flip-flops", "ballet sneakers", "canvas shoes", "wedge sneakers", "knit shoes", "fashion trainers", "chunky soles", "retro runners", "futuristic shoes", "recovery shoes", "mesh sneakers", "velcro shoes", "split sole shoes", "minimal sneakers", "gym shoes", "studio wraps", "barefoot shoes"],
        bag: ["gym bag", "backpack", "tote", "belt bag", "phone holder", "bottle bag", "crossbody", "shopper", "duffle", "mini backpack", "yoga bag", "mat bag", "sackpack", "wristlet", "waist pack", "barrel bag", "mesh tote", "sling bag", "bucket bag", "cosmetic bag", "shoe bag", "drawstring bag", "clutch", "lanyard bag", "tech pouch", "oversized tote", "structured gym bag", "wet bag", "card holder"],
        accessory: ["cap", "headphones", "scrunchie", "socks", "sunglasses", "sweatband", "watch", "jewelry", "hair clip", "headband", "visor", "hair tie", "fitness tracker", "necklace", "earrings", "rings", "bracelet", "leg warmers", "arm band", "hat", "hair band"],
        mid: ["ribbed crop top", "seamless tank", "sports bra layer", "fitted long sleeve", "yoga top", "corset top"],
      } },
    C: { name: "Blokecore Jersey", materials: ["nylon", "polyester", "mesh", "cotton", "fleece", "track fabric", "velour", "satin"],
      items: {
        outer: ["track jacket", "coach jacket", "stadium parka", "varsity bomber", "windbreaker", "training jacket", "bench coat", "warm-up top", "anorak", "denim jacket", "drill top", "rain jacket", "puffer jacket", "fleece jacket", "gilet", "nylon vest", "souvenir jacket", "retro jacket", "shell suit top", "half-zip", "hoodie", "sweatshirt", "poncho", "bomber", "terrace jacket", "Harrington jacket", "cagoule", "manager coat", "sideline jacket", "anthem jacket"],
        top: ["soccer jersey", "ringer tee", "polo shirt", "goalkeeper jersey", "graphic tee", "rugby shirt", "sweatshirt", "training top", "half-zip top", "tank top", "vintage kit top", "long sleeve jersey", "oversized tee", "striped shirt", "basketball jersey", "hockey jersey", "baseball shirt", "retro tee", "slogan tee", "knitted polo", "mesh top", "warm-up shirt", "muscle tee", "crewneck", "v-neck jersey", "collared shirt", "zip neck top", "drill top", "sleeveless jersey"],
        bottom: ["track pants", "jorts", "nylon shorts", "jeans", "warm-up pants", "cargo shorts", "soccer shorts", "straight denim", "sweatpants", "windbreaker pants", "basketball shorts", "running shorts", "cargo pants", "chinos", "bermuda shorts", "swim shorts", "cycling shorts", "tear-away pants", "fleece shorts", "wide leg jeans", "corduroy shorts", "training pants", "joggers", "retro shorts", "technical shorts", "baggy jeans", "dungarees", "tapered pants", "shell pants"],
        shoes: ["terrace sneakers", "retro runners", "slides", "indoor soccer shoes", "canvas sneakers", "chunky trainers", "high-tops", "gum sole shoes", "leather trainers", "casual boots", "skate shoes", "classic sneakers", "low-tops", "dad shoes", "football trainers", "velcro shoes", "slip-ons", "suede sneakers", "court shoes", "ugly sneakers", "futsal shoes", "hiking hybrids", "basketball shoes", "vulcanized shoes", "deck shoes", "driving shoes", "plimsolls", "clogs", "mules", "limited edition kicks"],
        bag: ["crossbody", "duffle", "drawstring bag", "shoebox bag", "messenger", "waist bag", "tote", "nylon bag", "sacoche", "gym sack", "backpack", "sling bag", "boot bag", "kit bag", "barrel bag", "shoulder bag", "holdall", "mini bag", "phone bag", "bum bag", "record bag", "flight bag", "retro bag", "vinyl bag", "canvas tote", "reporter bag", "camera bag", "utility bag", "pouch", "wash bag"],
        accessory: ["scarf", "beanie", "bucket hat", "sunglasses", "socks", "chain", "rings", "wristband", "cap", "whistle", "sweatband", "gloves", "badge", "pin", "lanyard", "lighter", "bandana", "hair band", "watch", "necklace", "bracelet", "earring", "phone case", "key ring", "bottle opener", "patches"],
        mid: ["training top", "half-zip top", "mesh top", "warm-up shirt", "zip neck top", "sleeveless jersey"],
      } },
  },
  creative_layered: {
    A: { name: "Rock and Rebellion", materials: ["denim", "flannel", "leather", "jersey", "mesh", "lace", "vinyl", "plaid"],
      items: {
        outer: ["leather biker jacket", "denim jacket", "vinyl trench", "cropped hoodie", "leopard coat", "studs jacket", "blazer", "flannel shirt jacket", "faux fur coat", "bomber jacket", "military jacket", "vest", "trench coat", "shearling jacket", "parka", "cape", "poncho", "cardigan", "kimono", "windbreaker", "raincoat", "puffer jacket", "track jacket", "shacket", "varsity jacket", "bolero", "duster", "gilet", "shawl"],
        top: ["corset top", "lace blouse", "band tee", "sweater", "mesh bodysuit", "fishnet top", "slogan tee", "tank top", "slip top", "bustier", "graphic tee", "hoodie", "crop top", "shirt", "blouse", "camisole", "turtleneck", "bodysuit", "tunic", "thermal top", "halter top", "tube top", "off-shoulder top", "bralette", "sheer top", "layered top", "ripped tee", "vintage tee", "muscle tank"],
        bottom: ["tulle skirt", "ripped jeans", "cargo mini skirt", "plaid skirt", "leather pants", "vinyl skirt", "shorts", "denim shorts", "skinny jeans", "parachute pants", "leggings", "cargo pants", "mini skirt", "maxi skirt", "midi skirt", "trousers", "shorts over tights", "fishnet tights", "biker shorts", "sweatpants", "joggers", "wide leg jeans", "bootcut jeans", "flare jeans", "skirt over pants", "tiered skirt", "bustle skirt", "kilt", "velvet pants", "lace pants"],
        shoes: ["combat boots", "loafers", "mary janes", "creepers", "platform boots", "high-tops", "studded boots", "buckle shoes", "moto boots", "heels", "sneakers", "boots", "sandals", "flats", "platforms", "wedges", "clogs", "mules", "slides", "oxfords", "brogues", "derby shoes", "monk straps", "chelsea boots", "winklepickers", "knee boots", "thigh boots", "ankle boots", "rain boots", "skate shoes"],
        bag: ["backpack", "chain bag", "heart bag", "studded bag", "guitar strap bag", "pouch", "tote", "velvet bag", "box clutch", "safety pin bag", "crossbody", "messenger", "satchel", "duffle", "bucket bag", "shoulder bag", "fanny pack", "sling bag", "clutch", "wristlet", "coffin bag", "skull bag", "mini bag", "phone bag", "coin purse", "waist bag", "camera bag", "barrel bag", "sack"],
        accessory: ["choker necklace", "necklaces", "safety pins", "tights", "gloves", "lock necklace", "rings", "nose ring", "cuff", "sunglasses", "belt", "chain", "wristband", "earrings", "studs", "spikes", "bandana", "scarf", "hat", "beanie", "socks", "arm warmer", "leg warmer", "harness", "garter", "collar", "patch", "pin", "clip"],
        mid: ["mesh layer top", "fishnet top", "flannel tied layer", "cropped hoodie", "corset top", "bustier"],
      } },
    B: { name: "Pattern Clash", materials: ["velvet", "silk", "crochet", "denim", "corduroy", "leather", "knit", "printed fabric"],
      items: {
        outer: ["fleece jacket", "windbreaker", "patchwork jacket", "cardigan", "denim jacket", "kimono", "tapestry coat", "blazer", "striped jacket", "bomber jacket", "trench coat", "parka", "raincoat", "vest", "poncho", "cape", "shawl", "coat", "jacket", "hoodie", "sweatshirt", "shacket", "gilet", "bolero", "duster", "anorak", "puffer jacket", "varsity jacket", "track jacket", "shirt jacket"],
        top: ["knit top", "floral shirt", "polka dot blouse", "tie-dye top", "striped shirt", "argyle vest", "animal print top", "geometric shirt", "sweater", "Hawaiian shirt", "graphic tee", "tank top", "crop top", "blouse", "shirt", "tunic", "camisole", "turtleneck", "bodysuit", "vest top", "thermal", "halter top", "tube top", "off-shoulder top", "bralette", "sheer top", "layered top", "ringer tee", "vintage tee", "muscle tank"],
        bottom: ["checkered pants", "striped skirt", "colored denim", "patchwork jeans", "floral skirt", "plaid trousers", "animal print skirt", "chinos", "print pants", "shorts", "jeans", "trousers", "skirt", "leggings", "sweatpants", "joggers", "cargo pants", "culottes", "overalls", "wide leg pants", "bootcut jeans", "flare jeans", "mini skirt", "midi skirt", "maxi skirt", "skort", "bermuda shorts", "bike shorts", "bloomers"],
        shoes: ["sneakers", "boots", "socks with sandals", "cowboy boots", "platforms", "loafers", "heels", "printed boots", "mary janes", "mules", "clogs", "slides", "flats", "wedges", "oxfords", "brogues", "derby shoes", "monk straps", "chelsea boots", "rain boots", "skate shoes", "high-tops", "jellies", "crocs", "slippers", "running shoes", "hiking boots", "espadrilles", "moccasins", "boat shoes"],
        bag: ["beaded bag", "tote", "patchwork bag", "novelty bag", "woven bag", "fringe bag", "shoulder bag", "neon bag", "sequin bag", "backpack", "crossbody", "messenger", "satchel", "duffle", "bucket bag", "fanny pack", "sling bag", "clutch", "wristlet", "mini bag", "phone bag", "coin purse", "waist bag", "camera bag", "barrel bag", "sack", "basket", "net bag", "jelly bag", "plastic bag"],
        accessory: ["earrings", "beads", "rings", "scarf", "clips", "tights", "sunglasses", "bandana", "bracelets", "necklace", "watch", "belt", "hat", "beanie", "socks", "arm warmer", "leg warmer", "hair tie", "scrunchie", "pin", "patch", "brooch", "glasses", "headband", "turban", "gloves", "lanyard", "charm", "sticker"],
        mid: ["crochet vest", "printed silk layer", "vintage cardigan", "lace layer top", "argyle vest", "knit top"],
      } },
    C: { name: "Vintage Eclectic", materials: ["velvet", "silk", "crochet", "corduroy", "leather", "tapestry", "lace", "embroidered fabric"],
      items: {
        outer: ["field jacket", "fur coat", "embroidered jacket", "liner jacket", "cardigan", "blazer", "jacket", "shawl", "capelet", "trench coat", "coat", "parka", "raincoat", "vest", "poncho", "cape", "hoodie", "sweatshirt", "shacket", "gilet", "bolero", "duster", "anorak", "puffer jacket", "varsity jacket", "track jacket", "shirt jacket", "shearling jacket", "suede jacket", "velvet jacket"],
        top: ["lace blouse", "crochet top", "vest top", "slip top", "thermal top", "shirt", "blouse", "knit top", "cami", "tunic", "tank top", "crop top", "turtleneck", "bodysuit", "halter top", "tube top", "off-shoulder top", "bralette", "sheer top", "layered top", "ringer tee", "vintage tee", "muscle tank", "sweater", "cardigan", "corset top", "bodice", "peasant top", "smock top"],
        bottom: ["velvet skirt", "corduroy pants", "trousers", "skirt", "shorts", "bloomers", "pants", "suspender skirt", "maxi skirt", "culottes", "jeans", "leggings", "sweatpants", "joggers", "cargo pants", "overalls", "wide leg pants", "bootcut jeans", "flare jeans", "mini skirt", "midi skirt", "skort", "bermuda shorts", "bike shorts", "knickers", "petticoat", "tiered skirt", "ruffle skirt", "pleated skirt"],
        shoes: ["mary janes", "cowboy boots", "loafers", "t-strap shoes", "oxfords", "boots", "lace-up shoes", "clogs", "heels", "brogues", "flats", "mules", "slides", "wedges", "sandals", "sneakers", "platforms", "espadrilles", "moccasins", "boat shoes", "rain boots", "skate shoes", "high-tops", "jellies", "slippers", "running shoes", "hiking boots", "derby shoes", "monk straps", "chelsea boots"],
        bag: ["tapestry bag", "frame bag", "doctor bag", "purse", "pouch", "basket", "satchel", "drawstring bag", "coin purse", "needlepoint bag", "tote", "backpack", "crossbody", "messenger", "duffle", "bucket bag", "fanny pack", "sling bag", "clutch", "wristlet", "mini bag", "phone bag", "waist bag", "camera bag", "barrel bag", "sack", "net bag", "jelly bag", "suitcase"],
        accessory: ["brooch", "chain necklace", "beret", "collar", "necklace", "watch", "gloves", "knee highs", "ribbon", "scarf", "earrings", "rings", "bracelet", "belt", "hat", "beanie", "socks", "arm warmer", "leg warmer", "hair tie", "scrunchie", "pin", "patch", "glasses", "headband", "turban", "locket", "fan", "cameo", "hat pin"],
        mid: ["crochet vest", "printed silk layer", "vintage cardigan", "lace layer top", "velvet blazer", "embroidered jacket"],
      } },
  },
};

const BODY_FIT: Record<string, { top: string; bottom: string; outer: string }> = {
  slim: { top: "oversized", bottom: "wide-leg", outer: "oversized" },
  regular: { top: "regular", bottom: "straight", outer: "regular" },
  "plus-size": { top: "relaxed", bottom: "straight-leg", outer: "longline" },
};

const SEASON_MODIFIERS: Record<string, { fabrics: string[]; exclude: string[] }> = {
  spring: { fabrics: ["cotton", "linen", "light wool"], exclude: ["mid"] },
  summer: { fabrics: ["linen", "mesh", "breathable cotton"], exclude: ["outer", "mid"] },
  fall: { fabrics: ["wool", "flannel", "corduroy", "tweed"], exclude: [] },
  winter: { fabrics: ["wool", "cashmere", "fleece", "down"], exclude: [] },
};

interface KeywordPerformance {
  keyword: string;
  score: number;
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateKeywordsForSlot(
  slot: string,
  genderLabel: string,
  vibe: string,
  season: string,
  bodyType: string,
  topPerformers: KeywordPerformance[]
): string[] {
  const vibeData = VIBE_LOOKS[vibe];
  const dna = VIBE_DNA[vibe];
  if (!vibeData || !dna) return [];

  const seasonMod = SEASON_MODIFIERS[season];
  if (seasonMod?.exclude.includes(slot)) return [];

  const bodyFit = BODY_FIT[bodyType] || BODY_FIT["regular"];
  const fitModifier = bodyFit[slot as keyof typeof bodyFit] || "";

  const allColors = [...dna.colors.primary, ...dna.colors.secondary.slice(0, 2)];
  const keywords: string[] = [];
  const seen = new Set<string>();

  const topPerformerKws = topPerformers
    .filter(p => p.score >= 0.5)
    .map(p => p.keyword);
  for (const kw of topPerformerKws.slice(0, 2)) {
    if (!seen.has(kw)) { seen.add(kw); keywords.push(kw); }
  }

  const looks = Object.values(vibeData);
  for (const look of looks) {
    const items = look.items[slot] || [];
    const materials = look.materials;

    if (items.length === 0) continue;

    const selectedItems = shuffleArray(items).slice(0, 2);
    const selectedMaterials = shuffleArray(materials).slice(0, 2);
    const selectedColors = shuffleArray(allColors).slice(0, 2);

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      const color = selectedColors[i % selectedColors.length];
      const material = selectedMaterials[i % selectedMaterials.length];

      let keyword: string;
      if (fitModifier && ["top", "bottom", "outer"].includes(slot)) {
        keyword = `${genderLabel}'s ${fitModifier} ${material} ${item}`;
      } else {
        keyword = `${genderLabel}'s ${color} ${material} ${item}`;
      }

      keyword = keyword.replace(/\s+/g, " ").trim();
      if (keyword.split(" ").length > 7) {
        keyword = `${genderLabel}'s ${color} ${item}`;
      }

      if (!seen.has(keyword)) { seen.add(keyword); keywords.push(keyword); }
    }
  }

  if (seasonMod) {
    const seasonFabric = seasonMod.fabrics[0];
    const vibeItems = looks[0]?.items[slot] || [];
    if (vibeItems.length > 0) {
      const baseItem = vibeItems[Math.floor(Math.random() * vibeItems.length)];
      const seasonKw = `${genderLabel}'s ${seasonFabric} ${baseItem}`;
      if (!seen.has(seasonKw)) { seen.add(seasonKw); keywords.push(seasonKw); }
    }
  }

  return keywords.slice(0, 8);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { gender, body_type, vibe, season } = await req.json();

    if (!gender || !vibe) {
      return new Response(JSON.stringify({ error: "gender and vibe are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vibeKey = vibe.toLowerCase().replace(/\s+/g, "_");
    const genderLabel = gender === "MALE" ? "men" : gender === "FEMALE" ? "women" : "unisex";
    const seasonLabel = (season || "fall").toLowerCase();
    const bodyTypeLabel = (body_type || "regular").toLowerCase();

    let topPerformers: Record<string, KeywordPerformance[]> = {};
    try {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: perfData } = await adminClient
        .from("keyword_performance")
        .select("keyword, slot, score")
        .eq("vibe", vibeKey)
        .eq("season", seasonLabel)
        .gte("score", 0.5)
        .order("score", { ascending: false })
        .limit(30);

      if (perfData) {
        for (const row of perfData) {
          if (!topPerformers[row.slot]) topPerformers[row.slot] = [];
          topPerformers[row.slot].push({ keyword: row.keyword, score: row.score });
        }
      }
    } catch {
      topPerformers = {};
    }

    const SLOTS = ["top", "bottom", "shoes", "outer", "mid", "bag", "accessory"];
    const categories: Record<string, string[]> = {};
    const allKeywords: string[] = [];

    for (const slot of SLOTS) {
      const slotPerformers = topPerformers[slot] || [];
      const kws = generateKeywordsForSlot(slot, genderLabel, vibeKey, seasonLabel, bodyTypeLabel, slotPerformers);
      if (kws.length > 0) {
        categories[slot] = kws;
        allKeywords.push(...kws);
      }
    }

    return new Response(
      JSON.stringify({
        keywords: allKeywords,
        categories,
        source: "rule-based",
        vibeKey,
        colorHints: VIBE_DNA[vibeKey] ? {
          primary: VIBE_DNA[vibeKey].colors.primary,
          secondary: VIBE_DNA[vibeKey].colors.secondary,
          accent: VIBE_DNA[vibeKey].colors.accent,
        } : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
