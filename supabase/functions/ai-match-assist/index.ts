import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VIBE_DNA: Record<string, {
  formality_range: [number, number];
  preferred_tonal_strategy: string[];
  silhouette_preference: string[];
  texture_rules: { required_variety: number; preferred_textures: string[]; forbidden_textures?: string[]; sheen_tolerance: number };
  color_palette: { primary: string[]; secondary: string[]; accent: string[]; max_accent_ratio: number };
  proportion_style: string;
  mixing_tolerance: number;
  material_preferences: string[];
  era_mood_tags: string[];
}> = {
  ELEVATED_COOL: {
    formality_range: [5, 9],
    preferred_tonal_strategy: ['tone-on-tone', 'contrast'],
    silhouette_preference: ['I', 'V'],
    texture_rules: { required_variety: 2, preferred_textures: ['structured', 'matte', 'sheen'], sheen_tolerance: 0.8 },
    color_palette: { primary: ['black', 'charcoal', 'navy', 'white'], secondary: ['grey', 'cream', 'camel'], accent: ['burgundy', 'metallic', 'wine'], max_accent_ratio: 0.10 },
    proportion_style: 'column',
    mixing_tolerance: 0.3,
    material_preferences: ['structured', 'luxe', 'classic'],
    era_mood_tags: ['minimalist', 'architectural', 'city-noir'],
  },
  EFFORTLESS_NATURAL: {
    formality_range: [2, 6],
    preferred_tonal_strategy: ['tone-in-tone', 'tone-on-tone'],
    silhouette_preference: ['A', 'H', 'I'],
    texture_rules: { required_variety: 2, preferred_textures: ['matte', 'rough', 'smooth'], forbidden_textures: ['sheen'], sheen_tolerance: 0.2 },
    color_palette: { primary: ['beige', 'cream', 'ivory', 'white'], secondary: ['olive', 'khaki', 'tan', 'sage', 'brown'], accent: ['rust', 'mustard', 'burgundy'], max_accent_ratio: 0.15 },
    proportion_style: 'relaxed',
    mixing_tolerance: 0.5,
    material_preferences: ['classic', 'eco', 'knit'],
    era_mood_tags: ['japandi', 'french-casual', 'organic', 'wabi-sabi'],
  },
  ARTISTIC_MINIMAL: {
    formality_range: [3, 8],
    preferred_tonal_strategy: ['tone-on-tone', 'contrast'],
    silhouette_preference: ['I', 'A', 'Y'],
    texture_rules: { required_variety: 3, preferred_textures: ['structured', 'matte', 'rough'], sheen_tolerance: 0.4 },
    color_palette: { primary: ['black', 'white', 'grey', 'charcoal'], secondary: ['cream', 'beige', 'navy'], accent: ['rust', 'olive', 'burgundy'], max_accent_ratio: 0.10 },
    proportion_style: 'column',
    mixing_tolerance: 0.4,
    material_preferences: ['classic', 'structured', 'eco', 'knit'],
    era_mood_tags: ['avant-garde', 'gallery', 'architectural', 'deconstructed'],
  },
  RETRO_LUXE: {
    formality_range: [3, 8],
    preferred_tonal_strategy: ['tone-in-tone', 'contrast'],
    silhouette_preference: ['A', 'X', 'I'],
    texture_rules: { required_variety: 2, preferred_textures: ['smooth', 'sheen', 'rough'], sheen_tolerance: 0.7 },
    color_palette: { primary: ['burgundy', 'navy', 'brown', 'cream'], secondary: ['camel', 'olive', 'wine', 'beige'], accent: ['rust', 'mustard', 'teal', 'gold'], max_accent_ratio: 0.20 },
    proportion_style: 'balanced',
    mixing_tolerance: 0.5,
    material_preferences: ['luxe', 'structured', 'classic', 'knit'],
    era_mood_tags: ['70s', 'heritage', 'cinematic', 'old-money'],
  },
  SPORT_MODERN: {
    formality_range: [0, 4],
    preferred_tonal_strategy: ['contrast', 'tone-on-tone'],
    silhouette_preference: ['I', 'V'],
    texture_rules: { required_variety: 2, preferred_textures: ['smooth', 'matte', 'structured'], sheen_tolerance: 0.5 },
    color_palette: { primary: ['black', 'grey', 'white', 'navy'], secondary: ['olive', 'khaki', 'charcoal'], accent: ['orange', 'teal', 'red', 'green'], max_accent_ratio: 0.15 },
    proportion_style: 'balanced',
    mixing_tolerance: 0.4,
    material_preferences: ['technical', 'casual', 'blend'],
    era_mood_tags: ['gorpcore', 'athleisure', 'tech-wear', 'sport'],
  },
  CREATIVE_LAYERED: {
    formality_range: [0, 5],
    preferred_tonal_strategy: ['contrast', 'tone-in-tone'],
    silhouette_preference: ['V', 'A', 'Y'],
    texture_rules: { required_variety: 3, preferred_textures: ['rough', 'matte', 'sheen'], sheen_tolerance: 0.7 },
    color_palette: { primary: ['black', 'grey', 'white', 'denim'], secondary: ['burgundy', 'brown', 'olive', 'navy'], accent: ['red', 'purple', 'orange', 'pink', 'yellow'], max_accent_ratio: 0.25 },
    proportion_style: 'top-heavy',
    mixing_tolerance: 0.9,
    material_preferences: ['structured', 'casual', 'classic', 'sheer'],
    era_mood_tags: ['grunge', 'punk', 'DIY', 'eclectic', 'vintage'],
  },
};

