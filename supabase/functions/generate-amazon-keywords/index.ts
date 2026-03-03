import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OutfitContext {
  existing_colors?: string[];
  existing_materials?: string[];
  target_slot?: string;
}

const VIBE_DNA: Record<string, {
  formality: string;
  tonal: string;
  colors: { primary: string[]; secondary: string[]; accent: string[] };
  era: string[];
}> = {
  elevated_cool: {
    formality: "5-9/10 (smart-casual to polished)",
    tonal: "tone-on-tone or high contrast",
    colors: { primary: ["black","charcoal","navy","white"], secondary: ["grey","cream","camel"], accent: ["burgundy","metallic","wine"] },
    era: ["minimalist","architectural","city-noir","streetwear"],
  },
  effortless_natural: {
    formality: "2-6/10 (relaxed casual)",
    tonal: "tone-in-tone (earthy muted palette)",
    colors: { primary: ["beige","cream","ivory","white"], secondary: ["olive","khaki","tan","sage","brown"], accent: ["rust","mustard","burgundy"] },
    era: ["japandi","french-casual","organic","wabi-sabi","amekaji"],
  },
  artistic_minimal: {
    formality: "3-8/10 (editorial casual to smart)",
    tonal: "tone-on-tone or deliberate contrast",
    colors: { primary: ["black","white","grey","charcoal"], secondary: ["cream","beige","navy"], accent: ["rust","olive","burgundy"] },
    era: ["avant-garde","gallery","architectural","deconstructed","wabi-sabi"],
  },
  retro_luxe: {
    formality: "3-8/10 (relaxed heritage to glam)",
    tonal: "tone-in-tone or warm contrast",
    colors: { primary: ["burgundy","navy","brown","cream"], secondary: ["camel","olive","wine","beige"], accent: ["rust","mustard","teal","gold"] },
    era: ["70s","heritage","cinematic","old-money","hollywood"],
  },
  sport_modern: {
    formality: "0-4/10 (athletic to casual)",
    tonal: "contrast or tone-on-tone",
    colors: { primary: ["black","grey","white","navy"], secondary: ["olive","khaki","charcoal"], accent: ["orange","teal","red","green"] },
    era: ["gorpcore","athleisure","techwear","urban-utility"],
  },
  creative_layered: {
    formality: "0-5/10 (expressive casual)",
    tonal: "contrast or mixed palette",
    colors: { primary: ["black","grey","white","denim"], secondary: ["burgundy","brown","olive","navy"], accent: ["red","orange","pink","yellow"] },
    era: ["grunge","punk","DIY","eclectic","vintage"],
  },
};

