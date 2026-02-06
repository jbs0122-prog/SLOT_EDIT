import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const response = await fetch(url);
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "image/png";
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    return { base64, mimeType: contentType.split(";")[0] };
  } catch (err) {
    console.error("Failed to fetch image:", err);
    return null;
  }
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
      throw new Error("GEMINI_API_KEY is not configured");
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
      .map(
        (item) =>
          `- ${item.slot_type}: ${item.brand ? item.brand + " " : ""}${item.name} (${item.sub_category || item.category}, ${item.color}, ${item.material || "unknown material"}, ${item.pattern || "solid"}, ${item.silhouette || "regular"} fit)`
      )
      .join("\n");

    const hasImage = !!flatlayImageUrl;

    const prompt = `You are a fashion styling expert. Analyze this outfit combination and write a concise, insightful styling commentary in English.

${hasImage ? "A flatlay image of the outfit is attached. Use the visual details (actual colors, textures, proportions, layering) to enhance your analysis beyond the metadata alone.\n" : ""}Outfit Context:
- Gender: ${gender}
- Body Type: ${bodyType}
- Style Vibe: ${vibe.replace(/_/g, " ")}
- Match Score: ${matchScore}/100
${season ? `- Season: ${season}` : ""}

Items:
${itemDescriptions}

Write a 2-3 sentence styling insight that:
1. Explains why these pieces work well together (color harmony, silhouette balance, texture mix)${hasImage ? " — reference what you see in the image" : ""}
2. Suggests what occasion or setting this outfit suits
3. Uses professional but accessible fashion language

Do NOT use bullet points or lists. Write flowing prose. Do NOT start with "This outfit" - be more creative with the opening. Keep it under 80 words.`;

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 256,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const insightText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!insightText) {
      throw new Error("No insight text received from Gemini");
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
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