function buildVibeDNASection(vibeKey: string): string {
  const dna = VIBE_DNA[vibeKey];
  if (!dna) return '';
  const palette = dna.color_palette;
  return `
VIBE DNA RULES FOR ${vibeKey}:
- Formality range: ${dna.formality_range[0]}-${dna.formality_range[1]} (0=ultra casual, 10=black-tie)
- Tonal strategy: ${dna.preferred_tonal_strategy.join(', ')}
  ${dna.preferred_tonal_strategy.includes('tone-on-tone') ? '(tone-on-tone: same color in different shades)' : ''}
  ${dna.preferred_tonal_strategy.includes('tone-in-tone') ? '(tone-in-tone: neighboring colors from same family)' : ''}
  ${dna.preferred_tonal_strategy.includes('contrast') ? '(contrast: deliberate light/dark or complementary pairings)' : ''}
- Silhouette targets: ${dna.silhouette_preference.join(', ')}
- Proportion style: ${dna.proportion_style}
  ${dna.proportion_style === 'column' ? '(prefer uniform width top-to-bottom)' : ''}
  ${dna.proportion_style === 'top-heavy' ? '(oversized top, slim bottom)' : ''}
  ${dna.proportion_style === 'relaxed' ? '(loose and flowy overall)' : ''}
  ${dna.proportion_style === 'balanced' ? '(equal visual weight top and bottom)' : ''}
- Color palette:
  Primary (60-70% of outfit): ${palette.primary.join(', ')}
  Secondary (20-30%): ${palette.secondary.join(', ')}
  Accent (max ${palette.max_accent_ratio * 100}%): ${palette.accent.join(', ')}
  PENALIZE outfits using accent colors beyond ${palette.max_accent_ratio * 100}% of items
- Texture rules:
  Minimum texture variety: ${dna.texture_rules.required_variety} different textures
  Preferred: ${dna.texture_rules.preferred_textures.join(', ')}
  ${dna.texture_rules.forbidden_textures ? `Avoid: ${dna.texture_rules.forbidden_textures.join(', ')}` : ''}
  Sheen tolerance: ${dna.texture_rules.sheen_tolerance} (0=no sheen, 1=lots of sheen ok)
- Mixing tolerance: ${dna.mixing_tolerance} (0=strict match, 1=eclectic mix ok)
- Material preferences: ${dna.material_preferences.join(', ')}
- Era/mood: ${dna.era_mood_tags.join(', ')}

USE THESE RULES to evaluate each outfit. Specifically:
- Check if item formality values stay within the ${dna.formality_range[0]}-${dna.formality_range[1]} range
- Verify color selections follow the palette hierarchy
- Ensure silhouette combinations create the "${dna.proportion_style}" proportion
- Confirm texture mix meets the ${dna.texture_rules.required_variety}-texture minimum
`;
}

