import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const h = parsed.hostname;
    if (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h.startsWith("10.") ||
      h.startsWith("192.168.") ||
      h.startsWith("172.") ||
      h === "169.254.169.254" ||
      h === "[::1]" ||
      h.endsWith(".internal")
    )
      return false;
    return true;
  } catch {
    return false;
  }
}

async function verifyAdmin(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return null;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data } = await adminClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    return data ? user : null;
  } catch {
    return null;
  }
}

interface AnalysisRequest {
  imageUrl: string;
  analysisType?: "product" | "outfit" | "style";
}

interface ProductAnalysis {
  category: string;
  sub_category: string;
  gender: string;
  color: string;
  color_family: string;
  color_tone: string;
  pattern: string;
  material: string;
  silhouette: string;
  vibe: string[];
  season: string[];
  formality: number;
  warmth: number;
  description: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { imageUrl, analysisType = "product" }: AnalysisRequest =
      await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!isAllowedUrl(imageUrl)) {
      return new Response(
        JSON.stringify({ error: "Invalid image URL" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch image");
    }

    const contentType = imageResponse.headers.get("content-type") || "image/png";
    const mimeType = contentType.split(";")[0].trim();

    const imageBuffer = await imageResponse.arrayBuffer();
    const bytes = new Uint8Array(imageBuffer);
    const chunks: string[] = [];
    const chunkSize = 32768;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
    }
    const base64Image = btoa(chunks.join(""));

    const prompt =
      analysisType === "product"
        ? `Analyze this fashion product image and provide detailed information in JSON format.

Return ONLY valid JSON (no markdown, no code blocks) with these exact fields:
{
  "category": "상의|미드레이어|하의|아우터|신발|가방|액세서리|넥타이 (미드레이어=니트/가디건/스웨터/조끼/플리스 등 셔츠 위에 걸치는 중간 레이어, 상의=셔츠/티셔츠/폴로/터틀넥 등 기본 상의, 넥타이=넥타이/보타이/스카프타이)",
  "sub_category": "Pick the MOST SPECIFIC value from the list below based on the detected category:
    아우터: puffer|coat|blazer|jacket|trench|bomber|parka|peacoat|anorak|windbreaker|duffle_coat|biker_jacket|denim_jacket|coach_jacket|varsity_jacket|shearling|field_jacket|harrington|quilted_jacket|corduroy_jacket|cape|poncho|kimono|noragi|chore_coat|safari_jacket|utility_jacket|shell|gilet|faux_fur|rain_jacket|track_jacket|shacket|leather_trench|tweed_jacket
    미드레이어: knit|cardigan|sweater|vest|fleece|hoodie|sweatshirt|half_zip|turtleneck_knit|cable_knit|argyle_sweater|fair_isle|cricket_jumper|mock_neck|zip_knit|quilted_vest|down_vest|fleece_vest|knitted_vest|cashmere_sweater|boucle_knit|mohair_knit|crochet_cardigan
    상의: tshirt|shirt|polo|turtleneck|tank|blouse|oxford_shirt|linen_shirt|silk_blouse|graphic_tee|rugby_shirt|henley|crop_top|camisole|bodysuit|tunic|corset|breton_stripe|band_tee|jersey|wrap_top|peasant_blouse|puff_sleeve|flannel_shirt|denim_shirt|chambray|western_shirt|sports_bra|performance_tee|compression_top|mesh_top|lace_top|embroidered_blouse|halter_top
    하의: denim|slacks|chinos|jogger|cargo|shorts|wide_leg|culottes|pleated_trousers|leather_pants|corduroy_pants|parachute_pants|track_pants|linen_trousers|maxi_skirt|midi_skirt|mini_skirt|pencil_skirt|pleated_skirt|wrap_skirt|flared_jeans|baggy_jeans|carpenter_pants|overalls|bermuda_shorts|biker_shorts|leggings|yoga_pants|sweatpants|sailor_pants|harem_pants|velvet_skirt|silk_skirt|tiered_skirt|tennis_skirt
    신발: sneaker|derby|loafer|boot|runner|chelsea_boot|combat_boot|ankle_boot|knee_boot|hiking_boot|desert_boot|work_boot|mule|slide|sandal|espadrille|clog|mary_jane|ballet_flat|oxford|brogue|monk_strap|platform|kitten_heel|block_heel|slingback|boat_shoe|moccasin|western_boot|tabi|driving_shoe|trail_runner|training_shoe|high_top|creeper
    가방: tote|backpack|crossbody|duffle|clutch|shoulder_bag|satchel|messenger|bucket_bag|hobo|belt_bag|sling|baguette|box_bag|frame_bag|saddle_bag|doctor_bag|wristlet|briefcase|gym_bag|camera_bag|weekender|straw_bag|woven_bag|canvas_tote|chain_bag|phone_pouch|sacoche|vanity_case
    액세서리: necktie|belt|cap|scarf|glove|watch|sunglasses|beanie|bucket_hat|beret|headband|choker|chain_necklace|pendant|pearl_necklace|hoop_earring|stud_earring|ring|bracelet|bangle|brooch|hair_clip|bow_tie|suspenders|silk_scarf|bandana|anklet|ear_cuff|hair_stick|tights|wide_brim_hat|visor|wallet_chain",
  "gender": "남성|여성|공용",
  "color": "exact color name in English like black, white, navy, beige, khaki, grey, charcoal, cream, ivory, camel, olive, burgundy, wine, rust, mustard, sage, mint, coral, lavender, sky blue etc.",
  "color_family": "black|white|grey|charcoal|navy|beige|cream|ivory|brown|tan|camel|olive|khaki|sage|rust|mustard|burgundy|wine|blue|sky_blue|denim|teal|green|mint|red|coral|yellow|orange|pink|lavender|purple|metallic|multi",
  "color_tone": "warm|cool|neutral",
  "pattern": "solid|stripe|check|floral|graphic|print|other",
  "material": "Cotton|Polyester|Wool|Leather|Denim|Knit|Chiffon|Linen|Blend|Nylon|Cashmere|Velvet|Suede|Fleece|Jersey|Tencel|Modal etc.",
  "silhouette": "oversized|relaxed|wide|regular|straight|fitted|slim|tapered",
  "vibe": ["ELEVATED_COOL", "EFFORTLESS_NATURAL", "ARTISTIC_MINIMAL", "RETRO_LUXE", "SPORT_MODERN", "CREATIVE_LAYERED"] (select 1-3 that apply),
  "season": ["spring", "summer", "fall", "winter"] (select applicable seasons),
  "formality": 1-5 (1=very casual, 3=smart casual, 5=formal),
  "warmth": 1-5 (1=summer lightweight, 3=spring/fall, 5=heavy winter),
  "description": "Brief Korean description of the item"
}

IMPORTANT: Be precise with color_family. Use specific values like burgundy instead of red for dark reds, olive instead of green for muted greens, cream instead of white for off-whites, charcoal instead of grey for dark greys, denim for denim blue, camel/tan for light browns.
IMPORTANT: For sub_category, always prefer the MOST SPECIFIC type. For example, use "bomber" instead of generic "jacket", "chelsea_boot" instead of generic "boot", "oxford_shirt" instead of generic "shirt".`
        : `Analyze this outfit combination and provide styling insights in Korean.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errBody = await geminiResponse.text();
      throw new Error(`Gemini API error ${geminiResponse.status}: ${errBody}`);
    }

    const geminiData = await geminiResponse.json();
    const analysisText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysisText) {
      throw new Error("No analysis result from Gemini");
    }

    let analysis: ProductAnalysis;

    try {
      const cleanedText = analysisText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : cleanedText);
    } catch {
      throw new Error("Failed to parse analysis result");
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        model: "gemini-2.5-flash",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-fashion-image:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
