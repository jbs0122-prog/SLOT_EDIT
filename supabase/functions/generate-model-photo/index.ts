import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  flatlayImageUrl: string;
  gender: string;
  bodyType: string;
  occasion?: string;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
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

    const { flatlayImageUrl, gender, bodyType, occasion }: RequestBody =
      await req.json();

    if (!flatlayImageUrl || !gender || !bodyType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ethnicityOptions = [
      "Black",
      "White",
      "Caucasian",
      "African American",
    ];
    const randomEthnicity =
      ethnicityOptions[Math.floor(Math.random() * ethnicityOptions.length)];

    const genderText = gender === "남성" ? "male" : "female";
    const bodyTypeText =
      bodyType === "슬림"
        ? "slim, fit"
        : bodyType === "오버핏"
          ? "relaxed fit, comfortable style"
          : "regular fit";

    const fetchImageResponse = await fetch(flatlayImageUrl);
    if (!fetchImageResponse.ok) {
      throw new Error(
        `Failed to fetch flatlay image: ${fetchImageResponse.statusText}`
      );
    }
    const imageBuffer = await fetchImageResponse.arrayBuffer();
    const base64Image = uint8ArrayToBase64(new Uint8Array(imageBuffer));

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${geminiApiKey}`,
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
            responseModalities: ["Text", "Image"],
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      throw new Error(
        `Gemini API error: ${geminiResponse.status} - ${errorText}`
      );
    }

    const geminiResult = await geminiResponse.json();
    console.log(
      "Gemini response structure:",
      JSON.stringify(
        {
          hasCandidates: !!geminiResult.candidates,
          candidateCount: geminiResult.candidates?.length,
          parts: geminiResult.candidates?.[0]?.content?.parts?.map(
            (p: Record<string, unknown>) => ({
              hasText: !!p.text,
              hasInlineData: !!p.inline_data,
              mimeType: (p.inline_data as Record<string, unknown>)?.mime_type,
            })
          ),
        },
        null,
        2
      )
    );

    if (!geminiResult.candidates?.[0]?.content?.parts) {
      const blockReason = geminiResult.candidates?.[0]?.finishReason;
      const promptFeedback = geminiResult.promptFeedback;
      throw new Error(
        `No content generated. Finish reason: ${blockReason || "unknown"}, Feedback: ${JSON.stringify(promptFeedback)}`
      );
    }

    let generatedImageData = null;
    let generatedMimeType = "image/png";
    for (const part of geminiResult.candidates[0].content.parts) {
      if (part.inline_data?.data) {
        generatedImageData = part.inline_data.data;
        generatedMimeType = part.inline_data.mime_type || "image/png";
        break;
      }
    }

    if (!generatedImageData) {
      const textParts = geminiResult.candidates[0].content.parts
        .filter((p: Record<string, unknown>) => p.text)
        .map((p: Record<string, unknown>) => p.text)
        .join(" ");
      throw new Error(
        `No image data in Gemini response. Text response: ${textParts.substring(0, 200)}`
      );
    }

    const imageBytes = Uint8Array.from(atob(generatedImageData), (c) =>
      c.charCodeAt(0)
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const ext = generatedMimeType.includes("jpeg") ? "jpg" : "png";
    const fileName = `model-photo-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageBytes, {
        contentType: generatedMimeType,
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
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
