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
  revisionImageUrl?: string;
  revisionPrompt?: string;
}

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

async function verifyAuth(req: Request) {
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
    return user;
  } catch {
    return null;
  }
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
    const user = await verifyAuth(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Storage service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { flatlayImageUrl, gender, bodyType, occasion, revisionImageUrl, revisionPrompt }: RequestBody =
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

    if (!isAllowedUrl(flatlayImageUrl)) {
      return new Response(
        JSON.stringify({ error: "Invalid image URL" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const isRevision = !!(revisionImageUrl && revisionPrompt);

    if (isRevision && !isAllowedUrl(revisionImageUrl!)) {
      return new Response(
        JSON.stringify({ error: "Invalid revision image URL" }),
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

    const genderLower = gender.toLowerCase();
    const genderText =
      genderLower === "male" || genderLower === "남성" ? "male" : "female";
    const bodyTypeLower = bodyType.toLowerCase();
    const bodyTypeText =
      bodyTypeLower === "slim" || bodyTypeLower === "슬림"
        ? "slim, lean, fit"
        : bodyTypeLower === "plus-size" ||
            bodyTypeLower === "오버핏" ||
            bodyTypeLower === "plus_size"
          ? "plus-size, relaxed fit, comfortable style"
          : "regular, athletic fit";

    const fetchImageResponse = await fetch(flatlayImageUrl);
    if (!fetchImageResponse.ok) {
      throw new Error("Failed to fetch flatlay image");
    }
    const imageBuffer = await fetchImageResponse.arrayBuffer();
    const base64Image = uint8ArrayToBase64(new Uint8Array(imageBuffer));

    const contentType =
      fetchImageResponse.headers.get("content-type") || "image/png";
    const mimeType = contentType.includes("webp")
      ? "image/webp"
      : contentType.includes("jpeg") || contentType.includes("jpg")
        ? "image/jpeg"
        : "image/png";

    const genderDescription =
      genderText === "male"
        ? "a MAN (male, masculine). The model MUST be clearly a MALE person with masculine features."
        : "a WOMAN (female, feminine). The model MUST be clearly a FEMALE person with feminine features.";

    const safeOccasion = occasion ? occasion.substring(0, 100) : "";

    let prompt: string;
    const contentParts: Array<Record<string, unknown>> = [];

    if (isRevision) {
      const safeRevision = revisionPrompt!.substring(0, 500);

      const revisionFetchResponse = await fetch(revisionImageUrl!);
      if (!revisionFetchResponse.ok) {
        throw new Error("Failed to fetch revision image");
      }
      const revisionBuffer = await revisionFetchResponse.arrayBuffer();
      const base64Revision = uint8ArrayToBase64(new Uint8Array(revisionBuffer));
      const revisionContentType = revisionFetchResponse.headers.get("content-type") || "image/png";
      const revisionMimeType = revisionContentType.includes("webp")
        ? "image/webp"
        : revisionContentType.includes("jpeg") || revisionContentType.includes("jpg")
          ? "image/jpeg"
          : "image/png";

      prompt = `You are editing an existing model photo. Here is the current model photo and the original flatlay reference.

REVISION REQUEST: ${safeRevision}

IMPORTANT RULES:
- Keep the same model (same person, same ethnicity, same body type)
- Keep the same outfit items from the flatlay
- The model MUST remain ${genderText.toUpperCase()}
- Only apply the specific changes requested above
- Maintain the same professional fashion editorial quality
- Studio lighting with clean white or light gray background
- Full body shot showing the complete outfit`;

      contentParts.push(
        { text: prompt },
        { inline_data: { mime_type: revisionMimeType, data: base64Revision } },
        { inline_data: { mime_type: mimeType, data: base64Image } }
      );
    } else {
      prompt = `CRITICAL: The model MUST be ${genderText.toUpperCase()}. Generate a professional fashion editorial photo of ${genderDescription}

The model is ${randomEthnicity}, wearing the exact outfit shown in the flatlay image.

Model specifications:
- Gender: ${genderText.toUpperCase()} (THIS IS MANDATORY - do NOT use the opposite gender)
- Ethnicity: ${randomEthnicity}
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
- The model MUST be ${genderText.toUpperCase()}
${safeOccasion ? `- Context: outfit for ${safeOccasion}` : ""}

REMINDER: The model in the photo MUST be a ${genderText} person. This is a ${genderText === "male" ? "menswear" : "womenswear"} outfit.`;

      contentParts.push(
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64Image } }
      );
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: contentParts,
            },
          ],
          generationConfig: { temperature: 0.7 },
        }),
      }
    );

    if (!geminiResponse.ok) {
      throw new Error("AI image generation failed");
    }

    const geminiResult = await geminiResponse.json();

    if (!geminiResult.candidates?.[0]?.content?.parts) {
      throw new Error("No content generated");
    }

    let generatedImageData = null;
    let generatedMimeType = "image/png";
    for (const part of geminiResult.candidates[0].content.parts) {
      const inlineData = part.inline_data || part.inlineData;
      if (inlineData?.data) {
        generatedImageData = inlineData.data;
        generatedMimeType =
          inlineData.mime_type || inlineData.mimeType || "image/png";
        break;
      }
    }

    if (!generatedImageData) {
      throw new Error("No image data generated");
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
      throw new Error("Failed to upload image");
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
      JSON.stringify({ error: "Failed to generate model photo" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
