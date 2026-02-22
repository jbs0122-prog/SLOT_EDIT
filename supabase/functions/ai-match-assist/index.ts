import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OutfitItemSummary {
  slot_type: string;
  name: string;
  brand: string;
  color: string;
  color_family: string;
  material: string;
  pattern: string;
  silhouette: string;
  sub_category: string;
  vibe: string[];
  formality?: number;
  warmth?: number;
}

interface CandidateOutfit {
  index: number;
  items: OutfitItemSummary[];
  ruleScore: number;
}

interface AIMatchRequest {
  candidates: CandidateOutfit[];
  context: {
    gender: string;
    bodyType: string;
    vibe: string;
    season?: string;
    warmth?: number;
  };
  topN: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { candidates, context, topN } = (await req.json()) as AIMatchRequest;

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

    let trendContext = "";
    const { data: cachedTrend } = await supabase
      .from("trend_cache")
      .select("trend_data, updated_at")
      .eq("season", context.season || "all")
      .maybeSingle();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    if (cachedTrend && cachedTrend.updated_at > oneDayAgo) {
      trendContext = cachedTrend.trend_data;
    } else {
      trendContext = await fetchTrendContext(geminiKey, context.season);
      await supabase
        .from("trend_cache")
        .upsert(
          {
            season: context.season || "all",
            trend_data: trendContext,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "season" }
        );
    }

    const candidateSummaries = candidates.map((c) => {
      const itemList = c.items
        .map(
          (item) =>
            `  [${item.slot_type}] ${item.brand} ${item.name} (${item.color_family}, ${item.material}, ${item.sub_category}, sil:${item.silhouette})`
        )
        .join("\n");
      return `Outfit #${c.index} (rule score: ${c.ruleScore}):\n${itemList}`;
    });

    const prompt = `You are a professional fashion stylist AI. Evaluate these outfit candidates and select the best ${topN} outfits.

CONTEXT:
- Gender: ${context.gender}
- Body Type: ${context.bodyType}
- Style Preference: ${context.vibe}
- Season: ${context.season || "all-season"}
- Warmth Target: ${context.warmth || "not specified"}

CURRENT TREND CONTEXT:
${trendContext}

CANDIDATE OUTFITS:
${candidateSummaries.join("\n\n")}

EVALUATION CRITERIA:
1. Color harmony and visual balance (avoid monotone all-black unless intentional)
2. Silhouette balance (top vs bottom proportions)
3. Material texture mix (complementary textures)
4. Style coherence across items
5. Season and warmth appropriateness
6. Trend alignment (bonus for trendy combinations)
7. Sub-category pairing logic (e.g. blazer+slacks, hoodie+sneaker)
8. Overall styling creativity and appeal

Return a JSON object with this exact structure:
{
  "selected": [
    {
      "index": <outfit index number>,
      "aiScore": <0-100 score>,
      "reasoning": "<brief 1-line reasoning in Korean>"
    }
  ]
}

Select exactly ${topN} outfits. Return ONLY valid JSON, no markdown or explanation.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${response.status}`, fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({
        success: true,
        selected: parsed.selected || [],
        trendContext: trendContext.substring(0, 200),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message, fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchTrendContext(
  geminiKey: string,
  season?: string
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const seasonLabel = season || "all-season";

  const prompt = `Provide a brief summary (max 150 words) of current ${currentYear} ${seasonLabel} menswear and womenswear fashion trends. Include:
1. Key color palettes trending now
2. Popular silhouettes and fits
3. Material/fabric trends
4. Key styling combinations
5. Sub-category items gaining popularity

Be specific with color names, silhouette types, and material names. Return plain text, no markdown.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 500,
        },
      }),
    }
  );

  if (!response.ok) {
    return "No trend data available.";
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No trend data available.";
}
