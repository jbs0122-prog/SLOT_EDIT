import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ImageFeatures {
  dominantColors: string[];
  texture: string;
  visualWeight: string;
  styleAttributes: string[];
  patternDetail: string;
  brightnessLevel: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { productId, imageUrl, batchProductIds } = await req.json();

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (batchProductIds && Array.isArray(batchProductIds)) {
      const { data: products, error: fetchErr } = await supabase
        .from("products")
        .select("id, image_url, image_features")
        .in("id", batchProductIds)
        .is("image_features", null);

      if (fetchErr) {
        return new Response(
          JSON.stringify({ error: fetchErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results: Array<{ id: string; success: boolean }> = [];

      for (const product of (products || [])) {
        try {
          const features = await analyzeImage(product.image_url, geminiKey);
          await supabase
            .from("products")
            .update({ image_features: features })
            .eq("id", product.id);
          results.push({ id: product.id, success: true });
        } catch {
          results.push({ id: product.id, success: false });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!productId || !imageUrl) {
      return new Response(
        JSON.stringify({ error: "productId and imageUrl are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const features = await analyzeImage(imageUrl, geminiKey);

    await supabase
      .from("products")
      .update({ image_features: features })
      .eq("id", productId);

    return new Response(
      JSON.stringify({ success: true, features }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function analyzeImage(
  imageUrl: string,
  geminiKey: string
): Promise<ImageFeatures> {
  const prompt = `Analyze this fashion product image and return a JSON object with these exact fields:
- dominantColors: array of 1-3 color names (e.g. ["black", "charcoal"])
- texture: one of "smooth", "textured", "knit", "woven", "leather", "denim", "sheer", "quilted", "fuzzy"
- visualWeight: one of "light", "medium", "heavy" (how visually heavy/dense the garment looks)
- styleAttributes: array of 2-4 attributes from: "minimal", "structured", "relaxed", "tailored", "sporty", "bohemian", "edgy", "classic", "trendy", "luxe", "workwear", "streetwear"
- patternDetail: one of "solid", "subtle_texture", "micro_pattern", "bold_pattern", "graphic", "colorblock"
- brightnessLevel: one of "dark", "medium", "light", "bright"

Return ONLY valid JSON, no markdown or explanation.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
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
                  mime_type: "image/jpeg",
                  data: await fetchImageAsBase64(imageUrl),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini response as JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]) as ImageFeatures;

  return {
    dominantColors: parsed.dominantColors || [],
    texture: parsed.texture || "smooth",
    visualWeight: parsed.visualWeight || "medium",
    styleAttributes: parsed.styleAttributes || [],
    patternDetail: parsed.patternDetail || "solid",
    brightnessLevel: parsed.brightnessLevel || "medium",
  };
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
