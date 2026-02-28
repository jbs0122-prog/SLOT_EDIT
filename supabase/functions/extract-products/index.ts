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

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch image");
  }
  const buffer = await response.arrayBuffer();
  return uint8ArrayToBase64(new Uint8Array(buffer));
}

async function callGemini(
  apiKey: string,
  prompt: string,
  imageBase64: string,
  mimeType: string,
  temperature = 0.4
) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Gemini API request failed");
  }

  return response.json();
}

async function callGeminiImageGen(
  apiKey: string,
  prompt: string,
  imageBase64: string,
  mimeType: string
) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.5,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Gemini Image API request failed");
  }

  return response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceKeyCall = authHeader === `Bearer ${serviceKey}`;

    if (!isServiceKeyCall) {
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

    const body = await req.json();
    const { mode, imageUrl } = body;

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

    const imageBase64 = await fetchImageAsBase64(imageUrl);
    const mimeType = "image/png";

    if (mode === "detect") {
      const detectPrompt = `이 사진에서 모델이 착용하고 있는 패션 아이템들을 분석해주세요.

각 아이템을 아래 카테고리 중 하나로 분류하고, 한국어 설명을 작성해주세요.

카테고리: outer(아우터), mid(미드레이어/니트/가디건), top(상의), bottom(하의), shoes(신발), bag(가방), accessory(액세서리)

JSON 배열 형식으로 답변해주세요:
[
  {
    "slot": "카테고리 영문값",
    "label": "아이템 한국어 이름 (예: 네이비 오버사이즈 블레이저)",
    "color": "메인 색상",
    "description": "간단한 설명"
  }
]

중요:
- 모델이 착용한 아이템만 포함
- 각 카테고리당 하나만 (가장 눈에 띄는 것)
- JSON만 반환, 다른 텍스트 없이`;

      const result = await callGemini(
        geminiApiKey,
        detectPrompt,
        imageBase64,
        mimeType
      );

      const textPart = result.candidates?.[0]?.content?.parts?.find(
        (p: Record<string, unknown>) => p.text
      );
      if (!textPart?.text) {
        throw new Error("No detection result");
      }

      const cleanedText = textPart.text
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();

      const items = JSON.parse(cleanedText);

      return new Response(JSON.stringify({ success: true, items }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "extract") {
      const { slot, label } = body;
      if (!slot || !label) {
        return new Response(
          JSON.stringify({
            error: "slot and label are required for extract mode",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const slotNames: Record<string, string> = {
        outer: "아우터/외투",
        mid: "미드레이어/니트/가디건",
        top: "상의/티셔츠/셔츠",
        bottom: "하의/바지/스커트",
        shoes: "신발",
        bag: "가방",
        accessory: "액세서리",
      };

      const safeLabel = label.substring(0, 100);
      const safeSlotName = slotNames[slot] || slot.substring(0, 50);

      const extractPrompt = `이 모델 착용 사진에서 "${safeLabel}" (${safeSlotName})만 추출하여 깨끗한 제품 단독 이미지로 변환해주세요.

요구사항:
- 모델의 신체를 완전히 제거하고 해당 의류/제품만 남겨주세요
- 깨끗한 흰색 배경 위에 제품만 놓인 형태
- 마치 온라인 쇼핑몰의 제품 상세 이미지처럼 깔끔하게
- 제품의 실제 형태와 디테일을 최대한 보존
- 플랫레이(평면 배치) 스타일로 자연스럽게 펼쳐놓은 형태
- 그림자는 최소한으로, 고화질
- 다른 아이템은 절대 포함하지 마세요, 오직 "${safeLabel}"만`;

      const imageResult = await callGeminiImageGen(
        geminiApiKey,
        extractPrompt,
        imageBase64,
        mimeType
      );

      if (!imageResult.candidates?.[0]?.content?.parts) {
        throw new Error("No content generated");
      }

      let generatedImageData = null;
      let generatedMimeType = "image/png";
      for (const part of imageResult.candidates[0].content.parts) {
        const inlineData = part.inline_data || part.inlineData;
        if (inlineData?.data) {
          generatedImageData = inlineData.data;
          generatedMimeType =
            inlineData.mime_type || inlineData.mimeType || "image/png";
          break;
        }
      }

      if (!generatedImageData) {
        throw new Error("No image data in response");
      }

      const imageBytes = Uint8Array.from(atob(generatedImageData), (c) =>
        c.charCodeAt(0)
      );

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const ext = generatedMimeType.includes("jpeg") ? "jpg" : "png";
      const fileName = `extracted-${slot}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

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
          slot,
          label,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid mode. Use 'detect' or 'extract'" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Extract products error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
