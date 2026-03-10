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
      materials: ["fine wool","gabardine","stiff cotton","cashmere","silk","satin","poplin","neoprene","silver"],
      items: {
        outer: ["oversized wool coat","structured trench","boxy leather blazer","double-breasted maxi coat","cropped tailored jacket","collarless wool blazer","pinstripe blazer","hourglass coat","cashmere wrap coat","structured gilet","tuxedo jacket","cape blazer","wool trench","leather trench","belted blazer","boyfriend blazer","shawl collar coat","masculine overcoat","sharp shoulder coat","asymmetrical jacket","minimalist parka","wool bomber","cropped trench","longline vest","split-sleeve blazer","granddad coat","textured wool coat","neoprene coat","raw-edge blazer","archival coat"],
        mid: ["cashmere turtleneck sweater","fine merino mock neck","ribbed wool jumper","slim-fit crewneck knit","sleek zip-up knit","structured cable-knit pullover","fine gauge v-neck sweater","charcoal wool vest","fitted ribbed turtleneck","black cashmere cardigan","monochrome knit polo","minimal half-zip sweater","longline wool sweater","tailored sweater vest","silk-blend turtleneck","grey merino crewneck","fitted intarsia knit","neoprene sweatshirt","ponte knit top","slim double-knit pullover","cropped knit vest","sleeveless turtleneck knit","fine-knit open cardigan","sculpted rib sweater","slim cashmere hoodie","polo neck jumper","understated knit layer","column-fit turtleneck","fine wool sweatshirt","structured knit top"],
        top: ["high-neck knit","crisp poplin shirt","sheer layering top","asymmetric drape top","silk button-down","structured bustier","fine turtleneck","sleeveless vest","ribbed mock neck","satin blouse","architectural shirt","cotton tunic","cutout bodysuit","stiff collar shirt","deep v-neck knit","wool polo","oversized cuff shirt","backless top","harness detail top","mesh long sleeve","cold shoulder top","cropped white shirt","silk camisole","structured tee","layered shirt","wrap blouse","metallic thread knit","bandage top","organza shirt","minimalist tee"],
        bottom: ["wide-leg wool trousers","tailored Bermuda shorts","leather pants","maxi pencil skirt","pleated trousers","cigarette pants","high-waisted slacks","wool culottes","bootcut trousers","stirrup pants","straight leg jeans black","satin midi skirt","puddle hem pants","cargo trousers refined","split hem leggings","wool mini skirt","tailored joggers","draped skirt","tuxedo pants","leather midi skirt","pinstripe slacks","barrel leg pants","asymmetric skirt","silk trousers","raw hem denim","wide cuff pants","pleated shorts","wrap skirt","neoprene pants","structured skort"],
        shoes: ["square-toe boots","chunky loafers","architectural heels","pointed mules","ankle boots","slingbacks","minimal slides","chelsea boots","oxfords","knee-high boots","tabi boots","platform loafers","strappy sandals","leather sneakers clean","derby shoes","sock boots","kitten heels","wedge mules","combat boots sleek","ballerina flats","metallic heels","patent boots","driving shoes","brogues","thigh-high boots","d'orsay flats","structured sandals","rain boots matte","velvet slippers","monk straps"],
        bag: ["geometric tote","metal clutch","box bag","oversized clutch","doctor bag","baguette","accordion bag","rigid shopper","envelope clutch","structured bucket bag","briefcase","top handle bag","cylinder bag","triangular bag","phone pouch","wristlet","architectural shoulder bag","hard-shell clutch","minimal backpack","silver tote","patent leather bag","frame bag","belt bag leather","saddle bag","crossbody box","portfolio","vertical tote","chain strap bag","lucite clutch","knot bag"],
        accessory: ["silver chain necklace","metal-frame sunglasses","leather gloves","wide belt","sculptural ring","minimalist watch","pocket square","silver hoops","leather harness","cuff bracelet","geometric earrings","glasses chain","choker","signet ring","ear cuff","hair stick","modern brooch","tie bar","collar pin","leather bracelet","silver bangle","knuckle ring","matte hair clip","chain belt","silk neck scarf","anklet","arm band","pendant necklace","stacked rings","nose ring prop"],
      },
    },
    B: {
      name: "Neo-Prep Edge",
      mood: "ivy-league meets dark-academia, smart-casual, elevated prep",
      materials: ["tweed","corduroy","denim","cable-knit","velvet","waxed cotton","suede","quilted nylon","wool","leather"],
      items: {
        outer: ["varsity jacket","cropped bomber","wool peacoat","harrington jacket","oversized cardigan","duffle coat","navy blazer","cricket sweater","denim jacket","biker jacket","short trench coat","cable knit cardigan","corduroy jacket","quilted jacket","velvet blazer","stadium jumper","waxed jacket","shearling aviator","check blazer","retro windbreaker","fleece vest","suede bomber","track jacket","hooded duffle","leather blazer","utility jacket","cape coat","patchwork jacket","tweed jacket","coach jacket"],
        mid: ["cable-knit crewneck sweater","argyle v-neck pullover","cricket jumper","fair isle knit sweater","shawl collar cardigan","prep school half-zip","ribbed rollneck sweater","corduroy shirt-knit","vintage sweatshirt","oversized college crewneck","zip-up knit cardigan","waffle-knit henley sweater","mock neck sweater dark","tartan knit vest","heavy cable cardigan","wool turtleneck academic","retro stripe jumper","boxy crewneck knit","boyfriend cardigan tweed","quilted sweater vest","dark academia pullover","heritage cable-knit","leather elbow patch sweater","school-stripe knit","double-knit zip polo","fleece lined knit","intarsia crest sweater","chunky rib pullover","velvet-trim cardigan","relaxed v-neck knit"],
        top: ["cable vest","polo shirt","oxford shirt","rugby shirt","argyle sweater","V-neck jumper","white shirt","striped boat neck","crest sweatshirt","turtleneck","button-down","ringer tee","thermal henley","cropped knit","university logo tee","layered hoodie","fair isle knit","mesh polo","oversized shirt","graphic sweater","zip-up knit","sleeveless hoodie","waffle top","subtle tie-dye shirt","check shirt","ribbed tank","mock neck tee","corset shirt","vintage sweat","cropped polo"],
        bottom: ["pleated mini skirt","chinos","raw denim","wool check skirt","tailored shorts","wide chinos","tartan trousers","corduroy pants","skort","straight jeans","Bermuda shorts","cargo skirt","structured sweatpants","plaid pants","leather shorts","kilt","tennis skirt","carpenter pants","velvet skirt","track pants","wide denim","suspender skirt","culottes","stirrup leggings","patchwork jeans","button skirt","cuffed shorts","biking shorts","cargo jeans","relaxed slacks"],
        shoes: ["loafers with socks","derby","retro sneakers","mary janes","boat shoes","brogues","desert boots","saddle shoes","leather sneakers","canvas high-tops","platform loafers","rain boots","wallabees","gum sole shoes","low hiking boots","clogs","slip-ons","oxford heels","knee boots","combat boots","tassel loafers","driving shoes","court shoes","velcro sneakers","slide sandals with socks","monk straps","creepers","ballet flats","spectator shoes","vintage runners"],
        bag: ["satchel","canvas tote","bowling bag","backpack","messenger bag","saddle bag","book bag","briefcase","nylon backpack","drawstring bag","duffle","waist bag","crossbody camera bag","logo tote","school bag","mini trunk","gym sack","helmet bag","tool bag","vintage purse","barrel bag","laptop case","lunch box style bag","plaid tote","bucket bag","phone sling","flap bag","weekender","coin pouch","utility bag"],
        accessory: ["skinny tie","baseball cap","knee socks","crest brooch","glasses chain","headband","school scarf","signet ring","leather belt","tie clip","scrunchie","bow tie","enamel pin","whistle necklace","wristband","sport socks","beanie","lanyard","friendship bracelet","nato strap watch","bandana","hair bow","pearl choker","id bracelet","collar tips","backpack charm","suspenders","striped socks","bucket hat","reading glasses"],
      },
    },
    C: {
      name: "High-End Street",
      mood: "streetwear, techwear, urban-edge, graphic-driven",
      materials: ["nylon","leather","tech-fleece","mesh","neoprene","denim","jersey","rubber","reflective fabric","faux fur"],
      items: {
        outer: ["puffer vest","technical bomber","shearling jacket","biker jacket","coach jacket","denim jacket","heavy hoodie","anorak","windbreaker","track jacket","fleece jacket","oversized parka","tactical vest","rain poncho","utility jacket","cargo jacket","varsity bomber","nylon trench","reflective jacket","down jacket","shell jacket","gilet","moto jacket","souvenir jacket","cropped puffer","flannel shirt-jacket","faux fur coat","stadium jacket","hooded cape","convertible jacket"],
        mid: ["oversized crewneck sweatshirt","tech-fleece pullover","half-zip fleece","graphic logo hoodie","boxy knit sweater","dropped-shoulder crewneck","streetwear zip-up sweater","neoprene sweatshirt","heavy cotton pullover","raglan sweatshirt","distressed knit pullover","mock neck fleece","oversized polo sweater","layering hoodie zip","ribbed knit streetwear","cargo pocket sweater","tech-knit vest","utility sweater vest","reflective stripe knit","patchwork sweatshirt","slim rib turtleneck street","branded crewneck knit","fleece quarter-zip","chunky knit hoodie","nylon-trim sweater","merch-style crewneck","double-knit pullover","long-line knit vest","mesh panel sweater","sleeveless mock neck fleece"],
        top: ["cashmere hoodie","boxy tee","mock-neck sweat","half-zip","mesh tee","thermal","graphic tee","crewneck","muscle tank","neoprene top","tech-fleece top","longline tee","football jersey","crop top","racerback tank","oversized shirt","corset hoodie","cutout top","tie-dye tee","band tee","layered long sleeve","zip polo","asymmetrical top","sleeveless hoodie","vintage wash tee","ribbed body","distressed sweater","logo knit","tight turtleneck","sports jersey"],
        bottom: ["cargo sweats","parachute pants","leather joggers","track pants","grey denim","sweatshorts","cargo jeans","biker jeans","chinos","tech shorts","drawstring trousers","nylon pants","baggy jeans","ripstop cargos","utility skirt","shorts over pants","wide sweatpants","carpenter jeans","tear-away pants","moto pants","camo pants","distressed shorts","reflective pants","double-knee pants","jogger shorts","oversized shorts","stacked denim","vinyl pants","basketball shorts","tactical pants"],
        shoes: ["high-top sneakers","combat boots","chelsea boots","tech slides","dad sneakers","sock sneakers","luxury runners","hiking sneakers","rubber boots","slip-ons","retro basketball shoes","platform boots","foam runners","tactical boots","skate shoes","canvas low-tops","reflective sneakers","chunky sandals","tabi sneakers","moon boots","work boots","moto boots","velcro sneakers","air-bubble sneakers","trail runners","wedge sneakers","industrial boots","minimal trainers","chunky sneakers","future slides"],
        bag: ["mini leather bag","sling bag","cassette bag","utility crossbody","chest rig","oversized tote","belt bag","gym bag","phone pouch","tech backpack","duffle","shoebox bag","nylon tote","carabiner bag","waist pouch","hydration pack","camera bag","mini backpack","vertical shopper","padded tote","chain bag","industrial bag","transparent bag","reflective bag","modular bag","neck pouch","drawstring sack","weekender","holster bag","tactical pouch"],
        accessory: ["beanie","silver rings","headphones","chain necklace","bucket hat","shield sunglasses","baseball cap","bandana","industrial belt","wristbands","ear pods","paracord bracelet","face mask","carabiner","heavy chain","knuckle duster ring","visor","logo socks","multiple earrings","tech gloves","wallet chain","choker","smart watch","fingerless gloves","hair clips","sweatband","neck gaiter","reflective vest","grillz prop","piercing prop"],
      },
    },
  },
  effortless_natural: {
    A: {
      name: "Japandi Flow",
      mood: "zen, wabi-sabi, minimal, meditative, organic",
      materials: ["linen","cotton","raw silk","gauze","hemp","wool","waffle","canvas","undyed cotton","stone-washed"],
      items: {
        outer: ["collarless liner","soft blazer","kimono cardigan","noragi","robe coat","chore coat","linen jacket","poncho","quilted vest","oversized cardigan","wrap coat","haori jacket","knitted vest","linen duster","textured coat","shawl collar jacket","cocoon coat","boiled wool jacket","canvas jacket","capelet","blanket coat","asymmetrical jacket","tunic coat","padded liner","waffle robe","soft trench","gauze jacket","open front cardigan","wool cape","shrug"],
        mid: ["waffle-knit henley pullover","linen-cotton blend sweater","raw hem knit sweater","undyed cotton crewneck","gauze-knit cardigan","relaxed ribbed turtleneck","hemp knit pullover","stone-washed sweatshirt","soft loopback crewneck","boxy linen sweater","open-weave knit vest","cocoon-fit sweater","drop-shoulder knit pullover","organic cotton mock neck","textured slub knit","shawl collar knit","pointelle cardigan","lightweight wool pullover","washi-dye sweatshirt","draped knit vest","uneven-hem knit","tunic-length cardigan","oversized waffle knit","cozy henley knit","natural dye sweater","muted stripe knit","fisherman knit minimal","pilled texture cardigan","artisan knit pullover","soft ribbed v-neck"],
        top: ["linen tunic","waffle henley","organic tee","wrap top","boat neck knit","linen shirt","grandad shirt","gauze blouse","raw silk top","drop-shoulder tee","knit tank","cashmere sweater","dolman sleeve top","tunic shirt","ribbed tank","kimono top","oversized tee","layered tank","hemp shirt","boxy knit","cowl neck top","sleeveless tunic","pointelle knit","silk cami","thermal top","raglan tee","crop linen top","asymmetrical blouse","soft cotton shirt","boat neck tee"],
        bottom: ["wide linen trousers","drawstring pants","maxi skirt","culottes","balloon pants","midi skirt","relaxed trousers","wrap pants","gauze pants","knit pants","harem pants","sarouel pants","cotton slacks","raw silk pants","pleated skirt","wide leg jeans white","bermuda shorts","tiered skirt","lounge pants","ribbed leggings","hakama pants","dhoti pants","soft shorts","pajama style pants","cropped wide pants","elastic waist skirt","linen shorts","fluid trousers","canvas pants","knitted skirt"],
        shoes: ["suede mules","leather slides","tabi flats","babouche","canvas sneakers","leather sandals","clogs","soft loafers","espadrilles","barefoot shoes","woven flats","cork sandals","velvet slippers","moccasins","knit sneakers","gladiator sandals","ballet flats","toe-ring sandals","wooden clogs","straw sandals","canvas slip-ons","leather flip-flops","suede booties","sheepskin slippers","minimal boots","rope sandals","mesh flats","soft derby","mary janes flat","huaraches"],
        bag: ["soft hobo","canvas bucket","knot bag","net bag","market tote","linen shopper","woven bag","drawstring pouch","straw bag","slouchy shoulder bag","basket bag","cotton tote","macrame bag","bamboo handle bag","leather sack","furoshiki bag","crochet bag","wooden cage bag","jute bag","oversized canvas bag","wristlet","soft clutch","bucket tote","round rattan bag","raffia bag","knitted bag","suede pouch","phone sling","vegetable tanned leather bag","folded clutch"],
        accessory: ["ceramic jewelry","cotton scarf","bucket hat","wooden beads","linen hair tie","silver bangle","round glasses","leather cord","wooden bangle","hair stick","simple ring","matte earrings","pearl studs","canvas belt","straw hat","turban","silk scrunchie","anklet","pendant","stone necklace","woven bracelet","minimalist watch","glass beads","bone ring","leather cuff","head wrap","shawl","apron","barefoot sandals","tote charm"],
      },
    },
    B: {
      name: "French Casual",
      mood: "parisian, effortless-chic, borrowed-from-the-boys, laid-back polished",
      materials: ["cotton","silk","wool","cashmere","linen","denim","boucle","tweed","leather","velvet"],
      items: {
        outer: ["trench coat","wool blazer","cardigan coat","boucle jacket","peacoat","clean denim jacket","soft biker","tweed jacket","camel coat","oversized blazer","rain mac","houndstooth jacket","utility jacket","cape","shearling coat","navy blazer","corduroy jacket","wrap coat","gilet","duster coat","quilted jacket","leather blazer","boxy jacket","velvet blazer","linen blazer","chore jacket","silk bomber","poncho","shacket","knitted coat"],
        mid: ["cashmere crewneck sweater","breton stripe knit","fine merino v-neck","slim-fit turtleneck","boyfriend cardigan","boucle knit pullover","cropped cashmere cardigan","navy ribbed sweater","cotton-blend sweatshirt","silk-mix knit vest","slouchy wool crewneck","tie-neck knit top","french ribbed turtleneck","soft open-front cardigan","oversized merino pullover","classic roll-neck knit","camel fine-knit sweater","cable-knit easy cardigan","striped sailor pullover","linen-knit tunic sweater","half-zip wool fleece","draped knit layer","velvet-trim knit vest","relaxed v-neck cardigan","cream boucle cardigan","cotton knit crewneck","classic twin-set knit","fine-gauge turtleneck","pearl-button cardigan","wrap-front knit"],
        top: ["breton stripe tee","cashmere crew","silk blouse","boat neck top","ribbed knit","button-down","camisole","v-neck sweater","polo knit","lace trim top","blue shirt","ringer tee","wrap blouse","sleeveless turtleneck","polka dot top","gingham shirt","white tee","muscle tank","cropped cardigan","silk tank","puff sleeve blouse","square neck top","vintage graphic tee","linen shirt","poplin top","sheer blouse","mock neck","tie-front shirt","corset top","thermal"],
        bottom: ["vintage denim","silk skirt","white jeans","corduroy pants","button skirt","cigarette pants","cropped flare","mini skirt","tailored shorts","slip skirt","straight leg jeans","wide leg jeans","linen trousers","culottes","midi skirt","pencil skirt","bermuda shorts","sailor pants","check trousers","wrap skirt","velvet pants","knit skirt","denim shorts","high-waisted shorts","pleated trousers","leather skirt","refined cargo pants","silk joggers","tiered skirt","overall dress"],
        shoes: ["ballet flats","minimal sneakers","suede loafers","ankle boots","espadrilles","mary janes","strappy sandals","knee boots","kitten heels","driving shoes","court shoes","block heels","mules","canvas shoes","clogs","derby shoes","brogues","slingbacks","d'orsay pumps","woven flats","velvet slippers","rain boots","riding boots","gladiator sandals","wedge espadrilles","patent loafers","metallic sandals","pointed flats","chelsea boots","slide sandals"],
        bag: ["straw basket","canvas tote","leather shoulder bag","baguette","bucket bag","clasp purse","mini handbag","woven tote","saddle bag","clutch","frame bag","box bag","chain bag","wicker bag","crossbody","shopper","tote","vanity case","drawstring bag","bowling bag","messenger","nylon bag","beaded bag","bamboo bag","doctor bag","phone bag","wristlet","camera bag","satchel","coin purse"],
        accessory: ["silk scarf","gold hoops","beret","thin belt","cat-eye glasses","gold necklace","hair clip","watch","scrunchie","pearl necklace","ribbon","headband","sunglasses","signet ring","anklet","bracelet stack","vintage watch","hair bow","cameo","locket","bangle","ear cuff","lapel pin","chain belt","leather gloves","reading glasses","hat pin","bobby pins","tote scarf","red lipstick prop"],
      },
    },
    C: {
      name: "Soft Amekaji",
      mood: "workwear, heritage, outdoors-meets-casual, japanese americana",
      materials: ["denim","flannel","canvas","waxed cotton","wool","corduroy","heavy cotton","leather","fleece","chambray"],
      items: {
        outer: ["quilted liner","field jacket","duffle coat","barn jacket","coverall","down vest","chore coat","flannel shirt-jacket","corduroy jacket","hunting jacket","heavy cardigan","denim jacket","parka","wool vest","shop coat","fleece jacket","rain parka","engineers jacket","utility vest","deck jacket","mountain parka","souvenir jacket","canvas coat","blanket coat","shawl collar cardigan","waxed jacket","varsity jacket","anorak","pilot jacket","ranch coat"],
        mid: ["heavy cable-knit crewneck","fair isle pullover sweater","thermal waffle knit","flannel-lined knit vest","shawl collar sweater","chunky fisherman knit","corduroy shirt-jacket knit","wool half-zip sweater","buffalo check knit","raglan sleeve sweater","fleece-lined cardigan","heritage stripe crewneck","oversized sweatshirt vintage","navy wool crewneck","heavy cotton henley knit","work-wear rib sweater","americana stripe knit","plaid-trim cardigan","loop-back hoodie knit","canvas-trim sweater vest","washed fleece pullover","denim-trim knit","double-faced wool vest","merino half-zip heritage","bomber-knit hybrid","heavy rib turtleneck","ranger stripe sweater","varsity-stripe pullover","sashiko-stitch knit","selvedge-edge sweatshirt"],
        top: ["chambray shirt","fair isle knit","layered turtleneck","flannel shirt","sweatshirt","thermal henley","denim shirt","ringer tee","raglan tee","waffle knit","cable sweater","work shirt","pocket tee","hoodie","baseball tee","grandad shirt","striped tee","logger shirt","wool shirt","mechanic shirt","vintage tee","mock neck","sleeveless hoodie","patchwork shirt","knitted vest","half-zip","heavy cotton tee","polo shirt","western shirt","oversized knit"],
        bottom: ["fatigue pants","wide chinos","maxi skirt","carpenter jeans","corduroy trousers","painter pants","overalls","raw denim","cargo skirt","bermuda shorts","denim skirt","work pants","baker pants","climbing pants","patch jeans","dungarees","sweatpants","canvas shorts","utility skirt","gurkha shorts","balloon pants","pleated chinos","wide denim","hickory stripe pants","camo pants","linen shorts","wool trousers","culottes","button fly jeans","cargo shorts"],
        shoes: ["desert boots","work boots","deck shoes","wallabees","hiking boots","moccasins","leather sandals","canvas high-tops","service boots","rain boots","duck boots","engineer boots","slip-ons","clogs","gum sole sneakers","trail runners","suede boots","mountain boots","low-top sneakers","sandals with socks","logger boots","monkey boots","saddle shoes","derby shoes","rugged chelsea boots","canvas oxfords","hiking sandals","retro runners","garden boots","felt shoes"],
        bag: ["helmet bag","backpack","tote","tool bag","messenger","satchel","duffle","waist pouch","canvas crossbody","rucksack","newspaper bag","market bag","dry bag","sling bag","bucket bag","gym bag","camera bag","utility tote","kit bag","barrel bag","lunch bag","field bag","phone pouch","map case","holster","nylon tote","drawstring sack","leather pouch","basket","vintage suitcase"],
        accessory: ["beanie","bandana","thick belt","wool socks","vintage cap","tortoiseshell glasses","field watch","suspenders","wool scarf","gloves","key clip","wallet chain","silver ring","feather necklace","paracord bracelet","hiking socks","leather bracelet","badge","enamel pin","neck warmer","fingerless gloves","brass ring","leather lanyard","boot laces","carabiner","handkerchief","lighter","cap","compass","pocket knife prop"],
      },
    },
  },
  artistic_minimal: {
    A: {
      name: "Gallery Mono",
      mood: "tonal, monochromatic, editorial, architectural, quiet luxury",
      materials: ["wool","cotton","linen","silk","neoprene","organza","jersey","canvas","felt","compressed wool"],
      items: {
        outer: ["collarless coat","kimono jacket","longline blazer","stand-collar jacket","cocoon coat","structured vest","cape coat","asymmetric jacket","minimal trench","geometric coat","wrap jacket","architectural blazer","stiff wool coat","neoprene coat","sleeveless coat","boxy jacket","cropped blazer","tunic coat","wool cape","linen duster","oversized vest","tailored coat","shell jacket","bolero","draped jacket","shawl coat","zip-front coat","panelled jacket","funnel neck coat","minimalist parka"],
        mid: ["tonal ribbed turtleneck","compressed wool vest","sleeveless mock neck knit","minimal crewneck sweater","architectural knit pullover","monochrome funnel-neck knit","fine-knit column sweater","raw-edge wool jumper","neoprene-knit hybrid","longline knit vest","boxy linen-wool blend knit","asymmetric hem sweater","panelled knit pullover","stiff-front knit top","sculptural sweater vest","fine jersey turtleneck","zero-dye wool crewneck","felt-trim knit","abstract-seam sweater","layered knit panel","cropped structured cardigan","intarsia block sweater","geo-seam knit vest","drop-arm sweater","unfinished hem cardigan","open-structure knit","woven-mix pullover","canvas-trim sweater","tone-on-tone ribbed knit","minimal zip knit"],
        top: ["tunic shirt","asymmetric knit","stiff mock neck","pleated top","oversized shirt","poplin tunic","boxy blouse","high-neck shell","sleeveless top","drape top","cowl neck","architectural shirt","crisp tee","structured tank","funnel neck top","raw edge top","panelled shirt","stiff cotton top","wrap blouse","longline vest","geometric top","cut-out top","layered shirt","mesh top","neoprene blouse","ribbed sweater","cold shoulder top","minimalist tunic","bias cut top","sheer shirt"],
        bottom: ["culottes","wide cropped trousers","pleated skirt","barrel pants","hakama","balloon skirt","wide slacks","tapered ankle pants","asymmetric skirt","structured shorts","geometric skirt","wrap pants","cigarette pants","voluminous skirt","tailored shorts","raw hem pants","drop crotch pants","pleated trousers","structured joggers","midi skirt","panelled skirt","wide leg jeans","sarouel pants","stiff cotton skirt","straight leg pants","wool trousers","origami skirt","architectural pants","cuffed pants","split hem pants"],
        shoes: ["tabi boots","architectural mules","derby","square flats","platform sandals","sock boots","minimal sneakers","oxfords","wedges","geometric heels","split-toe shoes","block heels","glove shoes","loafer mules","platform boots","sculptural heels","d'orsay flats","monk straps","chelsea boots","leather slides","structured sandals","ballet flats","wedge boots","kitten heels","cutout boots","slingbacks","ankle strap shoes","matte boots","rubber boots","slip-ons"],
        bag: ["pleated tote","geometric bag","oversized clutch","wristlet","architectural bag","box bag","portfolio","minimal shopper","circle bag","origami bag","triangle bag","frame bag","cylinder bag","structured tote","hard case","clutch","clear bag","matte leather bag","bucket bag","envelope bag","handle bag","sling bag","sculptural bag","phone pouch","vertical tote","neck bag","belt bag","folder bag","acrylic bag","mesh bag"],
        accessory: ["sculptural bangle","bold eyewear","single earring","cuff","geometric necklace","brooch","matte ring","glasses chain","wide headband","minimal belt","silver choker","ear cuff","knuckle ring","statement earrings","hair stick","collar","arm band","abstract pin","leather choker","acrylic ring","metal belt","watch","hair clip","nose ring prop","anklet","silver bar","neck wire","pendant","brooch set","chain link"],
      },
    },
    B: {
      name: "Wabi-Sabi Craft",
      mood: "handmade, textural, imperfect beauty, craft-forward, organic",
      materials: ["linen","hemp","raw silk","wool","cotton","gauze","paper yarn","hand-dyed cotton","unbleached fabric","leather","boucle","mohair"],
      items: {
        outer: ["boucle coat","hairy cardigan","crushed velvet jacket","faux fur vest","shaggy jacket","patent coat","shearling jacket","quilted velvet coat","feather trim jacket","teddy coat","mohair cardigan","fringe jacket","jacquard coat","embossed leather jacket","silk bomber","organza coat","tweed blazer","pony hair jacket","metallic jacket","crinkled coat","laser cut jacket","wool boucle coat","knit coat","vinyl trench","suede jacket","embroidered coat","mesh jacket","crochet cardigan","distressed jacket","tufted coat"],
        mid: ["mohair oversized pullover","boucle knit sweater","crochet vest layering","angora blend crewneck","hand-dyed wool cardigan","raw-hem knit pullover","distressed ribbed sweater","open-weave mohair vest","unbleached cotton knit","textured boucle cardigan","fringe-hem sweater","pilled-effect knit","jacquard knit pullover","lurex-blend crewneck","paper-yarn knit vest","ladder-stitch sweater","intentionally-shrunken knit","hemp-cotton blend cardigan","wabi-sabi patchwork knit","gauze-layer knit","embellished knit vest","handmade-look crewneck","uneven-dye sweater","linen-mix waffle knit","artisanal texture cardigan","knotted yarn pullover","raw silk-knit blend","loop stitch pullover","multi-yarn knit sweater","imperfect-finish cardigan"],
        top: ["sheer mesh top","mohair knit","ribbed tank","crushed satin top","fringe top","organza blouse","velvet top","lace bodysuit","angora sweater","metallic knit","sequin top","feather top","boucle knit","silk cami","pleated top","burnout tee","distressed knit","waffle top","crochet top","tulle blouse","pearl embellished top","embroidered shirt","ruched top","smocked top","leather top","lurex sweater","ladder knit","fishnet top","ribbon top","raw-edge tee"],
        bottom: ["satin pants","leather skirt","wool slacks","pleated velvet skirt","metallic pants","sequin skirt","corduroy pants","silk trousers","faux fur skirt","patent pants","lace skirt","fringe skirt","jacquard pants","organza skirt","vinyl skirt","embossed pants","suede skirt","crushed velvet pants","tulle skirt","brocade pants","mesh skirt","feather skirt","knit pants","crochet skirt","distressed denim","satin cargo pants","wide leg velvet","laser cut skirt","pleated pants","ruched skirt"],
        shoes: ["velvet slippers","pony-hair boots","patent loafers","metallic boots","satin mules","fur slides","mesh boots","embellished flats","textured pumps","glitter boots","shearling boots","crocodile embossed boots","snake print shoes","feather sandals","clear heels","lucite boots","suede pumps","embroidered boots","pearl heels","sequin shoes","brocade boots","lace-up heels","velvet boots","satin sneakers","metallic slides","fur loafers","woven shoes","textured leather boots","glitter sneakers","patent mules"],
        bag: ["fur bag","wrinkled leather pouch","metallic bag","beaded bag","velvet clutch","chain mail bag","feather bag","patent tote","woven satin bag","shearling tote","embossed bag","crocodile bag","pearl bag","sequin bag","crystal bag","mesh tote","tulle bag","suede bag","fuzzy bag","lucite clutch","mirror bag","embroidered bag","fringe bag","rope bag","metallic clutch","snakeskin bag","quilted bag","padded bag","ruched bag","textured leather bag"],
        accessory: ["pearl necklace","velvet choker","crystal earrings","textured ring","hair bow","fur stole","lace gloves","metallic belt","layered chains","brooch","feather earring","rhinestone choker","hair pearl","velvet headband","mesh gloves","statement ring","ear climber","crystal headband","sequin scarf","metallic cuff","chain belt","anklet","body chain","hair slide","cameo","tassel earrings","beaded necklace","velvet ribbon","satin scarf","layered necklace"],
      },
    },
    C: {
      name: "Avant-Garde Edge",
      mood: "experimental, deconstructed, conceptual, fashion-forward, directional",
      materials: ["leather","neoprene","mesh","vinyl","silk","wool","rubber","metal hardware","denim","jersey"],
      items: {
        outer: ["cape","draped cardigan","asymmetric jacket","shawl coat","blanket coat","wrap jacket","fluid trench","bolero","scarf-coat","waterfall cardigan","poncho","kimono","oversized shirt-jacket","slouchy blazer","knit coat","ruched jacket","tie-waist coat","sheer jacket","layered coat","parachute coat","soft parka","cocoon jacket","duster","gathered coat","balloon sleeve jacket","twist front jacket","mesh cardigan","hooded cape","distressed coat","fluid blazer"],
        mid: ["deconstructed knit pullover","asymmetric hem sweater","draped knit vest","open-back sweater","sheer-panel knit","bias-cut knit top","ruched ribbed sweater","twisted-seam pullover","fluid jersey sweater","vinyl-trim knit","neoprene sweat layer","gathered knit vest","wrap-effect sweater","oversized raw-edge jumper","experimental cut-out knit","balloon-sleeve knit","parachute knit vest","inside-out finish sweater","cocoon silhouette knit","mesh-inset pullover","soft corset knit","elongated waistband sweater","slashed detail knit","layered knit panel vest","sculptural shoulder sweater","deconstructed zip knit","pleated knit layer","unstructured cardigan","gender-fluid oversized knit","avant-garde turtleneck"],
        top: ["cowl neck top","uneven hem shirt","layered tunic","ruched top","draped jersey","bias blouse","wrap top","asymmetric tank","oversized knit","sheer overlay","twist top","waterfall top","batwing sleeve top","gathered blouse","cold shoulder top","slouchy tee","knot front top","layered tank","fluid shirt","off-shoulder knit","mesh tunic","halter top","balloon sleeve top","corset tee","distressed top","longline shirt","strappy top","open back top","soft corset","jersey tunic"],
        bottom: ["balloon pants","sarouel pants","wrapped skirt","dhoti pants","asymmetric skirt","harem pants","jersey pants","gathered skirt","layered trousers","fluid maxi","wide leg drapes","parachute skirt","tulip skirt","ruched skirt","drop crotch trousers","bias cut skirt","split leg pants","tie-waist pants","oversized trousers","knitted skirt","sheer skirt over pants","joggers","bubble skirt","layered skirt","culottes","soft cargo","wrap trousers","pleated maxi","harem shorts","jersey skirt"],
        shoes: ["leather sandals","soft boots","sock boots","flat mules","gladiator sandals","soft flats","tabi ballet","slouchy boots","slipper shoes","wedges","wrap sandals","ballet wraps","foot glove","knit shoes","minimalist sandals","toe loop sandals","leather socks","soft loafers","canvas boots","bandage shoes","platform flip-flops","split sole shoes","ruched boots","sheer boots","leather slippers","monk strap flats","soft pumps","ankle tie shoes","woven sandals","minimal clogs"],
        bag: ["slouchy sack","knot bag","drawstring pouch","soft tote","hobo bag","oversized shoulder bag","ruched clutch","net bag","wrist bag","fabric tote","leather shopper","soft backpack","bucket bag","folded bag","dumpling bag","scarf bag","mesh shopper","canvas sack","nylon tote","crossbody pouch","soft leather clutch","wristlet","macrame bag","woven leather bag","pleat bag","round bag","tie-handle bag","oversized clutch","soft briefcase","jersey bag"],
        accessory: ["long necklace","layered bangles","scarf","rings","head wrap","pendant","irregular earrings","soft belt","arm cuff","anklet","leather cord","silver jewelry","wooden bangle","hair tie","fabric belt","brooch","body chain","toe ring","fabric choker","knot bracelet","minimalist watch","raw stone necklace","leather cuff","glasses","ear cuff","septum ring prop","hand chain","arm band","turban","snood"],
      },
    },
  },
  retro_luxe: {
    A: {
      name: "Opulent Folklore",
      mood: "boho, folk-inspired, free-spirited, earthy, tapestry, prairie-meets-rock",
      materials: ["suede","velvet","crochet","silk","denim","cotton","macrame","lace","embroidery","fringe","tapestry","brocade"],
      items: {
        outer: ["shearling coat","velvet blazer","cape","embroidered vest","afghan coat","tapestry jacket","fur-trim coat","quilted jacket","folk cardigan","suede coat","brocade coat","embroidered jacket","peasant coat","shawl","velvet cape","corset jacket","printed kimono","fringed jacket","bolero","patchwork coat","fur stole","wool coat","military jacket","paisley coat","knit coat","tapestry vest","lace jacket","faux fur coat","embellished blazer","satin jacket"],
        mid: ["crochet knit pullover","embroidered cardigan","fringe-trim sweater","boho cable-knit vest","velvet-trim knit","tapestry-weave sweater","folk-pattern crewneck","heavy crochet vest","peasant-style knit","suede-patch cardigan","macrame-trim sweater","lace-panel knit","patchwork knit pullover","brocade-inset cardigan","prairie-stripe knit","open-weave boho vest","embellished festival knit","paisley knit pullover","1970s-style crewneck","chenille knit sweater","floral intarsia knit","folk-embroidered cardigan","velvet-ribbon knit","tasselled hem sweater","fringed knit vest","vintage crochet cardigan","earthy-tone ribbed knit","block-dye knit pullover","southwestern pattern knit","jacquard folk sweater"],
        top: ["embroidered blouse","lace top","crochet vest","peasant blouse","smocked top","floral shirt","corset top","ruffled blouse","balloon sleeve top","velvet bodice","high neck blouse","broderie top","folk shirt","tunic","puff sleeve top","sheer blouse","victorian shirt","lace cami","printed top","embroidered corset","bib shirt","tie-front blouse","gathered top","knit bodice","floral corset","lace bodysuit","square neck top","fringed top","bell sleeve top","gypsy top"],
        bottom: ["wool maxi skirt","velvet trousers","corduroy pants","embroidered jeans","tiered skirt","paisley skirt","floral maxi skirt","velvet pants","tapestry skirt","dark denim","ruffle skirt","brocade pants","lace skirt","peasant skirt","wide leg pants","patchwork skirt","embroidered skirt","bloomers","suede skirt","printed trousers","folk skirt","jacquard pants","gathered skirt","wool shorts","velvet skirt","layered skirt","fringe skirt","high-waisted trousers","floral pants","culottes"],
        shoes: ["lace-up boots","mary janes","clogs","embroidered slippers","velvet boots","western boots","platform sandals","lace-up flats","kitten heels","brocade pumps","suede boots","granny boots","embroidered boots","velvet flats","mules","tassel boots","wooden sandals","Victorian boots","strappy heels","patterned pumps","fur trim boots","moccasins","ballet flats","t-strap shoes","oxford heels","embellished sandals","woven boots","tapestry shoes","satin heels","leather boots"],
        bag: ["tapestry bag","frame bag","beaded pouch","velvet bag","embroidered clutch","fringe bag","basket","coin purse","vintage handbag","carpet bag","drawstring pouch","brocade bag","lace bag","tassel bag","patchwork bag","round bag","saddle bag","bucket bag","wicker bag","metal mesh bag","box bag","kiss-lock purse","fabric tote","needlepoint bag","silk pouch","wooden bag","leather satchel","floral bag","fur bag","wristlet"],
        accessory: ["headscarf","pearl earrings","beads","floral headband","cameo","gold hoops","lace tights","statement belt","corset belt","ribbons","hair flowers","brooch","choker","layered necklaces","dangle earrings","velvet ribbon","hair comb","bangle stack","locket","fan","embroidered collar","lace gloves","apron","coin belt","tassel earrings","hair pins","shawl","arm cuff","ring set","anklet"],
      },
    },
    B: {
      name: "Heritage Classic",
      mood: "old-money, ivy-league, timeless, understated luxury, equestrian, cinematic",
      materials: ["tweed","wool","cashmere","leather","silk","corduroy","denim","flannel","cotton","velvet","satin","brocade"],
      items: {
        outer: ["suede jacket","shearling coat","faux fur coat","leather trench","safari jacket","denim blazer","patchwork jacket","corduroy blazer","poncho","crochet cardigan","fringe vest","western jacket","denim vest","velvet coat","cape","duster","knitted coat","bomber","leather vest","wool poncho","shacket","patterned blazer","suede vest","trench cape","fur vest","knit vest","blanket coat","shawl collar coat","retro windbreaker","mac coat"],
        mid: ["70s-inspired knit pullover","retro disco cardigan","velvet-trim crewneck","heritage tweed-knit vest","western knit pullover","corduroy-patch sweater","psychedelic pattern knit","cinematic turtleneck","safari-knit polo sweater","silky rib knit layer","suede-elbow cardigan","wide-rib retro jumper","paisley-knit pullover","luxury merino crewneck","brocade-panel sweater","old-money cashmere vest","ribbed mock neck heritage","equestrian-stripe knit","gold-button cardigan","vintage-wash crewneck","1960s mod knit","satin-trim cardigan","flannel-knit half-zip","wide-gauge cable sweater","houndstooth knit vest","camel polo-neck jumper","silk-inset knit","classic twin-set cardigan","suede-front knit vest","tapestry-inset pullover"],
        top: ["printed shirt","turtleneck","crochet vest top","halter top","ringer tee","pussy-bow blouse","ribbed knit","tie-dye top","western shirt","tunic","peasant top","disco top","satin shirt","bell sleeve top","graphic tee","wrap top","knitted polo","tank top","striped shirt","paisley top","sheer shirt","lace-up top","butterfly top","tube top","off-shoulder top","smocked top","embroidered shirt","denim shirt","lurex top","vest top"],
        bottom: ["flared jeans","corduroy skirt","bell-bottoms","suede skirt","pattern pants","patchwork jeans","button skirt","gaucho pants","maxi skirt","denim shorts","wide leg jeans","bootcut jeans","velvet pants","printed skirt","high-waisted shorts","culottes","overalls","jumpsuit","knit pants","fringe skirt","suede pants","tiered skirt","wrap skirt","wide leg trousers","disco pants","leather pants","pleated skirt","cargo pants","stirrup pants","hot pants"],
        shoes: ["platform boots","suede boots","clogs","knee boots","western boots","wedge sandals","platform sneakers","moccasins","loafers","strappy sandals","wooden heels","chunky heels","cork wedges","fringe boots","cowboy boots","desert boots","retro sneakers","mules","velvet boots","t-strap sandals","espadrilles","leather slides","mary janes","peep toe heels","block heels","gladiator sandals","suede loafers","earth shoes","oxfords","roller skate shoes"],
        bag: ["saddle bag","suede hobo","fringe bag","tooled bag","macrame bag","canvas messenger","leather tote","bucket bag","patchwork bag","soft clutch","basket","woven bag","denim bag","crochet bag","camera bag","satchel","bowling bag","duffle","wristlet","beaded bag","drawstring bag","suede pouch","flap bag","doctor bag","frame bag","straw tote","mesh bag","guitar strap bag","canvas tote","leather pouch"],
        accessory: ["tinted sunglasses","wide brim hat","silk scarf","turquoise jewelry","leather belt","layered necklaces","hoop earrings","bangles","feather earring","headband","bandana","choker","large rings","wooden jewelry","peace sign necklace","aviators","oversized glasses","hair flower","arm band","anklet","scarf belt","mood ring","beaded necklace","floppy hat","tassel necklace","leather cuff","woven belt","hair pick","brooch","medallion"],
      },
    },
    C: {
      name: "Old Money Ivy",
      mood: "old-money, equestrian, timeless, understated luxury, preppy glam",
      materials: ["tweed","cashmere","wool","silk","cotton","velvet","leather","brocade","satin","flannel"],
      items: {
        outer: ["tweed jacket","quilted jacket","camel coat","trench coat","gold button blazer","cable cardigan","barbour jacket","cape","navy blazer","cashmere coat","polo coat","waxed jacket","houndstooth blazer","wool vest","sweater vest","windbreaker","varsity jacket","harrington jacket","field jacket","pea coat","duffle coat","gilet","linen blazer","silk bomber","knitted jacket","velvet blazer","wrap coat","herringbone coat","shawl cardigan","rain coat"],
        mid: ["cashmere v-neck sweater","argyle knit pullover","cricket cable-knit jumper","old-money turtleneck","silk-blend mock neck","gold-button knit vest","houndstooth knit","equestrian ribbed sweater","tweed-trim cardigan","prep school crewneck","pearl-button knit vest","cashmere polo sweater","herringbone knit pullover","classic fair isle knit","satin-collar cardigan","fine wool rollneck","navy crewneck sweater","velvet-trim knit vest","heritage cable cardigan","brocade-panel sweater","country club half-zip","country knit vest","wool-blend turtleneck","luxury-ribbed crewneck","old-school stripe jumper","merino v-neck preppy","fine intarsia sweater","double-knit formal vest","silk-mix twin-set knit","cashmere zip cardigan"],
        top: ["cable sweater","pussy-bow blouse","polo shirt","cricket jumper","white shirt","cashmere turtleneck","striped shirt","silk blouse","argyle vest","twin-set","oxford shirt","button-down","ringer tee","ribbed tank","boat neck top","linen shirt","sleeveless knit","v-neck sweater","mock neck","collared knit","wrap top","tie-neck blouse","sleeveless blouse","rugby shirt","fitted tee","cardigan","shell top","lace blouse","silk cami","tunic"],
        bottom: ["white jeans","riding pants","wool skirt","chinos","tailored shorts","wool trousers","straight jeans","tennis skirt","cigarette pants","linen trousers","pleated skirt","bermuda shorts","wide leg pants","plaid skirt","corduroy pants","capri pants","silk skirt","culottes","midi skirt","velvet skirt","tailored slacks","tweed skirt","cuffed shorts","straight skirt","high-waisted pants","check trousers","bootcut pants","sailor pants","wrap skirt","skort"],
        shoes: ["riding boots","horsebit loafers","ballet flats","driving shoes","court heels","slingbacks","tennis sneakers","oxfords","knee boots","velvet slippers","penny loafers","pumps","kitten heels","espadrilles","mules","mary janes","brogues","deck shoes","sandals","rain boots","patent flats","wedge heels","strappy sandals","cap-toe shoes","spectators","woven flats","ankle boots","slides","block heels","d'orsay flats"],
        bag: ["structured handbag","canvas tote","bucket bag","box bag","vanity case","monogram bag","clutch","doctor bag","kelly style bag","tote","saddle bag","top handle bag","frame bag","envelope clutch","leather satchel","wicker bag","crossbody","shoulder bag","baguette","bowling bag","wristlet","travel bag","trunk bag","mini bag","chain bag","flap bag","briefcase","shopper","camera bag","coin purse"],
        accessory: ["pearl necklace","headscarf","headband","leather belt","watch","stud earrings","signet ring","gloves","sunglasses","brooch","hair clip","silk scarf","gold bangle","tennis bracelet","ribbon","hat","tote scarf","minimal ring","chain necklace","hoop earrings","leather watch","hair bow","glasses","crest pin","knee socks","tights","anklet","collar bar","compact","cardigan over shoulders"],
      },
    },
  },
  sport_modern: {
    A: {
      name: "Gorpcore",
      mood: "outdoor, technical, utilitarian, nature-meets-function, trail-ready",
      materials: ["gore-tex","ripstop","fleece","nylon","cordura","mesh","rubber","softshell","recycled polyester","merino wool"],
      items: {
        outer: ["3-layer shell jacket","tech trench","windbreaker","utility vest","anorak","rain poncho","puffer jacket","fleece jacket","tactical vest","convertible jacket","softshell jacket","parka","down jacket","rain jacket","mountain parka","gilet","coach jacket","bomber","track jacket","hooded jacket","tech blazer","nylon coat","insulated jacket","storm coat","field jacket","cargo vest","running jacket","cycling jacket","ski jacket","cape"],
        mid: ["merino wool mid-layer","grid-fleece pullover","softshell zip-neck","insulated sweater vest","thermal half-zip fleece","trail-weight crewneck","recycled fleece hoodie","technical knit pullover","mountain-fleece cardigan","performance mock neck knit","ripstop-trim sweater","sun-protection knit layer","active turtleneck fleece","packable knit vest","moisture-wick crewneck","lightweight down sweater","alpine-knit pullover","merino zip-neck layer","utility-knit vest","polartec zip sweater","wind-resistant knit","outdoor zip-cardigan","base-layer wool knit","trail-knit hooded vest","cordura-trim knit pullover","grid-back fleece vest","seamless mid-layer knit","thermal crewneck fleece","trekking half-zip knit","stretch-knit insulator"],
        top: ["merino base layer","tech-fleece top","performance tee","tactical vest top","mesh layer","compression top","mock neck","zip polo","hooded sleeve","graphic tee","thermal top","running shirt","seamless top","tank top","rash guard","jersey","hiking shirt","grid fleece","sun hoodie","vented shirt","ripstop shirt","nylon top","half-zip","crewneck","muscle tee","baselayer","dry-fit tee","logo top","crop top","bodysuit"],
        bottom: ["cargo pants","waterproof trousers","convertible pants","parachute pants","hiking shorts","joggers","nylon pants","climbing pants","wind pants","leggings","tech shorts","trek pants","rain pants","softshell pants","utility pants","baggy shorts","ripstop pants","articulated pants","fleece pants","ski pants","tights","biker shorts","split hem pants","drawstring pants","cargo shorts","board shorts","running tights","insulated pants","hybrid shorts","cropped pants"],
        shoes: ["gore-tex sneakers","trail runners","trekking sandals","trekking boots","chunky sneakers","vibram shoes","waterproof boots","slip-ons","approach shoes","hiking boots","running shoes","recovery slides","water shoes","tech boots","sock shoes","mountain boots","gaiter shoes","trail sandals","winter boots","rubber boots","hybrid shoes","aqua shoes","speedcross shoes","minimalist runners","heavy tread boots","high-top trail sneakers","mules","clogs","waterproof moccasins","platform trail shoes"],
        bag: ["sacoche","hiking backpack","chest rig","waist bag","dry bag","sling","hydration pack","utility pouch","carabiner bag","duffle","roll-top bag","messenger","hip pack","camera bag","phone holder","tote","gym bag","harness bag","crossbody","running vest","map case","tool bag","waterproof bag","frame bag","saddle bag","modular bag","belt bag","bottle bag","laptop bag","stuff sack"],
        accessory: ["bucket hat","sunglasses","carabiner","bracelet","gaiter","gloves","beanie","watch","utility belt","armbands","cap","headband","socks","lanyard","bandana","compass","whistle","key clip","paracord bracelet","face mask","visor","ear muffs","neck warmer","gps watch","sweatband","laces","patch","flashlight prop","multi-tool prop","cooling towel"],
      },
    },
    B: {
      name: "Athleisure Luxe",
      mood: "clean sport, studio-to-street, soft athletic, wellness aesthetic",
      materials: ["jersey","cotton","nylon","spandex","mesh","modal","tencel","bamboo","soft fleece","seamless fabric"],
      items: {
        outer: ["cropped puffer","track jacket","hoodie","bolero","zip fleece","bomber","windbreaker","wrap cardigan","glossy vest","yoga jacket","running jacket","shrug","sweatshirt","rain jacket","longline hoodie","teddy jacket","quilted vest","cape","poncho","oversized sweat","softshell","mesh jacket","kimono","jersey blazer","anorak","down vest","training jacket","fleece pullover","varsity jacket","shearling slide jacket"],
        mid: ["seamless ribbed pullover","modal zip-neck sweater","bamboo-cotton crewneck","luxury fleece hoodie","soft-knit studio sweater","stretch-knit vest","tencel blend cardigan","yoga-weight turtleneck","pilates mock-neck knit","athleisure half-zip knit","soft performance crewneck","cropped sport cardigan","gym-to-street sweater vest","smooth rib knit pullover","long-line lounge sweater","wide-rib relaxed knit","fine-knit zip-up vest","wrap-front knit layer","cut-out detail sweater","open-knit sport vest","cozy zip fleece mid","sculpted knit pullover","glossy-finish sweater","ballet-inspired knit wrap","stretch turtleneck layer","wellness-toned crewneck","mesh-panel knit vest","tone-on-tone zip knit","buttery soft mock neck","recovery-wear knit layer"],
        top: ["sports bra","compression tee","bodysuit","tank","off-shoulder sweat","seamless top","hoodie","racerback top","wrap top","mesh top","crop top","yoga top","long sleeve tee","muscle tank","ribbed top","camisole","half-zip","sweatshirt","graphic tee","bralette","corset top","thermal","halter top","cut-out top","asymmetrical top","tube top","tunic","twisted top","performance tee","layered top"],
        bottom: ["high-waist leggings","joggers","biker shorts","split-hem leggings","sweat skirt","yoga pants","track pants","running shorts","unitard","stirrup leggings","flare leggings","sweatshorts","dance pants","harem pants","wide leg sweats","cargo joggers","skirt over leggings","compression shorts","tennis skirt","cycling shorts","nylon pants","mesh shorts","ribbed pants","bootcut leggings","capri pants","knitted pants","drawstring shorts","palazzo pants","utility leggings","soft pants"],
        shoes: ["running shoes","slides","sock sneakers","platform sneakers","training shoes","sandals","high-tops","casual runners","white sneakers","yoga shoes","dance shoes","slip-ons","mules","flip-flops","ballet sneakers","canvas shoes","wedge sneakers","knit shoes","fashion trainers","chunky sole sneakers","retro runners","futuristic shoes","recovery shoes","mesh sneakers","velcro shoes","split sole shoes","minimal sneakers","gym shoes","studio wraps","barefoot shoes"],
        bag: ["gym bag","backpack","tote","belt bag","phone holder","bottle bag","crossbody","shopper","duffle","mini backpack","yoga bag","mat bag","sackpack","wristlet","waist pack","barrel bag","mesh tote","sling bag","bucket bag","cosmetic bag","shoe bag","drawstring bag","clutch","lanyard bag","tech pouch","oversized tote","structured gym bag","wet bag","laundry bag","card holder"],
        accessory: ["cap","headphones","scrunchie","socks","sunglasses","sweatband","watch","jewelry","hair clip","headband","visor","water bottle prop","hair tie","phone case","gloves","mat strap prop","leg warmers","arm band","hat","hair band","fitness tracker","necklace","earrings","rings","bracelet","ankle weights prop","gym pass","towel","ear pods","yoga strap prop"],
      },
    },
    C: {
      name: "Blokecore Jersey",
      mood: "sport fan culture, terrace fashion, jersey-forward, casual athletic",
      materials: ["nylon","jersey","polyester","denim","fleece","cotton","mesh","ripstop","canvas","rubber"],
      items: {
        outer: ["track jacket","coach jacket","stadium parka","varsity bomber","windbreaker","training jacket","bench coat","warm-up top","anorak","denim jacket","drill top","rain jacket","puffer jacket","fleece jacket","gilet","nylon vest","souvenir jacket","retro jacket","shell suit top","half-zip","hoodie","sweatshirt","poncho","bomber","terrace jacket","harrington jacket","cagoule","manager coat","sideline jacket","anthem jacket"],
        mid: ["terrace crewneck sweatshirt","retro stripe knit pullover","football-club crewneck","vintage-wash fleece hoodie","stadium half-zip fleece","polo-knit sport sweater","retro-print crewneck knit","heavy cotton sweatshirt","jersey-knit zip-up","fan culture crewneck","ribbed sport mock neck","oversized blokecore knit","drill-top knit hybrid","mesh-panel sweatshirt","team-color knit vest","retro training sweater","cotton-fleece pullover","match day crewneck","away-kit knit layer","old-school half-zip knit","vintage sport cardigan","casual-fan ribbed jumper","terrace-style hoodie knit","plain-front sport crewneck","80s-inspired knit pullover","college-stripe sweatshirt","nylon-trim knit vest","softshell knit zip","club-badge crewneck","washed fleece crewneck"],
        top: ["soccer jersey","ringer tee","polo","goalkeeper jersey","graphic tee","rugby shirt","sweatshirt","training top","half-zip top","tank","long sleeve jersey","oversized tee","striped shirt","basketball jersey","hockey jersey","baseball shirt","referee shirt","retro tee","slogan tee","knitted polo","mesh top","warm-up shirt","muscle tee","crewneck","v-neck jersey","collared shirt","zip neck top","drill top","sleeveless jersey","vintage kit top"],
        bottom: ["track pants","jorts","nylon shorts","jeans","warm-up pants","cargo shorts","soccer shorts","straight denim","sweatpants","windbreaker pants","basketball shorts","running shorts","cargo pants","chinos","bermuda shorts","swim shorts","cycling shorts","tear-away pants","fleece shorts","wide leg jeans","corduroy shorts","training pants","joggers","retro shorts","technical shorts","baggy jeans","dungarees","tapered pants","shell pants","goalie pants"],
        shoes: ["terrace sneakers","retro runners","slides","canvas sneakers","chunky trainers","high-tops","gum sole shoes","leather trainers","casual boots","skate shoes","classic sneakers","low-tops","dad shoes","football trainers","velcro shoes","slip-ons","suede sneakers","court shoes","ugly sneakers","futsal shoes","hiking hybrid shoes","basketball shoes","vulcanized shoes","deck shoes","driving shoes","plimsolls","clogs","mules","limited edition kicks","indoor soccer shoes"],
        bag: ["crossbody","duffle","drawstring bag","shoebox bag","messenger","waist bag","tote","nylon bag","sacoche","gym sack","backpack","sling bag","boot bag","kit bag","barrel bag","shoulder bag","holdall","mini bag","phone bag","bum bag","record bag","flight bag","retro bag","vinyl bag","canvas tote","reporter bag","camera bag","utility bag","pouch","wash bag"],
        accessory: ["scarf","beanie","bucket hat","sunglasses","socks","chain","rings","wristband","cap","whistle","sweatband","gloves","badge","pin","lanyard","bandana","hair band","watch","necklace","bracelet","earring","phone case","key ring","bottle opener","patches","lighter","sticker prop","ticket prop","flag prop","programme prop"],
      },
    },
  },
  creative_layered: {
    A: {
      name: "Rock Rebellion",
      mood: "90s grunge, layered, raw, distressed, band-inspired, punk edge",
      materials: ["denim","flannel","leather","jersey","mesh","lace","velvet","cotton","plaid fabric","studs","vinyl"],
      items: {
        outer: ["leather biker jacket","denim jacket","corset belt jacket","vinyl trench","cropped hoodie","leopard coat","studs jacket","blazer","flannel shirt jacket","faux fur coat","bomber","military jacket","vest","trench","shearling jacket","parka","cape","poncho","cardigan","kimono","windbreaker","raincoat","puffer","track jacket","shacket","varsity jacket","bolero","duster","gilet","shawl"],
        mid: ["distressed oversized crewneck","band-print sweatshirt","grunge cable-knit pullover","flannel-lined knit vest","90s-wash crewneck","fishnet-trim sweater","studded knit pullover","velvet crewneck grunge","ripped-hem knit layer","plaid-inset sweater","heavy rib grunge knit","lace-trim cardigan","shredded knit vest","vinyl-patch sweater","slogan crewneck knit","layered torn knit","dark rib turtleneck","punk-inspired cardigan","combat-knit half-zip","oversized hoodie knit","safety-pin knit vest","vintage-wash pullover","bleach-effect crewneck","mesh-panel knit layer","rock-band crewneck","faded flannel-knit","leopard-trim sweater","jersey-knit layering top","washed black crewneck","deconstructed grunge knit"],
        top: ["corset top","lace blouse","band tee","sweater","mesh bodysuit","fishnet top","slogan tee","tank","slip top","bustier","graphic tee","hoodie","crop top","shirt","blouse","camisole","turtleneck","bodysuit","tunic","thermal","halter top","tube top","off-shoulder top","bralette","sheer top","layered top","ripped tee","vintage tee","muscle tank","corset blouse"],
        bottom: ["tulle skirt","ripped jeans","cargo mini skirt","plaid skirt","leather pants","vinyl skirt","shorts","black denim","skinny jeans","parachute pants","leggings","cargo pants","mini skirt","maxi skirt","midi skirt","trousers","shorts over tights","fishnet tights","biker shorts","sweatpants","joggers","wide leg jeans","bootcut jeans","flare jeans","skirt over pants","tiered skirt","bustle skirt","kilt","velvet pants","lace pants"],
        shoes: ["combat boots","platform boots","mary janes","creepers","high-tops","studded boots","buckle shoes","moto boots","heels","sneakers","boots","sandals","flats","platforms","wedges","clogs","mules","slides","oxfords","brogues","derby shoes","monk straps","chelsea boots","winklepickers","knee boots","thigh boots","ankle boots","rain boots","skate shoes","lug-sole boots"],
        bag: ["backpack","chain bag","heart bag","studded bag","guitar strap bag","pouch","tote","velvet bag","box clutch","safety pin bag","crossbody","messenger","satchel","duffle","bucket bag","shoulder bag","fanny pack","sling bag","clutch","wristlet","coffin bag","bat bag","skull bag","mini bag","phone bag","coin purse","waist bag","camera bag","barrel bag","sack"],
        accessory: ["choker necklace","layered necklaces","safety pins","tights","gloves","lock necklace","rings","nose ring","cuff","sunglasses","belt","chain","wristband","earrings","studs","spikes","bandana","scarf","hat","beanie","socks","arm warmer","leg warmer","harness","garter","collar","patch","pin","clip","piercing prop"],
      },
    },
    B: {
      name: "Pattern Clash",
      mood: "maximalist mix, clashing prints, eclectic color, fearless layering",
      materials: ["velvet","silk","crochet","denim","corduroy","leather","brocade","tapestry","lace","embroidery","fleece","cotton"],
      items: {
        outer: ["fleece jacket","windbreaker","patchwork jacket","cardigan","denim jacket","kimono","tapestry coat","blazer","striped jacket","bomber","trench","parka","raincoat","vest","poncho","cape","shawl","coat","hoodie","sweatshirt","shacket","gilet","bolero","duster","anorak","puffer","varsity jacket","track jacket","shirt jacket","knitted coat"],
        mid: ["mixed-print knit pullover","color-block crewneck sweater","patchwork knit cardigan","maximalist pattern knit","clashing-stripe sweater","brocade-inset knit vest","tapestry-knit pullover","animal-print crewneck","oversized tie-dye knit","floral intarsia sweater","crochet patchwork vest","argyle multicolor jumper","polka-dot knit layer","embroidered crewneck knit","velvet-panel cardigan","zigzag-pattern pullover","checkerboard knit vest","printed sweatshirt layer","painterly-print crewneck","psychedelic-knit pullover","mixed-media knit cardigan","heavy-print fleece knit","lace-inset sweater","corduroy-trim knit","maximalist zip-up knit","carnival-color crewneck","clash-print knit vest","silk-inset knit layer","heavily-patterned pullover","eclectic-trim cardigan"],
        top: ["knit top","floral shirt","polka dot blouse","tie-dye top","striped shirt","argyle vest","animal print top","geometric shirt","sweater","Hawaiian shirt","graphic tee","tank","crop top","blouse","tunic","camisole","turtleneck","bodysuit","thermal","halter top","tube top","off-shoulder top","bralette","sheer top","layered top","ringer tee","vintage tee","muscle tank","patchwork shirt","embroidered top"],
        bottom: ["checkered pants","striped skirt","colored denim","patchwork jeans","floral skirt","plaid trousers","animal print skirt","chinos","print pants","shorts","jeans","trousers","skirt","leggings","sweatpants","joggers","cargo pants","culottes","overalls","jumpsuit","wide leg pants","bootcut pants","flare pants","mini skirt","midi skirt","maxi skirt","skort","bermuda shorts","bike shorts","bloomers"],
        shoes: ["sneakers","boots","socks with sandals","cowboy boots","platforms","loafers","heels","printed boots","mary janes","mules","clogs","slides","flats","wedges","oxfords","brogues","derby shoes","monk straps","chelsea boots","rain boots","skate shoes","high-tops","jellies","crocs","slippers","running shoes","hiking boots","espadrilles","moccasins","boat shoes"],
        bag: ["beaded bag","tote","patchwork bag","novelty bag","woven bag","fringe bag","shoulder bag","neon bag","sequin bag","backpack","crossbody","messenger","satchel","duffle","bucket bag","fanny pack","sling bag","clutch","wristlet","mini bag","phone bag","coin purse","waist bag","camera bag","barrel bag","sack","basket","net bag","jelly bag","plastic bag"],
        accessory: ["earrings","beads","rings","scarf","hair clips","tights","sunglasses","bandana","bracelets","necklace","watch","belt","hat","beanie","socks","arm warmer","leg warmer","hair tie","scrunchie","pin","patch","brooch","glasses","headband","turban","gloves","lanyard","charm","sticker","mixed jewelry"],
      },
    },
    C: {
      name: "Vintage Eclectic",
      mood: "thrift-store treasure, vintage collector, eclectic boho, nostalgic mix",
      materials: ["velvet","silk","crochet","denim","corduroy","leather","brocade","tapestry","lace","embroidery","suede","wool"],
      items: {
        outer: ["field jacket","fur coat","embroidered jacket","liner jacket","cardigan","blazer","shawl","capelet","trench","coat","parka","raincoat","vest","poncho","cape","hoodie","shacket","gilet","bolero","duster","anorak","puffer","varsity jacket","track jacket","shirt jacket","shearling jacket","suede jacket","velvet coat","vintage bomber","patchwork coat"],
        mid: ["vintage crochet sweater","thrift-find cable-knit","eclectic patchwork cardigan","retro velvet crewneck","preloved-style knit pullover","corduroy-trim cardigan","brocade-panel sweater","lace-overlay knit","tapestry-inset pullover","suede-elbow knit","grandma-knit vest","embroidered boho cardigan","oversized vintage crewneck","80s-revival zip-up knit","nostalgic fair-isle vest","charity-shop crewneck knit","worn-in wool pullover","mixed-vintage knit layer","folk-print cardigan","antique-wash sweater","boho-stitch pullover","eclectic knit vest","thrift-layer crewneck","cottagecore knit sweater","mismatched-trim cardigan","vintage-style mock neck","reclaimed-yarn pullover","upcycled knit vest","retro striped cardigan","archive-look crewneck"],
        top: ["lace blouse","crochet top","vest","slip dress","thermal","flannel shirt","blouse","knit top","shirt","cami","tunic","tank","crop top","turtleneck","bodysuit","halter top","tube top","off-shoulder top","bralette","sheer top","layered top","ringer tee","vintage tee","muscle tank","sweater","cardigan","corset","bodice","peasant top","smock top"],
        bottom: ["velvet skirt","corduroy pants","trousers","skirt","shorts","bloomers","suspender skirt","maxi skirt","culottes","jeans","leggings","sweatpants","joggers","cargo pants","overalls","jumpsuit","wide leg pants","bootcut pants","flare pants","mini skirt","midi skirt","skort","bermuda shorts","bike shorts","knickers","petticoat","tiered skirt","ruffle skirt","pleated skirt","embroidered pants"],
        shoes: ["mary janes","cowboy boots","loafers","t-strap shoes","oxfords","boots","lace-up shoes","clogs","heels","brogues","flats","mules","slides","wedges","sandals","sneakers","platforms","espadrilles","moccasins","boat shoes","rain boots","skate shoes","high-tops","jellies","slippers","running shoes","hiking boots","derby shoes","monk straps","chelsea boots"],
        bag: ["tapestry bag","frame bag","doctor bag","purse","pouch","basket","satchel","drawstring bag","coin purse","needlepoint bag","tote","backpack","crossbody","messenger","duffle","bucket bag","fanny pack","sling bag","clutch","wristlet","mini bag","phone bag","waist bag","camera bag","barrel bag","sack","net bag","jelly bag","plastic bag","vintage suitcase"],
        accessory: ["brooch","chain","beret","collar","necklace","watch","gloves","knee highs","ribbon","scarf","earrings","rings","bracelet","belt","hat","beanie","socks","arm warmer","leg warmer","hair tie","scrunchie","pin","patch","glasses","headband","turban","locket","fan","cameo","hat pin"],
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
};

const SEASON_MODIFIERS: Record<string, { fabric: string[]; note: string }> = {
  spring: { fabric: ["cotton","linen","light layers"], note: "lightweight, transitional, fresh" },
  summer: { fabric: ["linen","mesh","breathable cotton"], note: "breathable, minimal layers, sleeveless options" },
  fall: { fabric: ["wool","flannel","corduroy","tweed"], note: "warm tones, layering pieces, rich textures" },
  winter: { fabric: ["wool","cashmere","fleece","thermal","down"], note: "insulated, warm, cold-weather fabrics" },
};

const BODY_FIT: Record<string, { top: string; bottom: string; outer: string; avoid: string; shape_goal: string }> = {
  slim: {
    top: "oversized, relaxed, boxy, dropped-shoulder",
    bottom: "wide-leg, balloon, relaxed, straight",
    outer: "oversized, cocoon, longline",
    avoid: "skin-tight, body-con, very fitted",
    shape_goal: "add volume and visual weight — wide-leg bottoms, oversized tops, structured coats",
  },
  regular: {
    top: "regular, straight, relaxed, slightly fitted, tucked",
    bottom: "straight, slim, tapered, regular, midi",
    outer: "regular, single-breasted, relaxed",
    avoid: "extreme oversized without structure",
    shape_goal: "balanced silhouette — mix fitted tops with relaxed bottoms or vice versa",
  },
  "plus-size": {
    top: "straight, flowy, empire-waist, wrap, V-neck, A-line",
    bottom: "straight-leg, wide-leg, bootcut, high-waist, A-line skirt",
    outer: "open-front, duster, single-breasted, longline",
    avoid: "horizontal stripes, boxy shapeless cuts, super cropped tops",
    shape_goal: "elongate and define — high-waist bottoms, wrap tops, open-front outerwear",
  },
};

const GENDER_STYLE_RULES: Record<string, { silhouette_priority: string; cut_notes: string; search_terms: string[] }> = {
  women: {
    silhouette_priority: "hourglass, A-line, high-waist emphasis, column, wrap",
    cut_notes: "feminine details welcome: ruffle, pleat, dart-fitted, wrap, puff-sleeve, midi, maxi lengths",
    search_terms: ["women's", "womens", "ladies"],
  },
  men: {
    silhouette_priority: "inverted-triangle, straight, relaxed, tapered",
    cut_notes: "clean masculine cuts: chest-width, shoulder-fitted, tapered leg, structured collar",
    search_terms: ["men's", "mens"],
  },
  unisex: {
    silhouette_priority: "straight, boxy, relaxed, oversized",
    cut_notes: "gender-neutral cuts: drop-shoulder, boxy, straight-leg, minimal details",
    search_terms: ["unisex", "gender neutral", "oversized"],
  },
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
    const bodyFit = BODY_FIT[body_type?.toLowerCase()] || BODY_FIT["regular"];
    const genderRules = GENDER_STYLE_RULES[genderLabel] || GENDER_STYLE_RULES["women"];
    const seasonMod = SEASON_MODIFIERS[seasonLabel];
    const excludedCats = new Set(SEASON_EXCLUDE_CATS[seasonLabel] || []);

    const activeCats = Object.entries(ACTIVE_CATEGORIES)
      .filter(([k]) => !excludedCats.has(k))
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const bodyTypeLabel = (body_type || "regular").toLowerCase();

    const profileBlock = `GENDER: ${genderLabel}
- Silhouette priority: ${genderRules.silhouette_priority}
- Cut style: ${genderRules.cut_notes}

BODY TYPE: ${bodyTypeLabel}
- Top fit preference: ${bodyFit.top}
- Bottom fit preference: ${bodyFit.bottom}
- Outer fit preference: ${bodyFit.outer}
- Avoid: ${bodyFit.avoid}
- Styling goal: ${bodyFit.shape_goal}

SEASON: ${seasonLabel}${seasonMod ? `
- Key fabrics: ${seasonMod.fabric.join(", ")}
- Styling note: ${seasonMod.note}
- Layering strategy: ${
  seasonLabel === "winter" ? "full layers — base + mid + outer all essential; prioritize warmth-first fabrics (cashmere, wool, down, thermal)" :
  seasonLabel === "fall" ? "2–3 layers — outer or mid always present; rich textures and warm tones" :
  seasonLabel === "spring" ? "light layers — outer optional but present; breathable and transitional pieces" :
  "minimal layers — no outer/mid; prioritize breathability, exposed skin acceptable"
}` : ""}`;

    const dnaBlock = dna
      ? `VIBE: "${vibeKey.replace(/_/g, " ")}"
- Formality range: ${dna.formality}
- Color palette:
    PRIMARY (use most): ${dna.colors.primary.join(", ")}
    SECONDARY (supporting): ${dna.colors.secondary.join(", ")}
    ACCENT (1 item max): ${dna.colors.accent.join(", ")}
- Tonal strategy: ${dna.tonal}
- Era / mood references: ${dna.era.join(", ")}`
      : `VIBE: "${vibeKey.replace(/_/g, " ")}"`;

    const looksBlock = looks
      ? Object.entries(looks).map(([k, l]) => {
          const sampleItems = Object.entries(l.items)
            .filter(([cat]) => !excludedCats.has(cat))
            .map(([cat, items]) => `    ${cat}: ${items.join(", ")}`)
            .join("\n");
          return `LOOK ${k} — "${l.name}"
  Mood / aesthetic: ${l.mood}
  Key materials: ${l.materials.join(", ")}
  DISTINGUISHING STYLE: Each keyword for Look ${k} MUST reflect this specific aesthetic — NOT generic fashion. The item type, material, and feel must clearly differ from Look ${k === "A" ? "B and C" : k === "B" ? "A and C" : "A and B"}.
  Item pool per category (choose specific items from here):
${sampleItems}`;
        }).join("\n\n")
      : "";

    const ctxBlock = outfit_context
      ? `OUTFIT HARMONY CONTEXT:
- Existing colors in outfit: ${(outfit_context.existing_colors || []).join(", ") || "none"}
- Existing materials in outfit: ${(outfit_context.existing_materials || []).join(", ") || "none"}
- Target slot: ${outfit_context.target_slot || "any"}
→ Generate keywords that COMPLEMENT these existing pieces (harmonizing colors and materials).`
      : "";

    const winterMidNote = seasonLabel === "winter"
      ? `\n⚠️ WINTER CRITICAL: The "mid" category is MANDATORY for winter. Mid-layer items (sweaters, knits, turtlenecks, hoodies, cardigans, cashmere) are essential cold-weather layering pieces. You MUST generate 6 mid keywords (2 per Look). Use winter-appropriate mid items: cashmere sweater, wool turtleneck, cable-knit, ribbed knit, chunky knit pullover, thermal hoodie, etc.`
      : seasonLabel === "fall"
      ? `\n⚠️ FALL NOTE: Mid-layer items are important for fall layering. Include sweaters, knits, and cardigans with fall fabrics (wool, flannel, corduroy).`
      : "";

    const prompt = `You are a professional fashion buyer who sources ${genderLabel}'s clothing on Amazon. Your task is to generate precise Amazon search keywords that real shoppers would type.

═══════════════════════════════════════
SHOPPER PROFILE
═══════════════════════════════════════
${profileBlock}${winterMidNote}

═══════════════════════════════════════
STYLE VIBE DNA
═══════════════════════════════════════
${dnaBlock}

═══════════════════════════════════════
LOOK VARIANTS — THREE DISTINCT AESTHETICS (treat each Look as a completely different customer)
═══════════════════════════════════════
${looksBlock}
${ctxBlock ? `\n═══════════════════════════════════════\n${ctxBlock}\n═══════════════════════════════════════` : ""}

═══════════════════════════════════════
KEYWORD GENERATION RULES
═══════════════════════════════════════
For EACH category below, generate exactly 6 keywords: 2 per Look (A×2, B×2, C×2).

Every keyword MUST satisfy ALL of the following:
1. GENDER prefix: Start with "${genderLabel}'s" (always possessive form)
2. LENGTH: 3–6 words total (including the gender prefix)
3. ITEM SPECIFICITY: Reference a specific item type from that Look's item pool — each of the 2 keywords within the same Look must reference a DIFFERENT item type
4. COLOR or MATERIAL: Include at least one color from the vibe palette OR one material from that Look's key materials
5. FIT / SILHOUETTE: Embed a fit word that matches the body type preference for this category (e.g., "${bodyFit.top}" for tops, "${bodyFit.bottom}" for bottoms, "${bodyFit.outer}" for outerwear)
6. SEASON-CRITICAL: Season is "${seasonLabel}". Every keyword MUST use season-appropriate fabrics and item types.${seasonMod ? `
   - Required fabrics for ${seasonLabel}: ${seasonMod.fabric.join(", ")}
   - Styling note: ${seasonMod.note}
   - DO NOT generate summer items for winter, or winter items for summer` : ""}
7. LOOK DIFFERENTIATION: The 3 Looks must produce visually distinct keywords — different item types, different materials, different aesthetics. A buyer should immediately see A/B/C as three different style directions.
8. AMAZON-REALISTIC: Must read like a genuine Amazon search query — no poetic language, no brand names unless generic
9. VARIATION MANDATE: Each generation must feel fresh. Rotate through the full item pool — do NOT default to the first 1–2 items listed. Spread color choices across the entire palette (primary + secondary + accent) rather than repeating the same 1–2 colors. Every call should produce a noticeably different color-item combination.

ANTI-PATTERNS (never do these):
- Do NOT repeat the same item type across different Looks for the same category
- Do NOT use season-inappropriate items (e.g., no "linen" or "tank" for winter; no "cashmere coat" for summer)
- Do NOT use vague terms like "nice top" or "cool jacket"
- Do NOT ignore the body type fit guidance
- Do NOT use colors outside the vibe palette

CATEGORIES TO FILL:
${activeCats}

═══════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════
Return ONLY valid JSON — no markdown fences, no comments, no explanation.
Each category value is an array of EXACTLY 6 objects (2 per Look: A×2, B×2, C×2).
ORDER MUST BE: A, A, B, B, C, C (first two objects are Look A, next two are Look B, last two are Look C).

{
  "outer": [
    { "kw": "${genderLabel}'s [Look A item1 + color/material + fit + ${seasonLabel} fabric]", "look": "A", "color": "navy", "material": "wool", "fit": "oversized" },
    { "kw": "${genderLabel}'s [Look A item2 — DIFFERENT item type than above]", "look": "A", "color": "black", "material": "cashmere", "fit": "relaxed" },
    { "kw": "${genderLabel}'s [Look B item1 — DIFFERENT aesthetic than Look A]", "look": "B", "color": "...", "material": "...", "fit": "..." },
    { "kw": "${genderLabel}'s [Look B item2 — DIFFERENT item type than Look B item1]", "look": "B", "color": "...", "material": "...", "fit": "..." },
    { "kw": "${genderLabel}'s [Look C item1 — DIFFERENT aesthetic than Look A and B]", "look": "C", "color": "...", "material": "...", "fit": "..." },
    { "kw": "${genderLabel}'s [Look C item2 — DIFFERENT item type than Look C item1]", "look": "C", "color": "...", "material": "...", "fit": "..." }
  ],
  "top": [...],
  ...
}
Include EVERY category listed above. Each array must contain EXACTLY 6 objects with fields: kw, look, color, material, fit.`;

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
            generationConfig: { temperature: 1.05, maxOutputTokens: 4096, responseMimeType: "application/json" },
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

    type KwItem = { kw: string; look: string; color?: string; material?: string; fit?: string };
    type ParsedCat = KwItem[] | string[];

    let parsed: Record<string, ParsedCat>;
    try {
      parsed = JSON.parse(jsonMatch[0]) as Record<string, ParsedCat>;
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Failed to parse Gemini JSON", detail: (e as Error).message, raw: rawText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const categories: Record<string, string[]> = {};
    const lookCategories: Record<string, Record<string, string[]>> = { A: {}, B: {}, C: {} };
    const allKeywords: string[] = [];
    const keywordMeta: Record<string, { look: string; category: string; subCategory: string; colorHint: string | null; materialHint: string | null; fitHint: string | null }> = {};

    for (const [cat, items] of Object.entries(parsed)) {
      if (!Array.isArray(items)) continue;
      const kwStrings: string[] = [];

      for (const item of items) {
        let kw: string;
        let look = "A";
        let color: string | null = null;
        let material: string | null = null;
        let fit: string | null = null;

        if (typeof item === "string") {
          kw = item;
          const idx = kwStrings.length;
          look = idx < 2 ? "A" : idx < 4 ? "B" : "C";
        } else if (item && typeof item === "object") {
          kw = item.kw || "";
          look = (item.look || "A").toUpperCase();
          color = item.color || null;
          material = item.material || null;
          fit = item.fit || null;
        } else {
          continue;
        }

        if (!kw) continue;

        kwStrings.push(kw);
        allKeywords.push(kw);

        if (!lookCategories[look]) lookCategories[look] = {};
        if (!lookCategories[look][cat]) lookCategories[look][cat] = [];
        lookCategories[look][cat].push(kw);

        keywordMeta[kw] = {
          look,
          category: cat,
          subCategory: cat,
          colorHint: color,
          materialHint: material,
          fitHint: fit,
        };
      }
      categories[cat] = kwStrings;
    }

    const lookNames: Record<string, string> = looks
      ? Object.fromEntries(Object.entries(looks).map(([k, l]) => [k, l.name]))
      : {};
    const lookMoods: Record<string, string> = looks
      ? Object.fromEntries(Object.entries(looks).map(([k, l]) => [k, l.mood]))
      : {};
    const lookMaterials: Record<string, string[]> = looks
      ? Object.fromEntries(Object.entries(looks).map(([k, l]) => [k, l.materials]))
      : {};

    return new Response(
      JSON.stringify({
        keywords: allKeywords,
        categories,
        lookCategories,
        keywordMeta,
        source: "gemini",
        vibeKey,
        lookNames,
        lookMoods,
        lookMaterials,
        colorHints: dna ? {
          primary: dna.colors.primary,
          secondary: dna.colors.secondary,
          accent: dna.colors.accent,
          tonalStrategy: [dna.tonal],
        } : null,
        materialHints: looks ? {
          preferenceGroups: Object.values(looks).flatMap(l => l.materials.slice(0, 2)),
          resolvedMaterials: Object.values(looks).flatMap(l => l.materials),
          lookMaterials,
          seasonFabrics: seasonMod?.fabric || [],
        } : null,
        fitHints: {
          silhouettePreference: genderRules.silhouette_priority.split(",").map((s: string) => s.trim()).slice(0, 4),
          formalityRange: dna ? (() => {
            const m = dna.formality.match(/(\d+)[^\d]+(\d+)/);
            return m ? [parseInt(m[1]), parseInt(m[2])] as [number, number] : [3, 7] as [number, number];
          })() : [3, 7] as [number, number],
          proportionStyle: bodyFit.shape_goal,
          bodyTypeFit: { top: bodyFit.top, bottom: bodyFit.bottom, outer: bodyFit.outer },
          eraMoodTags: dna ? dna.era : [],
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