interface ImageFeaturesSummary {
  dominantColors: string[];
  texture: string;
  visualWeight: string;
  styleAttributes: string[];
  patternDetail: string;
  brightnessLevel: string;
}

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
  image_features?: ImageFeaturesSummary;
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

    // #11: trend_cache split by season+vibe key
    const cacheKey = `${context.season || 'all'}_${context.vibe || 'all'}`;
    let trendContext = "";
    const { data: cachedTrend } = await supabase
      .from("trend_cache")
      .select("trend_data, updated_at")
      .eq("season", cacheKey)
      .maybeSingle();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    if (cachedTrend && cachedTrend.updated_at > oneDayAgo) {
      trendContext = cachedTrend.trend_data;
    } else {
      trendContext = await fetchTrendContext(geminiKey, context.season, context.vibe);
      await supabase
        .from("trend_cache")
        .upsert(
          {
            season: cacheKey,
            trend_data: trendContext,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "season" }
        );
    }

    // Fetch learning context: top items + acceptance rate from feedback tables
    const vibeKey = (context.vibe || "").toLowerCase().replace(/\s+/g, "_");
    let learningContext = "";
    try {
      const [topItemsRes, acceptanceRes] = await Promise.all([
        supabase.from("vibe_item_expansions")
          .select("slot, item_name, score, success_count")
          .eq("vibe", vibeKey)
          .gte("score", 0.6)
          .order("score", { ascending: false })
          .limit(15),
        supabase.from("pipeline_feedback")
          .select("action, rule_scores, ai_score")
          .eq("vibe", vibeKey)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      const topItems = topItemsRes.data || [];
      const feedback = acceptanceRes.data || [];
      const accepted = feedback.filter((f: any) => f.action === "accepted").length;
      const rate = feedback.length > 0 ? Math.round((accepted / feedback.length) * 100) : null;

      if (topItems.length > 0 || rate !== null) {
        const bySlot: Record<string, string[]> = {};
        for (const item of topItems) {
          if (!bySlot[item.slot]) bySlot[item.slot] = [];
          // Cap to top 3 items per slot to limit token usage
          if (bySlot[item.slot].length < 3) {
            bySlot[item.slot].push(`${item.item_name}(${Math.round(item.score * 100)}%)`);
          }
        }
        const slotLines = Object.entries(bySlot)
          .slice(0, 6)
          .map(([s, items]) => `  ${s}: ${items.join(", ")}`)
          .join("\n");
        const rateNote = rate !== null ? `- Acceptance rate: ${rate}% (${accepted}/${feedback.length})` : "";
        learningContext = `\nLEARNING INSIGHTS (${vibeKey}):
${rateNote}
- Top items by slot:\n${slotLines}
PREFER proven items above. PENALIZE untested combinations.
`;
      }
    } catch { /* silent — learning context is optional */ }

    // #10: Build VibeDNA rules section for the prompt
    const vibeDNASection = buildVibeDNASection(context.vibe);

    const candidateSummaries = candidates.map((c) => {
      const hasImageFeatures = c.items.some(i => i.image_features);
      const itemList = c.items
        .map((item) => {
          const base = `  [${item.slot_type}] ${item.brand} ${item.name} (${item.color_family}, ${item.material}, ${item.sub_category}, sil:${item.silhouette}, formality:${item.formality ?? '?'}, warmth:${item.warmth ?? '?'})`;
          if (!item.image_features) return base;
          const f = item.image_features;
          const visual = ` | visual: colors=[${f.dominantColors.join(',')}] tex=${f.texture} weight=${f.visualWeight} style=[${f.styleAttributes.join(',')}] pattern=${f.patternDetail} brightness=${f.brightnessLevel}`;
          return base + visual;
        })
        .join("\n");

      let visualSummary = '';
      if (hasImageFeatures) {
        const allColors = c.items.flatMap(i => i.image_features?.dominantColors ?? []);
        const colorFreq: Record<string, number> = {};
        for (const col of allColors) colorFreq[col] = (colorFreq[col] || 0) + 1;
        const topColors = Object.entries(colorFreq).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c);
        const weights = c.items.map(i => i.image_features?.visualWeight).filter(Boolean);
        const styles = c.items.flatMap(i => i.image_features?.styleAttributes ?? []);
        const styleFreq: Record<string, number> = {};
        for (const s of styles) styleFreq[s] = (styleFreq[s] || 0) + 1;
        const dominantStyles = Object.entries(styleFreq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);
        visualSummary = `\n  [VISUAL SUMMARY] palette: ${topColors.join('+')} | weights: ${weights.join('+')} | shared style: ${dominantStyles.join(',')}`;
      }

      return `Outfit #${c.index} (rule score: ${c.ruleScore}):${visualSummary}\n${itemList}`;
    });

    const prompt = `You are a professional fashion stylist AI with deep knowledge of VibeDNA matching rules. Evaluate these outfit candidates and select the best ${topN} outfits.

CONTEXT:
- Gender: ${context.gender}
- Body Type: ${context.bodyType}
- Style Preference: ${context.vibe}
- Season: ${context.season || "all-season"}
- Warmth Target: ${context.warmth || "not specified"}
${vibeDNASection}
CURRENT TREND CONTEXT:
${trendContext}
${learningContext}
CANDIDATE OUTFITS:
${candidateSummaries.join("\n\n")}

EVALUATION CRITERIA (weighted by importance):
1. [25%] COLOR HARMONY: Check against the VibeDNA color palette hierarchy.
   - Outfits using primarily palette.primary colors score highest
   - Accent colors beyond max_accent_ratio should be penalized
   - Tonal strategy should match the vibe's preferred approach
   - When "visual: colors=[...]" is present, use ACTUAL dominant colors from the image (not just color_family metadata) for more accurate palette evaluation
2. [20%] FORMALITY COHERENCE: All items should be within the vibe's formality range.
   - Wide spread between item formality values = penalty
   - Items outside the DNA's range = heavy penalty
3. [20%] SILHOUETTE & PROPORTION: Top+bottom should create the target proportion style.
   - Check if silhouette combination matches the DNA's proportion_style
4. [20%] VISUAL HARMONY (use image_features when available):
   - "tex=" field: reward texture contrast (e.g. smooth+structured) per DNA rules; penalize all-same texture
   - "weight=" field: reward heavy+light balance; penalize all-heavy or all-light combinations
   - "style=[...]" field: reward outfits where 2+ items share a style attribute (e.g. all "minimal" or all "structured")
   - "pattern=" field: penalize multiple bold_pattern or graphic items together
   - "brightness=" field: reward dark+light contrast; penalize monotone-dark (3+ dark items)
   - VISUAL SUMMARY line shows aggregated palette and shared styles — use this for quick harmony check
   - Items WITHOUT image_features: evaluate based on material/color_family metadata only
5. [15%] TEXTURE & MATERIAL MIX: Verify texture variety meets minimum.
   - Items should use DNA-preferred materials
   - Forbidden textures = penalty
6. [0%] TREND & CREATIVITY: Season-appropriate, modern combinations.
   - Sub-category pairing logic (blazer+slacks, hoodie+sneaker)
   - Era/mood alignment with the vibe

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
  season?: string,
  vibe?: string
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const seasonLabel = season || "all-season";
  const vibeDna = vibe ? VIBE_DNA[vibe] : null;

  let vibeContext = '';
  if (vibeDna && vibe) {
    vibeContext = `
Focus specifically on trends relevant to the "${vibe}" style aesthetic (${vibeDna.era_mood_tags.join(', ')}).
Include trends for these color families: ${vibeDna.color_palette.primary.join(', ')}, ${vibeDna.color_palette.secondary.join(', ')}.
Include trends for these materials: ${vibeDna.material_preferences.join(', ')}.`;
  }

  const prompt = `Provide a brief summary (max 150 words) of current ${currentYear} ${seasonLabel} menswear and womenswear fashion trends. Include:
1. Key color palettes trending now
2. Popular silhouettes and fits
3. Material/fabric trends
4. Key styling combinations
5. Sub-category items gaining popularity
${vibeContext}
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
