import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

interface OutfitItem {
  slot_type: string;
  brand: string;
  name: string;
  category: string;
  color: string;
  color_family: string;
  material: string;
  pattern: string;
  silhouette: string;
  sub_category: string;
  vibe: string[];
  price: number | null;
}

interface InsightRequest {
  items: OutfitItem[];
  gender: string;
  bodyType: string;
  vibe: string;
  matchScore: number;
  season?: string;
  flatlayImageUrl?: string;
}

async function fetchImageAsBase64(
  url: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    if (!isAllowedUrl(url)) return null;
    const response = await fetch(url);
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) return null;

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    return { base64, mimeType: contentType.split(";")[0] };
  } catch {
    return null;
  }
}

function sanitizeText(str: string, maxLen = 100): string {
  return str.replace(/[<>"'&]/g, "").substring(0, maxLen);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
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

    const {
      items,
      gender,
      bodyType,
      vibe,
      matchScore,
      season,
      flatlayImageUrl,
    }: InsightRequest = await req.json();

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "items are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const itemDescriptions = items
      .slice(0, 10)
      .map(
        (item) =>
          `- ${sanitizeText(item.slot_type, 30)}: ${sanitizeText(item.brand || "", 50)} ${sanitizeText(item.name, 50)} (${sanitizeText(item.sub_category || item.category, 30)}, ${sanitizeText(item.color, 30)}, ${sanitizeText(item.material || "unknown material", 30)}, ${sanitizeText(item.pattern || "solid", 20)}, ${sanitizeText(item.silhouette || "regular", 20)} fit)`
      )
      .join("\n");

    const hasImage = !!flatlayImageUrl;

    const safeGender = sanitizeText(gender || "", 20);
    const safeBodyType = sanitizeText(bodyType || "", 20);
    const safeVibe = sanitizeText(vibe || "", 50);
    const safeSeason = season ? sanitizeText(season, 20) : "";
    const safeScore = Math.min(Math.max(Math.round(matchScore || 0), 0), 100);

    const prompt = `You are a fashion styling expert. Analyze this outfit combination and write a concise, insightful styling commentary in English.

${hasImage ? "A flatlay image of the outfit is attached. Use the visual details (actual colors, textures, proportions, layering) to enhance your analysis beyond the metadata alone.\n" : ""}Outfit Context:
- Gender: ${safeGender}
- Body Type: ${safeBodyType}
- Style Vibe: ${safeVibe.replace(/_/g, " ")}
- Match Score: ${safeScore}/100
${safeSeason ? `- Season: ${safeSeason}` : ""}

Items:
${itemDescriptions}

Write a styling insight in EXACTLY 2 short sentences (max 35 words total):
- Sentence 1: Why these pieces work together (color, silhouette, or texture)${hasImage ? " — reference the image" : ""}
- Sentence 2: Best occasion or setting

No bullet points, no lists. Flowing prose only. Do NOT start with "This outfit". Keep it punchy and concise.`;

    const parts: Array<Record<string, unknown>> = [];

    if (flatlayImageUrl) {
      const imageData = await fetchImageAsBase64(flatlayImageUrl);
      if (imageData) {
        parts.push({
          inline_data: {
            mime_type: imageData.mimeType,
            data: imageData.base64,
          },
        });
      }
    }

    parts.push({ text: prompt });

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error("AI insight generation failed");
    }

    const geminiData = await geminiResponse.json();
    const insightText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!insightText) {
      throw new Error("No insight generated");
    }

    return new Response(
      JSON.stringify({ success: true, insight: insightText }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-outfit-insight:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate insight" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
