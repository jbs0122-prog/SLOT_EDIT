import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

async function callGemini(prompt: string, imageUrls: string[] = []): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY") || "";
  if (!apiKey) throw new Error("Missing Gemini API key");

  const parts: Array<Record<string, unknown>> = [];

  for (const url of imageUrls) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const mime = res.headers.get("content-type") || "image/jpeg";
      parts.push({ inline_data: { mime_type: mime, data: base64 } });
    } catch {
      continue;
    }
  }

  parts.push({ text: prompt });

  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text;
}

async function analyzeReferences(supabase: ReturnType<typeof createClient>, cellId: string, referenceIds: string[]) {
  const { data: refs } = await supabase
    .from("style_dna_references")
    .select("*")
    .in("id", referenceIds);

  if (!refs || refs.length === 0) throw new Error("No references found");

  const { data: cell } = await supabase
    .from("style_dna_cells")
    .select("*")
    .eq("id", cellId)
    .maybeSingle();

  if (!cell) throw new Error("Cell not found");

  const results: Array<{ id: string; analysis: unknown }> = [];

  for (const ref of refs) {
    try {
      const prompt = `You are a professional fashion stylist analyzing a reference outfit image.

Context:
- Gender: ${cell.gender}
- Body Type: ${cell.body_type}
- Target Vibe: ${cell.vibe}
- Look: ${cell.look_key}
- Season: ${cell.season}

Analyze this outfit image and return JSON with this exact structure:
{
  "colors": ["list of all colors visible in the outfit"],
  "color_strategy": "tone-on-tone | tone-in-tone | contrast | analogous | complementary",
  "materials": ["list of all materials/fabrics visible"],
  "silhouettes": ["describe the silhouette shapes: I, A, V, Y, X, H"],
  "formality": 1-10 number,
  "mood": ["list of mood/era tags"],
  "items": [
    {
      "slot": "outer|top|bottom|shoes|bag|accessory",
      "description": "item description",
      "color": "primary color",
      "material": "primary material"
    }
  ],
  "overall_impression": "2-3 sentence description of the overall style direction"
}

Be specific about colors (e.g., "charcoal grey" not just "dark"), materials (e.g., "brushed wool" not just "fabric"), and silhouettes.`;

      const text = await callGemini(prompt, [ref.image_url]);
      let analysis;
      try {
        analysis = JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) analysis = JSON.parse(match[0]);
        else throw new Error("Invalid JSON from Gemini");
      }

      await supabase
        .from("style_dna_references")
        .update({ ai_analysis: analysis })
        .eq("id", ref.id);

      const extractedItems = (analysis.items || []).map((item: Record<string, string>) => ({
        slot: item.slot,
        name: item.description,
        color: item.color,
        material: item.material,
        keywords: [item.description, `${item.color} ${item.description}`, `${item.material} ${item.description}`],
      }));

      await supabase
        .from("style_dna_references")
        .update({ extracted_items: extractedItems })
        .eq("id", ref.id);

      results.push({ id: ref.id, analysis });
    } catch (e) {
      results.push({ id: ref.id, analysis: { error: (e as Error).message } });
    }
  }

  return { analyzed: results.length, results };
}

