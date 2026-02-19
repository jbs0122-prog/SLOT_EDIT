import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function isPrivateHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname === "169.254.169.254" ||
    hostname === "[::1]" ||
    hostname.endsWith(".internal")
  );
}

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    if (isPrivateHost(parsed.hostname)) return false;
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

async function resolveUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
    });
    const finalUrl = res.url || url;
    if (isPrivateHost(new URL(finalUrl).hostname)) return url;
    return finalUrl;
  } catch {
    return url;
  }
}

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
];

async function fetchPage(url: string): Promise<{ html: string; finalUrl: string } | null> {
  const finalUrl = await resolveUrl(url);

  for (const ua of USER_AGENTS) {
    try {
      const res = await fetch(finalUrl, {
        headers: {
          "User-Agent": ua,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate",
          "Cache-Control": "no-cache",
        },
        redirect: "follow",
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
          continue;
        }
        const html = await res.text();
        if (html.length > 500) {
          return { html, finalUrl: res.url || finalUrl };
        }
      }

      if (res.status === 403 || res.status === 429) {
        continue;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractMetaContent(html: string, ...properties: string[]): string {
  for (const property of properties) {
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"'<>]+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+property=["']${property}["']`, "i"),
      new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"'<>]+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"'<>]+)["'][^>]+name=["']${property}["']`, "i"),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]?.trim()) return match[1].trim();
    }
  }
  return "";
}

function extractTitle(html: string): string {
  const og = extractMetaContent(html, "og:title", "twitter:title");
  if (og) return og;
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim() || "";
}

function extractDescription(html: string): string {
  return extractMetaContent(html, "og:description", "description", "twitter:description");
}

function extractImage(html: string, baseUrl: string): string {
  const candidates = [
    extractMetaContent(html, "og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"),
  ];

  for (const c of candidates) {
    if (!c) continue;
    if (c.startsWith("http")) return c;
    try { return new URL(c, baseUrl).href; } catch { return c; }
  }

  const imgPatterns = [
    /"image"\s*:\s*"(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i,
    /"main_image_url"\s*:\s*"(https?:\/\/[^"]+)"/i,
    /"imageUrl"\s*:\s*"(https?:\/\/[^"]+)"/i,
  ];
  for (const p of imgPatterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1];
  }

  return "";
}

function extractPrice(html: string): number | null {
  const pricePatterns = [
    /["']price["']\s*:\s*["']([0-9,]+\.?[0-9]*)["']/i,
    /"priceAmount"\s*:\s*"?([0-9,]+\.?[0-9]*)"?/i,
    /class="[^"]*price[^"]*"[^>]*>\s*\$?([0-9,]+\.?[0-9]{0,2})/i,
    /\$\s*([0-9,]+\.[0-9]{2})/,
    /([0-9,]+)\s*원/,
    /<meta[^>]+name=["']price["'][^>]+content=["']([0-9,]+\.?[0-9]*)["']/i,
    /product:price:amount[^>]+content=["']([0-9,]+\.?[0-9]*)["']/i,
  ];
  for (const p of pricePatterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const num = parseFloat(m[1].replace(/,/g, ""));
      if (!isNaN(num) && num > 0 && num < 500000) return num;
    }
  }
  return null;
}

function extractBrand(html: string, hostname: string): string {
  const fromMeta = extractMetaContent(html, "og:site_name", "brand", "og:brand");
  if (fromMeta && fromMeta.length < 60) return fromMeta;

  const knownBrands: Record<string, string> = {
    "amazon.com": "Amazon",
    "amzn.to": "Amazon",
    "zara.com": "Zara",
    "hm.com": "H&M",
    "uniqlo.com": "Uniqlo",
    "musinsa.com": "Musinsa",
    "nordstrom.com": "Nordstrom",
    "gap.com": "Gap",
    "asos.com": "ASOS",
    "nike.com": "Nike",
    "adidas.com": "Adidas",
    "ralphlauren.com": "Ralph Lauren",
    "tommyhilfiger.com": "Tommy Hilfiger",
    "calvinklein.com": "Calvin Klein",
    "lacoste.com": "Lacoste",
    "abercrombie.com": "Abercrombie & Fitch",
    "ae.com": "American Eagle",
    "forever21.com": "Forever 21",
    "target.com": "Target",
    "walmart.com": "Walmart",
    "macys.com": "Macy's",
    "saksfifthavenue.com": "Saks Fifth Avenue",
    "ssense.com": "SSENSE",
    "farfetch.com": "Farfetch",
    "net-a-porter.com": "Net-a-Porter",
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
    const imageResponse = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
    });
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

    const prompt = `Analyze this fashion product image${productTitle ? ` (Product: "${productTitle}")` : ""}${productDescription ? `. Description: "${productDescription}"` : ""} and provide detailed information in JSON format.

Return ONLY valid JSON (no markdown, no code blocks) with these exact fields:
{
  "category": "상의|미드레이어|하의|아우터|신발|가방|액세서리|넥타이",
  "sub_category": "tshirt|shirt|polo|turtleneck|tank|knit|cardigan|sweater|vest|fleece|hoodie|sweatshirt|denim|slacks|chinos|jogger|cargo|shorts|puffer|coat|blazer|jacket|trench|sneaker|derby|loafer|boot|runner|tote|backpack|crossbody|duffle|belt|cap|scarf|glove|watch|necktie",
  "gender": "남성|여성|공용",
  "color": "exact color name in Korean",
  "color_family": "black|white|grey|charcoal|navy|beige|cream|ivory|brown|tan|camel|olive|khaki|sage|rust|mustard|burgundy|wine|blue|sky_blue|denim|teal|green|mint|red|coral|yellow|orange|pink|lavender|purple|metallic|multi",
  "color_tone": "warm|cool|neutral",
  "pattern": "solid|stripe|check|floral|graphic|print|other",
  "material": "소재를 한국어로",
  "silhouette": "oversized|relaxed|wide|regular|straight|fitted|slim|tapered",
  "vibe": ["ELEVATED_COOL","EFFORTLESS_NATURAL","ARTISTIC_MINIMAL","RETRO_LUXE","SPORT_MODERN","CREATIVE_LAYERED"],
  "season": ["spring","summer","fall","winter"],
  "formality": 1,
  "warmth": 3,
  "description": "한국어로 간략한 제품 설명"
}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Image } }] }],
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

    const body = await req.json();
    const productUrl: string = body?.productUrl;

    if (!productUrl) {
      return new Response(JSON.stringify({ error: "productUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAllowedUrl(productUrl)) {
      return new Response(JSON.stringify({ error: "유효하지 않은 URL입니다 (HTTPS여야 합니다)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await fetchPage(productUrl);

    if (!result) {
      return new Response(
        JSON.stringify({
          error: "페이지를 가져올 수 없습니다. 해당 사이트가 접근을 차단했을 수 있습니다. 이미지 URL을 직접 입력해주세요.",
          partialSuccess: false,
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { html, finalUrl } = result;
    const parsedUrl = new URL(finalUrl);
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
        scraped: { title, description, imageUrl, price, brand, productUrl: finalUrl },
        analysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in scrape-product-url:", error);
    return new Response(
      JSON.stringify({ error: "스크래핑 중 오류가 발생했습니다: " + (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
