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
    A: { name: "Downtown Tailoring", materials: ["wool", "gabardine", "cotton", "cashmere", "silk", "satin"],
      items: { outer: ["oversized wool coat", "structured trench", "leather blazer", "tailored jacket"], top: ["high-neck knit", "poplin shirt", "silk button-down", "cashmere turtleneck"], bottom: ["wide-leg wool trousers", "cigarette pants", "pleated trousers", "leather pants"], shoes: ["square-toe ankle boots", "chunky loafers", "pointed-toe flats", "chelsea boots"], bag: ["geometric tote", "box bag", "structured clutch", "briefcase"], accessory: ["silver chain necklace", "metal-frame sunglasses", "leather gloves", "minimalist watch"] } },
    B: { name: "Neo-Prep Edge", materials: ["tweed", "corduroy", "denim", "cable-knit", "velvet", "wool"],
      items: { outer: ["tweed blazer", "wool peacoat", "denim jacket", "waxed cotton jacket"], top: ["oxford shirt", "cable-knit sweater", "argyle sweater", "polo shirt"], bottom: ["straight-leg jeans", "chinos", "corduroy pants", "tartan trousers"], shoes: ["derby shoes", "brogue loafers", "leather sneakers", "penny loafers"], bag: ["satchel", "canvas tote", "messenger bag", "briefcase"], accessory: ["glasses chain", "skinny tie", "leather belt", "tortoiseshell sunglasses"] } },
    C: { name: "High-End Street", materials: ["nylon", "leather", "tech-fleece", "mesh", "neoprene", "denim"],
      items: { outer: ["technical bomber", "nylon windbreaker", "biker jacket", "puffer jacket"], top: ["graphic tee", "oversized long sleeve", "logo sweatshirt", "crew-neck sweat"], bottom: ["cargo pants", "parachute pants", "track pants", "baggy jeans"], shoes: ["chunky sneakers", "high-top sneakers", "dad sneakers", "combat boots"], bag: ["chest rig", "belt bag", "tech backpack", "sling bag"], accessory: ["bucket hat", "baseball cap", "wallet chain", "shield sunglasses"] } },
  },
  effortless_natural: {
    A: { name: "Japandi Flow", materials: ["linen", "cotton", "raw silk", "gauze", "hemp", "wool"],
      items: { outer: ["collarless linen coat", "robe coat", "noragi", "kimono cardigan"], top: ["linen tunic", "gauze blouse", "organic cotton tee", "drop-shoulder tee"], bottom: ["wide linen trousers", "drawstring linen pants", "culottes", "balloon pants"], shoes: ["leather slides", "tabi flats", "wooden clogs", "woven flats"], bag: ["natural canvas tote", "woven basket bag", "linen tote", "knot bag"], accessory: ["wooden bead bracelet", "linen headband", "straw hat", "stone pendant"] } },
    B: { name: "French Casual", materials: ["cotton", "silk", "wool", "cashmere", "linen", "denim"],
      items: { outer: ["wool blazer", "trench coat", "chore coat", "boucle jacket"], top: ["breton stripe tee", "cashmere crew-neck", "silk blouse", "linen shirt"], bottom: ["straight-leg jeans", "wide-leg trousers", "midi skirt", "high-waist denim"], shoes: ["ballet flats", "loafers", "espadrilles", "suede ankle boots"], bag: ["soft leather tote", "mini shoulder bag", "canvas tote", "bucket bag"], accessory: ["silk scarf", "gold hoops", "pearl studs", "woven belt"] } },
    C: { name: "Soft Amekaji", materials: ["denim", "flannel", "canvas", "waxed cotton", "wool", "corduroy"],
      items: { outer: ["field jacket", "barn jacket", "denim jacket", "flannel shirt-jacket"], top: ["flannel shirt", "waffle henley", "chambray shirt", "pocket tee"], bottom: ["vintage denim", "fatigue pants", "carpenter jeans", "corduroy trousers"], shoes: ["desert boots", "moccasins", "wallabees", "canvas sneakers"], bag: ["canvas messenger", "backpack", "waxed canvas tote", "tool bag"], accessory: ["leather belt", "bandana", "canvas cap", "watch with leather strap"] } },
  },
  artistic_minimal: {
    A: { name: "Gallery Mono", materials: ["wool", "cotton", "linen", "silk", "neoprene", "jersey"],
      items: { outer: ["collarless long coat", "cocoon coat", "longline blazer", "wrap coat"], top: ["structured tee", "ribbed tank", "mock-neck top", "silk shell"], bottom: ["wide cropped trousers", "pleated wide pants", "maxi pencil skirt", "barrel leg pants"], shoes: ["square-toe flats", "architectural mules", "derby shoes", "minimal sneakers"], bag: ["geometric tote", "origami bag", "structured clutch", "portfolio bag"], accessory: ["sculptural bangle", "bold geometric earrings", "minimalist choker", "oversized sunglasses"] } },
    B: { name: "Wabi-Sabi Craft", materials: ["linen", "hemp", "raw silk", "wool", "cotton", "gauze"],
      items: { outer: ["uneven-hem coat", "draped cardigan", "linen duster", "asymmetric jacket"], top: ["asymmetric knit", "pleated linen top", "cowl-neck top", "gauze blouse"], bottom: ["wrap skirt", "hakama pants", "dhoti pants", "linen balloon pants"], shoes: ["suede tabi", "leather clog", "woven mule", "handmade sandal"], bag: ["pleated tote", "woven leather bag", "dumpling bag", "craft tote"], accessory: ["ceramic bead necklace", "hand-formed ring", "linen scarf", "natural stone earrings"] } },
    C: { name: "Avant-Garde Edge", materials: ["leather", "neoprene", "mesh", "vinyl", "silk", "wool"],
      items: { outer: ["asymmetric blazer", "leather jacket", "cape coat", "deconstructed trench"], top: ["sheer mesh top", "organza blouse", "mohair knit", "draped jersey top"], bottom: ["leather skirt", "satin wide pants", "sarouel pants", "barrel pants"], shoes: ["tabi boots", "sculptural heels", "platform oxford", "velvet ankle boots"], bag: ["chain bag", "sculptural shoulder bag", "geometric box bag", "avant-garde clutch"], accessory: ["oversized geometric earring", "layered chain necklace", "metal cuff", "ear cuff set"] } },
  },
  retro_luxe: {
    A: { name: "70s Bohemian", materials: ["suede", "velvet", "crochet", "silk", "denim", "cotton"],
      items: { outer: ["suede fringe jacket", "velvet blazer", "crochet cardigan", "afghan coat"], top: ["peasant blouse", "embroidered tunic", "lace top", "crochet top"], bottom: ["flared jeans", "maxi boho skirt", "tiered skirt", "suede midi skirt"], shoes: ["platform sandals", "suede knee boots", "wedge espadrilles", "western boots"], bag: ["tapestry bag", "fringe suede bag", "wicker bag", "macrame bag"], accessory: ["headscarf", "layered necklace", "turquoise jewelry", "wide suede belt"] } },
    B: { name: "Heritage Classic", materials: ["tweed", "wool", "cashmere", "leather", "silk", "corduroy"],
      items: { outer: ["tweed blazer", "camel overcoat", "polo coat", "corduroy blazer"], top: ["cashmere turtleneck", "cable-knit sweater", "silk blouse", "oxford shirt"], bottom: ["wool trousers", "riding pants", "corduroy pants", "plaid skirt"], shoes: ["leather loafers", "penny loafers", "riding boots", "oxford shoes"], bag: ["frame bag", "structured handbag", "leather satchel", "doctor bag"], accessory: ["pearl earrings", "gold signet ring", "silk scarf", "classic watch"] } },
    C: { name: "Cinematic Glam", materials: ["satin", "velvet", "silk", "leather", "brocade", "sequin"],
      items: { outer: ["velvet blazer", "faux fur coat", "gold button blazer", "sequin jacket"], top: ["satin blouse", "sequin top", "velvet halter", "corset top"], bottom: ["velvet trousers", "satin midi skirt", "sequin skirt", "leather pants"], shoes: ["kitten heel mules", "strappy sandals", "velvet pumps", "platform heels"], bag: ["satin clutch", "metallic evening bag", "velvet top-handle", "embellished bag"], accessory: ["chandelier earrings", "statement necklace", "velvet headband", "opera gloves"] } },
  },
  sport_modern: {
    A: { name: "Gorpcore", materials: ["gore-tex", "ripstop", "fleece", "nylon", "cordura", "mesh"],
      items: { outer: ["gore-tex shell", "technical anorak", "fleece jacket", "insulated parka"], top: ["merino base layer", "half-zip fleece", "technical quarter-zip", "performance tee"], bottom: ["hiking pants", "convertible pants", "cargo shorts", "trail shorts"], shoes: ["trail running shoes", "hiking boots", "approach shoes", "waterproof sneakers"], bag: ["hiking backpack", "hydration pack", "utility sling", "chest rig"], accessory: ["bucket hat", "sun visor", "merino buff", "technical cap"] } },
    B: { name: "Athleisure Minimal", materials: ["jersey", "cotton", "nylon", "spandex", "mesh", "modal"],
      items: { outer: ["zip-up hoodie", "lightweight bomber", "cropped track jacket", "ponte jacket"], top: ["sports bra", "fitted tank", "ribbed crop tee", "seamless top"], bottom: ["high-waist leggings", "bike shorts", "yoga pants", "wide-leg sweatpants"], shoes: ["retro running shoes", "platform sneakers", "court shoes", "training shoes"], bag: ["gym tote", "canvas duffel", "mini backpack", "sport crossbody"], accessory: ["sports visor", "hair ties set", "minimalist watch", "sport headband"] } },
    C: { name: "Tech Urban", materials: ["nylon", "leather", "mesh", "rubber", "reflective fabric", "cordura"],
      items: { outer: ["tactical jacket", "nylon field jacket", "urban parka", "reflective jacket"], top: ["mesh layer top", "turtleneck base", "compression long sleeve", "tactical tee"], bottom: ["cargo trousers", "tactical pants", "jogger cargo", "techwear pants"], shoes: ["chunky platform sneakers", "tactical boots", "techwear sneakers", "tech runners"], bag: ["chest harness bag", "tactical sling", "modular backpack", "utility belt bag"], accessory: ["tactical cap", "smart watch", "reflective band", "tech gloves"] } },
  },
  creative_layered: {
    A: { name: "Grunge Revival", materials: ["denim", "flannel", "leather", "jersey", "mesh", "lace"],
      items: { outer: ["oversized flannel shirt", "leather biker jacket", "denim jacket", "plaid shirt-jacket"], top: ["band tee", "ripped tee", "mesh top", "graphic tee"], bottom: ["ripped jeans", "plaid mini skirt", "cargo pants", "baggy jeans"], shoes: ["combat boots", "chunky platform boots", "creeper shoes", "doc martens style"], bag: ["canvas backpack", "guitar strap bag", "studded bag", "chain bag"], accessory: ["choker necklace", "safety pin set", "layered chain necklace", "studded belt"] } },
    B: { name: "Vintage Eclectic", materials: ["velvet", "silk", "crochet", "denim", "corduroy", "leather"],
      items: { outer: ["velvet blazer", "tapestry coat", "patchwork denim jacket", "embroidered jacket"], top: ["floral print blouse", "lace top", "vintage graphic tee", "crochet vest"], bottom: ["corduroy wide-leg", "velvet midi skirt", "patchwork jeans", "floral skirt"], shoes: ["mary janes", "vintage loafers", "platform boots", "kitten heels"], bag: ["tapestry bag", "vintage frame bag", "patchwork tote", "embroidered bag"], accessory: ["brooch collection", "layered vintage necklace", "oversized retro glasses", "mixed earrings"] } },
    C: { name: "Art Punk", materials: ["leather", "vinyl", "mesh", "rubber", "denim", "metal hardware"],
      items: { outer: ["leather jacket", "vinyl trench", "spiked jacket", "chain-detail blazer"], top: ["corset top", "band tee with pins", "mesh bodysuit", "fishnet top"], bottom: ["leather pants", "plaid mini skirt", "vinyl skirt", "tartan trousers"], shoes: ["platform combat boots", "studded ankle boots", "creepers", "lug-sole knee boots"], bag: ["studded backpack", "chain shoulder bag", "spike-detail bag", "punk fanny pack"], accessory: ["spike choker", "safety pin earrings", "chain belt", "metal cuff"] } },
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