async function extractRules(supabase: ReturnType<typeof createClient>, cellId: string) {
  const { data: refs } = await supabase
    .from("style_dna_references")
    .select("*")
    .eq("cell_id", cellId)
    .not("ai_analysis", "is", null);

  if (!refs || refs.length === 0) throw new Error("No analyzed references found");

  await supabase.from("style_dna_learned_rules").delete().eq("cell_id", cellId);

  const analyses = refs.map((r) => r.ai_analysis).filter(Boolean);
  const refIds = refs.map((r) => r.id);

  const allColors: string[] = [];
  const allMaterials: string[] = [];
  const allSilhouettes: string[] = [];
  const formalityValues: number[] = [];
  const allMoods: string[] = [];
  const colorStrategies: string[] = [];
  const slotItems: Record<string, Array<{ description: string; color: string; material: string }>> = {};

  for (const a of analyses) {
    if (a.colors) allColors.push(...a.colors);
    if (a.materials) allMaterials.push(...a.materials);
    if (a.silhouettes) allSilhouettes.push(...a.silhouettes);
    if (typeof a.formality === "number") formalityValues.push(a.formality);
    if (a.mood) allMoods.push(...a.mood);
    if (a.color_strategy) colorStrategies.push(a.color_strategy);
    if (a.items) {
      for (const item of a.items) {
        if (!slotItems[item.slot]) slotItems[item.slot] = [];
        slotItems[item.slot].push({ description: item.description, color: item.color, material: item.material });
      }
    }
  }

  function countFrequencies(arr: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of arr) {
      const key = item.toLowerCase().trim();
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }

  function topN(freq: Record<string, number>, n: number): string[] {
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k]) => k);
  }

  const rules: Array<{ rule_type: string; rule_data: Record<string, unknown>; confidence: number }> = [];

  const colorFreq = countFrequencies(allColors);
  const strategyFreq = countFrequencies(colorStrategies);
  rules.push({
    rule_type: "color_palette",
    rule_data: {
      dominant_colors: topN(colorFreq, 6),
      all_colors: colorFreq,
      primary_strategy: topN(strategyFreq, 1)[0] || "unknown",
      strategies: strategyFreq,
    },
    confidence: Math.min(1, refs.length / 5),
  });

  const materialFreq = countFrequencies(allMaterials);
  rules.push({
    rule_type: "material_combo",
    rule_data: {
      primary_materials: topN(materialFreq, 6),
      all_materials: materialFreq,
    },
    confidence: Math.min(1, refs.length / 5),
  });

  const silhouetteFreq = countFrequencies(allSilhouettes);
  rules.push({
    rule_type: "silhouette",
    rule_data: {
      preferred: topN(silhouetteFreq, 3),
      all: silhouetteFreq,
    },
    confidence: Math.min(1, refs.length / 4),
  });

  if (formalityValues.length > 0) {
    const avg = formalityValues.reduce((a, b) => a + b, 0) / formalityValues.length;
    const min = Math.min(...formalityValues);
    const max = Math.max(...formalityValues);
    rules.push({
      rule_type: "formality",
      rule_data: { average: Math.round(avg * 10) / 10, range: [min, max] },
      confidence: Math.min(1, formalityValues.length / 3),
    });
  }

  const slotKeywords: Record<string, string[]> = {};
  for (const [slot, items] of Object.entries(slotItems)) {
    const descFreq = countFrequencies(items.map((i) => i.description));
    slotKeywords[slot] = topN(descFreq, 5);
  }
  if (Object.keys(slotKeywords).length > 0) {
    rules.push({
      rule_type: "keyword",
      rule_data: { by_slot: slotKeywords, slot_materials: Object.fromEntries(
        Object.entries(slotItems).map(([slot, items]) => [slot, topN(countFrequencies(items.map(i => i.material)), 3)])
      )},
      confidence: Math.min(1, refs.length / 4),
    });
  }

  for (const rule of rules) {
    await supabase.from("style_dna_learned_rules").insert({
      cell_id: cellId,
      rule_type: rule.rule_type,
      rule_data: rule.rule_data,
      confidence: rule.confidence,
      source_reference_ids: refIds,
    });
  }

  const learnedPalette = rules.find((r) => r.rule_type === "color_palette")?.rule_data || {};
  const learnedMaterials = rules.find((r) => r.rule_type === "material_combo")?.rule_data?.primary_materials || [];
  const learnedSilhouettes = rules.find((r) => r.rule_type === "silhouette")?.rule_data?.preferred || [];

  await supabase.from("style_dna_cells").update({
    learned_palette: learnedPalette,
    learned_materials: learnedMaterials,
    learned_silhouettes: learnedSilhouettes,
    updated_at: new Date().toISOString(),
  }).eq("id", cellId);

  return { rules_created: rules.length };
}

async function generateBrief(supabase: ReturnType<typeof createClient>, cellId: string) {
  const { data: cell } = await supabase
    .from("style_dna_cells")
    .select("*")
    .eq("id", cellId)
    .maybeSingle();

  if (!cell) throw new Error("Cell not found");

  const { data: rules } = await supabase
    .from("style_dna_learned_rules")
    .select("*")
    .eq("cell_id", cellId);

  const { data: refs } = await supabase
    .from("style_dna_references")
    .select("ai_analysis")
    .eq("cell_id", cellId)
    .not("ai_analysis", "is", null)
    .limit(5);

  const rulesContext = (rules || []).map((r) => `${r.rule_type}: ${JSON.stringify(r.rule_data)}`).join("\n");
  const impressions = (refs || [])
    .map((r) => r.ai_analysis?.overall_impression)
    .filter(Boolean)
    .join("\n");

  const prompt = `You are a fashion creative director. Generate a concise style brief for this outfit cell.

Cell context:
- Gender: ${cell.gender}
- Body Type: ${cell.body_type}
- Vibe: ${cell.vibe}
- Look: ${cell.look_key}
- Season: ${cell.season}

Learned rules from reference analysis:
${rulesContext || "No rules yet"}

Reference impressions:
${impressions || "No analyzed references yet"}

Write a 3-5 sentence style brief that:
1. Describes the core aesthetic direction
2. Specifies key color and material guidelines
3. Notes the silhouette and proportion targets
4. Mentions seasonal considerations

Write in a direct, professional tone. Mix Korean style terminology where appropriate.
Return only the brief text, no JSON wrapping.`;

  const apiKey = Deno.env.get("GEMINI_API_KEY") || "";
  if (!apiKey) throw new Error("Missing Gemini API key");

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );

  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  const brief = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  await supabase.from("style_dna_cells").update({
    style_brief: brief.trim(),
    updated_at: new Date().toISOString(),
  }).eq("id", cellId);

  return { brief: brief.trim() };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const sb = createClient(supabaseUrl, serviceKey);

    const { action, cell_id, reference_ids } = await req.json();

    switch (action) {
      case "analyze-references": {
        if (!cell_id || !reference_ids?.length) return errResponse("cell_id and reference_ids required");
        const result = await analyzeReferences(sb, cell_id, reference_ids);
        return jsonResponse(result);
      }
      case "extract-rules": {
        if (!cell_id) return errResponse("cell_id required");
        const result = await extractRules(sb, cell_id);
        return jsonResponse(result);
      }
      case "generate-brief": {
        if (!cell_id) return errResponse("cell_id required");
        const result = await generateBrief(sb, cell_id);
        return jsonResponse(result);
      }
      default:
        return errResponse(`Unknown action: ${action}`);
    }
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