const VIBE_LOOKS: Record<string, {
  A: { name: string; mood: string; materials: string[]; items: Record<string, string[]> };
  B: { name: string; mood: string; materials: string[]; items: Record<string, string[]> };
  C: { name: string; mood: string; materials: string[]; items: Record<string, string[]> };
}> = {
  elevated_cool: {
    A: {
      name: "Downtown Tailoring",
      mood: "polished, structured, monochrome, city-noir",
      materials: ["fine wool","gabardine","stiff cotton","cashmere","silk","satin","poplin","neoprene"],
      items: {
        outer: ["oversized wool coat","structured trench","boxy leather blazer","cropped tailored jacket","tuxedo jacket","cape blazer","long wool overcoat","collarless blazer"],
        top: ["high-neck knit","crisp poplin shirt","silk button-down","structured tee","satin blouse","cashmere turtleneck","cowl-neck top","mock-neck top"],
        bottom: ["wide-leg wool trousers","cigarette pants","pleated trousers","leather pants","tailored wide-leg pants","high-waist wide trousers","straight-leg trousers","satin midi skirt"],
        shoes: ["square-toe ankle boots","chunky loafers","pointed-toe flats","chelsea boots","sock boots","sculptural mules","platform oxfords","heeled ankle boots"],
        bag: ["geometric tote","box bag","structured clutch","briefcase","top-handle bag","architectural shoulder bag","trapeze bag","city tote"],
        accessory: ["silver chain necklace","metal-frame sunglasses","leather gloves","geometric ring","minimalist watch","statement belt","silk scarf tied","chain bracelet"],
      },
    },
    B: {
      name: "Neo-Prep Edge",
      mood: "ivy-league meets dark-academia, smart-casual, elevated prep",
      materials: ["tweed","corduroy","denim","cable-knit","velvet","waxed cotton","suede","quilted nylon","wool","leather"],
      items: {
        outer: ["tweed blazer","wool peacoat","denim jacket","waxed cotton jacket","quilted liner","varsity bomber","corduroy jacket","harrington jacket"],
        top: ["oxford shirt","cable-knit sweater","argyle sweater","rugby shirt","v-neck jumper","polo shirt","crew-neck knit","flannel shirt"],
        bottom: ["straight-leg jeans","chinos","corduroy pants","tartan trousers","pleated midi skirt","wide chinos","grey flannels","tweed skirt"],
        shoes: ["derby shoes","brogue loafers","leather sneakers","penny loafers","suede chukkas","mary janes","chelsea boots","boat shoes"],
        bag: ["satchel","canvas tote","messenger bag","briefcase","leather backpack","document bag","school bag","saddle bag"],
        accessory: ["glasses chain","crest brooch","skinny tie","leather belt","knit beanie","tortoiseshell sunglasses","pocket square","suspenders"],
      },
    },
    C: {
      name: "High-End Street",
      mood: "streetwear, techwear, urban-edge, graphic-driven",
      materials: ["nylon","leather","tech-fleece","mesh","neoprene","denim","jersey","rubber","reflective fabric","faux fur"],
      items: {
        outer: ["technical bomber","nylon windbreaker","oversized hoodie","biker jacket","puffer jacket","track jacket","coach jacket","cropped puffer"],
        top: ["graphic tee","oversized long sleeve","mesh top","thermal base layer","jersey tank","logo sweatshirt","crew-neck sweat","compression top"],
        bottom: ["cargo pants","parachute pants","track pants","baggy jeans","biker jeans","nylon pants","cargo sweats","wide-leg cargo"],
        shoes: ["chunky sneakers","high-top sneakers","dad sneakers","retro runners","platform sneakers","tech trail runners","skate shoes","combat boots"],
        bag: ["chest rig","belt bag","tech backpack","sling bag","crossbody sacoche","drawstring bag","utility bag","mesh tote"],
        accessory: ["bucket hat","baseball cap","wallet chain","shield sunglasses","smart watch","ear cuff","bandana","reflective vest"],
      },
    },
  },
  effortless_natural: {
    A: {
      name: "Japandi Flow",
      mood: "zen, wabi-sabi, minimal, meditative, organic",
      materials: ["linen","cotton","raw silk","gauze","hemp","wool","waffle","canvas","undyed cotton","stone-washed"],
      items: {
        outer: ["collarless linen coat","robe coat","unstructured jacket","noragi","kimono cardigan","long linen cardigan","draped overcoat","boxy linen blazer"],
        top: ["linen tunic","gauze blouse","organic cotton tee","raw silk top","drop-shoulder tee","loose-fit linen shirt","knit top","undyed cotton tee"],
        bottom: ["wide linen trousers","drawstring linen pants","culottes","slip skirt","maxi linen skirt","balloon pants","relaxed wide-leg pants","linen cargo pants"],
        shoes: ["leather slides","tabi flats","wooden clogs","soft leather mules","woven flats","babouche","minimal sandals","canvas slip-ons"],
        bag: ["natural canvas tote","woven basket bag","linen tote","knot bag","undyed cotton shopper","soft hobo bag","market tote","net bag"],
        accessory: ["wooden bead bracelet","linen headband","neutral scarf","straw hat","minimalist stud earrings","stone pendant","braided belt","ceramic ring"],
      },
    },
    B: {
      name: "French Casual",
      mood: "parisian, effortless-chic, borrowed-from-the-boys, laid-back polished",
      materials: ["cotton","silk","wool","cashmere","linen","denim","boucle","tweed","leather","velvet"],
      items: {
        outer: ["wool blazer","trench coat","chore coat","boucle jacket","soft camel coat","denim jacket","tweed jacket","oversized blazer"],
        top: ["breton stripe tee","cashmere crew-neck","silk blouse","linen shirt","wrap top","boat-neck tee","white poplin shirt","cashmere sweater"],
        bottom: ["straight-leg jeans","white wide-leg trousers","midi skirt","slip skirt","high-waist straight denim","tailored shorts","linen trousers","pleated skirt"],
        shoes: ["ballet flats","loafers","espadrilles","suede ankle boots","leather sandals","block-heel mules","mary janes","canvas sneakers"],
        bag: ["soft leather tote","mini shoulder bag","canvas tote","bucket bag","leather hobo","satchel","straw market bag","clutch"],
        accessory: ["silk scarf","gold hoops","pearl studs","woven belt","beret","thin gold necklace","tortoiseshell clips","sunglasses"],
      },
    },
    C: {
      name: "Soft Amekaji",
      mood: "workwear, heritage, outdoors-meets-casual, japanese americana",
      materials: ["denim","flannel","canvas","waxed cotton","wool","corduroy","heavy cotton","leather","fleece","chambray"],
      items: {
        outer: ["field jacket","barn jacket","denim jacket","flannel shirt-jacket","canvas chore coat","quilted liner vest","duffle coat","parka"],
        top: ["flannel shirt","waffle henley","chambray shirt","grandad collar shirt","band collar shirt","pocket tee","work shirt","yarn-dyed shirt"],
        bottom: ["vintage denim","fatigue pants","carpenter jeans","corduroy trousers","wide chinos","work pants","raw denim","bermuda shorts"],
        shoes: ["desert boots","moccasins","wallabees","leather work boots","canvas sneakers","hiking boots","suede chukkas","boat shoes"],
        bag: ["canvas messenger","backpack","waxed canvas tote","tool bag","satchel","knapsack","canvas duffle","roll-top bag"],
        accessory: ["leather belt","bandana","canvas cap","thick wool socks","work gloves","utility keychain","watch with leather strap","canvas wallet"],
      },
    },
  },
  artistic_minimal: {
    A: {
      name: "Gallery Mono",
      mood: "tonal, monochromatic, editorial, architectural, quiet luxury",
      materials: ["wool","cotton","linen","silk","neoprene","organza","jersey","canvas","felt","compressed wool"],
      items: {
        outer: ["collarless long coat","cocoon coat","longline blazer","unstructured coat","cape blazer","column coat","wrap coat","minimalist trench"],
        top: ["structured tee","ribbed tank","clean mock-neck","silk shell","fitted turtleneck","cotton jersey top","layered slip","minimalist crew"],
        bottom: ["wide cropped trousers","pleated wide pants","maxi pencil skirt","straight column skirt","barrel leg pants","clean-line chinos","culottes","jersey pants"],
        shoes: ["square-toe flats","architectural mules","derby shoes","minimal sneakers","sock boots","platform loafers","sculptural sandals","pointed flats"],
        bag: ["geometric tote","origami bag","structured clutch","portfolio bag","circle bag","soft tote","envelope bag","boxy shoulder bag"],
        accessory: ["sculptural bangle","bold geometric earrings","single statement ring","minimalist choker","clean leather belt","oversized sunglasses","head wrap","architectural hair clip"],
      },
    },
    B: {
      name: "Wabi-Sabi Craft",
      mood: "handmade, textural, imperfect beauty, craft-forward, organic",
      materials: ["linen","hemp","raw silk","wool","cotton","gauze","paper yarn","hand-dyed cotton","unbleached fabric","leather"],
      items: {
        outer: ["uneven-hem coat","draped cardigan","hand-knit vest","linen duster","asymmetric jacket","patchwork coat","woven jacket","artisanal blazer"],
        top: ["asymmetric knit","pleated linen top","cowl-neck top","hand-dyed tee","gauze blouse","uneven-hem top","tunic shirt","raw-edge tee"],
        bottom: ["wrap skirt","hakama pants","dhoti pants","asymmetric skirt","linen balloon pants","wrapped wide-leg","raw hem midi skirt","pleated linen skirt"],
        shoes: ["suede tabi","leather clog","woven mule","soft leather flat","handmade sandal","minimal leather boot","craft loafer","leather tabi boot"],
        bag: ["pleated tote","woven leather bag","dumpling bag","knot bag","craft tote","handwoven bag","artisanal bucket","origami pouch"],
        accessory: ["ceramic bead necklace","hand-formed ring","linen scarf","natural stone earrings","braided leather bracelet","wood brooch","handmade belt","clay pendant"],
      },
    },
    C: {
      name: "Avant-Garde Edge",
      mood: "experimental, deconstructed, conceptual, fashion-forward, directional",
      materials: ["leather","neoprene","mesh","vinyl","silk","wool","rubber","metal hardware","denim","jersey"],
      items: {
        outer: ["asymmetric blazer","leather jacket","cape coat","deconstructed trench","kimono jacket","crushed velvet jacket","structural coat","vinyl jacket"],
        top: ["sheer mesh top","organza blouse","mohair knit","bias-cut top","ruched top","open-back top","draped jersey top","layered tunic"],
        bottom: ["leather skirt","satin wide pants","sarouel pants","barrel pants","asymmetric pleated skirt","vinyl skirt","layered skirt","avant-garde trousers"],
        shoes: ["tabi boots","sculptural heels","platform oxford","architectural wedge","velvet ankle boots","metal-toe boots","glove shoes","high-concept sneakers"],
        bag: ["chain bag","sculptural shoulder bag","geometric box bag","avant-garde clutch","holographic bag","hard case bag","deconstructed tote","art object bag"],
        accessory: ["oversized geometric earring","layered chain necklace","single sculptural piece","avant-garde sunglasses","metal cuff","statement headpiece","ear cuff set","conceptual brooch"],
      },
    },
  },
  retro_luxe: {
    A: {
      name: "70s Bohemian",
      mood: "boho, free-spirited, earthy, folk-inspired, prairie-meets-rock",
      materials: ["suede","velvet","crochet","silk","denim","cotton","macrame","lace","embroidery","fringe"],
      items: {
        outer: ["suede fringe jacket","velvet blazer","crochet cardigan","afghan coat","patchwork denim jacket","tapestry coat","embroidered jacket","boho wrap coat"],
        top: ["peasant blouse","embroidered tunic","lace top","crochet top","printed silk blouse","tie-front blouse","prairie blouse","floral embroidered top"],
        bottom: ["flared jeans","maxi boho skirt","tiered skirt","corduroy bell-bottoms","suede midi skirt","printed wide pants","gaucho pants","floral maxi skirt"],
        shoes: ["platform sandals","suede knee boots","wedge espadrilles","lace-up sandals","platform clogs","huarache sandals","western boots","leather ankle boots"],
        bag: ["tapestry bag","fringe suede bag","wicker bag","macrame bag","saddle bag","boho crossbody","woven tote","patchwork bag"],
        accessory: ["headscarf","layered necklace","turquoise jewelry","wide suede belt","coin earrings","stacked bracelets","feather earrings","embroidered headband"],
      },
    },
    B: {
      name: "Heritage Classic",
      mood: "old-money, ivy-league, timeless, understated luxury, equestrian",
      materials: ["tweed","wool","cashmere","leather","silk","corduroy","denim","flannel","cotton","velvet"],
      items: {
        outer: ["tweed blazer","camel overcoat","polo coat","wool blazer","corduroy blazer","houndstooth jacket","equestrian jacket","double-breasted coat"],
        top: ["cashmere turtleneck","cable-knit sweater","silk blouse","oxford shirt","cricket jumper","fair isle knit","ribbed polo","argyle sweater"],
        bottom: ["wool trousers","riding pants","corduroy pants","plaid skirt","pleated midi skirt","wide-leg wool pants","tweed skirt","straight-leg jeans"],
        shoes: ["leather loafers","penny loafers","riding boots","oxford shoes","brogues","chelsea boots","leather ankle boots","kitten heel pumps"],
        bag: ["frame bag","structured handbag","leather satchel","doctor bag","box bag","equestrian bag","leather tote","camera bag"],
        accessory: ["pearl earrings","gold signet ring","silk scarf","leather belt","classic watch","pearl necklace","wide brim hat","leather gloves"],
      },
    },
    C: {
      name: "Cinematic Glam",
      mood: "hollywood, luxe, statement-dressing, old-glam, maximalist",
      materials: ["satin","velvet","silk","leather","brocade","sequin","faux fur","cashmere","organza","gold lamé"],
      items: {
        outer: ["velvet blazer","faux fur coat","gold button blazer","cape","sequin jacket","satin trench","embellished coat","brocade blazer"],
        top: ["satin blouse","sequin top","velvet halter","corset top","embellished bodysuit","gold lamé top","wrap satin top","feather-trim blouse"],
        bottom: ["velvet trousers","satin midi skirt","sequin skirt","leather pants","pleated palazzo","wrap satin skirt","brocade skirt","high-slit maxi skirt"],
        shoes: ["kitten heel mules","strappy sandals","velvet pumps","platform heels","metallic sandals","gold ankle boots","mary jane heels","embellished flats"],
        bag: ["satin clutch","metallic evening bag","velvet top-handle","embellished bag","jeweled clutch","chain mini bag","beaded bag","sequin pouch"],
        accessory: ["chandelier earrings","statement necklace","velvet headband","wide brim hat","opera gloves","brooch","rhinestone sunglasses","pearl drop earrings"],
      },
    },
  },
  sport_modern: {
    A: {
      name: "Gorpcore",
      mood: "outdoor, technical, utilitarian, nature-meets-function, trail-ready",
      materials: ["gore-tex","ripstop","fleece","nylon","cordura","mesh","rubber","softshell","recycled polyester","merino wool"],
      items: {
        outer: ["gore-tex shell","technical anorak","fleece jacket","insulated parka","rain jacket","softshell jacket","windbreaker","mountain jacket"],
        top: ["merino base layer","half-zip fleece","technical quarter-zip","performance tee","trail running top","sun-protection shirt","hiking shirt","grid fleece"],
        bottom: ["hiking pants","convertible pants","waterproof trousers","cargo shorts","trail shorts","ripstop cargo","climbing pants","softshell pants"],
        shoes: ["trail running shoes","hiking boots","approach shoes","waterproof sneakers","gore-tex boots","trail hikers","mountaineering boots","rubber-sole boots"],
        bag: ["hiking backpack","hydration pack","utility sling","chest rig","trekking daypack","dry bag","summit pack","technical waist belt"],
        accessory: ["bucket hat","sun visor","merino buff","carabiner set","trekking pole","utility headband","waterproof gloves","technical cap"],
      },
    },
    B: {
      name: "Athleisure Minimal",
      mood: "clean sport, studio-to-street, soft athletic, wellness aesthetic",
      materials: ["jersey","cotton","nylon","spandex","mesh","modal","tencel","bamboo","soft fleece","seamless fabric"],
      items: {
        outer: ["zip-up hoodie","lightweight bomber","cropped track jacket","fitted fleece","athleisure blazer","nylon bomber","stretch jacket","ponte jacket"],
        top: ["sports bra","fitted tank","ribbed crop tee","seamless top","cut-out back top","bralette top","fitted long sleeve","mesh insert tee"],
        bottom: ["high-waist leggings","bike shorts","yoga pants","wide-leg sweatpants","tennis skirt","athletic shorts","jogger pants","track shorts"],
        shoes: ["retro running shoes","platform sneakers","court shoes","training shoes","soft knit sneakers","slip-on sneakers","minimal runners","chunky trainers"],
        bag: ["gym tote","canvas duffel","yoga mat bag","mini backpack","shoulder bag","pilates bag","clean tote","sport crossbody"],
        accessory: ["sports visor","hair ties set","minimalist watch","subtle hoops","sport headband","ear pods case","light ankle socks","stretch gloves"],
      },
    },
    C: {
      name: "Tech Urban",
      mood: "techwear, cyberpunk-adjacent, urban-utility, futuristic function",
      materials: ["nylon","leather","mesh","rubber","reflective fabric","cordura","kevlar weave","carbon texture","titanium hardware","ripstop"],
      items: {
        outer: ["tactical jacket","nylon field jacket","urban parka","tech-fleece hoodie","reflective jacket","cargo vest","modular jacket","utility windbreaker"],
        top: ["mesh layer top","turtleneck base","compression long sleeve","tactical tee","tech-fabric crop","reflective strip tee","mock-neck fleece","seamless tech top"],
        bottom: ["cargo trousers","tactical pants","nylon cargo shorts","jogger cargo","techwear pants","urban utility pants","parachute pants","D-ring pants"],
        shoes: ["chunky platform sneakers","tactical boots","techwear sneakers","high-top boots","rubber-sole boots","urban hiking boots","tech runners","sock-fit sneakers"],
        bag: ["chest harness bag","tactical sling","modular backpack","utility belt bag","tech crossbody","D-ring bag","cargo pouch","EDC bag"],
        accessory: ["tactical cap","utility balaclava","smart watch","carabiner clip","reflective band","modular belt","tech gloves","ear clip"],
      },
    },
  },
  creative_layered: {
    A: {
      name: "Grunge Revival",
      mood: "90s grunge, layered, raw, distressed, band-inspired",
      materials: ["denim","flannel","leather","jersey","mesh","lace","velvet","cotton","plaid fabric","studs"],
      items: {
        outer: ["oversized flannel shirt","leather biker jacket","denim jacket","plaid shirt-jacket","distressed denim jacket","grunge blazer","military jacket","vintage bomber"],
        top: ["band tee","ripped tee","mesh top","fishnet layer","lace trim top","cropped flannel","graphic tee","henley"],
        bottom: ["ripped jeans","plaid mini skirt","cargo pants","baggy jeans","denim skirt","plaid trousers","velvet skirt","flared jeans"],
        shoes: ["combat boots","chunky platform boots","mary janes","creeper shoes","high-top converse","lug-sole boots","platform oxfords","doc martens style"],
        bag: ["canvas backpack","guitar strap bag","studded bag","chain bag","vintage crossbody","patchwork bag","distressed tote","mini grunge bag"],
        accessory: ["choker necklace","safety pin set","layered chain necklace","studded belt","worn beanie","band patches","fishnet tights","arm warmer"],
      },
    },
    B: {
      name: "Vintage Eclectic",
      mood: "thrift-store treasure, maximalist mix, eclectic boho, vintage collector",
      materials: ["velvet","silk","crochet","denim","corduroy","leather","brocade","tapestry","lace","embroidery"],
      items: {
        outer: ["velvet blazer","tapestry coat","patchwork denim jacket","kimono","embroidered jacket","faux fur coat","crochet cardigan","brocade jacket"],
        top: ["floral print blouse","lace top","vintage graphic tee","crochet vest","patchwork shirt","embroidered blouse","printed silk top","smock top"],
        bottom: ["corduroy wide-leg","velvet midi skirt","patchwork jeans","floral skirt","tapestry mini","tiered boho skirt","printed wide pants","embroidered skirt"],
        shoes: ["mary janes","vintage loafers","platform boots","kitten heels","brocade mules","velvet boots","clogs","T-bar heels"],
        bag: ["tapestry bag","vintage frame bag","patchwork tote","embroidered bag","beaded bag","wicker bag","velvet top-handle","novelty bag"],
        accessory: ["brooch collection","layered vintage necklace","oversized retro glasses","head scarf","mixed earrings","stacked rings","hair clips set","vintage belt"],
      },
    },
    C: {
      name: "Art Punk",
      mood: "punk, DIY, anti-fashion, subversive, intentionally confrontational",
      materials: ["leather","vinyl","mesh","rubber","denim","metal hardware","canvas","nylon","fishnet","chain"],
      items: {
        outer: ["leather jacket","vinyl trench","leopard-print coat","spiked jacket","cut-off denim jacket","chain-detail blazer","pvc coat","bondage jacket"],
        top: ["corset top","band tee with pins","mesh bodysuit","fishnet top","ripped graphic tee","vinyl crop top","safety-pin top","DIY distressed tee"],
        bottom: ["leather pants","plaid mini skirt","vinyl skirt","colored ripped jeans","tartan trousers","cut-off shorts","checkered pants","punk suspender skirt"],
        shoes: ["platform combat boots","studded ankle boots","creepers","heeled mary janes","bondage boots","chunky platform heels","punk sneakers","lug-sole knee boots"],
        bag: ["studded backpack","chain shoulder bag","spike-detail bag","bondage bag","sequin mini bag","metallic clutch","punk fanny pack","chain crossbody"],
        accessory: ["spike choker","safety pin earrings","chain belt","metal cuff","leather wristband","studded cap","fishnet tights","collar chain"],
      },
    },
  },
};

