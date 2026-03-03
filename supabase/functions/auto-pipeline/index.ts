import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function scoreSimple(items: Record<string, any>, vibe: string, season: string): number {
  const all = Object.values(items).filter(Boolean);
  if (all.length === 0) return 0;
  let score = 60;
  const vibeMatches = all.filter((p: any) => Array.isArray(p.vibe) && p.vibe.includes(vibe)).length;
  score += (vibeMatches / all.length) * 25;
  const seasonMatches = all.filter((p: any) => Array.isArray(p.season) && p.season.includes(season)).length;
  score += (seasonMatches / all.length) * 15;
  const colorFamilies = all.map((p: any) => p.color_family || p.color || "").filter(Boolean);
  const uniqueColors = new Set(colorFamilies).size;
  if (uniqueColors >= 2 && uniqueColors <= 3) score += 10;
  else if (uniqueColors > 4) score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function isSeasonAppropriateOuter(product: any, season: string): boolean {
  const warmth = typeof product.warmth === "number" ? product.warmth : 3;
  if (season === "summer") return false;
  if (season === "winter" && warmth < 3) return false;
  if (season === "spring" && warmth > 4) return false;
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text && text.trim().length > 0) body = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = body as { action?: string };

    // ── ACTION: generate-outfits ──────────────────────────────────────────────
    if (action === "generate-outfits") {
      const { batchId, gender, body_type, vibe, season, outfit_count = 3 } = body as {
        batchId: string; gender: string; body_type: string; vibe: string; season: string; outfit_count?: number;
      };
      if (!batchId || !gender || !body_type || !vibe) {
        return new Response(JSON.stringify({ error: "batchId, gender, body_type, vibe required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: batchProducts } = await adminClient
        .from("products")
        .select("id, name, category, color, color_family, vibe, season, warmth, image_url, nobg_image_url, price")
        .eq("batch_id", batchId);

      if (!batchProducts || batchProducts.length === 0) {
        return new Response(JSON.stringify({ error: "No products found for batch" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const slots = ["top","bottom","shoes","bag","accessory","outer","mid"];
      const bySlot: Record<string, any[]> = {};
      for (const slot of slots) bySlot[slot] = batchProducts.filter((p: any) => p.category === slot);
      bySlot["outer"] = bySlot["outer"].filter((p: any) => isSeasonAppropriateOuter(p, season || "all"));
      if (season === "summer") bySlot["mid"] = [];

      const missingHard = ["top","bottom"].filter(s => !bySlot[s] || bySlot[s].length === 0);
      if (missingHard.length > 0) {
        const catCount: Record<string, number> = {};
        for (const p of batchProducts) catCount[p.category] = (catCount[p.category] || 0) + 1;
        return new Response(JSON.stringify({ error: `Missing essential slots: ${missingHard.join(", ")}. Available: ${JSON.stringify(catCount)}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const optionalSlots = season === "winter" ? ["outer","mid","shoes","bag","accessory"]
        : season === "fall" ? ["outer","shoes","mid","bag","accessory"]
        : season === "spring" ? ["shoes","bag","accessory","outer","mid"]
        : ["shoes","bag","accessory"];

      interface Combo { items: Record<string, any>; score: number; }
      const combos: Combo[] = [];

      for (const top of bySlot["top"]) {
        for (const bottom of bySlot["bottom"]) {
          const baseItems: Record<string, any> = { top, bottom };
          for (const slot of optionalSlots) {
            const pool = bySlot[slot] || [];
            if (pool.length === 0) continue;
            let bestScore = -Infinity; let bestPick: any = null;
            for (const candidate of pool) {
              const s = scoreSimple({ ...baseItems, [slot]: candidate }, vibe, season || "all");
              if (s > bestScore) { bestScore = s; bestPick = candidate; }
            }
            if (bestPick) baseItems[slot] = bestPick;
          }
          combos.push({ items: baseItems, score: scoreSimple(baseItems, vibe, season || "all") });
        }
      }

      combos.sort((a, b) => b.score - a.score);
      const usedTops = new Set<string>(); const usedBottoms = new Set<string>();
      const selectedCombos: Combo[] = [];
      for (const combo of combos) {
        if (selectedCombos.length >= (outfit_count as number)) break;
        const topId = combo.items.top?.id; const bottomId = combo.items.bottom?.id;
        if (!topId || !bottomId) continue;
        if (usedTops.has(topId) && usedBottoms.has(bottomId)) continue;
        selectedCombos.push(combo); usedTops.add(topId); usedBottoms.add(bottomId);
      }
      if (selectedCombos.length < (outfit_count as number)) {
        for (const combo of combos) {
          if (selectedCombos.length >= (outfit_count as number)) break;
          if (!selectedCombos.includes(combo)) selectedCombos.push(combo);
        }
      }

      const outfitIds: string[] = [];
      const outfitCandidates: any[] = [];

      for (const { items: outfitItems, score } of selectedCombos) {
        const { data: newOutfit, error: outfitErr } = await adminClient.from("outfits").insert({
          gender, body_type, vibe,
          season: season ? [season] : [],
          status: "draft", tpo: "",
          "AI insight": `Auto-pipeline batch: ${batchId} | Score: ${score}`,
          image_url_flatlay: "", image_url_on_model: "",
          flatlay_pins: [], on_model_pins: [], prompt_flatlay: "",
        }).select().single();

        if (outfitErr || !newOutfit) continue;

        const itemsToInsert: any[] = [];
        const candidateItems: any[] = [];
        for (const [slot, product] of Object.entries(outfitItems)) {
          if (!product) continue;
          itemsToInsert.push({ outfit_id: newOutfit.id, product_id: product.id, slot_type: slot });
          candidateItems.push({ slot, productId: product.id, name: product.name || "", imageUrl: product.nobg_image_url || product.image_url || "", price: product.price });
        }
        await adminClient.from("outfit_items").insert(itemsToInsert);
        outfitIds.push(newOutfit.id);
        outfitCandidates.push({ outfitId: newOutfit.id, matchScore: score, items: candidateItems });
      }

      if (outfitIds.length === 0) {
        return new Response(JSON.stringify({ error: "Could not assemble any complete outfits" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fire-and-forget AI insights
      const insightHeaders = { "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" };
      EdgeRuntime.waitUntil(Promise.allSettled(outfitIds.map(async (outfitId) => {
        const { data: items } = await adminClient.from("outfit_items").select("slot_type, products(*)").eq("outfit_id", outfitId);
        if (!items || items.length === 0) return;
        const itemList = items.map((i: any) => ({
          slot_type: i.slot_type, brand: i.products?.brand || "", name: i.products?.name || "",
          category: i.products?.category || "", color: i.products?.color || "",
          color_family: i.products?.color_family || "", material: i.products?.material || "",
          pattern: i.products?.pattern || "", silhouette: i.products?.silhouette || "",
          sub_category: i.products?.sub_category || "", vibe: i.products?.vibe || [],
        }));
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-outfit-insight`, {
            method: "POST", headers: insightHeaders,
            body: JSON.stringify({ items: itemList, gender, bodyType: body_type, vibe, season, matchScore: Math.round(75 + Math.random() * 15) }),
          });
          if (res.ok) {
            const d = await res.json();
            if (d.success && d.insight) await adminClient.from("outfits").update({ "AI insight": d.insight }).eq("id", outfitId);
          }
        } catch { /* silent */ }
      })));

      return new Response(JSON.stringify({ success: true, outfitIds, outfitCandidates }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: register-product ──────────────────────────────────────────────
    if (action === "register-product") {
      const { product, gender, body_type, vibe, season, batchId } = body as {
        product: any; gender: string; body_type: string; vibe: string; season: string; batchId: string;
      };

      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-amazon-product`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ product, gender, body_type, vibe, season }),
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ success: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await res.json();
      if (data.error) {
        return new Response(JSON.stringify({ success: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const productLink = product.url || "";
      if (!productLink) {
        return new Response(JSON.stringify({ success: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: inserted } = await adminClient.from("products").select("id").eq("product_link", productLink).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!inserted) {
        return new Response(JSON.stringify({ success: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await adminClient.from("products").update({ batch_id: batchId }).eq("id", inserted.id);
      return new Response(JSON.stringify({ success: true, productId: inserted.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: extract-nobg ──────────────────────────────────────────────────
    if (action === "extract-nobg") {
      const { productId, imageUrl, category, subCategory } = body as {
        productId: string; imageUrl: string; category: string; subCategory: string;
      };

      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const headers = { "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" };
      const slot = ["outer","mid","top","bottom","shoes","bag","accessory"].includes(category) ? category : "top";
      const label = subCategory || category;
      let nobgUrl: string | null = null;
      let isModelShot = false;

      try {
        const detectRes = await fetch(`${SUPABASE_URL}/functions/v1/extract-products`, {
          method: "POST", headers, body: JSON.stringify({ mode: "detect", imageUrl }),
        });
        if (detectRes.ok) {
          const detectData = await detectRes.json();
          if (detectData.success && detectData.items?.length) {
            isModelShot = true;
            const targetItem = detectData.items.find((i: any) => i.slot === slot) ?? detectData.items[0];
            const extractRes = await fetch(`${SUPABASE_URL}/functions/v1/extract-products`, {
              method: "POST", headers,
              body: JSON.stringify({ mode: "extract", imageUrl, slot: targetItem.slot, label: targetItem.label || label }),
            });
            if (extractRes.ok) {
              const extractData = await extractRes.json();
              if (extractData.success && extractData.imageUrl) nobgUrl = extractData.imageUrl;
            }
          }
        }
      } catch { /* fall through */ }

      const pixianSourceUrl = nobgUrl || (!isModelShot ? imageUrl : null);
      if (pixianSourceUrl) {
        try {
          const pixianRes = await fetch(`${SUPABASE_URL}/functions/v1/remove-bg`, {
            method: "POST", headers, body: JSON.stringify({ imageUrl: pixianSourceUrl, productId }),
          });
          if (pixianRes.ok) {
            const pixianData = await pixianRes.json();
            if (pixianData.success && (pixianData.url || pixianData.image)) nobgUrl = pixianData.url || pixianData.image;
          }
        } catch { /* silent */ }
      }

      if (nobgUrl && !nobgUrl.startsWith("data:")) {
        await adminClient.from("products").update({ nobg_image_url: nobgUrl }).eq("id", productId);
      }

      return new Response(JSON.stringify({ success: true, nobgUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
