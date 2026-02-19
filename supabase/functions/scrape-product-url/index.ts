import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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
    ) return false;
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
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

function extractMetaContent(html: string, property: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function extractTitle(html: string): string {
  const ogTitle = extractMetaContent(html, "og:title");
  if (ogTitle) return ogTitle;

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) return titleMatch[1].trim();

  return "";
}

function extractDescription(html: string): string {
  const ogDesc = extractMetaContent(html, "og:description");
  if (ogDesc) return ogDesc;
  return extractMetaContent(html, "description");
}

function extractImage(html: string, baseUrl: string): string {
  const ogImage = extractMetaContent(html, "og:image");
  if (ogImage) {
    if (ogImage.startsWith("http")) return ogImage;
    try {
      return new URL(ogImage, baseUrl).href;
    } catch {
      return ogImage;
    }
  }

  const twitterImage = extractMetaContent(html, "twitter:image");
  if (twitterImage) {
    if (twitterImage.startsWith("http")) return twitterImage;
    try {
      return new URL(twitterImage, baseUrl).href;
    } catch {
      return twitterImage;
    }
  }

  return "";
}

function extractPrice(html: string): number | null {
  const ogPrice = extractMetaContent(html, "product:price:amount");
  if (ogPrice) {
    const num = parseFloat(ogPrice.replace(/[^0-9.]/g, ""));
    if (!isNaN(num)) return num;
  }

  const pricePatterns = [
    /["']price["']\s*:\s*["']?([0-9,]+\.?[0-9]*)["']?/i,
    /\$([0-9,]+\.?[0-9]{0,2})/,
    /([0-9,]+)\s*원/,
  ];
  for (const pattern of pricePatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const num = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(num) && num > 0 && num < 100000) return num;
    }
  }

  return null;
}

function extractBrand(html: string, hostname: string): string {
  const ogSiteName = extractMetaContent(html, "og:site_name");
  if (ogSiteName) return ogSiteName;

  const brandMeta = extractMetaContent(html, "brand");
  if (brandMeta) return brandMeta;

  const knownBrands: Record<string, string> = {
    "amazon.com": "Amazon",
    "zara.com": "Zara",
    "hm.com": "H&M",
    "uniqlo.com": "Uniqlo",
    "musinsa.com": "Musinsa",
    "nordstrom.com": "Nordstrom",
    "gap.com": "Gap",
    "asos.com": "ASOS",
    "nike.com": "Nike",
    "adidas.com": "Adidas",
  };

  for (const [domain, brand] of Object.entries(knownBrands)) {
    if (hostname.includes(domain)) return brand;
  }

  return "";
}

function cleanText(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function analyzeWithGemini(
  imageUrl: string,
  productTitle: string,
  productDescription: string,
  apiKey: string
): Promise<Record<string, unknown> | null> {
  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) return null;

    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    const mimeType = contentType.split(";")[0].trim();

    if (!mimeType.startsWith("image/")) return null;

    const imageBuffer = await imageResponse.arrayBuffer();
    const bytes = new Uint8Array(imageBuffer);
    const chunks: string[] = [];
    const chunkSize = 32768;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      chunks.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
    }
    const base64Image = btoa(chunks.join(""));

    const prompt = `Analyze this fashion product image${productTitle ? ` (Product: "${productTitle}")` : ""}${productDescription ? ` Description: "${productDescription}"` : ""} and provide detailed information in JSON format.

Return ONLY valid JSON (no markdown, no code blocks) with these exact fields:
{
  "category": "상의|미드레이어|하의|아우터|신발|가방|액세서리|넥타이",
  "sub_category": "tshirt|shirt|polo|turtleneck|tank|knit|cardigan|sweater|vest|fleece|hoodie|sweatshirt|denim|slacks|chinos|jogger|cargo|shorts|puffer|coat|blazer|jacket|trench|sneaker|derby|loafer|boot|runner|tote|backpack|crossbody|duffle|belt|cap|scarf|glove|watch|necktie|bowtie",
  "gender": "남성|여성|공용",
  "color": "exact color name in Korean",
  "color_family": "black|white|grey|charcoal|navy|beige|cream|ivory|brown|tan|camel|olive|khaki|sage|rust|mustard|burgundy|wine|blue|sky_blue|denim|teal|green|mint|red|coral|yellow|orange|pink|lavender|purple|metallic|multi",
  "color_tone": "warm|cool|neutral",
  "pattern": "solid|stripe|check|floral|graphic|print|other",
  "material": "소재를 한국어로",
  "silhouette": "oversized|relaxed|wide|regular|straight|fitted|slim|tapered",
  "vibe": ["ELEVATED_COOL", "EFFORTLESS_NATURAL", "ARTISTIC_MINIMAL", "RETRO_LUXE", "SPORT_MODERN", "CREATIVE_LAYERED"] (1-3 applicable),
  "season": ["spring", "summer", "fall", "winter"] (applicable seasons),
  "formality": 1-5,
  "warmth": 1-5,
  "description": "Brief Korean description of the item"
}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Image } },
            ],
          }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      }
    );

    if (!geminiResponse.ok) return null;

    const geminiData = await geminiResponse.json();
    const analysisText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!analysisText) return null;

    const cleanedText = analysisText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleanedText);
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    const { productUrl }: { productUrl: string } = await req.json();

    if (!productUrl) {
      return new Response(JSON.stringify({ error: "productUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAllowedUrl(productUrl)) {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pageResponse = await fetch(productUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      redirect: "follow",
    });

    if (!pageResponse.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch page: ${pageResponse.status}` }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = await pageResponse.text();
    const parsedUrl = new URL(productUrl);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;

    const rawTitle = extractTitle(html);
    const rawDescription = extractDescription(html);
    const imageUrl = extractImage(html, baseUrl);
    const price = extractPrice(html);
    const brand = extractBrand(html, parsedUrl.hostname);

    const title = cleanText(rawTitle);
    const description = cleanText(rawDescription);

    let analysis: Record<string, unknown> | null = null;
    if (imageUrl && GEMINI_API_KEY) {
      analysis = await analyzeWithGemini(imageUrl, title, description, GEMINI_API_KEY);
    }

    return new Response(
      JSON.stringify({
        success: true,
        scraped: {
          title,
          description,
          imageUrl,
          price,
          brand,
          productUrl,
        },
        analysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in scrape-product-url:", error);
    return new Response(JSON.stringify({ error: "Failed to scrape product URL" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