const ACTIVE_CATEGORIES: Record<string, string> = {
  outer: "outerwear (coats, jackets, blazers)",
  mid: "mid-layer (sweaters, knits, cardigans, hoodies)",
  top: "tops (shirts, blouses, tees, bodysuits)",
  bottom: "bottoms (pants, jeans, skirts, shorts)",
  shoes: "footwear (sneakers, boots, flats, sandals)",
  bag: "bags (totes, crossbody, backpacks, clutches)",
  accessory: "accessories (jewelry, hats, scarves, belts, sunglasses)",
};

const SEASON_EXCLUDE_CATS: Record<string, string[]> = {
  summer: ["outer","mid"],
  spring: ["mid"],
};

const SEASON_MODIFIERS: Record<string, { fabric: string[]; note: string }> = {
  spring: { fabric: ["cotton","linen","light layers"], note: "lightweight, transitional, fresh" },
  summer: { fabric: ["linen","mesh","breathable cotton"], note: "breathable, minimal layers, sleeveless options" },
  fall: { fabric: ["wool","flannel","corduroy","tweed"], note: "warm tones, layering pieces, rich textures" },
  winter: { fabric: ["wool","cashmere","fleece","thermal","down"], note: "insulated, warm, cold-weather fabrics" },
};

const BODY_FIT: Record<string, { top: string; bottom: string; outer: string }> = {
  slim: { top: "oversized, relaxed, boxy", bottom: "wide-leg, relaxed, straight", outer: "oversized, relaxed" },
  regular: { top: "regular, straight, relaxed, fitted", bottom: "straight, slim, regular", outer: "regular, relaxed" },
  "plus-size": { top: "straight, A-line, empire waist", bottom: "straight, wide-leg, bootcut", outer: "straight, open-front" },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    let gender: string, body_type: string, vibe: string, season: string;
    let outfit_context: OutfitContext | undefined;
    try {
      const body = await req.json();
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
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vibeKey = vibe.toLowerCase().replace(/\s+/g, "_");
    const genderLabel = gender === "MALE" ? "men" : gender === "FEMALE" ? "women" : "unisex";
    const seasonLabel = (season || "all season").toLowerCase();
    const dna = VIBE_DNA[vibeKey];
    const looks = VIBE_LOOKS[vibeKey];
    const bodyFit = BODY_FIT[body_type] || BODY_FIT["regular"];
    const seasonMod = SEASON_MODIFIERS[seasonLabel];
    const excludedCats = new Set(SEASON_EXCLUDE_CATS[seasonLabel] || []);

    const activeCats = Object.entries(ACTIVE_CATEGORIES)
      .filter(([k]) => !excludedCats.has(k))
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const dnaBlock = dna
      ? `Formality: ${dna.formality}
Color palette — primary: ${dna.colors.primary.join(", ")} | secondary: ${dna.colors.secondary.join(", ")} | accent (sparingly): ${dna.colors.accent.join(", ")}
Tonal strategy: ${dna.tonal}
Era/mood: ${dna.era.join(", ")}`
      : "";

    const looksBlock = looks
      ? Object.entries(looks).map(([k, l]) => {
          const sampleItems = Object.entries(l.items)
            .filter(([cat]) => !excludedCats.has(cat))
            .map(([cat, items]) => `  ${cat}: ${items.slice(0, 6).join(", ")}`)
            .join("\n");
          return `Look ${k} — "${l.name}" (${l.mood})
Materials: ${l.materials.join(", ")}
Reference items per category:
${sampleItems}`;
        }).join("\n\n")
      : "";

    const ctxBlock = outfit_context
      ? `OUTFIT HARMONY: existing colors=${(outfit_context.existing_colors || []).join(",")} | existing materials=${(outfit_context.existing_materials || []).join(",")} | target slot=${outfit_context.target_slot || "any"}. Generate COMPLEMENTARY keywords that harmonize.`
      : "";

    const prompt = `You are a fashion buyer who shops on Amazon daily. Generate Amazon search keywords a real person would type.

PROFILE:
- Gender: ${genderLabel}
- Body fit: top(${bodyFit.top}) | bottom(${bodyFit.bottom}) | outer(${bodyFit.outer})
- Vibe: "${vibeKey.replace(/_/g, " ")}"
- Season: ${seasonLabel}${seasonMod ? ` — fabrics: ${seasonMod.fabric.join(", ")} | note: ${seasonMod.note}` : ""}
${ctxBlock ? `- ${ctxBlock}` : ""}

VIBE DNA:
${dnaBlock}

LOOK VARIANTS (A = core aesthetic, B = adjacent mood, C = edge/experimental):
${looksBlock}

TASK: For each category below, generate exactly 3 Amazon search keywords — one inspired by each Look (A, B, C).
Each keyword must:
1. Start with "${genderLabel}" or "${genderLabel}'s"
2. Be 3–6 words long
3. Reference a SPECIFIC item type from that Look's reference items (pick different item types per look)
4. Include a color from the vibe palette OR a material from that Look
5. Include a fit word when relevant (e.g., oversized, slim, wide-leg)
6. Sound like a real Amazon search query

CATEGORIES TO FILL:
${activeCats}

OUTPUT: Return ONLY valid JSON — no markdown, no comments:
{
  "outer": ["women's keyword A", "women's keyword B", "women's keyword C"],
  "top": ["...", "...", "..."],
  ...
}
Include every category listed above. Each value is an array of exactly 3 strings.`;

    let geminiRes: Response | null = null;
    let lastErrText = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.9, maxOutputTokens: 2048, responseMimeType: "application/json" },
          }),
        }
      );
      if (geminiRes.ok) break;
      lastErrText = await geminiRes.text();
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }

    if (!geminiRes || !geminiRes.ok) {
      return new Response(
        JSON.stringify({ error: "Gemini API error", detail: lastErrText }),
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

    let parsed: Record<string, string[]>;
    try {
      parsed = JSON.parse(jsonMatch[0]) as Record<string, string[]>;
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Failed to parse Gemini JSON", detail: (e as Error).message, raw: rawText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categories: Record<string, string[]> = {};
    const allKeywords: string[] = [];
    for (const [cat, kws] of Object.entries(parsed)) {
      if (Array.isArray(kws)) {
        categories[cat] = kws.filter(Boolean);
        allKeywords.push(...categories[cat]);
      }
    }

    return new Response(
      JSON.stringify({
        keywords: allKeywords,
        categories,
        source: "gemini",
        vibeKey,
        colorHints: dna ? {
          primary: dna.colors.primary,
          secondary: dna.colors.secondary,
          accent: dna.colors.accent,
        } : null,
        materialHints: looks ? {
          lookMaterials: Object.fromEntries(
            Object.entries(looks).map(([k, l]) => [k, l.materials])
          ),
          seasonFabrics: seasonMod?.fabric || [],
        } : null,
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
