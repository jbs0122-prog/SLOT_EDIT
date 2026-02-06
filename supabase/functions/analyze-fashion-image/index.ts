import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnalysisRequest {
  imageUrl: string;
  analysisType?: 'product' | 'outfit' | 'style';
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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const { imageUrl, analysisType = 'product' }: AnalysisRequest = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
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

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(
      String.fromCharCode(...new Uint8Array(imageBuffer))
    );

    const prompt = analysisType === 'product'
      ? `Analyze this fashion product image and provide detailed information in JSON format.

Return ONLY valid JSON (no markdown, no code blocks) with these exact fields:
{
  "category": "상의|하의|아우터|신발|가방|액세서리",
  "sub_category": "specific type like 티셔츠, 셔츠, 청바지, 슬랙스, 코트, 자켓, 스니커즈, 구두, 크로스백, 숄더백, 목걸이, 반지 etc.",
  "gender": "남성|여성|공용",
  "color": "exact color name in Korean like 검정, 흰색, 네이비, 베이지, 카키, 그레이 etc.",
  "color_family": "무채색|난색|한색",
  "color_tone": "밝음|중간|어두움",
  "pattern": "무지|스트라이프|체크|도트|프린트|기타",
  "material": "면|폴리에스터|울|가죽|데님|니트|시폰|린넨|혼방 etc.",
  "silhouette": "슬림|레귤러|오버사이즈|와이드",
  "vibe": ["캐주얼", "포멀", "스트릿", "빈티지", "미니멀", "페미닌", "모던", "클래식"] (select 1-3 that apply),
  "season": ["봄", "여름", "가을", "겨울"] (select applicable seasons),
  "formality": 1-10 (1=very casual, 10=very formal),
  "warmth": 1-10 (1=very cool, 10=very warm),
  "description": "Brief Korean description of the item"
}`
      : `Analyze this outfit combination and provide styling insights in Korean.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
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
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const analysisText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysisText) {
      throw new Error("No analysis text received from Gemini");
    }

    let analysis: ProductAnalysis;

    try {
      const cleanedText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", analysisText);
      throw new Error("Failed to parse analysis result");
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        model: "gemini-2.5-flash-image",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Error in analyze-fashion-image:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
