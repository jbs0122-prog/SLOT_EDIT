import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  flatlayImageUrl: string;
  gender: string;
  bodyType: string;
  occasion?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY not found");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials not found");
    }

    const { flatlayImageUrl, gender, bodyType, occasion }: RequestBody = await req.json();

    if (!flatlayImageUrl || !gender || !bodyType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ethnicityOptions = ["Black", "White", "Caucasian", "African American"];
    const randomEthnicity = ethnicityOptions[Math.floor(Math.random() * ethnicityOptions.length)];

    const genderText = gender === "남성" ? "male" : "female";
    const bodyTypeText = bodyType === "슬림"
      ? "slim, fit"
      : bodyType === "오버핏"
      ? "relaxed fit, comfortable style"
      : "regular fit";

    const fetchImageResponse = await fetch(flatlayImageUrl);
    if (!fetchImageResponse.ok) {
      throw new Error(`Failed to fetch flatlay image: ${fetchImageResponse.statusText}`);
    }
    const imageBuffer = await fetchImageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    const prompt = `Create a professional fashion editorial photo of a ${randomEthnicity} ${genderText} model wearing the exact outfit shown in the flatlay image.

Model specifications:
- Ethnicity: ${randomEthnicity}
- Gender: ${genderText}
- Body type: ${bodyTypeText}
- Age: 25-30 years old

Photo requirements:
- Studio lighting with soft shadows
- Clean white or light gray background
- Full body shot showing the complete outfit
- Model should be standing in a natural, confident pose
- Professional fashion photography style
- High fashion editorial aesthetic
- The clothing items should match EXACTLY what's shown in the flatlay image
${occasion ? `- Context: outfit for ${occasion}` : ""}

The photo should look like a high-end fashion catalog or editorial spread.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
                {
                  inline_data: {
                    mime_type: "image/png",
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiResult = await geminiResponse.json();

    if (!geminiResult.candidates?.[0]?.content?.parts) {
      throw new Error("No image generated from Gemini");
    }

    let generatedImageData = null;
    for (const part of geminiResult.candidates[0].content.parts) {
      if (part.inline_data?.data) {
        generatedImageData = part.inline_data.data;
        break;
      }
    }

    if (!generatedImageData) {
      throw new Error("No image data found in Gemini response");
    }

    const imageBytes = Uint8Array.from(atob(generatedImageData), c => c.charCodeAt(0));

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileName = `model-photo-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: urlData.publicUrl,
        ethnicity: randomEthnicity,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating model photo:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
